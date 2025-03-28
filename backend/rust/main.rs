mod ant_colony;
mod sniping_core;

use anyhow::{Result, Context};
use clap::Parser;
use log::{info, error, LevelFilter};
use std::path::PathBuf;
use tokio::signal;
use config::Config;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Path to the configuration directory
    #[arg(short, long, default_value = "./config")]
    config_dir: PathBuf,

    /// Log level (debug, info, warn, error)
    #[arg(short, long, default_value = "info")]
    log_level: String,

    /// Network to connect to (mainnet, devnet, testnet)
    #[arg(short, long, default_value = "mainnet")]
    network: String,

    /// Path to Python virtual environment
    #[arg(short, long)]
    venv_path: Option<PathBuf>,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Parse command line arguments
    let args = Args::parse();

    // Initialize logging with specified level
    let log_level = args.log_level.parse::<LevelFilter>()
        .context("Failed to parse log level")?;
    env_logger::Builder::new()
        .filter_level(log_level)
        .init();

    info!("Starting AntBot...");
    info!("Network: {}", args.network);

    // Load configurations
    let config = load_configs(&args.config_dir)?;

    // Initialize Python environment if specified
    if let Some(venv_path) = args.venv_path {
        init_python_env(&venv_path)?;
    }

    // Initialize components
    info!("Initializing Ant Colony System...");
    if let Err(e) = ant_colony::init(&config).await {
        error!("Failed to initialize Ant Colony: {}", e);
        return Err(e.into());
    }

    info!("Initializing Sniping Core...");
    if let Err(e) = sniping_core::init(&config).await {
        error!("Failed to initialize Sniping Core: {}", e);
        return Err(e.into());
    }

    info!("AntBot initialized successfully");

    // Handle shutdown signals
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to listen for ctrl+c");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => info!("Received ctrl+c, shutting down..."),
        _ = terminate => info!("Received SIGTERM, shutting down..."),
    }

    // Graceful shutdown
    info!("Initiating graceful shutdown...");
    ant_colony::shutdown().await?;
    sniping_core::shutdown().await?;
    info!("AntBot shutdown complete");

    Ok(())
}

fn load_configs(config_dir: &PathBuf) -> Result<Config> {
    let settings = Config::builder()
        .add_source(config::File::from(config_dir.join("settings.toml")))
        .add_source(config::File::from(config_dir.join("rpc.toml")))
        .add_source(config::File::from(config_dir.join("api_keys.toml")))
        .build()
        .context("Failed to load configuration files")?;

    Ok(settings)
}

fn init_python_env(venv_path: &PathBuf) -> Result<()> {
    // Verify Python virtual environment exists
    if !venv_path.exists() {
        return Err(anyhow::anyhow!("Python virtual environment not found at: {:?}", venv_path));
    }

    // Set up Python environment variables
    std::env::set_var("VIRTUAL_ENV", venv_path);
    let python_path = venv_path.join("Scripts").join("python");
    std::env::set_var("PYTHON_PATH", python_path);

    info!("Python environment initialized at: {:?}", venv_path);
    Ok(())
} 