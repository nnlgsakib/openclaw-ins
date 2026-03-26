use serde::Serialize;

/// Structured error type for all Tauri commands.
///
/// Every variant includes a `suggestion` field (ERR-01) so the frontend
/// can display plain-language guidance to the user.
#[derive(Debug, thiserror::Error, Serialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub enum AppError {
    #[error("Docker is not installed: {suggestion}")]
    DockerNotInstalled { suggestion: String },

    #[error("Docker daemon is not running: {suggestion}")]
    DockerDaemonNotRunning { suggestion: String },

    #[error("Docker Desktop is not running: {suggestion}")]
    DockerDesktopNotRunning { suggestion: String },

    #[error("WSL2 Docker backend is not ready: {suggestion}")]
    WslBackendNotReady { suggestion: String },

    #[error("Docker is unavailable: {suggestion}")]
    DockerUnavailable { suggestion: String },

    #[error("Installation failed: {reason}. {suggestion}")]
    InstallationFailed { reason: String, suggestion: String },

    #[error("Configuration error: {message}. {suggestion}")]
    ConfigError { message: String, suggestion: String },

    #[error("Unsupported platform: {platform}. {suggestion}")]
    UnsupportedPlatform {
        platform: String,
        suggestion: String,
    },

    #[error("Installation verification failed: {reason}. {suggestion}")]
    VerificationFailed { reason: String, suggestion: String },

    #[error("Node.js version too old: {current}. Minimum required: {minimum}. {suggestion}")]
    NodeVersionTooOld {
        current: String,
        minimum: String,
        suggestion: String,
    },

    #[error("Insufficient disk space: {free_gb}GB free, need {required_gb}GB. {suggestion}")]
    InsufficientDiskSpace {
        free_gb: u64,
        required_gb: u64,
        suggestion: String,
    },

    #[error("Port {port} is already in use. {suggestion}")]
    PortInUse { port: u16, suggestion: String },

    #[error("Internal error: {message}. {suggestion}")]
    Internal { message: String, suggestion: String },
}
