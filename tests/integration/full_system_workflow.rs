use antbot::{
    common::{Message, MessageQueue, TradeSignal, RiskUpdate, LiquidityAlert, WalletInfo},
    config::ConfigManager,
    rpc::RpcClientManager,
    api::WebSocketServer,
    logging::Logger,
    colony::{AntColony, AntPrincess, WorkerAnt, SentryAnt},
    sniping::{RadarSystem, BuyEngine, SentimentKillswitch},
    fund_management::{FundManager, VaultManager},
};
use anyhow::Result;
use tokio::time::{sleep, Duration};
use std::path::PathBuf;
use solana_sdk::pubkey::Pubkey;
use std::sync::Arc;
use tokio::sync::Mutex;

const TEST_BUDGET: f64 = 100.0;
const NUM_PRINCESSES: usize = 5;
const EXPECTED_SUCCESS_RATE: f64 = 0.6;
const MIN_SUCCESS_RATE: f64 = 0.3;

#[tokio::test]
async fn test_full_system_workflow() -> Result<()> {
    // Initialize core components
    let config_manager = ConfigManager::new(PathBuf::from("./config")).await?;
    let settings = config_manager.get_settings().await;
    let rpc_config = config_manager.get_rpc_config().await;
    
    let rpc_manager = Arc::new(RpcClientManager::new(&rpc_config).await?);
    let message_queue = Arc::new(MessageQueue::new(100));
    let logger = Arc::new(Logger::new(PathBuf::from("./logs"), None)?);
    logger.initialize()?;

    // Initialize Ant Colony
    let colony = Arc::new(Mutex::new(AntColony::new(
        TEST_BUDGET,
        NUM_PRINCESSES,
        message_queue.clone(),
        logger.clone(),
    )));

    // Test 1: Setup Phase - Spawn Ant Princesses
    test_ant_princess_spawning(&colony).await?;

    // Test 2: Sniping Core Functionality
    test_sniping_core(&message_queue, &rpc_manager).await?;

    // Test 3: API Key Verification
    test_api_key_verification(&config_manager).await?;

    // Test 4: Exit Strategies
    test_exit_strategies(&message_queue, &colony).await?;

    // Test 5: Ant Colony Fund Management
    test_fund_management(&colony).await?;

    // Test 6: Transaction Costs
    test_transaction_costs(&rpc_manager).await?;

    // Test 7: Dynamic Budgeting
    test_dynamic_budgeting(&colony).await?;

    // Test 8: Risk Mitigation
    test_risk_mitigation(&colony, &message_queue).await?;

    // Test 9: Adaptive Scaling
    test_adaptive_scaling(&colony).await?;

    Ok(())
}

async fn test_ant_princess_spawning(colony: &Arc<Mutex<AntColony>>) -> Result<()> {
    let mut colony = colony.lock().await;
    let princesses = colony.spawn_princesses().await?;
    
    assert_eq!(princesses.len(), NUM_PRINCESSES);
    for princess in princesses {
        assert_eq!(princess.budget, TEST_BUDGET);
        assert!(princess.wallet.is_some());
        assert!(princess.encrypted_keys.is_some());
    }
    
    Ok(())
}

async fn test_sniping_core(
    message_queue: &Arc<MessageQueue>,
    rpc_manager: &Arc<RpcClientManager>,
) -> Result<()> {
    let radar = RadarSystem::new(message_queue.clone());
    let buy_engine = BuyEngine::new(rpc_manager.clone());
    
    // Simulate token launch detection
    let mock_token = "TokenA".to_string();
    let trade_signal = TradeSignal {
        token_address: mock_token.clone(),
        action: antbot::common::TradeAction::Buy,
        price: 1.0,
        amount: TEST_BUDGET,
        timestamp: chrono::Utc::now(),
        confidence: 0.9,
    };
    
    message_queue.publish(Message::TradeSignal(trade_signal)).await;
    
    // Verify buy execution
    let mut receiver = message_queue.subscribe("test_buy_verification".to_string()).await;
    if let Some(Message::TradeSignal(signal)) = receiver.recv().await {
        assert_eq!(signal.token_address, mock_token);
        assert!(signal.confidence >= 0.8);
    } else {
        panic!("Expected to receive trade signal");
    }
    
    Ok(())
}

async fn test_api_key_verification(config_manager: &ConfigManager) -> Result<()> {
    let settings = config_manager.get_settings().await;
    
    // Verify API keys are loaded
    assert!(settings.birdeye_api_key.is_some());
    assert!(settings.dexscreener_api_key.is_some());
    assert!(settings.jito_rpc_url.is_some());
    assert!(settings.helius_rpc_url.is_some());
    
    // Verify GPT-4 budget
    assert!(settings.ai_budget <= 50.0);
    
    Ok(())
}

async fn test_exit_strategies(
    message_queue: &Arc<MessageQueue>,
    colony: &Arc<Mutex<AntColony>>,
) -> Result<()> {
    let mut colony = colony.lock().await;
    let killswitch = SentimentKillswitch::new(message_queue.clone());
    
    // Test price-based exits
    let price_levels = vec![2.0, 5.0, 10.0];
    for price_multiplier in price_levels {
        let exit_signal = TradeSignal {
            token_address: "TokenA".to_string(),
            action: antbot::common::TradeAction::Sell,
            price: price_multiplier,
            amount: TEST_BUDGET * 0.5,
            timestamp: chrono::Utc::now(),
            confidence: 0.9,
        };
        
        message_queue.publish(Message::TradeSignal(exit_signal)).await;
        sleep(Duration::from_millis(100)).await;
    }
    
    // Test killswitch activation
    let liquidity_alert = LiquidityAlert {
        token_address: "TokenA".to_string(),
        liquidity_drop: 0.8,
        timestamp: chrono::Utc::now(),
    };
    
    message_queue.publish(Message::LiquidityAlert(liquidity_alert)).await;
    assert!(killswitch.should_activate().await);
    
    Ok(())
}

async fn test_fund_management(colony: &Arc<Mutex<AntColony>>) -> Result<()> {
    let mut colony = colony.lock().await;
    let fund_manager = FundManager::new();
    let vault_manager = VaultManager::new();
    
    // Simulate profits
    let profits = TEST_BUDGET * 2.0;
    
    // Test profit distribution
    let (reinvestment, vault) = fund_manager.distribute_profits(profits).await?;
    assert_eq!(reinvestment, profits * 0.8);
    assert_eq!(vault, profits * 0.2);
    
    // Test vault deposit
    vault_manager.deposit_to_vault(vault).await?;
    
    Ok(())
}

async fn test_transaction_costs(rpc_manager: &Arc<RpcClientManager>) -> Result<()> {
    let jito_client = rpc_manager.get_client(antbot::rpc::RpcProvider::Jito).await?;
    let helius_client = rpc_manager.get_client(antbot::rpc::RpcProvider::Helius).await?;
    
    // Test transaction cost limits
    let jito_cost = jito_client.estimate_transaction_cost().await?;
    assert!(jito_cost <= 900.0);
    
    // Test Helius fallback rate
    let helius_usage = rpc_manager.get_helius_usage().await;
    assert!(helius_usage <= 0.05); // 5% max usage
    
    Ok(())
}

async fn test_dynamic_budgeting(colony: &Arc<Mutex<AntColony>>) -> Result<()> {
    let mut colony = colony.lock().await;
    
    // Test bull market scaling
    colony.adjust_for_market_conditions(true).await?;
    assert!(colony.get_princess_count() > NUM_PRINCESSES);
    
    // Test bear market scaling
    colony.adjust_for_market_conditions(false).await?;
    assert!(colony.get_princess_count() < NUM_PRINCESSES);
    
    Ok(())
}

async fn test_risk_mitigation(
    colony: &Arc<Mutex<AntColony>>,
    message_queue: &Arc<MessageQueue>,
) -> Result<()> {
    let mut colony = colony.lock().await;
    let sentry = SentryAnt::new(message_queue.clone());
    
    // Test network issue detection
    let risk_update = RiskUpdate {
        position_size: TEST_BUDGET,
        daily_loss: TEST_BUDGET * 0.5,
        daily_trades: 5,
        timestamp: chrono::Utc::now(),
    };
    
    message_queue.publish(Message::RiskUpdate(risk_update)).await;
    assert!(sentry.should_freeze_trading().await);
    
    // Test honeypot detection
    let honeypot_token = "HoneypotToken".to_string();
    colony.blacklist_token(&honeypot_token).await?;
    assert!(colony.is_token_blacklisted(&honeypot_token).await);
    
    Ok(())
}

async fn test_adaptive_scaling(colony: &Arc<Mutex<AntColony>>) -> Result<()> {
    let mut colony = colony.lock().await;
    
    // Test successful performance scaling
    colony.update_performance_metrics(0.75).await?; // 75% success rate
    assert!(colony.should_scale_up().await);
    
    // Test poor performance scaling
    colony.update_performance_metrics(0.25).await?; // 25% success rate
    assert!(colony.should_scale_down().await);
    
    Ok(())
} 