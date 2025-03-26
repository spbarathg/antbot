use antbot::ant_colony::{queen::Queen, princess::Princess, worker::Worker, sentry::Sentry};
use antbot::config::Config;
use anyhow::Result;
use std::sync::Arc;
use tokio::sync::RwLock;

#[tokio::test]
async fn test_queen_initialization() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(ColonyState::default()));
    
    let queen = Queen::new(&config, state.clone()).await?;
    
    assert!(queen.is_active());
    assert_eq!(queen.get_total_capital(), 0.0);
    assert_eq!(queen.get_risk_level(), RiskLevel::Low);
    
    Ok(())
}

#[tokio::test]
async fn test_queen_capital_management() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(ColonyState::default()));
    
    let queen = Queen::new(&config, state.clone()).await?;
    
    // Test capital allocation
    let allocation = queen.allocate_capital(1000.0).await?;
    assert_eq!(allocation.queen_share, 500.0);
    assert_eq!(allocation.princess_share, 300.0);
    assert_eq!(allocation.worker_share, 200.0);
    
    // Test capital collection
    queen.collect_capital(100.0).await?;
    assert_eq!(queen.get_total_capital(), 100.0);
    
    Ok(())
}

#[tokio::test]
async fn test_queen_risk_management() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(ColonyState::default()));
    
    let queen = Queen::new(&config, state.clone()).await?;
    
    // Test risk level calculation
    queen.update_risk_metrics(RiskMetrics {
        liquidity_risk: 0.8,
        price_volatility: 0.6,
        market_depth: 0.4,
        trading_volume: 0.7,
        holder_distribution: 0.5,
    }).await?;
    
    assert_eq!(queen.get_risk_level(), RiskLevel::High);
    
    // Test risk mitigation
    queen.mitigate_risk().await?;
    assert_eq!(queen.get_risk_level(), RiskLevel::Medium);
    
    Ok(())
}

#[tokio::test]
async fn test_princess_initialization() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(ColonyState::default()));
    
    let princess = Princess::new(&config, state.clone()).await?;
    
    assert!(princess.is_active());
    assert_eq!(princess.get_balance(), 0.0);
    assert_eq!(princess.get_active_trades().len(), 0);
    
    Ok(())
}

#[tokio::test]
async fn test_princess_trade_execution() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(ColonyState::default()));
    
    let princess = Princess::new(&config, state.clone()).await?;
    
    // Test trade execution
    let trade = Trade {
        token_address: "0x1234...5678".to_string(),
        amount: 1.0,
        max_slippage: 1.0,
        gas_price: 50,
    };
    
    let result = princess.execute_trade(&trade).await?;
    assert!(result.success);
    assert_eq!(princess.get_active_trades().len(), 1);
    
    // Test trade closure
    princess.close_trade(&trade.token_address).await?;
    assert_eq!(princess.get_active_trades().len(), 0);
    
    Ok(())
}

#[tokio::test]
async fn test_worker_initialization() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(ColonyState::default()));
    
    let worker = Worker::new(&config, state.clone()).await?;
    
    assert!(worker.is_active());
    assert_eq!(worker.get_collected_profits(), 0.0);
    assert_eq!(worker.get_reinvestment_threshold(), 100.0);
    
    Ok(())
}

#[tokio::test]
async fn test_worker_profit_management() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(ColonyState::default()));
    
    let worker = Worker::new(&config, state.clone()).await?;
    
    // Test profit collection
    worker.record_profit(50.0).await?;
    assert_eq!(worker.get_collected_profits(), 50.0);
    
    // Test profit distribution
    worker.record_profit(60.0).await?;
    let distribution = worker.distribute_profits().await?;
    assert_eq!(distribution.queen_share, 55.0);
    assert_eq!(distribution.worker_share, 55.0);
    assert_eq!(worker.get_collected_profits(), 0.0);
    
    Ok(())
}

#[tokio::test]
async fn test_sentry_initialization() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(ColonyState::default()));
    
    let sentry = Sentry::new(&config, state.clone()).await?;
    
    assert!(sentry.is_active());
    assert_eq!(sentry.get_monitored_tokens().len(), 0);
    assert_eq!(sentry.get_risk_metrics().liquidity_risk, 0.0);
    
    Ok(())
}

#[tokio::test]
async fn test_sentry_token_monitoring() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(ColonyState::default()));
    
    let sentry = Sentry::new(&config, state.clone()).await?;
    let test_token = "0x1234...5678".to_string();
    
    // Test token monitoring
    sentry.add_token_to_monitor(&test_token).await?;
    assert!(sentry.get_monitored_tokens().contains(&test_token));
    
    // Test risk analysis
    let risk_metrics = sentry.analyze_token(&test_token).await?;
    assert!(risk_metrics.liquidity_risk >= 0.0 && risk_metrics.liquidity_risk <= 1.0);
    assert!(risk_metrics.price_volatility >= 0.0 && risk_metrics.price_volatility <= 1.0);
    
    // Test alert generation
    let alerts = sentry.check_alerts(&test_token).await?;
    assert!(!alerts.is_empty());
    
    Ok(())
}

#[tokio::test]
async fn test_integration_workflow() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(ColonyState::default()));
    
    // Initialize components
    let queen = Queen::new(&config, state.clone()).await?;
    let princess = Princess::new(&config, state.clone()).await?;
    let worker = Worker::new(&config, state.clone()).await?;
    let sentry = Sentry::new(&config, state.clone()).await?;
    
    // Test complete workflow
    let test_token = "0x1234...5678".to_string();
    sentry.add_token_to_monitor(&test_token).await?;
    
    // Simulate capital allocation
    let allocation = queen.allocate_capital(1000.0).await?;
    princess.receive_capital(allocation.princess_share).await?;
    
    // Execute trade
    let trade = Trade {
        token_address: test_token.clone(),
        amount: 1.0,
        max_slippage: 1.0,
        gas_price: 50,
    };
    
    let result = princess.execute_trade(&trade).await?;
    assert!(result.success);
    
    // Record profit
    worker.record_profit(100.0).await?;
    
    // Check risk metrics
    let risk_metrics = sentry.analyze_token(&test_token).await?;
    queen.update_risk_metrics(risk_metrics).await?;
    
    // Distribute profits
    let distribution = worker.distribute_profits().await?;
    queen.collect_capital(distribution.queen_share).await?;
    
    Ok(())
} 