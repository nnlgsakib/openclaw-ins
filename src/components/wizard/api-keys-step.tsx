import { motion } from "motion/react";
import { Key, Eye, EyeOff, LogIn, Globe } from "lucide-react";
import { useState } from "react";
import { useWizardStore, MODEL_PROVIDERS } from "@/stores/use-wizard-store";
import { cn } from "@/lib/utils";

export function ApiKeysStep() {
  const {
    modelProvider,
    apiKey,
    setApiKey,
    apiKeyFormat,
    setApiKeyFormat,
    apiKeyEnvName,
    setApiKeyEnvName,
  } = useWizardStore();

  const [showKey, setShowKey] = useState(false);

  const provider = MODEL_PROVIDERS.find((p) => p.id === modelProvider);

  if (!provider) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="py-12 text-center"
      >
        <p className="text-muted-foreground">
          Please select a model provider first.
        </p>
      </motion.div>
    );
  }

  // OAuth providers — no API key needed
  if (provider.authType === "oauth") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        <div>
          <h2 className="text-xl font-semibold">
            {provider.name} Authentication
          </h2>
          <p className="text-sm text-muted-foreground">
            {provider.name} uses OAuth for authentication. You'll log in after
            installation via the OpenClaw CLI.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-accent/30 p-6 text-center">
          <LogIn className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">OAuth Login Required</p>
          <p className="mt-2 text-sm text-muted-foreground">
            After OpenClaw is installed, run:
          </p>
          <code className="mt-2 block rounded-md bg-muted px-4 py-2 text-sm">
            openclaw models auth login --provider {provider.id}
          </code>
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-medium">What happens next</p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            <li>Complete the setup wizard</li>
            <li>Install OpenClaw and start the Gateway</li>
            <li>Run the auth login command above</li>
            <li>Follow the browser-based OAuth flow</li>
          </ol>
        </div>
      </motion.div>
    );
  }

  // Local providers — no API key needed
  if (provider.authType === "none") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-6"
      >
        <div>
          <h2 className="text-xl font-semibold">{provider.name} Setup</h2>
          <p className="text-sm text-muted-foreground">
            {provider.name} runs locally — no API key is required.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-accent/30 p-6 text-center">
          <Globe className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No API Key Needed</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {provider.id === "ollama"
              ? "Make sure Ollama is installed and running on your machine."
              : `Make sure your ${provider.name} server is running.`}
          </p>
        </div>

        {provider.id === "ollama" && (
          <div className="rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Ollama Setup</p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              <li>
                Install Ollama from{" "}
                <a
                  href="https://ollama.com/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  ollama.com/download
                </a>
              </li>
              <li>Pull a model: <code>ollama pull llama3.3</code></li>
              <li>
                Set <code>OLLAMA_API_KEY=1</code> to enable auto-detection
              </li>
            </ol>
          </div>
        )}
      </motion.div>
    );
  }

  // API key providers
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold">{provider.name} API Key</h2>
        <p className="text-sm text-muted-foreground">
          Enter your {provider.name} API key. It will be stored securely in
          your OpenClaw config.
        </p>
      </div>

      {/* Format toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setApiKeyFormat("direct")}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm transition-colors",
            apiKeyFormat === "direct"
              ? "border-primary bg-primary/10 text-primary font-medium"
              : "border-border text-muted-foreground hover:bg-accent"
          )}
        >
          Direct Key
        </button>
        <button
          onClick={() => setApiKeyFormat("env")}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm transition-colors",
            apiKeyFormat === "env"
              ? "border-primary bg-primary/10 text-primary font-medium"
              : "border-border text-muted-foreground hover:bg-accent"
          )}
        >
          Environment Variable
        </button>
      </div>

      {apiKeyFormat === "direct" ? (
        <div className="space-y-3">
          <div className="relative">
            <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type={showKey ? "text" : "password"}
              placeholder={provider.keyPlaceholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Expected format: <code>{provider.keyFormat}</code>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            placeholder={`Environment variable name (default: ${provider.envVar})`}
            value={apiKeyEnvName || provider.envVar}
            onChange={(e) => setApiKeyEnvName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            OpenClaw will read the key from the{" "}
            <code>{"${" + (apiKeyEnvName || provider.envVar) + "}"}</code>{" "}
            environment variable at runtime.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-accent/30 p-4">
        <p className="text-sm font-medium">Your API key is secure</p>
        <p className="mt-1 text-xs text-muted-foreground">
          The key is stored locally in <code>~/.openclaw/.env</code> and never
          sent to any server other than {provider.name}'s API.
        </p>
      </div>
    </motion.div>
  );
}
