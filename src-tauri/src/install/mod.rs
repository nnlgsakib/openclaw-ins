pub mod docker_install;
pub mod native_install;
pub mod progress;
pub mod verify;

use serde::{Deserialize, Serialize};

/// Result returned after a successful installation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult {
    pub method: String,
    pub version: Option<String>,
    pub gateway_url: String,
    pub gateway_token: Option<String>,
}

/// Sandbox configuration passed from the wizard during installation.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SandboxInstallConfig {
    /// Sandbox mode: "off", "non-main", "all"
    pub mode: String,
    /// Backend: "docker", "ssh", "openshell"
    pub backend: String,
    /// Docker image name (default: "openclaw-sandbox:bookworm-slim")
    pub docker_image: Option<String>,
    /// Docker network mode: "none", "bridge", "host"
    pub docker_network: Option<String>,
    /// Docker bind mounts
    pub docker_binds: Option<Vec<String>>,
}
