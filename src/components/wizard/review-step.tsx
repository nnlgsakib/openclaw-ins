import { motion } from "motion/react";
import { Check, AlertTriangle } from "lucide-react";
import { useWizardStore, MODEL_PROVIDERS, CHANNEL_OPTIONS } from "@/stores/use-wizard-store";

export function ReviewStep() {
  const {
    modelProvider,
    selectedModel,
    customModelId,
    apiKeyFormat,
    apiKey,
    apiKeyEnvName,
    sandboxMode,
    sandboxScope,
    workspaceAccess,
    selectedChannels,
    channelConfigs,
    dmPolicies,
    getGeneratedConfig,
  } = useWizardStore();

  const provider = MODEL_PROVIDERS.find((p) => p.id === modelProvider);
  const effectiveModel = customModelId || selectedModel;

  const hasApiKey =
    provider?.authType === "none" ||
    provider?.authType === "oauth" ||
    (apiKeyFormat === "env" ? !!apiKeyEnvName || !!provider?.envVar : !!apiKey);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold">Review & Install</h2>
        <p className="text-sm text-muted-foreground">
          Review your configuration before starting the installation.
        </p>
      </div>

      <div className="space-y-4">
        {/* Model Provider */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            {hasApiKey ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
            <p className="font-medium">Model Provider</p>
          </div>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <p>
              Provider: <span className="text-foreground">{provider?.name}</span>
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                {provider?.authType === "api-key"
                  ? "API Key"
                  : provider?.authType === "oauth"
                  ? "OAuth"
                  : "Local"}
              </span>
            </p>
            <p>
              Model:{" "}
              <span className="text-foreground">
                {provider?.aliases[effectiveModel] ?? effectiveModel}
              </span>{" "}
              (<code className="text-xs">{effectiveModel}</code>)
            </p>
            <p>
              Auth:{" "}
              {provider?.authType === "oauth" ? (
                <span className="text-purple-500">OAuth (login after install)</span>
              ) : provider?.authType === "none" ? (
                <span className="text-green-500">None required (local)</span>
              ) : hasApiKey ? (
                <span className="text-green-500">Configured</span>
              ) : (
                <span className="text-yellow-500">Not set</span>
              )}
            </p>
          </div>
        </div>

        {/* Sandbox */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <p className="font-medium">Sandbox</p>
          </div>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <p>
              Mode:{" "}
              <span className="text-foreground capitalize">
                {sandboxMode.replace("-", " ")}
              </span>
            </p>
            <p>
              Scope: <span className="text-foreground capitalize">{sandboxScope}</span>
            </p>
            <p>
              Workspace:{" "}
              <span className="text-foreground capitalize">{workspaceAccess}</span>
            </p>
            <p>
              Network: <span className="text-foreground">None</span> (secure default)
            </p>
          </div>
        </div>

        {/* Channels */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <p className="font-medium">Channels</p>
          </div>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            {selectedChannels.length === 0 ? (
              <p>No channels selected — you can add them later.</p>
            ) : (
              selectedChannels.map((channelId) => {
                const channel = CHANNEL_OPTIONS.find((c) => c.id === channelId);
                const config = channelConfigs[channelId] ?? {};
                const dmPolicy = dmPolicies[channelId] ?? "pairing";
                return (
                  <div key={channelId} className="flex items-center gap-2">
                    <span className="text-foreground">{channel?.name}</span>
                    <span className="text-xs">(DM: {dmPolicy})</span>
                    {Object.keys(config).length > 0 && (
                      <span className="text-xs text-green-500">configured</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Config preview */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Generated Config Preview</p>
        <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/50 p-4 text-xs">
          {JSON.stringify(getGeneratedConfig(), null, 2)}
        </pre>
      </div>
    </motion.div>
  );
}
