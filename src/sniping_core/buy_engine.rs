use anyhow::Result;
use config::Config;
use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::sniping_core::{SnipingState, radar::TokenOpportunity};

pub struct BuyEngine {
    id: String,
    state: Arc<RwLock<SnipingState>>,
    is_active: bool,
    max_slippage: f64,
    gas_multiplier: f64,
    pending_trades: Vec<PendingTrade>,
    executed_trades: Vec<ExecutedTrade>,
}

#[derive(Debug, Clone)]
struct PendingTrade {
    token_address: String,
    amount: f64,
    max_price: f64,
    created_at: chrono::DateTime<chrono::Utc>,
    priority: u32,
}

#[derive(Debug, Clone)]
struct ExecutedTrade {
    token_address: String,
    amount: f64,
    price: f64,
    executed_at: chrono::DateTime<chrono::Utc>,
    transaction_hash: String,
}

impl BuyEngine {
    pub async fn new(config: &Config, state: Arc<RwLock<SnipingState>>) -> Result<Self> {
        let max_slippage = config.get_float("sniping_core.buy_engine.max_slippage")? as f64;
        let gas_multiplier = config.get_float("sniping_core.buy_engine.gas_multiplier")? as f64;

        Ok(Self {
            id: uuid::Uuid::new_v4().to_string(),
            state,
            is_active: false,
            max_slippage,
            gas_multiplier,
            pending_trades: Vec::new(),
            executed_trades: Vec::new(),
        })
    }

    pub async fn init(&mut self, config: &Config) -> Result<()> {
        // Initialize any necessary resources
        info!("Buy Engine {} initialized", self.id);
        Ok(())
    }

    pub async fn start_monitoring(&mut self) -> Result<()> {
        self.is_active = true;
        info!("Buy Engine {} started monitoring", self.id);

        while self.is_active {
            if let Err(e) = self.process_trades().await {
                error!("Buy Engine {} processing error: {}", self.id, e);
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }

        Ok(())
    }

    async fn process_trades(&mut self) -> Result<()> {
        let state = self.state.read().await;
        
        // Skip if sniping core is not active
        if !state.is_active {
            return Ok(());
        }

        // Process pending trades
        for trade in &self.pending_trades {
            if let Err(e) = self.execute_trade(trade).await {
                warn!("Error executing trade for token {}: {}", trade.token_address, e);
            }
        }

        // Clean up executed trades
        self.cleanup_executed_trades().await?;

        Ok(())
    }

    async fn execute_trade(&mut self, trade: &PendingTrade) -> Result<()> {
        // Placeholder for trade execution logic
        // This would involve:
        // 1. Checking current price
        // 2. Calculating gas price with multiplier
        // 3. Building and signing transaction
        // 4. Broadcasting transaction
        // 5. Monitoring confirmation

        // Example trade execution (replace with actual logic)
        let executed_trade = ExecutedTrade {
            token_address: trade.token_address.clone(),
            amount: trade.amount,
            price: trade.max_price,
            executed_at: chrono::Utc::now(),
            transaction_hash: "tx_hash".to_string(),
        };

        // Remove from pending and add to executed
        if let Some(pos) = self.pending_trades.iter()
            .position(|t| t.token_address == trade.token_address) {
            self.pending_trades.remove(pos);
        }
        self.executed_trades.push(executed_trade);

        info!("Buy Engine {} executed trade for token {}", 
              self.id, trade.token_address);

        Ok(())
    }

    async fn cleanup_executed_trades(&mut self) -> Result<()> {
        let now = chrono::Utc::now();
        let max_age = chrono::Duration::hours(24);

        self.executed_trades.retain(|trade| {
            now - trade.executed_at < max_age
        });

        Ok(())
    }

    pub async fn queue_trade(&mut self, opportunity: &TokenOpportunity, amount: f64) -> Result<()> {
        let pending_trade = PendingTrade {
            token_address: opportunity.token_address.clone(),
            amount,
            max_price: opportunity.price * (1.0 + self.max_slippage),
            created_at: chrono::Utc::now(),
            priority: 1,
        };

        self.pending_trades.push(pending_trade);
        info!("Buy Engine {} queued trade for token {}", 
              self.id, opportunity.token_address);

        Ok(())
    }

    pub async fn cancel_trade(&mut self, token_address: &str) -> Result<()> {
        if let Some(pos) = self.pending_trades.iter()
            .position(|t| t.token_address == token_address) {
            self.pending_trades.remove(pos);
            info!("Buy Engine {} cancelled trade for token {}", 
                  self.id, token_address);
        }
        Ok(())
    }

    pub async fn shutdown(&mut self) -> Result<()> {
        self.is_active = false;
        
        // Cancel all pending trades
        for trade in &self.pending_trades {
            if let Err(e) = self.cancel_trade(&trade.token_address).await {
                error!("Error cancelling trade for token {}: {}", 
                       trade.token_address, e);
            }
        }

        info!("Buy Engine {} shutting down", self.id);
        Ok(())
    }

    // Getters
    pub fn get_id(&self) -> &str {
        &self.id
    }

    pub fn get_pending_trades(&self) -> &[PendingTrade] {
        &self.pending_trades
    }

    pub fn get_executed_trades(&self) -> &[ExecutedTrade] {
        &self.executed_trades
    }

    pub fn is_active(&self) -> bool {
        self.is_active
    }
} 