from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv
import os
import sqlite3
from contextlib import contextmanager
from typing import Dict, Any
import asyncio
import signal
from .config_manager import ConfigManager
from .logger import get_logger, LogContext, log_execution_time
from .error_handling import BotError, APIError, ValidationError
from .cache import cache
from .api_client import APIClient
from .database import db
from .security import security_manager
from .coin_analyzer import coin_analyzer
from .transaction_pipeline import transaction_pipeline
from .liquidity_monitor import liquidity_monitor
from .ai_oracle import ai_oracle

# Load environment variables
load_dotenv()

app = FastAPI(title="AntBot API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection pool
_db_connection = None

@contextmanager
def get_db_connection():
    """Get a database connection with proper cleanup."""
    global _db_connection
    try:
        if _db_connection is None:
            _db_connection = sqlite3.connect('antbot.db', check_same_thread=False)
        yield _db_connection
    except Exception as e:
        if _db_connection:
            _db_connection.rollback()
        raise e
    finally:
        if _db_connection:
            _db_connection.commit()

# Initialize SQLite database
def init_db():
    with get_db_connection() as conn:
        conn.execute('''
        CREATE TABLE IF NOT EXISTS bot_status (
            id INTEGER PRIMARY KEY,
            is_active BOOLEAN DEFAULT 0,
            total_balance REAL DEFAULT 0,
            active_trades INTEGER DEFAULT 0,
            success_rate REAL DEFAULT 0
        )
        ''')
        conn.execute('INSERT OR IGNORE INTO bot_status (id) VALUES (1)')

@app.get("/")
async def root():
    return {"status": "ok", "message": "AntBot API is running"}

@app.get("/status")
async def get_status():
    with get_db_connection() as conn:
        result = conn.execute('SELECT * FROM bot_status WHERE id = 1').fetchone()
        return {
            "bot_status": "active" if result[1] else "inactive",
            "total_balance": result[2],
            "active_trades": result[3],
            "success_rate": result[4]
        }

@app.post("/status/update")
async def update_status(updates: Dict[str, Any]):
    with get_db_connection() as conn:
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
            query = f"UPDATE bot_status SET {set_clause} WHERE id = 1"
            conn.execute(query, list(updates.values()))
        return await get_status()

class AntBot:
    """Main bot class that coordinates all components."""
    
    def __init__(self):
        self.config = ConfigManager()
        self.api_client = APIClient()
        self._initialized = False
        self._is_running = False
        self._shutdown_event = asyncio.Event()

    async def initialize(self):
        """Initialize the bot."""
        if self._initialized:
            return

        try:
            # Initialize shared components
            await self.api_client.initialize()
            await db.initialize()
            await cache.initialize()
            
            # Initialize bot components
            await coin_analyzer.initialize()
            await transaction_pipeline.initialize()
            await liquidity_monitor.initialize()
            await ai_oracle.initialize()
            
            self._initialized = True
            logger.info("AntBot initialized")
        except Exception as e:
            raise BotError(
                message="Failed to initialize AntBot",
                component="main",
                operation="initialize",
                details={'error': str(e)}
            )

    async def close(self):
        """Close the bot."""
        if self._initialized:
            self._is_running = False
            self._shutdown_event.set()
            
            # Close bot components
            await coin_analyzer.close()
            await transaction_pipeline.close()
            await liquidity_monitor.close()
            await ai_oracle.close()
            
            # Close shared components
            await self.api_client.close()
            await db.close()
            await cache.close()
            
            self._initialized = False
            logger.info("AntBot closed")

    async def start(self):
        """Start the bot."""
        if not self._initialized:
            await self.initialize()

        self._is_running = True
        self._shutdown_event.clear()
        
        # Start bot components
        await transaction_pipeline.start()
        await liquidity_monitor.start()
        await ai_oracle.start()
        
        # Set up signal handlers
        for sig in (signal.SIGTERM, signal.SIGINT):
            asyncio.get_event_loop().add_signal_handler(
                sig,
                lambda s=sig: asyncio.create_task(self._handle_shutdown(s))
            )
        
        logger.info("AntBot started")
        
        # Wait for shutdown
        await self._shutdown_event.wait()

    async def stop(self):
        """Stop the bot."""
        self._is_running = False
        self._shutdown_event.set()
        logger.info("AntBot stopped")

    async def _handle_shutdown(self, sig: signal.Signals):
        """Handle shutdown signals."""
        logger.info(f"Received signal {sig.name}")
        await self.stop()

    @log_execution_time(logger, "process_transaction")
    async def process_transaction(self, transaction_data: Dict[str, Any]):
        """Process a new transaction."""
        try:
            # Validate transaction data
            if not self._validate_transaction_data(transaction_data):
                raise ValidationError(
                    message="Invalid transaction data",
                    component="main",
                    operation="process_transaction"
                )
            
            # Add to transaction pipeline
            await transaction_pipeline.add_transaction(transaction_data)
            
        except Exception as e:
            raise BotError(
                message="Failed to process transaction",
                component="main",
                operation="process_transaction",
                details={'error': str(e), 'transaction': transaction_data}
            )

    @log_execution_time(logger, "monitor_token")
    async def monitor_token(self, token_address: str):
        """Start monitoring a token."""
        try:
            # Validate token address
            if not self._validate_token_address(token_address):
                raise ValidationError(
                    message="Invalid token address",
                    component="main",
                    operation="monitor_token"
                )
            
            # Add to liquidity monitor
            await liquidity_monitor.add_token(token_address)
            
            # Add to AI oracle
            await ai_oracle.add_token(token_address)
            
        except Exception as e:
            raise BotError(
                message=f"Failed to monitor token {token_address}",
                component="main",
                operation="monitor_token",
                details={'error': str(e), 'token_address': token_address}
            )

    @log_execution_time(logger, "stop_monitoring")
    async def stop_monitoring(self, token_address: str):
        """Stop monitoring a token."""
        try:
            # Remove from liquidity monitor
            await liquidity_monitor.remove_token(token_address)
            
            # Remove from AI oracle
            await ai_oracle.remove_token(token_address)
            
        except Exception as e:
            raise BotError(
                message=f"Failed to stop monitoring token {token_address}",
                component="main",
                operation="stop_monitoring",
                details={'error': str(e), 'token_address': token_address}
            )

    def _validate_transaction_data(self, transaction_data: Dict[str, Any]) -> bool:
        """Validate transaction data."""
        try:
            # Check required fields
            required_fields = [
                'hash',
                'from_address',
                'to_address',
                'value',
                'token_address',
                'timestamp',
                'gas_price',
                'gas_used',
                'status'
            ]
            
            if not all(field in transaction_data for field in required_fields):
                return False
            
            # Validate field types and values
            if not isinstance(transaction_data['value'], (int, float)) or transaction_data['value'] <= 0:
                return False
                
            if not isinstance(transaction_data['gas_price'], (int, float)) or transaction_data['gas_price'] <= 0:
                return False
                
            if not isinstance(transaction_data['gas_used'], int) or transaction_data['gas_used'] <= 0:
                return False
                
            if not isinstance(transaction_data['timestamp'], (int, float, str)):
                return False
                
            if transaction_data['status'] not in ['pending', 'completed', 'failed']:
                return False
            
            # Validate addresses
            if not self._validate_address(transaction_data['from_address']):
                return False
                
            if not self._validate_address(transaction_data['to_address']):
                return False
                
            if not self._validate_address(transaction_data['token_address']):
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating transaction data: {e}")
            return False

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

    def _validate_address(self, address: str) -> bool:
        """Validate a Solana address."""
        try:
            # Check if address is a valid Solana address (base58 encoded, 32-44 characters)
            if not address or len(address) < 32 or len(address) > 44:
                return False
            
            # Check if address contains only valid base58 characters
            valid_chars = set('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz')
            if not all(c in valid_chars for c in address):
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating address: {e}")
            return False

# Global bot instance
antbot = AntBot()

async def main():
    """Main entry point."""
    try:
        # Initialize bot
        await antbot.initialize()
        
        # Start bot
        await antbot.start()
        
    except Exception as e:
        logger.error(f"Error in main: {e}")
        await antbot.close()
        raise

if __name__ == "__main__":
    asyncio.run(main()) 