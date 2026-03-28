import { motion } from "motion/react";
import { MessageSquare } from "lucide-react";
import { useWizardStore, CHANNEL_OPTIONS } from "@/stores/use-wizard-store";
import { cn } from "@/lib/utils";

export function ChannelsStep() {
  const {
    selectedChannels,
    toggleChannel,
    channelConfigs,
    setChannelField,
    dmPolicies,
    setDmPolicy,
  } = useWizardStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold">Messaging Channels</h2>
        <p className="text-sm text-muted-foreground">
          Select which messaging platforms to connect. You can configure
          credentials now or later after installation.
        </p>
      </div>

      <div className="space-y-3">
        {CHANNEL_OPTIONS.map((channel) => {
          const isEnabled = selectedChannels.includes(channel.id);
          const config = channelConfigs[channel.id] ?? {};
          const dmPolicy = dmPolicies[channel.id] ?? "pairing";

          return (
            <div
              key={channel.id}
              className={cn(
                "rounded-lg border transition-colors",
                isEnabled
                  ? "border-primary bg-primary/5"
                  : "border-border"
              )}
            >
              <button
                onClick={() => toggleChannel(channel.id)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare
                    className={cn(
                      "h-5 w-5",
                      isEnabled ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <p className="font-medium">{channel.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {channel.description}
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    isEnabled ? "bg-primary" : "bg-muted"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                      isEnabled ? "left-[22px]" : "left-0.5"
                    )}
                  />
                </div>
              </button>

              {isEnabled && channel.fields.length > 0 && (
                <div className="border-t border-border p-4 space-y-3">
                  {channel.fields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-sm font-medium">
                        {field.label}
                        {field.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </label>
                      <input
                        type={field.type === "password" ? "password" : "text"}
                        placeholder={field.placeholder}
                        value={config[field.key] ?? ""}
                        onChange={(e) =>
                          setChannelField(channel.id, field.key, e.target.value)
                        }
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  ))}

                  <div className="space-y-1">
                    <label className="text-sm font-medium">DM Policy</label>
                    <select
                      value={dmPolicy}
                      onChange={(e) =>
                        setDmPolicy(
                          channel.id,
                          e.target.value as typeof dmPolicy
                        )
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
                </div>
              )}

              {isEnabled && channel.fields.length === 0 && (
                <div className="border-t border-border p-4">
                  <p className="text-xs text-muted-foreground">
                    {channel.id === "signal"
                      ? "Requires signal-cli to be installed separately."
                      : "Requires plugin installation after Gateway is running."}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
