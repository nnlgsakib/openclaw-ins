import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

// ─── Types ────────────────────────────────────────────────────────

export interface ModelEntry {
  id: string;
  name: string | null;
  provider: string;
}

// ─── Hooks ────────────────────────────────────────────────────────

/**
 * Fetches available models from a provider's API.
 *
 * For API-key providers, pass the key to authenticate.
 * For Ollama/local, no key needed.
 * For static providers (Anthropic, Google), returns curated list.
 *
 * Results are cached for 5 minutes per provider.
 */
export function useProviderModels(
  providerId: string,
  apiKey?: string,
  baseUrl?: string
) {
  return useQuery<ModelEntry[]>({
    queryKey: ["provider-models", providerId, apiKey ? "***" : undefined],
    queryFn: async () => {
      return await invoke<ModelEntry[]>("fetch_provider_models", {
        providerId,
        apiKey: apiKey || null,
        baseUrl: baseUrl || null,
      });
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    // Don't show error for missing API key — just return empty
    throwOnError: false,
  });
}
