import React from "react";
import { motion } from "motion/react";
import { Shield, ShieldAlert, ShieldOff, FolderOpen, Container, Terminal, Box, Plus, X, Monitor, Loader2, Download } from "lucide-react";
import { useWizardStore } from "@/stores/use-wizard-store";
import { useSandboxImageExists, usePullSandboxImage } from "@/hooks/use-docker";
import { listen } from "@tauri-apps/api/event";
import { cn } from "@/lib/utils";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import type { SandboxMode, SandboxScope, WorkspaceAccess } from "@/stores/use-wizard-store";

const SANDBOX_MODES: {
  value: SandboxMode;
  label: string;
  description: string;
  icon: typeof Shield;
}[] = [
  {
    value: "off",
    label: "Disabled",
    description: "No sandboxing — agent runs with full host access",
    icon: ShieldOff,
  },
  {
    value: "non-main",
    label: "Non-Main Agents",
    description: "Sandbox new agents, but not the main/default agent",
    icon: Shield,
  },
  {
    value: "all",
    label: "All Agents",
    description: "Sandbox all agents including the default agent",
    icon: ShieldAlert,
  },
];

const SANDBOX_SCOPES: {
  value: SandboxScope;
  label: string;
  description: string;
}[] = [
  {
    value: "session",
    label: "Per Session",
    description: "New sandbox for each conversation — most isolated",
  },
  {
    value: "agent",
    label: "Per Agent",
    description: "Shared sandbox across sessions for the same agent",
  },
  {
    value: "shared",
    label: "Shared",
    description: "All agents share one sandbox — least isolated",
  },
];

const WORKSPACE_ACCESS: {
  value: WorkspaceAccess;
  label: string;
  description: string;
}[] = [
  {
    value: "none",
    label: "No Access",
    description: "Sandbox cannot access host workspace — most secure",
  },
  {
    value: "ro",
    label: "Read Only",
    description: "Sandbox can read workspace files but not modify",
  },
  {
    value: "rw",
    label: "Read & Write",
    description: "Sandbox has full access to workspace files",
  },
];

const SANDBOX_BACKENDS: {
  value: "docker" | "ssh" | "openshell" | "native";
  label: string;
  description: string;
  icon: typeof Container;
  recommended?: boolean;
}[] = [
  {
    value: "docker",
    label: "Docker",
    description: "Isolated containers — best security. Requires Docker installed.",
    icon: Container,
    recommended: true,
  },
  {
    value: "ssh",
    label: "SSH",
    description: "Run on a remote machine via SSH. Requires SSH access configured.",
    icon: Terminal,
  },
  {
    value: "openshell",
    label: "OpenShell",
    description: "OpenClaw's managed shell sandbox. Requires OpenShell plugin.",
    icon: Box,
  },
  {
    value: "native",
    label: "Local",
    description: "Run agents directly on host — no Docker, fastest but least isolated.",
    icon: Monitor,
  },
];

const DOCKER_NETWORKS: {
  value: "none" | "bridge";
  label: string;
  description: string;
}[] = [
  { value: "none", label: "None", description: "No network access — most secure (Recommended)" },
  { value: "bridge", label: "Bridge", description: "Isolated network — can access internet" },
];

function SandboxImageCheck() {
  const { data: imageExists, isLoading: checking } = useSandboxImageExists();
  const { isPending: pulling, mutate: pullImage } = usePullSandboxImage();
  const [pullLog, setPullLog] = React.useState<string[]>([]);
  const [pullComplete, setPullComplete] = React.useState(false);

  React.useEffect(() => {
    const unlisten = listen<string>("sandbox-pull-output", (event) => {
      setPullLog((prev) => [...prev.slice(-20), event.payload]); // Keep last 20 lines
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  React.useEffect(() => {
    if (imageExists) {
      setPullComplete(true);
    }
  }, [imageExists]);

  const handlePull = () => {
    setPullLog([]);
    setPullComplete(false);
    pullImage();
  };

  if (checking) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-accent/30 p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <p className="text-sm">Checking sandbox image...</p>
      </div>
    );
  }

  if (pullComplete || imageExists) {
    return null; // Don't show if image exists
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
        <p className="text-sm font-medium text-yellow-600">Sandbox Image Required</p>
        <p className="mt-1 text-xs text-muted-foreground">
          The openclaw-sandbox image is not found. Pull it now or skip Docker sandboxing.
        </p>
        <button
          onClick={handlePull}
          disabled={pulling}
          className="mt-3 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {pulling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {pulling ? "Pulling..." : "Get Sandbox Image"}
        </button>
      </div>

      {pullLog.length > 0 && (
        <pre className="max-h-32 overflow-auto rounded-md border border-border bg-black p-2 text-xs text-green-400">
{pullLog.join("\n")}
        </pre>
      )}
    </div>
  );
}

export function SandboxStep() {
  const {
    sandboxMode,
    setSandboxMode,
    sandboxScope,
    setSandboxScope,
    workspaceAccess,
    setWorkspaceAccess,
    workspacePath,
    setWorkspacePath,
    sandboxBackend,
    setSandboxBackend,
    dockerNetwork,
    setDockerNetwork,
    dockerBinds,
    addDockerBind,
    removeDockerBind,
  } = useWizardStore();

  const [newBind, setNewBind] = React.useState("");

  const handlePickWorkspace = async () => {
    try {
      const dir = await open({
        directory: true,
        multiple: false,
        title: "Select OpenClaw Workspace Directory",
        defaultPath: workspacePath || undefined,
      });
      if (dir && typeof dir === "string") {
        setWorkspacePath(dir);
        toast.success("Workspace directory selected");
      }
    } catch {
      toast.error("Failed to open directory picker");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold">Sandbox & Workspace</h2>
        <p className="text-sm text-muted-foreground">
          Configure sandbox isolation and workspace directory for OpenClaw.
        </p>
      </div>

      {/* Workspace Directory Picker */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Workspace Directory</p>
        <p className="text-xs text-muted-foreground">
          Select where OpenClaw stores its workspace files (project files, memory, skills).
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
            {workspacePath || (
              <span className="text-muted-foreground">
                Default: ~/.openclaw/workspace
              </span>
            )}
          </div>
          <button
            onClick={handlePickWorkspace}
            className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <FolderOpen className="h-4 w-4" />
            Browse
          </button>
        </div>
        {workspacePath && (
          <button
            onClick={() => setWorkspacePath("")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Reset to default
          </button>
        )}
      </div>

      {/* Sandbox Backend */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Sandbox Backend</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {SANDBOX_BACKENDS.map(({ value, label, description, icon: Icon, recommended }) => (
            <button
              key={value}
              onClick={() => setSandboxBackend(value)}
              className={cn(
                "rounded-lg border p-3 text-left text-sm transition-colors relative",
                sandboxBackend === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input hover:bg-accent"
              )}
            >
              {recommended && (
                <span className="absolute -top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                  Recommended
                </span>
              )}
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <p className="font-medium">{label}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Sandbox Mode */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Sandbox Mode</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {SANDBOX_MODES.map(({ value, label, description, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setSandboxMode(value)}
              className={cn(
                "rounded-lg border p-3 text-left text-sm transition-colors",
                sandboxMode === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input hover:bg-accent"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <p className="font-medium">{label}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Sandbox Scope */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Sandbox Scope</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {SANDBOX_SCOPES.map(({ value, label, description }) => (
            <button
              key={value}
              onClick={() => setSandboxScope(value)}
              className={cn(
                "rounded-lg border p-3 text-left text-sm transition-colors",
                sandboxScope === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input hover:bg-accent"
              )}
            >
              <p className="font-medium">{label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Workspace Access */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Sandbox Workspace Access</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {WORKSPACE_ACCESS.map(({ value, label, description }) => (
            <button
              key={value}
              onClick={() => setWorkspaceAccess(value)}
              className={cn(
                "rounded-lg border p-3 text-left text-sm transition-colors",
                workspaceAccess === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input hover:bg-accent"
              )}
            >
              <p className="font-medium">{label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Sandbox Image Check - only for Docker backend */}
      {sandboxBackend === "docker" && (
        <SandboxImageCheck />
      )}

      {/* Docker-specific settings */}
      {sandboxBackend === "docker" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          {/* Network Mode */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Docker Network Mode</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {DOCKER_NETWORKS.map(({ value, label, description }) => (
                <button
                  key={value}
                  onClick={() => setDockerNetwork(value)}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm transition-colors",
                    dockerNetwork === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:bg-accent"
                  )}
                >
                  <p className="font-medium">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Bind Mounts */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Bind Mounts</p>
            <p className="text-xs text-muted-foreground">
              Host directories accessible inside the sandbox (format: /host/path:/container/path).
            </p>
            {dockerBinds.length > 0 && (
              <div className="space-y-1">
                {dockerBinds.map((bind, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm">
                    <code className="flex-1 text-xs">{bind}</code>
                    <button
                      onClick={() => removeDockerBind(i)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newBind}
                onChange={(e) => setNewBind(e.target.value)}
                placeholder="/host/path:/container/path"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <button
                onClick={() => {
                  if (newBind.includes(":")) {
                    addDockerBind(newBind);
                    setNewBind("");
                  } else {
                    toast.error("Bind format: /host/path:/container/path");
                  }
                }}
                className="flex items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* SSH-specific settings */}
      {sandboxBackend === "ssh" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-lg border border-border bg-accent/30 p-4"
        >
          <p className="text-sm font-medium">SSH Backend</p>
          <p className="mt-1 text-xs text-muted-foreground">
            SSH sandbox configuration will be available after installation in the Settings page.
            Configure the target host, workspace path, and SSH key in the sandbox settings.
          </p>
        </motion.div>
      )}

      {/* OpenShell info */}
      {sandboxBackend === "openshell" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-lg border border-border bg-accent/30 p-4"
        >
          <p className="text-sm font-medium">OpenShell Backend</p>
          <p className="mt-1 text-xs text-muted-foreground">
            OpenShell requires the OpenShell plugin to be installed in OpenClaw.
            Configuration will be available in the Settings page after installation.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
