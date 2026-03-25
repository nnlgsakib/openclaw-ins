use serde::Serialize;

/// Structured error type for all Tauri commands.
///
/// Every variant includes a `suggestion` field (ERR-01) so the frontend
/// can display plain-language guidance to the user.
#[derive(Debug, thiserror::Error, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum AppError {
    #[error("Docker is not available: {suggestion}")]
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

    #[error("Internal error: {message}. {suggestion}")]
    Internal { message: String, suggestion: String },
}
