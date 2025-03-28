use anyhow::Result;
use config::Config;
use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::ant_colony::ColonyState;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfitTier {
    pub multiplier: f64,
    pub percentage: f64,
    pub gas_buffer: f64,
    pub volatility_adjustment: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeProfit {
    pub trade_id: String,
    pub token_address: String,
    pub entry_price: f64,
    pub entry_time: DateTime<Utc>,
    pub current_price: f64,
    pub position_size: f64,
    pub gas_fees: f64,
    pub realized_profits: f64,
    pub unrealized_profits: f64,
    pub profit_tiers_hit: Vec<f64>,
}

pub struct ProfitManager {
    id: String,
    state: Arc<RwLock<ColonyState>>,
    is_active: bool,
    profit_tiers: Vec<ProfitTier>,
    active_trades: Vec<TradeProfit>,
    min_profit_threshold: f64,
    gas_price_history: Vec<(DateTime<Utc>, f64)>,
}

impl ProfitManager {
    pub async fn new(config: &Config, state: Arc<RwLock<ColonyState>>) -> Result<Self> {
        let min_profit_threshold = config.get_float("ant_colony.profit_manager.min_profit_threshold")? as f64;

        // Initialize profit tiers
        let profit_tiers = vec![
            ProfitTier {
                multiplier: 1.2,  // Sell 40% at 1.2x for quick profits
                percentage: 0.4,
                gas_buffer: 1.1,
                volatility_adjustment: 0.05,
            },
            ProfitTier {
                multiplier: 1.5,  // Sell 30% at 1.5x
                percentage: 0.3,
                gas_buffer: 1.2,
                volatility_adjustment: 0.1,
            },
            ProfitTier {
                multiplier: 2.0,  // Sell 20% at 2x
                percentage: 0.2,
                gas_buffer: 1.3,
                volatility_adjustment: 0.15,
            },
            ProfitTier {
                multiplier: 3.0,  // Sell remaining 10% at 3x
                percentage: 0.1,
                gas_buffer: 1.5,
                volatility_adjustment: 0.2,
            },
        ];

        Ok(Self {
            id: uuid::Uuid::new_v4().to_string(),
            state,
            is_active: false,
            profit_tiers,
            active_trades: Vec::new(),
            min_profit_threshold,
            gas_price_history: Vec::new(),
        })
    }

    pub async fn start_monitoring(&mut self) -> Result<()> {
        self.is_active = true;
        info!("Profit Manager {} started monitoring", self.id);

        while self.is_active {
            if let Err(e) = self.monitor_and_manage().await {
                error!("Profit Manager {} monitoring error: {}", self.id, e);
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

        // Update gas price history
        self.update_gas_price_history().await?;

        // Check profit tiers for all active trades
        self.check_profit_tiers().await?;

        // Clean up completed trades
        self.cleanup_completed_trades().await?;

        Ok(())
    }

    async fn update_gas_price_history(&mut self) -> Result<()> {
        // Placeholder for gas price fetching
        // This would involve:
        // 1. Fetching current gas price
        // 2. Adding to history
        // 3. Maintaining a rolling window of prices
        Ok(())
    }

    async fn check_profit_tiers(&mut self) -> Result<()> {
        for trade in &mut self.active_trades {
            // Calculate current profit multiplier
            let current_multiplier = trade.current_price / trade.entry_price;

            // Calculate dynamic position size based on volatility
            let volatility = self.calculate_volatility(trade).await?;
            let position_adjustment = 1.0 - (volatility * 0.5); // Reduce position size as volatility increases

            // Calculate total costs including gas fees
            let total_costs = trade.gas_fees + self.estimate_gas_cost().await?;
            let min_profit_multiplier = 1.0 + (total_costs / (trade.position_size * trade.entry_price));

            // Check each profit tier
            for tier in &self.profit_tiers {
                // Skip if tier already hit
                if trade.profit_tiers_hit.contains(&tier.multiplier) {
                    continue;
                }

                // Calculate adjusted multiplier based on volatility and costs
                let adjusted_multiplier = tier.multiplier * (1.0 - volatility * tier.volatility_adjustment);

                // Ensure we never sell below minimum profit threshold
                if adjusted_multiplier < min_profit_multiplier {
                    warn!("Skipping tier {}x for trade {} - below minimum profit threshold {}x", 
                          tier.multiplier, trade.trade_id, min_profit_multiplier);
                    continue;
                }

                // Check if we've hit this tier
                if current_multiplier >= adjusted_multiplier {
                    // Calculate potential profit with position adjustment
                    let sell_amount = trade.position_size * tier.percentage * position_adjustment;
                    let potential_profit = sell_amount * (trade.current_price - trade.entry_price);
                    let estimated_gas = self.estimate_gas_cost().await? * tier.gas_buffer;
                    let total_costs = estimated_gas + trade.gas_fees;

                    // Calculate net profit after all costs
                    let net_profit = potential_profit - total_costs;
                    let net_profit_percentage = (net_profit / (sell_amount * trade.entry_price)) * 100.0;

                    // Only sell if we have a net profit
                    if net_profit > 0.0 && net_profit > self.min_profit_threshold {
                        // Log detailed profit analysis
                        info!("Profit analysis for trade {} at {}x:", trade.trade_id, tier.multiplier);
                        info!("  Sell amount: {} tokens", sell_amount);
                        info!("  Potential profit: {} ETH", potential_profit);
                        info!("  Estimated gas: {} ETH", estimated_gas);
                        info!("  Total costs: {} ETH", total_costs);
                        info!("  Net profit: {} ETH ({}%)", net_profit, net_profit_percentage);

                        // Execute partial sell
                        self.execute_partial_sell(trade, tier).await?;
                        
                        // Mark tier as hit
                        trade.profit_tiers_hit.push(tier.multiplier);
                        
                        // Update trade metrics
                        trade.realized_profits += net_profit;
                        trade.position_size -= sell_amount;
                        trade.gas_fees += estimated_gas;

                        // Log successful profit taking
                        info!("Profit Manager {} took profit for trade {} at {}x: {} ETH ({}%)", 
                              self.id, trade.trade_id, tier.multiplier, net_profit, net_profit_percentage);
                    } else {
                        warn!("Skipping sell for trade {} at {}x - insufficient profit (Net: {} ETH, Required: {} ETH)", 
                              trade.trade_id, tier.multiplier, net_profit, self.min_profit_threshold);
                    }
                }
            }
        }

        Ok(())
    }

    async fn calculate_volatility(&self, trade: &TradeProfit) -> Result<f64> {
        // Placeholder for volatility calculation
        // This would involve:
        // 1. Fetching price history
        // 2. Calculating standard deviation
        // 3. Normalizing to 0-1 range
        Ok(0.1) // Example value
    }

    async fn estimate_gas_cost(&self) -> Result<f64> {
        // Placeholder for gas cost estimation
        // This would involve:
        // 1. Using gas price history
        // 2. Estimating transaction size
        // 3. Calculating total cost
        Ok(0.01) // Example value
    }

    async fn execute_partial_sell(&mut self, trade: &TradeProfit, tier: &ProfitTier) -> Result<()> {
        // Calculate optimal gas price based on current market conditions
        let gas_price = self.get_optimal_gas_price().await?;
        
        // Build sell transaction with minimum profit guarantee
        let sell_amount = trade.position_size * tier.percentage;
        let min_price = trade.entry_price * (1.0 + (trade.gas_fees / (sell_amount * trade.entry_price)));
        
        // Create sell transaction with minimum price guarantee
        let transaction = self.build_sell_transaction(
            trade.token_address.clone(),
            sell_amount,
            min_price,
            gas_price
        ).await?;

        // Execute transaction with enhanced monitoring
        match self.send_transaction(transaction).await {
            Ok(hash) => {
                info!("Successfully executed sell for trade {} at {}x: {}", 
                      trade.trade_id, tier.multiplier, hash);
                Ok(())
            }
            Err(e) => {
                error!("Failed to execute sell for trade {} at {}x: {}", 
                       trade.trade_id, tier.multiplier, e);
                Err(e)
            }
        }
    }

    async fn get_optimal_gas_price(&self) -> Result<f64> {
        // TODO: Implement optimal gas price calculation
        // This would involve:
        // 1. Analyzing recent gas price history
        // 2. Predicting optimal gas price
        // 3. Adding safety buffer
        Ok(0.0) // Replace with actual implementation
    }

    async fn build_sell_transaction(
        &self,
        token_address: String,
        amount: f64,
        min_price: f64,
        gas_price: f64
    ) -> Result<Transaction> {
        // TODO: Implement sell transaction building
        // This would involve:
        // 1. Creating sell instruction with minimum price
        // 2. Setting up transaction with optimal gas
        // 3. Adding necessary signatures
        // 4. Setting appropriate fees
        Ok(Transaction::default())
    }

    async fn cleanup_completed_trades(&mut self) -> Result<()> {
        let now = Utc::now();
        let max_age = chrono::Duration::hours(24);

        self.active_trades.retain(|trade| {
            now - trade.entry_time < max_age
        });

        Ok(())
    }

    pub async fn add_trade(&mut self, trade: TradeProfit) -> Result<()> {
        self.active_trades.push(trade);
        info!("Profit Manager {} added new trade", self.id);
        Ok(())
    }

    pub async fn update_trade_price(&mut self, trade_id: &str, current_price: f64) -> Result<()> {
        if let Some(trade) = self.active_trades.iter_mut()
            .find(|t| t.trade_id == trade_id) {
            trade.current_price = current_price;
            trade.unrealized_profits = (current_price - trade.entry_price) * trade.position_size;
        }
        Ok(())
    }

    pub async fn get_trade_profits(&self, trade_id: &str) -> Option<TradeProfit> {
        self.active_trades.iter()
            .find(|t| t.trade_id == trade_id)
            .cloned()
    }

    pub async fn get_total_profits(&self) -> f64 {
        self.active_trades.iter()
            .map(|t| t.realized_profits + t.unrealized_profits)
            .sum()
    }

    pub async fn shutdown(&mut self) -> Result<()> {
        self.is_active = false;
        info!("Profit Manager {} shutting down", self.id);
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