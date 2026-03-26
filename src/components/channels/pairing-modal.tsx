import { useState } from "react"
import {
  useWhatsAppQr,
  useValidateTelegramToken,
  useValidateDiscordToken,
  useConnectChannel,
  type ChannelInfo,
} from "@/hooks/use-channels"
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, ExternalLink, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

interface PairingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channel: ChannelInfo | null
  onSuccess: () => void
}

export function PairingModal({
  open,
  onOpenChange,
  channel,
  onSuccess,
}: PairingModalProps) {
  if (!channel) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Connect {channel.name}</DialogTitle>
        <DialogDescription>
          {channel.channelType === "whatsapp"
            ? "Scan the QR code with your WhatsApp app"
            : `Enter your ${channel.name} bot token`}
        </DialogDescription>
      </DialogHeader>
      <DialogContent>
        {channel.channelType === "whatsapp" && (
          <WhatsAppPairing
            onSuccess={() => {
              onSuccess()
              onOpenChange(false)
            }}
          />
        )}
        {channel.channelType === "telegram" && (
          <TelegramPairing
            onSuccess={() => {
              onSuccess()
              onOpenChange(false)
            }}
          />
        )}
        {channel.channelType === "discord" && (
          <DiscordPairing
            onSuccess={() => {
              onSuccess()
              onOpenChange(false)
            }}
          />
        )}
        {channel.channelType === "slack" && (
          <div className="text-sm text-muted-foreground">
            Slack pairing coming soon.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Channel-Specific Pairing Components ──────────────────────────

function WhatsAppPairing({ onSuccess }: { onSuccess: () => void }) {
  const { data: qrData, isLoading, error } = useWhatsAppQr(true)
  const connectMutation = useConnectChannel()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <Skeleton className="h-64 w-64" />
        <p className="text-sm text-muted-foreground">Loading QR code...</p>
      </div>
    )
  }

  if (error || !qrData?.qrCode) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">
          Failed to load QR code. Ensure OpenClaw is running.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="rounded-lg border bg-white p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrData.qrCode}
          alt="WhatsApp QR Code"
          className="h-64 w-64"
        />
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm font-medium">Scan with WhatsApp</p>
        <p className="text-xs text-muted-foreground">
          Open WhatsApp → Settings → Linked Devices → Link a Device
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          connectMutation.mutate("whatsapp", {
            onSuccess: () => {
              toast.success("WhatsApp connected!")
              onSuccess()
            },
            onError: () => toast.error("Failed to complete WhatsApp pairing"),
          })
        }}
        disabled={connectMutation.isPending}
      >
        {connectMutation.isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        I've Scanned
      </Button>
    </div>
  )
}

function TelegramPairing({ onSuccess }: { onSuccess: () => void }) {
  const [token, setToken] = useState("")
  const [showToken, setShowToken] = useState(false)
  const validateMutation = useValidateTelegramToken()
  const connectMutation = useConnectChannel()

  const handleValidate = async () => {
    const result = await validateMutation.mutateAsync(token)
    if (result.valid) {
      connectMutation.mutate("telegram", {
        onSuccess: () => {
          toast.success("Telegram bot connected!")
          onSuccess()
        },
        onError: () => toast.error("Failed to connect Telegram bot"),
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="telegram-token" className="text-sm font-medium">
          Bot Token
        </label>
        <div className="relative">
          <input
            id="telegram-token"
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-10 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showToken ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Get your token from{" "}
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            @BotFather
            <ExternalLink className="inline ml-0.5 h-3 w-3" />
          </a>
        </p>
      </div>

      {validateMutation.data && !validateMutation.data.valid && (
        <p className="text-sm text-destructive">
          {validateMutation.data.message}
        </p>
      )}

      {validateMutation.data?.valid && (
        <p className="text-sm text-green-600">
          {validateMutation.data.message}
        </p>
      )}

      <Button
        onClick={handleValidate}
        disabled={!token.trim() || validateMutation.isPending || connectMutation.isPending}
        className="w-full"
      >
        {(validateMutation.isPending || connectMutation.isPending) && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Connect Telegram Bot
      </Button>
    </div>
  )
}

function DiscordPairing({ onSuccess }: { onSuccess: () => void }) {
  const [token, setToken] = useState("")
  const [showToken, setShowToken] = useState(false)
  const validateMutation = useValidateDiscordToken()
  const connectMutation = useConnectChannel()

  const handleValidate = async () => {
    const result = await validateMutation.mutateAsync(token)
    if (result.valid) {
      connectMutation.mutate("discord", {
        onSuccess: () => {
          toast.success("Discord bot connected!")
          onSuccess()
        },
        onError: () => toast.error("Failed to connect Discord bot"),
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="discord-token" className="text-sm font-medium">
          Bot Token
        </label>
        <div className="relative">
          <input
            id="discord-token"
            type={showToken ? "text" : "password"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.G..."
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-10 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showToken ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Create a bot at{" "}
          <a
            href="https://discord.com/developers/applications"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Discord Developer Portal
            <ExternalLink className="inline ml-0.5 h-3 w-3" />
          </a>
        </p>
      </div>

      {validateMutation.data && !validateMutation.data.valid && (
        <p className="text-sm text-destructive">
          {validateMutation.data.message}
        </p>
      )}

      {validateMutation.data?.valid && (
        <p className="text-sm text-green-600">
          {validateMutation.data.message}
        </p>
      )}

      <Button
        onClick={handleValidate}
        disabled={!token.trim() || validateMutation.isPending || connectMutation.isPending}
        className="w-full"
      >
        {(validateMutation.isPending || connectMutation.isPending) && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Connect Discord Bot
      </Button>
    </div>
  )
}
