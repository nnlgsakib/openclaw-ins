use crate::error::AppError;
use serde::{Deserialize, Serialize};

/// Config field metadata for dynamic form generation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigFieldMeta {
    pub key: String,
    pub label: String,
    #[serde(rename = "fieldType")]
    pub field_type: String, // "text", "password", "select", "boolean", "number"
    pub required: bool,
    pub placeholder: Option<String>,
    pub help: Option<String>,
    pub sensitive: bool,
    pub advanced: bool,
    pub enum_values: Option<Vec<String>>,
    pub default: Option<serde_json::Value>,
}

/// Channel metadata with config schema.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelMetadata {
    pub id: String,
    pub name: String,
    pub description: String,
    pub docs_url: String,
    pub config_fields: Vec<ConfigFieldMeta>,
    pub is_builtin: bool,
    pub is_extension: bool,
    pub provider_id: Option<String>,
    pub category: String, // "messaging", "voice", "protocol"
}

/// Model entry for a provider.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelEntry {
    pub id: String,
    pub name: String,
    pub reasoning: bool,
}

/// Provider metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderMetadata {
    pub id: String,
    pub name: String,
    pub description: String,
    pub auth_type: String, // "api-key", "oauth", "none", "token", "aws-sdk"
    pub env_var: String,
    pub key_format: String,
    pub key_placeholder: String,
    pub docs_url: String,
    pub models: Vec<ModelEntry>,
    pub category: String, // "major", "multi-provider", "local", "regional", "other"
    pub is_extension: bool,
}

/// Top-level metadata response.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenClawMetadata {
    pub channels: Vec<ChannelMetadata>,
    pub providers: Vec<ProviderMetadata>,
    pub channel_order: Vec<String>,
}

// ─── Helpers ───────────────────────────────────────────────────────

fn password_field(key: &str, label: &str, required: bool, placeholder: Option<&str>) -> ConfigFieldMeta {
    ConfigFieldMeta {
        key: key.to_string(),
        label: label.to_string(),
        field_type: "password".to_string(),
        required,
        placeholder: placeholder.map(|s| s.to_string()),
        help: None,
        sensitive: true,
        advanced: false,
        enum_values: None,
        default: None,
    }
}

fn text_field(key: &str, label: &str, required: bool, placeholder: Option<&str>) -> ConfigFieldMeta {
    ConfigFieldMeta {
        key: key.to_string(),
        label: label.to_string(),
        field_type: "text".to_string(),
        required,
        placeholder: placeholder.map(|s| s.to_string()),
        help: None,
        sensitive: false,
        advanced: false,
        enum_values: None,
        default: None,
    }
}

fn select_field(key: &str, label: &str, options: Vec<&str>, default: Option<serde_json::Value>) -> ConfigFieldMeta {
    ConfigFieldMeta {
        key: key.to_string(),
        label: label.to_string(),
        field_type: "select".to_string(),
        required: false,
        placeholder: None,
        help: None,
        sensitive: false,
        advanced: false,
        enum_values: Some(options.iter().map(|s| s.to_string()).collect()),
        default,
    }
}

fn bool_field(key: &str, label: &str, default: bool) -> ConfigFieldMeta {
    ConfigFieldMeta {
        key: key.to_string(),
        label: label.to_string(),
        field_type: "boolean".to_string(),
        required: false,
        placeholder: None,
        help: None,
        sensitive: false,
        advanced: false,
        enum_values: None,
        default: Some(serde_json::Value::Bool(default)),
    }
}

// ─── Data: Channels ───────────────────────────────────────────────

fn built_in_channels() -> Vec<ChannelMetadata> {
    vec![
        ChannelMetadata {
            id: "telegram".into(),
            name: "Telegram".into(),
            description: "Connect a Telegram bot via Bot API".into(),
            docs_url: "https://docs.openclaw.ai/channels/telegram".into(),
            config_fields: vec![
                password_field("botToken", "Bot Token", true, Some("123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11")),
                text_field("webhookUrl", "Webhook URL", false, Some("https://your-domain.com/webhook")),
                select_field("allowedUpdates", "Allowed Updates", vec!["message", "edited_message", "channel_post", "edited_channel_post", "inline_query", "callback_query"], None),
                select_field("groupPolicy", "Group Policy", vec!["allowlist", "all", "off"], Some(serde_json::json!("allowlist"))),
                select_field("streaming", "Streaming", vec!["off", "on"], Some(serde_json::json!("off"))),
            ],
            is_builtin: true,
            is_extension: false,
            provider_id: None,
            category: "messaging".into(),
        },
        ChannelMetadata {
            id: "whatsapp".into(),
            name: "WhatsApp".into(),
            description: "Connect via WhatsApp Web pairing".into(),
            docs_url: "https://docs.openclaw.ai/channels/whatsapp".into(),
            config_fields: vec![
                select_field("pairingMethod", "Pairing Method", vec!["qr", "link"], Some(serde_json::json!("qr"))),
                text_field("allowFrom", "Allow From", false, Some("+1234567890 (comma-separated)")),
            ],
            is_builtin: true,
            is_extension: false,
            provider_id: None,
            category: "messaging".into(),
        },
        ChannelMetadata {
            id: "discord".into(),
            name: "Discord".into(),
            description: "Connect a Discord bot".into(),
            docs_url: "https://docs.openclaw.ai/channels/discord".into(),
            config_fields: vec![
                password_field("token", "Bot Token", true, Some("MTIz...")),
                bool_field("previewStreaming", "Preview Streaming", true),
                select_field("rateLimit", "Rate Limit", vec!["relaxed", "normal", "strict"], Some(serde_json::json!("normal"))),
            ],
            is_builtin: true,
            is_extension: false,
            provider_id: None,
            category: "messaging".into(),
        },
        ChannelMetadata {
            id: "slack".into(),
            name: "Slack".into(),
            description: "Connect a Slack app (Socket Mode)".into(),
            docs_url: "https://docs.openclaw.ai/channels/slack".into(),
            config_fields: vec![
                password_field("botToken", "Bot Token", true, Some("xoxb-...")),
                password_field("appToken", "App Token", true, Some("xapp-...")),
                bool_field("socketMode", "Socket Mode", true),
            ],
            is_builtin: true,
            is_extension: false,
            provider_id: None,
            category: "messaging".into(),
        },
        ChannelMetadata {
            id: "signal".into(),
            name: "Signal".into(),
            description: "Requires signal-cli installation".into(),
            docs_url: "https://docs.openclaw.ai/channels/signal".into(),
            config_fields: vec![
                text_field("cliPath", "CLI Path", false, Some("signal-cli")),
                text_field("number", "Phone Number", true, Some("+1234567890")),
                select_field("groupPolicy", "Group Policy", vec!["allowlist", "all", "off"], Some(serde_json::json!("allowlist"))),
            ],
            is_builtin: true,
            is_extension: false,
            provider_id: None,
            category: "messaging".into(),
        },
        ChannelMetadata {
            id: "imessage".into(),
            name: "iMessage".into(),
            description: "Requires macOS with iMessage".into(),
            docs_url: "https://docs.openclaw.ai/channels/imessage".into(),
            config_fields: vec![
                text_field("cliPath", "CLI Path", false, Some("imsg")),
                select_field("groupPolicy", "Group Policy", vec!["allowlist", "all", "off"], Some(serde_json::json!("allowlist"))),
            ],
            is_builtin: true,
            is_extension: false,
            provider_id: None,
            category: "messaging".into(),
        },
        ChannelMetadata {
            id: "irc".into(),
            name: "IRC".into(),
            description: "Internet Relay Chat".into(),
            docs_url: "https://docs.openclaw.ai/channels/irc".into(),
            config_fields: vec![
                text_field("server", "Server", true, Some("irc.libera.chat")),
                text_field("port", "Port", false, Some("6697")),
                text_field("nickname", "Nickname", true, Some("openclaw")),
                text_field("channels", "Channels", false, Some("#openclaw")),
            ],
            is_builtin: true,
            is_extension: false,
            provider_id: None,
            category: "protocol".into(),
        },
        ChannelMetadata {
            id: "googlechat".into(),
            name: "Google Chat".into(),
            description: "Google Chat integration".into(),
            docs_url: "https://docs.openclaw.ai/channels/googlechat".into(),
            config_fields: vec![
                text_field("spaceName", "Space Name", true, None),
            ],
            is_builtin: true,
            is_extension: false,
            provider_id: None,
            category: "messaging".into(),
        },
        ChannelMetadata {
            id: "line".into(),
            name: "LINE".into(),
            description: "LINE messaging platform".into(),
            docs_url: "https://docs.openclaw.ai/channels/line".into(),
            config_fields: vec![
                password_field("channelSecret", "Channel Secret", true, None),
                password_field("channelAccessToken", "Channel Access Token", true, None),
            ],
            is_builtin: true,
            is_extension: false,
            provider_id: None,
            category: "messaging".into(),
        },
    ]
}

fn extension_channels() -> Vec<ChannelMetadata> {
    vec![
        ChannelMetadata {
            id: "msteams".into(),
            name: "Microsoft Teams".into(),
            description: "Microsoft Teams via Bot Framework".into(),
            docs_url: "https://docs.openclaw.ai/channels/msteams".into(),
            config_fields: vec![
                text_field("tenantId", "Tenant ID", false, None),
                text_field("appId", "App ID", true, None),
                password_field("appPassword", "App Password", true, None),
            ],
            is_builtin: false,
            is_extension: true,
            provider_id: Some("msteams".into()),
            category: "messaging".into(),
        },
        ChannelMetadata {
            id: "matrix".into(),
            name: "Matrix".into(),
            description: "Matrix protocol via mautrix".into(),
            docs_url: "https://docs.openclaw.ai/channels/matrix".into(),
            config_fields: vec![
                text_field("homeserver", "Homeserver URL", true, Some("https://matrix.org")),
                password_field("accessToken", "Access Token", true, None),
            ],
            is_builtin: false,
            is_extension: true,
            provider_id: Some("matrix".into()),
            category: "protocol".into(),
        },
        ChannelMetadata {
            id: "mattermost".into(),
            name: "Mattermost".into(),
            description: "Mattermost integration".into(),
            docs_url: "https://docs.openclaw.ai/channels/mattermost".into(),
            config_fields: vec![
                text_field("serverUrl", "Server URL", true, None),
                password_field("token", "Token", true, None),
                text_field("team", "Team", false, None),
            ],
            is_builtin: false,
            is_extension: true,
            provider_id: Some("mattermost".into()),
            category: "messaging".into(),
        },
        ChannelMetadata {
            id: "feishu".into(),
            name: "Feishu".into(),
            description: "Feishu / Lark messaging".into(),
            docs_url: "https://docs.openclaw.ai/channels/feishu".into(),
            config_fields: vec![
                text_field("appId", "App ID", true, None),
                password_field("appSecret", "App Secret", true, None),
            ],
            is_builtin: false,
            is_extension: true,
            provider_id: Some("feishu".into()),
            category: "messaging".into(),
        },
        ChannelMetadata {
            id: "twitch".into(),
            name: "Twitch".into(),
            description: "Twitch chat integration".into(),
            docs_url: "https://docs.openclaw.ai/channels/twitch".into(),
            config_fields: vec![
                text_field("channels", "Channels", true, Some("your-channel")),
                password_field("token", "OAuth Token", true, None),
            ],
            is_builtin: false,
            is_extension: true,
            provider_id: Some("twitch".into()),
            category: "messaging".into(),
        },
        ChannelMetadata {
            id: "nostr".into(),
            name: "Nostr".into(),
            description: "Nostr protocol messaging".into(),
            docs_url: "https://docs.openclaw.ai/channels/nostr".into(),
            config_fields: vec![
                text_field("relay", "Relay URL", true, Some("wss://relay.damus.io")),
                password_field("privateKey", "Private Key (nsec)", true, None),
            ],
            is_builtin: false,
            is_extension: true,
            provider_id: Some("nostr".into()),
            category: "protocol".into(),
        },
        ChannelMetadata {
            id: "bluebubbles".into(),
            name: "BlueBubbles".into(),
            description: "BlueBubbles iMessage bridge".into(),
            docs_url: "https://docs.openclaw.ai/channels/bluebubbles".into(),
            config_fields: vec![
                text_field("serverUrl", "Server URL", true, None),
                password_field("password", "Server Password", true, None),
            ],
            is_builtin: false,
            is_extension: true,
            provider_id: Some("bluebubbles".into()),
            category: "messaging".into(),
        },
        ChannelMetadata {
            id: "synology-chat".into(),
            name: "Synology Chat".into(),
            description: "Synology Chat integration".into(),
            docs_url: "https://docs.openclaw.ai/channels/synology-chat".into(),
            config_fields: vec![
                text_field("serverUrl", "Server URL", true, None),
                password_field("token", "Bot Token", true, None),
            ],
            is_builtin: false,
            is_extension: true,
            provider_id: Some("synology-chat".into()),
            category: "messaging".into(),
        },
        ChannelMetadata {
            id: "nextcloud-talk".into(),
            name: "Nextcloud Talk".into(),
            description: "Nextcloud Talk integration".into(),
            docs_url: "https://docs.openclaw.ai/channels/nextcloud-talk".into(),
            config_fields: vec![
                text_field("serverUrl", "Server URL", true, None),
                password_field("token", "Bot Password", true, None),
            ],
            is_builtin: false,
            is_extension: true,
            provider_id: Some("nextcloud-talk".into()),
            category: "messaging".into(),
        },
        ChannelMetadata {
            id: "zalo".into(),
            name: "Zalo".into(),
            description: "Zalo messaging platform".into(),
            docs_url: "https://docs.openclaw.ai/channels/zalo".into(),
            config_fields: vec![
                text_field("appId", "App ID", true, None),
                password_field("secretKey", "Secret Key", true, None),
            ],
            is_builtin: false,
            is_extension: true,
            provider_id: Some("zalo".into()),
            category: "messaging".into(),
        },
        ChannelMetadata {
            id: "zalouser".into(),
            name: "Zalo User".into(),
            description: "Zalo user account integration".into(),
            docs_url: "https://docs.openclaw.ai/channels/zalouser".into(),
            config_fields: vec![],
            is_builtin: false,
            is_extension: true,
            provider_id: Some("zalouser".into()),
            category: "messaging".into(),
        },
        ChannelMetadata {
            id: "voice-call".into(),
            name: "Voice Call".into(),
            description: "Voice call channel".into(),
            docs_url: "https://docs.openclaw.ai/channels/voice-call".into(),
            config_fields: vec![],
            is_builtin: false,
            is_extension: true,
            provider_id: Some("voice-call".into()),
            category: "voice".into(),
        },
        ChannelMetadata {
            id: "openshell".into(),
            name: "OpenShell".into(),
            description: "Shell-based messaging".into(),
            docs_url: "https://docs.openclaw.ai/channels/openshell".into(),
            config_fields: vec![],
            is_builtin: false,
            is_extension: true,
            provider_id: Some("openshell".into()),
            category: "protocol".into(),
        },
        ChannelMetadata {
            id: "tlon".into(),
            name: "Tlon".into(),
            description: "Tlon messaging".into(),
            docs_url: "https://docs.openclaw.ai/channels/tlon".into(),
            config_fields: vec![],
            is_builtin: false,
            is_extension: true,
            provider_id: Some("tlon".into()),
            category: "messaging".into(),
        },
        ChannelMetadata {
            id: "device-pair".into(),
            name: "Device Pair".into(),
            description: "Device pairing channel".into(),
            docs_url: "https://docs.openclaw.ai/channels/device-pair".into(),
            config_fields: vec![],
            is_builtin: false,
            is_extension: true,
            provider_id: Some("device-pair".into()),
            category: "protocol".into(),
        },
        ChannelMetadata {
            id: "phone-control".into(),
            name: "Phone Control".into(),
            description: "Phone control channel".into(),
            docs_url: "https://docs.openclaw.ai/channels/phone-control".into(),
            config_fields: vec![],
            is_builtin: false,
            is_extension: true,
            provider_id: Some("phone-control".into()),
            category: "protocol".into(),
        },
    ]
}

// ─── Data: Providers ──────────────────────────────────────────────

fn model(id: &str, name: &str) -> ModelEntry {
    ModelEntry { id: id.to_string(), name: name.to_string(), reasoning: false }
}

fn all_providers() -> Vec<ProviderMetadata> {
    vec![
        ProviderMetadata {
            id: "anthropic".into(),
            name: "Anthropic".into(),
            description: "Claude models — best for complex reasoning and code".into(),
            auth_type: "api-key".into(),
            env_var: "ANTHROPIC_API_KEY".into(),
            key_format: "sk-ant-api03-...".into(),
            key_placeholder: "sk-ant-api03-xxxxxxxxxxxx".into(),
            docs_url: "https://docs.anthropic.com/".into(),
            models: vec![
                model("anthropic/claude-opus-4-6", "Claude Opus 4"),
                model("anthropic/claude-sonnet-4-6", "Claude Sonnet 4"),
            ],
            category: "major".into(),
            is_extension: false,
        },
        ProviderMetadata {
            id: "openai".into(),
            name: "OpenAI".into(),
            description: "GPT models — strong general-purpose AI".into(),
            auth_type: "api-key".into(),
            env_var: "OPENAI_API_KEY".into(),
            key_format: "sk-...".into(),
            key_placeholder: "sk-xxxxxxxxxxxxxxxx".into(),
            docs_url: "https://platform.openai.com/".into(),
            models: vec![
                model("openai/gpt-5.4", "GPT-5.4"),
                model("openai/gpt-5.4-pro", "GPT-5.4 Pro"),
                model("openai/gpt-5.2", "GPT-5.2"),
                model("openai/o3", "O3"),
            ],
            category: "major".into(),
            is_extension: false,
        },
        ProviderMetadata {
            id: "google".into(),
            name: "Google Gemini".into(),
            description: "Gemini models — excellent for multimodal tasks".into(),
            auth_type: "api-key".into(),
            env_var: "GEMINI_API_KEY".into(),
            key_format: "AIza...".into(),
            key_placeholder: "AIzaSyxxxxxxxxxxxxxxxxxxx".into(),
            docs_url: "https://ai.google.dev/".into(),
            models: vec![
                model("google/gemini-3.1-pro-preview", "Gemini 3.1 Pro"),
                model("google/gemini-3-flash-preview", "Gemini 3 Flash"),
                model("google/gemini-2.5-pro", "Gemini 2.5 Pro"),
            ],
            category: "major".into(),
            is_extension: false,
        },
        ProviderMetadata {
            id: "openai-codex".into(),
            name: "OpenAI Codex".into(),
            description: "ChatGPT subscription — OAuth login, no API key needed".into(),
            auth_type: "oauth".into(),
            env_var: "".into(),
            key_format: "OAuth (login via openclaw models auth login)".into(),
            key_placeholder: "".into(),
            docs_url: "https://docs.openclaw.ai/providers/opencode".into(),
            models: vec![
                model("openai-codex/gpt-5.4", "GPT-5.4 (Codex)"),
                model("openai-codex/gpt-5.3-codex-spark", "Codex Spark"),
            ],
            category: "major".into(),
            is_extension: false,
        },
        ProviderMetadata {
            id: "anthropic-vertex".into(),
            name: "Anthropic Vertex".into(),
            description: "Anthropic models via Google Cloud Vertex AI".into(),
            auth_type: "aws-sdk".into(),
            env_var: "ANTHROPIC_VERTEX_PROJECT_ID".into(),
            key_format: "GCP project ID".into(),
            key_placeholder: "my-gcp-project".into(),
            docs_url: "https://docs.anthropic.com/en/docs/claude-on-vertex-ai".into(),
            models: vec![
                model("anthropic-vertex/claude-opus-4-6", "Claude Opus 4 (Vertex)"),
                model("anthropic-vertex/claude-sonnet-4-6", "Claude Sonnet 4 (Vertex)"),
            ],
            category: "major".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "openrouter".into(),
            name: "OpenRouter".into(),
            description: "Access 200+ models through one API key".into(),
            auth_type: "api-key".into(),
            env_var: "OPENROUTER_API_KEY".into(),
            key_format: "sk-or-...".into(),
            key_placeholder: "sk-or-v1-xxxxxxxxxxxxxxxx".into(),
            docs_url: "https://openrouter.ai/".into(),
            models: vec![
                model("openrouter/anthropic/claude-sonnet-4-6", "Claude Sonnet (OR)"),
                model("openrouter/openai/gpt-5.2", "GPT-5.2 (OR)"),
                model("openrouter/google/gemini-2.5-pro", "Gemini Pro (OR)"),
            ],
            category: "multi-provider".into(),
            is_extension: false,
        },
        ProviderMetadata {
            id: "kilocode".into(),
            name: "Kilo Gateway".into(),
            description: "Multi-provider gateway by Kilo".into(),
            auth_type: "api-key".into(),
            env_var: "KILOCODE_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "Your Kilo API key".into(),
            docs_url: "https://docs.openclaw.ai/providers/kilocode".into(),
            models: vec![
                model("kilocode/anthropic/claude-opus-4.6", "Claude Opus (Kilo)"),
                model("kilocode/openai/gpt-5.2", "GPT-5.2 (Kilo)"),
            ],
            category: "multi-provider".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "vercel-ai-gateway".into(),
            name: "Vercel AI Gateway".into(),
            description: "Multi-provider gateway by Vercel".into(),
            auth_type: "api-key".into(),
            env_var: "AI_GATEWAY_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "Your Vercel AI Gateway key".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![
                model("vercel-ai-gateway/anthropic/claude-opus-4.6", "Claude Opus (Vercel)"),
            ],
            category: "multi-provider".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "opencode".into(),
            name: "OpenCode".into(),
            description: "OpenCode Zen runtime — multi-model access".into(),
            auth_type: "api-key".into(),
            env_var: "OPENCODE_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "Your OpenCode API key".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![
                model("opencode/claude-opus-4-6", "Claude Opus (OC)"),
                model("opencode/claude-sonnet-4-6", "Claude Sonnet (OC)"),
            ],
            category: "multi-provider".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "github-copilot".into(),
            name: "GitHub Copilot".into(),
            description: "GitHub Copilot models via OAuth".into(),
            auth_type: "oauth".into(),
            env_var: "".into(),
            key_format: "OAuth (login via openclaw models auth login)".into(),
            key_placeholder: "".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![
                model("github-copilot/gpt-5.4", "GPT-5.4 (Copilot)"),
                model("github-copilot/claude-opus-4-6", "Claude Opus (Copilot)"),
            ],
            category: "multi-provider".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "mistral".into(),
            name: "Mistral".into(),
            description: "Mistral models — strong European AI".into(),
            auth_type: "api-key".into(),
            env_var: "MISTRAL_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "Your Mistral API key".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![
                model("mistral/mistral-large-latest", "Mistral Large"),
            ],
            category: "other".into(),
            is_extension: false,
        },
        ProviderMetadata {
            id: "groq".into(),
            name: "Groq".into(),
            description: "Ultra-fast inference hardware".into(),
            auth_type: "api-key".into(),
            env_var: "GROQ_API_KEY".into(),
            key_format: "gsk_...".into(),
            key_placeholder: "gsk_xxxxxxxxxxxxxxxx".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![
                model("groq/llama-3.3-70b-versatile", "Llama 3.3 70B"),
            ],
            category: "other".into(),
            is_extension: false,
        },
        ProviderMetadata {
            id: "deepseek".into(),
            name: "DeepSeek".into(),
            description: "DeepSeek models — strong open-source AI".into(),
            auth_type: "api-key".into(),
            env_var: "DEEPSEEK_API_KEY".into(),
            key_format: "sk-...".into(),
            key_placeholder: "sk-xxxxxxxxxxxxxxxx".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![
                model("deepseek/deepseek-reasoner", "DeepSeek R1"),
                model("deepseek/deepseek-chat", "DeepSeek V3"),
            ],
            category: "other".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "together".into(),
            name: "Together AI".into(),
            description: "Open-source model hosting".into(),
            auth_type: "api-key".into(),
            env_var: "TOGETHER_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "Your Together API key".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![
                model("together/meta-llama/Llama-3.3-70B-Instruct-Turbo", "Llama 3.3 70B"),
            ],
            category: "other".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "xai".into(),
            name: "xAI (Grok)".into(),
            description: "Grok models by xAI".into(),
            auth_type: "api-key".into(),
            env_var: "XAI_API_KEY".into(),
            key_format: "xai-...".into(),
            key_placeholder: "xai-xxxxxxxxxxxxxxxx".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![
                model("xai/grok-3", "Grok 3"),
            ],
            category: "other".into(),
            is_extension: false,
        },
        ProviderMetadata {
            id: "huggingface".into(),
            name: "Hugging Face".into(),
            description: "Open models via Hugging Face Inference API".into(),
            auth_type: "api-key".into(),
            env_var: "HF_TOKEN".into(),
            key_format: "hf_...".into(),
            key_placeholder: "hf_xxxxxxxxxxxxxxxx".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![
                model("huggingface/deepseek-ai/DeepSeek-R1", "DeepSeek R1"),
            ],
            category: "other".into(),
            is_extension: false,
        },
        ProviderMetadata {
            id: "moonshot".into(),
            name: "Moonshot (Kimi)".into(),
            description: "Kimi models — strong Chinese AI".into(),
            auth_type: "api-key".into(),
            env_var: "MOONSHOT_API_KEY".into(),
            key_format: "sk-...".into(),
            key_placeholder: "sk-xxxxxxxxxxxxxxxx".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![
                model("moonshot/kimi-k2.5", "Kimi K2.5"),
            ],
            category: "other".into(),
            is_extension: false,
        },
        ProviderMetadata {
            id: "nvidia".into(),
            name: "NVIDIA NIM".into(),
            description: "NVIDIA NIM microservices".into(),
            auth_type: "api-key".into(),
            env_var: "NVIDIA_API_KEY".into(),
            key_format: "nvapi-...".into(),
            key_placeholder: "nvapi-xxxxxxxxxxxx".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![
                model("nvidia/meta/llama-3.3-70b-instruct", "Llama 3.3 70B"),
            ],
            category: "other".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "chutes".into(),
            name: "Chutes".into(),
            description: "Chutes AI inference".into(),
            auth_type: "api-key".into(),
            env_var: "CHUTES_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "Your Chutes API key".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![
                model("chutes/deepseek-ai/DeepSeek-R1", "DeepSeek R1"),
            ],
            category: "other".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "cerebras".into(),
            name: "Cerebras".into(),
            description: "Fast inference on Cerebras hardware".into(),
            auth_type: "api-key".into(),
            env_var: "CEREBRAS_API_KEY".into(),
            key_format: "csk-...".into(),
            key_placeholder: "csk-xxxxxxxxxxxxxxxx".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![
                model("cerebras/llama3.3-70b", "Llama 3.3 70B (Cerebras)"),
            ],
            category: "other".into(),
            is_extension: false,
        },
        ProviderMetadata {
            id: "zai".into(),
            name: "Z.AI (GLM)".into(),
            description: "GLM models by Zhipu AI".into(),
            auth_type: "api-key".into(),
            env_var: "ZAI_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "Your Z.AI API key".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![
                model("zai/glm-5", "GLM-5"),
            ],
            category: "other".into(),
            is_extension: false,
        },
        ProviderMetadata {
            id: "minimax".into(),
            name: "MiniMax".into(),
            description: "MiniMax models via Anthropic-compatible API".into(),
            auth_type: "api-key".into(),
            env_var: "MINIMAX_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "Your MiniMax API key".into(),
            docs_url: "https://docs.openclaw.ai/providers/minimax".into(),
            models: vec![
                model("minimax/MiniMax-M2.5", "MiniMax M2.5"),
            ],
            category: "other".into(),
            is_extension: false,
        },
        ProviderMetadata {
            id: "byteplus".into(),
            name: "BytePlus".into(),
            description: "BytePlus ModelArk API".into(),
            auth_type: "api-key".into(),
            env_var: "BYTEPLUS_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "Your BytePlus API key".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![],
            category: "other".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "amazon-bedrock".into(),
            name: "Amazon Bedrock".into(),
            description: "AWS Bedrock managed models".into(),
            auth_type: "aws-sdk".into(),
            env_var: "AWS_ACCESS_KEY_ID".into(),
            key_format: "AWS credentials".into(),
            key_placeholder: "AWS access key".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![
                model("amazon-bedrock/anthropic.claude-sonnet-4-20250514-v1:0", "Claude Sonnet 4"),
            ],
            category: "major".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "microsoft".into(),
            name: "Microsoft Azure".into(),
            description: "Azure OpenAI Service".into(),
            auth_type: "api-key".into(),
            env_var: "AZURE_OPENAI_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "Your Azure API key".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![
                model("microsoft/gpt-4o", "GPT-4o (Azure)"),
            ],
            category: "major".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "microsoft-foundry".into(),
            name: "Microsoft Foundry".into(),
            description: "Azure AI Foundry models".into(),
            auth_type: "api-key".into(),
            env_var: "AZURE_FOUNDRY_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "Your Foundry API key".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![],
            category: "major".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "qianfan".into(),
            name: "Qianfan (Baidu)".into(),
            description: "Baidu Qianfan models".into(),
            auth_type: "api-key".into(),
            env_var: "QIANFAN_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "Your Qianfan API key".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![],
            category: "regional".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "volcengine".into(),
            name: "Volcengine (ByteDance)".into(),
            description: "Volcengine model service".into(),
            auth_type: "api-key".into(),
            env_var: "VOLCENGINE_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "Your Volcengine API key".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![],
            category: "regional".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "venice".into(),
            name: "Venice AI".into(),
            description: "Venice AI inference".into(),
            auth_type: "api-key".into(),
            env_var: "VENICE_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "Your Venice API key".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![],
            category: "other".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "xiaomi".into(),
            name: "Xiaomi".into(),
            description: "Xiaomi models".into(),
            auth_type: "api-key".into(),
            env_var: "XIAOMI_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "Your Xiaomi API key".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![],
            category: "regional".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "cloudflare-ai-gateway".into(),
            name: "Cloudflare AI Gateway".into(),
            description: "Cloudflare Workers AI".into(),
            auth_type: "api-key".into(),
            env_var: "CLOUDFLARE_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "Your Cloudflare API key".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![],
            category: "multi-provider".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "litellm".into(),
            name: "LiteLLM".into(),
            description: "LiteLLM proxy server".into(),
            auth_type: "api-key".into(),
            env_var: "LITELLM_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "Your LiteLLM API key".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![],
            category: "multi-provider".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "perplexity".into(),
            name: "Perplexity".into(),
            description: "Perplexity AI search models".into(),
            auth_type: "api-key".into(),
            env_var: "PERPLEXITY_API_KEY".into(),
            key_format: "pplx-...".into(),
            key_placeholder: "pplx-xxxxxxxxxxxx".into(),
            docs_url: "https://docs.openclaw.ai/concepts/model-providers".into(),
            models: vec![
                model("perplexity/sonar", "Sonar"),
                model("perplexity/sonar-pro", "Sonar Pro"),
            ],
            category: "other".into(),
            is_extension: true,
        },
        ProviderMetadata {
            id: "ollama".into(),
            name: "Ollama".into(),
            description: "Local models — no API key needed, runs on your machine".into(),
            auth_type: "none".into(),
            env_var: "OLLAMA_API_KEY".into(),
            key_format: "None (local server)".into(),
            key_placeholder: "".into(),
            docs_url: "https://docs.openclaw.ai/providers/ollama".into(),
            models: vec![
                model("ollama/llama3.3", "Llama 3.3"),
                model("ollama/qwen2.5", "Qwen 2.5"),
                model("ollama/codellama", "Code Llama"),
            ],
            category: "local".into(),
            is_extension: false,
        },
        ProviderMetadata {
            id: "vllm".into(),
            name: "vLLM".into(),
            description: "Self-hosted OpenAI-compatible server".into(),
            auth_type: "api-key".into(),
            env_var: "VLLM_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "vllm-local".into(),
            docs_url: "https://docs.openclaw.ai/providers/vllm".into(),
            models: vec![
                model("vllm/your-model-id", "Custom (vLLM)"),
            ],
            category: "local".into(),
            is_extension: false,
        },
        ProviderMetadata {
            id: "sglang".into(),
            name: "SGLang".into(),
            description: "Fast self-hosted OpenAI-compatible server".into(),
            auth_type: "api-key".into(),
            env_var: "SGLANG_API_KEY".into(),
            key_format: "...".into(),
            key_placeholder: "sglang-local".into(),
            docs_url: "https://docs.openclaw.ai/providers/sglang".into(),
            models: vec![
                model("sglang/your-model-id", "Custom (SGLang)"),
            ],
            category: "local".into(),
            is_extension: false,
        },
    ]
}

// ─── Tauri Commands ───────────────────────────────────────────────

#[tauri::command]
pub async fn get_all_channels() -> Result<Vec<ChannelMetadata>, AppError> {
    let mut channels = built_in_channels();
    channels.extend(extension_channels());
    Ok(channels)
}

#[tauri::command]
pub async fn get_all_providers() -> Result<Vec<ProviderMetadata>, AppError> {
    Ok(all_providers())
}

#[tauri::command]
pub async fn get_openclaw_metadata() -> Result<OpenClawMetadata, AppError> {
    let mut channels = built_in_channels();
    channels.extend(extension_channels());

    let channel_order = vec![
        "telegram".into(), "whatsapp".into(), "discord".into(), "slack".into(),
        "signal".into(), "imessage".into(), "irc".into(), "googlechat".into(),
        "line".into(), "msteams".into(), "matrix".into(), "mattermost".into(),
        "feishu".into(), "twitch".into(), "nostr".into(), "bluebubbles".into(),
        "synology-chat".into(), "nextcloud-talk".into(), "zalo".into(),
        "zalouser".into(), "voice-call".into(), "openshell".into(),
        "tlon".into(), "device-pair".into(), "phone-control".into(),
    ];

    Ok(OpenClawMetadata {
        channels,
        providers: all_providers(),
        channel_order,
    })
}
