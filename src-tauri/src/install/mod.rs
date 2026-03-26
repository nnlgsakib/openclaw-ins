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
