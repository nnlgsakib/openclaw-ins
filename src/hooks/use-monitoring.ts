import { useQuery } from "@tanstack/react-query"
import { invoke } from "@tauri-apps/api/core"

// ─── Types ────────────────────────────────────────────────────────

/**
 * OpenClaw process status — matches Rust OpenClawStatus enum (serde tag="state").
 */
export type OpenClawStatus =
  | { state: "running"; version: string | null; port: number }
  | { state: "stopped" }
  | { state: "error"; message: string }
  | { state: "unknown" }

/**
 * An active agent session — matches Rust AgentSession struct.
 */
export interface AgentSession {
  id: string
  name: string | null
  status: string
  startedAt: string | null
  model: string | null
}

/**
 * A sandbox container — matches Rust SandboxContainer struct.
 */
export interface SandboxContainer {
  id: string
  name: string
  state: string
  statusText: string
  image: string
  created: string
}

// ─── Hooks ────────────────────────────────────────────────────────

/**
 * Checks OpenClaw running status. Polls every 15s when not running
 * (to detect startup), otherwise checks every 1min.
 */
export function useOpenClawStatus() {
  return useQuery<OpenClawStatus>({
    queryKey: ["monitoring", "status"],
    queryFn: async () => {
      return await invoke<OpenClawStatus>("get_openclaw_status")
    },
    refetchInterval: (query) => {
      if (query.state.data?.state !== "running") return 15_000
      return 60_000
    },
    retry: 1,
  })
}

/**
 * Gets active agent sessions from the OpenClaw API.
 * Returns empty array if OpenClaw is not running.
 * Polls every 30s as sessions change frequently.
 */
export function useAgentSessions() {
  return useQuery<AgentSession[]>({
    queryKey: ["monitoring", "sessions"],
    queryFn: async () => {
      return await invoke<AgentSession[]>("get_agent_sessions")
    },
    refetchInterval: 30_000,
    retry: 1,
  })
}

/**
 * Lists sandbox containers associated with OpenClaw.
 * Returns empty array if Docker is unavailable.
 * Polls every 30s to track container lifecycle changes.
 */
export function useSandboxContainers() {
  return useQuery<SandboxContainer[]>({
    queryKey: ["monitoring", "sandbox"],
    queryFn: async () => {
      return await invoke<SandboxContainer[]>("get_sandbox_containers")
    },
    refetchInterval: 30_000,
    retry: 1,
  })
}

/**
 * Fetches container logs for a specific container.
 * Polls every 5s when enabled for near-real-time log updates.
 * Returns last 200 lines of stdout+stderr.
 */
export function useContainerLogs(containerId: string, enabled: boolean) {
  return useQuery<string>({
    queryKey: ["monitoring", "logs", containerId],
    queryFn: async () => {
      return await invoke<string>("get_container_logs", {
        containerId,
        tail: 200,
      })
    },
    enabled: enabled && !!containerId,
    refetchInterval: 5_000,
    retry: 0,
  })
}
