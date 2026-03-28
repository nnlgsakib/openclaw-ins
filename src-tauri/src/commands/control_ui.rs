use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

/// Read the gateway auth token from the OpenClaw config file.
async fn read_gateway_token() -> Option<String> {
    let config_path = dirs::home_dir()?.join(".openclaw").join("openclaw.json");
    let content = tokio::fs::read_to_string(&config_path).await.ok()?;
    let json: serde_json::Value = serde_json::from_str(&content).ok()?;
    json.get("gateway")
        .and_then(|g| g.get("auth"))
        .and_then(|a| a.get("token"))
        .and_then(|t| t.as_str())
        .map(|s| s.to_string())
}

/// Open the OpenClaw Control UI in a new Tauri webview window.
/// Automatically reads the gateway auth token from config and injects it.
#[tauri::command]
pub async fn open_control_ui(app: tauri::AppHandle) -> Result<(), String> {
    // Focus existing window if already open
    if let Some(existing) = app.get_webview_window("control-ui") {
        existing.set_focus().map_err(|e| format!("{e}"))?;
        return Ok(());
    }

    // Build URL with token if available
    let url_str = match read_gateway_token().await {
        Some(token) => format!("http://127.0.0.1:18789?token={token}"),
        None => "http://127.0.0.1:18789".to_string(),
    };

    let url = WebviewUrl::External(url_str.parse().map_err(|e| format!("{e}"))?);

    WebviewWindowBuilder::new(&app, "control-ui", url)
        .title("OpenClaw Control UI")
        .inner_size(1024.0, 768.0)
        .build()
        .map_err(|e| format!("{e}"))?;

    Ok(())
}

/// Close the Control UI window if it exists.
#[tauri::command]
pub async fn close_control_ui(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("control-ui") {
        window.close().map_err(|e| format!("{e}"))?;
    }
    Ok(())
}
