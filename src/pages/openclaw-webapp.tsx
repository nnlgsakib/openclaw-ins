import { invoke } from "@tauri-apps/api/core";
import { Globe, Play, Loader2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGatewayStore } from "@/stores/use-gateway-store";
import { toast } from "sonner";

export function OpenClawWebapp() {
  const { connected } = useGatewayStore();
  const [starting, setStarting] = useState(false);
  const [opening, setOpening] = useState(false);

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

  return (
    <div className="flex h-[calc(100vh-3rem)] items-center justify-center p-6">
      <Card className="max-w-md">
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
          <p className="text-xs text-muted-foreground">Opens in a new app window</p>
        </CardContent>
      </Card>
    </div>
  );
}
