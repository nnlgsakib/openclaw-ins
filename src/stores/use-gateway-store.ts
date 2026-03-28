import { create } from "zustand";

interface GatewayState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempts: number;

  setConnected: () => void;
  setDisconnected: () => void;
  setConnecting: () => void;
  setError: (error: string) => void;
  incrementReconnect: () => void;
  reset: () => void;
}

export const useGatewayStore = create<GatewayState>((set) => ({
  connected: false,
  connecting: false,
  error: null,
  reconnectAttempts: 0,

  setConnected: () =>
    set({ connected: true, connecting: false, error: null, reconnectAttempts: 0 }),
  setDisconnected: () =>
    set({ connected: false, connecting: false, error: null }),
  setConnecting: () => set({ connecting: true, error: null }),
  setError: (error) => set({ connected: false, connecting: false, error }),
  incrementReconnect: () =>
    set((s) => ({ reconnectAttempts: s.reconnectAttempts + 1 })),
  reset: () =>
    set({
      connected: false,
      connecting: false,
      error: null,
      reconnectAttempts: 0,
    }),
}));
