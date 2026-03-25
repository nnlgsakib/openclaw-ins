use serde::{Deserialize, Serialize};

/// Docker installation and daemon status.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerStatus {
    pub installed: bool,
    pub running: bool,
    pub version: Option<String>,
    pub api_version: Option<String>,
    pub platform: String,     // "windows" or "linux"
    pub docker_desktop: bool, // true if Docker Desktop detected (Windows)
    pub wsl_backend: bool,    // true if WSL2 backend active (Windows)
}

/// Extended Docker information with container/image counts.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerInfo {
    pub status: DockerStatus,
    pub containers_running: i64,
    pub images_count: i64,
    pub server_version: Option<String>,
    pub os_type: Option<String>,
}
