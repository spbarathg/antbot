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
from .security import security_manager
from .coin_analyzer import coin_analyzer, CoinAnalysis
import logging

logger = get_logger(__name__)

@dataclass
class Transaction:
    """Structured transaction data."""
    hash: str
    from_address: str
    to_address: str
    value: float
    token_address: str
    timestamp: datetime
    gas_price: float
    gas_used: int
    status: str
    metadata: Dict[str, any]

class TransactionPipeline:
    """Processes and analyzes transactions."""
    
    def __init__(self):
        self.processing_tasks: Dict[str, asyncio.Task] = {}
        self.transaction_cache: Dict[str, Transaction] = {}
        self._initialized = False
        self._is_running = False
        self._shutdown_event = asyncio.Event()
        
        # Processing parameters
        self.batch_size = 100
        self.max_cache_size = 1000
        self.cache_ttl = 3600  # seconds (1 hour)
        self.processing_interval = 1  # seconds
        
        # Transaction statuses
        self.STATUSES = {
            'PENDING': 'pending',
            'COMPLETED': 'completed',
            'FAILED': 'failed'
        }

    async def initialize(self):
        """Initialize the transaction pipeline."""
        if self._initialized:
            return
            
        try:
            self._initialized = True
            logger.info("Transaction Pipeline initialized")
        except Exception as e:
            raise BotError(
                message="Failed to initialize Transaction Pipeline",
                component="transaction_pipeline",
                operation="initialize",
                details={'error': str(e)}
            )

    async def close(self):
        """Close the transaction pipeline."""
        if self._initialized:
            self._is_running = False
            self._shutdown_event.set()
            
            # Cancel all processing tasks
            for task in self.processing_tasks.values():
                task.cancel()
            
            self.processing_tasks.clear()
            self.transaction_cache.clear()
            self._initialized = False
            logger.info("Transaction Pipeline closed")

    async def start(self):
        """Start the transaction pipeline."""
        if not self._initialized:
            await self.initialize()
            
        self._is_running = True
        self._shutdown_event.clear()
        logger.info("Transaction Pipeline started")

    async def stop(self):
        """Stop the transaction pipeline."""
        self._is_running = False
        self._shutdown_event.set()
        logger.info("Transaction Pipeline stopped")

    @log_execution_time(logger, "add_transaction")
    async def add_transaction(self, transaction_data: Dict[str, any]):
        """Add a transaction to the pipeline."""
        try:
            # Validate transaction data
            if not self._validate_transaction_data(transaction_data):
                raise ValidationError(
                    message="Invalid transaction data",
                    component="transaction_pipeline",
                    operation="add_transaction"
                )
            
            # Create transaction object
            transaction = Transaction(
                hash=transaction_data['hash'],
                from_address=transaction_data['from_address'],
                to_address=transaction_data['to_address'],
                value=float(transaction_data['value']),
                token_address=transaction_data['token_address'],
                timestamp=datetime.fromisoformat(transaction_data['timestamp']),
                gas_price=float(transaction_data['gas_price']),
                gas_used=int(transaction_data['gas_used']),
                status=transaction_data['status'],
                metadata=transaction_data.get('metadata', {})
            )
            
            # Add to cache
            self._add_to_cache(transaction)
            
            # Start processing task if not already running
            if transaction.hash not in self.processing_tasks:
                self.processing_tasks[transaction.hash] = asyncio.create_task(
                    self._process_transaction(transaction)
                )
            
            logger.info(f"Added transaction {transaction.hash} to pipeline")
            
        except Exception as e:
            raise BotError(
                message="Failed to add transaction to pipeline",
                component="transaction_pipeline",
                operation="add_transaction",
                details={'error': str(e), 'transaction': transaction_data}
            )

    @log_execution_time(logger, "get_transaction")
    async def get_transaction(self, transaction_hash: str) -> Optional[Transaction]:
        """Get a transaction from the pipeline."""
        try:
            if not self._validate_transaction_hash(transaction_hash):
                raise ValidationError(
                    message="Invalid transaction hash",
                    component="transaction_pipeline",
                    operation="get_transaction"
                )
            
            # Check cache first
            if transaction_hash in self.transaction_cache:
                transaction = self.transaction_cache[transaction_hash]
                if self._is_cache_valid(transaction):
                    return transaction
            
            # TODO: Fetch from database if not in cache
            
            return None
            
        except Exception as e:
            raise BotError(
                message=f"Failed to get transaction {transaction_hash}",
                component="transaction_pipeline",
                operation="get_transaction",
                details={'error': str(e), 'transaction_hash': transaction_hash}
            )

    async def _process_transaction(self, transaction: Transaction):
        """Process a single transaction."""
        try:
            # Validate transaction
            if not self._validate_transaction(transaction):
                logger.error(f"Invalid transaction {transaction.hash}")
                return
            
            # Process transaction based on status
            if transaction.status == self.STATUSES['PENDING']:
                await self._process_pending_transaction(transaction)
            elif transaction.status == self.STATUSES['COMPLETED']:
                await self._process_completed_transaction(transaction)
            elif transaction.status == self.STATUSES['FAILED']:
                await self._process_failed_transaction(transaction)
            
            # Wait before next check
            await asyncio.sleep(self.processing_interval)
            
        except asyncio.CancelledError:
            logger.info(f"Transaction processing cancelled for {transaction.hash}")
            return
        except Exception as e:
            logger.error(f"Error processing transaction {transaction.hash}: {e}")
            await asyncio.sleep(self.processing_interval)  # Wait before retrying

    async def _process_pending_transaction(self, transaction: Transaction):
        """Process a pending transaction."""
        # TODO: Implement pending transaction processing
        pass

    async def _process_completed_transaction(self, transaction: Transaction):
        """Process a completed transaction."""
        # TODO: Implement completed transaction processing
        pass

    async def _process_failed_transaction(self, transaction: Transaction):
        """Process a failed transaction."""
        # TODO: Implement failed transaction processing
        pass

    def _add_to_cache(self, transaction: Transaction):
        """Add a transaction to the cache."""
        # Remove oldest transaction if cache is full
        if len(self.transaction_cache) >= self.max_cache_size:
            oldest_hash = min(
                self.transaction_cache.items(),
                key=lambda x: x[1].timestamp
            )[0]
            del self.transaction_cache[oldest_hash]
        
        self.transaction_cache[transaction.hash] = transaction

    def _is_cache_valid(self, transaction: Transaction) -> bool:
        """Check if a cached transaction is still valid."""
        age = (datetime.utcnow() - transaction.timestamp).total_seconds()
        return age <= self.cache_ttl

    def _validate_transaction_data(self, data: Dict[str, any]) -> bool:
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
            
            if not all(field in data for field in required_fields):
                return False
            
            # Validate field types and values
            if not isinstance(data['value'], (int, float)) or data['value'] <= 0:
                return False
                
            if not isinstance(data['gas_price'], (int, float)) or data['gas_price'] <= 0:
                return False
                
            if not isinstance(data['gas_used'], int) or data['gas_used'] <= 0:
                return False
                
            if not isinstance(data['timestamp'], str):
                return False
                
            if data['status'] not in self.STATUSES.values():
                return False
            
            # Validate addresses
            if not self._validate_address(data['from_address']):
                return False
                
            if not self._validate_address(data['to_address']):
                return False
                
            if not self._validate_address(data['token_address']):
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating transaction data: {e}")
            return False

    def _validate_transaction(self, transaction: Transaction) -> bool:
        """Validate a transaction object."""
        try:
            # Validate hash
            if not self._validate_transaction_hash(transaction.hash):
                return False
            
            # Validate addresses
            if not self._validate_address(transaction.from_address):
                return False
                
            if not self._validate_address(transaction.to_address):
                return False
                
            if not self._validate_address(transaction.token_address):
                return False
            
            # Validate numeric values
            if transaction.value <= 0:
                return False
                
            if transaction.gas_price <= 0:
                return False
                
            if transaction.gas_used <= 0:
                return False
            
            # Validate status
            if transaction.status not in self.STATUSES.values():
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating transaction: {e}")
            return False

    def _validate_transaction_hash(self, hash: str) -> bool:
        """Validate a transaction hash."""
        try:
            # Check if hash is a valid Solana transaction hash (base58 encoded, 88 characters)
            if not hash or len(hash) != 88:
                return False
            
            # Check if hash contains only valid base58 characters
            valid_chars = set('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz')
            if not all(c in valid_chars for c in hash):
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating transaction hash: {e}")
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

# Global transaction pipeline instance
transaction_pipeline = TransactionPipeline() 