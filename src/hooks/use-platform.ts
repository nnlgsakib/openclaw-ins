import { useQuery } from "@tanstack/react-query"
import { platform as getPlatform, arch as getArch, version as getVersion } from "@tauri-apps/plugin-os"

export interface PlatformInfo {
  os: string
  architecture: string
  osVersion: string
}

/**
 * Detects the current operating system using tauri-plugin-os.
 * Uses TanStack Query with staleTime: Infinity since platform doesn't change at runtime.
 */
export function usePlatform() {
  return useQuery<PlatformInfo>({
    queryKey: ["platform"],
    queryFn: async () => {
      const os = await getPlatform()
      const architecture = await getArch()
      const osVersion = await getVersion()
      return { os, architecture, osVersion }
    },
    staleTime: Infinity,
  })
}
