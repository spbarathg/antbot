import logging
import json
import aioredis
from typing import Optional, Any, Dict, List
from datetime import datetime, timedelta
from .config_manager import ConfigManager
from .error_handling import APIError

logger = logging.getLogger('cache')

class RedisCache:
    """Manages Redis-based caching with TTL support."""
    
    def __init__(self):
        self.config = ConfigManager()
        self.redis: Optional[aioredis.Redis] = None
        self._initialized = False

    async def initialize(self):
        """Initialize Redis connection."""
        if self._initialized:
            return

        try:
            self.redis = await aioredis.from_url(
                self.config.redis.url,
                encoding="utf-8",
                decode_responses=True
            )
            self._initialized = True
            logger.info("Redis cache initialized")
        except Exception as e:
            raise APIError(
                message="Failed to initialize Redis cache",
                operation="initialize",
                details={'error': str(e)}
            )

    async def close(self):
        """Close Redis connection."""
        if self.redis:
            await self.redis.close()
            self._initialized = False
            logger.info("Redis cache closed")

    async def get(self, key: str) -> Optional[str]:
        """
        Get a value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Optional[str]: Cached value or None
        """
        if not self._initialized:
            await self.initialize()
        
        try:
            return await self.redis.get(key)
        except Exception as e:
            logger.error(f"Cache get failed for key {key}: {e}")
            return None

    async def set(
        self,
        key: str,
        value: str,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Set a value in cache with optional TTL.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self._initialized:
            await self.initialize()
        
        try:
            await self.redis.set(key, value, ex=ttl)
            return True
        except Exception as e:
            logger.error(f"Cache set failed for key {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """
        Delete a value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self._initialized:
            await self.initialize()
        
        try:
            await self.redis.delete(key)
            return True
        except Exception as e:
            logger.error(f"Cache delete failed for key {key}: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """
        Check if a key exists in cache.
        
        Args:
            key: Cache key
            
        Returns:
            bool: True if key exists, False otherwise
        """
        if not self._initialized:
            await self.initialize()
        
        try:
            return await self.redis.exists(key) > 0
        except Exception as e:
            logger.error(f"Cache exists check failed for key {key}: {e}")
            return False

    async def get_json(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Get a JSON value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Optional[Dict[str, Any]]: Cached JSON value or None
        """
        value = await self.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON in cache for key {key}")
                return None
        return None

    async def set_json(
        self,
        key: str,
        value: Dict[str, Any],
        ttl: Optional[int] = None
    ) -> bool:
        """
        Set a JSON value in cache.
        
        Args:
            key: Cache key
            value: JSON value to cache
            ttl: Time to live in seconds
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            json_value = json.dumps(value)
            return await self.set(key, json_value, ttl)
        except Exception as e:
            logger.error(f"Cache set_json failed for key {key}: {e}")
            return False

    async def get_many(self, keys: List[str]) -> Dict[str, str]:
        """
        Get multiple values from cache.
        
        Args:
            keys: List of cache keys
            
        Returns:
            Dict[str, str]: Dictionary of key-value pairs
        """
        if not self._initialized:
            await self.initialize()
        
        try:
            values = await self.redis.mget(keys)
            return {k: v for k, v in zip(keys, values) if v is not None}
        except Exception as e:
            logger.error(f"Cache get_many failed: {e}")
            return {}

    async def set_many(
        self,
        key_value_pairs: Dict[str, str],
        ttl: Optional[int] = None
    ) -> bool:
        """
        Set multiple values in cache.
        
        Args:
            key_value_pairs: Dictionary of key-value pairs
            ttl: Time to live in seconds
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self._initialized:
            await self.initialize()
        
        try:
            pipeline = self.redis.pipeline()
            for key, value in key_value_pairs.items():
                pipeline.set(key, value, ex=ttl)
            await pipeline.execute()
            return True
        except Exception as e:
            logger.error(f"Cache set_many failed: {e}")
            return False

    async def delete_many(self, keys: List[str]) -> bool:
        """
        Delete multiple values from cache.
        
        Args:
            keys: List of cache keys
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self._initialized:
            await self.initialize()
        
        try:
            await self.redis.delete(*keys)
            return True
        except Exception as e:
            logger.error(f"Cache delete_many failed: {e}")
            return False

# Global cache instance
cache = RedisCache() 