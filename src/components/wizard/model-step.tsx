import { motion } from "motion/react";
import { Check, Search, RefreshCw, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import {
  useWizardStore,
  MODEL_PROVIDERS,
  PROVIDER_CATEGORIES,
} from "@/stores/use-wizard-store";
import { useProviderModels } from "@/hooks/use-models";
import { useOpenClawMetadata } from "@/hooks/use-openclaw-metadata";
import { cn } from "@/lib/utils";
import type { ModelProvider } from "@/stores/use-wizard-store";

export function ModelStep() {
  const {
    modelProvider,
    setModelProvider,
    selectedModel,
    setSelectedModel,
    customModelId,
    setCustomModelId,
    apiKey,
    providerSearch,
    setProviderSearch,
  } = useWizardStore();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState("");

  // Dynamic metadata from OpenClaw
  const { data: metadata } = useOpenClawMetadata();
  const allProviders = useMemo(() => {
    if (!metadata) return MODEL_PROVIDERS;
    return metadata.providers.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      models: p.models.map(m => m.id),
      aliases: Object.fromEntries(p.models.map(m => [m.id, m.name])),
      authType: p.authType as "api-key" | "oauth" | "none" | "token",
      envVar: p.envVar,
      keyFormat: p.keyFormat,
      keyPlaceholder: p.keyPlaceholder,
      docsUrl: p.docsUrl,
      category: p.category as "major" | "multi-provider" | "local" | "regional" | "other",
    }));
  }, [metadata]);

  // Extended categories including regional
  const effectiveCategories = useMemo(() => {
    if (!metadata) return PROVIDER_CATEGORIES;
    const cats: Record<string, string> = { ...PROVIDER_CATEGORIES };
    for (const p of metadata.providers) {
      if (!(p.category in cats)) {
        cats[p.category] = p.category.charAt(0).toUpperCase() + p.category.slice(1);
      }
    }
    return cats;
  }, [metadata]);

  const selectedProvider = allProviders.find(
    (p) => p.id === modelProvider
  );

  // Fetch models dynamically from the selected provider
  const {
    data: fetchedModels,
    isLoading: modelsLoading,
    refetch: refetchModels,
    isError: modelsError,
  } = useProviderModels(
    modelProvider,
    apiKey,
    undefined // Could pass custom base URL from config
  );

  // Merge static models with fetched models
  const allModels = useMemo(() => {
    const staticModels = selectedProvider
      ? selectedProvider.models.map((id) => ({
          id,
          name: selectedProvider.aliases[id] ?? id.split("/").pop() ?? id,
          provider: modelProvider,
        }))
      : [];

    if (!fetchedModels || fetchedModels.length === 0) {
      return staticModels;
    }

    // Merge: fetched models first, then static models not already in fetched
    const fetchedIds = new Set(fetchedModels.map((m) => m.id));
    const uniqueStatic = staticModels.filter((m) => !fetchedIds.has(m.id));
    return [...fetchedModels, ...uniqueStatic];
  }, [fetchedModels, selectedProvider, modelProvider]);

  // Filter models by search
  const filteredModels = useMemo(() => {
    if (!modelSearch) return allModels;
    const search = modelSearch.toLowerCase();
    return allModels.filter(
      (m) =>
        m.id.toLowerCase().includes(search) ||
        (m.name && m.name.toLowerCase().includes(search))
    );
  }, [allModels, modelSearch]);

  // Filter providers by search and category
  const filteredProviders = allProviders.filter((p) => {
    const matchesSearch =
      !providerSearch ||
      p.name.toLowerCase().includes(providerSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(providerSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(providerSearch.toLowerCase());
    const matchesCategory = !activeCategory || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Group filtered providers by category
  const groupedProviders = Object.entries(effectiveCategories)
    .map(([catId, catLabel]) => ({
      id: catId,
      label: catLabel,
      providers: filteredProviders.filter((p) => p.category === catId),
    }))
    .filter((g) => g.providers.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold">Choose Your Model Provider</h2>
        <p className="text-sm text-muted-foreground">
          Select the AI provider and model. Models are fetched live from the
          provider's API when possible.
        </p>
      </div>

      {/* Provider search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search providers..."
          value={providerSearch}
          onChange={(e) => setProviderSearch(e.target.value)}
          className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            !activeCategory
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent"
          )}
        >
          All
        </button>
        {Object.entries(effectiveCategories).map(([id, label]) => (
          <button
            key={id}
            onClick={() =>
              setActiveCategory(id === activeCategory ? null : id)
            }
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              activeCategory === id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Provider grid — grouped by category */}
      <div className="space-y-4">
        {groupedProviders.map((group) => (
          <div key={group.id}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  selected={modelProvider === provider.id}
                  onSelect={() => setModelProvider(provider.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredProviders.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No providers match your search.
        </p>
      )}

      {/* Model selection */}
      {selectedProvider && (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Select Model —{" "}
              <span className="text-muted-foreground">
                {selectedProvider.name}
              </span>
            </p>
            <button
              onClick={() => refetchModels()}
              disabled={modelsLoading}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {modelsLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              {modelsLoading ? "Fetching..." : "Refresh"}
            </button>
          </div>

          {/* Model search */}
          {allModels.length > 6 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search models..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}

          {/* Model count */}
          <p className="text-xs text-muted-foreground">
            {modelsLoading
              ? "Fetching available models..."
              : `${filteredModels.length} model${filteredModels.length !== 1 ? "s" : ""} available`}
            {modelsError && (
              <span className="ml-2 text-yellow-500">
                (using default list — API unavailable)
              </span>
            )}
          </p>

          {/* Model list */}
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            {filteredModels.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                  selectedModel === model.id && !customModelId
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-accent text-muted-foreground"
                )}
              >
                <span className="truncate">
                  {model.name ?? model.id.split("/").pop()}
                </span>
                {selectedModel === model.id && !customModelId && (
                  <Check className="h-3 w-3 shrink-0" />
                )}
              </button>
            ))}
            {filteredModels.length === 0 && !modelsLoading && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No models found. Try refreshing or enter a custom model ID
                below.
              </p>
            )}
          </div>

          {/* Custom model ID */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Or enter a custom model ID:
            </label>
            <input
              type="text"
              placeholder={`${selectedProvider.id}/model-name`}
              value={customModelId}
              onChange={(e) => setCustomModelId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Selected model display */}
          <p className="text-xs text-muted-foreground">
            Selected:{" "}
            <code className="text-foreground">
              {customModelId || selectedModel || "none"}
            </code>
          </p>
        </div>
      )}
    </motion.div>
  );
}

function ProviderCard({
  provider,
  selected,
  onSelect,
}: {
  provider: ModelProvider;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative rounded-lg border p-3 text-left transition-all",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-muted-foreground/30 hover:bg-accent/50"
      )}
    >
      {selected && (
        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{provider.name}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {provider.description}
        </p>
        <div className="flex items-center gap-2 pt-1">
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              provider.authType === "api-key"
                ? "bg-blue-500/10 text-blue-500"
                : provider.authType === "oauth"
                  ? "bg-purple-500/10 text-purple-500"
                  : "bg-green-500/10 text-green-500"
            )}
          >
            {provider.authType === "api-key"
              ? "API Key"
              : provider.authType === "oauth"
                ? "OAuth"
                : "Local"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {provider.models.length} model
            {provider.models.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </button>
  );
}
