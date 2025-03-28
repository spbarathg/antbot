# AntBot Project Reorganization Script

# Create necessary directories if they don't exist
$directories = @(
    "backend/python",
    "backend/rust",
    "frontend/src",
    "frontend/public",
    "config",
    "scripts",
    "tests",
    "logs"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force
    }
}

# Move Python files
if (Test-Path "python") {
    Move-Item -Path "python/*" -Destination "backend/python/" -Force
}

# Move Rust files
if (Test-Path "src") {
    Move-Item -Path "src/*" -Destination "backend/rust/" -Force
}

# Move frontend files
if (Test-Path "frontend") {
    # Move configuration files to frontend root
    $configFiles = @(
        "package.json",
        "package-lock.json",
        "tailwind.config.js",
        "postcss.config.js"
    )
    
    foreach ($file in $configFiles) {
        if (Test-Path "frontend/src/$file") {
            Move-Item -Path "frontend/src/$file" -Destination "frontend/" -Force
        }
    }
}

# Move configuration files
if (Test-Path "src/config") {
    Move-Item -Path "src/config/*" -Destination "config/" -Force
}

# Clean up empty directories
Get-ChildItem -Path . -Directory -Recurse | Where-Object { $_.GetFiles().Count -eq 0 -and $_.GetDirectories().Count -eq 0 } | Remove-Item -Force

Write-Host "Project reorganization completed successfully!" 