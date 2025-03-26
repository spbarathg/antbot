import os
import json
import logging
import asyncio
from typing import Dict, List, Optional, Set, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
import aiohttp
from solana.rpc.async_api import AsyncClient
from solana.transaction import Transaction
from solana.keypair import Keypair
from solana.rpc.commitment import Commitment
import base58

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('transaction_pipeline')

@dataclass
class TransactionRequest:
    token_address: str
    amount: float
    action: str  # "buy", "sell", "transfer"
    priority: int
    max_slippage: float
    created_at: datetime
    wallet_address: str
    signature: Optional[str] = None
    status: str = "pending"  # pending, processing, completed, failed
    error: Optional[str] = None

@dataclass
class TransactionResult:
    request: TransactionRequest
    success: bool
    transaction_hash: Optional[str]
    execution_time: float
    error: Optional[str]
    timestamp: datetime

class TransactionPipeline:
    def __init__(self, config_path: str = "config/settings.toml"):
        """Initialize the Transaction Pipeline with configuration."""
        self.config = self._load_config(config_path)
        self.rpc_url = self.config["rpc"]["endpoint"]
        self.solana_client = AsyncClient(self.rpc_url, commitment=Commitment("confirmed"))
        self.executor = ThreadPoolExecutor(max_workers=8)
        self.is_active = False
        
        # Transaction queues
        self.pending_transactions: List[TransactionRequest] = []
        self.processing_transactions: Dict[str, TransactionRequest] = {}
        self.completed_transactions: List[TransactionResult] = []
        
        # Load wallet keypairs
        self.wallets = self._load_wallets()
        
        logger.info("Transaction Pipeline initialized successfully")

    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from TOML file."""
        try:
            import tomli
            with open(config_path, "rb") as f:
                return tomli.load(f)
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            raise

    def _load_wallets(self) -> Dict[str, Keypair]:
        """Load wallet keypairs from configuration."""
        wallets = {}
        for wallet_name, private_key in self.config["wallets"].items():
            try:
                keypair = Keypair.from_secret_key(base58.b58decode(private_key))
                wallets[wallet_name] = keypair
            except Exception as e:
                logger.error(f"Error loading wallet {wallet_name}: {e}")
        return wallets

    async def start_processing(self):
        """Start the transaction processing pipeline."""
        self.is_active = True
        logger.info("Starting transaction pipeline")

        while self.is_active:
            try:
                await self._process_transactions()
            except Exception as e:
                logger.error(f"Error in processing loop: {e}")
                await asyncio.sleep(1)  # Wait before retrying

    async def _process_transactions(self):
        """Process pending transactions."""
        # Sort transactions by priority
        self.pending_transactions.sort(key=lambda x: x.priority, reverse=True)
        
        # Process transactions up to max concurrent limit
        max_concurrent = self.config["transaction_pipeline"]["max_concurrent"]
        while len(self.processing_transactions) < max_concurrent and self.pending_transactions:
            transaction = self.pending_transactions.pop(0)
            self.processing_transactions[transaction.signature] = transaction
            
            # Process transaction in background
            asyncio.create_task(self._execute_transaction(transaction))

        # Clean up old completed transactions
        self._cleanup_old_transactions()

    async def _execute_transaction(self, transaction: TransactionRequest):
        """Execute a single transaction."""
        start_time = datetime.now()
        
        try:
            # Build transaction
            tx = await self._build_transaction(transaction)
            
            # Sign transaction
            signed_tx = await self._sign_transaction(tx, transaction)
            
            # Send transaction
            result = await self._send_transaction(signed_tx)
            
            # Update transaction status
            transaction.status = "completed"
            transaction.signature = result["transaction_hash"]
            
            # Record result
            self.completed_transactions.append(TransactionResult(
                request=transaction,
                success=True,
                transaction_hash=result["transaction_hash"],
                execution_time=(datetime.now() - start_time).total_seconds(),
                error=None,
                timestamp=datetime.now()
            ))
            
            logger.info(f"Transaction completed: {result['transaction_hash']}")
            
        except Exception as e:
            # Handle failure
            transaction.status = "failed"
            transaction.error = str(e)
            
            self.completed_transactions.append(TransactionResult(
                request=transaction,
                success=False,
                transaction_hash=None,
                execution_time=(datetime.now() - start_time).total_seconds(),
                error=str(e),
                timestamp=datetime.now()
            ))
            
            logger.error(f"Transaction failed: {e}")
            
        finally:
            # Remove from processing
            if transaction.signature in self.processing_transactions:
                del self.processing_transactions[transaction.signature]

    async def _build_transaction(self, transaction: TransactionRequest) -> Transaction:
        """Build a Solana transaction based on the request."""
        # Implementation will depend on the specific DEX or protocol being used
        # This is a placeholder for the actual implementation
        raise NotImplementedError("Transaction building not implemented")

    async def _sign_transaction(self, transaction: Transaction, request: TransactionRequest) -> Transaction:
        """Sign a transaction with the appropriate wallet."""
        if request.wallet_address not in self.wallets:
            raise ValueError(f"Wallet not found: {request.wallet_address}")
        
        wallet = self.wallets[request.wallet_address]
        transaction.sign(wallet)
        return transaction

    async def _send_transaction(self, transaction: Transaction) -> Dict:
        """Send a transaction to the Solana network."""
        try:
            result = await self.solana_client.send_transaction(
                transaction,
                opts={"skip_preflight": True}
            )
            return {"transaction_hash": result["result"]}
        except Exception as e:
            raise Exception(f"Failed to send transaction: {e}")

    def _cleanup_old_transactions(self):
        """Remove completed transactions older than 24 hours."""
        cutoff_time = datetime.now() - timedelta(hours=24)
        self.completed_transactions = [
            tx for tx in self.completed_transactions
            if tx.timestamp > cutoff_time
        ]

    async def submit_transaction(self, request: TransactionRequest) -> str:
        """Submit a new transaction to the pipeline."""
        # Validate request
        if request.wallet_address not in self.wallets:
            raise ValueError(f"Invalid wallet address: {request.wallet_address}")
        
        # Add to pending queue
        self.pending_transactions.append(request)
        logger.info(f"Transaction submitted for token {request.token_address}")
        
        return request.signature

    async def cancel_transaction(self, signature: str) -> bool:
        """Cancel a pending or processing transaction."""
        # Check pending transactions
        for tx in self.pending_transactions:
            if tx.signature == signature:
                self.pending_transactions.remove(tx)
                logger.info(f"Cancelled pending transaction: {signature}")
                return True
        
        # Check processing transactions
        if signature in self.processing_transactions:
            del self.processing_transactions[signature]
            logger.info(f"Cancelled processing transaction: {signature}")
            return True
        
        return False

    async def stop_processing(self):
        """Stop the transaction pipeline."""
        self.is_active = False
        logger.info("Stopping transaction pipeline")

    def get_transaction_status(self, signature: str) -> Optional[str]:
        """Get the current status of a transaction."""
        # Check pending transactions
        for tx in self.pending_transactions:
            if tx.signature == signature:
                return tx.status
        
        # Check processing transactions
        if signature in self.processing_transactions:
            return self.processing_transactions[signature].status
        
        # Check completed transactions
        for tx in self.completed_transactions:
            if tx.request.signature == signature:
                return tx.request.status
        
        return None

    def get_pending_transactions(self) -> List[TransactionRequest]:
        """Get list of pending transactions."""
        return self.pending_transactions.copy()

    def get_processing_transactions(self) -> List[TransactionRequest]:
        """Get list of currently processing transactions."""
        return list(self.processing_transactions.values())

    def get_completed_transactions(self) -> List[TransactionResult]:
        """Get list of completed transactions."""
        return self.completed_transactions.copy() 