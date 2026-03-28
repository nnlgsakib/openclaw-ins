import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfigStore, type AgentsConfig } from "@/stores/use-config-store";

const SANDBOX_MODES = [
  { value: "docker", label: "Docker", description: "Full container isolation" },
  { value: "ssh", label: "SSH", description: "Remote execution via SSH" },
  { value: "none", label: "None", description: "No sandboxing (not recommended)" },
];

const AUTONOMY_LEVELS = [
  { value: "low", label: "Low", description: "Ask before every action" },
  { value: "medium", label: "Medium", description: "Ask before destructive actions" },
  { value: "high", label: "High", description: "Autonomous execution" },
];

const DEFAULT_AGENTS: AgentsConfig = { sandboxMode: "docker", autonomy: "medium" };

export function AgentsSection() {
  const configAgents = useConfigStore((s) => s.config.agents) as Partial<AgentsConfig> | undefined;
  const agents: AgentsConfig = { ...DEFAULT_AGENTS, ...configAgents };
  const setAgents = useConfigStore((s) => s.setAgents);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Defaults</CardTitle>
        <CardDescription>Default settings for new agent sessions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sandbox Mode */}
        <div>
          <p className="text-sm font-medium mb-3">Default Sandbox Mode</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {SANDBOX_MODES.map(({ value, label, description }) => (
              <button
                key={value}
                onClick={() => setAgents({ ...agents, sandboxMode: value })}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  agents.sandboxMode === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:bg-accent"
                }`}
              >
                <p className="font-medium">{label}</p>
                <p className="text-muted-foreground text-xs">{description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Autonomy Level */}
        <div>
          <p className="text-sm font-medium mb-3">Autonomy Level</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {AUTONOMY_LEVELS.map(({ value, label, description }) => (
              <button
                key={value}
                onClick={() => setAgents({ ...agents, autonomy: value })}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  agents.autonomy === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:bg-accent"
                }`}
              >
                <p className="font-medium">{label}</p>
                <p className="text-muted-foreground text-xs">{description}</p>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
