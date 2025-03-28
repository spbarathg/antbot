import os
import logging
from typing import Dict, Any
import tomli
from dataclasses import dataclass
from datetime import timedelta

logger = logging.getLogger('config_manager')

@dataclass
class DatabaseConfig:
    host: str
    port: int
    name: str
    user: str
    password: str

@dataclass
class APIConfig:
    host: str
    port: int
    birdeye_key: str
    openai_key: str
    jito_key: str

@dataclass
class BotConfig:
    max_concurrent_transactions: int
    min_liquidity: float
    liquidity_drop_threshold: float
    liquidity_surge_threshold: float
    cache_ttl: timedelta
    max_retries: int
    retry_delay: float

class ConfigManager:
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ConfigManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self.config_path = os.getenv('CONFIG_PATH', 'config/settings.toml')
            self.config = self._load_config()
            self._initialized = True

    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from TOML file."""
        try:
            with open(self.config_path, "rb") as f:
                config = tomli.load(f)
            
            # Validate required sections
            required_sections = ['database', 'api', 'bot']
            for section in required_sections:
                if section not in config:
                    raise ValueError(f"Missing required config section: {section}")
            
            return config
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            raise

    @property
    def database(self) -> DatabaseConfig:
        """Get database configuration."""
        db_config = self.config['database']
        return DatabaseConfig(
            host=db_config['host'],
            port=db_config['port'],
            name=db_config['name'],
            user=db_config['user'],
            password=db_config['password']
        )

    @property
    def api(self) -> APIConfig:
        """Get API configuration."""
        api_config = self.config['api']
        return APIConfig(
            host=api_config['host'],
            port=api_config['port'],
            birdeye_key=api_config['birdeye_key'],
            openai_key=api_config['openai_key'],
            jito_key=api_config['jito_key']
        )

    @property
    def bot(self) -> BotConfig:
        """Get bot configuration."""
        bot_config = self.config['bot']
        return BotConfig(
            max_concurrent_transactions=bot_config['max_concurrent_transactions'],
            min_liquidity=bot_config['min_liquidity'],
            liquidity_drop_threshold=bot_config['liquidity_drop_threshold'],
            liquidity_surge_threshold=bot_config['liquidity_surge_threshold'],
            cache_ttl=timedelta(minutes=bot_config['cache_ttl_minutes']),
            max_retries=bot_config['max_retries'],
            retry_delay=bot_config['retry_delay']
        )

    def reload(self):
        """Reload configuration from file."""
        self.config = self._load_config()
        logger.info("Configuration reloaded successfully") 