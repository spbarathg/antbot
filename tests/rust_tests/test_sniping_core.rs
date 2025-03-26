use antbot::sniping_core::{radar::Radar, buy_engine::BuyEngine, exit_strategies::ExitManager};
use antbot::config::Config;
use anyhow::Result;
use std::sync::Arc;
use tokio::sync::RwLock;

#[tokio::test]
async fn test_radar_initialization() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(SnipingState::default()));
    
    let radar = Radar::new(&config, state.clone()).await?;
    
    assert!(radar.is_active());
    assert_eq!(radar.get_monitored_pairs().len(), 0);
    
    Ok(())
}

#[tokio::test]
async fn test_radar_pair_monitoring() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(SnipingState::default()));
    
    let radar = Radar::new(&config, state.clone()).await?;
    let test_pair = "0x1234...5678".to_string();
    
    radar.add_pair_to_monitor(&test_pair).await?;
    
    assert!(radar.get_monitored_pairs().contains(&test_pair));
    
    radar.remove_pair_from_monitor(&test_pair).await?;
    assert!(!radar.get_monitored_pairs().contains(&test_pair));
    
    Ok(())
}

#[tokio::test]
async fn test_buy_engine_execution() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(SnipingState::default()));
    
    let buy_engine = BuyEngine::new(&config, state.clone()).await?;
    let test_trade = Trade {
        token_address: "0x1234...5678".to_string(),
        amount: 1.0,
        max_slippage: 1.0,
        gas_price: 50,
    };
    
    let result = buy_engine.execute_trade(&test_trade).await?;
    assert!(result.success);
    
    Ok(())
}

#[tokio::test]
async fn test_buy_engine_slippage_protection() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(SnipingState::default()));
    
    let buy_engine = BuyEngine::new(&config, state.clone()).await?;
    let test_trade = Trade {
        token_address: "0x1234...5678".to_string(),
        amount: 1.0,
        max_slippage: 0.1, // Very low slippage tolerance
        gas_price: 50,
    };
    
    let result = buy_engine.execute_trade(&test_trade).await?;
    assert!(!result.success); // Should fail due to high slippage
    
    Ok(())
}

#[tokio::test]
async fn test_exit_strategy_initialization() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(SnipingState::default()));
    
    let exit_manager = ExitManager::new(&config, state.clone()).await?;
    
    assert!(exit_manager.is_active());
    assert_eq!(exit_manager.get_active_trades().len(), 0);
    
    Ok(())
}

#[tokio::test]
async fn test_exit_strategy_stop_loss() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(SnipingState::default()));
    
    let exit_manager = ExitManager::new(&config, state.clone()).await?;
    let test_trade = ActiveTrade {
        token_address: "0x1234...5678".to_string(),
        entry_price: 100.0,
        amount: 1.0,
        stop_loss: 90.0, // 10% stop loss
        take_profit: 120.0, // 20% take profit
    };
    
    exit_manager.add_trade(test_trade).await?;
    
    // Simulate price drop below stop loss
    let result = exit_manager.check_exit_conditions(85.0).await?;
    assert!(result.should_exit);
    assert_eq!(result.exit_type, ExitType::StopLoss);
    
    Ok(())
}

#[tokio::test]
async fn test_exit_strategy_take_profit() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(SnipingState::default()));
    
    let exit_manager = ExitManager::new(&config, state.clone()).await?;
    let test_trade = ActiveTrade {
        token_address: "0x1234...5678".to_string(),
        entry_price: 100.0,
        amount: 1.0,
        stop_loss: 90.0,
        take_profit: 120.0,
    };
    
    exit_manager.add_trade(test_trade).await?;
    
    // Simulate price rise above take profit
    let result = exit_manager.check_exit_conditions(125.0).await?;
    assert!(result.should_exit);
    assert_eq!(result.exit_type, ExitType::TakeProfit);
    
    Ok(())
}

#[tokio::test]
async fn test_exit_strategy_trailing_stop() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(SnipingState::default()));
    
    let exit_manager = ExitManager::new(&config, state.clone()).await?;
    let test_trade = ActiveTrade {
        token_address: "0x1234...5678".to_string(),
        entry_price: 100.0,
        amount: 1.0,
        stop_loss: 90.0,
        take_profit: 120.0,
        trailing_stop: 5.0, // 5% trailing stop
    };
    
    exit_manager.add_trade(test_trade).await?;
    
    // Simulate price movement with trailing stop
    let result = exit_manager.check_exit_conditions(110.0).await?;
    assert!(!result.should_exit);
    
    let result = exit_manager.check_exit_conditions(115.0).await?;
    assert!(!result.should_exit);
    
    let result = exit_manager.check_exit_conditions(109.0).await?;
    assert!(result.should_exit);
    assert_eq!(result.exit_type, ExitType::TrailingStop);
    
    Ok(())
}

#[tokio::test]
async fn test_integration_workflow() -> Result<()> {
    let config = Config::load()?;
    let state = Arc::new(RwLock::new(SnipingState::default()));
    
    // Initialize components
    let radar = Radar::new(&config, state.clone()).await?;
    let buy_engine = BuyEngine::new(&config, state.clone()).await?;
    let exit_manager = ExitManager::new(&config, state.clone()).await?;
    
    // Test complete workflow
    let test_pair = "0x1234...5678".to_string();
    radar.add_pair_to_monitor(&test_pair).await?;
    
    // Simulate opportunity detection
    let opportunity = radar.scan_opportunities().await?;
    assert!(opportunity.is_some());
    
    // Execute trade
    let trade = Trade {
        token_address: opportunity.unwrap().token_address,
        amount: 1.0,
        max_slippage: 1.0,
        gas_price: 50,
    };
    
    let result = buy_engine.execute_trade(&trade).await?;
    assert!(result.success);
    
    // Add to exit manager
    let active_trade = ActiveTrade {
        token_address: trade.token_address,
        entry_price: 100.0,
        amount: trade.amount,
        stop_loss: 90.0,
        take_profit: 120.0,
    };
    
    exit_manager.add_trade(active_trade).await?;
    
    // Test exit conditions
    let exit_result = exit_manager.check_exit_conditions(95.0).await?;
    assert!(!exit_result.should_exit);
    
    let exit_result = exit_manager.check_exit_conditions(85.0).await?;
    assert!(exit_result.should_exit);
    
    Ok(())
} 