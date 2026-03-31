import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { invoke } from "@tauri-apps/api/core"

export interface DockerStatus {
  installed: boolean
  running: boolean
  version: string | null
  apiVersion: string | null
  platform: string
  dockerDesktop: boolean
  wslBackend: boolean
}

export interface DockerInfo {
  status: DockerStatus
  containersRunning: number
  imagesCount: number
  serverVersion: string | null
  osType: string | null
}

/**
 * Checks Docker health status. Polls every 30s when Docker is not running
 * (to detect when user starts Docker Desktop), otherwise checks every 5min.
 * Uses TanStack Query for caching, loading states, and background refetch.
 */
export function useDockerHealth() {
  return useQuery<DockerStatus>({
    queryKey: ["docker", "health"],
    queryFn: async () => {
      return await invoke<DockerStatus>("check_docker_health")
    },
    refetchInterval: (query) => {
      // Poll faster when Docker is down (user might be starting it)
      if (!query.state.data?.running) return 30_000
      return 300_000 // 5 minutes when healthy
    },
    retry: 1,
  })
}

/**
 * Gets extended Docker info (container counts, etc).
 * Only refetches when Docker is running. Manual refetch via invalidateQueries.
 */
export function useDockerInfo() {
  return useQuery<DockerInfo>({
    queryKey: ["docker", "info"],
    queryFn: async () => {
      return await invoke<DockerInfo>("get_docker_info")
    },
    enabled: false, // Only fetch when explicitly requested or Docker is running
    staleTime: 60_000,
    retry: 1,
  })
}

/**
 * Check if the sandbox Docker image exists locally.
 */
export function useSandboxImageExists() {
  return useQuery<boolean>({
    queryKey: ["docker", "sandbox-image-exists"],
    queryFn: async () => {
      return await invoke<boolean>("check_sandbox_image_exists")
    },
    retry: 1,
  })
}

/**
 * Pull the sandbox Docker image. Use mutation for proper loading/error states.
 */
export function usePullSandboxImage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      return await invoke<boolean>("pull_sandbox_image")
    },
    onSuccess: () => {
      // Invalidate the exists query so UI updates
      queryClient.invalidateQueries({ queryKey: ["docker", "sandbox-image-exists"] })
    },
  })
}
