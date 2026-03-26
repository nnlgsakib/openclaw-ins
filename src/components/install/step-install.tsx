import { useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Container,
  Rocket,
} from "lucide-react";
import {
  useInstallOpenClaw,
  type InstallMethod,
} from "@/hooks/use-install";
import { useOnboardingStore } from "@/stores/use-onboarding-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DockerLogViewer } from "@/components/ui/log-viewer";
import { LayerProgress } from "@/components/ui/layer-progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

function getStepIcon(step: string) {
  switch (step) {
    case "checking_docker":
    case "checking_node":
      return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    case "pulling_image":
    case "installing_npm":
      return <Download className="h-5 w-5 text-primary" />;
    case "creating_dirs":
    case "writing_compose":
    case "writing_env":
    case "configuring":
      return <Container className="h-5 w-5 text-primary" />;
    case "starting_gateway":
      return <Rocket className="h-5 w-5 text-primary" />;
    case "verifying":
      return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    case "complete":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    default:
      return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
  }
}

interface StepInstallProps {
  method: InstallMethod;
}

export function StepInstall({ method }: StepInstallProps) {
  const { progress, mutate, isPending, isSuccess, isError, error, data } =
    useInstallOpenClaw();
  const {
    transitionToVerify,
    transitionToError,
    isInstalling: storeIsInstalling,
    setIsInstalling,
  } = useOnboardingStore();

  const handleStartInstall = useCallback(() => {
    setIsInstalling(true);
    mutate(
      { method },
      {
        onSuccess: () => {
          setIsInstalling(false);
          // Auto-transition to verify step on success
          transitionToVerify(method);
        },
        onError: (err) => {
          setIsInstalling(false);
          transitionToError(err.message || "Installation failed");
        },
      }
    );
  }, [method, mutate, transitionToVerify, transitionToError, setIsInstalling]);

  // Determine UI state — use store flag so state persists across navigation
  const isInstalling = isPending || storeIsInstalling;
  const isComplete = isSuccess;
  const hasFailed = isError;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Installing OpenClaw
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {method === "docker"
            ? "Setting up OpenClaw via Docker Compose"
            : "Installing OpenClaw natively via npm"}
        </p>
      </div>

      {/* Idle state — show start button */}
      {!isInstalling && !isComplete && !hasFailed && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {method === "docker"
                  ? "This will pull the OpenClaw Docker image and configure the gateway."
                  : "This will install OpenClaw globally via npm and run the setup wizard."}
              </p>
            </div>
            <Button size="lg" onClick={handleStartInstall}>
              {method === "docker" ? (
                <Container className="mr-2 h-4 w-4" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Start Installation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Installing state — real-time Docker logs with layer progress */}
      {isInstalling && !progress?.step && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Preparing Installation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-48" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2 space-y-2">
                <Skeleton className="h-96 w-full" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-2 flex-1" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isInstalling && progress?.step && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {getStepIcon(progress.step)}
              Installation in Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium">{progress.message}</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2 h-96">
                <DockerLogViewer />
              </div>
              <div className="space-y-2">
                <LayerProgress className="h-96 overflow-y-auto" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success state */}
      {isComplete && data && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div className="text-center">
              <h2 className="text-lg font-semibold">Installation Complete!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                OpenClaw {data.version ?? "latest"} installed via {data.method}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Gateway: {data.gatewayUrl}
              </p>
            </div>
            <Button onClick={() => transitionToVerify(method)}>
              Continue to Verification
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {hasFailed && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Installation Failed</AlertTitle>
          <AlertDescription>
            {error?.message ?? "An unexpected error occurred during installation."}
          </AlertDescription>
          <div className="mt-4">
            <Button variant="outline" onClick={handleStartInstall}>
              Retry Installation
            </Button>
          </div>
        </Alert>
      )}
    </div>
  );
}
