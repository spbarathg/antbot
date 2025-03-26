#!/bin/bash

# Exit on error
set -e

# Configuration
CONFIG_DIR="config"
LOG_DIR="logs"
PYTHON_VENV="venv"
RUST_BINARY="target/release/antbot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    echo -e "${2}${1}${NC}"
}

# Check if required files and directories exist
check_requirements() {
    print_message "Checking requirements..." "$YELLOW"
    
    # Check config directory
    if [ ! -d "$CONFIG_DIR" ]; then
        print_message "Error: Config directory not found!" "$RED"
        exit 1
    fi
    
    # Check required config files
    for file in "settings.toml" "rpc.toml" "api_keys.toml"; do
        if [ ! -f "$CONFIG_DIR/$file" ]; then
            print_message "Error: Required config file $file not found!" "$RED"
            exit 1
        fi
    done
    
    # Check Python virtual environment
    if [ ! -d "$PYTHON_VENV" ]; then
        print_message "Error: Python virtual environment not found!" "$RED"
        exit 1
    fi
    
    # Check Rust binary
    if [ ! -f "$RUST_BINARY" ]; then
        print_message "Error: Rust binary not found! Please build the project first." "$RED"
        exit 1
    fi
}

# Create log directory if it doesn't exist
setup_logs() {
    print_message "Setting up log directory..." "$YELLOW"
    
    mkdir -p "$LOG_DIR"
    chmod 755 "$LOG_DIR"
}

# Activate Python virtual environment
activate_venv() {
    print_message "Activating Python virtual environment..." "$YELLOW"
    
    source "$PYTHON_VENV/bin/activate"
}

# Start Python components
start_python_components() {
    print_message "Starting Python components..." "$YELLOW"
    
    # Start AI Oracle
    python python/ai_oracle.py > "$LOG_DIR/ai_oracle.log" 2>&1 &
    AI_ORACLE_PID=$!
    
    # Start Liquidity Monitor
    python python/liquidity_monitor.py > "$LOG_DIR/liquidity_monitor.log" 2>&1 &
    LIQUIDITY_MONITOR_PID=$!
    
    # Start Transaction Pipeline
    python python/transaction_pipeline.py > "$LOG_DIR/transaction_pipeline.log" 2>&1 &
    TRANSACTION_PIPELINE_PID=$!
    
    # Save PIDs for cleanup
    echo "$AI_ORACLE_PID" > "$LOG_DIR/python_pids.txt"
    echo "$LIQUIDITY_MONITOR_PID" >> "$LOG_DIR/python_pids.txt"
    echo "$TRANSACTION_PIPELINE_PID" >> "$LOG_DIR/python_pids.txt"
}

# Start Rust backend
start_rust_backend() {
    print_message "Starting Rust backend..." "$YELLOW"
    
    "$RUST_BINARY" > "$LOG_DIR/rust_backend.log" 2>&1 &
    RUST_PID=$!
    echo "$RUST_PID" > "$LOG_DIR/rust_pid.txt"
}

# Function to handle cleanup on exit
cleanup() {
    print_message "Cleaning up..." "$YELLOW"
    
    # Kill Python processes
    if [ -f "$LOG_DIR/python_pids.txt" ]; then
        while read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid"
                wait "$pid" 2>/dev/null
            fi
        done < "$LOG_DIR/python_pids.txt"
    fi
    
    # Kill Rust process
    if [ -f "$LOG_DIR/rust_pid.txt" ]; then
        RUST_PID=$(cat "$LOG_DIR/rust_pid.txt")
        if kill -0 "$RUST_PID" 2>/dev/null; then
            kill "$RUST_PID"
            wait "$RUST_PID" 2>/dev/null
        fi
    fi
    
    # Deactivate virtual environment
    deactivate 2>/dev/null || true
    
    print_message "Cleanup completed" "$GREEN"
}

# Set up trap for cleanup
trap cleanup EXIT INT TERM

# Main execution
main() {
    print_message "Starting AntBot..." "$YELLOW"
    
    # Check requirements
    check_requirements
    
    # Setup logs
    setup_logs
    
    # Activate virtual environment
    activate_venv
    
    # Start components
    start_python_components
    start_rust_backend
    
    print_message "AntBot started successfully!" "$GREEN"
    print_message "Logs are available in the $LOG_DIR directory" "$YELLOW"
    
    # Wait for user interrupt
    wait
}

# Run main function
main 