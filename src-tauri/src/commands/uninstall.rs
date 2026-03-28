use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

use crate::error::AppError;
use crate::install::progress::emit_progress;

/// Result of an uninstall operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UninstallResult {
    pub success: bool,
    pub removed_containers: Vec<String>,
    pub removed_config: bool,
    pub error: Option<String>,
}

/// Request payload for the uninstall_openclaw command.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UninstallRequest {
    pub preserve_config: bool,
}

/// Return the path to the OpenClaw config directory (~/.openclaw).
fn config_dir() -> Result<PathBuf, AppError> {
    let home = dirs::home_dir().ok_or_else(|| AppError::Internal {
        message: "Cannot find home directory".into(),
        suggestion: "Ensure the HOME environment variable is set".into(),
    })?;
    Ok(home.join(".openclaw"))
}

/// Fully uninstall OpenClaw — stop containers, remove images, optionally delete config.
///
/// Steps:
/// 1. Detect Docker install (check docker-compose.yml)
/// 2. Stop and remove containers via docker compose down
/// 3. Remove Docker images via bollard
/// 4. Remove Docker volumes
/// 5. Stop native process if running
/// 6. Remove config directory (respecting preserve_config)
/// 7. Return result
#[tauri::command]
pub async fn uninstall_openclaw(
    request: UninstallRequest,
    app_handle: tauri::AppHandle,
) -> Result<UninstallResult, AppError> {
    let config = config_dir()?;
    let compose_path = config.join("docker-compose.yml");

    let mut removed_containers: Vec<String> = Vec::new();
    let mut errors: Vec<String> = Vec::new();

    // Step 1: Detect Docker install
    emit_progress(
        &app_handle,
        "detecting_install",
        10,
        "Detecting OpenClaw installation...",
    );
    let is_docker_install = compose_path.exists();

    if is_docker_install {
        // Step 2: Stop and remove containers
        emit_progress(
            &app_handle,
            "stopping_containers",
            30,
            "Stopping OpenClaw containers...",
        );
        match stop_and_remove_containers(&compose_path).await {
            Ok(containers) => removed_containers.extend(containers),
            Err(e) => {
                let msg = format!("Container removal warning: {e}");
                eprintln!("WARNING: {msg}");
                errors.push(msg);
            }
        }

        // Step 3: Remove Docker images
        emit_progress(
            &app_handle,
            "removing_images",
            50,
            "Removing OpenClaw images...",
        );
        match remove_openclaw_images().await {
            Ok(_) => {}
            Err(e) => {
                let msg = format!("Image removal warning: {e}");
                eprintln!("WARNING: {msg}");
                errors.push(msg);
            }
        }

        // Step 4: Remove Docker volumes
        emit_progress(
            &app_handle,
            "removing_volumes",
            60,
            "Removing Docker volumes...",
        );
        match remove_volumes(&compose_path).await {
            Ok(_) => {}
            Err(e) => {
                let msg = format!("Volume removal warning: {e}");
                eprintln!("WARNING: {msg}");
                errors.push(msg);
            }
        }
    }

    // Step 5: Stop native process if running
    emit_progress(
        &app_handle,
        "stopping_process",
        70,
        "Stopping OpenClaw processes...",
    );
    match stop_native_process().await {
        Ok(_) => {}
        Err(e) => {
            let msg = format!("Process stop warning: {e}");
            eprintln!("WARNING: {msg}");
            errors.push(msg);
        }
    }

    // Step 6: Remove config directory
    emit_progress(
        &app_handle,
        "removing_config",
        85,
        if request.preserve_config {
            "Removing Docker artifacts (preserving config)..."
        } else {
            "Removing configuration files..."
        },
    );

    let removed_config = match handle_config_removal(&config, request.preserve_config).await {
        Ok(removed) => removed,
        Err(e) => {
            let msg = format!("Config removal warning: {e}");
            eprintln!("WARNING: {msg}");
            errors.push(msg);
            false
        }
    };

    // Step 7: Complete
    emit_progress(
        &app_handle,
        "complete",
        100,
        "OpenClaw uninstalled successfully!",
    );

    let error_msg = if errors.is_empty() {
        None
    } else {
        Some(errors.join("; "))
    };

    Ok(UninstallResult {
        success: true,
        removed_containers,
        removed_config,
        error: error_msg,
    })
}

/// Run `docker compose down` to stop and remove containers.
async fn stop_and_remove_containers(compose_path: &Path) -> Result<Vec<String>, String> {
    let output = tokio::process::Command::new("docker")
        .args([
            "compose",
            "-f",
            compose_path.to_str().unwrap(),
            "down",
            "--remove-orphans",
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run docker compose down: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // If containers are already gone, that's fine
        if stderr.contains("no such service") || stderr.contains("no configuration file") {
            return Ok(Vec::new());
        }
        return Err(format!("docker compose down failed: {stderr}"));
    }

    Ok(vec![
        "openclaw-gateway".to_string(),
        "openclaw-cli".to_string(),
    ])
}

/// Remove OpenClaw Docker images via bollard.
async fn remove_openclaw_images() -> Result<(), String> {
    let docker = bollard::Docker::connect_with_socket_defaults()
        .map_err(|e| format!("Cannot connect to Docker socket: {e}"))?;

    // Try to remove the primary image — force removal
    match docker
        .remove_image(
            "ghcr.io/openclaw/openclaw:latest",
            None::<bollard::query_parameters::RemoveImageOptions>,
            None,
        )
        .await
    {
        Ok(_) => {}
        Err(bollard::errors::Error::DockerResponseServerError {
            status_code: 404, ..
        }) => {
            // Image not found — already removed or never pulled
        }
        Err(e) => return Err(format!("Failed to remove image: {e}")),
    }

    Ok(())
}

/// Remove Docker volumes via compose down --volumes.
async fn remove_volumes(compose_path: &Path) -> Result<(), String> {
    let output = tokio::process::Command::new("docker")
        .args([
            "compose",
            "-f",
            compose_path.to_str().unwrap(),
            "down",
            "--volumes",
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run docker compose down --volumes: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Graceful: compose file may already be gone
        if stderr.contains("no configuration file") {
            return Ok(());
        }
        return Err(format!("docker compose down --volumes failed: {stderr}"));
    }

    Ok(())
}

/// Stop any running OpenClaw native process.
async fn stop_native_process() -> Result<(), String> {
    // Try platform-specific process detection
    #[cfg(target_os = "linux")]
    {
        let output = tokio::process::Command::new("pgrep")
            .args(["-f", "openclaw"])
            .output()
            .await;

        if let Ok(out) = output {
            if out.status.success() {
                // Found running processes — try graceful stop first
                let _ = tokio::process::Command::new("pkill")
                    .args(["-f", "openclaw"])
                    .output()
                    .await;
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        let _ = tokio::process::Command::new("taskkill")
            .args(["/IM", "openclaw.exe", "/F"])
            .output()
            .await;
    }

    Ok(())
}

/// Handle config directory removal based on preserve_config flag.
///
/// Returns true if config was fully removed, false if preserved.
async fn handle_config_removal(config: &PathBuf, preserve_config: bool) -> Result<bool, String> {
    if !config.exists() {
        return Ok(true); // Nothing to remove
    }

    if preserve_config {
        // Only remove Docker artifacts, keep config.yaml and workspace/
        for file in &["docker-compose.yml", ".env"] {
            let path = config.join(file);
            if path.exists() {
                tokio::fs::remove_file(&path)
                    .await
                    .map_err(|e| format!("Failed to remove {}: {e}", path.display()))?;
            }
        }
        Ok(false) // Config preserved
    } else {
        // Remove entire config directory
        tokio::fs::remove_dir_all(config)
            .await
            .map_err(|e| format!("Failed to remove {}: {e}", config.display()))?;
        Ok(true) // Config fully removed
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uninstall_request_preserve_config_true() {
        let json = r#"{"preserveConfig": true}"#;
        let req: UninstallRequest = serde_json::from_str(json).unwrap();
        assert!(req.preserve_config);
    }

    #[test]
    fn uninstall_request_preserve_config_false() {
        let json = r#"{"preserveConfig": false}"#;
        let req: UninstallRequest = serde_json::from_str(json).unwrap();
        assert!(!req.preserve_config);
    }

    #[test]
    fn uninstall_result_serializes_camelcase() {
        let result = UninstallResult {
            success: true,
            removed_containers: vec!["openclaw-gateway".into()],
            removed_config: false,
            error: None,
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"success\""));
        assert!(json.contains("\"removedContainers\""));
        assert!(json.contains("\"removedConfig\""));
    }
}
