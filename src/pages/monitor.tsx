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
  AlertTriangle,
  Activity,
  Play,
  Square,
  RotateCcw,
  Loader2,
  Globe,
  Terminal,
  Zap,
  Clock,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function Monitor() {
  const { connected, startupPhase } = useGatewayStore();

  const isStarting = startupPhase === 'starting' || startupPhase === 'health_checking';
  const isReady = connected || startupPhase === 'ready';
  const isFailed = startupPhase === 'failed';
  const { start, stop, restart } = useGatewayActions();
  const [loading, setLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [gatewayVersion, setGatewayVersion] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const handleAction = async (action: "start" | "stop" | "restart") => {
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

  // Auto-trigger restart if arriving from configure page
  useEffect(() => {
    const { pendingRestart } = useGatewayStore.getState();
    if (pendingRestart) {
      useGatewayStore.getState().setPendingRestart(false);
      // Small delay to let the page render
      const timer = setTimeout(() => {
        handleAction("restart");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Monitor
        </h1>
        <p className="text-sm text-muted-foreground">
          Gateway status, logs, and process management.
        </p>
      </div>

      {/* Status and Controls Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Status
              </CardTitle>
              <Badge
                variant={
                  isReady ? "success" :
                  isStarting ? "warning" :
                  isFailed ? "destructive" :
                  "outline"
                }
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isReady ? "bg-success pulse-status" :
                      isStarting ? "bg-warning pulse-status" :
                      isFailed ? "bg-destructive" :
                      "bg-muted-foreground"
                    )}
                  />
                  {isReady ? "Running" :
                   isStarting ? "Starting" :
                   isFailed ? "Failed" :
                   "Stopped"}
                </span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status details */}
            <div className="grid grid-cols-2 gap-3">
              <StatusItem label="Status" value={
                isReady ? "Connected" :
                isStarting ? (startupPhase === 'health_checking' ? "Health Checking" : "Starting") :
                isFailed ? "Startup Failed" :
                "Disconnected"
              } />
              <StatusItem label="Port" value="18789" mono />
              <StatusItem label="Process" value={gatewayVersion ?? "N/A"} mono className="col-span-2" />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-border">
              {!connected ? (
                <Button
                  size="sm"
                  onClick={() => handleAction("start")}
                  disabled={loading !== null}
                  className="flex-1"
                >
                  {loading === "start" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Start Gateway
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction("restart")}
                    disabled={loading !== null}
                    className="flex-1"
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
                    className="flex-1"
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
          </CardContent>
        </Card>

        {/* Quick Links Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Quick Links
            </CardTitle>
            <CardDescription>
              Access gateway interfaces and configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickLink
                icon={Globe}
                label="Gateway UI"
                href="http://127.0.0.1:18789"
                external
                disabled={!isReady}
              />
              <QuickLink
                icon={Activity}
                label="Control UI"
                to="/webapp"
                disabled={!isReady}
              />
              <QuickLink
                icon={Activity}
                label="Configure"
                to="/configure"
              />
              <QuickLink
                icon={Activity}
                label="Channels"
                to="/channels"
              />
            </div>

            {!connected && !isStarting && !isFailed && (
              <Alert className="mt-4 border-warning/30 bg-warning/5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-warning">Gateway Not Running</AlertTitle>
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

            {isStarting && (
              <Alert className="mt-4 border-warning/30 bg-warning/5">
                <Loader2 className="h-4 w-4 text-warning animate-spin" />
                <AlertTitle className="text-warning">Gateway Starting</AlertTitle>
                <AlertDescription>
                  Waiting for gateway to become ready. This usually takes 5-15 seconds.
                </AlertDescription>
              </Alert>
            )}

            {isFailed && (
              <Alert className="mt-4 border-destructive/30 bg-destructive/5">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertTitle className="text-destructive">Gateway Startup Failed</AlertTitle>
                <AlertDescription>
                  Gateway failed to become healthy. Check the logs below or retry.{" "}
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
      </div>

      {/* Logs Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Live Logs</CardTitle>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{logs.length} entries</span>
            </div>
          </div>
          <CardDescription>
            Real-time Gateway output (stdout + stderr)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "relative rounded-lg border border-border overflow-auto",
              "bg-[#0d0f12] font-mono text-xs",
              "max-h-[400px]"
            )}
          >
            {/* Log header bar */}
            <div className="sticky top-0 flex items-center gap-2 px-4 py-2 border-b border-border bg-[#0d0f12]/90 backdrop-blur-sm">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
              </div>
              <span className="text-[10px] text-muted-foreground ml-2">gateway.log</span>
            </div>

            {/* Log content */}
            <div className="p-4">
              {logs.length === 0 ? (
                <p className="text-muted-foreground italic">
                  No logs yet — start the Gateway to see output.
                </p>
              ) : (
                <div className="space-y-0.5">
                  {logs.map((line, i) => (
                    <LogLine key={i} line={line} />
                  ))}
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusItem({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-medium text-foreground", mono && "font-mono")}>
        {value}
      </p>
    </div>
  );
}

interface QuickLinkProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  to?: string;
  external?: boolean;
  disabled?: boolean;
}

function QuickLink({ icon: Icon, label, href, to, external, disabled }: QuickLinkProps) {
  const content = (
    <div
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-lg border border-border",
        "transition-all duration-200",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-accent hover:border-border-hover cursor-pointer hover:-translate-y-0.5"
      )}
    >
      <Icon className={cn("h-5 w-5", disabled ? "text-muted-foreground" : "text-primary")} />
      <span className="text-xs font-medium text-foreground">{label}</span>
    </div>
  );

  if (disabled) {
    return content;
  }

  if (external && href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  if (to) {
    return <Link to={to}>{content}</Link>;
  }

  return content;
}

function LogLine({ line }: { line: string }) {
  // Simple syntax highlighting for log levels
  const getLineClass = (text: string) => {
    if (text.includes("ERROR") || text.includes("error")) return "text-red-400";
    if (text.includes("WARN") || text.includes("warn")) return "text-yellow-400";
    if (text.includes("INFO")) return "text-green-400";
    if (text.includes("DEBUG")) return "text-muted-foreground";
    return "text-foreground/80";
  };

  return (
    <div className={cn("whitespace-pre-wrap leading-relaxed", getLineClass(line))}>
      {line}
    </div>
  );
}
