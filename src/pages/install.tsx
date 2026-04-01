import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  ArrowRight,
  Terminal,
  ChevronDown,
  ChevronUp,
  Download,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useInstallStore, type PrerequisitesInfo } from "@/stores/use-install-store";
import { cn } from "@/lib/utils";
import { useOpenClawUpdateCheck } from "@/hooks/use-update";

export function Install() {
  const navigate = useNavigate();
  const {
    step,
    prereqs,
    loading,
    installing,
    logs,
    setStep,
    setPrereqs,
    setLoading,
    setInstalling,
    addLog,
  } = useInstallStore();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const hasCheckedPrereqs = useRef(false);
  const [showLogs, setShowLogs] = useState(false);

  // Update check for OpenClaw (enabled only when installed)
  const {
    data: updateCheck,
    refetch: refetchUpdate,
  } = useOpenClawUpdateCheck();

  // Check prerequisites only once
  useEffect(() => {
    if (!hasCheckedPrereqs.current && !prereqs) {
      hasCheckedPrereqs.current = true;
      checkPrereqs();
    } else if (prereqs) {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for install output
  useEffect(() => {
    const unlisten = listen<string>("install-output", (event) => {
      addLog(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for gateway output
  useEffect(() => {
    const unlisten = listen<{ line: string; stream: string }>(
      "gateway-output",
      (event) => {
        addLog(event.payload.line);
        if (
          event.payload.line.includes("Gateway listening") ||
          event.payload.line.includes("listening on") ||
          event.payload.line.includes("ready")
        ) {
          setStep("connected");
          setTimeout(() => navigate("/"), 2000);
        }
      }
    );
    return () => {
      unlisten.then((fn) => fn());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const checkPrereqs = async () => {
    setLoading(true);
    try {
      const result = await invoke<PrerequisitesInfo>("check_prerequisites");
      setPrereqs(result);
      // Refetch update check after prereqs (will show update availability if OpenClaw is installed)
      if (result.openclaw.installed) {
        refetchUpdate();
      }
    } catch (e) {
      toast.error(`Failed to check prerequisites: ${e}`);
      setLoading(false);
    }
  };

  const handleInstallOpenClaw = async () => {
    setInstalling(true);
    try {
      const version = await invoke<string>("install_openclaw_script");
      toast.success(`OpenClaw ${version} installed successfully`);
      await checkPrereqs();
    } catch (e) {
      toast.error(`Installation failed: ${e}`);
    } finally {
      setInstalling(false);
    }
  };

  const handleUpdateOpenClaw = async () => {
    setInstalling(true);
    try {
      const version = await invoke<string>("reinstall_openclaw");
      toast.success(`OpenClaw updated to ${version}`);
      await checkPrereqs();
    } catch (e) {
      toast.error(`Update failed: ${e}`);
    } finally {
      setInstalling(false);
    }
  };

  const handleReinstallOpenClaw = async () => {
    setInstalling(true);
    try {
      const version = await invoke<string>("reinstall_openclaw");
      toast.success(`OpenClaw ${version} reinstalled successfully`);
      await checkPrereqs();
    } catch (e) {
      toast.error(`Reinstallation failed: ${e}`);
    } finally {
      setInstalling(false);
    }
  };

  const handleStartGateway = async () => {
    setStep("starting");
    try {
      await invoke("start_gateway", { port: 18789 });
    } catch (e) {
      toast.error(`Failed to start Gateway: ${e}`);
      setStep("prerequisites");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Start OpenClaw
        </h1>
        <p className="text-sm text-muted-foreground">
          Check prerequisites and start the OpenClaw Gateway.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 py-4">
        <StepIndicator
          label="Prerequisites"
          step={1}
          active={step === "prerequisites"}
          completed={step !== "prerequisites"}
        />
        <StepConnector completed={step !== "prerequisites"} />
        <StepIndicator
          label="Starting"
          step={2}
          active={step === "starting"}
          completed={step === "connected"}
        />
        <StepConnector completed={step === "connected"} />
        <StepIndicator
          label="Connected"
          step={3}
          active={step === "connected"}
          completed={false}
        />
      </div>

      {/* Prerequisites step */}
      {step === "prerequisites" && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Prerequisites</CardTitle>
                <CardDescription>
                  Verify your system has the required dependencies.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <>
                <PrereqSkeleton />
                <PrereqSkeleton />
              </>
            ) : (
              <>
                <PrereqRow
                  label="Node.js"
                  status={
                    prereqs?.nodejs.installed
                      ? prereqs.nodejs.meetsRecommended
                        ? "recommended"
                        : prereqs.nodejs.meetsMinimum
                        ? "minimum"
                        : "old"
                      : "missing"
                  }
                  version={prereqs?.nodejs.version ?? undefined}
                  detail={
                    prereqs?.nodejs.installed
                      ? prereqs.nodejs.meetsRecommended
                        ? "Recommended version (24+)"
                        : prereqs.nodejs.meetsMinimum
                        ? "Minimum version met (22.14+)"
                        : "Version too old — 22.14+ required"
                      : "Not found in PATH"
                  }
                />
                <PrereqRow
                  label="OpenClaw"
                  status={prereqs?.openclaw.installed ? "ok" : "missing"}
                  version={prereqs?.openclaw.version ?? undefined}
                  detail={
                    prereqs?.openclaw.installed
                      ? updateCheck?.updateAvailable
                        ? `Update available: ${prereqs.openclaw.version} → ${updateCheck.latestVersion}`
                        : "Installed (latest)"
                      : "Not installed"
                  }
                  action={
                    installing ? (
                      <Button size="sm" disabled>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Working...
                      </Button>
                    ) : prereqs?.openclaw.installed ? (
                      <div className="flex gap-2">
                        {updateCheck?.updateAvailable && (
                          <Button size="sm" onClick={handleUpdateOpenClaw}>
                            <Download className="mr-2 h-4 w-4" />
                            Update
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleReinstallOpenClaw}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Reinstall
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={handleInstallOpenClaw}>
                        <Download className="mr-2 h-4 w-4" />
                        Install OpenClaw
                      </Button>
                    )
                  }
                />
              </>
            )}

            {prereqs?.nodejs.installed && prereqs?.openclaw.installed && (
              <div className="pt-4 border-t border-border">
                <Button onClick={handleStartGateway} className="gap-2 w-full sm:w-auto">
                  <Play className="h-4 w-4" />
                  Start Gateway
                </Button>
              </div>
            )}

            {/* View Logs toggle */}
            {logs.length > 0 && (
              <div className="pt-4 border-t border-border">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Terminal className="h-4 w-4" />
                  {showLogs ? "Hide" : "View"} Installation Logs ({logs.length} lines)
                  {showLogs ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
                {showLogs && (
                  <div className="mt-3 rounded-lg border border-border bg-[#0d0f12] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-[#0d0f12]/80">
                      <div className="flex gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                      </div>
                      <span className="text-[10px] text-muted-foreground ml-2">install.log</span>
                    </div>
                    <div className="max-h-64 overflow-auto p-4 font-mono text-xs text-foreground/80">
                      {logs.map((line, i) => (
                        <div key={i} className="whitespace-pre-wrap">
                          {line}
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Starting/Connected steps */}
      {(step === "starting" || step === "connected") && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg",
                    step === "connected"
                      ? "bg-success/10"
                      : "bg-primary/10"
                  )}
                >
                  {step === "connected" ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  )}
                </div>
                <div>
                  <CardTitle>
                    {step === "connected"
                      ? "Gateway Connected"
                      : "Starting Gateway..."}
                  </CardTitle>
                  <CardDescription>
                    {step === "connected"
                      ? "Redirecting to dashboard..."
                      : "OpenClaw Gateway is starting on port 18789"}
                  </CardDescription>
                </div>
              </div>
              {step === "connected" && (
                <Badge variant="success">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-white pulse-status" />
                    Connected
                  </span>
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {step === "connected" && (
              <Button asChild variant="outline" size="sm" className="mb-4">
                <a href="#/">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
            <div className="rounded-lg border border-border bg-[#0d0f12] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-[#0d0f12]/80">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                </div>
                <span className="text-[10px] text-muted-foreground ml-2">gateway.log</span>
              </div>
              <div className="max-h-64 overflow-auto p-4 font-mono text-xs">
                {logs.length === 0 && (
                  <p className="text-muted-foreground italic">
                    Waiting for Gateway output...
                  </p>
                )}
                {logs.map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap text-foreground/80">
                    {line}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepIndicator({
  label,
  step,
  active,
  completed,
}: {
  label: string;
  step: number;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all duration-200",
          completed
            ? "bg-success text-success-foreground"
            : active
            ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
            : "bg-muted text-muted-foreground"
        )}
      >
        {completed ? <CheckCircle2 className="h-4 w-4" /> : step}
      </div>
      <span
        className={cn(
          "text-sm hidden sm:inline",
          active ? "font-medium text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </div>
  );
}

function StepConnector({ completed }: { completed: boolean }) {
  return (
    <div
      className={cn(
        "h-px flex-1 transition-colors duration-200",
        completed ? "bg-success" : "bg-border"
      )}
    />
  );
}

function PrereqRow({
  label,
  status,
  version,
  detail,
  action,
}: {
  label: string;
  status: "ok" | "recommended" | "minimum" | "old" | "missing";
  version?: string;
  detail: string;
  action?: React.ReactNode;
}) {
  const statusConfig = {
    ok: { icon: CheckCircle2, color: "text-success" },
    recommended: { icon: CheckCircle2, color: "text-success" },
    minimum: { icon: CheckCircle2, color: "text-warning" },
    old: { icon: XCircle, color: "text-warning" },
    missing: { icon: XCircle, color: "text-destructive" },
  };

  const { icon: Icon, color } = statusConfig[status];

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors">
      <div className="flex items-center gap-3">
        <Icon className={cn("h-5 w-5", color)} />
        <div>
          <p className="text-sm font-medium text-foreground">
            {label}
            {version && (
              <span className="ml-2 text-xs font-mono text-muted-foreground">
                v{version}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function PrereqSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border border-border">
      <Skeleton className="h-5 w-5 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}
