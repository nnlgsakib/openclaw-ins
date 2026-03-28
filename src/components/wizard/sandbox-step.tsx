import { motion } from "motion/react";
import { Shield, ShieldAlert, ShieldOff, FolderOpen } from "lucide-react";
import { useWizardStore } from "@/stores/use-wizard-store";
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
  } = useWizardStore();

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
    } catch (err) {
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

      <div className="rounded-lg border border-border bg-accent/30 p-4">
        <p className="text-sm font-medium">Network: Disabled by Default</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Sandbox network is set to <code>"none"</code> for maximum security.
          Agents cannot make network requests from within the sandbox unless you
          override this later.
        </p>
      </div>
    </motion.div>
  );
}
