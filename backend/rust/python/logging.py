import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

class AntBotLogger:
    def __init__(self, log_dir: Path):
        self.log_dir = log_dir
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Configure loggers
        self._setup_loggers()
        
        # Log rotation settings
        self.max_size = 10 * 1024 * 1024  # 10MB
        self.max_files = 5
        
    def _setup_loggers(self):
        # Sniping Core logger
        self.sniping_logger = logging.getLogger("sniping_core")
        self.sniping_logger.setLevel(logging.INFO)
        self._setup_file_handler(
            self.sniping_logger,
            self.log_dir / "sniping_core.log",
            "SnipingCore"
        )
        
        # Ant Colony logger
        self.colony_logger = logging.getLogger("ant_colony")
        self.colony_logger.setLevel(logging.INFO)
        self._setup_file_handler(
            self.colony_logger,
            self.log_dir / "ant_colony.log",
            "AntColony"
        )
        
        # Error logger
        self.error_logger = logging.getLogger("error")
        self.error_logger.setLevel(logging.ERROR)
        self._setup_file_handler(
            self.error_logger,
            self.log_dir / "error.log",
            "Error"
        )
        
    def _setup_file_handler(
        self,
        logger: logging.Logger,
        log_file: Path,
        component: str
    ):
        # Check if rotation is needed
        if log_file.exists():
            self._rotate_log_file(log_file)
            
        # Create file handler
        handler = logging.FileHandler(log_file)
        handler.setLevel(logging.INFO)
        
        # Create formatter
        formatter = logging.Formatter(
            "%(asctime)s - %(levelname)s - %(name)s - %(message)s"
        )
        handler.setFormatter(formatter)
        
        # Add handler to logger
        logger.addHandler(handler)
        
    def _rotate_log_file(self, log_file: Path):
        """Rotate log files when they exceed max_size"""
        if not log_file.exists():
            return
            
        file_size = log_file.stat().st_size
        if file_size >= self.max_size:
            # Remove oldest rotated file if it exists
            oldest_file = log_file.with_suffix(f".{self.max_files}.log")
            if oldest_file.exists():
                oldest_file.unlink()
                
            # Rotate existing files
            for i in range(self.max_files - 1, 0, -1):
                old_file = log_file.with_suffix(f".{i}.log")
                new_file = log_file.with_suffix(f".{i + 1}.log")
                if old_file.exists():
                    old_file.rename(new_file)
                    
            # Rename current log file
            log_file.rename(log_file.with_suffix(".1.log"))
            
    def log_sniping(self, message: str, level: str = "INFO"):
        """Log a message to the sniping core log"""
        getattr(self.sniping_logger, level.lower())(message)
        
    def log_colony(self, message: str, level: str = "INFO"):
        """Log a message to the ant colony log"""
        getattr(self.colony_logger, level.lower())(message)
        
    def log_error(self, message: str):
        """Log an error message"""
        self.error_logger.error(message)
        
    def log_exception(self, message: str, exc_info: Optional[Exception] = None):
        """Log an exception with full traceback"""
        self.error_logger.exception(message, exc_info=exc_info)
        
class Loggable:
    """Base class for components that need logging"""
    def __init__(self, logger: AntBotLogger):
        self.logger = logger
        
    def log(self, message: str, level: str = "INFO"):
        """Log a message using the appropriate logger"""
        if hasattr(self, "log_category"):
            category = self.log_category
            if category == "sniping_core":
                self.logger.log_sniping(message, level)
            elif category == "ant_colony":
                self.logger.log_colony(message, level)
            elif category == "error":
                self.logger.log_error(message)
        else:
            # Default to error logging if no category specified
            self.logger.log_error(message)
            
    def log_error(self, message: str):
        """Log an error message"""
        self.log(message, "ERROR")
        
    def log_exception(self, message: str, exc_info: Optional[Exception] = None):
        """Log an exception with full traceback"""
        self.logger.log_exception(message, exc_info) 