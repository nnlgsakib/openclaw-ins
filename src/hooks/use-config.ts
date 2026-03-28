import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

/**
 * OpenClaw config is a free-form JSON object matching the OpenClaw schema.
 * See: https://docs.openclaw.ai/gateway/configuration
 */
export type OpenClawConfigJson = Record<string, unknown>;

export function useConfig() {
  return useQuery<OpenClawConfigJson>({
    queryKey: ["config"],
    queryFn: async () => await invoke<OpenClawConfigJson>("read_config"),
    staleTime: Infinity,
  });
}

export function useSaveConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: OpenClawConfigJson) => {
      await invoke("write_config", { config });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function useValidateConfig() {
  return useMutation({
    mutationFn: async (config: OpenClawConfigJson) => {
      return await invoke<ValidationResult>("validate_config", { config });
    },
  });
}
