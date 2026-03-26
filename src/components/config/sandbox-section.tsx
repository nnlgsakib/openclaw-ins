import { useConfigStore, type BindMount } from "@/stores/use-config-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";


const BACKEND_OPTIONS = [
  { value: "docker", label: "Docker" },
  { value: "ssh", label: "SSH" },
  { value: "openshell", label: "OpenShell" },
];

const SCOPE_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "non-main", label: "Non-main only" },
  { value: "all", label: "All commands" },
];

const ACCESS_OPTIONS = [
  { value: "none", label: "None" },
  { value: "read-only", label: "Read-only" },
  { value: "read-write", label: "Read-write" },
];

const NETWORK_OPTIONS = [
  { value: "none", label: "None" },
  { value: "custom", label: "Custom rules" },
];

function RadioGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Button
          key={opt.value}
          variant={value === opt.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(opt.value)}
          type="button"
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

export function SandboxSection() {
  const { config, setSandbox } = useConfigStore();
  const sandbox = config.sandbox || {
    enabled: false,
    backend: "docker",
    scope: "non-main",
    workspaceAccess: "read-only",
    networkPolicy: "none",
    bindMounts: [],
  };

  // Handle sandbox toggle
  const handleToggle = (enabled: boolean) => {
    setSandbox({
      ...sandbox,
      enabled,
    });
  };

  // Handle backend change
  const handleBackendChange = (backend: string) => {
    setSandbox({ ...sandbox, backend });
  };

  // Handle scope change
  const handleScopeChange = (scope: string) => {
    setSandbox({ ...sandbox, scope });
  };

  // Handle workspace access change
  const handleWorkspaceAccessChange = (workspaceAccess: string) => {
    setSandbox({ ...sandbox, workspaceAccess });
  };

  // Handle network policy change
  const handleNetworkPolicyChange = (networkPolicy: string) => {
    setSandbox({ ...sandbox, networkPolicy });
  };

  // Add bind mount via Tauri dialog
  const handleAddBindMount = async () => {
    try {
      const dir = await open({ directory: true, multiple: false });
      if (dir && typeof dir === "string") {
        const newMount: BindMount = {
          hostPath: dir,
          access: "read-only",
        };
        setSandbox({
          ...sandbox,
          bindMounts: [...sandbox.bindMounts, newMount],
        });
      }
    } catch (err) {
      console.error("Failed to open directory picker:", err);
    }
  };

  // Update bind mount access
  const handleAccessChange = (index: number, access: string) => {
    const updated = [...sandbox.bindMounts];
    updated[index] = { ...updated[index], access };
    setSandbox({ ...sandbox, bindMounts: updated });
  };

  // Remove bind mount
  const handleRemoveMount = (index: number) => {
    const updated = sandbox.bindMounts.filter((_, i) => i !== index);
    setSandbox({ ...sandbox, bindMounts: updated });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Sandboxing</CardTitle>
            <Badge variant={sandbox.enabled ? "default" : "secondary"}>
              {sandbox.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <Switch
            checked={sandbox.enabled}
            onCheckedChange={handleToggle}
          />
        </div>
        <CardDescription>
          Configure sandbox isolation for OpenClaw execution
        </CardDescription>
      </CardHeader>

      {sandbox.enabled && (
        <CardContent className="space-y-6">
          {/* Backend Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Backend</label>
            <RadioGroup
              options={BACKEND_OPTIONS}
              value={sandbox.backend}
              onChange={handleBackendChange}
            />
          </div>

          {/* Scope Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Scope</label>
            <RadioGroup
              options={SCOPE_OPTIONS}
              value={sandbox.scope}
              onChange={handleScopeChange}
            />
          </div>

          {/* Workspace Access */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Workspace Access</label>
            <RadioGroup
              options={ACCESS_OPTIONS}
              value={sandbox.workspaceAccess}
              onChange={handleWorkspaceAccessChange}
            />
          </div>

          {/* Network Policy */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Network Policy</label>
            <RadioGroup
              options={NETWORK_OPTIONS}
              value={sandbox.networkPolicy}
              onChange={handleNetworkPolicyChange}
            />
          </div>

          {/* Bind Mounts */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Bind Mounts</label>
            <div className="space-y-2">
              {sandbox.bindMounts.map((mount, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-md border bg-card"
                >
                  <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm truncate" title={mount.hostPath}>
                    {mount.hostPath}
                  </span>
                  <select
                    value={mount.access}
                    onChange={(e) => handleAccessChange(index, e.target.value)}
                    className="text-sm rounded-md border bg-background px-2 py-1"
                  >
                    <option value="read-only">Read-only</option>
                    <option value="read-write">Read-write</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMount(index)}
                    className="h-8 w-8 text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={handleAddBindMount}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Directory
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}