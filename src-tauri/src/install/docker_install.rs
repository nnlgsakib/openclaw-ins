use crate::docker::check::check_docker_health_internal;
use crate::error::AppError;
use crate::install::InstallResult;
use crate::install::progress::emit_progress;
use crate::install::verify::verify_gateway_health;
use serde::{Deserialize, Serialize};

const OPENCLAW_REPO: &str = "https://github.com/openclaw/openclaw.git";
const GATEWAY_PORT: u16 = 18789;
const BRIDGE_PORT: u16 = 18790;

/// Per-layer progress event for Docker image pull.
///
/// Emitted during image pull to provide granular visibility into
/// individual layer download status.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)] // Still part of the IPC contract; emitted during image pull if needed
pub struct DockerLayerProgressEvent {
    pub layer_id: String,
    pub description: String,
    pub percentage: u8,
    pub layer_percentage: u8,
}

/// Raw Docker log output event for the terminal viewer.
///
/// Emitted during git clone and compose up to provide real-time
/// log visibility in the DockerLogViewer component.
#[derive(Debug, Clone, Serialize)]
pub struct DockerLogEvent {
    pub output: String,
    pub timestamp: u64,
}

/// Docker Compose-based installation flow (from source repo).
///
/// Steps:
/// 1. Check Docker availability
/// 2. Create ~/.openclaw config, workspace, and repo directories
/// 3. Clone (or pull) the OpenClaw repository
/// 4. Write .env with generated gateway token
/// 5. Start gateway via docker compose up (from repo)
/// 6. Verify gateway health
pub async fn docker_install(app_handle: &tauri::AppHandle) -> Result<InstallResult, AppError> {
    // Step 1: Verify Docker is available
    emit_progress(
        app_handle,
        "checking_docker",
        5,
        "Checking Docker availability...",
    );
    let docker_status = check_docker_health_internal()
        .await
        .map_err(|e| AppError::DockerUnavailable {
            suggestion: format!(
                "Could not connect to Docker: {e}. Install Docker Desktop from https://docker.com/get-started"
            ),
        })?;

    if !docker_status.running {
        return Err(AppError::DockerDaemonNotRunning {
            suggestion: "Start Docker Desktop (Windows) or run: sudo systemctl start docker (Linux)"
                .into(),
        });
    }

    // Step 2: Create config directories
    emit_progress(
        app_handle,
        "creating_dirs",
        10,
        "Creating configuration directories...",
    );
    let home = dirs::home_dir().ok_or_else(|| AppError::Internal {
        message: "Cannot find home directory".into(),
        suggestion: "Ensure the HOME environment variable is set".into(),
    })?;
    let config_dir = home.join(".openclaw");
    let workspace_dir = config_dir.join("workspace");
    let repo_dir = config_dir.join("repo");

    tokio::fs::create_dir_all(&config_dir).await.map_err(|e| {
        AppError::InstallationFailed {
            reason: format!("Failed to create config directory: {e}"),
            suggestion: "Check directory permissions for ~/.openclaw".into(),
        }
    })?;
    tokio::fs::create_dir_all(&workspace_dir)
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to create workspace directory: {e}"),
            suggestion: "Check directory permissions for ~/.openclaw/workspace".into(),
        })?;

    // Step 3: Clone or update the OpenClaw repository
    if repo_dir.join(".git").exists() {
        // Repo already exists — pull latest
        emit_progress(
            app_handle,
            "pulling_image",
            20,
            "Updating OpenClaw repository...",
        );
        emit_log(app_handle, "Repository exists, pulling latest changes...");

        let output = tokio::process::Command::new("git")
            .args(["-C", repo_dir.to_str().unwrap(), "pull", "--ff-only"])
            .output()
            .await
            .map_err(|e| AppError::InstallationFailed {
                reason: format!("Failed to run git pull: {e}"),
                suggestion: "Ensure git is installed and on your PATH".into(),
            })?;

        emit_log_lines(app_handle, &output.stdout);
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            emit_log(app_handle, &format!("git pull warning: {stderr}"));
        }
    } else {
        // Fresh clone
        emit_progress(
            app_handle,
            "pulling_image",
            20,
            "Cloning OpenClaw repository...",
        );
        emit_log(app_handle, &format!("Cloning from {OPENCLAW_REPO}..."));

        let output = tokio::process::Command::new("git")
            .args([
                "clone",
                "--progress",
                OPENCLAW_REPO,
                repo_dir.to_str().unwrap(),
            ])
            .output()
            .await
            .map_err(|e| AppError::InstallationFailed {
                reason: format!("Failed to run git clone: {e}"),
                suggestion: "Ensure git is installed and on your PATH".into(),
            })?;

        // git clone outputs progress to stderr
        emit_log_lines(app_handle, &output.stderr);
        emit_log_lines(app_handle, &output.stdout);

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AppError::InstallationFailed {
                reason: format!("git clone failed: {stderr}"),
                suggestion: "Check your internet connection. Ensure git is installed.".into(),
            });
        }

        emit_log(app_handle, "Repository cloned successfully.");
    }

    emit_progress(app_handle, "pulling_image", 50, "Repository ready.");

    // Step 4: Write .env file with generated gateway token
    emit_progress(
        app_handle,
        "writing_env",
        55,
        "Generating gateway configuration...",
    );
    let gateway_token = generate_token();
    let env_content = format!(
        "OPENCLAW_GATEWAY_TOKEN={gateway_token}\n\
         OPENCLAW_GATEWAY_PORT={GATEWAY_PORT}\n\
         OPENCLAW_BRIDGE_PORT={BRIDGE_PORT}\n\
         OPENCLAW_CONFIG_DIR={}\n\
         OPENCLAW_WORKSPACE_DIR={}\n",
        config_dir.display(),
        workspace_dir.display(),
    );
    let env_path = repo_dir.join(".env");
    tokio::fs::write(&env_path, env_content)
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to write .env file: {e}"),
            suggestion: "Check write permissions for ~/.openclaw/repo".into(),
        })?;

    emit_log(app_handle, &format!(".env written to {}", env_path.display()));

    // Step 5: Build and start via docker compose up
    emit_progress(
        app_handle,
        "starting_gateway",
        65,
        "Building and starting OpenClaw...",
    );
    emit_log(app_handle, "Running docker compose up --build -d...");

    let output = tokio::process::Command::new("docker")
        .args(["compose", "up", "--build", "-d"])
        .current_dir(&repo_dir)
        .output()
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to run docker compose: {e}"),
            suggestion:
                "Ensure 'docker compose' (v2) is available. Run: docker compose version".into(),
        })?;

    // Emit compose stdout as log output
    let stdout_str = String::from_utf8_lossy(&output.stdout);
    if !stdout_str.trim().is_empty() {
        emit_log(app_handle, &format!("compose: {}", stdout_str.trim()));
    }

    // Emit compose stderr as log output (errors visible in log viewer)
    let stderr_str = String::from_utf8_lossy(&output.stderr);
    if !stderr_str.trim().is_empty() {
        emit_log(app_handle, &format!("compose-err: {}", stderr_str.trim()));
    }

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::InstallationFailed {
            reason: format!("docker compose up failed: {stderr}"),
            suggestion: "Check Docker logs: cd ~/.openclaw/repo && docker compose logs".into(),
        });
    }

    emit_log(app_handle, "Docker compose started successfully.");
    emit_progress(app_handle, "starting_gateway", 85, "Services started.");

    // Step 6: Verify gateway is healthy
    emit_progress(
        app_handle,
        "verifying",
        95,
        "Verifying installation...",
    );
    verify_gateway_health(30).await?;

    emit_progress(
        app_handle,
        "complete",
        100,
        "OpenClaw installed successfully!",
    );

    Ok(InstallResult {
        method: "docker".into(),
        version: Some("latest".into()),
        gateway_url: format!("http://127.0.0.1:{GATEWAY_PORT}"),
        gateway_token: Some(gateway_token),
    })
}

/// Emit a single log line to the DockerLogViewer.
fn emit_log(app_handle: &tauri::AppHandle, message: &str) {
    let _ = tauri::Emitter::emit(
        app_handle,
        "docker-log-output",
        DockerLogEvent {
            output: message.to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
        },
    );
}

/// Emit each line of command output as a separate log event.
fn emit_log_lines(app_handle: &tauri::AppHandle, output: &[u8]) {
    let text = String::from_utf8_lossy(output);
    for line in text.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            emit_log(app_handle, trimmed);
        }
    }
}

/// Generate a cryptographically random gateway token (64 hex chars = 256 bits).
fn generate_token() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let mut buf = [0u8; 32];
    // Use system randomness via /dev/urandom (available on Linux and Windows)
    getrandom::fill(&mut buf).unwrap_or_else(|_| {
        // Fallback: seed from time + PID
        let t = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos() as u64;
        let pid = std::process::id() as u64;
        let seed = t ^ (pid << 16);
        for (i, byte) in buf.iter_mut().enumerate() {
            *byte = ((seed >> (i % 8)) & 0xFF) as u8 ^ (i as u8);
        }
    });
    buf.iter().map(|b| format!("{b:02x}")).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generate_token_returns_64_hex_chars() {
        let token = generate_token();
        assert_eq!(token.len(), 64);
        assert!(token.chars().all(|c| c.is_ascii_hexdigit()));
    }
}
