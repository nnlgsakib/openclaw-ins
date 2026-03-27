import { useState } from "react"
import {
  useChannels,
  useDisconnectChannel,
  useContacts,
  useUpdateContactStatus,
  useActivity,
  type ChannelInfo,
  type ChannelStatus,
  type ChannelType,
  type Contact,
  type ContactStatus,
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
  Users,
  Activity,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
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

type Tab = "channels" | "contacts" | "activity"

export function Channels() {
  const { data: channels, isLoading: channelsLoading } = useChannels()
  const { data: status, isLoading: statusLoading } = useOpenClawStatus()
  const queryClient = useQueryClient()
  const [pairingChannel, setPairingChannel] = useState<ChannelInfo | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("channels")

  const isRunning = status?.state === "running"
  const isLoading = channelsLoading || statusLoading

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["channels"] })
    if (activeTab === "contacts") {
      queryClient.invalidateQueries({ queryKey: ["channels", "contacts"] })
    }
    if (activeTab === "activity") {
      queryClient.invalidateQueries({ queryKey: ["channels", "activity"] })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Channels</h1>
          <p className="text-muted-foreground">
            Manage messaging channels, contacts, and activity
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

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <TabButton
          active={activeTab === "channels"}
          onClick={() => setActiveTab("channels")}
          icon={<MessageSquare className="h-4 w-4" />}
          label="Channels"
        />
        <TabButton
          active={activeTab === "contacts"}
          onClick={() => setActiveTab("contacts")}
          icon={<Users className="h-4 w-4" />}
          label="Contacts"
        />
        <TabButton
          active={activeTab === "activity"}
          onClick={() => setActiveTab("activity")}
          icon={<Activity className="h-4 w-4" />}
          label="Activity"
        />
      </div>

      {/* Tab Content */}
      {activeTab === "channels" && (
        <ChannelsTab
          channels={channels}
          isLoading={isLoading}
          onConnect={(channel) => setPairingChannel(channel)}
        />
      )}
      {activeTab === "contacts" && <ContactsTab />}
      {activeTab === "activity" && <ActivityTab />}

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

// ─── Tab Components ──────────────────────────────────────────────

function ChannelsTab({
  channels,
  isLoading,
  onConnect,
}: {
  channels: ChannelInfo[] | undefined
  isLoading: boolean
  onConnect: (channel: ChannelInfo) => void
}) {
  return (
    <>
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
              onConnect={() => onConnect(channel)}
            />
          ))}
      </div>

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
    </>
  )
}

function ContactsTab() {
  const { data: contacts, isLoading } = useContacts()

  const pendingCount = contacts?.filter((c) => c.status === "pending").length ?? 0

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Pending Approval</AlertTitle>
          <AlertDescription>
            {pendingCount} contact{pendingCount > 1 ? "s" : ""} waiting for
            your approval.
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && contacts?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No contacts yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Contacts appear when someone messages your agent for the first time
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading &&
        contacts?.map((contact) => (
          <ContactCard key={contact.id} contact={contact} />
        ))}
    </div>
  )
}

function ActivityTab() {
  const { data: activity, isLoading } = useActivity()

  return (
    <div className="space-y-3">
      {isLoading &&
        Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 py-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-3 w-16" />
            </CardContent>
          </Card>
        ))}

      {!isLoading && activity?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground mt-1">
              Messages from your channels will appear here
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading &&
        activity?.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="flex items-center gap-3 py-3">
              <span className="text-lg">
                {CHANNEL_ICONS[entry.channelType]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.sender}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {entry.preview}
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatRelativeTime(entry.timestamp)}
              </span>
            </CardContent>
          </Card>
        ))}
    </div>
  )
}

// ─── Internal Components ───────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

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

function ContactCard({ contact }: { contact: Contact }) {
  const updateMutation = useUpdateContactStatus()

  const handleAction = (newStatus: string, successMessage: string) => {
    updateMutation.mutate(
      { contactId: contact.id, newStatus },
      {
        onSuccess: () => toast.success(successMessage),
        onError: () => toast.error("Failed to update contact"),
      }
    )
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <span className="text-lg">{CHANNEL_ICONS[contact.channelType]}</span>
          <div>
            <p className="text-sm font-medium">{contact.name}</p>
            <p className="text-xs text-muted-foreground">
              {contact.lastMessageAt
                ? `Last message: ${formatRelativeTime(contact.lastMessageAt)}`
                : "No messages yet"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ContactStatusBadge status={contact.status} />
          {contact.status === "pending" && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("approved", `${contact.name} approved`)}
                disabled={updateMutation.isPending}
              >
                <ShieldCheck className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction("blocked", `${contact.name} blocked`)}
                disabled={updateMutation.isPending}
              >
                <ShieldX className="h-4 w-4" />
              </Button>
            </div>
          )}
          {contact.status === "approved" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction("blocked", `${contact.name} blocked`)}
              disabled={updateMutation.isPending}
            >
              Block
            </Button>
          )}
          {contact.status === "blocked" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                handleAction("approved", `${contact.name} unblocked`)
              }
              disabled={updateMutation.isPending}
            >
              Unblock
            </Button>
          )}
        </div>
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
        <Badge variant="outline" className="text-muted-foreground">
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
          className="text-primary border-primary"
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

function ContactStatusBadge({ status }: { status: ContactStatus }) {
  switch (status) {
    case "approved":
      return (
        <Badge
          variant="default"
          className="bg-green-600 hover:bg-green-700"
        >
          <ShieldCheck className="mr-1 h-3 w-3" />
          Approved
        </Badge>
      )
    case "pending":
      return (
        <Badge
          variant="outline"
          className="text-yellow-600 border-yellow-600"
        >
          <ShieldAlert className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      )
    case "blocked":
      return (
        <Badge variant="destructive">
          <ShieldX className="mr-1 h-3 w-3" />
          Blocked
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status}</Badge>
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
