import { create } from "zustand";

export type GatewayStartupPhase = 'starting' | 'health_checking' | 'ready' | 'failed' | null;

interface GatewayState {
  connected: boolean;
  connecting: boolean;
  startupPhase: GatewayStartupPhase;
  error: string | null;
  reconnectAttempts: number;
  pendingRestart: boolean;

  setConnected: () => void;
  setDisconnected: () => void;
  setConnecting: () => void;
  setStartupPhase: (phase: GatewayStartupPhase) => void;
  setError: (error: string) => void;
  incrementReconnect: () => void;
  setPendingRestart: (value: boolean) => void;
  reset: () => void;
}

export const useGatewayStore = create<GatewayState>((set) => ({
  connected: false,
  connecting: false,
  startupPhase: null,
  error: null,
  reconnectAttempts: 0,
  pendingRestart: false,

  setConnected: () =>
    set({ connected: true, connecting: false, startupPhase: 'ready', error: null, reconnectAttempts: 0 }),
  setDisconnected: () =>
    set({ connected: false, connecting: false, startupPhase: null, error: null }),
  setConnecting: () => set({ connecting: true, startupPhase: null, error: null }),
  setStartupPhase: (phase) => set({ startupPhase: phase }),
  setError: (error) => set({ connected: false, connecting: false, startupPhase: 'failed', error }),
  incrementReconnect: () =>
    set((s) => ({ reconnectAttempts: s.reconnectAttempts + 1 })),
  setPendingRestart: (value) => set({ pendingRestart: value }),
  reset: () =>
    set({
      connected: false,
      connecting: false,
      startupPhase: null,
      error: null,
      reconnectAttempts: 0,
      pendingRestart: false,
    }),
}));
