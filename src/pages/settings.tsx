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
import { useUninstallOpenClaw } from "@/hooks/use-uninstall";
import { useAppUpdate } from "@/hooks/use-app-update";
import { toast } from "sonner";
import {
  Loader2,
  Download,
  RefreshCw,
  Settings as SettingsIcon,
  Info,
  Trash2,
} from "lucide-react";
import { getName, getVersion } from "@tauri-apps/api/app";

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
