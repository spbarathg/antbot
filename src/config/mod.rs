use serde::Deserialize;
use validator::Validate;
use std::sync::Arc;
use tokio::sync::RwLock;
use notify::{Watcher, RecursiveMode, watcher};
use std::time::Duration;
use anyhow::Result;
use std::path::PathBuf;

#[derive(Debug, Deserialize, Validate)]
pub struct Settings {
    #[validate(range(min = 1, max = 100))]
    pub max_concurrent_trades: u32,
    
    #[validate(range(min = 0.0, max = 100.0))]
    pub max_slippage_percentage: f64,
    
    #[validate(range(min = 0.0))]
    pub min_liquidity_usd: f64,
    
    #[validate(range(min = 0.0))]
    pub max_position_size_usd: f64,
    
    #[validate(range(min = 0.0))]
    pub max_daily_loss_usd: f64,
    
    #[validate(range(min = 1, max = 1000))]
    pub max_daily_trades: u32,
    
    #[validate(range(min = 0.0, max = 100.0))]
    pub stop_loss_percentage: f64,
    
    #[validate(range(min = 0.0, max = 100.0))]
    pub take_profit_percentage: f64,
    
    pub log_level: String,
    pub data_dir: String,
    pub temp_dir: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct RpcConfig {
    pub helius: RpcEndpoint,
    pub triton: RpcEndpoint,
    pub jito: RpcEndpoint,
    pub rpc_strategy: RpcStrategy,
}

#[derive(Debug, Deserialize, Validate)]
pub struct RpcEndpoint {
    pub mainnet: String,
    pub devnet: String,
    pub testnet: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct RpcStrategy {
    pub monitoring: String,
    pub trading: String,
    pub mev_protection: String,
    pub primary_rpc: String,
    pub fallback_rpcs: Vec<String>,
    pub retry_delay_ms: u64,
    pub max_fallback_attempts: u32,
}

pub struct ConfigManager {
    settings: Arc<RwLock<Settings>>,
    rpc_config: Arc<RwLock<RpcConfig>>,
    config_dir: PathBuf,
}

impl ConfigManager {
    pub async fn new(config_dir: PathBuf) -> Result<Self> {
        let settings = Self::load_settings(&config_dir).await?;
        let rpc_config = Self::load_rpc_config(&config_dir).await?;
        
        Ok(Self {
            settings: Arc::new(RwLock::new(settings)),
            rpc_config: Arc::new(RwLock::new(rpc_config)),
            config_dir,
        })
    }

    async fn load_settings(config_dir: &PathBuf) -> Result<Settings> {
        let settings_path = config_dir.join("settings.toml");
        let contents = tokio::fs::read_to_string(&settings_path).await?;
        let settings: Settings = toml::from_str(&contents)?;
        settings.validate()?;
        Ok(settings)
    }

    async fn load_rpc_config(config_dir: &PathBuf) -> Result<RpcConfig> {
        let rpc_path = config_dir.join("rpc.toml");
        let contents = tokio::fs::read_to_string(&rpc_path).await?;
        let config: RpcConfig = toml::from_str(&contents)?;
        config.validate()?;
        Ok(config)
    }

    pub async fn watch_for_changes(&self) {
        let settings = self.settings.clone();
        let rpc_config = self.rpc_config.clone();
        let config_dir = self.config_dir.clone();

        let mut watcher = watcher(move |res| {
            if let Ok(_) = res {
                let settings = settings.clone();
                let rpc_config = rpc_config.clone();
                let config_dir = config_dir.clone();
                
                tokio::spawn(async move {
                    if let Err(e) = Self::reload_configs(&config_dir, &settings, &rpc_config).await {
                        eprintln!("Error reloading configs: {}", e);
                    }
                });
            }
        }, Duration::from_secs(1)).unwrap();

        watcher.watch(&self.config_dir, RecursiveMode::NonRecursive).unwrap();
    }

    async fn reload_configs(
        config_dir: &PathBuf,
        settings: &Arc<RwLock<Settings>>,
        rpc_config: &Arc<RwLock<RpcConfig>>,
    ) -> Result<()> {
        let new_settings = Self::load_settings(config_dir).await?;
        let new_rpc_config = Self::load_rpc_config(config_dir).await?;

        let mut settings = settings.write().await;
        *settings = new_settings;

        let mut rpc_config = rpc_config.write().await;
        *rpc_config = new_rpc_config;

        Ok(())
    }

    pub async fn get_settings(&self) -> Settings {
        self.settings.read().await.clone()
    }

    pub async fn get_rpc_config(&self) -> RpcConfig {
        self.rpc_config.read().await.clone()
    }
} 