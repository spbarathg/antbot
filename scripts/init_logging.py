#!/usr/bin/env python3
import os
import sys
from pathlib import Path
import logging
from antbot.python.logging import AntBotLogger

def init_logging():
    """Initialize logging for both Rust and Python components"""
    # Get the project root directory
    project_root = Path(__file__).parent.parent
    
    # Create logs directory
    log_dir = project_root / "logs"
    log_dir.mkdir(exist_ok=True)
    
    # Initialize Python logging
    logger = AntBotLogger(log_dir)
    
    # Create empty log files if they don't exist
    log_files = [
        "sniping_core.log",
        "ant_colony.log",
        "error.log"
    ]
    
    for log_file in log_files:
        file_path = log_dir / log_file
        if not file_path.exists():
            file_path.touch()
            
    # Set up Python logging environment variables
    os.environ["ANTBOT_LOG_DIR"] = str(log_dir)
    
    # Log initialization message
    logger.log_sniping("Logging system initialized")
    logger.log_colony("Logging system initialized")
    logger.log_error("Logging system initialized")
    
    return log_dir

def main():
    """Main entry point for logging initialization"""
    try:
        log_dir = init_logging()
        print(f"Logging system initialized successfully. Log directory: {log_dir}")
        return 0
    except Exception as e:
        print(f"Failed to initialize logging system: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main()) 