use anyhow::Result;
use tokio::time::{sleep, Duration};
use std::sync::Arc;
use tokio::sync::RwLock;
use rand::Rng;
use crate::rpc::RpcClientManager;
use crate::common::MessageQueue;

pub struct ChaosTest {
    network_delay: Duration,
    rpc_failure_rate: f64,
    transaction_timeout: Duration,
    rpc_manager: Arc<RpcClientManager>,
    message_queue: Arc<MessageQueue>,
}

impl ChaosTest {
    pub fn new(
        network_delay: Duration,
        rpc_failure_rate: f64,
        transaction_timeout: Duration,
        rpc_manager: Arc<RpcClientManager>,
        message_queue: Arc<MessageQueue>,
    ) -> Self {
        Self {
            network_delay,
            rpc_failure_rate,
            transaction_timeout,
            rpc_manager,
            message_queue,
        }
    }

    pub async fn run(&self) -> Result<()> {
        println!("Starting chaos test...");
        println!("Network delay: {:?}", self.network_delay);
        println!("RPC failure rate: {:.2}%", self.rpc_failure_rate * 100.0);
        println!("Transaction timeout: {:?}", self.transaction_timeout);

        // Test network delays
        self.test_network_delays().await?;

        // Test RPC failures
        self.test_rpc_failures().await?;

        // Test message queue reliability
        self.test_message_queue().await?;

        // Test concurrent operations
        self.test_concurrent_operations().await?;

        Ok(())
    }

    async fn test_network_delays(&self) -> Result<()> {
        println!("Testing network delays...");
        
        for i in 0..10 {
            let start = std::time::Instant::now();
            
            // Simulate network delay
            sleep(self.network_delay).await;
            
            let elapsed = start.elapsed();
            println!("Network delay test {}: {:?}", i, elapsed);
            
            // Verify delay is within expected range
            assert!(
                elapsed >= self.network_delay - Duration::from_millis(100) &&
                elapsed <= self.network_delay + Duration::from_millis(100)
            );
        }

        Ok(())
    }

    async fn test_rpc_failures(&self) -> Result<()> {
        println!("Testing RPC failures...");
        
        let mut success_count = 0;
        let total_tests = 100;

        for i in 0..total_tests {
            let mut rng = rand::thread_rng();
            let should_fail = rng.gen_bool(self.rpc_failure_rate);

            if should_fail {
                // Simulate RPC failure
                sleep(Duration::from_millis(100)).await;
                println!("RPC failure test {}: Simulated failure", i);
            } else {
                // Attempt RPC operation
                match self.rpc_manager.get_client(crate::rpc::RpcProvider::Helius).await {
                    Ok(_) => {
                        success_count += 1;
                        println!("RPC failure test {}: Success", i);
                    }
                    Err(e) => {
                        println!("RPC failure test {}: Actual failure: {}", i, e);
                    }
                }
            }
        }

        let success_rate = success_count as f64 / total_tests as f64;
        println!("RPC failure test results: {:.2}% success rate", success_rate * 100.0);

        Ok(())
    }

    async fn test_message_queue(&self) -> Result<()> {
        println!("Testing message queue reliability...");
        
        let subscriber_id = "chaos_test_subscriber".to_string();
        let mut receiver = self.message_queue.subscribe(subscriber_id.clone()).await;
        
        // Send test messages
        for i in 0..50 {
            let message = crate::common::Message::RiskUpdate(crate::common::RiskUpdate {
                position_size: 1000.0,
                daily_loss: 50.0,
                daily_trades: i,
                timestamp: chrono::Utc::now(),
            });

            self.message_queue.publish(message).await;
        }

        // Verify message delivery
        let mut received_count = 0;
        while let Some(_) = receiver.recv().await {
            received_count += 1;
        }

        println!("Message queue test: {} messages received", received_count);
        assert_eq!(received_count, 50);

        // Cleanup
        self.message_queue.unsubscribe(&subscriber_id).await;

        Ok(())
    }

    async fn test_concurrent_operations(&self) -> Result<()> {
        println!("Testing concurrent operations...");
        
        let mut handles = vec![];
        
        // Spawn multiple concurrent operations
        for i in 0..10 {
            let rpc_manager = self.rpc_manager.clone();
            let message_queue = self.message_queue.clone();
            
            let handle = tokio::spawn(async move {
                // Simulate random delays
                let mut rng = rand::thread_rng();
                let delay = Duration::from_millis(rng.gen_range(0..1000));
                sleep(delay).await;

                // Attempt RPC operation
                match rpc_manager.get_client(crate::rpc::RpcProvider::Helius).await {
                    Ok(_) => println!("Concurrent test {}: RPC success", i),
                    Err(e) => println!("Concurrent test {}: RPC failure: {}", i, e),
                }

                // Send test message
                let message = crate::common::Message::RiskUpdate(crate::common::RiskUpdate {
                    position_size: 1000.0,
                    daily_loss: 50.0,
                    daily_trades: i,
                    timestamp: chrono::Utc::now(),
                });

                message_queue.publish(message).await;
                println!("Concurrent test {}: Message sent", i);
            });

            handles.push(handle);
        }

        // Wait for all operations to complete
        for handle in handles {
            handle.await?;
        }

        Ok(())
    }
} 