use anyhow::Result;
use config::Config;
use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::ant_colony::ColonyState;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapitalAllocation {
    pub princess_id: String,
    pub amount: f64,
    pub timestamp: DateTime<Utc>,
    pub status: AllocationStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AllocationStatus {
    Active,
    Sold,
    Available,
}

pub struct CapitalManager {
    id: String,
    state: Arc<RwLock<ColonyState>>,
    is_active: bool,
    worker_ant_budget: f64,
    max_active_workers: usize,
    min_active_workers: usize,
    allocations: Vec<CapitalAllocation>,
    available_capital: f64,
}

impl CapitalManager {
    pub async fn new(config: &Config, state: Arc<RwLock<ColonyState>>) -> Result<Self> {
        let worker_ant_budget = config.get_float("ant_colony.capital_manager.worker_ant_budget")? as f64;
        let max_active_workers = config.get_int("ant_colony.capital_manager.max_active_workers")? as usize;
        let min_active_workers = config.get_int("ant_colony.capital_manager.min_active_workers")? as usize;
        let initial_capital = config.get_float("ant_colony.capital_manager.initial_capital")? as f64;

        Ok(Self {
            id: uuid::Uuid::new_v4().to_string(),
            state,
            is_active: false,
            worker_ant_budget,
            max_active_workers,
            min_active_workers,
            allocations: Vec::new(),
            available_capital: initial_capital,
        })
    }

    pub async fn start_monitoring(&mut self) -> Result<()> {
        self.is_active = true;
        info!("Capital Manager {} started monitoring", self.id);

        while self.is_active {
            if let Err(e) = self.monitor_and_manage().await {
                error!("Capital Manager {} monitoring error: {}", self.id, e);
            }
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }

        Ok(())
    }

    async fn monitor_and_manage(&mut self) -> Result<()> {
        let state = self.state.read().await;
        
        // Skip if colony is not active
        if !state.is_active {
            return Ok(());
        }

        // Check for sold positions and reallocate capital
        self.check_and_reallocate_capital().await?;

        // Ensure minimum number of active workers
        self.ensure_minimum_workers().await?;

        // Clean up old allocations
        self.cleanup_old_allocations().await?;

        Ok(())
    }

    async fn check_and_reallocate_capital(&mut self) -> Result<()> {
        let mut i = 0;
        while i < self.allocations.len() {
            if matches!(self.allocations[i].status, AllocationStatus::Sold) {
                // Return capital to available pool
                self.available_capital += self.allocations[i].amount;
                
                // Remove the allocation
                self.allocations.remove(i);
                
                // Try to allocate to a new worker
                if let Err(e) = self.allocate_to_new_worker().await {
                    warn!("Failed to allocate capital to new worker: {}", e);
                }
            } else {
                i += 1;
            }
        }

        Ok(())
    }

    async fn allocate_to_new_worker(&mut self) -> Result<()> {
        // Check if we can allocate more capital
        if self.available_capital < self.worker_ant_budget {
            return Ok(());
        }

        // Check if we've reached max workers
        let active_count = self.allocations.iter()
            .filter(|a| matches!(a.status, AllocationStatus::Active))
            .count();

        if active_count >= self.max_active_workers {
            return Ok(());
        }

        // Create new allocation
        let allocation = CapitalAllocation {
            princess_id: format!("princess_{}", uuid::Uuid::new_v4()),
            amount: self.worker_ant_budget,
            timestamp: Utc::now(),
            status: AllocationStatus::Active,
        };

        // Update available capital
        self.available_capital -= self.worker_ant_budget;

        // Add allocation
        self.allocations.push(allocation);

        info!("Capital Manager {} allocated {} to new worker", 
              self.id, self.worker_ant_budget);

        Ok(())
    }

    async fn ensure_minimum_workers(&mut self) -> Result<()> {
        let active_count = self.allocations.iter()
            .filter(|a| matches!(a.status, AllocationStatus::Active))
            .count();

        if active_count < self.min_active_workers {
            let needed = self.min_active_workers - active_count;
            for _ in 0..needed {
                if let Err(e) = self.allocate_to_new_worker().await {
                    warn!("Failed to allocate capital for minimum workers: {}", e);
                }
            }
        }

        Ok(())
    }

    async fn cleanup_old_allocations(&mut self) -> Result<()> {
        let now = Utc::now();
        let max_age = chrono::Duration::hours(24);

        self.allocations.retain(|allocation| {
            now - allocation.timestamp < max_age
        });

        Ok(())
    }

    pub async fn mark_allocation_sold(&mut self, princess_id: &str) -> Result<()> {
        if let Some(allocation) = self.allocations.iter_mut()
            .find(|a| a.princess_id == princess_id) {
            allocation.status = AllocationStatus::Sold;
            info!("Capital Manager {} marked allocation for {} as sold", 
                  self.id, princess_id);
        }

        Ok(())
    }

    pub async fn get_available_capital(&self) -> f64 {
        self.available_capital
    }

    pub async fn get_active_allocations(&self) -> Vec<CapitalAllocation> {
        self.allocations.iter()
            .filter(|a| matches!(a.status, AllocationStatus::Active))
            .cloned()
            .collect()
    }

    pub async fn shutdown(&mut self) -> Result<()> {
        self.is_active = false;
        info!("Capital Manager {} shutting down", self.id);
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