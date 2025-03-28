use anyhow::Result;
use config::Config;
use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::ant_colony::{
    ColonyState, 
    capital_manager::CapitalManager,
    profit_manager::{ProfitManager, TradeProfit},
    rug_detector::RugDetector,
    transaction_handler::TransactionHandler,
};
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};
use solana_sdk::transaction::Transaction;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trade {
    pub token_address: String,
    pub amount: f64,
    pub entry_price: f64,
    pub entry_time: DateTime<Utc>,
    pub status: TradeStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TradeStatus {
    Active,
    Sold,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrincessState {
    pub wallet_address: String,
    pub allocated_capital: f64,
    pub active_trades: Vec<String>,
    pub total_profit: f64,
    pub success_rate: f64,
    pub last_trade_time: Option<DateTime<Utc>>,
}

pub struct Princess {
    id: String,
    state: Arc<RwLock<ColonyState>>,
    capital_manager: Arc<RwLock<CapitalManager>>,
    profit_manager: Arc<RwLock<ProfitManager>>,
    rug_detector: Arc<RwLock<RugDetector>>,
    transaction_handler: Arc<RwLock<TransactionHandler>>,
    is_active: bool,
    wallet_address: String,
    balance: f64,
    max_position_size: f64,
    min_position_size: f64,
    active_trades: Vec<Trade>,
    princess_state: Arc<RwLock<PrincessState>>,
    max_trades: u32,
    min_success_rate: f64,
    capital_allocation: f64,
    trade_timeout: u64,
}

impl Princess {
    pub async fn new(
        config: &Config, 
        state: Arc<RwLock<ColonyState>>,
        capital_manager: Arc<RwLock<CapitalManager>>,
        profit_manager: Arc<RwLock<ProfitManager>>,
        rug_detector: Arc<RwLock<RugDetector>>,
        transaction_handler: Arc<RwLock<TransactionHandler>>,
    ) -> Result<Self> {
        let max_position_size = config.get_float("ant_colony.princess.max_position_size")? as f64;
        let min_position_size = config.get_float("ant_colony.princess.min_position_size")? as f64;
        let initial_balance = config.get_float("ant_colony.princess.initial_balance")? as f64;
        let max_trades = config.get_int("ant_colony.princess.max_trades")? as u32;
        let min_success_rate = config.get_float("ant_colony.princess.min_success_rate")? as f64;
        let capital_allocation = config.get_float("ant_colony.princess.capital_allocation")? as f64;
        let trade_timeout = config.get_int("ant_colony.princess.trade_timeout")? as u64;

        let princess_state = Arc::new(RwLock::new(PrincessState {
            wallet_address: "".to_string(), // Will be set during initialization
            allocated_capital: 0.0,
            active_trades: Vec::new(),
            total_profit: 0.0,
            success_rate: 1.0,
            last_trade_time: None,
        }));

        Ok(Self {
            id: uuid::Uuid::new_v4().to_string(),
            state,
            capital_manager,
            profit_manager,
            rug_detector,
            transaction_handler,
            is_active: false,
            wallet_address,
            balance: initial_balance,
            max_position_size,
            min_position_size,
            active_trades: Vec::new(),
            princess_state,
            max_trades,
            min_success_rate,
            capital_allocation,
            trade_timeout,
        })
    }

    pub async fn init(&mut self) -> Result<()> {
        // Initialize wallet and allocate capital
        self.initialize_wallet().await?;
        self.allocate_capital().await?;
        self.is_active = true;
        info!("Princess {} initialized with capital: {}", self.id, self.capital_allocation);
        Ok(())
    }

    async fn initialize_wallet(&mut self) -> Result<()> {
        // TODO: Implement wallet initialization
        // This would involve:
        // 1. Creating a new wallet
        // 2. Securing the private key
        // 3. Setting up transaction signing
        let mut state = self.princess_state.write().await;
        state.wallet_address = "new_wallet_address".to_string(); // Placeholder
        Ok(())
    }

    async fn allocate_capital(&mut self) -> Result<()> {
        let mut colony_state = self.state.write().await;
        let mut princess_state = self.princess_state.write().await;

        // Calculate available capital
        let available_capital = colony_state.total_capital * self.capital_allocation;
        
        // Update states
        colony_state.total_capital -= available_capital;
        princess_state.allocated_capital = available_capital;

        info!(
            "Princess {} allocated capital: {} ({}% of total)",
            self.id,
            available_capital,
            self.capital_allocation * 100.0
        );
        Ok(())
    }

    pub async fn execute_trade(&self, token_address: String, amount: f64) -> Result<()> {
        let mut princess_state = self.princess_state.write().await;

        // Validate trade
        if !self.can_execute_trade(amount).await? {
            warn!("Princess {} cannot execute trade: insufficient capital", self.id);
            return Ok(());
        }

        // Execute trade
        match self._execute_trade(&token_address, amount).await {
            Ok(_) => {
                princess_state.active_trades.push(token_address);
                princess_state.last_trade_time = Some(Utc::now());
                info!("Princess {} executed trade for {}", self.id, amount);
                Ok(())
            }
            Err(e) => {
                error!("Princess {} trade execution failed: {}", self.id, e);
                Err(e)
            }
        }
    }

    async fn can_execute_trade(&self, amount: f64) -> Result<bool> {
        let princess_state = self.princess_state.read().await;
        
        // Check if we have enough capital
        if amount > princess_state.allocated_capital {
            return Ok(false);
        }

        // Check if we've reached max trades
        if princess_state.active_trades.len() >= self.max_trades as usize {
            return Ok(false);
        }

        // Check success rate
        if princess_state.success_rate < self.min_success_rate {
            return Ok(false);
        }

        Ok(true)
    }

    async fn _execute_trade(&self, token_address: &str, amount: f64) -> Result<()> {
        // TODO: Implement actual trade execution
        // This would involve:
        // 1. Creating the transaction
        // 2. Signing the transaction
        // 3. Sending the transaction
        // 4. Waiting for confirmation
        Ok(())
    }

    pub async fn update_trade_status(&self, token_address: &str, success: bool, profit: f64) -> Result<()> {
        let mut princess_state = self.princess_state.write().await;

        // Update trade status
        if let Some(pos) = princess_state.active_trades.iter().position(|x| x == token_address) {
            princess_state.active_trades.remove(pos);
        }

        // Update profit and success rate
        princess_state.total_profit += profit;
        princess_state.success_rate = self.calculate_success_rate(success).await?;

        info!(
            "Princess {} trade update - Token: {}, Success: {}, Profit: {}",
            self.id, token_address, success, profit
        );
        Ok(())
    }

    async fn calculate_success_rate(&self, new_trade_success: bool) -> Result<f64> {
        let princess_state = self.princess_state.read().await;
        let current_rate = princess_state.success_rate;
        let total_trades = princess_state.active_trades.len() as f64 + 1.0;

        // Weighted average calculation
        let new_rate = (current_rate * (total_trades - 1.0) + (new_trade_success as u32 as f64)) / total_trades;
        Ok(new_rate)
    }

    pub async fn run(&self) -> Result<()> {
        while self.is_active {
            // Monitor active trades
            self.monitor_trades().await?;

            // Check for trade timeouts
            self.check_trade_timeouts().await?;

            // Sleep for a short interval
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }
        Ok(())
    }

    async fn monitor_trades(&self) -> Result<()> {
        let princess_state = self.princess_state.read().await;
        
        for token_address in &princess_state.active_trades {
            // TODO: Implement trade monitoring
            // This would involve:
            // 1. Checking token price
            // 2. Monitoring liquidity
            // 3. Tracking profit/loss
            // 4. Triggering exits if needed
        }
        Ok(())
    }

    async fn check_trade_timeouts(&self) -> Result<()> {
        let mut princess_state = self.princess_state.write().await;
        let now = Utc::now();

        princess_state.active_trades.retain(|token_address| {
            if let Some(last_trade) = princess_state.last_trade_time {
                let duration = now.signed_duration_since(last_trade);
                if duration.num_seconds() > self.trade_timeout as i64 {
                    warn!(
                        "Princess {} trade timeout for token: {}",
                        self.id, token_address
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
        
        // Close all active trades
        let mut princess_state = self.princess_state.write().await;
        for token_address in &princess_state.active_trades {
            // TODO: Implement graceful trade closure
            warn!("Princess {} closing trade for token: {}", self.id, token_address);
        }
        princess_state.active_trades.clear();

        info!("Princess {} shutdown complete", self.id);
        Ok(())
    }

    // Getters
    pub fn get_id(&self) -> &str {
        &self.id
    }

    pub fn get_balance(&self) -> f64 {
        self.balance
    }

    pub fn get_active_trades(&self) -> &[Trade] {
        &self.active_trades
    }

    pub fn is_active(&self) -> bool {
        self.is_active
    }
} 