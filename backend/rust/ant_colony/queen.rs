use anyhow::Result;
use config::Config;
use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::ant_colony::ColonyState;

pub struct Queen {
    id: String,
    state: Arc<RwLock<ColonyState>>,
    is_active: bool,
    total_capital: f64,
    reserve_capital: f64,
    reinvestment_threshold: f64,
    risk_threshold: f64,
}

impl Queen {
    pub async fn new(config: &Config, state: Arc<RwLock<ColonyState>>) -> Result<Self> {
        let reinvestment_threshold = config.get_float("ant_colony.queen.reinvestment_threshold")? as f64;
        let risk_threshold = config.get_float("ant_colony.queen.risk_threshold")? as f64;
        let initial_capital = config.get_float("ant_colony.queen.initial_capital")? as f64;

        Ok(Self {
            id: uuid::Uuid::new_v4().to_string(),
            state,
            is_active: false,
            total_capital: initial_capital,
            reserve_capital: initial_capital * 0.2, // 20% reserve
            reinvestment_threshold,
            risk_threshold,
        })
    }

    pub async fn start_monitoring(&mut self) -> Result<()> {
        self.is_active = true;
        info!("Queen {} started monitoring", self.id);

        while self.is_active {
            if let Err(e) = self.monitor_and_manage().await {
                error!("Queen {} monitoring error: {}", self.id, e);
            }
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        }

        Ok(())
    }

    async fn monitor_and_manage(&mut self) -> Result<()> {
        let mut state = self.state.write().await;
        
        // Update colony state
        state.total_capital = self.total_capital;
        state.risk_level = self.calculate_risk_level();

        // Check if we need to stop trading
        if state.risk_level > self.risk_threshold {
            warn!("Risk level {} exceeds threshold {}, stopping trades", 
                  state.risk_level, self.risk_threshold);
            state.is_active = false;
            return Ok(());
        }

        // Manage capital distribution
        self.manage_capital_distribution().await?;

        Ok(())
    }

    fn calculate_risk_level(&self) -> f64 {
        // Calculate risk level based on various factors
        let active_trades_risk = (self.state.read().await.active_trades as f64) / 100.0;
        let capital_utilization = 1.0 - (self.reserve_capital / self.total_capital);
        
        // Weighted average of risk factors
        (active_trades_risk * 0.4 + capital_utilization * 0.6)
    }

    async fn manage_capital_distribution(&mut self) -> Result<()> {
        let state = self.state.read().await;
        
        // Check if we need to replenish reserve
        if self.reserve_capital < self.total_capital * 0.2 {
            self.replenish_reserve().await?;
        }

        // Check if we should reinvest profits
        if self.total_capital > self.reinvestment_threshold {
            self.reinvest_profits().await?;
        }

        Ok(())
    }

    async fn replenish_reserve(&mut self) -> Result<()> {
        let target_reserve = self.total_capital * 0.2;
        let replenish_amount = target_reserve - self.reserve_capital;
        
        if replenish_amount > 0.0 {
            self.reserve_capital += replenish_amount;
            info!("Queen {} replenished reserve by {}", self.id, replenish_amount);
        }

        Ok(())
    }

    async fn reinvest_profits(&mut self) -> Result<()> {
        let reinvestment_amount = (self.total_capital - self.reinvestment_threshold) * 0.5;
        
        if reinvestment_amount > 0.0 {
            self.total_capital += reinvestment_amount;
            info!("Queen {} reinvested {} in profits", self.id, reinvestment_amount);
        }

        Ok(())
    }

    pub async fn shutdown(&mut self) -> Result<()> {
        self.is_active = false;
        info!("Queen {} shutting down", self.id);
        Ok(())
    }

    // Getters
    pub fn get_id(&self) -> &str {
        &self.id
    }

    pub fn get_total_capital(&self) -> f64 {
        self.total_capital
    }

    pub fn get_reserve_capital(&self) -> f64 {
        self.reserve_capital
    }

    pub fn is_active(&self) -> bool {
        self.is_active
    }
} 