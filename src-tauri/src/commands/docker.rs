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

/// Check if the sandbox Docker image exists locally.
#[tauri::command]
pub async fn check_sandbox_image_exists() -> Result<bool, AppError> {
    let output = silent_cmd("docker")
        .args(["image", "inspect", "openclaw-sandbox:bookworm-slim"])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .await;

    match output {
        Ok(status) => Ok(status.success()),
        Err(_) => Ok(false),
    }
}

/// Build the sandbox Docker image locally with real-time progress.
///
/// The openclaw-sandbox image is a local build (not on Docker Hub).
/// This tries, in order:
/// 1. Run `scripts/sandbox-setup.sh` if it exists in the repo
/// 2. Build from existing `Dockerfile.sandbox` in the repo
/// 3. Create `Dockerfile.sandbox` inline, then build (works without repo)
#[tauri::command]
pub async fn pull_sandbox_image(app_handle: tauri::AppHandle) -> Result<bool, AppError> {
    let image = "openclaw-sandbox:bookworm-slim";
    let config_dir = dirs::home_dir()
        .ok_or_else(|| AppError::Internal {
            message: "Cannot find home directory".into(),
            suggestion: "Ensure HOME environment variable is set".into(),
        })?
        .join(".openclaw");
    let repo_dir = config_dir.join("repo");

    crate::install::progress::emit_progress(
        &app_handle,
        "pulling_sandbox",
        10,
        "Building openclaw-sandbox image...",
    );

    // If repo exists, try script then Dockerfile from repo
    if repo_dir.exists() {
        let sandbox_script = repo_dir.join("scripts").join("sandbox-setup.sh");
        let dockerfile = repo_dir.join("Dockerfile.sandbox");

        if sandbox_script.exists() {
            crate::install::progress::emit_progress(
                &app_handle,
                "pulling_sandbox",
                30,
                "Running sandbox setup script...",
            );
            return run_build_command(
                &app_handle,
                silent_cmd("bash").arg(&sandbox_script).current_dir(&repo_dir),
            )
            .await;
        }

        if dockerfile.exists() {
            crate::install::progress::emit_progress(
                &app_handle,
                "pulling_sandbox",
                30,
                "Building from Dockerfile.sandbox...",
            );
            return run_build_command(
                &app_handle,
                silent_cmd("docker")
                    .args(["build", "-t", image, "-f", "Dockerfile.sandbox", "."])
                    .current_dir(&repo_dir),
            )
            .await;
        }
    }

    // No repo or no script/Dockerfile — create a temp Dockerfile and build
    let build_dir = config_dir.join(".sandbox-build");
    tokio::fs::create_dir_all(&build_dir)
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to create build directory: {e}"),
            suggestion: "Check write permissions for ~/.openclaw".into(),
        })?;

    crate::install::progress::emit_progress(
        &app_handle,
        "pulling_sandbox",
        20,
        "Creating sandbox Dockerfile...",
    );

    let dockerfile_content = r#"FROM node:20-slim

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

RUN groupadd -g 1000 node || true && useradd -r -u 1000 -g node -m -s /bin/bash node || true

WORKDIR /home/node
RUN chown -R node:node /home/node

USER node

CMD ["/bin/bash"]
"#;

    let dockerfile_path = build_dir.join("Dockerfile.sandbox");
    tokio::fs::write(&dockerfile_path, dockerfile_content)
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to create Dockerfile: {e}"),
            suggestion: "Check write permissions for ~/.openclaw".into(),
        })?;

    crate::install::progress::emit_progress(
        &app_handle,
        "pulling_sandbox",
        30,
        "Building sandbox image...",
    );

    run_build_command(
        &app_handle,
        silent_cmd("docker")
            .args(["build", "-t", image, "-f", "Dockerfile.sandbox", "."])
            .current_dir(&build_dir),
    )
    .await
}

/// Helper: spawn a build command, stream stdout/stderr as sandbox-pull-output events,
/// and return Ok(true) on success or Err on failure.
async fn run_build_command(
    app_handle: &tauri::AppHandle,
    cmd: &mut tokio::process::Command,
) -> Result<bool, AppError> {
    use tokio::io::{AsyncBufReadExt, BufReader};

    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| {
        let _ = crate::install::progress::emit_progress(
            app_handle,
            "pulling_sandbox",
            100,
            &format!("Error: {e}"),
        );
        AppError::InstallationFailed {
            reason: format!("Failed to spawn sandbox build command: {e}"),
            suggestion: "Ensure Docker is installed and running".into(),
        }
    })?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let app_out = app_handle.clone();
    let stdout_task = tokio::spawn(async move {
        if let Some(stdout) = stdout {
            let mut reader = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let _ = tauri::Emitter::emit(&app_out, "sandbox-pull-output", &line);
            }
        }
    });

    let app_err = app_handle.clone();
    let stderr_task = tokio::spawn(async move {
        let mut stderr_lines = Vec::new();
        if let Some(stderr) = stderr {
            let mut reader = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let _ = tauri::Emitter::emit(&app_err, "sandbox-pull-output", &line);
                stderr_lines.push(line);
            }
        }
        stderr_lines
    });

    let (_, stderr_result) = tokio::join!(stdout_task, stderr_task);
    let stderr_lines = stderr_result.unwrap_or_default();

    let status = child.wait().await.map_err(|e| {
        let _ = crate::install::progress::emit_progress(
            app_handle,
            "pulling_sandbox",
            100,
            "Build failed",
        );
        AppError::InstallationFailed {
            reason: format!("Failed to wait for sandbox build: {e}"),
            suggestion: "Check Docker logs for details".into(),
        }
    })?;

    if status.success() {
        crate::install::progress::emit_progress(
            app_handle,
            "pulling_sandbox",
            100,
            "Sandbox image ready!",
        );
        Ok(true)
    } else {
        let error_detail = if stderr_lines.is_empty() {
            "build exited with non-zero status".to_string()
        } else {
            stderr_lines.join("; ")
        };
        crate::install::progress::emit_progress(
            app_handle,
            "pulling_sandbox",
            100,
            "Build failed",
        );
        Err(AppError::InstallationFailed {
            reason: format!("Sandbox image build failed: {error_detail}"),
            suggestion:
                "Ensure Docker is running and you have internet access for downloading base images."
                    .into(),
        })
    }
}
