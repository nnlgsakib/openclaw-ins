use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::install::progress::emit_progress;
use crate::install::verify::{verify_gateway_health, verify_native_install};

/// Result of a post-installation verification.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VerificationResult {
    pub success: bool,
    pub method: String,
    pub gateway_url: String,
    pub gateway_token: Option<String>,
    pub error: Option<String>,
    pub suggestion: Option<String>,
}

/// Verify that the installation was successful.
///
/// Determines which verification method to use based on the installation method.
/// Emits progress events so the frontend can show verification status.
/// For Docker: polls /healthz and /readyz endpoints.
/// For Native: runs `openclaw doctor --yes`.
#[tauri::command]
pub async fn verify_installation(
    method: String,
    app_handle: tauri::AppHandle,
) -> Result<VerificationResult, AppError> {
    let method_lower = method.to_lowercase();

    emit_progress(
        &app_handle,
        "verify_starting",
        10,
        "Starting verification...",
    );

    let result = match method_lower.as_str() {
        "docker" => verify_docker_installation(&app_handle).await,
        "native" => verify_native_installation(&app_handle).await,
        _ => Err(AppError::Internal {
            message: format!("Unknown installation method: {method}"),
            suggestion: "Installation method must be 'docker' or 'native'".into(),
        }),
    };

    match result {
        Ok(verification) => {
            emit_progress(&app_handle, "verify_complete", 100, "Verification passed!");
            Ok(verification)
        }
        Err(e) => {
            emit_progress(
                &app_handle,
                "verify_failed",
                0,
                &format!("Verification failed: {e}"),
            );
            Err(e)
        }
    }
}

/// Verify Docker installation by polling gateway health endpoints.
async fn verify_docker_installation(
    app_handle: &tauri::AppHandle,
) -> Result<VerificationResult, AppError> {
    emit_progress(
        app_handle,
        "verify_gateway",
        30,
        "Checking gateway health...",
    );

    // Poll /healthz and /readyz with 30s timeout
    verify_gateway_health(30).await?;

    emit_progress(
        app_handle,
        "verify_gateway_ready",
        80,
        "Gateway is healthy!",
    );

    // Try to read the gateway token from .env file
    let gateway_token = read_gateway_token().await;

    Ok(VerificationResult {
        success: true,
        method: "docker".into(),
        gateway_url: "http://127.0.0.1:18789".into(),
        gateway_token,
        error: None,
        suggestion: None,
    })
}

/// Verify native installation by running openclaw doctor.
async fn verify_native_installation(
    app_handle: &tauri::AppHandle,
) -> Result<VerificationResult, AppError> {
    emit_progress(
        app_handle,
        "verify_doctor",
        30,
        "Running OpenClaw doctor...",
    );

    verify_native_install().await?;

    emit_progress(app_handle, "verify_doctor_ok", 80, "OpenClaw is ready!");

    Ok(VerificationResult {
        success: true,
        method: "native".into(),
        gateway_url: "http://127.0.0.1:18789".into(),
        gateway_token: None,
        error: None,
        suggestion: None,
    })
}

/// Read the gateway token from the .env file in the OpenClaw config directory.
async fn read_gateway_token() -> Option<String> {
    let home = dirs::home_dir()?;
    let env_path = home.join(".openclaw").join(".env");
    let contents = tokio::fs::read_to_string(&env_path).await.ok()?;

    for line in contents.lines() {
        let line = line.trim();
        if let Some(token) = line.strip_prefix("OPENCLAW_GATEWAY_TOKEN=") {
            return Some(token.to_string());
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verification_result_serializes_camelcase() {
        let result = VerificationResult {
            success: true,
            method: "docker".into(),
            gateway_url: "http://127.0.0.1:18789".into(),
            gateway_token: Some("abc123".into()),
            error: None,
            suggestion: None,
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"success\""));
        assert!(json.contains("\"method\""));
        assert!(json.contains("\"gatewayUrl\""));
        assert!(json.contains("\"gatewayToken\""));
    }

    #[test]
    fn verification_result_with_error() {
        let result = VerificationResult {
            success: false,
            method: "docker".into(),
            gateway_url: "http://127.0.0.1:18789".into(),
            gateway_token: None,
            error: Some("Gateway not reachable".into()),
            suggestion: Some("Check Docker logs".into()),
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"success\":false"));
        assert!(json.contains("\"error\""));
        assert!(json.contains("\"suggestion\""));
    }
}
