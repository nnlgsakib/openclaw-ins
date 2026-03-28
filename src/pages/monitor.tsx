import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useGatewayStore } from "@/stores/use-gateway-store";
import { useGatewayActions } from "@/hooks/use-gateway";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle2,
  AlertTriangle,
  Activity,
  Play,
  Square,
  RotateCcw,
  Loader2,
  PlayIcon,
  Globe,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export function Monitor() {
  const { connected } = useGatewayStore();
  const { start, stop, restart } = useGatewayActions();
  const [loading, setLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [gatewayVersion, setGatewayVersion] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Check gateway status on mount
  useEffect(() => {
    if (connected) {
      invoke<{ running: boolean; port: number; pid: number | null }>(
        "get_gateway_status"
      ).then((s) => {
        if (s.pid) setGatewayVersion(`PID ${s.pid}`);
      });
    }
  }, [connected]);

  // Listen for gateway output
  useEffect(() => {
    const unlisten = listen<{ line: string; stream: string }>(
      "gateway-output",
      (e) => {
        setLogs((prev) => [...prev.slice(-199), e.payload.line]);
      }
    );
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleAction = async (
    action: "start" | "stop" | "restart"
  ) => {
    setLoading(action);
    try {
      if (action === "start") await start();
      else if (action === "stop") await stop();
      else await restart();
      toast.success(
        `Gateway ${action === "start" ? "started" : action === "stop" ? "stopped" : "restarted"}`
      );
    } catch (e) {
      toast.error(`Failed: ${e}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Monitor</h1>
        <p className="text-muted-foreground">
          Gateway status, logs, and management.
        </p>
      </div>

      {/* Gateway Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Gateway
            </CardTitle>
            <Badge
              variant={connected ? "default" : "outline"}
              className={
                connected ? "bg-green-600 hover:bg-green-700" : ""
              }
            >
              {connected ? (
                <CheckCircle2 className="mr-1 h-3 w-3" />
              ) : (
                <AlertTriangle className="mr-1 h-3 w-3" />
              )}
              {connected ? "Running" : "Stopped"}
            </Badge>
          </div>
          <CardDescription>
            OpenClaw Gateway process on port 18789
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status info */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Status
              </p>
              <p className="text-sm font-mono">
                {connected ? "Connected" : "Disconnected"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Port
              </p>
              <p className="text-sm font-mono">18789</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Process
              </p>
              <p className="text-sm font-mono">
                {gatewayVersion ?? "N/A"}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {!connected ? (
              <Button
                size="sm"
                onClick={() => handleAction("start")}
                disabled={loading !== null}
              >
                {loading === "start" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Start
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction("restart")}
                  disabled={loading !== null}
                >
                  {loading === "restart" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  Restart
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction("stop")}
                  disabled={loading !== null}
                >
                  {loading === "stop" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Square className="mr-2 h-4 w-4" />
                  )}
                  Stop
                </Button>
              </>
            )}
          </div>

          {!connected && (
            <Alert>
              <PlayIcon className="h-4 w-4" />
              <AlertTitle>Gateway Not Running</AlertTitle>
              <AlertDescription>
                Start the Gateway to enable AI agent features.{" "}
                <Link
                  to="/install"
                  className="font-medium underline hover:text-foreground"
                >
                  Go to Install page
                </Link>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Logs Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Logs
          </CardTitle>
          <CardDescription>
            Real-time Gateway output (stdout + stderr)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative max-h-96 overflow-auto rounded-lg bg-black/90 p-4 font-mono text-xs text-green-400">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">
                No logs yet — start the Gateway to see output.
              </p>
            ) : (
              logs.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  {line}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      {connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Quick Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a
                  href="http://127.0.0.1:18789"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Gateway UI
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/webapp">OpenClaw Control UI</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/configure">Configure</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/channels">Channels</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
