import logging
import sys
from typing import Optional
from pathlib import Path
from datetime import datetime
from logging.handlers import RotatingFileHandler

def setup_logger(
    name: str,
    log_level: str = "INFO",
    log_file: Optional[str] = None,
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5
) -> logging.Logger:
    """
    Set up a logger with consistent formatting and handlers.
    
    Args:
        name: The name of the logger
        log_level: The logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional path to log file
        max_bytes: Maximum size of log file before rotation
        backup_count: Number of backup files to keep
        
    Returns:
        logging.Logger: Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, log_level.upper()))

    # Clear any existing handlers
    logger.handlers.clear()

    # Create formatters
    console_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    file_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s - %(pathname)s:%(lineno)d'
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    # File handler if log file is specified
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=max_bytes,
            backupCount=backup_count
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)

    return logger

def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the specified name.
    If the logger hasn't been configured, it will be set up with default settings.
    
    Args:
        name: The name of the logger
        
    Returns:
        logging.Logger: Logger instance
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger = setup_logger(name)
    return logger

class LogContext:
    """Context manager for adding context to log messages."""
    def __init__(self, logger: logging.Logger, **context):
        self.logger = logger
        self.context = context
        self.old_extra = getattr(logger, 'extra', {})

    def __enter__(self):
        self.logger.extra = {**self.old_extra, **self.context}
        return self.logger

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.logger.extra = self.old_extra

def log_execution_time(logger: logging.Logger, operation: str):
    """
    Decorator to log the execution time of a function.
    
    Args:
        logger: Logger instance
        operation: Name of the operation being timed
    """
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            start_time = datetime.now()
            try:
                result = await func(*args, **kwargs)
                execution_time = (datetime.now() - start_time).total_seconds()
                logger.info(f"{operation} completed in {execution_time:.2f} seconds")
                return result
            except Exception as e:
                execution_time = (datetime.now() - start_time).total_seconds()
                logger.error(f"{operation} failed after {execution_time:.2f} seconds: {e}")
                raise
        return async_wrapper

    def sync_decorator(func):
        def wrapper(*args, **kwargs):
            start_time = datetime.now()
            try:
                result = func(*args, **kwargs)
                execution_time = (datetime.now() - start_time).total_seconds()
                logger.info(f"{operation} completed in {execution_time:.2f} seconds")
                return result
            except Exception as e:
                execution_time = (datetime.now() - start_time).total_seconds()
                logger.error(f"{operation} failed after {execution_time:.2f} seconds: {e}")
                raise
        return wrapper

    return async_decorator if asyncio.iscoroutinefunction(func) else sync_decorator 