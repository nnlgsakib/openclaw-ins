use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::install::docker_install::docker_install;
use crate::install::native_install::native_install;
use crate::install::InstallResult;

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
        InstallMethod::Docker => docker_install(&app_handle).await,
        InstallMethod::Native => native_install(&app_handle).await,
    }
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
        let json = r#"{"method":"docker","workspacePath":"/tmp/test"}"#;
        let req: InstallRequest = serde_json::from_str(json).unwrap();
        assert!(matches!(req.method, InstallMethod::Docker));
        assert_eq!(req.workspace_path, Some("/tmp/test".into()));
    }

    #[test]
    fn install_request_deserializes_without_workspace() {
        let json = r#"{"method":"native"}"#;
        let req: InstallRequest = serde_json::from_str(json).unwrap();
        assert!(matches!(req.method, InstallMethod::Native));
        assert_eq!(req.workspace_path, None);
    }
}
