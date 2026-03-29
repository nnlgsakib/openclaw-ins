import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export interface ConfigFieldMeta {
  key: string;
  label: string;
  fieldType: string; // "text" | "password" | "select" | "boolean" | "number"
  required: boolean;
  placeholder?: string;
  help?: string;
  sensitive: boolean;
  advanced: boolean;
  enumValues?: string[];
  default?: unknown;
}

export interface ModelEntry {
  id: string;
  name: string;
  reasoning: boolean;
}

export interface ProviderMetadata {
  id: string;
  name: string;
  description: string;
  authType: string;
  envVar: string;
  keyFormat: string;
  keyPlaceholder: string;
  docsUrl: string;
  models: ModelEntry[];
  category: string;
  isExtension: boolean;
}

export interface ChannelMetadata {
  id: string;
  name: string;
  description: string;
  docsUrl: string;
  configFields: ConfigFieldMeta[];
  isBuiltin: boolean;
  isExtension: boolean;
  providerId?: string;
  category: string;
}

export interface OpenClawMetadata {
  channels: ChannelMetadata[];
  providers: ProviderMetadata[];
  channelOrder: string[];
}

export function useOpenClawMetadata() {
  return useQuery<OpenClawMetadata>({
    queryKey: ["openclaw-metadata"],
    queryFn: async () => {
      const result = await invoke<OpenClawMetadata>("get_openclaw_metadata");
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
