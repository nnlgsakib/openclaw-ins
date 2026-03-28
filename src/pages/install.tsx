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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useInstallStore, type PrerequisitesInfo } from "@/stores/use-install-store";

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

  // Check prerequisites only once (not on re-mount)
  useEffect(() => {
    if (!hasCheckedPrereqs.current && !prereqs) {
      hasCheckedPrereqs.current = true;
      checkPrereqs();
    } else if (prereqs) {
      setLoading(false);
    }
  }, []);

  // Listen for install output
  useEffect(() => {
    const unlisten = listen<string>("install-output", (event) => {
      addLog(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
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
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Start OpenClaw
        </h1>
        <p className="text-sm text-muted-foreground">
          Check prerequisites and start the OpenClaw Gateway.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <StepIndicator
          label="Prerequisites"
          active={step === "prerequisites"}
          completed={step !== "prerequisites"}
        />
        <div className="h-px flex-1 bg-border" />
        <StepIndicator
          label="Starting"
          active={step === "starting"}
          completed={step === "connected"}
        />
        <div className="h-px flex-1 bg-border" />
        <StepIndicator
          label="Connected"
          active={step === "connected"}
          completed={false}
        />
      </div>

      {step === "prerequisites" && (
        <Card>
          <CardHeader>
            <CardTitle>Prerequisites</CardTitle>
            <CardDescription>
              Verify your system has the required dependencies.
            </CardDescription>
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
                      ? "Installed"
                      : "Not installed"
                  }
                  action={
                    installing ? (
                      <Button size="sm" disabled>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Working...
                      </Button>
                    ) : prereqs?.openclaw.installed ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleReinstallOpenClaw}
                      >
                        Reinstall
                      </Button>
                    ) : (
                      <Button size="sm" onClick={handleInstallOpenClaw}>
                        Install OpenClaw
                      </Button>
                    )
                  }
                />
              </>
            )}

            {prereqs?.nodejs.installed && prereqs?.openclaw.installed && (
              <div className="pt-2">
                <Button onClick={handleStartGateway} className="gap-2">
                  <Play className="h-4 w-4" />
                  Start Gateway
                </Button>
              </div>
            )}

            {/* View Logs toggle */}
            {logs.length > 0 && (
              <div className="pt-2">
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
                  <div className="mt-2 relative max-h-64 overflow-auto rounded-lg bg-black/90 p-4 font-mono text-xs text-green-400">
                    {logs.map((line, i) => (
                      <div key={i} className="whitespace-pre-wrap">
                        {line}
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(step === "starting" || step === "connected") && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {step === "connected" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
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
              {step === "connected" && (
                <Button asChild variant="outline" size="sm">
                  <a href="#/">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative max-h-64 overflow-auto rounded-lg bg-black/90 p-4 font-mono text-xs text-green-400">
              {logs.length === 0 && (
                <p className="text-muted-foreground">
                  Waiting for Gateway output...
                </p>
              )}
              {logs.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  {line}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepIndicator({
  label,
  active,
  completed,
}: {
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
          completed
            ? "bg-primary text-primary-foreground"
            : active
            ? "border-2 border-primary text-primary"
            : "border-2 border-muted text-muted-foreground"
        }`}
      >
        {completed ? <CheckCircle2 className="h-3 w-3" /> : null}
      </div>
      <span
        className={`text-sm ${
          active ? "font-medium text-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
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
  const icon =
    status === "ok" || status === "recommended" ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : status === "minimum" ? (
      <CheckCircle2 className="h-4 w-4 text-yellow-500" />
    ) : status === "old" ? (
      <XCircle className="h-4 w-4 text-yellow-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );

  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm font-medium">
            {label}
            {version && (
              <span className="ml-2 text-xs text-muted-foreground">
                {version}
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
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <Skeleton className="h-4 w-4 rounded-full" />
      <div className="space-y-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}
