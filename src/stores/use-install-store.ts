import { create } from "zustand";

export interface NodeJsInfo {
  installed: boolean;
  version: string | null;
  meetsMinimum: boolean;
  meetsRecommended: boolean;
}

export interface OpenClawInfo {
  installed: boolean;
  version: string | null;
}

export interface PrerequisitesInfo {
  nodejs: NodeJsInfo;
  openclaw: OpenClawInfo;
}

export type InstallStep = "prerequisites" | "starting" | "connected";

interface InstallState {
  step: InstallStep;
  prereqs: PrerequisitesInfo | null;
  loading: boolean;
  installing: boolean;
  logs: string[];

  setStep: (step: InstallStep) => void;
  setPrereqs: (prereqs: PrerequisitesInfo) => void;
  setLoading: (loading: boolean) => void;
  setInstalling: (installing: boolean) => void;
  addLog: (log: string) => void;
  clearLogs: () => void;
  reset: () => void;
}

export const useInstallStore = create<InstallState>((set) => ({
  step: "prerequisites",
  prereqs: null,
  loading: true,
  installing: false,
  logs: [],

  setStep: (step) => set({ step }),
  setPrereqs: (prereqs) => set({ prereqs, loading: false }),
  setLoading: (loading) => set({ loading }),
  setInstalling: (installing) => set({ installing }),
  addLog: (log) => set((s) => ({ logs: [...s.logs, log] })),
  clearLogs: () => set({ logs: [] }),
  reset: () =>
    set({
      step: "prerequisites",
      prereqs: null,
      loading: true,
      installing: false,
      logs: [],
    }),
}));
