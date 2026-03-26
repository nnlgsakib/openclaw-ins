import { useState } from "react"
import {
  useChannels,
  useDisconnectChannel,
  type ChannelInfo,
  type ChannelStatus,
  type ChannelType,
} from "@/hooks/use-channels"
import { useOpenClawStatus } from "@/hooks/use-monitoring"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { PairingModal } from "@/components/channels/pairing-modal"
import {
  RefreshCw,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { toast } from "sonner"

const CHANNEL_ICONS: Record<ChannelType, string> = {
  whatsapp: "📱",
  telegram: "✈️",
  discord: "🎮",
  slack: "💬",
}

export function Channels() {
  const { data: channels, isLoading: channelsLoading } = useChannels()
  const { data: status, isLoading: statusLoading } = useOpenClawStatus()
  const queryClient = useQueryClient()
  const [pairingChannel, setPairingChannel] = useState<ChannelInfo | null>(null)

  const isRunning = status?.state === "running"
  const isLoading = channelsLoading || statusLoading

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["channels"] })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Channels</h1>
          <p className="text-muted-foreground">
            Manage messaging channel connections
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Not running state */}
      {!statusLoading && !isRunning && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>OpenClaw Not Running</AlertTitle>
          <AlertDescription>
            Start OpenClaw to manage channel connections.{" "}
            <Link
              to="/install"
              className="underline font-medium hover:text-foreground"
            >
              Install or start OpenClaw
              <ExternalLink className="inline ml-1 h-3 w-3" />
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Channel Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}

        {!isLoading &&
          channels?.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onConnect={() => setPairingChannel(channel)}
            />
          ))}
      </div>

      {/* Empty state */}
      {!isLoading && channels?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No channels available
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pairing Modal */}
      <PairingModal
        open={!!pairingChannel}
        onOpenChange={(open) => !open && setPairingChannel(null)}
        channel={pairingChannel}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["channels"] })
        }}
      />
    </div>
  )
}

// ─── Internal Components ───────────────────────────────────────────

function ChannelCard({
  channel,
  onConnect,
}: {
  channel: ChannelInfo
  onConnect: () => void
}) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const disconnectMutation = useDisconnectChannel()

  const handleDisconnect = () => {
    disconnectMutation.mutate(channel.id, {
      onSuccess: () => {
        toast.success(`${channel.name} disconnected`)
        setConfirmDisconnect(false)
      },
      onError: () => {
        toast.error(`Failed to disconnect ${channel.name}`)
        setConfirmDisconnect(false)
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span>{CHANNEL_ICONS[channel.channelType]}</span>
            {channel.name}
          </CardTitle>
          <ChannelStatusBadge status={channel.status} />
        </div>
        <CardDescription>
          {channel.lastActiveAt
            ? `Last active: ${formatRelativeTime(channel.lastActiveAt)}`
            : "Never connected"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {confirmDisconnect ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Disconnect {channel.name}?
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending && (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              )}
              Confirm
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDisconnect(false)}
            >
              Cancel
            </Button>
          </div>
        ) : channel.status === "connected" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmDisconnect(true)}
          >
            Disconnect
          </Button>
        ) : channel.status === "expired" ? (
          <div className="flex items-center gap-2">
            <Alert variant="default" className="flex-1">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Session expired — reconnect to continue
              </AlertDescription>
            </Alert>
            <Button size="sm" onClick={onConnect}>
              Reconnect
            </Button>
          </div>
        ) : channel.status === "connecting" ? (
          <Button size="sm" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </Button>
        ) : (
          <Button size="sm" onClick={onConnect}>
            Connect
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function ChannelStatusBadge({ status }: { status: ChannelStatus }) {
  switch (status) {
    case "connected":
      return (
        <Badge
          variant="default"
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Connected
        </Badge>
      )
    case "disconnected":
      return (
        <Badge variant="outline" className="text-slate-500">
          Disconnected
        </Badge>
      )
    case "expired":
      return (
        <Badge
          variant="outline"
          className="text-yellow-600 border-yellow-600"
        >
          <AlertTriangle className="mr-1 h-3 w-3" />
          Expired
        </Badge>
      )
    case "connecting":
      return (
        <Badge
          variant="outline"
          className="text-blue-600 border-blue-600"
        >
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Connecting
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary">
          <HelpCircle className="mr-1 h-3 w-3" />
          Unknown
        </Badge>
      )
  }
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}
