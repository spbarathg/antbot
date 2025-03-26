use tokio::sync::mpsc;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeSignal {
    pub token_address: String,
    pub action: TradeAction,
    pub price: f64,
    pub amount: f64,
    pub timestamp: DateTime<Utc>,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TradeAction {
    Buy,
    Sell,
    Hold,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskUpdate {
    pub position_size: f64,
    pub daily_loss: f64,
    pub daily_trades: u32,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquidityAlert {
    pub pool_address: String,
    pub token_address: String,
    pub alert_type: AlertType,
    pub severity: AlertSeverity,
    pub current_value: f64,
    pub threshold_value: f64,
    pub timestamp: DateTime<Utc>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlertType {
    LowLiquidity,
    LiquidityDrop,
    LiquiditySurge,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AlertSeverity {
    High,
    Medium,
    Low,
}

#[derive(Debug)]
pub enum Message {
    TradeSignal(TradeSignal),
    RiskUpdate(RiskUpdate),
    LiquidityAlert(LiquidityAlert),
}

pub struct MessageQueue {
    sender: mpsc::Sender<Message>,
    receiver: mpsc::Receiver<Message>,
    subscribers: Arc<RwLock<HashMap<String, mpsc::Sender<Message>>>>,
}

impl MessageQueue {
    pub fn new(buffer_size: usize) -> Self {
        let (sender, receiver) = mpsc::channel(buffer_size);
        Self {
            sender,
            receiver,
            subscribers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn subscribe(&self, id: String) -> mpsc::Receiver<Message> {
        let (tx, rx) = mpsc::channel(100);
        let mut subscribers = self.subscribers.write().await;
        subscribers.insert(id, tx);
        rx
    }

    pub async fn unsubscribe(&self, id: &str) {
        let mut subscribers = self.subscribers.write().await;
        subscribers.remove(id);
    }

    pub async fn publish(&self, message: Message) {
        let subscribers = self.subscribers.read().await;
        for subscriber in subscribers.values() {
            if let Err(e) = subscriber.send(message.clone()).await {
                eprintln!("Error sending message to subscriber: {}", e);
            }
        }
    }

    pub async fn receive(&mut self) -> Option<Message> {
        self.receiver.recv().await
    }
}

impl Clone for MessageQueue {
    fn clone(&self) -> Self {
        Self {
            sender: self.sender.clone(),
            receiver: self.receiver.clone(),
            subscribers: self.subscribers.clone(),
        }
    }
} 