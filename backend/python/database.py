import logging
import asyncpg
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from .config_manager import ConfigManager
from .error_handling import DatabaseError

logger = logging.getLogger('database')

class DatabasePool:
    """Manages a pool of database connections."""
    
    def __init__(self):
        self.config = ConfigManager()
        self.pool: Optional[asyncpg.Pool] = None
        self._initialized = False

    async def initialize(self):
        """Initialize the connection pool."""
        if self._initialized:
            return

        try:
            self.pool = await asyncpg.create_pool(
                host=self.config.database.host,
                port=self.config.database.port,
                database=self.config.database.name,
                user=self.config.database.user,
                password=self.config.database.password,
                min_size=1,
                max_size=20,
                command_timeout=60
            )
            self._initialized = True
            logger.info("Database connection pool initialized")
        except Exception as e:
            raise DatabaseError(
                message="Failed to initialize database pool",
                operation="initialize",
                details={'error': str(e)}
            )

    async def close(self):
        """Close the connection pool."""
        if self.pool:
            await self.pool.close()
            self._initialized = False
            logger.info("Database connection pool closed")

    @asynccontextmanager
    async def acquire(self):
        """Acquire a connection from the pool."""
        if not self._initialized:
            await self.initialize()
        
        if not self.pool:
            raise DatabaseError(
                message="Database pool not initialized",
                operation="acquire"
            )

        conn = await self.pool.acquire()
        try:
            yield conn
        finally:
            await self.pool.release(conn)

    async def execute(self, query: str, *args) -> str:
        """
        Execute a query and return the result.
        
        Args:
            query: SQL query string
            *args: Query parameters
            
        Returns:
            str: Result of the query
        """
        async with self.acquire() as conn:
            try:
                return await conn.execute(query, *args)
            except Exception as e:
                raise DatabaseError(
                    message="Query execution failed",
                    operation="execute",
                    query=query,
                    params=args,
                    details={'error': str(e)}
                )

    async def fetch(self, query: str, *args) -> List[Dict[str, Any]]:
        """
        Execute a query and return all results.
        
        Args:
            query: SQL query string
            *args: Query parameters
            
        Returns:
            List[Dict[str, Any]]: Query results
        """
        async with self.acquire() as conn:
            try:
                return await conn.fetch(query, *args)
            except Exception as e:
                raise DatabaseError(
                    message="Query fetch failed",
                    operation="fetch",
                    query=query,
                    params=args,
                    details={'error': str(e)}
                )

    async def fetchrow(self, query: str, *args) -> Optional[Dict[str, Any]]:
        """
        Execute a query and return a single result.
        
        Args:
            query: SQL query string
            *args: Query parameters
            
        Returns:
            Optional[Dict[str, Any]]: Query result or None
        """
        async with self.acquire() as conn:
            try:
                return await conn.fetchrow(query, *args)
            except Exception as e:
                raise DatabaseError(
                    message="Query fetchrow failed",
                    operation="fetchrow",
                    query=query,
                    params=args,
                    details={'error': str(e)}
                )

    async def fetchval(self, query: str, *args) -> Any:
        """
        Execute a query and return a single value.
        
        Args:
            query: SQL query string
            *args: Query parameters
            
        Returns:
            Any: Query result value
        """
        async with self.acquire() as conn:
            try:
                return await conn.fetchval(query, *args)
            except Exception as e:
                raise DatabaseError(
                    message="Query fetchval failed",
                    operation="fetchval",
                    query=query,
                    params=args,
                    details={'error': str(e)}
                )

    async def execute_many(self, query: str, args_list: List[tuple]) -> List[str]:
        """
        Execute a query multiple times with different parameters.
        
        Args:
            query: SQL query string
            args_list: List of parameter tuples
            
        Returns:
            List[str]: Results of the queries
        """
        async with self.acquire() as conn:
            try:
                return await conn.executemany(query, args_list)
            except Exception as e:
                raise DatabaseError(
                    message="Batch query execution failed",
                    operation="execute_many",
                    query=query,
                    params=args_list,
                    details={'error': str(e)}
                )

# Global database pool instance
db = DatabasePool() 