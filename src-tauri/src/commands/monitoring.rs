use bollard::container::ListContainersOptions;
use bollard::Docker;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::error::AppError;

// ─── Types ────────────────────────────────────────────────────────

/// Overall OpenClaw process status.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "state")]
pub enum OpenClawStatus {
    Running { version: Option<String>, port: u16 },
    Stopped,
    Error { message: String },
    Unknown,
}

/// An active agent session running inside OpenClaw.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentSession {
    pub id: String,
    pub name: Option<String>,
    pub status: String,
    pub started_at: Option<String>,
    pub model: Option<String>,
}

/// A Docker container associated with OpenClaw sandboxing.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SandboxContainer {
    pub id: String,
    pub name: String,
    pub state: String,
    pub status_text: String,
    pub image: String,
    pub created: String,
}

// ─── Commands ─────────────────────────────────────────────────────

/// Check whether the OpenClaw container is running, stopped, or unknown.
#[tauri::command]
pub async fn get_openclaw_status() -> Result<OpenClawStatus, AppError> {
    let docker = match connect_docker().await {
        Ok(d) => d,
        Err(_) => return Ok(OpenClawStatus::Unknown),
    };

    let mut filters: HashMap<String, Vec<String>> = HashMap::new();
    filters.insert("name".into(), vec!["openclaw".into()]);

    let options = ListContainersOptions {
        all: true,
        filters,
        ..Default::default()
    };

    let containers = match docker.list_containers(Some(options)).await {
        Ok(c) => c,
        Err(_) => return Ok(OpenClawStatus::Unknown),
    };

    let container = match containers.into_iter().next() {
        Some(c) => c,
        None => return Ok(OpenClawStatus::Stopped),
    };

    let state = container.state.as_deref().unwrap_or("unknown");

    match state {
        "running" => {
            let version = container
                .labels
                .as_ref()
                .and_then(|l| l.get("openclaw.version").cloned());

            let port = std::env::var("OPENCLAW_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(3000);

            Ok(OpenClawStatus::Running { version, port })
        }
        "exited" | "dead" => Ok(OpenClawStatus::Stopped),
        "restarting" => Ok(OpenClawStatus::Error {
            message: "Container is restarting".into(),
        }),
        _ => Ok(OpenClawStatus::Unknown),
    }
}

/// Retrieve active agent sessions from the OpenClaw API.
///
/// Returns an empty Vec if OpenClaw is not running or the API is unavailable.
#[tauri::command]
pub async fn get_agent_sessions() -> Result<Vec<AgentSession>, AppError> {
    let status = get_openclaw_status().await?;

    let port = match status {
        OpenClawStatus::Running { port, .. } => port,
        _ => return Ok(vec![]),
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| AppError::Internal {
            message: format!("Failed to build HTTP client: {}", e),
            suggestion: "This is an internal error. Please report it.".into(),
        })?;

    let url = format!("http://localhost:{}/api/sessions", port);

    match client.get(&url).send().await {
        Ok(resp) => match resp.json::<Vec<AgentSession>>().await {
            Ok(sessions) => Ok(sessions),
            Err(_) => Ok(vec![]),
        },
        Err(_) => Ok(vec![]),
    }
}

/// List sandbox containers associated with OpenClaw.
///
/// Returns containers whose names contain "openclaw-sandbox" or whose labels
/// include `openclaw.component=sandbox`. Returns empty Vec if Docker unavailable.
#[tauri::command]
pub async fn get_sandbox_containers() -> Result<Vec<SandboxContainer>, AppError> {
    let docker = match connect_docker().await {
        Ok(d) => d,
        Err(_) => return Ok(vec![]),
    };

    let options = ListContainersOptions {
        all: true,
        ..Default::default()
    };

    let containers = match docker.list_containers(Some(options)).await {
        Ok(c) => c,
        Err(_) => return Ok(vec![]),
    };

    let sandbox_containers: Vec<SandboxContainer> = containers
        .into_iter()
        .filter(|c| {
            let name_matches = c.names.as_ref().map_or(false, |names| {
                names.iter().any(|n| n.contains("openclaw-sandbox"))
            });

            let label_matches = c.labels.as_ref().map_or(false, |labels| {
                labels
                    .get("openclaw.component")
                    .map_or(false, |v| v == "sandbox")
            });

            name_matches || label_matches
        })
        .map(|c| {
            let id = c.id.unwrap_or_default();
            let name = c
                .names
                .and_then(|n| n.into_iter().next())
                .unwrap_or_default()
                .trim_start_matches('/')
                .to_string();
            let state = c.state.unwrap_or_default();
            let status_text = c.status.unwrap_or_default();
            let image = c.image.unwrap_or_default();
            let created = c
                .created
                .map(|t| unix_timestamp_to_iso(t))
                .unwrap_or_default();

            SandboxContainer {
                id,
                name,
                state,
                status_text,
                image,
                created,
            }
        })
        .collect();

    Ok(sandbox_containers)
}

// ─── Private helpers ──────────────────────────────────────────────

/// Convert a Unix timestamp (seconds) to an ISO 8601 string.
fn unix_timestamp_to_iso(timestamp: i64) -> String {
    const DAYS_BEFORE_MONTH: [u64; 12] = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

    let secs = timestamp as u64;
    let mins = secs / 60;
    let hours = mins / 60;
    let days = hours / 24;

    let mut year = 1970u64;
    let mut remaining_days = days;
    loop {
        let days_in_year = if year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) {
            366
        } else {
            365
        };
        if remaining_days < days_in_year {
            break;
        }
        remaining_days -= days_in_year;
        year += 1;
    }

    let is_leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let mut month = 0usize;
    for m in 0..12 {
        let next = if m < 11 {
            DAYS_BEFORE_MONTH[m + 1] + if is_leap && m >= 2 { 1 } else { 0 }
        } else {
            365 + if is_leap { 1 } else { 0 }
        };
        if remaining_days < next {
            month = m;
            break;
        }
    }

    let day =
        remaining_days - (DAYS_BEFORE_MONTH[month] + if is_leap && month >= 2 { 1 } else { 0 }) + 1;

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year,
        month + 1,
        day,
        hours % 24,
        mins % 60,
        secs % 60
    )
}

/// Connect to Docker using platform-appropriate method.
///
/// Duplicated from docker.rs to keep monitoring module self-contained.
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
        "windows" => Docker::connect_with_http_defaults().map_err(|e| {
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
