import { create } from "zustand";

export interface SystemCheckResult {
  platform: string;
  dockerAvailable: boolean;
  dockerRunning: boolean;
  nodeAvailable: boolean;
  nodeVersion: string | null;
  diskFreeGb: number;
  ramAvailableGb: number;
  port18789Free: boolean;
}

export interface InstallProgressData {
  step: string;
  percent: number;
  message: string;
}

export type InstallMethod = "docker" | "native";

type OnboardingStep = "system_check" | "install" | "verify" | "ready" | "error";

interface OnboardingState {
  step: OnboardingStep;
  systemCheckResult: SystemCheckResult | null;
  installMethod: InstallMethod | null;
  installProgress: InstallProgressData | null;
  isLoading: boolean;
  error: string | null;

  setStep: (step: OnboardingStep) => void;
  setSystemCheckResult: (result: SystemCheckResult) => void;
  setInstallMethod: (method: InstallMethod) => void;
  setInstallProgress: (progress: InstallProgressData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  step: "system_check" as OnboardingStep,
  systemCheckResult: null,
  installMethod: null,
  installProgress: null,
  isLoading: false,
  error: null,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step }),
  setSystemCheckResult: (result) => set({ systemCheckResult: result }),
  setInstallMethod: (method) => set({ installMethod: method }),
  setInstallProgress: (progress) => set({ installProgress: progress }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
