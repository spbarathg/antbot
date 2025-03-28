use antbot::{
    common::{Message, MessageQueue, TradeSignal, RiskUpdate, LiquidityAlert},
    config::ConfigManager,
    rpc::RpcClientManager,
    api::WebSocketServer,
    logging::Logger,
};
use anyhow::Result;
use tokio::time::{sleep, Duration};
use std::path::PathBuf;

mod full_system_workflow;

#[tokio::test]
async fn test_sniping_ant_colony_integration() -> Result<()> {
    // Initialize components
    let config_manager = ConfigManager::new(PathBuf::from("./config")).await?;
    let settings = config_manager.get_settings().await;
    let rpc_config = config_manager.get_rpc_config().await;
    
    let rpc_manager = RpcClientManager::new(&rpc_config).await?;
    let message_queue = MessageQueue::new(100);
    let logger = Logger::new(PathBuf::from("./logs"), None)?;
    logger.initialize()?;

    // Create test trade signal
    let trade_signal = TradeSignal {
        token_address: "test_token".to_string(),
        action: antbot::common::TradeAction::Buy,
        price: 1.0,
        amount: 100.0,
        timestamp: chrono::Utc::now(),
        confidence: 0.8,
    };

    // Publish trade signal
    message_queue.publish(Message::TradeSignal(trade_signal.clone())).await;

    // Subscribe to messages
    let mut receiver = message_queue.subscribe("test_subscriber".to_string()).await;

    // Verify message was received
    if let Some(Message::TradeSignal(received_signal)) = receiver.recv().await {
        assert_eq!(received_signal.token_address, trade_signal.token_address);
        assert_eq!(received_signal.price, trade_signal.price);
    } else {
        panic!("Expected to receive trade signal");
    }

    Ok(())
}

#[tokio::test]
async fn test_websocket_broadcast() -> Result<()> {
    let server = WebSocketServer::new();
    let addr = "127.0.0.1:3000".parse().unwrap();
    
    // Start server in background
    let server_handle = tokio::spawn(async move {
        server.start(addr).await;
    });

    // Wait for server to start
    sleep(Duration::from_millis(100)).await;

    // Create test message
    let test_message = Message::RiskUpdate(RiskUpdate {
        position_size: 1000.0,
        daily_loss: 50.0,
        daily_trades: 5,
        timestamp: chrono::Utc::now(),
    });

    // Broadcast message
    server.broadcast_update(test_message).await;

    // Cleanup
    server_handle.abort();

    Ok(())
}

#[tokio::test]
async fn test_rpc_connection_pool() -> Result<()> {
    let config_manager = ConfigManager::new(PathBuf::from("./config")).await?;
    let rpc_config = config_manager.get_rpc_config().await;
    let rpc_manager = RpcClientManager::new(&rpc_config).await?;

    // Test getting clients from pool
    let helius_client = rpc_manager.get_client(antbot::rpc::RpcProvider::Helius).await?;
    let triton_client = rpc_manager.get_client(antbot::rpc::RpcProvider::Triton).await?;
    let jito_client = rpc_manager.get_client(antbot::rpc::RpcProvider::Jito).await?;

    // Verify clients are different instances
    assert_ne!(
        std::ptr::addr_of!(helius_client),
        std::ptr::addr_of!(triton_client)
    );
    assert_ne!(
        std::ptr::addr_of!(triton_client),
        std::ptr::addr_of!(jito_client)
    );

    Ok(())
}

#[tokio::test]
async fn test_config_hot_reload() -> Result<()> {
    let config_manager = ConfigManager::new(PathBuf::from("./config")).await?;
    let initial_settings = config_manager.get_settings().await;

    // Start watching for changes
    let watch_handle = tokio::spawn(async move {
        config_manager.watch_for_changes().await;
    });

    // Wait for a moment to ensure watcher is active
    sleep(Duration::from_millis(100)).await;

    // Modify settings file
    let settings_path = PathBuf::from("./config/settings.toml");
    let mut settings = tokio::fs::read_to_string(&settings_path).await?;
    settings = settings.replace(
        "max_concurrent_trades = 5",
        "max_concurrent_trades = 10"
    );
    tokio::fs::write(&settings_path, settings).await?;

    // Wait for changes to be detected
    sleep(Duration::from_secs(2)).await;

    // Get updated settings
    let updated_settings = config_manager.get_settings().await;
    assert_eq!(updated_settings.max_concurrent_trades, 10);

    // Cleanup
    watch_handle.abort();

    Ok(())
} 