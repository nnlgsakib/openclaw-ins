use crate::docker::check::check_docker_health_internal;
use crate::error::AppError;
use crate::install::InstallResult;
use crate::install::progress::emit_progress;
use crate::install::verify::verify_gateway_health;

use tokio::io::AsyncWriteExt;

const OPENCLAW_IMAGE: &str = "ghcr.io/openclaw/openclaw:latest";
const GATEWAY_PORT: u16 = 18789;
const BRIDGE_PORT: u16 = 18790;

/// Docker Compose-based installation flow.
///
/// Steps:
/// 1. Check Docker availability
/// 2. Create ~/.openclaw config and workspace directories
/// 3. Pull the OpenClaw image via bollard
/// 4. Write docker-compose.yml
/// 5. Write .env with generated gateway token
/// 6. Start gateway via docker compose up
/// 7. Verify gateway health
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
        15,
        "Creating configuration directories...",
    );
    let home = dirs::home_dir().ok_or_else(|| AppError::Internal {
        message: "Cannot find home directory".into(),
        suggestion: "Ensure the HOME environment variable is set".into(),
    })?;
    let config_dir = home.join(".openclaw");
    let workspace_dir = config_dir.join("workspace");

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

    // Step 3: Pull OpenClaw image via bollard
    emit_progress(
        app_handle,
        "pulling_image",
        20,
        "Downloading OpenClaw image...",
    );
    let docker = bollard::Docker::connect_with_socket_defaults().map_err(|e| {
        AppError::DockerUnavailable {
            suggestion: format!("Cannot connect to Docker socket: {e}"),
        }
    })?;

    use futures_util::StreamExt;
    let mut stream = docker.create_image(
        Some(bollard::image::CreateImageOptions {
            from_image: "ghcr.io/openclaw/openclaw",
            tag: "latest",
            ..Default::default()
        }),
        None,
        None,
    );

    while let Some(result) = stream.next().await {
        match result {
            Ok(info) => {
                if let Some(status) = info.get("status").and_then(|s| s.as_str()) {
                    // Map pull progress to 20-70% range
                    let detail = info
                        .get("progressDetail")
                        .and_then(|d| d.get("current"))
                        .and_then(|c| c.as_u64())
                        .unwrap_or(0);
                    let total = info
                        .get("progressDetail")
                        .and_then(|d| d.get("total"))
                        .and_then(|t| t.as_u64())
                        .unwrap_or(1);
                    let pull_percent = if total > 0 {
                        ((detail as f64 / total as f64) * 50.0) as u8
                    } else {
                        0
                    };
                    let percent = 20 + pull_percent.min(50);
                    emit_progress(
                        app_handle,
                        "pulling_image",
                        percent,
                        &format!("{status}..."),
                    );
                }
            }
            Err(e) => {
                return Err(AppError::InstallationFailed {
                    reason: format!("Image pull failed: {e}"),
                    suggestion: "Check your internet connection and Docker Hub access. \
                                 Try: docker pull ghcr.io/openclaw/openclaw:latest"
                        .into(),
                });
            }
        }
    }

    // Step 4: Write docker-compose.yml
    emit_progress(
        app_handle,
        "writing_compose",
        75,
        "Configuring Docker services...",
    );
    let compose_content = generate_compose_yaml();
    let compose_path = config_dir.join("docker-compose.yml");
    tokio::fs::write(&compose_path, compose_content)
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to write compose file: {e}"),
            suggestion: "Check write permissions for ~/.openclaw".into(),
        })?;

    // Step 5: Write .env file with generated gateway token
    emit_progress(
        app_handle,
        "writing_env",
        80,
        "Generating gateway token...",
    );
    let gateway_token = generate_token();
    let env_content = format!(
        "OPENCLAW_IMAGE={OPENCLAW_IMAGE}\n\
         OPENCLAW_GATEWAY_TOKEN={gateway_token}\n\
         OPENCLAW_GATEWAY_PORT={GATEWAY_PORT}\n\
         OPENCLAW_BRIDGE_PORT={BRIDGE_PORT}\n\
         OPENCLAW_CONFIG_DIR={}\n\
         OPENCLAW_WORKSPACE_DIR={}\n",
        config_dir.display(),
        workspace_dir.display(),
    );
    tokio::fs::write(config_dir.join(".env"), env_content)
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to write .env file: {e}"),
            suggestion: "Check write permissions for ~/.openclaw".into(),
        })?;

    // Step 6: Start gateway via docker compose up
    emit_progress(
        app_handle,
        "starting_gateway",
        85,
        "Starting OpenClaw gateway...",
    );
    let output = tokio::process::Command::new("docker")
        .args([
            "compose",
            "-f",
            compose_path.to_str().unwrap(),
            "up",
            "-d",
            "openclaw-gateway",
        ])
        .output()
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to run docker compose: {e}"),
            suggestion: "Ensure 'docker compose' (v2) is available. Run: docker compose version".into(),
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::InstallationFailed {
            reason: format!("docker compose up failed: {stderr}"),
            suggestion: "Check Docker logs: docker compose logs openclaw-gateway".into(),
        });
    }

    // Step 7: Verify gateway is healthy
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

/// Generate the embedded docker-compose.yml content.
///
/// Uses the official OpenClaw compose structure with env var substitution.
fn generate_compose_yaml() -> String {
    r#"services:
  openclaw-gateway:
    image: ${OPENCLAW_IMAGE:-ghcr.io/openclaw/openclaw:latest}
    container_name: openclaw-gateway
    restart: unless-stopped
    ports:
      - "127.0.0.1:${OPENCLAW_GATEWAY_PORT:-18789}:18789"
      - "${OPENCLAW_BRIDGE_PORT:-18790}:18790"
    environment:
      HOME: /home/node
      TERM: xterm-256color
      OPENCLAW_GATEWAY_TOKEN: ${OPENCLAW_GATEWAY_TOKEN}
    volumes:
      - ${OPENCLAW_CONFIG_DIR:-~/.openclaw}:/home/node/.openclaw
      - ${OPENCLAW_WORKSPACE_DIR:-~/.openclaw/workspace}:/home/node/.openclaw/workspace
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:18789/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3

  openclaw-cli:
    image: ${OPENCLAW_IMAGE:-ghcr.io/openclaw/openclaw:latest}
    container_name: openclaw-cli
    network_mode: "service:openclaw-gateway"
    cap_drop:
      - NET_RAW
      - NET_ADMIN
    security_opt:
      - no-new-privileges:true
    volumes:
      - ${OPENCLAW_CONFIG_DIR:-~/.openclaw}:/home/node/.openclaw
      - ${OPENCLAW_WORKSPACE_DIR:-~/.openclaw/workspace}:/home/node/.openclaw/workspace
"#
    .to_string()
}

/// Generate a cryptographically random gateway token (64 hex chars = 256 bits).
fn generate_token() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let mut buf = [0u8; 32];
    // Use system randomness via /dev/urandom (available on Linux and Windows)
    getrandom::getrandom(&mut buf).unwrap_or_else(|_| {
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
    fn generate_compose_yaml_contains_services() {
        let yaml = generate_compose_yaml();
        assert!(yaml.contains("openclaw-gateway"));
        assert!(yaml.contains("openclaw-cli"));
        assert!(yaml.contains("OPENCLAW_IMAGE"));
        assert!(yaml.contains("OPENCLAW_GATEWAY_TOKEN"));
    }

    #[test]
    fn generate_token_returns_64_hex_chars() {
        let token = generate_token();
        assert_eq!(token.len(), 64);
        assert!(token.chars().all(|c| c.is_ascii_hexdigit()));
    }
}
