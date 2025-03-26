#!/bin/bash

# Exit on error
set -e

# Configuration
VAULT_DIR="vaults"
SHARES_DIR="shares"
MIN_SHARES=3
TOTAL_SHARES=5
SHARE_PREFIX="vault_share"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    echo -e "${2}${1}${NC}"
}

# Check if required tools are installed
check_dependencies() {
    print_message "Checking dependencies..." "$YELLOW"
    
    if ! command -v ssss-split &> /dev/null; then
        print_message "Error: ssss-split is not installed. Please install ssss package." "$RED"
        exit 1
    fi
    
    if ! command -v ssss-combine &> /dev/null; then
        print_message "Error: ssss-combine is not installed. Please install ssss package." "$RED"
        exit 1
    fi
}

# Create necessary directories
create_directories() {
    print_message "Creating necessary directories..." "$YELLOW"
    
    mkdir -p "$VAULT_DIR"
    mkdir -p "$SHARES_DIR"
    
    # Set proper permissions
    chmod 700 "$VAULT_DIR"
    chmod 700 "$SHARES_DIR"
}

# Generate a new vault key
generate_vault_key() {
    print_message "Generating new vault key..." "$YELLOW"
    
    # Generate a random 32-byte key
    openssl rand -hex 32 > "$VAULT_DIR/vault_key"
    chmod 600 "$VAULT_DIR/vault_key"
}

# Split the vault key using Shamir Secret Sharing
split_vault_key() {
    print_message "Splitting vault key into shares..." "$YELLOW"
    
    # Split the key into shares
    ssss-split -t "$MIN_SHARES" -n "$TOTAL_SHARES" -w "$SHARE_PREFIX" < "$VAULT_DIR/vault_key"
    
    # Move shares to shares directory
    mv "$SHARE_PREFIX"* "$SHARES_DIR/"
    
    # Set proper permissions
    chmod 600 "$SHARES_DIR"/*
}

# Verify the shares can reconstruct the key
verify_shares() {
    print_message "Verifying shares..." "$YELLOW"
    
    # Combine shares to verify
    ssss-combine -t "$MIN_SHARES" -w "$SHARE_PREFIX" < "$SHARES_DIR/$SHARE_PREFIX"* > /tmp/verify_key
    
    # Compare with original key
    if cmp -s "$VAULT_DIR/vault_key" /tmp/verify_key; then
        print_message "Share verification successful!" "$GREEN"
        rm /tmp/verify_key
    else
        print_message "Error: Share verification failed!" "$RED"
        rm /tmp/verify_key
        exit 1
    fi
}

# Backup shares securely
backup_shares() {
    print_message "Creating secure backups of shares..." "$YELLOW"
    
    # Create backup directory with timestamp
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Copy shares to backup location
    cp "$SHARES_DIR/$SHARE_PREFIX"* "$BACKUP_DIR/"
    
    # Set proper permissions
    chmod 600 "$BACKUP_DIR"/*
    
    print_message "Backups created in: $BACKUP_DIR" "$GREEN"
}

# Main execution
main() {
    print_message "Starting vault initialization..." "$YELLOW"
    
    # Check dependencies
    check_dependencies
    
    # Create directories
    create_directories
    
    # Generate and split key
    generate_vault_key
    split_vault_key
    
    # Verify shares
    verify_shares
    
    # Create backups
    backup_shares
    
    print_message "Vault initialization completed successfully!" "$GREEN"
    print_message "IMPORTANT: Store the shares securely in different locations!" "$YELLOW"
    print_message "You need at least $MIN_SHARES shares to reconstruct the vault key." "$YELLOW"
}

# Run main function
main 