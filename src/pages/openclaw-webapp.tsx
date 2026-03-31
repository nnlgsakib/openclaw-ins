import { invoke } from "@tauri-apps/api/core";
import { Globe, Play, Loader2, ExternalLink, AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useGatewayStore } from "@/stores/use-gateway-store";
import { isProviderError, getProviderGuidance, extractProviderErrorMessage } from "@/lib/provider-errors";
import { toast } from "sonner";

export function OpenClawWebapp() {
  const { connected } = useGatewayStore();
  const [starting, setStarting] = useState(false);
  const [opening, setOpening] = useState(false);
  const [checkingProvider, setCheckingProvider] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);

  const handleStartGateway = async () => {
    setStarting(true);
    try {
      await invoke("start_gateway", { port: 18789 });
      toast.success("Gateway starting...");
    } catch (e) {
      toast.error(`Failed to start Gateway: ${e}`);
    } finally {
      setStarting(false);
    }
  };

  const handleOpenUI = async () => {
    setOpening(true);
    try {
      await invoke("open_control_ui");
    } catch (e) {
      toast.error(`Failed to open: ${e}`);
    } finally {
      setOpening(false);
    }
  };

  const handleCheckProvider = async () => {
    setCheckingProvider(true);
    setProviderError(null);
    try {
      await invoke("gateway_ws_call", {
        method: "config.get",
        params: {},
      });
      toast.success("Provider is responding normally.");
    } catch (e) {
      if (isProviderError(e)) {
        setProviderError(extractProviderErrorMessage(e));
      } else {
        setProviderError(String(e));
      }
    } finally {
      setCheckingProvider(false);
    }
  };

  if (!connected) {
    return (
      <div className="flex h-[calc(100vh-3rem)] items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Globe className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>OpenClaw UI Not Available</CardTitle>
            <CardDescription>
              Start the Gateway to access the OpenClaw Control UI.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={handleStartGateway} disabled={starting} className="gap-2">
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {starting ? "Starting..." : "Start Gateway"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const guidance = providerError ? getProviderGuidance() : null;

  return (
    <div className="flex h-[calc(100vh-3rem)] items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-4">
        {providerError && guidance && (
          <Alert variant="warning" className="relative">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{guidance.title}</AlertTitle>
            <AlertDescription>
              <p className="mb-2">{providerError}</p>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {guidance.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-6 w-6"
              onClick={() => setProviderError(null)}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </Alert>
        )}

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <Globe className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle>OpenClaw Control UI</CardTitle>
            <CardDescription>
              Gateway is running. Open the Control UI in a dedicated window.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <Button onClick={handleOpenUI} disabled={opening} className="gap-2 w-full">
              {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              {opening ? "Opening..." : "Open Control UI"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckProvider}
              disabled={checkingProvider}
              className="gap-2 w-full"
            >
              {checkingProvider ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {checkingProvider ? "Checking..." : "Check Provider Status"}
            </Button>
            <p className="text-xs text-muted-foreground">Opens in a new app window</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
