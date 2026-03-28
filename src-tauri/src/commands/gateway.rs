use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::Emitter;
use tokio::io::AsyncBufReadExt;

use crate::state::AppState;

/// Gateway status information.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GatewayStatus {
    pub running: bool,
    pub port: u16,
    pub pid: Option<u32>,
}

/// Start the OpenClaw Gateway process.
///
/// If the gateway is already running on the port, connects to it instead
/// of starting a new one. Streams stdout/stderr as "gateway-output" events.
#[tauri::command]
pub async fn start_gateway(
    app: tauri::AppHandle,
    port: Option<u16>,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<GatewayStatus, String> {
    let port = port.unwrap_or(18789);

    // Check if already running in our state
    {
        let app_state = state.lock().map_err(|e| e.to_string())?;
        if app_state.gateway_pid.is_some() {
            return Ok(GatewayStatus {
                running: true,
                port,
                pid: app_state.gateway_pid,
            });
        }
    }

    // Check if gateway is already running on the port (external process)
    if tokio::net::TcpStream::connect(format!("127.0.0.1:{port}"))
        .await
        .is_ok()
    {
        let _ = app.emit(
            "gateway-output",
            serde_json::json!({ "line": "Gateway already running on port, connecting...", "stream": "stdout" }),
        );
        let _ = app.emit(
            "gateway-status",
            serde_json::json!({ "connected": true }),
        );
        return Ok(GatewayStatus {
            running: true,
            port,
            pid: None,
        });
    }

    let port_str = port.to_string();

    // Read workspace path from desktop config
    let workspace = super::desktop_config::get_workspace_path().await;
    let _ = app.emit(
        "gateway-output",
        serde_json::json!({ "line": format!("Using workspace: {workspace}"), "stream": "stdout" }),
    );

    // Try multiple ways to start openclaw on Windows
    let mut child = if cfg!(target_os = "windows") {
        let attempts: Vec<Vec<&str>> = vec![
            vec!["/c", "pnpm", "exec", "openclaw", "gateway", "--verbose", "--port", &port_str],
            vec!["/c", "npx", "openclaw", "gateway", "--verbose", "--port", &port_str],
            vec!["/c", "openclaw", "gateway", "--verbose", "--port", &port_str],
        ];

        let mut last_err = String::new();
        let mut spawned = None;
        for args in &attempts {
            match tokio::process::Command::new("cmd")
                .args(args)
                .env("OPENCLAW_WORKSPACE", &workspace)
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
            {
                Ok(c) => { spawned = Some(c); break; }
                Err(e) => { last_err = format!("{e}"); }
            }
        }
        spawned.ok_or_else(|| format!("Failed to start Gateway: {last_err}. Tried pnpm exec, npx, and direct openclaw."))?
    } else {
        tokio::process::Command::new("openclaw")
            .args(["gateway", "--verbose", "--port", &port_str])
            .env("OPENCLAW_WORKSPACE", &workspace)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start Gateway: {e}"))?
    };

    let pid = child.id();
    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    // Store PID in state
    {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.gateway_pid = pid;
    }

    // Stream stdout
    let app_stdout = app.clone();
    tokio::spawn(async move {
        let reader = tokio::io::BufReader::new(stdout);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app_stdout.emit(
                "gateway-output",
                serde_json::json!({ "line": line, "stream": "stdout" }),
            );
        }
    });

    // Stream stderr
    let app_stderr = app.clone();
    tokio::spawn(async move {
        let reader = tokio::io::BufReader::new(stderr);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app_stderr.emit(
                "gateway-output",
                serde_json::json!({ "line": line, "stream": "stderr" }),
            );
        }
    });

    // Monitor process exit
    let app_exit = app.clone();
    tokio::spawn(async move {
        let _ = child.wait().await;
        let _ = app_exit.emit("gateway-stopped", ());
    });

    Ok(GatewayStatus {
        running: true,
        port,
        pid,
    })
}

/// Stop the OpenClaw Gateway process.
///
/// Uses `openclaw gateway stop` if available, otherwise kills by port.
#[tauri::command]
pub async fn stop_gateway(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<GatewayStatus, String> {
    // Clear our stored PID
    {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.gateway_pid = None;
    }

    let _ = app.emit(
        "gateway-output",
        serde_json::json!({ "line": "Stopping Gateway...", "stream": "stdout" }),
    );

    // Try `openclaw gateway stop` first (works if openclaw is in PATH)
    let openclaw_stop = if cfg!(target_os = "windows") {
        tokio::process::Command::new("cmd")
            .args(["/c", "openclaw", "gateway", "stop"])
            .output()
            .await
    } else {
        tokio::process::Command::new("openclaw")
            .args(["gateway", "stop"])
            .output()
            .await
    };

    match openclaw_stop {
        Ok(out) if out.status.success() => {
            let _ = app.emit(
                "gateway-output",
                serde_json::json!({ "line": "Gateway stopped via openclaw CLI", "stream": "stdout" }),
            );
        }
        _ => {
            // Fallback: kill any process on port 18789
            let _ = kill_gateway_on_port_internal().await;
            let _ = app.emit(
                "gateway-output",
                serde_json::json!({ "line": "Gateway killed by port", "stream": "stdout" }),
            );
        }
    }

    let _ = app.emit("gateway-stopped", ());

    Ok(GatewayStatus {
        running: false,
        port: 18789,
        pid: None,
    })
}

/// Restart the Gateway: stop then start.
#[tauri::command]
pub async fn restart_gateway(
    app: tauri::AppHandle,
    port: Option<u16>,
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<GatewayStatus, String> {
    // Clear PID first
    {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.gateway_pid = None;
    }

    // Stop using CLI or port kill
    let _ = app.emit(
        "gateway-output",
        serde_json::json!({ "line": "Restarting Gateway...", "stream": "stdout" }),
    );

    // Try openclaw gateway stop
    if cfg!(target_os = "windows") {
        let _ = tokio::process::Command::new("cmd")
            .args(["/c", "openclaw", "gateway", "stop"])
            .output()
            .await;
    } else {
        let _ = tokio::process::Command::new("openclaw")
            .args(["gateway", "stop"])
            .output()
            .await;
    }

    // Also kill anything on the port
    let _ = kill_gateway_on_port_internal().await;

    // Wait for port to release
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;

    let _ = app.emit("gateway-stopped", ());

    // Start fresh
    start_gateway(app, port, state).await
}

/// Get the current Gateway status.
///
/// Checks if the Gateway port is listening.
#[tauri::command]
pub async fn get_gateway_status(
    state: tauri::State<'_, Mutex<AppState>>,
) -> Result<GatewayStatus, String> {
    let pid = {
        let app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.gateway_pid
    };

    // Primary check: TCP port is open
    let running = tokio::net::TcpStream::connect("127.0.0.1:18789")
        .await
        .is_ok();

    // If port is not open, clear stored PID
    if !running {
        let mut app_state = state.lock().map_err(|e| e.to_string())?;
        app_state.gateway_pid = None;
    }

    Ok(GatewayStatus {
        running,
        port: 18789,
        pid,
    })
}

/// Internal: Kill any process on port 18789.
async fn kill_gateway_on_port_internal() -> Result<(), String> {
    if cfg!(target_os = "windows") {
        // Find PID using netstat
        let output = tokio::process::Command::new("cmd")
            .args(["/c", "netstat", "-ano"])
            .output()
            .await
            .map_err(|e| format!("{e}"))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            if line.contains(":18789") && line.contains("LISTENING") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if let Some(pid_str) = parts.last() {
                    if let Ok(pid) = pid_str.trim().parse::<u32>() {
                        let _ = tokio::process::Command::new("taskkill")
                            .args(["/PID", &pid.to_string(), "/F", "/T"])
                            .output()
                            .await;
                    }
                }
            }
        }
    } else {
        let output = tokio::process::Command::new("lsof")
            .args(["-ti", ":18789"])
            .output()
            .await
            .map_err(|e| format!("{e}"))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        for pid_str in stdout.lines() {
            if let Ok(pid) = pid_str.trim().parse::<u32>() {
                let _ = tokio::process::Command::new("kill")
                    .args(["-9", &pid.to_string()])
                    .output()
                    .await;
            }
        }
    }
    Ok(())
}

/// Kill any gateway process on port 18789, even if we didn't start it.
#[tauri::command]
pub async fn kill_gateway_on_port() -> Result<(), String> {
    kill_gateway_on_port_internal().await
}
