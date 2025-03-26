use anyhow::Result;
use config::Config;
use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::sniping_core::SnipingState;

pub struct Radar {
    id: String,
    state: Arc<RwLock<SnipingState>>,
    is_active: bool,
    scan_interval: u64,
    min_liquidity: f64,
    min_holders: u32,
    min_market_cap: f64,
    monitored_pairs: Vec<String>,
    opportunities: Vec<TokenOpportunity>,
}

#[derive(Debug, Clone)]
pub struct TokenOpportunity {
    pub token_address: String,
    pub pair_address: String,
    pub liquidity: f64,
    pub holders: u32,
    pub market_cap: f64,
    pub price: f64,
    pub volume_24h: f64,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub risk_score: f64,
}

impl Radar {
    pub async fn new(config: &Config, state: Arc<RwLock<SnipingState>>) -> Result<Self> {
        let scan_interval = config.get_int("sniping_core.radar.scan_interval")? as u64;
        let min_liquidity = config.get_float("sniping_core.radar.min_liquidity")? as f64;
        let min_holders = config.get_int("sniping_core.radar.min_holders")? as u32;
        let min_market_cap = config.get_float("sniping_core.radar.min_market_cap")? as f64;

        Ok(Self {
            id: uuid::Uuid::new_v4().to_string(),
            state,
            is_active: false,
            scan_interval,
            min_liquidity,
            min_holders,
            min_market_cap,
            monitored_pairs: Vec::new(),
            opportunities: Vec::new(),
        })
    }

    pub async fn init(&mut self, config: &Config) -> Result<()> {
        // Initialize monitoring pairs from config
        let pairs = config.get_array("sniping_core.radar.monitored_pairs")?;
        for pair in pairs {
            self.monitored_pairs.push(pair.to_string());
        }

        info!("Radar {} initialized with {} pairs to monitor", 
              self.id, self.monitored_pairs.len());
        Ok(())
    }

    pub async fn start_scanning(&mut self) -> Result<()> {
        self.is_active = true;
        info!("Radar {} started scanning", self.id);

        while self.is_active {
            if let Err(e) = self.scan_opportunities().await {
                error!("Radar {} scanning error: {}", self.id, e);
            }
            tokio::time::sleep(tokio::time::Duration::from_secs(self.scan_interval)).await;
        }

        Ok(())
    }

    async fn scan_opportunities(&mut self) -> Result<()> {
        let state = self.state.read().await;
        
        // Skip if sniping core is not active
        if !state.is_active {
            return Ok(());
        }

        // Scan each monitored pair
        for pair in &self.monitored_pairs {
            if let Err(e) = self.analyze_pair(pair).await {
                warn!("Error analyzing pair {}: {}", pair, e);
            }
        }

        // Clean up old opportunities
        self.cleanup_opportunities().await?;

        Ok(())
    }

    async fn analyze_pair(&mut self, pair_address: &str) -> Result<()> {
        // Placeholder for pair analysis logic
        // This would involve:
        // 1. Fetching pair data from DEX
        // 2. Checking liquidity conditions
        // 3. Analyzing holder distribution
        // 4. Calculating market metrics
        // 5. Evaluating risk factors

        // Example opportunity creation (replace with actual data)
        let opportunity = TokenOpportunity {
            token_address: "token_address".to_string(),
            pair_address: pair_address.to_string(),
            liquidity: 10000.0,
            holders: 100,
            market_cap: 50000.0,
            price: 0.0001,
            volume_24h: 5000.0,
            created_at: chrono::Utc::now(),
            risk_score: 0.5,
        };

        // Add opportunity if it meets criteria
        if self.evaluate_opportunity(&opportunity) {
            self.opportunities.push(opportunity);
        }

        Ok(())
    }

    fn evaluate_opportunity(&self, opportunity: &TokenOpportunity) -> bool {
        opportunity.liquidity >= self.min_liquidity &&
        opportunity.holders >= self.min_holders &&
        opportunity.market_cap >= self.min_market_cap &&
        opportunity.risk_score < 0.7 // Risk threshold
    }

    async fn cleanup_opportunities(&mut self) -> Result<()> {
        let now = chrono::Utc::now();
        let max_age = chrono::Duration::minutes(5);

        self.opportunities.retain(|opp| {
            now - opp.created_at < max_age
        });

        Ok(())
    }

    pub async fn get_opportunities(&self) -> Vec<TokenOpportunity> {
        self.opportunities.clone()
    }

    pub async fn add_pair_to_monitor(&mut self, pair_address: String) -> Result<()> {
        if !self.monitored_pairs.contains(&pair_address) {
            self.monitored_pairs.push(pair_address);
            info!("Radar {} added pair {} to monitoring", self.id, pair_address);
        }
        Ok(())
    }

    pub async fn remove_pair_from_monitor(&mut self, pair_address: &str) -> Result<()> {
        if let Some(pos) = self.monitored_pairs.iter().position(|p| p == pair_address) {
            self.monitored_pairs.remove(pos);
            info!("Radar {} removed pair {} from monitoring", self.id, pair_address);
        }
        Ok(())
    }

    pub async fn shutdown(&mut self) -> Result<()> {
        self.is_active = false;
        info!("Radar {} shutting down", self.id);
        Ok(())
    }

    // Getters
    pub fn get_id(&self) -> &str {
        &self.id
    }

    pub fn get_monitored_pairs(&self) -> &[String] {
        &self.monitored_pairs
    }

    pub fn is_active(&self) -> bool {
        self.is_active
    }
} 