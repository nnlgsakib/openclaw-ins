import { useEffect } from "react";
import { useConfig, useSaveConfig, useValidateConfig } from "@/hooks/use-config";
import { useGatewayConfig, useGatewayConfigPatch } from "@/hooks/use-gateway";
import { useGatewayStore } from "@/stores/use-gateway-store";
import { useConfigStore } from "@/stores/use-config-store";
import { ProviderSection } from "@/components/config/provider-section";
import { SandboxSection } from "@/components/config/sandbox-section";
import { ToolsSection } from "@/components/config/tools-section";
import { AgentsSection } from "@/components/config/agents-section";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { showError } from "@/lib/toast-errors";
import { Save, Loader2, Globe } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function Configure() {
  const gatewayConnected = useGatewayStore((s) => s.connected);
  const { data: gatewayConfig } = useGatewayConfig();
  const gatewayPatch = useGatewayConfigPatch();
  const { data: config, isLoading, error, isError } = useConfig();
  const saveConfig = useSaveConfig();
  const validateConfig = useValidateConfig();
  const { config: storeConfig, isDirty, setConfig, markClean } = useConfigStore();
  const [isSaving, setIsSaving] = useState(false);

  const baseHash = (gatewayConfig as any)?.baseHash ?? "";

  // Load config into store on mount — prefer Gateway config over file config
  useEffect(() => {
    if (gatewayConnected && gatewayConfig) {
      const gwConf = (gatewayConfig as any)?.config ?? gatewayConfig;
      setConfig(gwConf);
    } else if (config) {
      setConfig(config);
    }
  }, [config, gatewayConfig, gatewayConnected, setConfig]);

  // Show error if query fails
  if (isError && error) {
    showError(error);
  }

  const handleSave = async () => {
    if (!isDirty) return;

    setIsSaving(true);
    try {
      // First validate
      const validation = await validateConfig.mutateAsync(storeConfig);

      if (!validation.valid && validation.errors.length > 0) {
        const errorMessages = validation.errors
          .map((e) => `${e.field}: ${e.message}`)
          .join(", ");
        showError(new Error(errorMessages));
        setIsSaving(false);
        return;
      }

      // Prefer Gateway hot-reload when connected
      if (gatewayConnected && baseHash) {
        const raw = JSON.stringify(storeConfig);
        await gatewayPatch.mutateAsync({ raw, baseHash });
        markClean();
        toast.success("Configuration applied via Gateway hot-reload");
      } else {
        // Fall back to file-based save
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

  return (
    <div className="space-y-6">
      {/* Gateway status banner */}
      {!gatewayConnected && (
        <Alert>
          <Globe className="h-4 w-4" />
          <AlertDescription>
            Gateway not connected — changes will be saved to file and apply on next Gateway start.
          </AlertDescription>
        </Alert>
      )}

      {/* Header with Save button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configure</h1>
          <p className="text-muted-foreground">
            Configure your OpenClaw AI provider and sandbox settings
            {gatewayConnected && (
              <span className="ml-2 text-green-500">(Gateway hot-reload active)</span>
            )}
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
      </div>

      {/* Loading state — skeleton matching config sections layout */}
      {isLoading && <ConfigureSkeleton />}

      {/* Configuration sections */}
      {!isLoading && (
        <div className="space-y-6">
          <ProviderSection />
          <SandboxSection />
          <ToolsSection />
          <AgentsSection />
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loading state matching the configuration page layout.
 * Shows 4 section skeletons matching ProviderSection, SandboxSection,
 * ToolsSection, and AgentsSection.
 */
function ConfigureSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56 mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}