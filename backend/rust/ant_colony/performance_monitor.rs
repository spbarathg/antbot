use anyhow::Result;
use config::Config;
use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc, Duration};
use crate::ant_colony::ColonyState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub success_rate: f64,
    pub avg_execution_time_ms: u64,
    pub avg_gas_fee: f64,
    pub total_trades: u64,
    pub successful_trades: u64,
    pub failed_trades: u64,
    pub total_profit: f64,
    pub total_gas_spent: f64,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScalingDecision {
    pub current_workers: u32,
    pub target_workers: u32,
    pub reason: String,
    pub metrics: PerformanceMetrics,
    pub timestamp: DateTime<Utc>,
}

pub struct PerformanceMonitor {
    id: String,
    state: Arc<RwLock<ColonyState>>,
    is_active: bool,
    metrics_history: Vec<PerformanceMetrics>,
    last_scaling_check: DateTime<Utc>,
    check_interval: i32, // minutes
    success_rate_threshold_low: f64,
    success_rate_threshold_high: f64,
    min_workers: u32,
    max_workers: u32,
    metrics_window: i32, // hours
}

impl PerformanceMonitor {
    pub async fn new(config: &Config, state: Arc<RwLock<ColonyState>>) -> Result<Self> {
        let check_interval = config.get_int("ant_colony.performance_monitor.check_interval")? as i32;
        let success_rate_threshold_low = config.get_float("ant_colony.performance_monitor.success_rate_threshold_low")? as f64;
        let success_rate_threshold_high = config.get_float("ant_colony.performance_monitor.success_rate_threshold_high")? as f64;
        let min_workers = config.get_int("ant_colony.performance_monitor.min_workers")? as u32;
        let max_workers = config.get_int("ant_colony.performance_monitor.max_workers")? as u32;
        let metrics_window = config.get_int("ant_colony.performance_monitor.metrics_window")? as i32;

        Ok(Self {
            id: uuid::Uuid::new_v4().to_string(),
            state,
            is_active: false,
            metrics_history: Vec::new(),
            last_scaling_check: Utc::now(),
            check_interval,
            success_rate_threshold_low,
            success_rate_threshold_high,
            min_workers,
            max_workers,
            metrics_window,
        })
    }

    pub async fn start_monitoring(&mut self) -> Result<()> {
        self.is_active = true;
        info!("Performance Monitor {} started monitoring", self.id);

        while self.is_active {
            if let Err(e) = self.monitor_and_scale().await {
                error!("Performance Monitor {} monitoring error: {}", self.id, e);
            }
            tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
        }

        Ok(())
    }

    async fn monitor_and_scale(&mut self) -> Result<()> {
        let now = Utc::now();
        
        // Check if it's time for scaling check
        if (now - self.last_scaling_check).num_minutes() >= self.check_interval {
            // Collect current metrics
            let metrics = self.collect_metrics().await?;
            
            // Add to history
            self.metrics_history.push(metrics.clone());
            
            // Clean up old metrics
            self.cleanup_old_metrics().await?;
            
            // Make scaling decision
            if let Some(decision) = self.make_scaling_decision(&metrics).await? {
                self.apply_scaling_decision(decision).await?;
            }
            
            self.last_scaling_check = now;
        }

        Ok(())
    }

    async fn collect_metrics(&self) -> Result<PerformanceMetrics> {
        let state = self.state.read().await;
        
        // Calculate success rate
        let total_trades = state.total_trades;
        let successful_trades = state.successful_trades;
        let success_rate = if total_trades > 0 {
            successful_trades as f64 / total_trades as f64
        } else {
            0.0
        };

        // Calculate average execution time
        let avg_execution_time = if !state.execution_times.is_empty() {
            state.execution_times.iter().sum::<u64>() / state.execution_times.len() as u64
        } else {
            0
        };

        // Calculate average gas fee
        let avg_gas_fee = if !state.gas_fees.is_empty() {
            state.gas_fees.iter().sum::<f64>() / state.gas_fees.len() as f64
        } else {
            0.0
        };

        Ok(PerformanceMetrics {
            success_rate,
            avg_execution_time_ms: avg_execution_time,
            avg_gas_fee,
            total_trades,
            successful_trades,
            failed_trades: total_trades - successful_trades,
            total_profit: state.total_profit,
            total_gas_spent: state.total_gas_spent,
            timestamp: Utc::now(),
        })
    }

    async fn make_scaling_decision(&self, metrics: &PerformanceMetrics) -> Result<Option<ScalingDecision>> {
        let state = self.state.read().await;
        let current_workers = state.active_workers.len() as u32;
        let mut target_workers = current_workers;
        let mut reason = String::new();

        // Check success rate
        if metrics.success_rate < self.success_rate_threshold_low {
            // Scale down
            target_workers = (current_workers as f64 * 0.7).max(self.min_workers as f64) as u32;
            reason = format!("Low success rate: {:.2}%", metrics.success_rate * 100.0);
        } else if metrics.success_rate > self.success_rate_threshold_high {
            // Scale up
            target_workers = (current_workers as f64 * 1.2).min(self.max_workers as f64) as u32;
            reason = format!("High success rate: {:.2}%", metrics.success_rate * 100.0);
        }

        // Check execution time
        if metrics.avg_execution_time_ms > 200 {
            // Scale down if execution is slow
            target_workers = (target_workers as f64 * 0.8).max(self.min_workers as f64) as u32;
            reason = format!("{} (Slow execution: {}ms)", reason, metrics.avg_execution_time_ms);
        }

        // Check gas fees
        if metrics.avg_gas_fee > 0.1 {
            // Scale down if gas fees are high
            target_workers = (target_workers as f64 * 0.9).max(self.min_workers as f64) as u32;
            reason = format!("{} (High gas fees: {:.4} SOL)", reason, metrics.avg_gas_fee);
        }

        // Only return decision if we need to scale
        if target_workers != current_workers {
            Ok(Some(ScalingDecision {
                current_workers,
                target_workers,
                reason,
                metrics: metrics.clone(),
                timestamp: Utc::now(),
            }))
        } else {
            Ok(None)
        }
    }

    async fn apply_scaling_decision(&self, decision: ScalingDecision) -> Result<()> {
        let mut state = self.state.write().await;
        
        info!("Performance Monitor {} applying scaling decision: {} -> {} workers. Reason: {}", 
              self.id, decision.current_workers, decision.target_workers, decision.reason);

        // Scale up or down
        if decision.target_workers > decision.current_workers {
            // Scale up
            let workers_to_add = decision.target_workers - decision.current_workers;
            for _ in 0..workers_to_add {
                if let Err(e) = state.add_worker().await {
                    error!("Failed to add worker: {}", e);
                }
            }
        } else {
            // Scale down
            let workers_to_remove = decision.current_workers - decision.target_workers;
            for _ in 0..workers_to_remove {
                if let Err(e) = state.remove_worker().await {
                    error!("Failed to remove worker: {}", e);
                }
            }
        }

        // Update AI model parameters based on performance
        self.update_ai_parameters(&decision.metrics).await?;

        Ok(())
    }

    async fn update_ai_parameters(&self, metrics: &PerformanceMetrics) -> Result<()> {
        let mut state = self.state.write().await;
        
        // Adjust confidence threshold based on success rate
        if metrics.success_rate < 0.3 {
            // Lower confidence threshold if success rate is low
            state.ai_confidence_threshold = (state.ai_confidence_threshold * 0.9).max(0.5);
            info!("Lowered AI confidence threshold to {:.2}", state.ai_confidence_threshold);
        } else if metrics.success_rate > 0.7 {
            // Raise confidence threshold if success rate is high
            state.ai_confidence_threshold = (state.ai_confidence_threshold * 1.1).min(0.9);
            info!("Raised AI confidence threshold to {:.2}", state.ai_confidence_threshold);
        }

        // Adjust risk threshold based on performance
        if metrics.success_rate < 0.3 {
            // Lower risk threshold if success rate is low
            state.risk_threshold = (state.risk_threshold * 0.9).max(0.5);
            info!("Lowered risk threshold to {:.2}", state.risk_threshold);
        } else if metrics.success_rate > 0.7 {
            // Raise risk threshold if success rate is high
            state.risk_threshold = (state.risk_threshold * 1.1).min(0.9);
            info!("Raised risk threshold to {:.2}", state.risk_threshold);
        }

        Ok(())
    }

    async fn cleanup_old_metrics(&mut self) -> Result<()> {
        let cutoff = Utc::now() - Duration::hours(self.metrics_window);
        self.metrics_history.retain(|m| m.timestamp >= cutoff);
        Ok(())
    }

    pub async fn shutdown(&self) -> Result<()> {
        info!("Performance Monitor {} shutting down", self.id);
        Ok(())
    }

    // Getters
    pub fn get_id(&self) -> &str {
        &self.id
    }

    pub fn is_active(&self) -> bool {
        self.is_active
    }

    pub fn get_metrics_history(&self) -> &[PerformanceMetrics] {
        &self.metrics_history
    }
} 