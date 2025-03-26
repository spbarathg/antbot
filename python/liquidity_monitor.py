import os
import json
import logging
import asyncio
from typing import Dict, List, Optional, Set
from datetime import datetime, timedelta
import aiohttp
from dataclasses import dataclass
import numpy as np
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('liquidity_monitor')

@dataclass
class PoolMetrics:
    pool_address: str
    token_address: str
    liquidity: float
    volume_24h: float
    price: float
    price_change_24h: float
    liquidity_change_24h: float
    volume_change_24h: float
    last_updated: datetime

@dataclass
class LiquidityAlert:
    pool_address: str
    token_address: str
    alert_type: str  # "low_liquidity", "liquidity_drop", "liquidity_surge"
    severity: str    # "high", "medium", "low"
    current_value: float
    threshold_value: float
    timestamp: datetime
    message: str

class LiquidityMonitor:
    def __init__(self, config_path: str = "config/settings.toml"):
        """Initialize the Liquidity Monitor with configuration."""
        self.config = self._load_config(config_path)
        self.birdeye_api_key = self.config["api_keys"]["birdeye"]
        self.base_url = "https://public-api.birdeye.so"
        self.monitored_pools: Dict[str, PoolMetrics] = {}
        self.alert_history: List[LiquidityAlert] = []
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.is_active = False
        
        # Load thresholds from config
        self.min_liquidity = self.config["monitoring"]["min_liquidity"]
        self.liquidity_drop_threshold = self.config["monitoring"]["liquidity_drop_threshold"]
        self.liquidity_surge_threshold = self.config["monitoring"]["liquidity_surge_threshold"]
        
        logger.info("Liquidity Monitor initialized successfully")

    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from TOML file."""
        try:
            import tomli
            with open(config_path, "rb") as f:
                return tomli.load(f)
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            raise

    async def start_monitoring(self):
        """Start monitoring liquidity for all configured pools."""
        self.is_active = True
        logger.info("Starting liquidity monitoring")

        while self.is_active:
            try:
                await self._monitor_pools()
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(5)  # Wait before retrying

    async def _monitor_pools(self):
        """Monitor all configured pools for liquidity changes."""
        for pool_address in self.config["monitoring"]["pools"]:
            try:
                metrics = await self._fetch_pool_metrics(pool_address)
                if metrics:
                    await self._analyze_pool_metrics(metrics)
            except Exception as e:
                logger.error(f"Error monitoring pool {pool_address}: {e}")

        # Clean up old alerts
        self._cleanup_old_alerts()

    async def _fetch_pool_metrics(self, pool_address: str) -> Optional[PoolMetrics]:
        """Fetch current metrics for a pool from Birdeye API."""
        headers = {
            "X-API-KEY": self.birdeye_api_key,
            "Content-Type": "application/json"
        }

        try:
            async with aiohttp.ClientSession() as session:
                # Fetch pool data
                pool_url = f"{self.base_url}/pool/{pool_address}"
                async with session.get(pool_url, headers=headers) as response:
                    if response.status != 200:
                        logger.error(f"Error fetching pool data: {response.status}")
                        return None
                    
                    pool_data = await response.json()
                    
                    # Extract metrics
                    metrics = PoolMetrics(
                        pool_address=pool_address,
                        token_address=pool_data["token_address"],
                        liquidity=float(pool_data["liquidity"]),
                        volume_24h=float(pool_data["volume_24h"]),
                        price=float(pool_data["price"]),
                        price_change_24h=float(pool_data["price_change_24h"]),
                        liquidity_change_24h=float(pool_data["liquidity_change_24h"]),
                        volume_change_24h=float(pool_data["volume_change_24h"]),
                        last_updated=datetime.now()
                    )
                    
                    return metrics

        except Exception as e:
            logger.error(f"Error fetching pool metrics: {e}")
            return None

    async def _analyze_pool_metrics(self, metrics: PoolMetrics):
        """Analyze pool metrics and generate alerts if necessary."""
        # Check minimum liquidity
        if metrics.liquidity < self.min_liquidity:
            self._create_alert(
                metrics.pool_address,
                metrics.token_address,
                "low_liquidity",
                "high",
                metrics.liquidity,
                self.min_liquidity,
                f"Pool liquidity ({metrics.liquidity:.2f}) below minimum threshold ({self.min_liquidity:.2f})"
            )

        # Check liquidity drop
        if metrics.liquidity_change_24h < -self.liquidity_drop_threshold:
            self._create_alert(
                metrics.pool_address,
                metrics.token_address,
                "liquidity_drop",
                "medium",
                metrics.liquidity_change_24h,
                -self.liquidity_drop_threshold,
                f"Significant liquidity drop detected: {metrics.liquidity_change_24h:.2f}%"
            )

        # Check liquidity surge
        if metrics.liquidity_change_24h > self.liquidity_surge_threshold:
            self._create_alert(
                metrics.pool_address,
                metrics.token_address,
                "liquidity_surge",
                "low",
                metrics.liquidity_change_24h,
                self.liquidity_surge_threshold,
                f"Significant liquidity surge detected: {metrics.liquidity_change_24h:.2f}%"
            )

        # Update monitored pools
        self.monitored_pools[metrics.pool_address] = metrics

    def _create_alert(self, pool_address: str, token_address: str, alert_type: str,
                     severity: str, current_value: float, threshold_value: float,
                     message: str):
        """Create and log a new liquidity alert."""
        alert = LiquidityAlert(
            pool_address=pool_address,
            token_address=token_address,
            alert_type=alert_type,
            severity=severity,
            current_value=current_value,
            threshold_value=threshold_value,
            timestamp=datetime.now(),
            message=message
        )
        
        self.alert_history.append(alert)
        logger.warning(f"Liquidity Alert: {message}")

    def _cleanup_old_alerts(self):
        """Remove alerts older than 24 hours."""
        cutoff_time = datetime.now() - timedelta(hours=24)
        self.alert_history = [
            alert for alert in self.alert_history
            if alert.timestamp > cutoff_time
        ]

    async def add_pool_to_monitor(self, pool_address: str):
        """Add a new pool to monitor."""
        if pool_address not in self.monitored_pools:
            self.config["monitoring"]["pools"].append(pool_address)
            logger.info(f"Added pool {pool_address} to monitoring")

    async def remove_pool_from_monitor(self, pool_address: str):
        """Remove a pool from monitoring."""
        if pool_address in self.monitored_pools:
            del self.monitored_pools[pool_address]
            self.config["monitoring"]["pools"].remove(pool_address)
            logger.info(f"Removed pool {pool_address} from monitoring")

    async def stop_monitoring(self):
        """Stop the liquidity monitoring."""
        self.is_active = False
        logger.info("Stopping liquidity monitoring")

    def get_pool_metrics(self, pool_address: str) -> Optional[PoolMetrics]:
        """Get current metrics for a specific pool."""
        return self.monitored_pools.get(pool_address)

    def get_active_alerts(self) -> List[LiquidityAlert]:
        """Get all active alerts."""
        return self.alert_history

    def get_monitored_pools(self) -> List[str]:
        """Get list of all monitored pools."""
        return list(self.monitored_pools.keys()) 