import asyncio
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from .config_manager import ConfigManager
from .logger import get_logger, LogContext, log_execution_time
from .error_handling import BotError, APIError, ValidationError
from .cache import cache
from .api_client import APIClient
from .database import db
import logging

logger = get_logger(__name__)

@dataclass
class LiquiditySnapshot:
    """Structured liquidity data snapshot."""
    token_address: str
    liquidity: float
    volume_24h: float
    price: float
    timestamp: datetime
    metadata: Dict[str, Any]

@dataclass
class LiquidityAlert:
    token_address: str
    current_liquidity: float
    threshold: float
    alert_type: str
    timestamp: datetime
    details: Dict[str, any]

class LiquidityMonitor:
    """Monitors liquidity levels and trends for tokens."""
    
    def __init__(self):
        self.monitored_tokens: Dict[str, Dict[str, any]] = {}
        self.alert_tasks: Dict[str, asyncio.Task] = {}
        self._initialized = False
        self._is_running = False
        self._shutdown_event = asyncio.Event()
        
        # Monitoring parameters
        self.check_interval = 60  # seconds
        self.min_liquidity_threshold = 1000  # USD
        self.liquidity_decrease_threshold = 0.1  # 10%
        self.alert_cooldown = 300  # seconds (5 minutes)
        
        # Alert types
        self.ALERT_TYPES = {
            'LOW_LIQUIDITY': 'low_liquidity',
            'LIQUIDITY_DECREASE': 'liquidity_decrease',
            'LIQUIDITY_INCREASE': 'liquidity_increase'
        }

    async def initialize(self):
        """Initialize the liquidity monitor."""
        if self._initialized:
            return
            
        try:
            self._initialized = True
            logger.info("Liquidity Monitor initialized")
        except Exception as e:
            raise BotError(
                message="Failed to initialize Liquidity Monitor",
                component="liquidity_monitor",
                operation="initialize",
                details={'error': str(e)}
            )

    async def close(self):
        """Close the liquidity monitor."""
        if self._initialized:
            self._is_running = False
            self._shutdown_event.set()
            
            # Cancel all monitoring tasks
            for task in self.alert_tasks.values():
                task.cancel()
            
            self.alert_tasks.clear()
            self._initialized = False
            logger.info("Liquidity Monitor closed")

    async def start(self):
        """Start the liquidity monitor."""
        if not self._initialized:
            await self.initialize()
            
        self._is_running = True
        self._shutdown_event.clear()
        logger.info("Liquidity Monitor started")

    async def stop(self):
        """Stop the liquidity monitor."""
        self._is_running = False
        self._shutdown_event.set()
        logger.info("Liquidity Monitor stopped")

    @log_execution_time(logger, "add_token")
    async def add_token(self, token_address: str, threshold: Optional[float] = None):
        """Add a token for liquidity monitoring."""
        try:
            if not self._validate_token_address(token_address):
                raise ValidationError(
                    message="Invalid token address",
                    component="liquidity_monitor",
                    operation="add_token"
                )
            
            if token_address in self.monitored_tokens:
                logger.warning(f"Token {token_address} already being monitored")
                return
            
            # Initialize monitoring data
            self.monitored_tokens[token_address] = {
                'threshold': threshold or self.min_liquidity_threshold,
                'last_liquidity': 0.0,
                'last_alert_time': datetime.min,
                'liquidity_history': []
            }
            
            # Start monitoring task
            self.alert_tasks[token_address] = asyncio.create_task(
                self._monitor_token(token_address)
            )
            
            logger.info(f"Added token {token_address} for liquidity monitoring")
            
        except Exception as e:
            raise BotError(
                message=f"Failed to add token {token_address}",
                component="liquidity_monitor",
                operation="add_token",
                details={'error': str(e), 'token_address': token_address}
            )

    @log_execution_time(logger, "remove_token")
    async def remove_token(self, token_address: str):
        """Remove a token from liquidity monitoring."""
        try:
            if token_address not in self.monitored_tokens:
                logger.warning(f"Token {token_address} not being monitored")
                return
            
            # Cancel monitoring task
            if token_address in self.alert_tasks:
                self.alert_tasks[token_address].cancel()
                del self.alert_tasks[token_address]
            
            # Remove monitoring data
            del self.monitored_tokens[token_address]
            
            logger.info(f"Removed token {token_address} from liquidity monitoring")
            
        except Exception as e:
            raise BotError(
                message=f"Failed to remove token {token_address}",
                component="liquidity_monitor",
                operation="remove_token",
                details={'error': str(e), 'token_address': token_address}
            )

    @log_execution_time(logger, "get_liquidity")
    async def get_liquidity(self, token_address: str) -> Optional[float]:
        """Get current liquidity for a token."""
        try:
            if token_address not in self.monitored_tokens:
                raise ValidationError(
                    message="Token not being monitored",
                    component="liquidity_monitor",
                    operation="get_liquidity"
                )
            
            return self.monitored_tokens[token_address]['last_liquidity']
            
        except Exception as e:
            raise BotError(
                message=f"Failed to get liquidity for token {token_address}",
                component="liquidity_monitor",
                operation="get_liquidity",
                details={'error': str(e), 'token_address': token_address}
            )

    async def _monitor_token(self, token_address: str):
        """Background task to continuously monitor token liquidity."""
        while self._is_running and not self._shutdown_event.is_set():
            try:
                # Get current liquidity
                current_liquidity = await self._get_current_liquidity(token_address)
                
                if current_liquidity is not None:
                    # Update monitoring data
                    self._update_monitoring_data(token_address, current_liquidity)
                    
                    # Check for alerts
                    await self._check_alerts(token_address, current_liquidity)
                
                # Wait before next check
                await asyncio.sleep(self.check_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in monitoring task for {token_address}: {e}")
                await asyncio.sleep(self.check_interval)  # Wait before retrying

    async def _get_current_liquidity(self, token_address: str) -> Optional[float]:
        """Get current liquidity from market data."""
        # TODO: Implement actual market data fetching
        return 0.0

    def _update_monitoring_data(self, token_address: str, current_liquidity: float):
        """Update monitoring data for a token."""
        data = self.monitored_tokens[token_address]
        data['last_liquidity'] = current_liquidity
        data['liquidity_history'].append({
            'timestamp': datetime.utcnow(),
            'liquidity': current_liquidity
        })
        
        # Keep only last 24 hours of history
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        data['liquidity_history'] = [
            entry for entry in data['liquidity_history']
            if entry['timestamp'] > cutoff_time
        ]

    async def _check_alerts(self, token_address: str, current_liquidity: float):
        """Check for and send liquidity alerts."""
        data = self.monitored_tokens[token_address]
        last_liquidity = data['last_liquidity']
        threshold = data['threshold']
        last_alert_time = data['last_alert_time']
        
        # Check if enough time has passed since last alert
        if (datetime.utcnow() - last_alert_time).total_seconds() < self.alert_cooldown:
            return
        
        # Check for low liquidity
        if current_liquidity < threshold:
            await self._send_alert(
                token_address,
                current_liquidity,
                threshold,
                self.ALERT_TYPES['LOW_LIQUIDITY'],
                {'threshold': threshold}
            )
            data['last_alert_time'] = datetime.utcnow()
            return
        
        # Check for significant liquidity changes
        if last_liquidity > 0:
            change_ratio = (current_liquidity - last_liquidity) / last_liquidity
            
            if abs(change_ratio) >= self.liquidity_decrease_threshold:
                alert_type = (
                    self.ALERT_TYPES['LIQUIDITY_DECREASE']
                    if change_ratio < 0
                    else self.ALERT_TYPES['LIQUIDITY_INCREASE']
                )
                
                await self._send_alert(
                    token_address,
                    current_liquidity,
                    last_liquidity,
                    alert_type,
                    {
                        'change_ratio': change_ratio,
                        'previous_liquidity': last_liquidity
                    }
                )
                data['last_alert_time'] = datetime.utcnow()

    async def _send_alert(self, token_address: str, current_liquidity: float,
                         threshold: float, alert_type: str, details: Dict[str, any]):
        """Send a liquidity alert."""
        alert = LiquidityAlert(
            token_address=token_address,
            current_liquidity=current_liquidity,
            threshold=threshold,
            alert_type=alert_type,
            timestamp=datetime.utcnow(),
            details=details
        )
        
        # Log alert
        logger.info(
            f"Liquidity alert for {token_address}: "
            f"Type: {alert_type}, "
            f"Current: ${current_liquidity:,.2f}, "
            f"Threshold: ${threshold:,.2f}"
        )
        
        # TODO: Implement alert notification (e.g., webhook, email, etc.)

    def _validate_token_address(self, token_address: str) -> bool:
        """Validate a token address."""
        try:
            # Check if address is a valid Solana address (base58 encoded, 32-44 characters)
            if not token_address or len(token_address) < 32 or len(token_address) > 44:
                return False
            
            # Check if address contains only valid base58 characters
            valid_chars = set('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz')
            if not all(c in valid_chars for c in token_address):
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating token address: {e}")
            return False

# Global liquidity monitor instance
liquidity_monitor = LiquidityMonitor() 