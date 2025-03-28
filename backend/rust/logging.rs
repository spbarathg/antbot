use anyhow::Result;
use chrono::Local;
use log::{LevelFilter, Record};
use log4rs::{
    append::file::FileAppender,
    config::{Appender, Config, Root},
    encode::pattern::PatternEncoder,
};
use std::path::PathBuf;
use tracing::{info, error, Level};
use tracing_subscriber::FmtSubscriber;
use sentry::Client;

pub struct Logger {
    log_dir: PathBuf,
    error_tracker: Option<ErrorTracker>,
}

pub struct ErrorTracker {
    client: Client,
}

impl ErrorTracker {
    pub fn new(dsn: &str) -> Result<Self> {
        let client = Client::new(dsn);
        Ok(Self { client })
    }

    pub fn capture_error(&self, error: &anyhow::Error) {
        self.client.capture_error(error);
    }
}

impl Logger {
    pub fn new(log_dir: PathBuf, sentry_dsn: Option<&str>) -> Result<Self> {
        let error_tracker = sentry_dsn.map(|dsn| ErrorTracker::new(dsn)).transpose()?;
        Ok(Self { log_dir, error_tracker })
    }

    pub fn initialize(&self) -> Result<()> {
        // Create log directory if it doesn't exist
        std::fs::create_dir_all(&self.log_dir)?;

        // Configure log files
        let sniping_core_log = FileAppender::builder()
            .encoder(Box::new(PatternEncoder::new("{d} - {l} - {m}\n")))
            .build(self.log_dir.join("sniping_core.log"))?;

        let ant_colony_log = FileAppender::builder()
            .encoder(Box::new(PatternEncoder::new("{d} - {l} - {m}\n")))
            .build(self.log_dir.join("ant_colony.log"))?;

        let error_log = FileAppender::builder()
            .encoder(Box::new(PatternEncoder::new("{d} - {l} - {m}\n")))
            .build(self.log_dir.join("error.log"))?;

        // Configure loggers
        let config = Config::builder()
            .appender(Appender::builder().build("sniping_core", Box::new(sniping_core_log)))
            .appender(Appender::builder().build("ant_colony", Box::new(ant_colony_log)))
            .appender(Appender::builder().build("error", Box::new(error_log)))
            .build(Root::builder()
                .appender("sniping_core")
                .appender("ant_colony")
                .appender("error")
                .build(LevelFilter::Info))?;

        // Initialize logging
        log4rs::init_config(config)?;

        // Initialize structured logging
        let subscriber = FmtSubscriber::builder()
            .json()
            .with_current_span(true)
            .with_span_list(true)
            .with_file(true)
            .with_line_number(true)
            .with_target(false)
            .with_thread_ids(true)
            .with_thread_names(true)
            .with_ansi(false)
            .with_max_level(Level::INFO)
            .build();

        tracing::subscriber::set_global_default(subscriber)?;

        Ok(())
    }

    pub fn capture_error(&self, error: &anyhow::Error) {
        if let Some(tracker) = &self.error_tracker {
            tracker.capture_error(error);
        }
    }
}

// Custom log formatter for Python logs
pub fn format_python_log(record: &Record) -> String {
    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S");
    format!(
        "{} - {} - {} - {}\n",
        timestamp,
        record.level(),
        record.target(),
        record.args()
    )
}

// Log rotation configuration
pub struct LogRotation {
    max_size: u64,
    max_files: u32,
}

impl LogRotation {
    pub fn new(max_size: u64, max_files: u32) -> Self {
        Self {
            max_size,
            max_files,
        }
    }

    pub fn should_rotate(&self, file_size: u64) -> bool {
        file_size >= self.max_size
    }

    pub fn get_rotated_filename(&self, base_path: &PathBuf, index: u32) -> PathBuf {
        let extension = base_path.extension().unwrap_or_default();
        let stem = base_path.file_stem().unwrap_or_default();
        base_path.with_file_name(format!(
            "{}.{}.{}",
            stem.to_string_lossy(),
            index,
            extension.to_string_lossy()
        ))
    }
}

// Log categories for different components
#[derive(Debug, Clone, Copy)]
pub enum LogCategory {
    SnipingCore,
    AntColony,
    Error,
}

impl LogCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            LogCategory::SnipingCore => "sniping_core",
            LogCategory::AntColony => "ant_colony",
            LogCategory::Error => "error",
        }
    }
}

// Logging macros for convenience
#[macro_export]
macro_rules! log_sniping {
    ($($arg:tt)*) => {
        log::info!(target: "sniping_core", $($arg)*);
        tracing::info!($($arg)*);
    };
}

#[macro_export]
macro_rules! log_colony {
    ($($arg:tt)*) => {
        log::info!(target: "ant_colony", $($arg)*);
        tracing::info!($($arg)*);
    };
}

#[macro_export]
macro_rules! log_error {
    ($($arg:tt)*) => {
        log::error!(target: "error", $($arg)*);
        tracing::error!($($arg)*);
    };
}

// Logging trait for components
pub trait Loggable {
    fn log_category(&self) -> LogCategory;
    
    fn log(&self, level: log::Level, message: &str) {
        match level {
            log::Level::Error => log_error!("{}", message),
            _ => match self.log_category() {
                LogCategory::SnipingCore => log_sniping!("{}", message),
                LogCategory::AntColony => log_colony!("{}", message),
                LogCategory::Error => log_error!("{}", message),
            },
        }
    }
} 