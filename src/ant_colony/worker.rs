use anyhow::Result;
use config::Config;
use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::ant_colony::ColonyState;

pub struct Worker {
    id: String,
    state: Arc<RwLock<ColonyState>>,
    is_active: bool,
    collected_profits: f64,
    reinvestment_threshold: f64,
    profit_distribution: f64, // Percentage to distribute to Queen
}

impl Worker {
    pub async fn new(config: &Config, state: Arc<RwLock<ColonyState>>) -> Result<Self> {
        let reinvestment_threshold = config.get_float("ant_colony.worker.reinvestment_threshold")? as f64;
        let profit_distribution = config.get_float("ant_colony.worker.profit_distribution")? as f64;

        Ok(Self {
            id: uuid::Uuid::new_v4().to_string(),
            state,
            is_active: false,
            collected_profits: 0.0,
            reinvestment_threshold,
            profit_distribution,
        })
    }

    pub async fn start_monitoring(&mut self) -> Result<()> {
        self.is_active = true;
        info!("Worker {} started monitoring", self.id);

        while self.is_active {
            if let Err(e) = self.monitor_and_manage().await {
                error!("Worker {} monitoring error: {}", self.id, e);
            }
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        }

        Ok(())
    }

    async fn monitor_and_manage(&mut self) -> Result<()> {
        let state = self.state.read().await;
        
        // Skip if colony is not active
        if !state.is_active {
            return Ok(());
        }

        // Collect profits from various sources
        self.collect_profits().await?;

        // Manage profit distribution
        self.manage_profit_distribution().await?;

        Ok(())
    }

    async fn collect_profits(&mut self) -> Result<()> {
        // Placeholder for profit collection logic
        // This would involve:
        // 1. Monitoring closed trades
        // 2. Calculating realized profits
        // 3. Collecting fees and rewards
        // 4. Updating collected_profits

        Ok(())
    }

    async fn manage_profit_distribution(&mut self) -> Result<()> {
        if self.collected_profits >= self.reinvestment_threshold {
            self.distribute_profits().await?;
        }

        Ok(())
    }

    async fn distribute_profits(&mut self) -> Result<()> {
        let distribution_amount = self.collected_profits * self.profit_distribution;
        
        if distribution_amount > 0.0 {
            // Placeholder for actual profit distribution logic
            // This would involve:
            // 1. Transferring profits to Queen's vault
            // 2. Updating colony state
            // 3. Recording distribution in logs
            
            self.collected_profits -= distribution_amount;
            info!("Worker {} distributed {} profits", self.id, distribution_amount);
        }

        Ok(())
    }

    pub async fn record_profit(&mut self, amount: f64) -> Result<()> {
        if amount <= 0.0 {
            return Err(anyhow::anyhow!("Invalid profit amount"));
        }

        self.collected_profits += amount;
        info!("Worker {} recorded profit of {}", self.id, amount);

        // Check if we should distribute profits
        if self.collected_profits >= self.reinvestment_threshold {
            self.distribute_profits().await?;
        }

        Ok(())
    }

    pub async fn shutdown(&mut self) -> Result<()> {
        self.is_active = false;
        
        // Distribute any remaining profits
        if self.collected_profits > 0.0 {
            self.distribute_profits().await?;
        }

        info!("Worker {} shutting down", self.id);
        Ok(())
    }

    // Getters
    pub fn get_id(&self) -> &str {
        &self.id
    }

    pub fn get_collected_profits(&self) -> f64 {
        self.collected_profits
    }

    pub fn is_active(&self) -> bool {
        self.is_active
    }
} 