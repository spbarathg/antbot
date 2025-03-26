# Setup script for AntBot
Write-Host "Starting AntBot setup..." -ForegroundColor Cyan

# Check if Python is installed
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Python is not installed. Please install Python 3.8 or higher." -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js is not installed. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if PostgreSQL is installed and running
try {
    $pg = Get-Service postgresql* -ErrorAction SilentlyContinue
    if (-not $pg) {
        Write-Host "Warning: PostgreSQL service not found. Make sure PostgreSQL is installed and running." -ForegroundColor Yellow
    } elseif ($pg.Status -ne 'Running') {
        Write-Host "Warning: PostgreSQL service is not running. Please start it before running the backend." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Warning: Could not check PostgreSQL status." -ForegroundColor Yellow
}

# Create virtual environment for Python backend
Write-Host "Setting up Python virtual environment..." -ForegroundColor Yellow
if (Test-Path venv) {
    Write-Host "Virtual environment already exists, skipping creation..." -ForegroundColor Yellow
} else {
    python -m venv venv
}
.\venv\Scripts\Activate.ps1

# Install Python dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Check if Rust is installed and build if available
if (Get-Command rustc -ErrorAction SilentlyContinue) {
    Write-Host "Building Rust components..." -ForegroundColor Yellow
    cargo build --release
} else {
    Write-Host "Note: Rust is not installed. Skipping Rust component build." -ForegroundColor Yellow
}

# Setup frontend
Write-Host "Setting up frontend..." -ForegroundColor Yellow
if (-not (Test-Path frontend)) {
    Write-Host "Error: Frontend directory not found!" -ForegroundColor Red
    exit 1
}

cd frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install frontend dependencies!" -ForegroundColor Red
    exit 1
}
cd ..

# Create .env file if it doesn't exist
if (-not (Test-Path .env)) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    @"
# API Configuration
API_HOST=localhost
API_PORT=8080

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=antbot
DB_USER=postgres
DB_PASSWORD=your_password_here

# Bot Configuration
BOT_API_KEY=your_api_key_here
"@ | Out-File -FilePath .env -Encoding UTF8
    Write-Host "Warning: Please update the .env file with your configuration." -ForegroundColor Yellow
}

# Check if Python backend exists
if (-not (Test-Path python/main.py)) {
    Write-Host "Error: Python backend (python/main.py) not found!" -ForegroundColor Red
    exit 1
}

# Start the application
Write-Host "Starting AntBot..." -ForegroundColor Green

# Start backend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $PWD; .\venv\Scripts\Activate.ps1; python python/main.py"

# Start frontend in development mode
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $PWD\frontend; npm start"

# Wait a moment for the servers to start
Start-Sleep -Seconds 5

# Open the website in the default browser
Start-Process "http://localhost:3000"

Write-Host "Setup complete! The application should now be running." -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:8080" -ForegroundColor Cyan
Write-Host "Note: Check the terminal windows for any error messages." -ForegroundColor Yellow 