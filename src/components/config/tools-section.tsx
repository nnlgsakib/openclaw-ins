import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useConfigStore, type ToolsConfig } from "@/stores/use-config-store";

const TOOLS = [
  { key: "shell" as const, label: "Shell", description: "Execute shell commands on the host" },
  { key: "filesystem" as const, label: "Filesystem", description: "Read and write files" },
  { key: "browser" as const, label: "Browser", description: "Launch and control web browsers" },
  { key: "api" as const, label: "API", description: "Make HTTP requests to external APIs" },
] as const;

const DEFAULT_TOOLS: ToolsConfig = { shell: true, filesystem: true, browser: false, api: true };

export function ToolsSection() {
  const configTools = useConfigStore((s) => s.config.tools) as Partial<ToolsConfig> | undefined;
  const tools: ToolsConfig = { ...DEFAULT_TOOLS, ...configTools };
  const setTools = useConfigStore((s) => s.setTools);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tool Policies</CardTitle>
        <CardDescription>Control which tools the agent can use</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {TOOLS.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Switch
              checked={tools[key]}
              onCheckedChange={(checked) => setTools({ ...tools, [key]: checked })}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
