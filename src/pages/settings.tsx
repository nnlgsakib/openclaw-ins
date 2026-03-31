import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useUninstallOpenClaw } from "@/hooks/use-uninstall";
import { useAppUpdate } from "@/hooks/use-app-update";
import { useOpenClawUpdateCheck, useUpdateOpenClaw } from "@/hooks/use-update";
import { formatError } from "@/lib/errors";
import { toast } from "sonner";
import {
  Loader2,
  Download,
  RefreshCw,
  CheckCircle2,
  Settings as SettingsIcon,
  Info,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { getName, getVersion } from "@tauri-apps/api/app";
import { listen } from "@tauri-apps/api/event";
import { cn } from "@/lib/utils";

interface UpdateProgress {
  step: string;
  percent: number;
  message: string;
}

export function Settings() {
  const [preserveConfig, setPreserveConfig] = useState(true);
  const uninstall = useUninstallOpenClaw();

  // App update state
  const {
    update,
    checking,
    downloading,
    progress,
    checkForUpdates,
    installUpdate,
  } = useAppUpdate();
  const [appName, setAppName] = useState("ClawStation");
  const [appVersion, setAppVersion] = useState("...");

  useEffect(() => {
    getName().then(setAppName).catch(() => {});
    getVersion().then(setAppVersion).catch(() => {});
  }, []);

  // OpenClaw binary/image update state
  const {
    data: updateCheck,
    isLoading: isLoadingUpdate,
    refetch: refetchUpdate,
    isRefetching: isRefetchingUpdate,
  } = useOpenClawUpdateCheck();
  const updateMutation = useUpdateOpenClaw();
  const [openclawProgress, setOpenclawProgress] = useState<UpdateProgress | null>(null);

  // Listen for OpenClaw update progress events
  useEffect(() => {
    if (!updateMutation.isPending) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear stale progress when subscription ends
      setOpenclawProgress(null);
      return;
    }
    const unlisten = listen<UpdateProgress>("install-progress", (event) => {
      setOpenclawProgress(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [updateMutation.isPending]);

  // Show toast on OpenClaw update success/error
  useEffect(() => {
    if (updateMutation.isSuccess) {
      toast.success("OpenClaw updated successfully!", {
        description: updateMutation.data?.newVersion
          ? `Now running version ${updateMutation.data.newVersion}`
          : "Update complete",
      });
      refetchUpdate();
    }
    if (updateMutation.isError) {
      const err = formatError(updateMutation.error);
      toast.error(err.message, { description: err.suggestion });
    }
  }, [
    updateMutation.isSuccess,
    updateMutation.isError,
    updateMutation.data,
    updateMutation.error,
    refetchUpdate,
  ]);

  function handleUninstall() {
    const confirmed = window.confirm(
      "Are you sure you want to uninstall OpenClaw? This will remove containers, images, and " +
        (preserveConfig
          ? "Docker artifacts. Your configuration will be preserved."
          : "ALL configuration files. This cannot be undone.")
    );
    if (!confirmed) return;

    uninstall.mutate(
      { preserveConfig },
      {
        onSuccess: (result) => {
          if (result.error) {
            toast.warning(`OpenClaw uninstalled with warnings: ${result.error}`);
          } else {
            toast.success("OpenClaw uninstalled successfully");
          }
        },
        onError: (err) => {
          toast.error(`Uninstall failed: ${err.message}`);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your ClawStation preferences and updates
        </p>
      </div>

      {/* Update cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* OpenClaw Update */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">OpenClaw Update</CardTitle>
                <CardDescription>
                  Check for and install updates to your OpenClaw installation
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Version info */}
            <div className="space-y-3">
              <VersionRow
                label="Current"
                value={updateCheck?.currentVersion ?? "\u2014"}
              />
              <VersionRow
                label="Latest"
                value={updateCheck?.latestVersion ?? "\u2014"}
                highlight
              />
              {updateCheck?.installMethod && updateCheck.installMethod !== "unknown" && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Install method</span>
                  <Badge variant="secondary" className="text-xs">
                    {updateCheck.installMethod}
                  </Badge>
                </div>
              )}
            </div>

            {/* Status */}
            {!isLoadingUpdate && updateCheck && (
              <div
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg",
                  updateCheck.updateAvailable
                    ? "bg-primary/5 border border-primary/20"
                    : "bg-success-muted/30 border border-success/20"
                )}
              >
                {updateCheck.updateAvailable ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground">Update available</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm text-success">Up to date</span>
                  </>
                )}
              </div>
            )}

            {/* Progress bar */}
            {updateMutation.isPending && openclawProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{openclawProgress.message}</span>
                  <span className="font-medium">{openclawProgress.percent}%</span>
                </div>
                <Progress value={openclawProgress.percent} />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchUpdate()}
                disabled={isRefetchingUpdate || updateMutation.isPending}
                className="flex-1"
              >
                <RefreshCw
                  className={cn("mr-2 h-4 w-4", isRefetchingUpdate && "animate-spin")}
                />
                Check
              </Button>

              {updateCheck?.updateAvailable && (
                <Button
                  size="sm"
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending || updateCheck.installMethod === "unknown"}
                  className="flex-1"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Update
                </Button>
              )}
            </div>

            {updateCheck?.installMethod === "unknown" && !isLoadingUpdate && (
              <p className="text-xs text-muted-foreground">
                OpenClaw is not installed. Visit the Install page to get started.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Desktop App Update */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-info/10">
                <SettingsIcon className="h-5 w-5 text-info" />
              </div>
              <div>
                <CardTitle className="text-lg">Desktop App</CardTitle>
                <CardDescription>
                  Check for and install updates to {appName}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Version info */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <span className="text-sm text-muted-foreground">Installed version</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">{appVersion}</span>
                {update && (
                  <>
                    <span className="text-muted-foreground">{"\u2192"}</span>
                    <span className="font-mono text-sm font-medium text-primary">
                      v{update.version}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Update available */}
            {update && !downloading && (
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-sm font-medium text-primary">
                  Update available: v{update.version}
                </p>
                {update.body && (
                  <p className="mt-1 text-xs text-muted-foreground">{update.body}</p>
                )}
              </div>
            )}

            {/* Download progress */}
            {downloading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Downloading... {progress}%</span>
                </div>
                <Progress value={progress} max={100} />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={checkForUpdates}
                disabled={checking || downloading}
                className="flex-1"
              >
                {checking ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Check
              </Button>

              {update && !downloading && (
                <Button size="sm" onClick={installUpdate} className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Install
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* About card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted shrink-0">
              <Info className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">
                {appName} <span className="text-muted-foreground font-normal">v{appVersion}</span>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                A desktop application for managing your OpenClaw AI agent platform.
                Install, configure, sandbox, and monitor your AI agents without touching a terminal.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that affect your OpenClaw installation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will remove OpenClaw containers, images, and optionally your configuration.
            This action cannot be undone.
          </p>

          {/* Preserve config toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
            <div className="space-y-0.5">
              <label htmlFor="preserve-config" className="text-sm font-medium text-foreground">
                Preserve my configuration
              </label>
              <p className="text-xs text-muted-foreground">
                Keep config.yaml and workspace/ directory after uninstall
              </p>
            </div>
            <Switch
              id="preserve-config"
              checked={preserveConfig}
              onCheckedChange={setPreserveConfig}
            />
          </div>

          <Button
            variant="destructive"
            onClick={handleUninstall}
            disabled={uninstall.isPending}
            className="w-full"
          >
            {uninstall.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            {uninstall.isPending ? "Uninstalling..." : "Uninstall OpenClaw"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function VersionRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-sm font-mono",
          highlight ? "font-medium text-foreground" : "text-muted-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}
