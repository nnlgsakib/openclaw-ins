use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Desktop app configuration stored at ~/.clawstation/config.json.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DesktopConfig {
    pub workspace_path: Option<String>,
    pub gateway_port: Option<u16>,
    pub api_key: Option<String>,
    pub api_key_env: Option<String>,
    pub selected_provider: Option<String>,
    pub selected_model: Option<String>,
}

/// Auth profile entry for OpenClaw's auth-profiles.json.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthProfile {
    pub provider: String,
    #[serde(rename = "mode")]
    pub mode: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
}

fn desktop_config_path() -> Result<std::path::PathBuf, String> {
    let home = dirs::home_dir().ok_or("Cannot determine home directory")?;
    Ok(home.join(".clawstation").join("config.json"))
}

fn auth_profiles_path() -> Result<std::path::PathBuf, String> {
    let home = dirs::home_dir().ok_or("Cannot determine home directory")?;
    Ok(home.join(".openclaw").join("agents").join("main").join("agent").join("auth-profiles.json"))
}

/// Read the desktop config.
#[tauri::command]
pub async fn read_desktop_config() -> Result<DesktopConfig, String> {
    let path = desktop_config_path()?;
    if !path.exists() {
        return Ok(DesktopConfig::default());
    }
    let content = tokio::fs::read_to_string(&path).await.map_err(|e| format!("{e}"))?;
    serde_json::from_str(&content).map_err(|e| format!("{e}"))
}

/// Write the desktop config.
#[tauri::command]
pub async fn write_desktop_config(config: DesktopConfig) -> Result<(), String> {
    let path = desktop_config_path()?;
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent).await.map_err(|e| format!("{e}"))?;
    }
    let json = serde_json::to_string_pretty(&config).map_err(|e| format!("{e}"))?;
    tokio::fs::write(&path, json).await.map_err(|e| format!("{e}"))
}

/// Write API key to OpenClaw's auth-profiles.json so the gateway can find it.
///
/// This writes to ~/.openclaw/agents/main/agent/auth-profiles.json
/// which is where OpenClaw reads provider credentials from.
#[tauri::command]
pub async fn write_auth_profile(
    provider: String,
    api_key: String,
    mode: Option<String>,
) -> Result<(), String> {
    let path = auth_profiles_path()?;
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent).await.map_err(|e| format!("{e}"))?;
    }

    let mode = mode.unwrap_or_else(|| "api_key".to_string());

    // Read existing profiles
    let mut profiles: HashMap<String, AuthProfile> = if path.exists() {
        let content = tokio::fs::read_to_string(&path).await.map_err(|e| format!("{e}"))?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        HashMap::new()
    };

    // Create/update profile
    let profile_key = format!("{provider}:default");
    profiles.insert(profile_key, AuthProfile {
        provider: provider.clone(),
        mode: mode.clone(),
        key: if mode == "api_key" { Some(api_key.clone()) } else { None },
        token: if mode == "token" { Some(api_key) } else { None },
    });

    let json = serde_json::to_string_pretty(&profiles).map_err(|e| format!("{e}"))?;
    tokio::fs::write(&path, json).await.map_err(|e| format!("{e}"))
}

/// Write API key to OpenClaw's .env file so the gateway process can read it.
///
/// This writes to ~/.openclaw/.env with the provider's env var name.
#[tauri::command]
pub async fn write_env_key(env_var: String, value: String) -> Result<(), String> {
    let home = dirs::home_dir().ok_or("Cannot determine home directory")?;
    let env_path = home.join(".openclaw").join(".env");

    if let Some(parent) = env_path.parent() {
        tokio::fs::create_dir_all(parent).await.map_err(|e| format!("{e}"))?;
    }

    let mut content = if env_path.exists() {
        tokio::fs::read_to_string(&env_path).await.map_err(|e| format!("{e}"))?
    } else {
        String::new()
    };

    // Update or append the env var
    let line = format!("{env_var}={value}\n");
    if content.contains(&format!("{env_var}=")) {
        // Replace existing line
        let mut lines: Vec<String> = content.lines().map(String::from).collect();
        for l in &mut lines {
            if l.starts_with(&format!("{env_var}=")) {
                *l = format!("{env_var}={value}");
            }
        }
        content = lines.join("\n") + "\n";
    } else {
        content.push_str(&line);
    }

    tokio::fs::write(&env_path, content).await.map_err(|e| format!("{e}"))
}

/// Get the workspace path from desktop config, or default.
pub async fn get_workspace_path() -> String {
    let config = read_desktop_config().await.unwrap_or_default();
    config.workspace_path.unwrap_or_else(|| "~/.openclaw/workspace".to_string())
}
