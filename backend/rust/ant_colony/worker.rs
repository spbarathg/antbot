use anyhow::Result;
use config::Config;
use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::ant_colony::ColonyState;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkerState {
    pub total_collected_profits: f64,
    pub reinvested_amount: f64,
    pub vault_amount: f64,
    pub last_collection_time: Option<DateTime<Utc>>,
    pub active_collections: Vec<String>,
}

pub struct Worker {
    id: String,
    state: Arc<RwLock<ColonyState>>,
    worker_state: Arc<RwLock<WorkerState>>,
    is_active: bool,
    reinvestment_rate: f64,
    collection_interval: u64,
    min_profit_threshold: f64,
    max_collections: u32,
}

impl Worker {
    pub async fn new(config: &Config, state: Arc<RwLock<ColonyState>>) -> Result<Self> {
        let reinvestment_rate = config.get_float("ant_colony.worker.reinvestment_rate")? as f64;
        let collection_interval = config.get_int("ant_colony.worker.collection_interval")? as u64;
        let min_profit_threshold = config.get_float("ant_colony.worker.min_profit_threshold")? as f64;
        let max_collections = config.get_int("ant_colony.worker.max_collections")? as u32;

        let worker_state = Arc::new(RwLock::new(WorkerState {
            total_collected_profits: 0.0,
            reinvested_amount: 0.0,
            vault_amount: 0.0,
            last_collection_time: None,
            active_collections: Vec::new(),
        }));

        Ok(Self {
            id: uuid::Uuid::new_v4().to_string(),
            state,
            worker_state,
            is_active: false,
            reinvestment_rate,
            collection_interval,
            min_profit_threshold,
            max_collections,
        })
    }

    pub async fn init(&mut self) -> Result<()> {
        self.is_active = true;
        info!("Worker {} initialized with reinvestment rate: {}%", 
              self.id, self.reinvestment_rate * 100.0);
        Ok(())
    }

    pub async fn collect_profits(&self, princess_id: &str, profit: f64) -> Result<()> {
        let mut worker_state = self.worker_state.write().await;

        // Validate collection
        if !self.can_collect_profits(princess_id).await? {
            warn!("Worker {} cannot collect profits from Princess {}: max collections reached", 
                  self.id, princess_id);
            return Ok(());
        }

        // Calculate distribution
        let (reinvestment, vault) = self.calculate_profit_distribution(profit);

        // Update states
        worker_state.total_collected_profits += profit;
        worker_state.reinvested_amount += reinvestment;
        worker_state.vault_amount += vault;
        worker_state.last_collection_time = Some(Utc::now());
        worker_state.active_collections.push(princess_id.to_string());

        info!(
            "Worker {} collected profits from Princess {} - Total: {}, Reinvested: {}, Vault: {}",
            self.id, princess_id, profit, reinvestment, vault
        );

        // Distribute profits
        self.distribute_profits(reinvestment, vault).await?;

        Ok(())
    }

    async fn can_collect_profits(&self, princess_id: &str) -> Result<bool> {
        let worker_state = self.worker_state.read().await;
        
        // Check if we've reached max collections
        if worker_state.active_collections.len() >= self.max_collections as usize {
            return Ok(false);
        }

        // Check if we've already collected from this princess
        if worker_state.active_collections.contains(&princess_id.to_string()) {
            return Ok(false);
        }

        Ok(true)
    }

    fn calculate_profit_distribution(&self, profit: f64) -> (f64, f64) {
        let reinvestment = profit * self.reinvestment_rate;
        let vault = profit - reinvestment;
        (reinvestment, vault)
    }

    async fn distribute_profits(&self, reinvestment: f64, vault: f64) -> Result<()> {
        let mut colony_state = self.state.write().await;

        // Add reinvestment to colony capital
        colony_state.total_capital += reinvestment;

        // TODO: Implement vault storage
        // This would involve:
        // 1. Securing the vault amount
        // 2. Recording the transaction
        // 3. Updating vault balance

        info!(
            "Worker {} distributed profits - Reinvested: {}, Vault: {}",
            self.id, reinvestment, vault
        );
        Ok(())
    }

    pub async fn run(&self) -> Result<()> {
        while self.is_active {
            // Monitor active collections
            self.monitor_collections().await?;

            // Check for collection timeouts
            self.check_collection_timeouts().await?;

            // Sleep for a short interval
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }
        Ok(())
    }

    async fn monitor_collections(&self) -> Result<()> {
        let worker_state = self.worker_state.read().await;
        
        for princess_id in &worker_state.active_collections {
            // TODO: Implement collection monitoring
            // This would involve:
            // 1. Checking collection status
            // 2. Verifying profit distribution
            // 3. Monitoring vault balance
            // 4. Handling any issues
        }
        Ok(())
    }

    async fn check_collection_timeouts(&self) -> Result<()> {
        let mut worker_state = self.worker_state.write().await;
        let now = Utc::now();

        worker_state.active_collections.retain(|princess_id| {
            if let Some(last_collection) = worker_state.last_collection_time {
                let duration = now.signed_duration_since(last_collection);
                if duration.num_seconds() > self.collection_interval as i64 {
                    warn!(
                        "Worker {} collection timeout for Princess {}",
                        self.id, princess_id
                    );
                    return false;
                }
            }
            true
        });
        Ok(())
    }

    pub async fn shutdown(&self) -> Result<()> {
        self.is_active = false;
        
        // Finalize all active collections
        let mut worker_state = self.worker_state.write().await;
        for princess_id in &worker_state.active_collections {
            // TODO: Implement graceful collection finalization
            warn!("Worker {} finalizing collection for Princess {}", self.id, princess_id);
        }
        worker_state.active_collections.clear();

        info!("Worker {} shutdown complete", self.id);
        Ok(())
    }
} 