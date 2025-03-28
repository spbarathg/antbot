use anyhow::Result;
use config::Config;
use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::task::JoinSet;
use crate::sniping_core::SnipingState;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};
use reqwest::Client;
use tokio::time::sleep;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoinMetrics {
    pub token_address: String,
    pub pair_address: String,
    pub liquidity: f64,
    pub volume_24h: f64,
    pub price: f64,
    pub holders: u32,
    pub market_cap: f64,
    pub created_at: DateTime<Utc>,
    pub social_volume: f64,
    pub contract_audit_status: ContractAuditStatus,
    pub risk_score: f64,
    pub priority_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ContractAuditStatus {
    Verified,
    Unverified,
    Honeypot,
    Rugged,
}

pub struct CoinScanner {
    id: String,
    state: Arc<RwLock<SnipingState>>,
    is_active: bool,
    scan_interval: u64,
    batch_size: usize,
    max_concurrent_scans: usize,
    min_liquidity: f64,
    min_holders: u32,
    min_market_cap: f64,
    monitored_coins: Vec<CoinMetrics>,
    prioritized_coins: Vec<CoinMetrics>,
    http_client: Client,
    dex_screener_api_key: String,
    pump_fun_api_key: String,
}

impl CoinScanner {
    pub async fn new(config: &Config, state: Arc<RwLock<SnipingState>>) -> Result<Self> {
        let scan_interval = config.get_int("sniping_core.coin_scanner.scan_interval")? as u64;
        let batch_size = config.get_int("sniping_core.coin_scanner.batch_size")? as usize;
        let max_concurrent_scans = config.get_int("sniping_core.coin_scanner.max_concurrent_scans")? as usize;
        let min_liquidity = config.get_float("sniping_core.coin_scanner.min_liquidity")? as f64;
        let min_holders = config.get_int("sniping_core.coin_scanner.min_holders")? as u32;
        let min_market_cap = config.get_float("sniping_core.coin_scanner.min_market_cap")? as f64;
        let dex_screener_api_key = config.get_string("sniping_core.coin_scanner.dex_screener_api_key")?;
        let pump_fun_api_key = config.get_string("sniping_core.coin_scanner.pump_fun_api_key")?;

        Ok(Self {
            id: uuid::Uuid::new_v4().to_string(),
            state,
            is_active: false,
            scan_interval,
            batch_size,
            max_concurrent_scans,
            min_liquidity,
            min_holders,
            min_market_cap,
            monitored_coins: Vec::new(),
            prioritized_coins: Vec::new(),
            http_client: Client::new(),
            dex_screener_api_key,
            pump_fun_api_key,
        })
    }

    pub async fn start_scanning(&mut self) -> Result<()> {
        self.is_active = true;
        info!("Coin Scanner {} started scanning", self.id);

        while self.is_active {
            if let Err(e) = self.scan_coins().await {
                error!("Coin Scanner {} scanning error: {}", self.id, e);
            }
            sleep(tokio::time::Duration::from_secs(self.scan_interval)).await;
        }

        Ok(())
    }

    async fn scan_coins(&mut self) -> Result<()> {
        let state = self.state.read().await;
        
        // Skip if sniping core is not active
        if !state.is_active {
            return Ok(());
        }

        // Create a JoinSet for parallel processing
        let mut set = tokio::task::JoinSet::new();
        
        // Scan pump.fun and DexScreener in parallel
        set.spawn(self.scan_pump_fun());
        set.spawn(self.scan_dex_screener());

        // Process results as they complete
        while let Some(result) = set.join_next().await {
            match result {
                Ok(coins) => {
                    for coin in coins {
                        if self.evaluate_coin(&coin) {
                            self.monitored_coins.push(coin);
                        }
                    }
                }
                Err(e) => {
                    error!("Error in coin scanning task: {}", e);
                }
            }
        }

        // Update prioritization
        self.update_prioritization().await?;

        // Clean up old coins
        self.cleanup_old_coins().await?;

        Ok(())
    }

    async fn scan_pump_fun(&self) -> Result<Vec<CoinMetrics>> {
        let url = "https://api.pump.fun/v1/new-coins";
        let response = self.http_client
            .get(url)
            .header("Authorization", format!("Bearer {}", self.pump_fun_api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Failed to fetch from pump.fun: {}", response.status()));
        }

        let coins: Vec<CoinMetrics> = response.json().await?;
        Ok(coins)
    }

    async fn scan_dex_screener(&self) -> Result<Vec<CoinMetrics>> {
        let url = "https://api.dexscreener.com/latest/dex/tokens/new";
        let response = self.http_client
            .get(url)
            .header("Authorization", format!("Bearer {}", self.dex_screener_api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Failed to fetch from DexScreener: {}", response.status()));
        }

        let coins: Vec<CoinMetrics> = response.json().await?;
        Ok(coins)
    }

    fn evaluate_coin(&self, coin: &CoinMetrics) -> bool {
        // Basic filtering criteria
        if coin.liquidity < self.min_liquidity ||
           coin.holders < self.min_holders ||
           coin.market_cap < self.min_market_cap {
            return false;
        }

        // Contract audit status check
        match coin.contract_audit_status {
            ContractAuditStatus::Honeypot | ContractAuditStatus::Rugged => {
                return false;
            }
            _ => {}
        }

        // Risk score check
        if coin.risk_score > 0.7 {
            return false;
        }

        true
    }

    async fn update_prioritization(&mut self) -> Result<()> {
        // Calculate priority scores for each coin
        for coin in &mut self.monitored_coins {
            coin.priority_score = self.calculate_priority_score(coin);
        }

        // Sort by priority score
        self.monitored_coins.sort_by(|a, b| {
            b.priority_score.partial_cmp(&a.priority_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        // Update prioritized coins list
        self.prioritized_coins = self.monitored_coins.clone();

        Ok(())
    }

    fn calculate_priority_score(&self, coin: &CoinMetrics) -> f64 {
        // Weighted scoring system
        let liquidity_score = (coin.liquidity / self.min_liquidity).min(1.0) * 0.3;
        let volume_score = (coin.volume_24h / (self.min_liquidity * 2.0)).min(1.0) * 0.2;
        let holders_score = (coin.holders as f64 / self.min_holders as f64).min(1.0) * 0.2;
        let social_score = (coin.social_volume / 1000.0).min(1.0) * 0.15;
        let risk_score = (1.0 - coin.risk_score) * 0.15;

        liquidity_score + volume_score + holders_score + social_score + risk_score
    }

    async fn cleanup_old_coins(&mut self) -> Result<()> {
        let now = Utc::now();
        let max_age = chrono::Duration::minutes(5);

        self.monitored_coins.retain(|coin| {
            let age = now.signed_duration_since(coin.created_at);
            age <= max_age
        });

        self.prioritized_coins.retain(|coin| {
            let age = now.signed_duration_since(coin.created_at);
            age <= max_age
        });

        Ok(())
    }

    pub async fn get_prioritized_coins(&self) -> Vec<CoinMetrics> {
        self.prioritized_coins.clone()
    }

    pub async fn get_monitored_coins(&self) -> Vec<CoinMetrics> {
        self.monitored_coins.clone()
    }

    pub async fn shutdown(&self) -> Result<()> {
        self.is_active = false;
        info!("Coin Scanner {} shutdown complete", self.id);
        Ok(())
    }

    // Getters
    pub fn get_id(&self) -> &str {
        &self.id
    }

    pub fn is_active(&self) -> bool {
        self.is_active
    }
} 