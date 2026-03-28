import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { useGatewayStore } from "@/stores/use-gateway-store";

// ─── Types ────────────────────────────────────────────────────────

export interface ChannelSetupField {
  key: string;
  label: string;
  type: "text" | "password" | "select";
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
}

export interface ChannelInfo {
  provider: string;
  name: string;
  description: string;
  enabled: boolean;
  config: Record<string, unknown>;
  setupFields: ChannelSetupField[];
  docsUrl: string;
}

export type DmPolicy = "pairing" | "allowlist" | "open" | "disabled";

// Legacy types for backward compat
export type ChannelStatus = "connected" | "disconnected" | "expired" | "connecting";
export type ChannelType = "whatsapp" | "telegram" | "discord" | "slack";

// ─── Constants ────────────────────────────────────────────────────

export const CHANNEL_PROVIDERS: Omit<ChannelInfo, "enabled" | "config">[] = [
  {
    provider: "whatsapp",
    name: "WhatsApp",
    description: "Connect via WhatsApp Web pairing",
    setupFields: [
      { key: "allowFrom", label: "Allow From", type: "text", placeholder: "+1234567890 (comma-separated)" },
    ],
    docsUrl: "https://docs.openclaw.ai/channels/whatsapp",
  },
  {
    provider: "telegram",
    name: "Telegram",
    description: "Connect a Telegram bot via BotFather token",
    setupFields: [
      { key: "botToken", label: "Bot Token", type: "password", placeholder: "123456:ABC-DEF...", required: true },
    ],
    docsUrl: "https://docs.openclaw.ai/channels/telegram",
  },
  {
    provider: "discord",
    name: "Discord",
    description: "Connect a Discord bot",
    setupFields: [
      { key: "token", label: "Bot Token", type: "password", placeholder: "MTIz...", required: true },
    ],
    docsUrl: "https://docs.openclaw.ai/channels/discord",
  },
  {
    provider: "slack",
    name: "Slack",
    description: "Connect a Slack app (Socket Mode)",
    setupFields: [
      { key: "botToken", label: "Bot Token", type: "password", placeholder: "xoxb-...", required: true },
      { key: "appToken", label: "App Token", type: "password", placeholder: "xapp-...", required: true },
    ],
    docsUrl: "https://docs.openclaw.ai/channels/slack",
  },
  {
    provider: "signal",
    name: "Signal",
    description: "Requires signal-cli installation",
    setupFields: [],
    docsUrl: "https://docs.openclaw.ai/channels/signal",
  },
  {
    provider: "msteams",
    name: "Microsoft Teams",
    description: "Requires plugin installation",
    setupFields: [],
    docsUrl: "https://docs.openclaw.ai/channels/msteams",
  },
];

// ─── Gateway-based Hooks ──────────────────────────────────────────

/**
 * Fetches channel configuration from Gateway config.get.
 */
export function useChannels() {
  const connected = useGatewayStore((s) => s.connected);

  return useQuery<ChannelInfo[]>({
    queryKey: ["channels"],
    queryFn: async () => {
      const response = await invoke<any>("gateway_ws_call", {
        method: "config.get",
        params: {},
      });
      const config = response?.result?.config ?? response?.config ?? {};
      const channelsConfig = config.channels ?? {};

      return CHANNEL_PROVIDERS.map((provider) => {
        const providerConfig = channelsConfig[provider.provider] ?? {};
        return {
          ...provider,
          enabled: providerConfig.enabled ?? Object.keys(providerConfig).length > 0,
          config: providerConfig,
        };
      });
    },
    enabled: connected,
    staleTime: 30000,
    retry: 1,
  });
}

/**
 * Mutation hook to update a single channel config via Gateway config.patch.
 */
export function useUpdateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      provider,
      config,
      baseHash,
    }: {
      provider: string;
      config: Record<string, unknown>;
      baseHash: string;
    }) => {
      const raw = JSON.stringify({ channels: { [provider]: config } });
      return await invoke("gateway_ws_call", {
        method: "config.patch",
        params: { raw, baseHash },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      queryClient.invalidateQueries({ queryKey: ["gateway", "config.get"] });
    },
  });
}

/**
 * Mutation to disconnect a channel by setting enabled: false.
 */
export function useDisconnectChannel() {
  const updateChannel = useUpdateChannel();

  return useMutation({
    mutationFn: async ({ provider, baseHash }: { provider: string; baseHash: string }) => {
      return updateChannel.mutateAsync({ provider, config: { enabled: false }, baseHash });
    },
  });
}
