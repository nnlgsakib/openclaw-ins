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

export interface VerificationResult {
  success: boolean;
  method: string;
  gatewayUrl: string;
  gatewayToken: string | null;
  error: string | null;
  suggestion: string | null;
}

interface OnboardingState {
  step: OnboardingStep;
  systemCheckResult: SystemCheckResult | null;
  installMethod: InstallMethod | null;
  installProgress: InstallProgressData | null;
  verificationProgress: InstallProgressData | null;
  verificationResult: VerificationResult | null;
  isLoading: boolean;
  error: string | null;
  isInstalling: boolean;

  setStep: (step: OnboardingStep) => void;
  setSystemCheckResult: (result: SystemCheckResult) => void;
  setInstallMethod: (method: InstallMethod) => void;
  setInstallProgress: (progress: InstallProgressData | null) => void;
  setVerificationProgress: (progress: InstallProgressData | null) => void;
  setVerificationResult: (result: VerificationResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsInstalling: (isInstalling: boolean) => void;
  transitionToVerify: (method: InstallMethod) => void;
  transitionToReady: (result: VerificationResult) => void;
  transitionToError: (errorMessage: string) => void;
  retryVerification: () => void;
  retryInstallation: () => void;
  reset: () => void;
}

const initialState = {
  step: "system_check" as OnboardingStep,
  systemCheckResult: null,
  installMethod: null,
  installProgress: null,
  verificationProgress: null,
  verificationResult: null,
  isLoading: false,
  error: null,
  isInstalling: false,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step }),
  setSystemCheckResult: (result) => set({ systemCheckResult: result }),
  setInstallMethod: (method) => set({ installMethod: method }),
  setInstallProgress: (progress) => set({ installProgress: progress }),
  setVerificationProgress: (progress) => set({ verificationProgress: progress }),
  setVerificationResult: (result) => set({ verificationResult: result }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setIsInstalling: (isInstalling) => set({ isInstalling }),
  transitionToVerify: (method) =>
    set({
      step: "verify",
      installMethod: method,
      installProgress: null,
      verificationProgress: null,
      verificationResult: null,
      isInstalling: false,
      error: null,
    }),
  transitionToReady: (result) =>
    set({
      step: "ready",
      verificationResult: result,
      isInstalling: false,
      error: null,
    }),
  transitionToError: (errorMessage) =>
    set({
      step: "error",
      error: errorMessage,
      isInstalling: false,
    }),
  retryVerification: () =>
    set({
      step: "verify",
      verificationProgress: null,
      verificationResult: null,
      error: null,
    }),
  retryInstallation: () =>
    set({
      step: "install",
      installProgress: null,
      verificationProgress: null,
      verificationResult: null,
      isInstalling: false,
      error: null,
    }),
  reset: () => set(initialState),
}));
