import { create } from "zustand";

/**
 * OpenClaw config is a free-form JSON object.
 * See: https://docs.openclaw.ai/gateway/configuration
 */
export type OpenClawConfig = Record<string, unknown>;

// Legacy typed interfaces for config page components
export interface ProviderConfig {
  provider: string;
  model: string;
  apiKeyEnv?: string;
}

export interface BindMount {
  hostPath: string;
  access: string;
}

export interface SandboxConfig {
  enabled: boolean;
  backend: string;
  scope: string;
  workspaceAccess: string;
  networkPolicy: string;
  bindMounts: { hostPath: string; access: string }[];
}

export interface ToolsConfig {
  shell: boolean;
  filesystem: boolean;
  browser: boolean;
  api: boolean;
}

export interface AgentsConfig {
  sandboxMode: string;
  autonomy: string;
}

interface ConfigState {
  config: OpenClawConfig;
  isDirty: boolean;
  setConfig: (config: OpenClawConfig) => void;
  updateField: (path: string, value: unknown) => void;
  setProvider: (provider: ProviderConfig) => void;
  setSandbox: (sandbox: SandboxConfig) => void;
  setTools: (tools: ToolsConfig) => void;
  setAgents: (agents: AgentsConfig) => void;
  markClean: () => void;
  reset: () => void;
}

function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const result = { ...obj };
  const keys = path.split(".");
  let current: Record<string, unknown> = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (typeof current[key] !== "object" || current[key] === null) {
      current[key] = {};
    }
    current[key] = { ...(current[key] as Record<string, unknown>) };
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: {},
  isDirty: false,
  setConfig: (config) => set({ config, isDirty: false }),
  updateField: (path, value) =>
    set((state) => ({
      config: setNestedValue(state.config, path, value),
      isDirty: true,
    })),
  setProvider: (provider) =>
    set((state) => ({ config: { ...state.config, provider }, isDirty: true })),
  setSandbox: (sandbox) =>
    set((state) => ({ config: { ...state.config, sandbox }, isDirty: true })),
  setTools: (tools) =>
    set((state) => ({ config: { ...state.config, tools }, isDirty: true })),
  setAgents: (agents) =>
    set((state) => ({ config: { ...state.config, agents }, isDirty: true })),
  markClean: () => set({ isDirty: false }),
  reset: () => set({ config: {}, isDirty: false }),
}));
