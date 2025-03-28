import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger('error_handling')

@dataclass
class ErrorContext:
    """Context information for errors."""
    timestamp: datetime
    component: str
    operation: str
    details: Dict[str, Any]

class BotError(Exception):
    """Base exception for all bot errors."""
    def __init__(
        self,
        message: str,
        component: str,
        operation: str,
        details: Optional[Dict[str, Any]] = None
    ):
        self.context = ErrorContext(
            timestamp=datetime.now(),
            component=component,
            operation=operation,
            details=details or {}
        )
        super().__init__(message)
        logger.error(f"{component}.{operation}: {message}", extra=self.context.details)

class APIError(BotError):
    """API-related errors."""
    def __init__(
        self,
        message: str,
        operation: str,
        status_code: Optional[int] = None,
        response: Optional[Dict[str, Any]] = None
    ):
        details = {
            'status_code': status_code,
            'response': response
        }
        super().__init__(message, 'api', operation, details)

class TransactionError(BotError):
    """Transaction-related errors."""
    def __init__(
        self,
        message: str,
        operation: str,
        transaction_id: Optional[str] = None,
        wallet_address: Optional[str] = None
    ):
        details = {
            'transaction_id': transaction_id,
            'wallet_address': wallet_address
        }
        super().__init__(message, 'transaction', operation, details)

class ValidationError(BotError):
    """Data validation errors."""
    def __init__(
        self,
        message: str,
        operation: str,
        field: Optional[str] = None,
        value: Any = None
    ):
        details = {
            'field': field,
            'value': value
        }
        super().__init__(message, 'validation', operation, details)

class ConfigurationError(BotError):
    """Configuration-related errors."""
    def __init__(
        self,
        message: str,
        operation: str,
        config_key: Optional[str] = None,
        config_value: Any = None
    ):
        details = {
            'config_key': config_key,
            'config_value': config_value
        }
        super().__init__(message, 'configuration', operation, details)

class DatabaseError(BotError):
    """Database-related errors."""
    def __init__(
        self,
        message: str,
        operation: str,
        query: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None
    ):
        details = {
            'query': query,
            'params': params
        }
        super().__init__(message, 'database', operation, details)

def handle_error(error: Exception, component: str, operation: str) -> None:
    """
    Handle an error by logging it and potentially taking recovery actions.
    
    Args:
        error: The exception that occurred
        component: The component where the error occurred
        operation: The operation that failed
    """
    if isinstance(error, BotError):
        # Bot-specific errors are already logged
        return

    # Log unexpected errors
    logger.error(
        f"Unexpected error in {component}.{operation}: {str(error)}",
        exc_info=True
    )

    # Take recovery actions based on error type
    if isinstance(error, ConnectionError):
        # Handle network issues
        pass
    elif isinstance(error, TimeoutError):
        # Handle timeouts
        pass
    else:
        # Handle other unexpected errors
        pass

def retry_on_error(
    max_retries: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0
):
    """
    Decorator to retry operations on specific errors.
    
    Args:
        max_retries: Maximum number of retry attempts
        delay: Initial delay between retries in seconds
        backoff: Multiplier for delay between retries
    """
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            current_delay = delay
            last_error = None

            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except (APIError, ConnectionError, TimeoutError) as e:
                    last_error = e
                    if attempt < max_retries - 1:
                        logger.warning(
                            f"Attempt {attempt + 1}/{max_retries} failed: {str(e)}. "
                            f"Retrying in {current_delay} seconds..."
                        )
                        await asyncio.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        raise last_error

        def sync_wrapper(*args, **kwargs):
            current_delay = delay
            last_error = None

            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except (APIError, ConnectionError, TimeoutError) as e:
                    last_error = e
                    if attempt < max_retries - 1:
                        logger.warning(
                            f"Attempt {attempt + 1}/{max_retries} failed: {str(e)}. "
                            f"Retrying in {current_delay} seconds..."
                        )
                        time.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        raise last_error

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator 