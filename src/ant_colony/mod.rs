mod drone;
mod queen;
mod princess;
mod worker;
mod sentry;

use anyhow::Result;
use config::Config;
use log::{info, error};
use std::sync::Arc;
use tokio::sync::RwLock;
use async_trait::async_trait;

// Re-export types for external use
pub use drone::Drone;
pub use queen::Queen;
pub use princess::Princess;
pub use worker::Worker;
pub use sentry::Sentry;

// Shared state for the Ant Colony
#[derive(Default)]
pub struct ColonyState {
    pub is_active: bool,
    pub total_capital: f64,
    pub active_trades: u32,
    pub risk_level: f64, // 0.0 to 1.0
}

#[async_trait]
pub trait AntComponent: Send + Sync {
    async fn init(&mut self) -> Result<()>;
    async fn run(&self) -> Result<()>;
    async fn shutdown(&self) -> Result<()>;
}

// Main Ant Colony struct that coordinates all components
pub struct AntColony {
    queen: Arc<RwLock<Queen>>,
    drones: Vec<Arc<RwLock<Drone>>>,
    princesses: Vec<Arc<RwLock<Princess>>>,
    workers: Vec<Arc<RwLock<Worker>>>,
    sentries: Vec<Arc<RwLock<Sentry>>>,
    state: Arc<RwLock<ColonyState>>,
}

impl AntColony {
    pub async fn new(config: &Config) -> Result<Self> {
        let state = Arc::new(RwLock::new(ColonyState::default()));
        let queen = Arc::new(RwLock::new(Queen::new(config, state.clone()).await?));
        
        Ok(Self {
            queen,
            drones: Vec::new(),
            princesses: Vec::new(),
            workers: Vec::new(),
            sentries: Vec::new(),
            state,
        })
    }

    pub async fn init(&mut self, config: &Config) -> Result<()> {
        info!("Initializing Ant Colony System...");

        // Initialize components
        self.init_drones(config).await?;
        self.init_princesses(config).await?;
        self.init_workers(config).await?;
        self.init_sentries(config).await?;

        // Start monitoring and coordination
        self.start_coordination().await?;

        info!("Ant Colony System initialized successfully");
        Ok(())
    }

    async fn init_drones(&mut self, config: &Config) -> Result<()> {
        let drone_count = config.get_int("ant_colony.drone_count")? as usize;
        for _ in 0..drone_count {
            let drone = Arc::new(RwLock::new(Drone::new(config, self.state.clone()).await?));
            self.drones.push(drone);
        }
        Ok(())
    }

    async fn init_princesses(&mut self, config: &Config) -> Result<()> {
        let princess_count = config.get_int("ant_colony.princess_count")? as usize;
        for _ in 0..princess_count {
            let princess = Arc::new(RwLock::new(Princess::new(config, self.state.clone()).await?));
            self.princesses.push(princess);
        }
        Ok(())
    }

    async fn init_workers(&mut self, config: &Config) -> Result<()> {
        let worker_count = config.get_int("ant_colony.worker_count")? as usize;
        for _ in 0..worker_count {
            let worker = Arc::new(RwLock::new(Worker::new(config, self.state.clone()).await?));
            self.workers.push(worker);
        }
        Ok(())
    }

    async fn init_sentries(&mut self, config: &Config) -> Result<()> {
        let sentry_count = config.get_int("ant_colony.sentry_count")? as usize;
        for _ in 0..sentry_count {
            let sentry = Arc::new(RwLock::new(Sentry::new(config, self.state.clone()).await?));
            self.sentries.push(sentry);
        }
        Ok(())
    }

    async fn start_coordination(&self) -> Result<()> {
        let mut state = self.state.write().await;
        state.is_active = true;

        // Start all components
        let queen = self.queen.read().await;
        queen.run().await?;

        for drone in &self.drones {
            let drone = drone.read().await;
            drone.run().await?;
        }

        for princess in &self.princesses {
            let princess = princess.read().await;
            princess.run().await?;
        }

        for worker in &self.workers {
            let worker = worker.read().await;
            worker.run().await?;
        }

        for sentry in &self.sentries {
            let sentry = sentry.read().await;
            sentry.run().await?;
        }

        Ok(())
    }

    pub async fn shutdown(&self) -> Result<()> {
        let mut state = self.state.write().await;
        state.is_active = false;

        // Shutdown all components
        let queen = self.queen.read().await;
        queen.shutdown().await?;

        for drone in &self.drones {
            let drone = drone.read().await;
            drone.shutdown().await?;
        }

        for princess in &self.princesses {
            let princess = princess.read().await;
            princess.shutdown().await?;
        }

        for worker in &self.workers {
            let worker = worker.read().await;
            worker.shutdown().await?;
        }

        for sentry in &self.sentries {
            let sentry = sentry.read().await;
            sentry.shutdown().await?;
        }

        Ok(())
    }
}

// Global instance for the Ant Colony
static mut ANT_COLONY: Option<Arc<RwLock<AntColony>>> = None;

pub async fn init(config: &Config) -> Result<()> {
    unsafe {
        if ANT_COLONY.is_none() {
            let colony = Arc::new(RwLock::new(AntColony::new(config).await?));
            ANT_COLONY = Some(colony);
        }
        
        if let Some(colony) = &ANT_COLONY {
            let mut colony = colony.write().await;
            colony.init(config).await?;
        }
    }
    Ok(())
}

pub async fn shutdown() -> Result<()> {
    unsafe {
        if let Some(colony) = &ANT_COLONY {
            let colony = colony.read().await;
            colony.shutdown().await?;
        }
    }
    Ok(())
} 