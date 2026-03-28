use serde::{Deserialize, Serialize};
use sysinfo::System;

use crate::docker::check::{check_docker_health_internal, DockerStatus};
use crate::error::AppError;

/// Result of the full system pre-install check.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemCheckResult {
    pub platform: String,
    pub docker_available: bool,
    pub docker_running: bool,
    pub node_available: bool,
    pub node_version: Option<String>,
    pub disk_free_gb: u64,
    pub ram_available_gb: u64,
    pub port_18789_free: bool,
}

/// Run all system checks required before installation.
///
/// Checks: platform, Docker, Node.js, disk space, RAM, port 18789.
#[tauri::command]
pub async fn run_system_check() -> Result<SystemCheckResult, AppError> {
    let platform = std::env::consts::OS.to_string();

    // Docker check — reuse shared health check
    let docker_status = check_docker_health_internal()
        .await
        .unwrap_or(DockerStatus {
            installed: false,
            running: false,
            version: None,
            api_version: None,
            platform: platform.clone(),
        });

    // Node.js check
    let (node_available, node_version) = check_nodejs().await;

    // System resource checks
    let disk_free_gb = get_free_disk_gb();
    let ram_available_gb = get_available_ram_gb();
    let port_18789_free = is_port_free(18789).await;

    Ok(SystemCheckResult {
        platform,
        docker_available: docker_status.installed,
        docker_running: docker_status.running,
        node_available,
        node_version,
        disk_free_gb,
        ram_available_gb,
        port_18789_free,
    })
}

/// Check if Node.js is available and get its version.
async fn check_nodejs() -> (bool, Option<String>) {
    let node_cmd = "node";

    match tokio::process::Command::new(node_cmd)
        .arg("--version")
        .output()
        .await
    {
        Ok(output) if output.status.success() => {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            (true, Some(version))
        }
        _ => (false, None),
    }
}

/// Get free disk space in GB for the system root.
fn get_free_disk_gb() -> u64 {
    let disks = sysinfo::Disks::new_with_refreshed_list();

    // Use the first disk (root filesystem)
    disks
        .first()
        .map(|d| d.available_space() / (1024 * 1024 * 1024))
        .unwrap_or(0)
}

/// Get available RAM in GB.
fn get_available_ram_gb() -> u64 {
    let mut sys = System::new();
    sys.refresh_memory();

    sys.available_memory() / (1024 * 1024 * 1024)
}

/// Check if a TCP port is free by attempting to bind to it.
async fn is_port_free(port: u16) -> bool {
    tokio::net::TcpListener::bind(("127.0.0.1", port)).await.is_ok()
}
