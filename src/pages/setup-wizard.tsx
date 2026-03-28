import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWizardStore, TOTAL_STEPS, MODEL_PROVIDERS } from "@/stores/use-wizard-store";
import { WelcomeStep } from "@/components/wizard/welcome-step";
import { ModelStep } from "@/components/wizard/model-step";
import { ApiKeysStep } from "@/components/wizard/api-keys-step";
import { SandboxStep } from "@/components/wizard/sandbox-step";
import { ChannelsStep } from "@/components/wizard/channels-step";
import { ReviewStep } from "@/components/wizard/review-step";
import { cn } from "@/lib/utils";

const STEP_LABELS = [
  "Welcome",
  "Model",
  "API Key",
  "Sandbox",
  "Channels",
  "Review",
];

export default function SetupWizard() {
  const navigate = useNavigate();
  const { currentStep, nextStep, prevStep, goToStep, getGeneratedConfig, workspacePath, apiKey, modelProvider, selectedModel, customModelId } =
    useWizardStore();
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const config = getGeneratedConfig();
      // Save OpenClaw config
      await invoke("write_config", { config });
      // Save desktop config
      await invoke("write_desktop_config", {
        config: {
          workspacePath: workspacePath || null,
          gatewayPort: 18789,
          apiKey: apiKey || null,
          apiKeyEnv: null,
          selectedProvider: modelProvider,
          selectedModel: customModelId || selectedModel || null,
        },
      });
      // Write API key to OpenClaw's auth store so the gateway can find it
      if (apiKey && modelProvider) {
        const provider = MODEL_PROVIDERS.find((p) => p.id === modelProvider);
        if (provider && provider.authType === "api-key") {
          await invoke("write_auth_profile", {
            provider: modelProvider,
            apiKey,
            mode: "api_key",
          });
          // Also write to .env as fallback
          if (provider.envVar) {
            await invoke("write_env_key", {
              envVar: provider.envVar,
              value: apiKey,
            });
          }
          toast.info(`API key saved to OpenClaw auth store`);
        }
      }
      toast.success("Configuration saved! Starting installation...");
      navigate("/install");
    } catch (err) {
      toast.error(`Failed to save config: ${err}`);
      setIsInstalling(false);
    }
  };

  const steps = [
    <WelcomeStep key="welcome" />,
    <ModelStep key="model" />,
    <ApiKeysStep key="apikeys" />,
    <SandboxStep key="sandbox" />,
    <ChannelsStep key="channels" />,
    <ReviewStep key="review" />,
  ];

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col">
      {/* Progress bar */}
      <div className="border-b border-border px-6 py-4">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            {STEP_LABELS.map((label, i) => (
              <button
                key={label}
                onClick={() => i < currentStep && goToStep(i)}
                disabled={i > currentStep}
                className={cn(
                  "flex flex-col items-center gap-1.5 transition-colors",
                  i <= currentStep
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-40"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                    i < currentStep
                      ? "border-primary bg-primary text-primary-foreground"
                      : i === currentStep
                      ? "border-primary text-primary"
                      : "border-muted text-muted-foreground"
                  )}
                >
                  {i < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs",
                    i === currentStep
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
          {/* Progress line */}
          <div className="mt-2 h-0.5 w-full rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={false}
              animate={{
                width: `${(currentStep / (TOTAL_STEPS - 1)) * 100}%`,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            {steps[currentStep]}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="border-t border-border px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {currentStep < TOTAL_STEPS - 1 ? (
            <Button onClick={nextStep} className="gap-2">
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              className="gap-2"
            >
              {isInstalling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isInstalling ? "Saving..." : "Start Installation"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
