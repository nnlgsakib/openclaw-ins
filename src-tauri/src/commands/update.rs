use bollard::Docker;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use super::silent::{run_with_timeout, silent_cmd, INSTALL_TIMEOUT, QUICK_TIMEOUT};
use crate::error::AppError;
use crate::install::progress::emit_progress;
use crate::install::verify::verify_gateway_health;

const OPENCLAW_IMAGE: &str = "ghcr.io/openclaw/openclaw";
const OPENCLAW_TAG: &str = "latest";
const GITHUB_RELEASES_URL: &str = "https://api.github.com/repos/openclaw/openclaw/releases/latest";

// ─── Types ────────────────────────────────────────────────────────

/// Result of checking whether an OpenClaw update is available.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenClawUpdateCheck {
    pub current_version: String,
    pub latest_version: String,
    pub update_available: bool,
    pub install_method: String,
}

/// Result returned after an OpenClaw update completes.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateResult {
    pub success: bool,
    pub new_version: Option<String>,
    pub method: String,
}

/// GitHub release API response (subset we need).
#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
}

// ─── Commands ─────────────────────────────────────────────────────

/// Check if a newer version of OpenClaw is available.
///
/// Detects the install method (Docker vs native) and compares
/// the current version against the latest release.
#[tauri::command]
pub async fn check_openclaw_update() -> Result<OpenClawUpdateCheck, AppError> {
    let (install_method, current_version) = detect_install_method().await;

    if install_method == "unknown" {
        return Ok(OpenClawUpdateCheck {
            current_version: "unknown".into(),
            latest_version: "unknown".into(),
            update_available: false,
            install_method: "unknown".into(),
        });
    }

    let latest_version = fetch_latest_version().await.unwrap_or_else(|_| {
        if install_method == "docker" {
            OPENCLAW_TAG.to_string()
        } else {
            "unknown".to_string()
        }
    });

    let update_available = if install_method == "docker" {
        // For Docker, always report true (pulling latest ensures freshness)
        true
    } else {
        semver_newer(&latest_version, &current_version)
    };

    Ok(OpenClawUpdateCheck {
        current_version,
        latest_version,
        update_available,
        install_method,
    })
}

/// Update OpenClaw to the latest version.
///
/// For Docker: pulls the latest image and restarts the gateway.
/// For Native: downloads and replaces the binary.
/// Streams progress events to the frontend during the process.
#[tauri::command]
pub async fn update_openclaw(
    method: Option<String>,
    app_handle: AppHandle,
) -> Result<UpdateResult, AppError> {
    let install_method = match method {
        Some(m) => m,
        None => {
            let (m, _) = detect_install_method().await;
            m
        }
    };

    match install_method.as_str() {
        "docker" => update_docker(&app_handle).await,
        "native" => update_native(&app_handle).await,
        _ => Err(AppError::InstallationFailed {
            reason: "OpenClaw is not installed or install method is unknown".into(),
            suggestion: "Install OpenClaw first from the Install page.".into(),
        }),
    }
}

// ─── Docker Update ────────────────────────────────────────────────

async fn update_docker(app_handle: &AppHandle) -> Result<UpdateResult, AppError> {
    emit_progress(app_handle, "checking_docker", 10, "Checking Docker...");

    let docker = connect_docker().await?;

    // Pull the latest image
    emit_progress(
        app_handle,
        "pulling_image",
        30,
        "Pulling latest OpenClaw image...",
    );

    use futures_util::StreamExt;
    let mut stream = docker.create_image(
        Some(bollard::query_parameters::CreateImageOptions {
            from_image: Some(OPENCLAW_IMAGE.to_string()),
            tag: Some(OPENCLAW_TAG.to_string()),
            ..Default::default()
        }),
        None,
        None,
    );

    while let Some(result) = stream.next().await {
        match result {
            Ok(info) => {
                if let Some(status) = &info.status {
                    let detail = info
                        .progress_detail
                        .as_ref()
                        .and_then(|d| d.current)
                        .unwrap_or(0) as u64;
                    let total = info
                        .progress_detail
                        .as_ref()
                        .and_then(|d| d.total)
                        .unwrap_or(1) as u64;
                    let pull_percent = if total > 0 {
                        ((detail as f64 / total as f64) * 50.0) as u8
                    } else {
                        0
                    };
                    let percent = 30 + pull_percent.min(50);
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
                    suggestion: "Check your internet connection and Docker access. \
                                 Try: docker pull ghcr.io/openclaw/openclaw:latest"
                        .into(),
                });
            }
        }
    }

    // Restart the gateway via docker compose
    emit_progress(app_handle, "restarting", 80, "Restarting OpenClaw...");

    let home = dirs::home_dir().ok_or_else(|| AppError::Internal {
        message: "Cannot find home directory".into(),
        suggestion: "Ensure the HOME environment variable is set".into(),
    })?;
    let compose_path = home.join(".openclaw").join("docker-compose.yml");

    let mut cmd = silent_cmd("docker");
    cmd.args([
        "compose",
        "-f",
        compose_path.to_str().unwrap(),
        "up",
        "-d",
        "openclaw-gateway",
    ]);
    let output = run_with_timeout(&mut cmd, INSTALL_TIMEOUT)
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to run docker compose: {e}"),
            suggestion: "Ensure 'docker compose' (v2) is available. Run: docker compose version"
                .into(),
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::InstallationFailed {
            reason: format!("docker compose up failed: {stderr}"),
            suggestion: "Check Docker logs: docker compose logs openclaw-gateway".into(),
        });
    }

    // Verify the gateway is healthy
    emit_progress(app_handle, "verifying", 90, "Verifying update...");
    verify_gateway_health(30).await?;

    emit_progress(app_handle, "complete", 100, "Update complete!");

    Ok(UpdateResult {
        success: true,
        new_version: Some("latest".into()),
        method: "docker".into(),
    })
}

// ─── Native Update ────────────────────────────────────────────────

async fn update_native(app_handle: &AppHandle) -> Result<UpdateResult, AppError> {
    emit_progress(
        app_handle,
        "downloading",
        20,
        "Downloading latest version...",
    );

    // Get the download URL for the latest release
    let latest_tag = fetch_latest_version().await?;

    // Run npm update for the openclaw package
    emit_progress(app_handle, "installing", 70, "Installing update...");

    let mut cmd = silent_cmd("npm");
    cmd.args(["install", "-g", &format!("openclaw@{latest_tag}")]);
    let output = run_with_timeout(&mut cmd, INSTALL_TIMEOUT)
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to update openclaw: {e}"),
            suggestion:
                "Ensure npm is installed and you have permission to install global packages. \
                         Try: npm install -g openclaw@latest"
                    .into(),
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::InstallationFailed {
            reason: format!("npm install failed: {stderr}"),
            suggestion: "Try running: npm install -g openclaw@latest".into(),
        });
    }

    emit_progress(app_handle, "complete", 100, "Update complete!");

    Ok(UpdateResult {
        success: true,
        new_version: Some(latest_tag),
        method: "native".into(),
    })
}

// ─── Helpers ──────────────────────────────────────────────────────

/// Detect the install method by checking for docker-compose.yml or native binary.
async fn detect_install_method() -> (String, String) {
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return ("unknown".into(), "unknown".into()),
    };

    // Check for Docker install
    let compose_path = home.join(".openclaw").join("docker-compose.yml");
    if compose_path.exists() {
        let version = get_docker_version()
            .await
            .unwrap_or_else(|| "latest".into());
        return ("docker".into(), version);
    }

    // Check for native install
    let mut cmd = silent_cmd("openclaw");
    cmd.arg("--version");
    let output = run_with_timeout(&mut cmd, QUICK_TIMEOUT).await;
    if let Ok(output) = output {
        if output.status.success() {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return ("native".into(), version);
        }
    }

    ("unknown".into(), "unknown".into())
}

/// Get the running OpenClaw image tag from Docker.
async fn get_docker_version() -> Option<String> {
    let docker = connect_docker().await.ok()?;
    let container = docker
        .inspect_container("openclaw-gateway", None)
        .await
        .ok()?;
    let image = container.config?.image?;
    // Image format: "ghcr.io/openclaw/openclaw:latest" or similar
    let tag = image.split(':').next_back().unwrap_or("latest");
    Some(tag.to_string())
}

/// Fetch the latest version tag from GitHub releases API.
async fn fetch_latest_version() -> Result<String, AppError> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| AppError::Internal {
            message: format!("Failed to build HTTP client: {e}"),
            suggestion: "This is an internal error. Please report it.".into(),
        })?;

    let release: GithubRelease = client
        .get(GITHUB_RELEASES_URL)
        .header("User-Agent", "clawstation")
        .send()
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to fetch latest release: {e}"),
            suggestion: "Check your internet connection and try again.".into(),
        })?
        .json()
        .await
        .map_err(|e| AppError::InstallationFailed {
            reason: format!("Failed to parse release info: {e}"),
            suggestion: "GitHub API may be unavailable. Try again later.".into(),
        })?;

    // Strip leading 'v' if present
    let tag = release.tag_name.trim_start_matches('v').to_string();
    Ok(tag)
}

/// Simple semver comparison: returns true if `latest` is newer than `current`.
fn semver_newer(latest: &str, current: &str) -> bool {
    let parse = |s: &str| -> (u32, u32, u32) {
        let parts: Vec<&str> = s.split('.').collect();
        let major = parts.first().and_then(|p| p.parse().ok()).unwrap_or(0);
        let minor = parts.get(1).and_then(|p| p.parse().ok()).unwrap_or(0);
        let patch = parts.get(2).and_then(|p| p.parse().ok()).unwrap_or(0);
        (major, minor, patch)
    };

    let (l_major, l_minor, l_patch) = parse(latest);
    let (c_major, c_minor, c_patch) = parse(current);

    (l_major, l_minor, l_patch) > (c_major, c_minor, c_patch)
}

/// Connect to Docker using platform-appropriate method.
///
/// Duplicated from docker.rs to keep update module self-contained.
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

// ─── Tests ────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn semver_newer_detects_major_bump() {
        assert!(semver_newer("2.0.0", "1.9.9"));
    }

    #[test]
    fn semver_newer_detects_minor_bump() {
        assert!(semver_newer("1.2.0", "1.1.9"));
    }

    #[test]
    fn semver_newer_detects_patch_bump() {
        assert!(semver_newer("1.0.1", "1.0.0"));
    }

    #[test]
    fn semver_newer_false_when_same() {
        assert!(!semver_newer("1.0.0", "1.0.0"));
    }

    #[test]
    fn semver_newer_false_when_older() {
        assert!(!semver_newer("1.0.0", "2.0.0"));
    }

    #[test]
    fn update_check_struct_serializes() {
        let check = OpenClawUpdateCheck {
            current_version: "1.0.0".into(),
            latest_version: "1.1.0".into(),
            update_available: true,
            install_method: "docker".into(),
        };
        let json = serde_json::to_string(&check).unwrap();
        assert!(json.contains("\"currentVersion\""));
        assert!(json.contains("\"latestVersion\""));
        assert!(json.contains("\"updateAvailable\""));
        assert!(json.contains("\"installMethod\""));
    }

    #[test]
    fn update_result_struct_serializes() {
        let result = UpdateResult {
            success: true,
            new_version: Some("1.1.0".into()),
            method: "docker".into(),
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"success\""));
        assert!(json.contains("\"newVersion\""));
        assert!(json.contains("\"method\""));
    }
}
