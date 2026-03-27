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
import { Loader2, Download, RefreshCw, CheckCircle, AlertCircle, Info } from "lucide-react";
import { getName, getVersion } from "@tauri-apps/api/app";
import { listen } from "@tauri-apps/api/event";

interface UpdateProgress {
  step: string;
  percent: number;
  message: string;
}

export function Settings() {
  const [preserveConfig, setPreserveConfig] = useState(true);
  const uninstall = useUninstallOpenClaw();

  // App update state (Tauri desktop app)
  const {
    update,
    checking,
    downloading,
    progress,
    checkForUpdates,
    installUpdate,
  } = useAppUpdate();
  const [appName, setAppName] = useState("OpenClaw Desktop");
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
  }, [updateMutation.isSuccess, updateMutation.isError, updateMutation.data, updateMutation.error, refetchUpdate]);

  function handleUninstall() {
    const confirmed = window.confirm(
      "Are you sure you want to uninstall OpenClaw? This will remove containers, images, and " +
        (preserveConfig ? "Docker artifacts. Your configuration will be preserved." : "ALL configuration files. This cannot be undone.")
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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your OpenClaw Desktop preferences</p>
      </div>

      {/* OpenClaw Update Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            OpenClaw Update
          </CardTitle>
          <CardDescription>
            Check for and install updates to your OpenClaw installation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Version info */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Current version:</span>
                <Badge variant="outline">{updateCheck?.currentVersion ?? "—"}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Latest version:</span>
                <Badge variant="outline">{updateCheck?.latestVersion ?? "—"}</Badge>
              </div>
              {updateCheck?.installMethod && updateCheck.installMethod !== "unknown" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Install method:</span>
                  <Badge variant="secondary">{updateCheck.installMethod}</Badge>
                </div>
              )}
            </div>

            {/* Status indicator */}
            {!isLoadingUpdate && updateCheck && (
              <div className="flex items-center gap-2">
                {updateCheck.updateAvailable ? (
                  <Badge className="bg-primary text-primary-foreground">Update available</Badge>
                ) : (
                  <Badge className="bg-green-500 text-white flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Up to date
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Progress bar during update */}
          {updateMutation.isPending && openclawProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{openclawProgress.message}</span>
                <span>{openclawProgress.percent}%</span>
              </div>
              <Progress value={openclawProgress.percent} />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetchUpdate()}
              disabled={isRefetchingUpdate || updateMutation.isPending}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefetchingUpdate ? "animate-spin" : ""}`} />
              Check for Updates
            </Button>

            {updateCheck?.updateAvailable && (
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || updateCheck.installMethod === "unknown"}
              >
                {updateMutation.isPending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Update Now
              </Button>
            )}
          </div>

          {/* Not installed warning */}
          {updateCheck?.installMethod === "unknown" && !isLoadingUpdate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              OpenClaw is not installed. Visit the Install page to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Desktop App Update */}
      <Card>
        <CardHeader>
          <CardTitle>Desktop App Update</CardTitle>
          <CardDescription>
            Check for and install updates to {appName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">Current version:</span>{" "}
              <span className="font-mono font-medium">{appVersion}</span>
              {update && (
                <>
                  <span className="text-muted-foreground"> &rarr; </span>
                  <span className="font-mono font-medium text-primary">
                    v{update.version}
                  </span>
                </>
              )}
            </div>
          </div>

          {update && !downloading && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
              <p className="font-medium text-primary">
                Update available: v{update.version}
              </p>
              {update.body && (
                <p className="mt-1 text-muted-foreground">{update.body}</p>
              )}
            </div>
          )}

          {downloading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Downloading update... {progress}%</span>
              </div>
              <Progress value={progress} max={100} />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={checkForUpdates}
              disabled={checking || downloading}
            >
              {checking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Check for Updates
            </Button>

            {update && !downloading && (
              <Button onClick={installUpdate}>
                <Download className="mr-2 h-4 w-4" />
                Install Update
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* About Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{appName}</span>
              <Badge variant="outline">{appVersion}</Badge>
            </div>
            <p className="text-muted-foreground">
              A desktop application for managing your OpenClaw AI agent platform.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your OpenClaw installation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will remove OpenClaw containers, images, and optionally your configuration.
            This cannot be undone.
          </p>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <label htmlFor="preserve-config" className="text-sm font-medium">
                Preserve my configuration
              </label>
              <p className="text-sm text-muted-foreground">
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
            {uninstall.isPending ? "Uninstalling..." : "Uninstall OpenClaw"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
