use anyhow::Result;
use tokio::sync::broadcast;
use warp::ws::{Message, WebSocket};
use std::sync::Arc;
use tokio::sync::RwLock;
use serde_json::json;
use crate::ant_colony::ColonyState;

pub struct DashboardWebSocket {
    state: Arc<RwLock<ColonyState>>,
    tx: broadcast::Sender<Message>,
}

impl DashboardWebSocket {
    pub fn new(state: Arc<RwLock<ColonyState>>) -> Self {
        let (tx, _) = broadcast::channel(100);
        Self { state, tx }
    }

    pub async fn handle_connection(&self, ws: WebSocket) {
        let mut ws = ws;
        let mut rx = self.tx.subscribe();

        // Spawn task to handle WebSocket messages
        tokio::task::spawn(async move {
            while let Ok(msg) = rx.recv().await {
                if ws.send(msg).await.is_err() {
                    break;
                }
            }
        });
    }

    pub async fn broadcast_update(&self) -> Result<()> {
        let state = self.state.read().await;
        
        // Prepare dashboard data
        let data = json!({
            "workers": self.get_worker_status(&state).await?,
            "metrics": self.get_trade_metrics(&state).await?,
            "profitTiers": self.get_profit_tiers(&state).await?,
            "alerts": self.get_alerts(&state).await?,
            "performanceData": self.get_performance_data(&state).await?,
        });

        // Broadcast update
        if let Ok(msg) = Message::text(data.to_string()) {
            let _ = self.tx.send(msg);
        }

        Ok(())
    }

    async fn get_worker_status(&self, state: &ColonyState) -> Result<serde_json::Value> {
        let workers = state.active_workers.iter().map(|worker| {
            json!({
                "id": worker.id,
                "status": if worker.is_active { "active" } else { "inactive" },
                "currentBalance": worker.balance,
                "totalTrades": worker.total_trades,
                "successRate": worker.success_rate,
                "profitLoss": worker.profit_loss,
                "lastActive": worker.last_active,
            })
        }).collect::<Vec<_>>();

        Ok(json!(workers))
    }

    async fn get_trade_metrics(&self, state: &ColonyState) -> Result<serde_json::Value> {
        let metrics = json!({
            "totalTrades": state.total_trades,
            "successfulTrades": state.successful_trades,
            "failedTrades": state.total_trades - state.successful_trades,
            "successRate": if state.total_trades > 0 {
                state.successful_trades as f64 / state.total_trades as f64
            } else {
                0.0
            },
            "averageProfit": if state.successful_trades > 0 {
                state.total_profit / state.successful_trades as f64
            } else {
                0.0
            },
            "totalProfit": state.total_profit,
            "averageGasFee": if state.total_trades > 0 {
                state.total_gas_spent / state.total_trades as f64
            } else {
                0.0
            },
            "totalGasSpent": state.total_gas_spent,
        });

        Ok(metrics)
    }

    async fn get_profit_tiers(&self, state: &ColonyState) -> Result<serde_json::Value> {
        let tiers = state.profit_tiers.iter().map(|tier| {
            json!({
                "multiplier": tier.multiplier,
                "percentage": tier.percentage,
                "status": tier.status,
                "timestamp": tier.timestamp,
            })
        }).collect::<Vec<_>>();

        Ok(json!(tiers))
    }

    async fn get_alerts(&self, state: &ColonyState) -> Result<serde_json::Value> {
        let alerts = state.alerts.iter().map(|alert| {
            json!({
                "type": alert.alert_type,
                "severity": alert.severity,
                "message": alert.details,
                "timestamp": alert.timestamp,
            })
        }).collect::<Vec<_>>();

        Ok(json!(alerts))
    }

    async fn get_performance_data(&self, state: &ColonyState) -> Result<serde_json::Value> {
        let performance = state.performance_history.iter().map(|point| {
            json!({
                "timestamp": point.timestamp,
                "profit": point.profit,
                "gasFees": point.gas_fees,
            })
        }).collect::<Vec<_>>();

        Ok(json!(performance))
    }
} 