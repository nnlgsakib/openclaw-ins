use bollard::Docker;
use serde::{Deserialize, Serialize};

use super::silent::{run_with_timeout, silent_cmd, QUICK_TIMEOUT};
use crate::error::AppError;

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

/// Check Docker daemon health and return status.
///
/// Platform-specific detection:
/// - Linux: checks /var/run/docker.sock, connects via socket
/// - Windows: tries HTTP connection, checks Docker Desktop and WSL2 backend
#[tauri::command]
pub async fn check_docker_health() -> Result<DockerStatus, AppError> {
    let platform = std::env::consts::OS;

    match platform {
        "linux" => check_docker_linux().await,
        "windows" => check_docker_windows().await,
        _ => Err(AppError::UnsupportedPlatform {
            platform: platform.to_string(),
            suggestion: "Docker integration is currently supported on Linux and Windows only."
                .to_string(),
        }),
    }
}

/// Get extended Docker information including container and image counts.
#[tauri::command]
pub async fn get_docker_info() -> Result<DockerInfo, AppError> {
    let status = check_docker_health().await?;

    if !status.running {
        return Ok(DockerInfo {
            status,
            containers_running: 0,
            images_count: 0,
            server_version: None,
            os_type: None,
        });
    }

    let docker = connect_docker().await?;
    let info = docker
        .info()
        .await
        .map_err(|e| AppError::DockerUnavailable {
            suggestion: format!(
                "Docker daemon reported an error: {}. Try restarting Docker Desktop (Windows) or running: sudo systemctl restart docker (Linux)",
                e
            ),
        })?;

    Ok(DockerInfo {
        status,
        containers_running: info.containers_running.unwrap_or(0),
        images_count: info.images.unwrap_or(0),
        server_version: info.server_version,
        os_type: info.os_type,
    })
}

/// Alias for check_docker_health — semantic entry point for frontend.
#[tauri::command]
pub async fn detect_docker() -> Result<DockerStatus, AppError> {
    check_docker_health().await
}

// ─── Private helpers ──────────────────────────────────────────────

async fn connect_docker() -> Result<Docker, AppError> {
    let platform = std::env::consts::OS;

    let docker = match platform {
        "linux" => Docker::connect_with_socket_defaults().map_err(|e| {
            AppError::DockerDaemonNotRunning {
                suggestion: format!(
                    "Cannot connect to Docker daemon: {}. Start Docker with: sudo systemctl start docker",
                    e
                ),
            }
        })?,
        "windows" => Docker::connect_with_defaults().map_err(|e| {
            AppError::DockerDesktopNotRunning {
                suggestion: format!(
                    "Cannot connect to Docker daemon: {}. Open Docker Desktop and wait for it to show 'Docker Desktop is running'.",
                    e
                ),
            }
        })?,
        _ => {
            return Err(AppError::UnsupportedPlatform {
                platform: platform.to_string(),
                suggestion: "Docker integration is currently supported on Linux and Windows only."
                    .to_string(),
            })
        }
    };

    Ok(docker)
}

async fn check_docker_linux() -> Result<DockerStatus, AppError> {
    // Check if Docker socket exists
    let socket_exists = std::path::Path::new("/var/run/docker.sock").exists();

    if !socket_exists {
        // Docker not installed
        return Ok(DockerStatus {
            installed: false,
            running: false,
            version: None,
            api_version: None,
            platform: "linux".to_string(),
            docker_desktop: false,
            wsl_backend: false,
        });
    }

    // Socket exists — try to connect and ping
    match Docker::connect_with_socket_defaults() {
        Ok(docker) => match docker.ping().await {
            Ok(_) => {
                // Daemon running — get version
                let version_info = docker.version().await.ok();
                Ok(DockerStatus {
                    installed: true,
                    running: true,
                    version: version_info.as_ref().and_then(|v| v.version.clone()),
                    api_version: version_info.and_then(|v| v.api_version),
                    platform: "linux".to_string(),
                    docker_desktop: false,
                    wsl_backend: false,
                })
            }
            Err(_) => {
                // Socket exists but daemon not responding
                Ok(DockerStatus {
                    installed: true,
                    running: false,
                    version: None,
                    api_version: None,
                    platform: "linux".to_string(),
                    docker_desktop: false,
                    wsl_backend: false,
                })
            }
        },
        Err(_) => {
            // Socket exists but can't connect
            Ok(DockerStatus {
                installed: true,
                running: false,
                version: None,
                api_version: None,
                platform: "linux".to_string(),
                docker_desktop: false,
                wsl_backend: false,
            })
        }
    }
}

async fn check_docker_windows() -> Result<DockerStatus, AppError> {
    // Try named pipe connection (Docker Desktop default on Windows)
    if let Ok(docker) = Docker::connect_with_defaults() {
        if docker.ping().await.is_ok() {
            let version_info = docker.version().await.ok();
            return Ok(DockerStatus {
                installed: true,
                running: true,
                version: version_info.as_ref().and_then(|v| v.version.clone()),
                api_version: version_info.and_then(|v| v.api_version),
                platform: "windows".to_string(),
                docker_desktop: true,
                wsl_backend: false,
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

    if !docker_in_path {
        return Ok(DockerStatus {
            installed: false,
            running: false,
            version: None,
            api_version: None,
            platform: "windows".to_string(),
            docker_desktop: false,
            wsl_backend: false,
        });
    }

    // Docker binary exists but daemon not accessible — check WSL2 backend
    let mut cmd = silent_cmd("wsl");
    cmd.args(["-l", "-v"]);
    let wsl_running = run_with_timeout(&mut cmd, QUICK_TIMEOUT)
        .await
        .map(|o| {
            let output = String::from_utf8_lossy(&o.stdout);
            output
                .lines()
                .any(|line| line.contains("docker-desktop") && line.contains("Running"))
        })
        .unwrap_or(false);

    Ok(DockerStatus {
        installed: true,
        running: false,
        version: None,
        api_version: None,
        platform: "windows".to_string(),
        docker_desktop: true,
        wsl_backend: wsl_running,
    })
}
