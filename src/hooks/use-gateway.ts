import { useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatewayStore } from "@/stores/use-gateway-store";
import type { GatewayStartupPhase } from "@/stores/use-gateway-store";

// ─── Types ────────────────────────────────────────────────────────

interface GatewayConnectionResult {
  connected: boolean;
}

interface GatewayWsStatusEvent {
  connected: boolean;
  error: string | null;
}

interface GatewayStatusEvent {
  connected: boolean;
}

interface GatewayStatusResult {
  running: boolean;
  port: number;
  pid: number | null;
  startupPhase?: GatewayStartupPhase;
}

// ─── Hooks ────────────────────────────────────────────────────────

/**
 * Checks gateway status on app startup and listens for status events.
 * Should be mounted once at app root.
 */
export function useGatewayStatusListener() {
  const { setConnected, setDisconnected } = useGatewayStore();

  useEffect(() => {
    // Check if gateway is already running on app startup
    invoke<GatewayStatusResult>("get_gateway_status")
      .then((status) => {
        if (status.running) {
          if (status.startupPhase === 'ready') {
            setConnected();
          } else if (status.startupPhase) {
            useGatewayStore.getState().setStartupPhase(status.startupPhase);
          }
        }
      })
      .catch(() => {});

    // Listen for gateway-status events (ready from health check)
    const unlisten1 = listen<GatewayStatusEvent>("gateway-status", (event) => {
      if (event.payload.connected) {
        setConnected();
      }
    });

    // Listen for startup phase changes from backend health check
    const unlisten_startup = listen<{ phase: GatewayStartupPhase }>("gateway-startup-phase", (event) => {
      useGatewayStore.getState().setStartupPhase(event.payload.phase);
    });

    // Listen for gateway output that indicates ready
    const unlisten2 = listen<{ line: string; stream: string }>("gateway-output", (event) => {
      if (
        event.payload.line.includes("Gateway listening") ||
        event.payload.line.includes("listening on") ||
        event.payload.line.includes("ready") ||
        event.payload.line.includes("Gateway already running")
      ) {
        setConnected();
      }
    });

    // Listen for gateway stopped
    const unlisten3 = listen("gateway-stopped", () => {
      setDisconnected();
    });

    // Listen for health check failure
    const unlisten_failed = listen<{ reason: string }>("gateway-health-failed", (event) => {
      useGatewayStore.getState().setError(event.payload.reason);
    });

    return () => {
      unlisten1.then((fn) => fn());
      unlisten_startup.then((fn) => fn());
      unlisten2.then((fn) => fn());
      unlisten3.then((fn) => fn());
      unlisten_failed.then((fn) => fn());
    };
  }, [setConnected, setDisconnected]);

  // Fallback polling: check gateway status every 5s during startup
  useEffect(() => {
    const pollInterval = setInterval(() => {
      const { startupPhase, connected } = useGatewayStore.getState();
      if (!connected && (startupPhase === 'starting' || startupPhase === 'health_checking')) {
        invoke<GatewayStatusResult>("get_gateway_status")
          .then((status) => {
            if (status.running && status.startupPhase === 'ready') {
              useGatewayStore.getState().setConnected();
            } else if (status.startupPhase === 'health_checking') {
              useGatewayStore.getState().setStartupPhase('health_checking');
            }
          })
          .catch(() => {});
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, []);
}

/**
 * Gateway management actions: start, stop, restart.
 */
export function useGatewayActions() {
  const { setDisconnected, setError } = useGatewayStore();

  const start = useCallback(async () => {
    try {
      useGatewayStore.getState().setStartupPhase('starting');
      await invoke("start_gateway", { port: 18789 });
      // Do NOT call setConnected() - wait for gateway-status event from health check
    } catch (e) {
      setError(String(e));
    }
  }, [setError]);

  const stop = useCallback(async () => {
    try {
      await invoke("stop_gateway");
      setDisconnected();
    } catch (e) {
      setError(String(e));
    }
  }, [setDisconnected, setError]);

  const restart = useCallback(async () => {
    try {
      const { setStartupPhase } = useGatewayStore.getState();
      setDisconnected();
      setStartupPhase('starting');
      await invoke("restart_gateway", { port: 18789 });
      // Do NOT call setConnected() - wait for gateway-status event
    } catch (e) {
      setError(String(e));
    }
  }, [setDisconnected, setError]);

  const killExternal = useCallback(async () => {
    try {
      await invoke("kill_gateway_on_port");
      setDisconnected();
    } catch (e) {
      setError(String(e));
    }
  }, [setDisconnected, setError]);

  return { start, stop, restart, killExternal };
}

/**
 * Manages Gateway WebSocket connection lifecycle.
 */
export function useGatewayConnection() {
  const { connected, connecting, error, setConnected, setConnecting, setError, incrementReconnect, reconnectAttempts } =
    useGatewayStore();

  const connect = useCallback(async () => {
    setConnecting();
    try {
      await invoke<GatewayConnectionResult>("gateway_ws_connect", { port: 18789 });
      setConnected();
    } catch (e) {
      setError(String(e));
    }
  }, [setConnecting, setConnected, setError]);

  useEffect(() => {
    const unlisten = listen<GatewayWsStatusEvent>("gateway-ws-status", (event) => {
      if (event.payload.connected) {
        setConnected();
      } else {
        setError(event.payload.error ?? "Disconnected");
        const delay = Math.min(2000 * Math.pow(2, reconnectAttempts), 30000);
        incrementReconnect();
        setTimeout(() => connect(), delay);
      }
    });

    connect();

    return () => {
      unlisten.then((fn) => fn());
      invoke("gateway_ws_disconnect").catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { connected, connecting, error };
}

/**
 * Generic hook for making Gateway WebSocket API calls.
 */
export function useGatewayCall<T>(
  method: string,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean; staleTime?: number }
) {
  const connected = useGatewayStore((s) => s.connected);

  return useQuery<T>({
    queryKey: ["gateway", method, params],
    queryFn: async () => {
      const response = await invoke<{ result: T }>("gateway_ws_call", {
        method,
        params: params ?? {},
      });
      return (response as { result: T }).result ?? (response as T);
    },
    enabled: connected && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 30000,
    retry: 1,
  });
}

export function useGatewayConfig() {
  return useGatewayCall<{ config: Record<string, unknown>; baseHash: string }>(
    "config.get",
    {},
    { staleTime: 30000 }
  );
}

export function useGatewaySessions() {
  return useGatewayCall<{ sessions: unknown[] }>(
    "sessions.list",
    {},
    { staleTime: 5000 }
  );
}

export function useGatewayConfigPatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ raw, baseHash }: { raw: string; baseHash: string }) => {
      return await invoke("gateway_ws_call", {
        method: "config.patch",
        params: { raw, baseHash },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gateway", "config.get"] });
    },
  });
}
