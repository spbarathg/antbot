mod radar;
mod buy_engine;
mod exit_strategies;

use anyhow::Result;
use config::Config;
use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::RwLock;

// Re-export types for external use
pub use radar::Radar;
pub use buy_engine::BuyEngine;
pub use exit_strategies::ExitStrategy;

// Shared state for the Sniping Core
#[derive(Default)]
pub struct SnipingState {
    pub is_active: bool,
    pub active_trades: Vec<String>,
    pub total_profits: f64,
    pub risk_level: f64,
}

// Main Sniping Core struct that coordinates all components
pub struct SnipingCore {
    radar: Arc<RwLock<Radar>>,
    buy_engine: Arc<RwLock<BuyEngine>>,
    exit_strategy: Arc<RwLock<ExitStrategy>>,
    state: Arc<RwLock<SnipingState>>,
}

impl SnipingCore {
    pub async fn new(config: &Config) -> Result<Self> {
        let state = Arc::new(RwLock::new(SnipingState::default()));
        let radar = Arc::new(RwLock::new(Radar::new(config, state.clone()).await?));
        let buy_engine = Arc::new(RwLock::new(BuyEngine::new(config, state.clone()).await?));
        let exit_strategy = Arc::new(RwLock::new(ExitStrategy::new(config, state.clone()).await?));

        Ok(Self {
            radar,
            buy_engine,
            exit_strategy,
            state,
        })
    }

    pub async fn init(&mut self, config: &Config) -> Result<()> {
        info!("Initializing Sniping Core...");

        // Initialize components
        self.init_radar(config).await?;
        self.init_buy_engine(config).await?;
        self.init_exit_strategy(config).await?;

        // Start monitoring and coordination
        self.start_coordination().await?;

        info!("Sniping Core initialized successfully");
        Ok(())
    }

    async fn init_radar(&mut self, config: &Config) -> Result<()> {
        let radar = self.radar.write().await;
        radar.init(config).await
    }

    async fn init_buy_engine(&mut self, config: &Config) -> Result<()> {
        let buy_engine = self.buy_engine.write().await;
        buy_engine.init(config).await
    }

    async fn init_exit_strategy(&mut self, config: &Config) -> Result<()> {
        let exit_strategy = self.exit_strategy.write().await;
        exit_strategy.init(config).await
    }

    async fn start_coordination(&self) -> Result<()> {
        // Start radar scanning
        let radar = self.radar.clone();
        tokio::spawn(async move {
            if let Err(e) = radar.write().await.start_scanning().await {
                error!("Radar scanning error: {}", e);
            }
        });

        // Start buy engine monitoring
        let buy_engine = self.buy_engine.clone();
        tokio::spawn(async move {
            if let Err(e) = buy_engine.write().await.start_monitoring().await {
                error!("Buy engine monitoring error: {}", e);
            }
        });

        // Start exit strategy monitoring
        let exit_strategy = self.exit_strategy.clone();
        tokio::spawn(async move {
            if let Err(e) = exit_strategy.write().await.start_monitoring().await {
                error!("Exit strategy monitoring error: {}", e);
            }
        });

        Ok(())
    }

    pub async fn shutdown(&self) -> Result<()> {
        info!("Shutting down Sniping Core...");
        
        // Stop all components
        self.radar.write().await.shutdown().await?;
        self.buy_engine.write().await.shutdown().await?;
        self.exit_strategy.write().await.shutdown().await?;

        info!("Sniping Core shutdown complete");
        Ok(())
    }
}

// Initialize the Sniping Core system
pub async fn init(config: &Config) -> Result<()> {
    let mut core = SnipingCore::new(config).await?;
    core.init(config).await
}

// Shutdown the Sniping Core system
pub async fn shutdown() -> Result<()> {
    // This will be implemented when we have a global core instance
    Ok(())
} 