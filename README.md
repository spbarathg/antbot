# AntBot Project Structure

## Overview
AntBot is a sophisticated trading bot that combines Python, Rust, and React components to provide advanced trading capabilities. The system uses an Ant Colony optimization approach for efficient trading and risk management.

## Project Structure

```
antbot/
├── backend/
│   ├── python/           # Python backend components
│   │   ├── ai_oracle.py
│   │   ├── liquidity_monitor.py
│   │   ├── transaction_pipeline.py
│   │   ├── coin_analyzer.py
│   │   ├── security.py
│   │   ├── cache.py
│   │   ├── database.py
│   │   ├── error_handling.py
│   │   ├── logger.py
│   │   ├── api_client.py
│   │   └── config_manager.py
│   └── rust/            # Rust backend components
│       ├── ant_colony/  # Ant Colony optimization system
│       │   ├── queen.rs
│       │   ├── princess.rs
│       │   ├── worker.rs
│       │   ├── drone.rs
│       │   ├── sentry.rs
│       │   ├── rug_detector.rs
│       │   ├── profit_manager.rs
│       │   ├── capital_manager.rs
│       │   └── transaction_handler.rs
│       ├── api/         # API endpoints and WebSocket server
│       ├── rpc/         # RPC client management
│       ├── common/      # Shared data structures
│       ├── config/      # Configuration management
│       └── logging.rs   # Logging system
├── frontend/           # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── index.js
│   ├── public/
│   ├── package.json
│   └── tailwind.config.js
├── config/            # Global configuration files
├── scripts/          # Utility scripts
├── tests/           # Test files
├── logs/            # Application logs
├── .env             # Environment variables
├── requirements.txt # Python dependencies
└── Cargo.toml       # Rust dependencies
```

## Component Descriptions

### Backend Components

#### Python Backend
- `ai_oracle.py`: AI-powered price prediction and analysis
- `liquidity_monitor.py`: Real-time liquidity monitoring
- `transaction_pipeline.py`: Transaction processing and management
- `coin_analyzer.py`: Coin analysis and metrics calculation
- `security.py`: Security and authentication
- `cache.py`: Caching system
- `database.py`: Database operations
- `error_handling.py`: Error handling and logging
- `logger.py`: Logging system
- `api_client.py`: API client for external services
- `config_manager.py`: Configuration management

#### Rust Backend
- `ant_colony/`: Ant Colony optimization system
  - `queen.rs`: Central coordinator managing colony state
  - `princess.rs`: Handles individual trading operations
  - `worker.rs`: Manages profit collection and reinvestment
  - `drone.rs`: Monitors and allocates capital
  - `sentry.rs`: Monitors for risks and security threats
  - `rug_detector.rs`: Detects potential rug pulls
  - `profit_manager.rs`: Manages profit-taking strategies
  - `capital_manager.rs`: Handles capital allocation
  - `transaction_handler.rs`: Manages transaction execution
- `api/`: WebSocket server and API endpoints
- `rpc/`: RPC client management for multiple providers
- `common/`: Shared data structures and message handling
- `config/`: Configuration management
- `logging.rs`: Structured logging system

### Frontend Components
- React-based UI with TypeScript
- Tailwind CSS for styling
- Context-based state management
- Component-based architecture
- Real-time updates via WebSocket

## Development Guidelines

1. **Code Organization**
   - Keep related functionality together
   - Use clear, descriptive file names
   - Follow language-specific conventions
   - Implement proper error handling

2. **Dependencies**
   - Python dependencies in `requirements.txt`
   - Rust dependencies in `Cargo.toml`
   - Frontend dependencies in `package.json`

3. **Configuration**
   - Use `.env` for environment variables
   - Keep configuration files in the `config/` directory
   - Follow the configuration hierarchy
   - Validate configuration values

4. **Testing**
   - Write unit tests for all components
   - Place tests in the `tests/` directory
   - Follow test naming conventions
   - Include integration tests

5. **Logging**
   - Use the centralized logging system
   - Log files are stored in the `logs/` directory
   - Follow logging best practices
   - Include structured logging

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   # Python dependencies
   pip install -r requirements.txt
   
   # Rust dependencies
   cargo build
   
   # Frontend dependencies
   cd frontend
   npm install
   ```
3. Set up environment variables in `.env`
4. Run the application:
   ```bash
   # Start backend
   python backend/python/main.py
   
   # Start frontend
   cd frontend
   npm start
   ```

## Ant Colony System

The system uses an Ant Colony optimization approach with specialized components:

1. **Queen**
   - Manages overall colony state
   - Controls capital allocation
   - Monitors risk levels
   - Coordinates all components

2. **Princess**
   - Executes individual trades
   - Manages position sizing
   - Tracks trade performance
   - Implements exit strategies

3. **Worker**
   - Collects and distributes profits
   - Manages reinvestment
   - Handles vault operations
   - Monitors collection timeouts

4. **Drone**
   - Monitors market conditions
   - Allocates capital dynamically
   - Adjusts position sizes
   - Manages risk exposure

5. **Sentry**
   - Monitors for security threats
   - Detects market anomalies
   - Manages risk alerts
   - Implements emergency protocols

6. **RugDetector**
   - Analyzes contract risks
   - Monitors liquidity changes
   - Tracks holder behavior
   - Detects potential rug pulls

7. **ProfitManager**
   - Implements profit-taking strategies
   - Manages position scaling
   - Optimizes gas costs
   - Tracks performance metrics

8. **CapitalManager**
   - Manages capital allocation
   - Handles position sizing
   - Implements reserve requirements
   - Monitors capital efficiency

9. **TransactionHandler**
   - Manages transaction execution
   - Optimizes gas costs
   - Handles RPC providers
   - Implements retry logic

## Risk Management

The system implements multiple layers of risk management:

1. **Position Sizing**
   - Fixed budget per Ant Princess
   - Dynamic scaling based on market conditions
   - Automatic reduction during bear markets
   - Reserve capital requirements

2. **Exit Strategies**
   - Multi-tier profit-taking
   - Sentiment-based exits
   - Liquidity monitoring
   - Emergency exit protocols

3. **Network Protection**
   - Multi-RPC architecture
   - Automatic trading freeze
   - Transaction optimization
   - Gas cost management

4. **Security Measures**
   - Contract risk analysis
   - Rug pull detection
   - Liquidity monitoring
   - Sentiment analysis

## Performance Monitoring

The system tracks various performance metrics:

- Success rate per trading cycle
- Transaction execution times
- RPC usage and costs
- Profit distribution
- Risk event detection
- Capital efficiency
- Gas optimization
- System health

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This bot is for educational purposes only. Cryptocurrency trading carries significant risks, and past performance does not guarantee future results. Always trade responsibly and never invest more than you can afford to lose. 