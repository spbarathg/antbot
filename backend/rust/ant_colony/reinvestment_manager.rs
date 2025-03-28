use anyhow::Result;
use config::Config;
use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};
use crate::ant_colony::ColonyState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReinvestmentMetrics {
    pub total_profits: f64,
    pub reinvested_amount: f64,
    pub reserve_amount: f64,
    pub reinvestment_rate: f64,
    pub reserve_rate: f64,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReinvestmentDecision {
    pub profit_amount: f64,
    pub reinvestment_amount: f64,
    pub reserve_amount: f64,
    pub reason: String,
    pub metrics: ReinvestmentMetrics,
    pub timestamp: DateTime<Utc>,
}

pub struct ReinvestmentManager {
    id: String,
    state: Arc<RwLock<ColonyState>>,
    is_active: bool,
    metrics_history: Vec<ReinvestmentMetrics>,
    last_reinvestment_check: DateTime<Utc>,
    check_interval: i32, // minutes
    reinvestment_rate: f64,
    reserve_rate: f64,
    min_reinvestment_amount: f64,
    max_reinvestment_amount: f64,
    min_reserve_amount: f64,
    metrics_window: i32, // hours
}

impl ReinvestmentManager {
    pub async fn new(config: &Config, state: Arc<RwLock<ColonyState>>) -> Result<Self> {
        let check_interval = config.get_int("ant_colony.reinvestment_manager.check_interval")? as i32;
        let reinvestment_rate = config.get_float("ant_colony.reinvestment_manager.reinvestment_rate")? as f64;
        let reserve_rate = config.get_float("ant_colony.reinvestment_manager.reserve_rate")? as f64;
        let min_reinvestment = config.get_float("ant_colony.reinvestment_manager.min_reinvestment_amount")? as f64;
        let max_reinvestment = config.get_float("ant_colony.reinvestment_manager.max_reinvestment_amount")? as f64;
        let min_reserve = config.get_float("ant_colony.reinvestment_manager.min_reserve_amount")? as f64;
        let metrics_window = config.get_int("ant_colony.reinvestment_manager.metrics_window")? as i32;

        Ok(Self {
            id: uuid::Uuid::new_v4().to_string(),
            state,
            is_active: false,
            metrics_history: Vec::new(),
            last_reinvestment_check: Utc::now(),
            check_interval,
            reinvestment_rate,
            reserve_rate,
            min_reinvestment_amount: min_reinvestment,
            max_reinvestment_amount: max_reinvestment,
            min_reserve_amount: min_reserve,
            metrics_window,
        })
    }

    pub async fn start_monitoring(&mut self) -> Result<()> {
        self.is_active = true;
        info!("Reinvestment Manager {} started monitoring", self.id);

        while self.is_active {
            if let Err(e) = self.monitor_and_reinvest().await {
                error!("Reinvestment Manager {} monitoring error: {}", self.id, e);
            }
            tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
        }

        Ok(())
    }

    async fn monitor_and_reinvest(&mut self) -> Result<()> {
        let now = Utc::now();
        
        // Check if it's time for reinvestment check
        if (now - self.last_reinvestment_check).num_minutes() >= self.check_interval {
            // Collect current metrics
            let metrics = self.collect_metrics().await?;
            
            // Add to history
            self.metrics_history.push(metrics.clone());
            
            // Clean up old metrics
            self.cleanup_old_metrics().await?;
            
            // Make reinvestment decision
            if let Some(decision) = self.make_reinvestment_decision(&metrics).await? {
                self.apply_reinvestment_decision(decision).await?;
            }
            
            self.last_reinvestment_check = now;
        }

        Ok(())
    }

    async fn collect_metrics(&self) -> Result<ReinvestmentMetrics> {
        let state = self.state.read().await;
        
        // Calculate total profits
        let total_profits = state.total_profit;
        
        // Calculate reinvested and reserve amounts
        let reinvested_amount = total_profits * self.reinvestment_rate;
        let reserve_amount = total_profits * self.reserve_rate;

        Ok(ReinvestmentMetrics {
            total_profits,
            reinvested_amount,
            reserve_amount,
            reinvestment_rate: self.reinvestment_rate,
            reserve_rate: self.reserve_rate,
            timestamp: Utc::now(),
        })
    }

    async fn make_reinvestment_decision(&self, metrics: &ReinvestmentMetrics) -> Result<Option<ReinvestmentDecision>> {
        let state = self.state.read().await;
        let mut reason = String::new();

        // Calculate reinvestment amount
        let mut reinvestment_amount = metrics.total_profits * self.reinvestment_rate;
        
        // Apply limits
        if reinvestment_amount < self.min_reinvestment_amount {
            reinvestment_amount = 0.0;
            reason = format!("Reinvestment amount {:.2} below minimum threshold {:.2}", 
                           reinvestment_amount, self.min_reinvestment_amount);
        } else if reinvestment_amount > self.max_reinvestment_amount {
            reinvestment_amount = self.max_reinvestment_amount;
            reason = format!("Reinvestment amount capped at maximum threshold {:.2}", 
                           self.max_reinvestment_amount);
        }

        // Calculate reserve amount
        let reserve_amount = metrics.total_profits * self.reserve_rate;

        // Check if we need to maintain minimum reserve
        if reserve_amount < self.min_reserve_amount {
            let reserve_adjustment = self.min_reserve_amount - reserve_amount;
            reinvestment_amount -= reserve_adjustment;
            reason = format!("{} (Adjusted for minimum reserve: {:.2})", 
                           reason, reserve_adjustment);
        }

        // Only return decision if we have profits to reinvest
        if reinvestment_amount > 0.0 {
            Ok(Some(ReinvestmentDecision {
                profit_amount: metrics.total_profits,
                reinvestment_amount,
                reserve_amount,
                reason,
                metrics: metrics.clone(),
                timestamp: Utc::now(),
            }))
        } else {
            Ok(None)
        }
    }

    async fn apply_reinvestment_decision(&self, decision: ReinvestmentDecision) -> Result<()> {
        let mut state = self.state.write().await;
        
        info!("Reinvestment Manager {} applying reinvestment decision: {:.2} SOL to reinvest, {:.2} SOL to reserve. Reason: {}", 
              self.id, decision.reinvestment_amount, decision.reserve_amount, decision.reason);

        // Add to worker ant allocation
        if let Err(e) = state.add_to_worker_allocation(decision.reinvestment_amount).await {
            error!("Failed to add to worker allocation: {}", e);
        }

        // Add to reserve
        if let Err(e) = state.add_to_reserve(decision.reserve_amount).await {
            error!("Failed to add to reserve: {}", e);
        }

        // Update total reinvested amount
        state.total_reinvested += decision.reinvestment_amount;
        state.total_reserve += decision.reserve_amount;

        Ok(())
    }

    async fn cleanup_old_metrics(&mut self) -> Result<()> {
        let cutoff = Utc::now() - chrono::Duration::hours(self.metrics_window);
        self.metrics_history.retain(|m| m.timestamp >= cutoff);
        Ok(())
    }

    pub async fn shutdown(&self) -> Result<()> {
        info!("Reinvestment Manager {} shutting down", self.id);
        Ok(())
    }

    // Getters
    pub fn get_id(&self) -> &str {
        &self.id
    }

    pub fn is_active(&self) -> bool {
        self.is_active
    }

    pub fn get_metrics_history(&self) -> &[ReinvestmentMetrics] {
        &self.metrics_history
    }
} 