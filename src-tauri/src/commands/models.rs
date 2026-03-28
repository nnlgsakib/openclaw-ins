use serde::{Deserialize, Serialize};

/// A model entry returned from a provider API.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelEntry {
    pub id: String,
    pub name: Option<String>,
    pub provider: String,
}

/// Response structure for OpenAI-compatible /v1/models endpoint.
#[derive(Debug, Deserialize)]
struct OpenAiModelsResponse {
    data: Vec<OpenAiModel>,
}

#[derive(Debug, Deserialize)]
struct OpenAiModel {
    id: String,
}

/// Response structure for OpenRouter /api/v1/models endpoint.
#[derive(Debug, Deserialize)]
struct OpenRouterModelsResponse {
    data: Vec<OpenRouterModel>,
}

#[derive(Debug, Deserialize)]
struct OpenRouterModel {
    id: String,
    name: Option<String>,
}

/// Response structure for Ollama /api/tags endpoint.
#[derive(Debug, Deserialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaModel>,
}

#[derive(Debug, Deserialize)]
struct OllamaModel {
    name: String,
    _model: Option<String>,
}

/// Fetch available models from a provider's API.
///
/// Supports:
/// - OpenAI-compatible: /v1/models (OpenAI, Groq, Cerebras, Moonshot, Mistral, vLLM, SGLang)
/// - OpenRouter: /api/v1/models
/// - Ollama: /api/tags
/// - Anthropic: static list (no public models endpoint)
/// - Google: static list
#[tauri::command]
pub async fn fetch_provider_models(
    provider_id: String,
    api_key: Option<String>,
    base_url: Option<String>,
) -> Result<Vec<ModelEntry>, String> {
    match provider_id.as_str() {
        "ollama" => fetch_ollama_models().await,
        "openrouter" => fetch_openrouter_models(api_key).await,
        "anthropic" => Ok(get_anthropic_models()),
        "google" => Ok(get_google_models()),
        "openai-codex" | "github-copilot" => Ok(get_static_models(&provider_id)),
        _ => fetch_openai_compatible_models(&provider_id, api_key, base_url).await,
    }
}

/// Fetch models from OpenAI-compatible /v1/models endpoint.
async fn fetch_openai_compatible_models(
    provider_id: &str,
    api_key: Option<String>,
    base_url: Option<String>,
) -> Result<Vec<ModelEntry>, String> {
    let base = base_url.unwrap_or_else(|| get_default_base_url(provider_id).to_string());
    let url = format!("{}/v1/models", base.trim_end_matches('/'));

    let client = reqwest::Client::new();
    let mut req = client.get(&url);

    if let Some(key) = api_key {
        if !key.is_empty() {
            req = req.header("Authorization", format!("Bearer {key}"));
        }
    }

    let resp = req
        .send()
        .await
        .map_err(|e| format!("Failed to fetch models from {url}: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!(
            "Provider returned {}: {}",
            resp.status(),
            resp.text().await.unwrap_or_default()
        ));
    }

    let body: OpenAiModelsResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse models response: {e}"))?;

    let models: Vec<ModelEntry> = body
        .data
        .into_iter()
        .map(|m| ModelEntry {
            id: format!("{}/{}", provider_id, m.id),
            name: Some(m.id.clone()),
            provider: provider_id.to_string(),
        })
        .collect();

    Ok(models)
}

/// Fetch models from OpenRouter.
async fn fetch_openrouter_models(api_key: Option<String>) -> Result<Vec<ModelEntry>, String> {
    let client = reqwest::Client::new();
    let mut req = client.get("https://openrouter.ai/api/v1/models");

    if let Some(key) = api_key {
        if !key.is_empty() {
            req = req.header("Authorization", format!("Bearer {key}"));
        }
    }

    let resp = req
        .send()
        .await
        .map_err(|e| format!("Failed to fetch OpenRouter models: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("OpenRouter returned {}", resp.status()));
    }

    let body: OpenRouterModelsResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse OpenRouter response: {e}"))?;

    let models: Vec<ModelEntry> = body
        .data
        .into_iter()
        .map(|m| ModelEntry {
            id: format!("openrouter/{}", m.id),
            name: Some(m.name.unwrap_or_else(|| m.id.clone())),
            provider: "openrouter".to_string(),
        })
        .collect();

    Ok(models)
}

/// Fetch models from Ollama local server.
async fn fetch_ollama_models() -> Result<Vec<ModelEntry>, String> {
    let client = reqwest::Client::new();
    let resp = client
        .get("http://127.0.0.1:11434/api/tags")
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama (is it running?): {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("Ollama returned {}", resp.status()));
    }

    let body: OllamaTagsResponse = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse Ollama response: {e}"))?;

    let models: Vec<ModelEntry> = body
        .models
        .into_iter()
        .map(|m| {
            let clean_name = m.name.replace(":latest", "");
            ModelEntry {
                id: format!("ollama/{}", clean_name),
                name: Some(m.name),
                provider: "ollama".to_string(),
            }
        })
        .collect();

    Ok(models)
}

/// Default base URLs for known providers.
fn get_default_base_url(provider_id: &str) -> &'static str {
    match provider_id {
        "openai" => "https://api.openai.com",
        "groq" => "https://api.groq.com",
        "cerebras" => "https://api.cerebras.ai",
        "moonshot" => "https://api.moonshot.ai",
        "mistral" => "https://api.mistral.ai",
        "xai" => "https://api.x.ai",
        "zai" => "https://open.bigmodel.cn/paas/v4",
        "together" => "https://api.together.xyz",
        "huggingface" => "https://api-inference.huggingface.co",
        "vllm" => "http://127.0.0.1:8000",
        "sglang" => "http://127.0.0.1:30000",
        "kilocode" => "https://api.kilo.ai/api/gateway",
        "vercel-ai-gateway" => "https://ai-gateway.vercel.sh",
        "opencode" => "https://api.opencode.ai",
        _ => "https://api.openai.com",
    }
}

/// Static model list for Anthropic (no public models API).
fn get_anthropic_models() -> Vec<ModelEntry> {
    vec![
        ModelEntry {
            id: "anthropic/claude-opus-4-6".into(),
            name: Some("Claude Opus 4.6".into()),
            provider: "anthropic".into(),
        },
        ModelEntry {
            id: "anthropic/claude-sonnet-4-6".into(),
            name: Some("Claude Sonnet 4.6".into()),
            provider: "anthropic".into(),
        },
        ModelEntry {
            id: "anthropic/claude-haiku-3-5".into(),
            name: Some("Claude 3.5 Haiku".into()),
            provider: "anthropic".into(),
        },
    ]
}

/// Static model list for Google (uses different API format).
fn get_google_models() -> Vec<ModelEntry> {
    vec![
        ModelEntry {
            id: "google/gemini-3.1-pro-preview".into(),
            name: Some("Gemini 3.1 Pro Preview".into()),
            provider: "google".into(),
        },
        ModelEntry {
            id: "google/gemini-3-flash-preview".into(),
            name: Some("Gemini 3 Flash Preview".into()),
            provider: "google".into(),
        },
        ModelEntry {
            id: "google/gemini-2.5-pro".into(),
            name: Some("Gemini 2.5 Pro".into()),
            provider: "google".into(),
        },
        ModelEntry {
            id: "google/gemini-2.5-flash".into(),
            name: Some("Gemini 2.5 Flash".into()),
            provider: "google".into(),
        },
    ]
}

/// Static model list for OAuth-based providers.
fn get_static_models(provider_id: &str) -> Vec<ModelEntry> {
    match provider_id {
        "openai-codex" => vec![
            ModelEntry {
                id: "openai-codex/gpt-5.4".into(),
                name: Some("GPT-5.4 (Codex)".into()),
                provider: "openai-codex".into(),
            },
            ModelEntry {
                id: "openai-codex/gpt-5.3-codex-spark".into(),
                name: Some("Codex Spark".into()),
                provider: "openai-codex".into(),
            },
        ],
        "github-copilot" => vec![
            ModelEntry {
                id: "github-copilot/gpt-5.4".into(),
                name: Some("GPT-5.4 (Copilot)".into()),
                provider: "github-copilot".into(),
            },
            ModelEntry {
                id: "github-copilot/claude-opus-4-6".into(),
                name: Some("Claude Opus (Copilot)".into()),
                provider: "github-copilot".into(),
            },
        ],
        _ => vec![],
    }
}
