use reqwest;
use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::commands::monitoring::get_openclaw_status;
use crate::commands::monitoring::OpenClawStatus;

// ─── Types ────────────────────────────────────────────────────────

/// Channel connection status.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ChannelStatus {
    Connected,
    Disconnected,
    Expired,
    Connecting,
}

/// Supported channel types.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ChannelType {
    WhatsApp,
    Telegram,
    Discord,
    Slack,
}

/// Information about a messaging channel.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelInfo {
    pub id: String,
    pub name: String,
    pub channel_type: ChannelType,
    pub status: ChannelStatus,
    pub last_active_at: Option<String>,
}

/// Result of a token validation attempt.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenValidationResult {
    pub valid: bool,
    pub message: String,
}

/// WhatsApp QR code data.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WhatsAppQrData {
    pub qr_code: String,
    pub expires_at: Option<String>,
}

/// Contact status for access control.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ContactStatus {
    Approved,
    Pending,
    Blocked,
}

/// A contact who can message the agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Contact {
    pub id: String,
    pub name: String,
    pub channel_type: ChannelType,
    pub status: ContactStatus,
    pub last_message_at: Option<String>,
}

/// A message activity entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEntry {
    pub id: String,
    pub sender: String,
    pub channel_type: ChannelType,
    pub preview: String,
    pub timestamp: String,
}

// ─── Commands ─────────────────────────────────────────────────────

/// Fetch all available channels from OpenClaw.
///
/// Returns a list of channels with their connection status.
/// Returns empty Vec if OpenClaw is not running or the API is unavailable.
#[tauri::command]
pub async fn get_channels() -> Result<Vec<ChannelInfo>, AppError> {
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

    let url = format!("http://localhost:{}/api/channels", port);

    match client.get(&url).send().await {
        Ok(resp) => match resp.json::<Vec<ChannelInfo>>().await {
            Ok(channels) => Ok(channels),
            Err(_) => Ok(get_default_channels()),
        },
        Err(_) => Ok(get_default_channels()),
    }
}

/// Disconnect a channel by ID.
///
/// Calls the OpenClaw API to disconnect the specified channel.
/// Returns the updated channel info on success.
#[tauri::command]
pub async fn disconnect_channel(channel_id: String) -> Result<ChannelInfo, AppError> {
    let status = get_openclaw_status().await?;

    let port = match status {
        OpenClawStatus::Running { port, .. } => port,
        _ => return Err(AppError::Internal {
            message: "OpenClaw is not running".into(),
            suggestion: "Start OpenClaw before managing channels.".into(),
        }),
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| AppError::Internal {
            message: format!("Failed to build HTTP client: {}", e),
            suggestion: "This is an internal error. Please report it.".into(),
        })?;

    let url = format!("http://localhost:{}/api/channels/{}/disconnect", port, channel_id);

    match client.post(&url).send().await {
        Ok(resp) => match resp.json::<ChannelInfo>().await {
            Ok(channel) => Ok(channel),
            Err(_) => Ok(ChannelInfo {
                id: channel_id.clone(),
                name: channel_id,
                channel_type: ChannelType::WhatsApp,
                status: ChannelStatus::Disconnected,
                last_active_at: None,
            }),
        },
        Err(e) => Err(AppError::Internal {
            message: format!("Failed to disconnect channel: {}", e),
            suggestion: "Check that OpenClaw is running and try again.".into(),
        }),
    }
}

/// Initiate connection for a channel by ID.
///
/// Calls the OpenClaw API to start the channel pairing process.
/// Returns the updated channel info with 'connecting' status.
#[tauri::command]
pub async fn connect_channel(channel_id: String) -> Result<ChannelInfo, AppError> {
    let status = get_openclaw_status().await?;

    let port = match status {
        OpenClawStatus::Running { port, .. } => port,
        _ => return Err(AppError::Internal {
            message: "OpenClaw is not running".into(),
            suggestion: "Start OpenClaw before managing channels.".into(),
        }),
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| AppError::Internal {
            message: format!("Failed to build HTTP client: {}", e),
            suggestion: "This is an internal error. Please report it.".into(),
        })?;

    let url = format!("http://localhost:{}/api/channels/{}/connect", port, channel_id);

    match client.post(&url).send().await {
        Ok(resp) => match resp.json::<ChannelInfo>().await {
            Ok(channel) => Ok(channel),
            Err(_) => Ok(ChannelInfo {
                id: channel_id.clone(),
                name: channel_id,
                channel_type: ChannelType::WhatsApp,
                status: ChannelStatus::Connecting,
                last_active_at: None,
            }),
        },
        Err(e) => Err(AppError::Internal {
            message: format!("Failed to connect channel: {}", e),
            suggestion: "Check that OpenClaw is running and try again.".into(),
        }),
    }
}

/// Fetch WhatsApp QR code for pairing.
///
/// Returns a base64-encoded QR code image data URL.
/// Returns an error if OpenClaw is not running.
#[tauri::command]
pub async fn get_whatsapp_qr() -> Result<WhatsAppQrData, AppError> {
    let status = get_openclaw_status().await?;

    let port = match status {
        OpenClawStatus::Running { port, .. } => port,
        _ => return Err(AppError::Internal {
            message: "OpenClaw is not running".into(),
            suggestion: "Start OpenClaw before pairing WhatsApp.".into(),
        }),
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| AppError::Internal {
            message: format!("Failed to build HTTP client: {}", e),
            suggestion: "This is an internal error. Please report it.".into(),
        })?;

    let url = format!("http://localhost:{}/api/channels/whatsapp/qr", port);

    match client.get(&url).send().await {
        Ok(resp) => match resp.json::<WhatsAppQrData>().await {
            Ok(data) => Ok(data),
            Err(_) => Ok(WhatsAppQrData {
                qr_code: String::new(),
                expires_at: None,
            }),
        },
        Err(e) => Err(AppError::Internal {
            message: format!("Failed to fetch WhatsApp QR code: {}", e),
            suggestion: "Check that OpenClaw is running and try again.".into(),
        }),
    }
}

/// Validate a Telegram bot token.
///
/// Checks token format before sending to OpenClaw for verification.
#[tauri::command]
pub async fn validate_telegram_token(token: String) -> Result<TokenValidationResult, AppError> {
    if token.trim().is_empty() {
        return Ok(TokenValidationResult {
            valid: false,
            message: "Token cannot be empty.".into(),
        });
    }

    let parts: Vec<&str> = token.split(':').collect();
    if parts.len() != 2 || parts[0].is_empty() || parts[1].is_empty() {
        return Ok(TokenValidationResult {
            valid: false,
            message: "Invalid token format. Expected: numeric_id:alphanumeric_token".into(),
        });
    }

    if !parts[0].chars().all(|c| c.is_ascii_digit()) {
        return Ok(TokenValidationResult {
            valid: false,
            message: "Bot ID must be numeric.".into(),
        });
    }

    let status = get_openclaw_status().await?;
    let port = match status {
        OpenClawStatus::Running { port, .. } => port,
        _ => return Ok(TokenValidationResult {
            valid: false,
            message: "OpenClaw is not running. Start it first.".into(),
        }),
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| AppError::Internal {
            message: format!("Failed to build HTTP client: {}", e),
            suggestion: "This is an internal error. Please report it.".into(),
        })?;

    let url = format!("http://localhost:{}/api/channels/telegram/validate", port);

    match client.post(&url).json(&serde_json::json!({ "token": token })).send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                Ok(TokenValidationResult {
                    valid: true,
                    message: "Token validated successfully.".into(),
                })
            } else {
                Ok(TokenValidationResult {
                    valid: false,
                    message: "Token rejected by Telegram API. Check that the token is correct.".into(),
                })
            }
        }
        Err(_) => Ok(TokenValidationResult {
            valid: false,
            message: "Could not reach OpenClaw API. Ensure OpenClaw is running.".into(),
        }),
    }
}

/// Validate a Discord bot token.
///
/// Checks token format before sending to OpenClaw for verification.
#[tauri::command]
pub async fn validate_discord_token(token: String) -> Result<TokenValidationResult, AppError> {
    if token.trim().is_empty() {
        return Ok(TokenValidationResult {
            valid: false,
            message: "Token cannot be empty.".into(),
        });
    }

    if token.len() < 50 {
        return Ok(TokenValidationResult {
            valid: false,
            message: "Discord tokens are typically 70+ characters. Double-check your token.".into(),
        });
    }

    let status = get_openclaw_status().await?;
    let port = match status {
        OpenClawStatus::Running { port, .. } => port,
        _ => return Ok(TokenValidationResult {
            valid: false,
            message: "OpenClaw is not running. Start it first.".into(),
        }),
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| AppError::Internal {
            message: format!("Failed to build HTTP client: {}", e),
            suggestion: "This is an internal error. Please report it.".into(),
        })?;

    let url = format!("http://localhost:{}/api/channels/discord/validate", port);

    match client.post(&url).json(&serde_json::json!({ "token": token })).send().await {
        Ok(resp) => {
            if resp.status().is_success() {
                Ok(TokenValidationResult {
                    valid: true,
                    message: "Token validated successfully.".into(),
                })
            } else {
                Ok(TokenValidationResult {
                    valid: false,
                    message: "Token rejected by Discord API. Check that the token is correct.".into(),
                })
            }
        }
        Err(_) => Ok(TokenValidationResult {
            valid: false,
            message: "Could not reach OpenClaw API. Ensure OpenClaw is running.".into(),
        }),
    }
}

/// Fetch all contacts from OpenClaw.
///
/// Returns contacts with their approval status.
/// Returns empty Vec if OpenClaw is not running.
#[tauri::command]
pub async fn get_contacts() -> Result<Vec<Contact>, AppError> {
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

    let url = format!("http://localhost:{}/api/contacts", port);

    match client.get(&url).send().await {
        Ok(resp) => match resp.json::<Vec<Contact>>().await {
            Ok(contacts) => Ok(contacts),
            Err(_) => Ok(vec![]),
        },
        Err(_) => Ok(vec![]),
    }
}

/// Update a contact's status (approve, deny, block, unblock).
#[tauri::command]
pub async fn update_contact_status(
    contact_id: String,
    new_status: String,
) -> Result<Contact, AppError> {
    let status = get_openclaw_status().await?;

    let port = match status {
        OpenClawStatus::Running { port, .. } => port,
        _ => return Err(AppError::Internal {
            message: "OpenClaw is not running".into(),
            suggestion: "Start OpenClaw before managing contacts.".into(),
        }),
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| AppError::Internal {
            message: format!("Failed to build HTTP client: {}", e),
            suggestion: "This is an internal error. Please report it.".into(),
        })?;

    let url = format!("http://localhost:{}/api/contacts/{}/status", port, contact_id);

    match client
        .put(&url)
        .json(&serde_json::json!({ "status": new_status }))
        .send()
        .await
    {
        Ok(resp) => match resp.json::<Contact>().await {
            Ok(contact) => Ok(contact),
            Err(_) => Err(AppError::Internal {
                message: "Failed to parse contact response".into(),
                suggestion: "Try again. If the problem persists, check OpenClaw logs.".into(),
            }),
        },
        Err(e) => Err(AppError::Internal {
            message: format!("Failed to update contact: {}", e),
            suggestion: "Check that OpenClaw is running and try again.".into(),
        }),
    }
}

/// Fetch recent message activity from OpenClaw.
///
/// Returns activity entries across all channels.
/// Returns empty Vec if OpenClaw is not running.
#[tauri::command]
pub async fn get_activity() -> Result<Vec<ActivityEntry>, AppError> {
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

    let url = format!("http://localhost:{}/api/activity", port);

    match client.get(&url).send().await {
        Ok(resp) => match resp.json::<Vec<ActivityEntry>>().await {
            Ok(entries) => Ok(entries),
            Err(_) => Ok(vec![]),
        },
        Err(_) => Ok(vec![]),
    }
}

// ─── Private helpers ──────────────────────────────────────────────

/// Return default channel list when OpenClaw API is unavailable.
/// Shows all supported channel types as disconnected.
fn get_default_channels() -> Vec<ChannelInfo> {
    vec![
        ChannelInfo {
            id: "whatsapp".into(),
            name: "WhatsApp".into(),
            channel_type: ChannelType::WhatsApp,
            status: ChannelStatus::Disconnected,
            last_active_at: None,
        },
        ChannelInfo {
            id: "telegram".into(),
            name: "Telegram".into(),
            channel_type: ChannelType::Telegram,
            status: ChannelStatus::Disconnected,
            last_active_at: None,
        },
        ChannelInfo {
            id: "discord".into(),
            name: "Discord".into(),
            channel_type: ChannelType::Discord,
            status: ChannelStatus::Disconnected,
            last_active_at: None,
        },
        ChannelInfo {
            id: "slack".into(),
            name: "Slack".into(),
            channel_type: ChannelType::Slack,
            status: ChannelStatus::Disconnected,
            last_active_at: None,
        },
    ]
}
