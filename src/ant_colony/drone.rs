use anyhow::Result;
use config::Config;
use log::{info, error};
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::ant_colony::ColonyState;

pub struct Drone {
    id: String,
    state: Arc<RwLock<ColonyState>>,
    is_active: bool,
    allocated_capital: f64,
    max_allocation: f64,
    min_allocation: f64,
}

impl Drone {
    pub async fn new(config: &Config, state: Arc<RwLock<ColonyState>>) -> Result<Self> {
        let max_allocation = config.get_float("ant_colony.drone.max_allocation")? as f64;
        let min_allocation = config.get_float("ant_colony.drone.min_allocation")? as f64;

        Ok(Self {
            id: uuid::Uuid::new_v4().to_string(),
            state,
            is_active: false,
            allocated_capital: 0.0,
            max_allocation,
            min_allocation,
        })
    }

    pub async fn start_monitoring(&mut self) -> Result<()> {
        self.is_active = true;
        info!("Drone {} started monitoring", self.id);

        while self.is_active {
            if let Err(e) = self.monitor_and_allocate().await {
                error!("Drone {} monitoring error: {}", self.id, e);
            }
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }

        Ok(())
    }

    async fn monitor_and_allocate(&mut self) -> Result<()> {
        let state = self.state.read().await;
        
        // Skip if colony is not active
        if !state.is_active {
            return Ok(());
        }

        // Calculate allocation based on risk level and available capital
        let risk_factor = 1.0 - state.risk_level;
        let available_capital = state.total_capital * risk_factor;
        
        // Determine if we need to adjust allocation
        if available_capital > self.allocated_capital {
            self.increase_allocation(available_capital).await?;
        } else if available_capital < self.allocated_capital {
            self.decrease_allocation(available_capital).await?;
        }

        Ok(())
    }

    async fn increase_allocation(&mut self, available_capital: f64) -> Result<()> {
        let new_allocation = (self.allocated_capital + available_capital)
            .min(self.max_allocation);
        
        if new_allocation > self.allocated_capital {
            self.allocated_capital = new_allocation;
            info!("Drone {} increased allocation to {}", self.id, new_allocation);
        }

        Ok(())
    }

    async fn decrease_allocation(&mut self, available_capital: f64) -> Result<()> {
        let new_allocation = (self.allocated_capital - available_capital)
            .max(self.min_allocation);
        
        if new_allocation < self.allocated_capital {
            self.allocated_capital = new_allocation;
            info!("Drone {} decreased allocation to {}", self.id, new_allocation);
        }

        Ok(())
    }

    pub async fn shutdown(&mut self) -> Result<()> {
        self.is_active = false;
        info!("Drone {} shutting down", self.id);
        Ok(())
    }

    // Getters
    pub fn get_id(&self) -> &str {
        &self.id
    }

    pub fn get_allocated_capital(&self) -> f64 {
        self.allocated_capital
    }

    pub fn is_active(&self) -> bool {
        self.is_active
    }
} 