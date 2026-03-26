import { useOnboardingStore, type InstallMethod } from "@/stores/use-onboarding-store";
import { SystemCheck } from "@/components/system-check";
import { StepInstall } from "@/components/install/step-install";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container, Download, ArrowRight } from "lucide-react";

function MethodSelector() {
  const { setInstallMethod, setStep } = useOnboardingStore();

  const handleSelect = (method: InstallMethod) => {
    setInstallMethod(method);
    setStep("install");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Choose Installation Method
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Select how you want to install OpenClaw
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card
          className="cursor-pointer transition-colors hover:border-primary"
          onClick={() => handleSelect("docker")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Container className="h-5 w-5" />
              Docker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Recommended. Runs OpenClaw in an isolated container with sandbox
              capabilities. Requires Docker Desktop.
            </p>
            <Button className="mt-4 w-full" variant="outline">
              Select Docker
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:border-primary"
          onClick={() => handleSelect("native")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5" />
              Native
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Installs OpenClaw directly on your machine via npm. Requires
              Node.js 22+. No sandbox isolation.
            </p>
            <Button className="mt-4 w-full" variant="outline">
              Select Native
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PlaceholderStep({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Coming soon</p>
      </div>
    </div>
  );
}

export function Install() {
  const { step, installMethod } = useOnboardingStore();

  switch (step) {
    case "system_check":
      return <SystemCheck />;
    case "install":
      // If no method selected yet, show selector
      if (!installMethod) {
        return <MethodSelector />;
      }
      return <StepInstall method={installMethod} />;
    case "verify":
      return <PlaceholderStep title="Verifying Installation" />;
    case "ready":
      return <PlaceholderStep title="Installation Complete" />;
    case "error":
      return <PlaceholderStep title="Installation Error" />;
    default:
      return <SystemCheck />;
  }
}
