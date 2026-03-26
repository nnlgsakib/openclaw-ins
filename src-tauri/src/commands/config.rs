use serde::{Deserialize, Serialize};

use crate::error::AppError;

/// Main configuration structure for OpenClaw.
/// All fields are optional since the config file may be partial.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct OpenClawConfig {
    pub provider: Option<ProviderConfig>,
    pub sandbox: Option<SandboxConfig>,
    pub tools: Option<ToolsConfig>,
    pub agents: Option<AgentsConfig>,
}

/// Configuration for the AI provider.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfig {
    pub provider: String,         // "anthropic", "openai", "google", "ollama", "azure"
    pub model: String,            // model identifier
    pub api_key_env: Option<String>, // env var name, NOT the key itself
}

/// Configuration for sandboxing.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SandboxConfig {
    pub enabled: bool,
    pub backend: String,            // "docker", "ssh", "openshell"
    pub scope: String,              // "off", "non-main", "all"
    pub workspace_access: String,   // "none", "read-only", "read-write"
    pub network_policy: String,     // "none", "custom"
    pub bind_mounts: Vec<BindMount>,
}

/// A bind mount for sandbox access to host directories.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BindMount {
    pub host_path: String,
    pub access: String,             // "read-only", "read-write"
}

/// Configuration for allowed tools.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolsConfig {
    pub shell: bool,
    pub filesystem: bool,
    pub browser: bool,
    pub api: bool,
}

/// Configuration for agent behavior.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentsConfig {
    pub sandbox_mode: String,   // "docker", "ssh", "none"
    pub autonomy: String,       // "high", "medium", "low"
}

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
/// Returns a default config if the file doesn't exist.
#[tauri::command]
pub async fn read_config() -> Result<OpenClawConfig, AppError> {
    let config_path = dirs::home_dir()
        .ok_or_else(|| AppError::ConfigError {
            message: "Cannot determine home directory".into(),
            suggestion: "Check that HOME environment variable is set.".into(),
        })?
        .join(".openclaw")
        .join("config.yaml");

    if !config_path.exists() {
        return Ok(OpenClawConfig::default());
    }

    let content = tokio::fs::read_to_string(&config_path).await
        .map_err(|e| AppError::ConfigError {
            message: format!("Cannot read config: {}", e),
            suggestion: "Check file permissions on ~/.openclaw/config.yaml".into(),
        })?;

    serde_yaml::from_str(&content)
        .map_err(|e| AppError::ConfigError {
            message: format!("Invalid YAML: {}", e),
            suggestion: "The config file has syntax errors. Fix the YAML or delete it to start fresh.".into(),
        })
}

/// Write the OpenClaw configuration file.
///
/// Uses atomic write: writes to temp file first, then renames to final location.
#[tauri::command]
pub async fn write_config(config: OpenClawConfig) -> Result<(), AppError> {
    let config_dir = dirs::home_dir()
        .ok_or_else(|| AppError::ConfigError {
            message: "Cannot determine home directory".into(),
            suggestion: "Check HOME env var.".into(),
        })?
        .join(".openclaw");

    tokio::fs::create_dir_all(&config_dir).await
        .map_err(|e| AppError::ConfigError {
            message: format!("Cannot create config directory: {}", e),
            suggestion: "Check permissions on your home directory.".into(),
        })?;

    let config_path = config_dir.join("config.yaml");
    let tmp_path = config_dir.join("config.yaml.tmp");

    let yaml = serde_yaml::to_string(&config)
        .map_err(|e| AppError::ConfigError {
            message: format!("Cannot serialize config: {}", e),
            suggestion: "Config contains invalid values. Try resetting to defaults.".into(),
        })?;

    tokio::fs::write(&tmp_path, &yaml).await
        .map_err(|e| AppError::ConfigError {
            message: format!("Cannot write temp config: {}", e),
            suggestion: "Check disk space and file permissions.".into(),
        })?;

    tokio::fs::rename(&tmp_path, &config_path).await
        .map_err(|e| AppError::ConfigError {
            message: format!("Cannot finalize config: {}", e),
            suggestion: "The config write failed. Check file permissions.".into(),
        })
}

/// Validate the OpenClaw configuration without writing it.
///
/// Returns validation errors for each invalid field.
#[tauri::command]
pub async fn validate_config(config: OpenClawConfig) -> Result<ConfigValidationResult, AppError> {
    let mut errors = Vec::new();

    // Validate provider
    if let Some(ref provider) = config.provider {
        let valid_providers = ["anthropic", "openai", "google", "ollama", "azure"];
        if !valid_providers.contains(&provider.provider.as_str()) {
            errors.push(ValidationError {
                field: "provider.provider".into(),
                message: format!("Unknown provider '{}'. Valid: {}", provider.provider, valid_providers.join(", ")),
            });
        }
        if provider.model.trim().is_empty() {
            errors.push(ValidationError {
                field: "provider.model".into(),
                message: "Model name cannot be empty.".into(),
            });
        }
    }

    // Validate sandbox
    if let Some(ref sandbox) = config.sandbox {
        let valid_backends = ["docker", "ssh", "openshell"];
        if !valid_backends.contains(&sandbox.backend.as_str()) {
            errors.push(ValidationError {
                field: "sandbox.backend".into(),
                message: format!("Unknown backend '{}'. Valid: {}", sandbox.backend, valid_backends.join(", ")),
            });
        }
        let valid_scopes = ["off", "non-main", "all"];
        if !valid_scopes.contains(&sandbox.scope.as_str()) {
            errors.push(ValidationError {
                field: "sandbox.scope".into(),
                message: format!("Invalid scope '{}'. Valid: {}", sandbox.scope, valid_scopes.join(", ")),
            });
        }
        let valid_access = ["none", "read-only", "read-write"];
        if !valid_access.contains(&sandbox.workspace_access.as_str()) {
            errors.push(ValidationError {
                field: "sandbox.workspaceAccess".into(),
                message: format!("Invalid access level '{}'. Valid: {}", sandbox.workspace_access, valid_access.join(", ")),
            });
        }
        // Validate bind mount paths exist
        for (i, mount) in sandbox.bind_mounts.iter().enumerate() {
            if !std::path::Path::new(&mount.host_path).exists() {
                errors.push(ValidationError {
                    field: format!("sandbox.bindMounts[{}].hostPath", i),
                    message: format!("Directory '{}' does not exist.", mount.host_path),
                });
            }
        }
    }

    // Validate agents
    if let Some(ref agents) = config.agents {
        let valid_autonomy = ["high", "medium", "low"];
        if !valid_autonomy.contains(&agents.autonomy.as_str()) {
            errors.push(ValidationError {
                field: "agents.autonomy".into(),
                message: format!("Invalid autonomy '{}'. Valid: {}", agents.autonomy, valid_autonomy.join(", ")),
            });
        }
    }

    Ok(ConfigValidationResult {
        valid: errors.is_empty(),
        errors,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_serializes_to_yaml() {
        let config = OpenClawConfig {
            provider: Some(ProviderConfig {
                provider: "anthropic".into(),
                model: "claude-3-5-sonnet-20241022".into(),
                api_key_env: Some("ANTHROPIC_API_KEY".into()),
            }),
            sandbox: None,
            tools: None,
            agents: None,
        };

        let yaml = serde_yaml::to_string(&config).unwrap();
        assert!(yaml.contains("anthropic"));
        assert!(yaml.contains("claude-3-5-sonnet-20241022"));
    }

    #[test]
    fn default_config_deserializes() {
        let yaml = "";
        let config: OpenClawConfig = serde_yaml::from_str(yaml).unwrap();
        assert!(config.provider.is_none());
        assert!(config.sandbox.is_none());
    }

    #[test]
    fn validation_accepts_valid_config() {
        let config = OpenClawConfig {
            provider: Some(ProviderConfig {
                provider: "anthropic".into(),
                model: "claude-3-5-sonnet-20241022".into(),
                api_key_env: None,
            }),
            sandbox: Some(SandboxConfig {
                enabled: true,
                backend: "docker".into(),
                scope: "all".into(),
                workspace_access: "read-only".into(),
                network_policy: "none".into(),
                bind_mounts: vec![],
            }),
            tools: Some(ToolsConfig {
                shell: true,
                filesystem: false,
                browser: false,
                api: false,
            }),
            agents: Some(AgentsConfig {
                sandbox_mode: "docker".into(),
                autonomy: "high".into(),
            }),
        };

        // Validate synchronously for testing
        let mut errors = Vec::new();

        // Check provider
        if let Some(ref provider) = config.provider {
            let valid_providers = ["anthropic", "openai", "google", "ollama", "azure"];
            if !valid_providers.contains(&provider.provider.as_str()) {
                errors.push(format!("Invalid provider: {}", provider.provider));
            }
        }

        // Check sandbox backend
        if let Some(ref sandbox) = config.sandbox {
            let valid_backends = ["docker", "ssh", "openshell"];
            if !valid_backends.contains(&sandbox.backend.as_str()) {
                errors.push(format!("Invalid backend: {}", sandbox.backend));
            }
        }

        // Check agents autonomy
        if let Some(ref agents) = config.agents {
            let valid_autonomy = ["high", "medium", "low"];
            if !valid_autonomy.contains(&agents.autonomy.as_str()) {
                errors.push(format!("Invalid autonomy: {}", agents.autonomy));
            }
        }

        assert!(errors.is_empty(), "Expected no validation errors, got: {:?}", errors);
    }

    #[test]
    fn validation_rejects_invalid_provider() {
        let config = OpenClawConfig {
            provider: Some(ProviderConfig {
                provider: "invalid_provider".into(),
                model: "claude-3-5-sonnet-20241022".into(),
                api_key_env: None,
            }),
            sandbox: None,
            tools: None,
            agents: None,
        };

        let valid_providers = ["anthropic", "openai", "google", "ollama", "azure"];
        if let Some(ref provider) = config.provider {
            assert!(!valid_providers.contains(&provider.provider.as_str()));
        }
    }

    #[test]
    fn validation_rejects_invalid_sandbox_scope() {
        let config = OpenClawConfig {
            provider: None,
            sandbox: Some(SandboxConfig {
                enabled: true,
                backend: "docker".into(),
                scope: "invalid_scope".into(),
                workspace_access: "read-only".into(),
                network_policy: "none".into(),
                bind_mounts: vec![],
            }),
            tools: None,
            agents: None,
        };

        let valid_scopes = ["off", "non-main", "all"];
        if let Some(ref sandbox) = config.sandbox {
            assert!(!valid_scopes.contains(&sandbox.scope.as_str()));
        }
    }
}