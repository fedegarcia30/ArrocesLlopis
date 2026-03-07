import logging
from logging.handlers import RotatingFileHandler
import os
import sys

def setup_logger(app_name="app"):
    """
    Sets up a global logger with console and rotating file handlers
    based on the LOG_LEVEL environment variable.
    """
    # Define log directory and ensure it exists
    log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
    os.makedirs(log_dir, exist_ok=True)
    
    log_file = os.path.join(log_dir, "arroces.log")
    
    # Determine level from env, default to INFO
    log_level_str = os.environ.get("LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_str, logging.INFO)

    logger = logging.getLogger(app_name)
    logger.setLevel(log_level)
    
    # Prevent duplicate handlers if called multiple times in a session
    if logger.handlers:
        return logger

    # Format: [2026-03-05 15:30:45,123] [INFO] [app] User XYZ did something
    formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s'
    )

    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)
    logger.addHandler(console_handler)

    # 5MB per file, max 3 backup files (logs, logs.1, logs.2...)
    file_handler = RotatingFileHandler(
        log_file, 
        maxBytes=5 * 1024 * 1024, 
        backupCount=3,
        encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(log_level)
    logger.addHandler(file_handler)

    logger.info(f"Logger initialized successfully at level {log_level_str}")
    return logger

# Create a default instance to be imported anywhere
logger = setup_logger()
