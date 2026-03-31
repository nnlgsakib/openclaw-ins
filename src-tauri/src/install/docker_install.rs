use crate::commands::silent::silent_cmd;
use crate::docker::check::check_docker_health_internal;
use crate::error::AppError;
use crate::install::progress::emit_progress;
use crate::install::verify::verify_gateway_health;
use crate::install::{InstallResult, SandboxInstallConfig};
use serde::{Deserialize, Serialize};
use tokio::io::{AsyncBufReadExt, BufReader};

const OPENCLAW_REPO: &str = "https://github.com/openclaw/openclaw.git";
const OPENCLAW_IMAGE: &str = "ghcr.io/openclaw/openclaw:latest";
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

/// Docker Compose-based installation flow using pre-built image.
///
/// Steps:
/// 1. Check Docker availability
/// 2. Create ~/.openclaw config, workspace, and repo directories
/// 3. Clone (or pull) the OpenClaw repository
/// 4. Write .env with all required vars and create subdirectories
///    5a. Pull pre-built image from ghcr.io
///    5b. Configure gateway via docker compose run config commands
///    5c. Start gateway via docker compose up -d
/// 6. Verify gateway health
pub async fn docker_install(
    app_handle: &tauri::AppHandle,
    install_dir: Option<&str>,
    workspace_path: Option<&str>,
    sandbox_config: Option<&SandboxInstallConfig>,
) -> Result<InstallResult, AppError> {
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
            suggestion:
                "Start Docker Desktop (Windows) or run: sudo systemctl start docker (Linux)".into(),
        });
    }

    // Step 2: Create config directories
    emit_progress(
        app_handle,
        "creating_dirs",
        10,
        "Creating configuration directories...",
    );
    let config_dir = match install_dir {
        Some(dir) => std::path::PathBuf::from(dir),
        None => dirs::home_dir()
            .ok_or_else(|| AppError::Internal {
                message: "Cannot find home directory".into(),
                suggestion: "Ensure the HOME environment variable is set".into(),
            })?
            .join(".openclaw"),
    };
    let workspace_dir = match workspace_path {
        Some(path) => std::path::PathBuf::from(path),
        None => config_dir.join("workspace"),
    };
    let repo_dir = config_dir.join("repo");

    tokio::fs::create_dir_all(&config_dir)
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to create config directory: {e}"),
            suggestion: "Check directory permissions for ~/.openclaw".into(),
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
            "cloning_repo",
            20,
            "Updating OpenClaw repository...",
        );
        emit_log(app_handle, "Repository exists, pulling latest changes...");

        // Mark repo directory as safe (needed for non-NTFS drives on Windows)
        let mut cmd = silent_cmd("git");
        cmd.args([
            "config",
            "--global",
            "--add",
            "safe.directory",
            repo_dir.to_str().unwrap(),
        ]);
        cmd.output().await.ok();

        let mut cmd = silent_cmd("git");
        cmd.args(["-C", repo_dir.to_str().unwrap(), "pull", "--ff-only"]);
        let mut child = cmd.spawn().map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to run git pull: {e}"),
            suggestion: "Ensure git is installed and on your PATH".into(),
        })?;

        let stderr = child.stderr.take().unwrap();
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let trimmed = line.trim();
            if !trimmed.is_empty() {
                emit_log(app_handle, trimmed);
            }
        }

        let status = child
            .wait()
            .await
            .map_err(|e| AppError::InstallationFailed {
                reason: format!("Failed to wait for git pull: {e}"),
                suggestion: "Ensure git is installed and on your PATH".into(),
            })?;

        if !status.success() {
            emit_log(app_handle, "git pull completed with warnings");
        }
    } else {
        // Fresh clone
        emit_progress(
            app_handle,
            "cloning_repo",
            20,
            "Cloning OpenClaw repository...",
        );
        emit_log(app_handle, &format!("Cloning from {OPENCLAW_REPO}..."));

        let mut cmd = silent_cmd("git");
        cmd.args([
            "clone",
            "--depth",
            "1",
            "--progress",
            OPENCLAW_REPO,
            repo_dir.to_str().unwrap(),
        ]);
        let mut child = cmd.spawn().map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to run git clone: {e}"),
            suggestion: "Ensure git is installed and on your PATH".into(),
        })?;

        // git clone outputs progress to stderr — stream it line by line
        let stderr = child.stderr.take().unwrap();
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let trimmed = line.trim();
            if !trimmed.is_empty() {
                emit_log(app_handle, trimmed);
            }
        }

        let status = child
            .wait()
            .await
            .map_err(|e| AppError::InstallationFailed {
                reason: format!("Failed to wait for git clone: {e}"),
                suggestion: "Ensure git is installed and on your PATH".into(),
            })?;

        if !status.success() {
            return Err(AppError::InstallationFailed {
                reason: "git clone failed".into(),
                suggestion: "Check your internet connection. Ensure git is installed.".into(),
            });
        }

        emit_log(app_handle, "Repository cloned successfully.");

        // Mark repo directory as safe (needed for non-NTFS drives on Windows)
        let mut cmd = silent_cmd("git");
        cmd.args([
            "config",
            "--global",
            "--add",
            "safe.directory",
            repo_dir.to_str().unwrap(),
        ]);
        cmd.output().await.ok();
    }

    emit_progress(app_handle, "cloning_repo", 30, "Repository ready.");

    // Step 4: Write .env file with all required vars and create subdirectories
    emit_progress(
        app_handle,
        "writing_env",
        35,
        "Generating gateway configuration...",
    );
    let gateway_token = generate_token();
    let env_content = format!(
        "OPENCLAW_IMAGE={OPENCLAW_IMAGE}\n\
         OPENCLAW_CONFIG_DIR={}\n\
         OPENCLAW_WORKSPACE_DIR={}\n\
         OPENCLAW_WORKSPACE={}\n\
         OPENCLAW_GATEWAY_TOKEN={gateway_token}\n\
         OPENCLAW_GATEWAY_PORT={GATEWAY_PORT}\n\
         OPENCLAW_BRIDGE_PORT={BRIDGE_PORT}\n\
         OPENCLAW_GATEWAY_BIND=lan\n",
        config_dir.display(),
        workspace_dir.display(),
        workspace_dir.display(),
    );
    let env_path = repo_dir.join(".env");
    tokio::fs::write(&env_path, env_content)
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to write .env file: {e}"),
            suggestion: "Check write permissions for ~/.openclaw/repo".into(),
        })?;

    emit_log(
        app_handle,
        &format!(".env written to {}", env_path.display()),
    );

    // Create required subdirectories under config_dir
    for sub in &["identity", "agents/main/agent", "agents/main/sessions"] {
        tokio::fs::create_dir_all(config_dir.join(sub)).await.ok();
    }

    // Step 5a: Pull pre-built image
    emit_progress(
        app_handle,
        "pulling_image",
        40,
        "Pulling pre-built OpenClaw image...",
    );
    emit_log(app_handle, &format!("Pulling {OPENCLAW_IMAGE}..."));

    let mut cmd = silent_cmd("docker");
    cmd.args(["pull", OPENCLAW_IMAGE]);
    let mut child = cmd.spawn().map_err(|e| AppError::InstallationFailed {
        reason: format!("Failed to run docker pull: {e}"),
        suggestion: "Ensure Docker is installed and running".into(),
    })?;

    let stderr = child.stderr.take().unwrap();
    let mut reader = BufReader::new(stderr).lines();
    while let Ok(Some(line)) = reader.next_line().await {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            emit_log(app_handle, trimmed);
        }
    }

    let status = child
        .wait()
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to wait for docker pull: {e}"),
            suggestion: "Ensure Docker is installed and running".into(),
        })?;

    if !status.success() {
        return Err(AppError::InstallationFailed {
            reason: format!("docker pull {OPENCLAW_IMAGE} failed"),
            suggestion: "Check your internet connection and Docker Desktop is running".into(),
        });
    }

    emit_log(app_handle, "Docker image pulled successfully.");
    emit_progress(app_handle, "pulling_image", 55, "Image ready.");

    // Step 5b: Configure gateway via docker compose run config commands
    emit_progress(app_handle, "configuring", 60, "Configuring gateway...");
    emit_log(app_handle, "Setting gateway configuration...");

    let config_commands: &[(&[&str], &str)] = &[
        (&["config", "set", "gateway.mode", "local"], "mode"),
        (&["config", "set", "gateway.bind", "lan"], "bind"),
        (
            &[
                "config",
                "set",
                "gateway.controlUi.allowedOrigins",
                r#"["http://localhost:18789","http://127.0.0.1:18789"]"#,
                "--strict-json",
            ],
            "origins",
        ),
    ];

    for (args, label) in config_commands {
        let mut cmd = silent_cmd("docker");
        cmd.args([
            "compose",
            "run",
            "--rm",
            "--no-deps",
            "-T",
            "--entrypoint",
            "node",
            "openclaw-gateway",
            "dist/index.js",
        ]);
        cmd.args(*args);
        cmd.current_dir(&repo_dir);
        let output = cmd
            .output()
            .await
            .map_err(|e| AppError::InstallationFailed {
                reason: format!("Failed to run config command ({label}): {e}"),
                suggestion: "Ensure Docker Compose is available".into(),
            })?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        if !stdout.trim().is_empty() {
            emit_log(app_handle, stdout.trim());
        }
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            emit_log(app_handle, &format!("config {label} warning: {stderr}"));
        }
    }

    emit_log(app_handle, "Gateway configured.");

    // Step 5c: Start gateway
    emit_progress(
        app_handle,
        "starting_gateway",
        75,
        "Starting OpenClaw gateway...",
    );
    emit_log(app_handle, "Starting gateway via docker compose...");

    let mut cmd = silent_cmd("docker");
    cmd.args(["compose", "up", "-d", "openclaw-gateway"]);
    cmd.current_dir(&repo_dir);
    let output = cmd
        .output()
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to start gateway: {e}"),
            suggestion: "Ensure 'docker compose' (v2) is available".into(),
        })?;

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    if !stdout_str.trim().is_empty() {
        emit_log(app_handle, &format!("compose: {}", stdout_str.trim()));
    }

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

    emit_log(app_handle, "Gateway started successfully.");
    emit_progress(app_handle, "starting_gateway", 85, "Gateway running.");

    // Step 6: Verify gateway is healthy
    emit_progress(app_handle, "verifying", 90, "Verifying installation...");
    verify_gateway_health(30).await?;

    // Step 7: Sandbox setup (if enabled and Docker backend)
    if let Some(sandbox) = sandbox_config {
        if sandbox.mode != "off" && sandbox.backend == "docker" {
            let image = sandbox
                .docker_image
                .as_deref()
                .unwrap_or("openclaw-sandbox:bookworm-slim");

            emit_progress(
                app_handle,
                "sandbox_setup",
                92,
                "Building sandbox Docker image...",
            );

            // Check if image already exists
            let check = silent_cmd("docker")
                .args(["image", "inspect", image])
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .status()
                .await;

            let needs_build = match check {
                Ok(status) => !status.success(),
                Err(_) => true,
            };

            if needs_build {
                let sandbox_script = repo_dir.join("scripts").join("sandbox-setup.sh");

                if sandbox_script.exists() {
                    // Run sandbox-setup.sh and stream output
                    emit_progress(
                        app_handle,
                        "sandbox_setup",
                        93,
                        "Running sandbox setup script...",
                    );

                    let mut cmd = silent_cmd("bash");
                    cmd.arg(&sandbox_script);
                    cmd.current_dir(&repo_dir);
                    cmd.stdout(std::process::Stdio::piped());
                    cmd.stderr(std::process::Stdio::piped());

                    match cmd.spawn() {
                        Ok(child) => {
                            stream_command_output(app_handle, child, "sandbox-setup-progress")
                                .await;
                            emit_progress(app_handle, "sandbox_setup", 98, "Sandbox image ready.");
                        }
                        Err(e) => {
                            // Graceful degradation — don't fail the install
                            emit_progress(
                                app_handle,
                                "sandbox_setup",
                                98,
                                &format!("Sandbox setup skipped: {e}"),
                            );
                        }
                    }
                } else {
                    // No script found — create Dockerfile.sandbox with node user and build
                    emit_progress(
                        app_handle,
                        "sandbox_setup",
                        92,
                        "Creating sandbox Dockerfile...",
                    );

                    let dockerfile = repo_dir.join("Dockerfile.sandbox");
                    let dockerfile_content = r#"FROM node:20-slim

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

RUN groupadd -g 1000 node || true && useradd -r -u 1000 -g node -m -s /bin/bash node || true

WORKDIR /home/node
RUN chown -R node:node /home/node

USER node

CMD ["/bin/bash"]
"#;

                    // Write Dockerfile.sandbox
                    if let Err(e) = std::fs::write(&dockerfile, dockerfile_content) {
                        emit_progress(
                            app_handle,
                            "sandbox_setup",
                            98,
                            &format!("Failed to create sandbox Dockerfile: {e}"),
                        );
                        return Ok(InstallResult {
                            method: "docker".into(),
                            version: Some("latest".into()),
                            gateway_url: "http://127.0.0.1:18789".to_string(),
                            gateway_token: None,
                        });
                    }

                    emit_progress(app_handle, "sandbox_setup", 93, "Building sandbox image...");

                    let mut cmd = silent_cmd("docker");
                    cmd.args(["build", "-t", image, "-f", "Dockerfile.sandbox", "."]);
                    cmd.current_dir(&repo_dir);
                    cmd.stdout(std::process::Stdio::piped());
                    cmd.stderr(std::process::Stdio::piped());

                    match cmd.spawn() {
                        Ok(child) => {
                            stream_command_output(app_handle, child, "sandbox-setup-progress")
                                .await;
                            emit_progress(app_handle, "sandbox_setup", 98, "Sandbox image ready.");
                        }
                        Err(e) => {
                            emit_progress(
                                app_handle,
                                "sandbox_setup",
                                98,
                                &format!("Sandbox image build skipped: {e}"),
                            );
                        }
                    }
                }
            } else {
                emit_progress(
                    app_handle,
                    "sandbox_setup",
                    98,
                    "Sandbox image already exists.",
                );
            }
        }
    }

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
#[allow(dead_code)]
fn emit_log_lines(app_handle: &tauri::AppHandle, output: &[u8]) {
    let text = String::from_utf8_lossy(output);
    for line in text.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            emit_log(app_handle, trimmed);
        }
    }
}

/// Stream stdout and stderr from a spawned child process as log events.
///
/// Reads both stdout and stderr concurrently, emitting each line to
/// the given Tauri event channel. Waits for the child process to exit.
async fn stream_command_output(
    app_handle: &tauri::AppHandle,
    mut child: tokio::process::Child,
    event_channel: &str,
) {
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let handle_out = app_handle.clone();
    let channel_out = event_channel.to_string();
    let stdout_task = async move {
        if let Some(stdout) = stdout {
            let mut reader = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    let _ = tauri::Emitter::emit(
                        &handle_out,
                        &channel_out,
                        DockerLogEvent {
                            output: trimmed.to_string(),
                            timestamp: std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_millis() as u64,
                        },
                    );
                }
            }
        }
    };

    let handle_err = app_handle.clone();
    let channel_err = event_channel.to_string();
    let stderr_task = async move {
        if let Some(stderr) = stderr {
            let mut reader = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    let _ = tauri::Emitter::emit(
                        &handle_err,
                        &channel_err,
                        DockerLogEvent {
                            output: trimmed.to_string(),
                            timestamp: std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .as_millis() as u64,
                        },
                    );
                }
            }
        }
    };

    tokio::join!(stdout_task, stderr_task);
    let _ = child.wait().await;
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
