import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConfig, useSaveConfig, useValidateConfig } from "@/hooks/use-config";
import { useGatewayConfig, useGatewayConfigPatch } from "@/hooks/use-gateway";
import { useGatewayStore } from "@/stores/use-gateway-store";
import { useConfigStore, type OpenClawConfig } from "@/stores/use-config-store";
import { useConfigSchema } from "@/hooks/use-config-schema";
import { ProviderSection } from "@/components/config/provider-section";
import { SandboxSection } from "@/components/config/sandbox-section";
import { ToolsSection } from "@/components/config/tools-section";
import { AgentsSection } from "@/components/config/agents-section";
import { DynamicConfigSection } from "@/components/config/dynamic-config-section";
import { JsonEditor } from "@/components/config/json-editor";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { showError } from "@/lib/toast-errors";
import {
  Save,
  Loader2,
  Globe,
  Settings,
  Shield,
  Wrench,
  ChevronDown,
  ChevronUp,
  FileJson,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function Configure() {
  const navigate = useNavigate();
  const gatewayConnected = useGatewayStore((s) => s.connected);
  const { data: gatewayConfig } = useGatewayConfig();
  const gatewayPatch = useGatewayConfigPatch();
  const { data: config, isLoading, error, isError } = useConfig();
  const saveConfig = useSaveConfig();
  const validateConfig = useValidateConfig();
  const { config: storeConfig, isDirty, setConfig, markClean, updateField } =
    useConfigStore();
  const schema = useConfigSchema();
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mode, setMode] = useState<"ui" | "json">("ui");

  const baseHash =
    ((gatewayConfig as Record<string, unknown> | undefined)?.baseHash as string) ?? "";

  // Load config into store on mount
  useEffect(() => {
    if (gatewayConnected && gatewayConfig) {
      const gwConf = (
        (gatewayConfig as Record<string, unknown> | undefined)?.config ?? gatewayConfig
      ) as unknown as OpenClawConfig;
      setConfig(gwConf);
    } else if (config) {
      setConfig(config);
    }
  }, [config, gatewayConfig, gatewayConnected, setConfig]);

  if (isError && error) {
    showError(error);
  }

  const handleSave = async () => {
    if (!isDirty) return;

    setIsSaving(true);
    try {
      const validation = await validateConfig.mutateAsync(storeConfig);

      if (!validation.valid && validation.errors.length > 0) {
        const errorMessages = validation.errors
          .map((e) => `${e.field}: ${e.message}`)
          .join(", ");
        showError(new Error(errorMessages));
        setIsSaving(false);
        return;
      }

      if (gatewayConnected && baseHash) {
        const raw = JSON.stringify(storeConfig);
        await gatewayPatch.mutateAsync({ raw, baseHash });
        markClean();
        toast.success("Configuration applied via Gateway hot-reload");
      } else {
        await saveConfig.mutateAsync(storeConfig);
        markClean();
        toast.success("Configuration saved (will apply on next Gateway start)");
      }
    } catch (err) {
      showError(err as Error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndRestart = async () => {
    // Save config first if dirty
    if (isDirty) {
      setIsSaving(true);
      try {
        const validation = await validateConfig.mutateAsync(storeConfig);
        if (!validation.valid && validation.errors.length > 0) {
          const errorMessages = validation.errors
            .map((e) => `${e.field}: ${e.message}`)
            .join(", ");
          showError(new Error(errorMessages));
          setIsSaving(false);
          return;
        }
        if (gatewayConnected && baseHash) {
          const raw = JSON.stringify(storeConfig);
          await gatewayPatch.mutateAsync({ raw, baseHash });
          markClean();
        } else {
          await saveConfig.mutateAsync(storeConfig);
          markClean();
        }
      } catch (err) {
        showError(err as Error);
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }
    // Set pending restart flag and navigate
    useGatewayStore.getState().setPendingRestart(true);
    navigate("/monitor");
  };

  const handleJsonSave = async (parsed: Record<string, unknown>) => {
    // Update store — this sets isDirty: false, so we manually trigger save
    useConfigStore.getState().setConfig(parsed);
    // Run the save flow directly (bypass isDirty check since we just replaced config)
    setIsSaving(true);
    try {
      const validation = await validateConfig.mutateAsync(parsed);
      if (!validation.valid && validation.errors.length > 0) {
        const errorMessages = validation.errors
          .map((e) => `${e.field}: ${e.message}`)
          .join(", ");
        showError(new Error(errorMessages));
        setIsSaving(false);
        return;
      }
      if (gatewayConnected && baseHash) {
        const raw = JSON.stringify(parsed);
        await gatewayPatch.mutateAsync({ raw, baseHash });
        markClean();
        toast.success("Configuration applied via Gateway hot-reload");
      } else {
        await saveConfig.mutateAsync(parsed);
        markClean();
        toast.success("Configuration saved (will apply on next Gateway start)");
      }
    } catch (err) {
      showError(err as Error);
    } finally {
      setIsSaving(false);
    }
  };

  const advancedSections = schema.filter((s) => s.category === "advanced");
  const infrastructureSections = schema.filter((s) => s.category === "infrastructure");
  const coreSections = schema.filter(
    (s) =>
      s.category === "core" &&
      !["agents", "models", "tools", "sandbox"].includes(s.id)
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Configure
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure your OpenClaw AI provider and sandbox settings
          </p>
        </div>

        <div className="flex items-center gap-3">
          {gatewayConnected && (
            <Badge variant="success">
              <Globe className="mr-1 h-3 w-3" />
              Hot-reload active
            </Badge>
          )}
          <Button onClick={handleSave} disabled={!isDirty || isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          {gatewayConnected && (
            <Button variant="outline" onClick={handleSaveAndRestart} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              {isSaving ? "Saving..." : "Save & Restart"}
            </Button>
          )}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setMode("ui")}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            mode === "ui"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings className="mr-1.5 h-3.5 w-3.5 inline-block" />
          UI Mode
        </button>
        <button
          onClick={() => setMode("json")}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            mode === "json"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FileJson className="mr-1.5 h-3.5 w-3.5 inline-block" />
          JSON Mode
        </button>
      </div>

      {/* Gateway status banner */}
      {!gatewayConnected && (
        <Alert className="border-warning/30 bg-warning/5">
          <Globe className="h-4 w-4 text-warning" />
          <AlertDescription className="text-muted-foreground">
            Gateway not connected — changes will be saved to file and apply on next
            Gateway start.
          </AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {isLoading && <ConfigureSkeleton />}

      {/* JSON mode */}
      {!isLoading && mode === "json" && (
        <JsonEditor onSave={handleJsonSave} isSaving={isSaving} />
      )}

      {/* Configuration sections (UI mode) */}
      {!isLoading && mode === "ui" && (
        <div className="space-y-8">
          {/* Core sections with icons */}
          <SectionGroup
            icon={Settings}
            title="Core Settings"
            description="Essential configuration for AI providers and capabilities"
          >
            <ProviderSection />
            <SandboxSection />
            <ToolsSection />
            <AgentsSection />
            {coreSections.map((section) => (
              <DynamicConfigSection
                key={section.id}
                section={section}
                config={storeConfig}
                onUpdate={updateField}
              />
            ))}
          </SectionGroup>

          {/* Infrastructure sections */}
          {infrastructureSections.length > 0 && (
            <SectionGroup
              icon={Shield}
              title="Infrastructure"
              description="System and network configuration"
            >
              {infrastructureSections.map((section) => (
                <DynamicConfigSection
                  key={section.id}
                  section={section}
                  config={storeConfig}
                  onUpdate={updateField}
                />
              ))}
            </SectionGroup>
          )}

          {/* Advanced sections — collapsible */}
          {advancedSections.length > 0 && (
            <div className="space-y-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={cn(
                  "flex items-center gap-2 w-full p-4 rounded-xl",
                  "border border-border bg-card/50",
                  "hover:bg-card hover:border-border-hover",
                  "transition-all duration-200"
                )}
              >
                <Wrench className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-foreground">
                    Advanced Settings
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {advancedSections.length} additional configuration sections
                  </p>
                </div>
                {showAdvanced ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {showAdvanced && (
                <div className="space-y-4 pl-4 border-l-2 border-border">
                  {advancedSections.map((section) => (
                    <DynamicConfigSection
                      key={section.id}
                      section={section}
                      config={storeConfig}
                      onUpdate={updateField}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SectionGroupProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}

function SectionGroup({ icon: Icon, title, description, children }: SectionGroupProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function ConfigureSkeleton() {
  return (
    <div className="space-y-8">
      {/* Section header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>

      {/* Card skeletons */}
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56 mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
