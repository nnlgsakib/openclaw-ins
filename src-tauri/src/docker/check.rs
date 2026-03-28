use bollard::Docker;
use serde::{Deserialize, Serialize};

use crate::commands::silent::{run_with_timeout, silent_cmd, QUICK_TIMEOUT};

/// Docker installation and daemon status.
///
/// Shared between the Docker commands and the system check command.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerStatus {
    pub installed: bool,
    pub running: bool,
    pub version: Option<String>,
    pub api_version: Option<String>,
    pub platform: String,
}

/// Check Docker daemon health and return status.
///
/// Platform-specific detection:
/// - Linux: connects via Unix socket (bollard socket defaults)
/// - Windows: connects via HTTP (bollard HTTP defaults)
pub async fn check_docker_health_internal() -> Result<DockerStatus, Box<dyn std::error::Error>> {
    let platform = std::env::consts::OS;

    match platform {
        "linux" => check_docker_linux().await,
        "windows" => check_docker_windows().await,
        _ => Err(format!("Unsupported platform: {platform}").into()),
    }
}

async fn check_docker_linux() -> Result<DockerStatus, Box<dyn std::error::Error>> {
    let socket_exists = std::path::Path::new("/var/run/docker.sock").exists();

    if !socket_exists {
        return Ok(DockerStatus {
            installed: false,
            running: false,
            version: None,
            api_version: None,
            platform: "linux".to_string(),
        });
    }

    match Docker::connect_with_socket_defaults() {
        Ok(docker) => match docker.ping().await {
            Ok(_) => {
                let version_info = docker.version().await.ok();
                Ok(DockerStatus {
                    installed: true,
                    running: true,
                    version: version_info.as_ref().and_then(|v| v.version.clone()),
                    api_version: version_info.and_then(|v| v.api_version),
                    platform: "linux".to_string(),
                })
            }
            Err(_) => Ok(DockerStatus {
                installed: true,
                running: false,
                version: None,
                api_version: None,
                platform: "linux".to_string(),
            }),
        },
        Err(_) => Ok(DockerStatus {
            installed: true,
            running: false,
            version: None,
            api_version: None,
            platform: "linux".to_string(),
        }),
    }
}

async fn check_docker_windows() -> Result<DockerStatus, Box<dyn std::error::Error>> {
    // Try named pipe connection first (Docker Desktop default on Windows)
    if let Ok(docker) = Docker::connect_with_defaults() {
        if docker.ping().await.is_ok() {
            let version_info = docker.version().await.ok();
            return Ok(DockerStatus {
                installed: true,
                running: true,
                version: version_info.as_ref().and_then(|v| v.version.clone()),
                api_version: version_info.and_then(|v| v.api_version),
                platform: "windows".to_string(),
            });
        }
    }

    // HTTP failed — check if docker.exe exists in PATH
    let mut cmd = silent_cmd("where");
    cmd.arg("docker");
    let docker_in_path = run_with_timeout(&mut cmd, QUICK_TIMEOUT)
        .await
        .map(|o| o.status.success())
        .unwrap_or(false);

    if docker_in_path {
        Ok(DockerStatus {
            installed: true,
            running: false,
            version: None,
            api_version: None,
            platform: "windows".to_string(),
        })
    } else {
        Ok(DockerStatus {
            installed: false,
            running: false,
            version: None,
            api_version: None,
            platform: "windows".to_string(),
        })
    }
}
