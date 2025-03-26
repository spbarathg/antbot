# AntBot

A modern trading bot with a beautiful React frontend and powerful Rust/Python backend.

## Prerequisites

Before running the setup script, make sure you have the following installed:

- Python 3.8 or higher
- Rust (latest stable version)
- Node.js 16 or higher
- PostgreSQL (for the database)

## Quick Start

### Windows

1. Open PowerShell as Administrator
2. Navigate to the project directory
3. Run the setup script:
```powershell
.\setup.ps1
```

### Unix-based Systems (Linux/macOS)

1. Open Terminal
2. Navigate to the project directory
3. Make the setup script executable:
```bash
chmod +x setup.sh
```
4. Run the setup script:
```bash
./setup.sh
```

## What the Setup Script Does

The setup script will:

1. Check for required dependencies (Python, Rust, Node.js)
2. Create a Python virtual environment
3. Install Python dependencies
4. Build Rust components
5. Install frontend dependencies
6. Create a default `.env` file (if it doesn't exist)
7. Start the backend server
8. Start the frontend development server
9. Open the website in your default browser

## Manual Setup

If you prefer to set up the project manually:

1. Set up the Python backend:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

2. Build the Rust components:
```bash
cd rust
cargo build --release
cd ..
```

3. Set up the frontend:
```bash
cd frontend
npm install
npm start
```

4. Create and configure your `.env` file with the necessary settings.

## Development

- Frontend runs on: http://localhost:3000
- Backend API runs on: http://localhost:8080

## Project Structure

```
antbot/
├── frontend/          # React frontend
├── backend/          # Python backend
├── rust/            # Rust components
├── setup.ps1        # Windows setup script
├── setup.sh         # Unix setup script
└── requirements.txt # Python dependencies
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 