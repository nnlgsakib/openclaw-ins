import { useState } from "react";
import {
  useChannels,
  useUpdateChannel,
  type ChannelInfo,
} from "@/hooks/use-channels";
import { useGatewayConfig } from "@/hooks/use-gateway";
import { useGatewayStore } from "@/stores/use-gateway-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CHANNEL_ICONS: Record<string, string> = {
  whatsapp: "📱",
  telegram: "✈️",
  discord: "🎮",
  slack: "💬",
  signal: "🔒",
  msteams: "👥",
};

export function Channels() {
  const connected = useGatewayStore((s) => s.connected);
  const { data: channels, isLoading, refetch } = useChannels();
  const { data: gatewayConfig } = useGatewayConfig();

  const baseHash = (gatewayConfig as any)?.baseHash ?? "";

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Channels</h1>
          <p className="text-muted-foreground">
            Manage messaging channels through the OpenClaw Gateway.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading || !connected}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {!connected && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Gateway Not Connected</AlertTitle>
          <AlertDescription>
            Connect to the Gateway to manage channel configurations.{" "}
            <Link
              to="/install"
              className="font-medium underline hover:text-foreground"
            >
              Start Gateway
              <ExternalLink className="ml-1 inline h-3 w-3" />
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {connected && isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {connected && !isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {channels?.map((channel) => (
            <ChannelCard
              key={channel.provider}
              channel={channel}
              baseHash={baseHash}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChannelCard({
  channel,
  baseHash,
}: {
  channel: ChannelInfo;
  baseHash: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const updateChannel = useUpdateChannel();

  const handleToggle = async () => {
    if (!baseHash) {
      toast.error("No config hash available — refresh the page");
      return;
    }
    try {
      await updateChannel.mutateAsync({
        provider: channel.provider,
        config: { enabled: !channel.enabled },
        baseHash,
      });
      toast.success(
        `${channel.name} ${channel.enabled ? "disabled" : "enabled"}`
      );
    } catch (e) {
      toast.error(`Failed to update ${channel.name}: ${e}`);
    }
  };

  const handleSaveConfig = async () => {
    if (!baseHash) {
      toast.error("No config hash available — refresh the page");
      return;
    }
    try {
      const configToSave: Record<string, unknown> = { ...fieldValues, enabled: true };
      // OpenClaw requires allowFrom=["*"] when dmPolicy is "open"
      if (configToSave.dmPolicy === "open") {
        configToSave.allowFrom = ["*"];
      }
      await updateChannel.mutateAsync({
        provider: channel.provider,
        config: configToSave,
        baseHash,
      });
      toast.success(`${channel.name} configuration saved`);
      setExpanded(false);
    } catch (e) {
      toast.error(`Failed to save ${channel.name} config: ${e}`);
    }
  };

  const dmPolicy = (channel.config.dmPolicy as string) ?? "pairing";

  return (
    <Card
      className={cn(
        "transition-colors",
        channel.enabled ? "border-primary/50" : ""
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span>{CHANNEL_ICONS[channel.provider] ?? "📡"}</span>
            {channel.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            {channel.enabled ? (
              <Badge className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="outline">Disabled</Badge>
            )}
          </div>
        </div>
        <CardDescription>{channel.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={channel.enabled ? "outline" : "default"}
            onClick={handleToggle}
            disabled={updateChannel.isPending}
          >
            {updateChannel.isPending ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : null}
            {channel.enabled ? "Disable" : "Enable"}
          </Button>
          {channel.setupFields.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Hide Config" : "Configure"}
            </Button>
          )}
          <a
            href={channel.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Docs <ExternalLink className="ml-0.5 inline h-3 w-3" />
          </a>
        </div>

        {/* Expanded config fields */}
        {expanded && channel.setupFields.length > 0 && (
          <div className="space-y-3 border-t border-border pt-3">
            {channel.setupFields.map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="text-sm font-medium">
                  {field.label}
                  {field.required && (
                    <span className="ml-1 text-destructive">*</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={
                      field.type === "password" && !showTokens[field.key]
                        ? "password"
                        : "text"
                    }
                    placeholder={field.placeholder}
                    value={fieldValues[field.key] ?? ""}
                    onChange={(e) =>
                      setFieldValues((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {field.type === "password" && (
                    <button
                      onClick={() =>
                        setShowTokens((prev) => ({
                          ...prev,
                          [field.key]: !prev[field.key],
                        }))
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showTokens[field.key] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* DM Policy */}
            <div className="space-y-1">
              <label className="text-sm font-medium">DM Policy</label>
              <select
                value={fieldValues.dmPolicy ?? dmPolicy}
                onChange={(e) =>
                  setFieldValues((prev) => ({
                    ...prev,
                    dmPolicy: e.target.value,
                  }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="pairing">
                  Pairing — unknown senders get a one-time code
                </option>
                <option value="allowlist">
                  Allowlist — only approved contacts
                </option>
                <option value="open">Open — allow all DMs</option>
                <option value="disabled">Disabled — ignore all DMs</option>
              </select>
            </div>

            <Button
              size="sm"
              onClick={handleSaveConfig}
              disabled={updateChannel.isPending}
            >
              {updateChannel.isPending ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : null}
              Save Configuration
            </Button>
          </div>
        )}

        {channel.setupFields.length === 0 && channel.enabled && (
          <p className="text-xs text-muted-foreground">
            {channel.provider === "signal"
              ? "Requires signal-cli to be installed separately."
              : "Requires plugin installation after Gateway is running."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
