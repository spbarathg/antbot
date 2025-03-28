use anyhow::Result;
use config::Config;
use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::ant_colony::ColonyState;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RugMetrics {
    pub token_address: String,
    pub price_history: Vec<(DateTime<Utc>, f64)>,
    pub volume_history: Vec<(DateTime<Utc>, f64)>,
    pub liquidity_history: Vec<(DateTime<Utc>, f64)>,
    pub holder_count_history: Vec<(DateTime<Utc>, u64)>,
    pub contract_risk_score: f64,
    pub last_update: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RugAlert {
    pub token_address: String,
    pub alert_type: RugAlertType,
    pub severity: RugAlertSeverity,
    pub timestamp: DateTime<Utc>,
    pub details: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RugAlertType {
    PriceDrop,
    VolumeDrop,
    LiquidityDrop,
    HolderCountDrop,
    ContractRisk,
    HoneypotDetected,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RugAlertSeverity {
    Low,
    Medium,
    High,
    Critical,
}

pub struct RugDetector {
    id: String,
    state: Arc<RwLock<ColonyState>>,
    is_active: bool,
    monitored_tokens: Vec<RugMetrics>,
    price_drop_threshold: f64,
    volume_drop_threshold: f64,
    liquidity_drop_threshold: f64,
    holder_drop_threshold: f64,
    contract_risk_threshold: f64,
    history_window: i32, // hours
}

impl RugDetector {
    pub async fn new(config: &Config, state: Arc<RwLock<ColonyState>>) -> Result<Self> {
        let price_drop_threshold = config.get_float("ant_colony.rug_detector.price_drop_threshold")? as f64;
        let volume_drop_threshold = config.get_float("ant_colony.rug_detector.volume_drop_threshold")? as f64;
        let liquidity_drop_threshold = config.get_float("ant_colony.rug_detector.liquidity_drop_threshold")? as f64;
        let holder_drop_threshold = config.get_float("ant_colony.rug_detector.holder_drop_threshold")? as f64;
        let contract_risk_threshold = config.get_float("ant_colony.rug_detector.contract_risk_threshold")? as f64;
        let history_window = config.get_int("ant_colony.rug_detector.history_window")? as i32;

        Ok(Self {
            id: uuid::Uuid::new_v4().to_string(),
            state,
            is_active: false,
            monitored_tokens: Vec::new(),
            price_drop_threshold,
            volume_drop_threshold,
            liquidity_drop_threshold,
            holder_drop_threshold,
            contract_risk_threshold,
            history_window,
        })
    }

    pub async fn start_monitoring(&mut self) -> Result<()> {
        self.is_active = true;
        info!("Rug Detector {} started monitoring", self.id);

        while self.is_active {
            if let Err(e) = self.monitor_and_analyze().await {
                error!("Rug Detector {} monitoring error: {}", self.id, e);
            }
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }

        Ok(())
    }

    async fn monitor_and_analyze(&mut self) -> Result<()> {
        let state = self.state.read().await;
        
        // Skip if colony is not active
        if !state.is_active {
            return Ok(());
        }

        // Update metrics for all monitored tokens
        for token in &mut self.monitored_tokens {
            self.update_token_metrics(token).await?;
            
            // Check for rug indicators
            if let Some(alert) = self.check_rug_indicators(token).await? {
                self.handle_rug_alert(alert).await?;
            }
        }

        // Clean up old history data
        self.cleanup_old_history().await?;

        Ok(())
    }

    async fn update_token_metrics(&mut self, token: &mut RugMetrics) -> Result<()> {
        let now = Utc::now();
        
        // Fetch current metrics
        let current_price = self.fetch_current_price(&token.token_address).await?;
        let current_volume = self.fetch_current_volume(&token.token_address).await?;
        let current_liquidity = self.fetch_current_liquidity(&token.token_address).await?;
        let current_holders = self.fetch_current_holders(&token.token_address).await?;
        let contract_risk = self.analyze_contract_risk(&token.token_address).await?;

        // Update history
        token.price_history.push((now, current_price));
        token.volume_history.push((now, current_volume));
        token.liquidity_history.push((now, current_liquidity));
        token.holder_count_history.push((now, current_holders));
        token.contract_risk_score = contract_risk;
        token.last_update = now;

        Ok(())
    }

    async fn check_rug_indicators(&self, token: &RugMetrics) -> Result<Option<RugAlert>> {
        let now = Utc::now();
        let window_start = now - chrono::Duration::hours(self.history_window);

        // Check price drop
        if let Some(price_drop) = self.calculate_price_drop(token, window_start) {
            if price_drop >= self.price_drop_threshold {
                return Ok(Some(RugAlert {
                    token_address: token.token_address.clone(),
                    alert_type: RugAlertType::PriceDrop,
                    severity: self.determine_severity(price_drop),
                    timestamp: now,
                    details: format!("Price dropped by {:.2}%", price_drop * 100.0),
                }));
            }
        }

        // Check volume drop
        if let Some(volume_drop) = self.calculate_volume_drop(token, window_start) {
            if volume_drop >= self.volume_drop_threshold {
                return Ok(Some(RugAlert {
                    token_address: token.token_address.clone(),
                    alert_type: RugAlertType::VolumeDrop,
                    severity: self.determine_severity(volume_drop),
                    timestamp: now,
                    details: format!("Volume dropped by {:.2}%", volume_drop * 100.0),
                }));
            }
        }

        // Check liquidity drop
        if let Some(liquidity_drop) = self.calculate_liquidity_drop(token, window_start) {
            if liquidity_drop >= self.liquidity_drop_threshold {
                return Ok(Some(RugAlert {
                    token_address: token.token_address.clone(),
                    alert_type: RugAlertType::LiquidityDrop,
                    severity: self.determine_severity(liquidity_drop),
                    timestamp: now,
                    details: format!("Liquidity dropped by {:.2}%", liquidity_drop * 100.0),
                }));
            }
        }

        // Check holder count drop
        if let Some(holder_drop) = self.calculate_holder_drop(token, window_start) {
            if holder_drop >= self.holder_drop_threshold {
                return Ok(Some(RugAlert {
                    token_address: token.token_address.clone(),
                    alert_type: RugAlertType::HolderCountDrop,
                    severity: self.determine_severity(holder_drop),
                    timestamp: now,
                    details: format!("Holder count dropped by {:.2}%", holder_drop * 100.0),
                }));
            }
        }

        // Check contract risk
        if token.contract_risk_score >= self.contract_risk_threshold {
            return Ok(Some(RugAlert {
                token_address: token.token_address.clone(),
                alert_type: RugAlertType::ContractRisk,
                severity: self.determine_severity(token.contract_risk_score),
                timestamp: now,
                details: format!("Contract risk score: {:.2}", token.contract_risk_score),
            }));
        }

        Ok(None)
    }

    async fn handle_rug_alert(&mut self, alert: RugAlert) -> Result<()> {
        // Log the alert
        match alert.severity {
            RugAlertSeverity::Critical => error!("CRITICAL RUG ALERT: {}", alert.details),
            RugAlertSeverity::High => warn!("HIGH RUG ALERT: {}", alert.details),
            RugAlertSeverity::Medium => warn!("MEDIUM RUG ALERT: {}", alert.details),
            RugAlertSeverity::Low => info!("LOW RUG ALERT: {}", alert.details),
        }

        // If critical, trigger emergency exit
        if matches!(alert.severity, RugAlertSeverity::Critical) {
            self.trigger_emergency_exit(&alert.token_address).await?;
        }

        Ok(())
    }

    async fn trigger_emergency_exit(&self, token_address: &str) -> Result<()> {
        // Placeholder for emergency exit logic
        // This would involve:
        // 1. Notifying the Princess to exit the position
        // 2. Setting a market sell order
        // 3. Monitoring the exit
        // 4. Updating the capital manager
        info!("Rug Detector {} triggered emergency exit for token {}", 
              self.id, token_address);
        Ok(())
    }

    async fn analyze_contract_risk(&self, token_address: &str) -> Result<f64> {
        // Placeholder for contract analysis using Slither
        // This would involve:
        // 1. Fetching contract code
        // 2. Running Slither analysis
        // 3. Calculating risk score
        // 4. Checking for honeypot indicators
        Ok(0.0) // Replace with actual implementation
    }

    fn determine_severity(&self, drop_percentage: f64) -> RugAlertSeverity {
        match drop_percentage {
            x if x >= 0.5 => RugAlertSeverity::Critical, // 50% or more
            x if x >= 0.3 => RugAlertSeverity::High,     // 30% or more
            x if x >= 0.15 => RugAlertSeverity::Medium,  // 15% or more
            _ => RugAlertSeverity::Low,
        }
    }

    async fn cleanup_old_history(&mut self) -> Result<()> {
        let now = Utc::now();
        let cutoff = now - chrono::Duration::hours(self.history_window);

        for token in &mut self.monitored_tokens {
            token.price_history.retain(|(t, _)| *t >= cutoff);
            token.volume_history.retain(|(t, _)| *t >= cutoff);
            token.liquidity_history.retain(|(t, _)| *t >= cutoff);
            token.holder_count_history.retain(|(t, _)| *t >= cutoff);
        }

        Ok(())
    }

    // Helper methods for calculating drops
    fn calculate_price_drop(&self, token: &RugMetrics, window_start: DateTime<Utc>) -> Option<f64> {
        let recent_prices: Vec<f64> = token.price_history
            .iter()
            .filter(|(t, _)| *t >= window_start)
            .map(|(_, p)| *p)
            .collect();

        if recent_prices.len() >= 2 {
            let max_price = recent_prices.iter().fold(f64::NEG_INFINITY, |a, &b| a.max(b));
            let current_price = *recent_prices.last().unwrap();
            Some((max_price - current_price) / max_price)
        } else {
            None
        }
    }

    // Similar helper methods for volume, liquidity, and holder drops
    // ... (implement these similarly to calculate_price_drop)

    pub async fn add_token(&mut self, token_address: String) -> Result<()> {
        let metrics = RugMetrics {
            token_address,
            price_history: Vec::new(),
            volume_history: Vec::new(),
            liquidity_history: Vec::new(),
            holder_count_history: Vec::new(),
            contract_risk_score: 0.0,
            last_update: Utc::now(),
        };

        self.monitored_tokens.push(metrics);
        info!("Rug Detector {} added new token for monitoring", self.id);
        Ok(())
    }

    pub async fn remove_token(&mut self, token_address: &str) -> Result<()> {
        self.monitored_tokens.retain(|t| t.token_address != token_address);
        info!("Rug Detector {} removed token from monitoring", self.id);
        Ok(())
    }

    pub async fn shutdown(&mut self) -> Result<()> {
        self.is_active = false;
        info!("Rug Detector {} shutting down", self.id);
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