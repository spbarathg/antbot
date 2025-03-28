import logging
import asyncio
import aiohttp
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from .config_manager import ConfigManager

logger = logging.getLogger('api_client')

@dataclass
class APIResponse:
    data: Dict[str, Any]
    status: int
    timestamp: datetime

class RateLimiter:
    def __init__(self, calls_per_second: int):
        self.semaphore = asyncio.Semaphore(calls_per_second)
        self.last_call = datetime.now()
        self.min_interval = 1.0 / calls_per_second

    async def acquire(self):
        await self.semaphore.acquire()
        now = datetime.now()
        elapsed = (now - self.last_call).total_seconds()
        if elapsed < self.min_interval:
            await asyncio.sleep(self.min_interval - elapsed)
        self.last_call = datetime.now()

    def release(self):
        self.semaphore.release()

class APIClient:
    def __init__(self):
        self.config = ConfigManager()
        self.session: Optional[aiohttp.ClientSession] = None
        self.rate_limiter = RateLimiter(calls_per_second=10)  # Default rate limit
        self._headers = {
            "X-API-KEY": self.config.api.birdeye_key,
            "Content-Type": "application/json"
        }

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(headers=self._headers)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def get(self, url: str) -> APIResponse:
        """Make a GET request with rate limiting and retries."""
        if not self.session:
            raise RuntimeError("APIClient must be used as an async context manager")

        for attempt in range(self.config.bot.max_retries):
            try:
                await self.rate_limiter.acquire()
                async with self.session.get(url) as response:
                    data = await response.json()
                    return APIResponse(
                        data=data,
                        status=response.status,
                        timestamp=datetime.now()
                    )
            except Exception as e:
                logger.error(f"API request failed (attempt {attempt + 1}/{self.config.bot.max_retries}): {e}")
                if attempt < self.config.bot.max_retries - 1:
                    await asyncio.sleep(self.config.bot.retry_delay)
                else:
                    raise
            finally:
                self.rate_limiter.release()

    async def post(self, url: str, data: Dict[str, Any]) -> APIResponse:
        """Make a POST request with rate limiting and retries."""
        if not self.session:
            raise RuntimeError("APIClient must be used as an async context manager")

        for attempt in range(self.config.bot.max_retries):
            try:
                await self.rate_limiter.acquire()
                async with self.session.post(url, json=data) as response:
                    data = await response.json()
                    return APIResponse(
                        data=data,
                        status=response.status,
                        timestamp=datetime.now()
                    )
            except Exception as e:
                logger.error(f"API request failed (attempt {attempt + 1}/{self.config.bot.max_retries}): {e}")
                if attempt < self.config.bot.max_retries - 1:
                    await asyncio.sleep(self.config.bot.retry_delay)
                else:
                    raise
            finally:
                self.rate_limiter.release()

    async def batch_get(self, urls: List[str]) -> List[APIResponse]:
        """Make multiple GET requests concurrently."""
        tasks = [self.get(url) for url in urls]
        return await asyncio.gather(*tasks)

    async def batch_post(self, url: str, data_list: List[Dict[str, Any]]) -> List[APIResponse]:
        """Make multiple POST requests concurrently."""
        tasks = [self.post(url, data) for data in data_list]
        return await asyncio.gather(*tasks) 