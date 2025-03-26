use anyhow::Result;
use config::Config;
use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::sniping_core::SnipingState;

#[derive(Debug, Clone)]
pub enum ExitStrategy {
    TakeProfit {
        target_price: f64,
        stop_loss: f64,
    },
    TrailingStop {
        initial_stop: f64,
        trailing_distance: f64,
    },
    TimeBased {
        max_duration: chrono::Duration,
        min_profit: f64,
    },
    VolumeBased {
        target_volume: f64,
        min_profit: f64,
    },
}

#[derive(Debug, Clone)]
pub struct ActiveTrade {
    pub token_address: String,
    pub entry_price: f64,
    pub amount: f64,
    pub entry_time: chrono::DateTime<chrono::Utc>,
    pub strategy: ExitStrategy,
    pub current_stop_loss: f64,
    pub highest_price: f64,
}

pub struct ExitManager {
    id: String,
    state: Arc<RwLock<SnipingState>>,
    is_active: bool,
    active_trades: Vec<ActiveTrade>,
    min_profit_threshold: f64,
    max_loss_threshold: f64,
}

impl ExitManager {
    pub async fn new(config: &Config, state: Arc<RwLock<SnipingState>>) -> Result<Self> {
        let min_profit_threshold = config.get_float("sniping_core.exit_strategies.min_profit_threshold")? as f64;
        let max_loss_threshold = config.get_float("sniping_core.exit_strategies.max_loss_threshold")? as f64;

        Ok(Self {
            id: uuid::Uuid::new_v4().to_string(),
            state,
            is_active: false,
            active_trades: Vec::new(),
            min_profit_threshold,
            max_loss_threshold,
        })
    }

    pub async fn init(&mut self, config: &Config) -> Result<()> {
        // Initialize any necessary resources
        info!("Exit Manager {} initialized", self.id);
        Ok(())
    }

    pub async fn start_monitoring(&mut self) -> Result<()> {
        self.is_active = true;
        info!("Exit Manager {} started monitoring", self.id);

        while self.is_active {
            if let Err(e) = self.monitor_trades().await {
                error!("Exit Manager {} monitoring error: {}", self.id, e);
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }

        Ok(())
    }

    async fn monitor_trades(&mut self) -> Result<()> {
        let state = self.state.read().await;
        
        // Skip if sniping core is not active
        if !state.is_active {
            return Ok(());
        }

        // Monitor each active trade
        for trade in &self.active_trades {
            if let Err(e) = self.check_exit_conditions(trade).await {
                warn!("Error checking exit conditions for token {}: {}", 
                      trade.token_address, e);
            }
        }

        // Clean up closed trades
        self.cleanup_closed_trades().await?;

        Ok(())
    }

    async fn check_exit_conditions(&mut self, trade: &ActiveTrade) -> Result<()> {
        // Placeholder for checking current price and conditions
        let current_price = 0.0; // Replace with actual price fetching
        let profit_percentage = (current_price - trade.entry_price) / trade.entry_price * 100.0;

        match &trade.strategy {
            ExitStrategy::TakeProfit { target_price, stop_loss } => {
                if current_price >= *target_price || current_price <= *stop_loss {
                    self.execute_exit(trade, current_price).await?;
                }
            },
            ExitStrategy::TrailingStop { initial_stop, trailing_distance } => {
                let new_stop = current_price - trailing_distance;
                if current_price <= new_stop {
                    self.execute_exit(trade, current_price).await?;
                }
            },
            ExitStrategy::TimeBased { max_duration, min_profit } => {
                let duration = chrono::Utc::now() - trade.entry_time;
                if duration > *max_duration && profit_percentage >= *min_profit {
                    self.execute_exit(trade, current_price).await?;
                }
            },
            ExitStrategy::VolumeBased { target_volume, min_profit } => {
                let current_volume = 0.0; // Replace with actual volume fetching
                if current_volume >= *target_volume && profit_percentage >= *min_profit {
                    self.execute_exit(trade, current_price).await?;
                }
            }
        }

        Ok(())
    }

    async fn execute_exit(&mut self, trade: &ActiveTrade, current_price: f64) -> Result<()> {
        // Placeholder for exit execution logic
        // This would involve:
        // 1. Calculating final profit/loss
        // 2. Building and signing sell transaction
        // 3. Broadcasting transaction
        // 4. Monitoring confirmation
        // 5. Updating state

        info!("Exit Manager {} executing exit for token {} at price {}", 
              self.id, trade.token_address, current_price);

        // Remove trade from active trades
        if let Some(pos) = self.active_trades.iter()
            .position(|t| t.token_address == trade.token_address) {
            self.active_trades.remove(pos);
        }

        Ok(())
    }

    async fn cleanup_closed_trades(&mut self) -> Result<()> {
        // Clean up any trades that have been closed for a while
        let now = chrono::Utc::now();
        let max_age = chrono::Duration::hours(24);

        self.active_trades.retain(|trade| {
            now - trade.entry_time < max_age
        });

        Ok(())
    }

    pub async fn add_trade(&mut self, trade: ActiveTrade) -> Result<()> {
        self.active_trades.push(trade);
        info!("Exit Manager {} added new trade", self.id);
        Ok(())
    }

    pub async fn remove_trade(&mut self, token_address: &str) -> Result<()> {
        if let Some(pos) = self.active_trades.iter()
            .position(|t| t.token_address == token_address) {
            self.active_trades.remove(pos);
            info!("Exit Manager {} removed trade for token {}", 
                  self.id, token_address);
        }
        Ok(())
    }

    pub async fn shutdown(&mut self) -> Result<()> {
        self.is_active = false;
        
        // Execute exits for all active trades
        for trade in &self.active_trades {
            if let Err(e) = self.execute_exit(trade, 0.0).await {
                error!("Error executing exit for token {}: {}", 
                       trade.token_address, e);
            }
        }

        info!("Exit Manager {} shutting down", self.id);
        Ok(())
    }

    // Getters
    pub fn get_id(&self) -> &str {
        &self.id
    }

    pub fn get_active_trades(&self) -> &[ActiveTrade] {
        &self.active_trades
    }

    pub fn is_active(&self) -> bool {
        self.is_active
    }
} 