use serde::{Deserialize, Serialize};

use super::silent::silent_cmd;
use crate::error::AppError;
use crate::install::docker_install::docker_install;
use crate::install::native_install::native_install;
use crate::install::{InstallResult, SandboxInstallConfig};

/// Installation method selected by the user.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum InstallMethod {
    Docker,
    Native,
}

/// Request payload for the install_openclaw command.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallRequest {
    pub method: InstallMethod,
    pub workspace_path: Option<String>,
    pub install_dir: Option<String>,
    /// Sandbox config from wizard. If present and not "off", sandbox setup runs after install.
    pub sandbox_config: Option<SandboxInstallConfig>,
}

/// Install OpenClaw via the selected method (Docker or native).
///
/// This is the primary Tauri command that routes to the appropriate
/// installation flow and streams progress events to the frontend.
#[tauri::command]
pub async fn install_openclaw(
    request: InstallRequest,
    app_handle: tauri::AppHandle,
) -> Result<InstallResult, AppError> {
    match request.method {
        InstallMethod::Docker => {
            docker_install(
                &app_handle,
                request.install_dir.as_deref(),
                request.workspace_path.as_deref(),
                request.sandbox_config.as_ref(),
            )
            .await
        }
        InstallMethod::Native => native_install(&app_handle).await,
    }
}

/// Clean (remove) the installation directory for a fresh install.
///
/// Removes the entire directory tree at the given path.
/// The frontend should call this before starting a new installation
/// when the user opts for a clean install.
#[tauri::command]
pub async fn clean_install_dir(path: String) -> Result<(), AppError> {
    let dir = std::path::Path::new(&path);
    if dir.exists() {
        tokio::fs::remove_dir_all(dir)
            .await
            .map_err(|e| AppError::InstallationFailed {
                reason: format!("Failed to clean install directory: {e}"),
                suggestion: format!("Check permissions for {}. Try removing it manually.", path),
            })?;
    }
    Ok(())
}

/// Cancel the currently running installation.
///
/// This is a best-effort cancellation. Docker compose processes
/// started during installation will be stopped via `docker compose down`.
/// The frontend should set isInstalling to false after calling this.
#[tauri::command]
pub async fn cancel_install(install_dir: Option<String>) -> Result<(), AppError> {
    let config_dir = match install_dir {
        Some(dir) => std::path::PathBuf::from(dir),
        None => dirs::home_dir()
            .ok_or_else(|| AppError::Internal {
                message: "Cannot find home directory".into(),
                suggestion: "Ensure the HOME environment variable is set".into(),
            })?
            .join(".openclaw"),
    };
    let repo_dir = config_dir.join("repo");

    // Try to stop any running compose services
    if repo_dir.exists() && repo_dir.join("docker-compose.yml").exists() {
        let mut cmd = silent_cmd("docker");
        cmd.args(["compose", "down"]);
        cmd.current_dir(&repo_dir);
        let _ = cmd.output().await;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn install_method_serializes_camelcase() {
        let docker = InstallMethod::Docker;
        let native = InstallMethod::Native;
        let docker_json = serde_json::to_string(&docker).unwrap();
        let native_json = serde_json::to_string(&native).unwrap();
        assert_eq!(docker_json, "\"docker\"");
        assert_eq!(native_json, "\"native\"");
    }

    #[test]
    fn install_request_deserializes() {
        let json =
            r#"{"method":"docker","workspacePath":"/tmp/test","installDir":"/opt/openclaw"}"#;
        let req: InstallRequest = serde_json::from_str(json).unwrap();
        assert!(matches!(req.method, InstallMethod::Docker));
        assert_eq!(req.workspace_path, Some("/tmp/test".into()));
        assert_eq!(req.install_dir, Some("/opt/openclaw".into()));
    }

    #[test]
    fn install_request_deserializes_without_optional_fields() {
        let json = r#"{"method":"native"}"#;
        let req: InstallRequest = serde_json::from_str(json).unwrap();
        assert!(matches!(req.method, InstallMethod::Native));
        assert_eq!(req.workspace_path, None);
        assert_eq!(req.install_dir, None);
        assert_eq!(req.sandbox_config, None);
    }

    #[test]
    fn install_request_deserializes_with_sandbox_config() {
        let json = r#"{"method":"docker","sandboxConfig":{"mode":"non-main","backend":"docker","dockerImage":"openclaw-sandbox:bookworm-slim","dockerNetwork":"none","dockerBinds":["/tmp:/tmp"]}}"#;
        let req: InstallRequest = serde_json::from_str(json).unwrap();
        assert!(matches!(req.method, InstallMethod::Docker));
        let sandbox = req.sandbox_config.unwrap();
        assert_eq!(sandbox.mode, "non-main");
        assert_eq!(sandbox.backend, "docker");
        assert_eq!(
            sandbox.docker_image,
            Some("openclaw-sandbox:bookworm-slim".into())
        );
        assert_eq!(sandbox.docker_network, Some("none".into()));
        assert_eq!(
            sandbox.docker_binds,
            Some(vec!["/tmp:/tmp".into()])
        );
    }
}
