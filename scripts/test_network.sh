#!/bin/bash

# Exit on error
set -e

# Configuration
CONFIG_DIR="config"
LOG_DIR="logs"
TIMEOUT=10  # seconds

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    echo -e "${2}${1}${NC}"
}

# Function to test RPC endpoint
test_rpc_endpoint() {
    local name=$1
    local endpoint=$2
    local start_time=$(date +%s)
    
    print_message "Testing $name RPC endpoint..." "$YELLOW"
    
    # Try to get slot information
    response=$(curl -s -X POST -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}' \
        "$endpoint")
    
    # Check if response is valid JSON and contains slot number
    if echo "$response" | jq -e '.result' >/dev/null 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        if [ $duration -le $TIMEOUT ]; then
            print_message "✓ $name RPC is responsive (${duration}s)" "$GREEN"
            return 0
        else
            print_message "✗ $name RPC timeout after ${duration}s" "$RED"
            return 1
        fi
    else
        print_message "✗ $name RPC returned invalid response" "$RED"
        return 1
    fi
}

# Function to test transaction broadcast
test_transaction_broadcast() {
    local name=$1
    local endpoint=$2
    local start_time=$(date +%s)
    
    print_message "Testing $name transaction broadcast..." "$YELLOW"
    
    # Create a simple transaction
    local tx=$(solana-keygen new --no-bip39-passphrase --force --silent)
    
    # Try to broadcast transaction
    response=$(curl -s -X POST -H "Content-Type: application/json" \
        -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"sendTransaction\",\"params\":[\"$tx\",{\"encoding\":\"base64\",\"skipPreflight\":true}]}" \
        "$endpoint")
    
    # Check response
    if echo "$response" | jq -e '.result' >/dev/null 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        if [ $duration -le $TIMEOUT ]; then
            print_message "✓ $name transaction broadcast successful (${duration}s)" "$GREEN"
            return 0
        else
            print_message "✗ $name transaction broadcast timeout after ${duration}s" "$RED"
            return 1
        fi
    else
        print_message "✗ $name transaction broadcast failed" "$RED"
        return 1
    fi
}

# Load RPC endpoints from config
load_rpc_endpoints() {
    print_message "Loading RPC endpoints from config..." "$YELLOW"
    
    if [ ! -f "$CONFIG_DIR/rpc.toml" ]; then
        print_message "Error: RPC config file not found!" "$RED"
        exit 1
    fi
    
    # Parse RPC endpoints from config
    HELIUS_RPC=$(grep "helius" "$CONFIG_DIR/rpc.toml" | cut -d'=' -f2 | tr -d '" ')
    TRITON_RPC=$(grep "triton" "$CONFIG_DIR/rpc.toml" | cut -d'=' -f2 | tr -d '" ')
    JITO_RPC=$(grep "jito" "$CONFIG_DIR/rpc.toml" | cut -d'=' -f2 | tr -d '" ')
    
    if [ -z "$HELIUS_RPC" ] || [ -z "$TRITON_RPC" ] || [ -z "$JITO_RPC" ]; then
        print_message "Error: Missing RPC endpoints in config!" "$RED"
        exit 1
    fi
}

# Main execution
main() {
    print_message "Starting Solana network tests..." "$YELLOW"
    
    # Create log directory if it doesn't exist
    mkdir -p "$LOG_DIR"
    
    # Load RPC endpoints
    load_rpc_endpoints
    
    # Test Helius RPC
    test_rpc_endpoint "Helius" "$HELIUS_RPC"
    test_transaction_broadcast "Helius" "$HELIUS_RPC"
    
    # Test Triton RPC
    test_rpc_endpoint "Triton" "$TRITON_RPC"
    test_transaction_broadcast "Triton" "$TRITON_RPC"
    
    # Test Jito RPC
    test_rpc_endpoint "Jito" "$JITO_RPC"
    test_transaction_broadcast "Jito" "$JITO_RPC"
    
    print_message "Network tests completed!" "$GREEN"
}

# Run main function
main 