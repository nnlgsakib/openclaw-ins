use serde::{Deserialize, Serialize};

use crate::error::AppError;

/// Result of config validation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigValidationResult {
    pub valid: bool,
    pub errors: Vec<ValidationError>,
}

/// A single validation error with field path and message.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationError {
    pub field: String,
    pub message: String,
}

/// Read the OpenClaw configuration file.
///
/// Returns the raw JSON config as a serde_json::Value.
/// The config file is JSON5 at ~/.openclaw/openclaw.json.
#[tauri::command]
pub async fn read_config() -> Result<serde_json::Value, AppError> {
    let config_path = dirs::home_dir()
        .ok_or_else(|| AppError::ConfigError {
            message: "Cannot determine home directory".into(),
            suggestion: "Check that HOME environment variable is set.".into(),
        })?
        .join(".openclaw")
        .join("openclaw.json");

    if !config_path.exists() {
        return Ok(serde_json::json!({}));
    }

    let content =
        tokio::fs::read_to_string(&config_path)
            .await
            .map_err(|e| AppError::ConfigError {
                message: format!("Cannot read config: {e}"),
                suggestion: "Check file permissions on ~/.openclaw/openclaw.json".into(),
            })?;

    // Parse as JSON5 (strip comments, trailing commas)
    let cleaned = strip_json5_comments(&content);
    serde_json::from_str(&cleaned).map_err(|e| AppError::ConfigError {
        message: format!("Invalid JSON: {e}"),
        suggestion: "The config file has syntax errors. Fix the JSON or delete it to start fresh."
            .into(),
    })
}

/// Write the OpenClaw configuration file.
///
/// Accepts any JSON value and writes it to ~/.openclaw/openclaw.json.
/// Uses atomic write: writes to temp file first, then renames.
#[tauri::command]
pub async fn write_config(config: serde_json::Value) -> Result<(), AppError> {
    let config_dir = dirs::home_dir()
        .ok_or_else(|| AppError::ConfigError {
            message: "Cannot determine home directory".into(),
            suggestion: "Check HOME env var.".into(),
        })?
        .join(".openclaw");

    tokio::fs::create_dir_all(&config_dir)
        .await
        .map_err(|e| AppError::ConfigError {
            message: format!("Cannot create config directory: {e}"),
            suggestion: "Check permissions on your home directory.".into(),
        })?;

    let config_path = config_dir.join("openclaw.json");
    let tmp_path = config_dir.join("openclaw.json.tmp");

    let json = serde_json::to_string_pretty(&config).map_err(|e| AppError::ConfigError {
        message: format!("Cannot serialize config: {e}"),
        suggestion: "Config contains invalid values. Try resetting to defaults.".into(),
    })?;

    tokio::fs::write(&tmp_path, &json)
        .await
        .map_err(|e| AppError::ConfigError {
            message: format!("Cannot write temp config: {e}"),
            suggestion: "Check disk space and file permissions.".into(),
        })?;

    tokio::fs::rename(&tmp_path, &config_path)
        .await
        .map_err(|e| AppError::ConfigError {
            message: format!("Cannot finalize config: {e}"),
            suggestion: "The config write failed. Check file permissions.".into(),
        })
}

/// Validate the OpenClaw configuration without writing it.
///
/// Performs basic structural validation on the config.
#[tauri::command]
pub async fn validate_config(
    config: serde_json::Value,
) -> Result<ConfigValidationResult, AppError> {
    let mut errors = Vec::new();

    // Validate agents.defaults.model if present
    if let Some(agents) = config.get("agents") {
        if let Some(defaults) = agents.get("defaults") {
            if let Some(model) = defaults.get("model") {
                if model.is_string() {
                    let model_str = model.as_str().unwrap();
                    if model_str.trim().is_empty() {
                        errors.push(ValidationError {
                            field: "agents.defaults.model".into(),
                            message: "Model name cannot be empty.".into(),
                        });
                    }
                } else if model.is_object() {
                    if let Some(primary) = model.get("primary") {
                        if primary.as_str().is_none_or(|s| s.trim().is_empty()) {
                            errors.push(ValidationError {
                                field: "agents.defaults.model.primary".into(),
                                message: "Primary model cannot be empty.".into(),
                            });
                        }
                    }
                }
            }

            // Validate sandbox config
            if let Some(sandbox) = defaults.get("sandbox") {
                if let Some(mode) = sandbox.get("mode") {
                    let valid_modes = ["off", "non-main", "all"];
                    if let Some(mode_str) = mode.as_str() {
                        if !valid_modes.contains(&mode_str) {
                            errors.push(ValidationError {
                                field: "agents.defaults.sandbox.mode".into(),
                                message: format!(
                                    "Invalid sandbox mode '{mode_str}'. Valid: {}",
                                    valid_modes.join(", ")
                                ),
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(ConfigValidationResult {
        valid: errors.is_empty(),
        errors,
    })
}

/// Strip JSON5 comments and trailing commas for basic compatibility.
fn strip_json5_comments(input: &str) -> String {
    let mut result = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();
    let mut in_string = false;
    let mut escape_next = false;

    while let Some(c) = chars.next() {
        if escape_next {
            result.push(c);
            escape_next = false;
            continue;
        }

        if c == '\\' && in_string {
            result.push(c);
            escape_next = true;
            continue;
        }

        if c == '"' {
            in_string = !in_string;
            result.push(c);
            continue;
        }

        if in_string {
            result.push(c);
            continue;
        }

        // Line comment
        if c == '/' && chars.peek() == Some(&'/') {
            for ch in chars.by_ref() {
                if ch == '\n' {
                    result.push('\n');
                    break;
                }
            }
            continue;
        }

        // Block comment
        if c == '/' && chars.peek() == Some(&'*') {
            chars.next(); // consume *
            loop {
                match chars.next() {
                    Some('*') if chars.peek() == Some(&'/') => {
                        chars.next();
                        break;
                    }
                    Some('\n') => result.push('\n'),
                    None => break,
                    _ => {}
                }
            }
            continue;
        }

        result.push(c);
    }

    // Remove trailing commas (simple: ,\s*} or ,\s*])
    regex_trailing_comma(&result)
}

fn regex_trailing_comma(input: &str) -> String {
    // Simple trailing comma removal without regex crate
    let mut result = String::with_capacity(input.len());
    let bytes = input.as_bytes();
    let len = bytes.len();
    let mut i = 0;

    while i < len {
        if bytes[i] == b',' {
            // Look ahead for whitespace then } or ]
            let mut j = i + 1;
            while j < len
                && (bytes[j] == b' ' || bytes[j] == b'\t' || bytes[j] == b'\n' || bytes[j] == b'\r')
            {
                j += 1;
            }
            if j < len && (bytes[j] == b'}' || bytes[j] == b']') {
                // Skip the comma
                i += 1;
                continue;
            }
        }
        result.push(bytes[i] as char);
        i += 1;
    }

    result
}
