import { create } from "zustand";

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
  bindMounts: BindMount[];
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

export interface OpenClawConfig {
  provider?: ProviderConfig;
  sandbox?: SandboxConfig;
  tools?: ToolsConfig;
  agents?: AgentsConfig;
}

interface ConfigState {
  config: OpenClawConfig;
  isDirty: boolean;
  setConfig: (config: OpenClawConfig) => void;
  setProvider: (provider: ProviderConfig) => void;
  setSandbox: (sandbox: SandboxConfig) => void;
  setTools: (tools: ToolsConfig) => void;
  setAgents: (agents: AgentsConfig) => void;
  markClean: () => void;
  reset: () => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: {},
  isDirty: false,
  setConfig: (config) => set({ config, isDirty: false }),
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