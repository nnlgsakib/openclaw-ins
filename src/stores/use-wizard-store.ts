import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────

export type AuthType = "api-key" | "oauth" | "none" | "token";

export interface ModelProvider {
  id: string;
  name: string;
  description: string;
  models: string[];
  aliases: Record<string, string>;
  authType: AuthType;
  envVar: string;
  keyFormat: string;
  keyPlaceholder: string;
  docsUrl: string;
  category: "major" | "multi-provider" | "local" | "regional" | "other";
}

export interface ChannelOption {
  id: string;
  name: string;
  description: string;
  fields: ChannelField[];
}

export interface ChannelField {
  key: string;
  label: string;
  type: "text" | "password" | "select";
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
}

export type SandboxMode = "off" | "non-main" | "all";
export type SandboxScope = "session" | "agent" | "shared";
export type WorkspaceAccess = "none" | "ro" | "rw";
export type DmPolicy = "pairing" | "allowlist" | "open" | "disabled";

export interface WizardState {
  currentStep: number;
  modelProvider: string;
  selectedModel: string;
  customModelId: string;
  apiKey: string;
  apiKeyFormat: "direct" | "env";
  apiKeyEnvName: string;
  sandboxMode: SandboxMode;
  sandboxScope: SandboxScope;
  workspaceAccess: WorkspaceAccess;
  workspacePath: string;
  selectedChannels: string[];
  channelConfigs: Record<string, Record<string, string>>;
  dmPolicies: Record<string, DmPolicy>;
  providerSearch: string;

  // Navigation
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;

  // Setters
  setModelProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;
  setCustomModelId: (id: string) => void;
  setApiKey: (key: string) => void;
  setApiKeyFormat: (format: "direct" | "env") => void;
  setApiKeyEnvName: (name: string) => void;
  setSandboxMode: (mode: SandboxMode) => void;
  setSandboxScope: (scope: SandboxScope) => void;
  setWorkspaceAccess: (access: WorkspaceAccess) => void;
  setWorkspacePath: (path: string) => void;
  toggleChannel: (channelId: string) => void;
  setChannelField: (channelId: string, field: string, value: string) => void;
  setDmPolicy: (channelId: string, policy: DmPolicy) => void;
  setProviderSearch: (search: string) => void;

  // Config generation
  getGeneratedConfig: () => Record<string, unknown>;
  reset: () => void;
}

// ─── Constants ────────────────────────────────────────────────────

export const MODEL_PROVIDERS: ModelProvider[] = [
  // Major providers
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models — best for complex reasoning and code",
    models: ["anthropic/claude-opus-4-6", "anthropic/claude-sonnet-4-6"],
    aliases: {
      "anthropic/claude-opus-4-6": "Opus",
      "anthropic/claude-sonnet-4-6": "Sonnet",
    },
    authType: "api-key",
    envVar: "ANTHROPIC_API_KEY",
    keyFormat: "sk-ant-api03-...",
    keyPlaceholder: "sk-ant-api03-xxxxxxxxxxxx",
    docsUrl: "https://docs.anthropic.com/",
    category: "major",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT models — strong general-purpose AI",
    models: ["openai/gpt-5.4", "openai/gpt-5.4-pro", "openai/gpt-5.2", "openai/o3"],
    aliases: {
      "openai/gpt-5.4": "GPT-5.4",
      "openai/gpt-5.4-pro": "GPT-5.4 Pro",
      "openai/gpt-5.2": "GPT-5.2",
      "openai/o3": "O3",
    },
    authType: "api-key",
    envVar: "OPENAI_API_KEY",
    keyFormat: "sk-...",
    keyPlaceholder: "sk-xxxxxxxxxxxxxxxx",
    docsUrl: "https://platform.openai.com/",
    category: "major",
  },
  {
    id: "google",
    name: "Google Gemini",
    description: "Gemini models — excellent for multimodal tasks",
    models: ["google/gemini-3.1-pro-preview", "google/gemini-3-flash-preview", "google/gemini-2.5-pro"],
    aliases: {
      "google/gemini-3.1-pro-preview": "Gemini 3.1 Pro",
      "google/gemini-3-flash-preview": "Gemini 3 Flash",
      "google/gemini-2.5-pro": "Gemini 2.5 Pro",
    },
    authType: "api-key",
    envVar: "GEMINI_API_KEY",
    keyFormat: "AIza...",
    keyPlaceholder: "AIzaSyxxxxxxxxxxxxxxxxxxx",
    docsUrl: "https://ai.google.dev/",
    category: "major",
  },
  {
    id: "openai-codex",
    name: "OpenAI Codex",
    description: "ChatGPT subscription — OAuth login, no API key needed",
    models: ["openai-codex/gpt-5.4", "openai-codex/gpt-5.3-codex-spark"],
    aliases: {
      "openai-codex/gpt-5.4": "GPT-5.4 (Codex)",
      "openai-codex/gpt-5.3-codex-spark": "Codex Spark",
    },
    authType: "oauth",
    envVar: "",
    keyFormat: "OAuth (login via openclaw models auth login)",
    keyPlaceholder: "",
    docsUrl: "https://docs.openclaw.ai/providers/opencode",
    category: "major",
  },
  // Multi-provider gateways
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Access 200+ models through one API key",
    models: ["openrouter/anthropic/claude-sonnet-4-6", "openrouter/openai/gpt-5.2", "openrouter/google/gemini-2.5-pro"],
    aliases: {
      "openrouter/anthropic/claude-sonnet-4-6": "Claude Sonnet (OR)",
      "openrouter/openai/gpt-5.2": "GPT-5.2 (OR)",
      "openrouter/google/gemini-2.5-pro": "Gemini Pro (OR)",
    },
    authType: "api-key",
    envVar: "OPENROUTER_API_KEY",
    keyFormat: "sk-or-...",
    keyPlaceholder: "sk-or-v1-xxxxxxxxxxxxxxxx",
    docsUrl: "https://openrouter.ai/",
    category: "multi-provider",
  },
  {
    id: "kilocode",
    name: "Kilo Gateway",
    description: "Multi-provider gateway by Kilo",
    models: ["kilocode/anthropic/claude-opus-4.6", "kilocode/openai/gpt-5.2"],
    aliases: {
      "kilocode/anthropic/claude-opus-4.6": "Claude Opus (Kilo)",
      "kilocode/openai/gpt-5.2": "GPT-5.2 (Kilo)",
    },
    authType: "api-key",
    envVar: "KILOCODE_API_KEY",
    keyFormat: "...",
    keyPlaceholder: "Your Kilo API key",
    docsUrl: "https://docs.openclaw.ai/providers/kilocode",
    category: "multi-provider",
  },
  {
    id: "vercel-ai-gateway",
    name: "Vercel AI Gateway",
    description: "Multi-provider gateway by Vercel",
    models: ["vercel-ai-gateway/anthropic/claude-opus-4.6"],
    aliases: {
      "vercel-ai-gateway/anthropic/claude-opus-4.6": "Claude Opus (Vercel)",
    },
    authType: "api-key",
    envVar: "AI_GATEWAY_API_KEY",
    keyFormat: "...",
    keyPlaceholder: "Your Vercel AI Gateway key",
    docsUrl: "https://docs.openclaw.ai/concepts/model-providers",
    category: "multi-provider",
  },
  {
    id: "opencode",
    name: "OpenCode",
    description: "OpenCode Zen runtime — multi-model access",
    models: ["opencode/claude-opus-4-6", "opencode/claude-sonnet-4-6"],
    aliases: {
      "opencode/claude-opus-4-6": "Claude Opus (OC)",
      "opencode/claude-sonnet-4-6": "Claude Sonnet (OC)",
    },
    authType: "api-key",
    envVar: "OPENCODE_API_KEY",
    keyFormat: "...",
    keyPlaceholder: "Your OpenCode API key",
    docsUrl: "https://docs.openclaw.ai/concepts/model-providers",
    category: "multi-provider",
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    description: "GitHub Copilot models via OAuth",
    models: ["github-copilot/gpt-5.4", "github-copilot/claude-opus-4-6"],
    aliases: {
      "github-copilot/gpt-5.4": "GPT-5.4 (Copilot)",
      "github-copilot/claude-opus-4-6": "Claude Opus (Copilot)",
    },
    authType: "oauth",
    envVar: "",
    keyFormat: "OAuth (login via openclaw models auth login)",
    keyPlaceholder: "",
    docsUrl: "https://docs.openclaw.ai/concepts/model-providers",
    category: "multi-provider",
  },
  // Other providers
  {
    id: "mistral",
    name: "Mistral",
    description: "Mistral models — strong European AI",
    models: ["mistral/mistral-large-latest"],
    aliases: {
      "mistral/mistral-large-latest": "Mistral Large",
    },
    authType: "api-key",
    envVar: "MISTRAL_API_KEY",
    keyFormat: "...",
    keyPlaceholder: "Your Mistral API key",
    docsUrl: "https://docs.openclaw.ai/concepts/model-providers",
    category: "other",
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    description: "Grok models by xAI",
    models: ["xai/grok-3"],
    aliases: {
      "xai/grok-3": "Grok 3",
    },
    authType: "api-key",
    envVar: "XAI_API_KEY",
    keyFormat: "xai-...",
    keyPlaceholder: "xai-xxxxxxxxxxxxxxxx",
    docsUrl: "https://docs.openclaw.ai/concepts/model-providers",
    category: "other",
  },
  {
    id: "zai",
    name: "Z.AI (GLM)",
    description: "GLM models by Zhipu AI",
    models: ["zai/glm-5"],
    aliases: {
      "zai/glm-5": "GLM-5",
    },
    authType: "api-key",
    envVar: "ZAI_API_KEY",
    keyFormat: "...",
    keyPlaceholder: "Your Z.AI API key",
    docsUrl: "https://docs.openclaw.ai/concepts/model-providers",
    category: "other",
  },
  {
    id: "groq",
    name: "Groq",
    description: "Ultra-fast inference hardware",
    models: ["groq/llama-3.3-70b-versatile"],
    aliases: {
      "groq/llama-3.3-70b-versatile": "Llama 3.3 70B",
    },
    authType: "api-key",
    envVar: "GROQ_API_KEY",
    keyFormat: "gsk_...",
    keyPlaceholder: "gsk_xxxxxxxxxxxxxxxx",
    docsUrl: "https://docs.openclaw.ai/concepts/model-providers",
    category: "other",
  },
  {
    id: "cerebras",
    name: "Cerebras",
    description: "Fast inference on Cerebras hardware",
    models: ["cerebras/llama3.3-70b"],
    aliases: {
      "cerebras/llama3.3-70b": "Llama 3.3 70B (Cerebras)",
    },
    authType: "api-key",
    envVar: "CEREBRAS_API_KEY",
    keyFormat: "csk-...",
    keyPlaceholder: "csk-xxxxxxxxxxxxxxxx",
    docsUrl: "https://docs.openclaw.ai/concepts/model-providers",
    category: "other",
  },
  {
    id: "moonshot",
    name: "Moonshot (Kimi)",
    description: "Kimi models — strong Chinese AI",
    models: ["moonshot/kimi-k2.5"],
    aliases: {
      "moonshot/kimi-k2.5": "Kimi K2.5",
    },
    authType: "api-key",
    envVar: "MOONSHOT_API_KEY",
    keyFormat: "sk-...",
    keyPlaceholder: "sk-xxxxxxxxxxxxxxxx",
    docsUrl: "https://docs.openclaw.ai/concepts/model-providers",
    category: "other",
  },
  {
    id: "minimax",
    name: "MiniMax",
    description: "MiniMax models via Anthropic-compatible API",
    models: ["minimax/MiniMax-M2.5"],
    aliases: {
      "minimax/MiniMax-M2.5": "MiniMax M2.5",
    },
    authType: "api-key",
    envVar: "MINIMAX_API_KEY",
    keyFormat: "...",
    keyPlaceholder: "Your MiniMax API key",
    docsUrl: "https://docs.openclaw.ai/providers/minimax",
    category: "other",
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    description: "Open models via Hugging Face Inference API",
    models: ["huggingface/deepseek-ai/DeepSeek-R1"],
    aliases: {
      "huggingface/deepseek-ai/DeepSeek-R1": "DeepSeek R1",
    },
    authType: "api-key",
    envVar: "HF_TOKEN",
    keyFormat: "hf_...",
    keyPlaceholder: "hf_xxxxxxxxxxxxxxxx",
    docsUrl: "https://docs.openclaw.ai/concepts/model-providers",
    category: "other",
  },
  // Local providers
  {
    id: "ollama",
    name: "Ollama",
    description: "Local models — no API key needed, runs on your machine",
    models: ["ollama/llama3.3", "ollama/qwen2.5", "ollama/codellama"],
    aliases: {
      "ollama/llama3.3": "Llama 3.3",
      "ollama/qwen2.5": "Qwen 2.5",
      "ollama/codellama": "Code Llama",
    },
    authType: "none",
    envVar: "OLLAMA_API_KEY",
    keyFormat: "None (local server)",
    keyPlaceholder: "",
    docsUrl: "https://docs.openclaw.ai/providers/ollama",
    category: "local",
  },
  {
    id: "vllm",
    name: "vLLM",
    description: "Self-hosted OpenAI-compatible server",
    models: ["vllm/your-model-id"],
    aliases: {
      "vllm/your-model-id": "Custom (vLLM)",
    },
    authType: "api-key",
    envVar: "VLLM_API_KEY",
    keyFormat: "...",
    keyPlaceholder: "vllm-local",
    docsUrl: "https://docs.openclaw.ai/providers/vllm",
    category: "local",
  },
  {
    id: "sglang",
    name: "SGLang",
    description: "Fast self-hosted OpenAI-compatible server",
    models: ["sglang/your-model-id"],
    aliases: {
      "sglang/your-model-id": "Custom (SGLang)",
    },
    authType: "api-key",
    envVar: "SGLANG_API_KEY",
    keyFormat: "...",
    keyPlaceholder: "sglang-local",
    docsUrl: "https://docs.openclaw.ai/providers/sglang",
    category: "local",
  },
];

export const PROVIDER_CATEGORIES = {
  major: "Major Providers",
  "multi-provider": "Multi-Provider Gateways",
  other: "Other Providers",
  local: "Local / Self-Hosted",
} as const;

export const CHANNEL_OPTIONS: ChannelOption[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Connect via WhatsApp Web pairing",
    fields: [
      { key: "allowFrom", label: "Allow From", type: "text", placeholder: "+1234567890 (comma-separated)" },
    ],
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Connect a Telegram bot",
    fields: [
      { key: "botToken", label: "Bot Token", type: "password", placeholder: "123456:ABC-DEF...", required: true },
    ],
  },
  {
    id: "discord",
    name: "Discord",
    description: "Connect a Discord bot",
    fields: [
      { key: "token", label: "Bot Token", type: "password", placeholder: "MTIz...", required: true },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    description: "Connect a Slack app (Socket Mode)",
    fields: [
      { key: "botToken", label: "Bot Token", type: "password", placeholder: "xoxb-...", required: true },
      { key: "appToken", label: "App Token", type: "password", placeholder: "xapp-...", required: true },
    ],
  },
  {
    id: "signal",
    name: "Signal",
    description: "Requires signal-cli installation",
    fields: [],
  },
  {
    id: "msteams",
    name: "Microsoft Teams",
    description: "Requires plugin installation",
    fields: [],
  },
];

export const TOTAL_STEPS = 6;

const initialState = {
  currentStep: 0,
  modelProvider: "anthropic",
  selectedModel: "anthropic/claude-sonnet-4-6",
  customModelId: "",
  apiKey: "",
  apiKeyFormat: "direct" as const,
  apiKeyEnvName: "",
  sandboxMode: "non-main" as SandboxMode,
  sandboxScope: "session" as SandboxScope,
  workspaceAccess: "none" as WorkspaceAccess,
  workspacePath: "",
  selectedChannels: [] as string[],
  channelConfigs: {} as Record<string, Record<string, string>>,
  dmPolicies: {} as Record<string, DmPolicy>,
  providerSearch: "",
};

// ─── Store ────────────────────────────────────────────────────────

export const useWizardStore = create<WizardState>((set, get) => ({
  ...initialState,

  // Navigation
  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS - 1),
    })),
  prevStep: () =>
    set((state) => ({ currentStep: Math.max(state.currentStep - 1, 0) })),
  goToStep: (step) =>
    set({ currentStep: Math.max(0, Math.min(step, TOTAL_STEPS - 1)) }),

  // Setters
  setModelProvider: (provider) => {
    const prov = MODEL_PROVIDERS.find((p) => p.id === provider);
    set({
      modelProvider: provider,
      selectedModel: prov?.models[0] ?? "",
      customModelId: "",
    });
  },
  setSelectedModel: (model) => set({ selectedModel: model, customModelId: "" }),
  setCustomModelId: (id) => set({ customModelId: id, selectedModel: "" }),
  setApiKey: (key) => set({ apiKey: key }),
  setApiKeyFormat: (format) => set({ apiKeyFormat: format }),
  setApiKeyEnvName: (name) => set({ apiKeyEnvName: name }),
  setSandboxMode: (mode) => set({ sandboxMode: mode }),
  setSandboxScope: (scope) => set({ sandboxScope: scope }),
  setWorkspaceAccess: (access) => set({ workspaceAccess: access }),
  setWorkspacePath: (path) => set({ workspacePath: path }),
  toggleChannel: (channelId) =>
    set((state) => {
      const isSelected = state.selectedChannels.includes(channelId);
      return {
        selectedChannels: isSelected
          ? state.selectedChannels.filter((id) => id !== channelId)
          : [...state.selectedChannels, channelId],
      };
    }),
  setChannelField: (channelId, field, value) =>
    set((state) => ({
      channelConfigs: {
        ...state.channelConfigs,
        [channelId]: {
          ...(state.channelConfigs[channelId] ?? {}),
          [field]: value,
        },
      },
    })),
  setDmPolicy: (channelId, policy) =>
    set((state) => ({
      dmPolicies: { ...state.dmPolicies, [channelId]: policy },
    })),
  setProviderSearch: (search) => set({ providerSearch: search }),

  // Get the effective model ID (selected or custom)
  getEffectiveModel: () => {
    const state = get();
    return state.customModelId || state.selectedModel;
  },

  // Generate OpenClaw-compatible config matching real schema
  getGeneratedConfig: () => {
    const state = get();
    const effectiveModel = state.customModelId || state.selectedModel;
    const provider = MODEL_PROVIDERS.find((p) => p.id === state.modelProvider);
    const now = new Date().toISOString();

    // ─── Build config matching real OpenClaw schema ────────────
    const config: Record<string, unknown> = {};

    // Meta
    config.meta = {
      lastTouchedVersion: "2026.2.27",
      lastTouchedAt: now,
    };

    // Wizard
    config.wizard = {
      lastRunAt: now,
      lastRunVersion: "2026.2.27",
      lastRunCommand: "onboard",
      lastRunMode: "local",
    };

    // Auth profiles
    const authProfiles: Record<string, { provider: string; mode: string }> = {};
    if (provider && provider.authType !== "none") {
      authProfiles[`${provider.id}:default`] = {
        provider: provider.id,
        mode: provider.authType === "oauth" ? "oauth" : "api_key",
      };
    }
    config.auth = { profiles: authProfiles };

    // Models — provider config (only for non-bundled providers that need custom base URLs)
    const modelsConfig: Record<string, unknown> = { mode: "merge" };
    const providersConfig: Record<string, unknown> = {};
    // Only add explicit provider config for providers that need custom base URLs
    // Bundled providers (anthropic, openai, google, etc.) work without explicit config
    if (provider && !["anthropic", "openai", "google", "openai-codex", "openrouter", "github-copilot", "ollama", "mistral", "xai", "groq", "cerebras", "moonshot", "zai", "huggingface"].includes(provider.id)) {
      // Custom/gateway providers need explicit config
      const defaultUrls: Record<string, string> = {
        kilocode: "https://api.kilo.ai/api/gateway/",
        "vercel-ai-gateway": "https://ai-gateway.vercel.sh",
        opencode: "https://api.opencode.ai",
        vllm: "http://127.0.0.1:8000",
        sglang: "http://127.0.0.1:30000",
      };
      if (defaultUrls[provider.id]) {
        providersConfig[provider.id] = {
          baseUrl: defaultUrls[provider.id],
          api: "openai-completions",
        };
      }
    }
    if (Object.keys(providersConfig).length > 0) {
      modelsConfig.providers = providersConfig;
    }
    config.models = modelsConfig;

    // Agents
    const modelsAllowlist: Record<string, { alias?: string }> = {};
    if (provider && effectiveModel) {
      const alias = provider.aliases[effectiveModel] ?? provider.name;
      modelsAllowlist[effectiveModel] = { alias };
    }
    // Add other provider models to allowlist
    if (provider) {
      for (const [modelId, alias] of Object.entries(provider.aliases)) {
        if (modelId !== effectiveModel && !modelsAllowlist[modelId]) {
          modelsAllowlist[modelId] = { alias };
        }
      }
    }

    config.agents = {
      defaults: {
        model: { primary: effectiveModel || "anthropic/claude-sonnet-4-6" },
        models: modelsAllowlist,
        workspace: state.workspacePath || "~/.openclaw/workspace",
      },
    };

    // Commands
    config.commands = {
      native: "auto",
      nativeSkills: "auto",
      restart: true,
      ownerDisplay: "raw",
    };

    // Session
    config.session = { dmScope: "per-channel-peer" };

    // Hooks
    config.hooks = {
      internal: {
        enabled: true,
        entries: {
          "boot-md": { enabled: true },
          "bootstrap-extra-files": { enabled: true },
          "command-logger": { enabled: true },
          "session-memory": { enabled: true },
        },
      },
    };

    // Channels
    if (state.selectedChannels.length > 0) {
      const channels: Record<string, unknown> = {};
      for (const channelId of state.selectedChannels) {
        const channelConfig: Record<string, unknown> = {};
        const fields = state.channelConfigs[channelId] ?? {};
        for (const [key, value] of Object.entries(fields)) {
          if (value) channelConfig[key] = value;
        }
        channelConfig.enabled = true;
        const dmPolicy = state.dmPolicies[channelId] ?? "pairing";
        channelConfig.dmPolicy = dmPolicy;
        // OpenClaw requires allowFrom=["*"] when dmPolicy is "open"
        if (dmPolicy === "open") {
          channelConfig.allowFrom = ["*"];
        }
        // Add provider-specific defaults
        if (channelId === "telegram") {
          channelConfig.groupPolicy = "allowlist";
          channelConfig.streaming = "off";
        }
        if (channelId === "imessage") {
          channelConfig.cliPath = "imsg";
          channelConfig.groupPolicy = "allowlist";
        }
        channels[channelId] = channelConfig;
      }
      config.channels = channels;
    } else {
      config.channels = {};
    }

    // Gateway — full structure matching real config
    config.gateway = {
      port: 18789,
      mode: "local",
      bind: "loopback",
      controlUi: {
        allowedOrigins: ["http://127.0.0.1:18789"],
      },
      auth: {
        mode: "token",
      },
      tailscale: {
        mode: "off",
        resetOnExit: false,
      },
      nodes: {
        denyCommands: [
          "camera.snap",
          "camera.clip",
          "screen.record",
          "calendar.add",
          "contacts.add",
          "reminders.add",
        ],
      },
    };

    // Skills
    config.skills = {
      install: { nodeManager: "bun" },
    };

    // Plugins
    const pluginEntries: Record<string, { enabled: boolean }> = {};
    // Enable channel plugins for selected channels
    for (const channelId of state.selectedChannels) {
      pluginEntries[channelId] = { enabled: true };
    }
    config.plugins = { entries: pluginEntries };

    return config;
  },

  reset: () => set(initialState),
}));
