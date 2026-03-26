import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { OpenClawConfig } from "@/stores/use-config-store";

export function useConfig() {
  return useQuery<OpenClawConfig>({
    queryKey: ["config"],
    queryFn: async () => await invoke<OpenClawConfig>("read_config"),
    staleTime: Infinity, // Config loaded once, mutated explicitly
  });
}

export function useSaveConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: OpenClawConfig) => {
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
    mutationFn: async (config: OpenClawConfig) => {
      return await invoke<ValidationResult>("validate_config", { config });
    },
  });
}