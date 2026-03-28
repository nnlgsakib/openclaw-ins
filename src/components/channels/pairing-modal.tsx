import {
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
}: PairingModalProps) {
  if (!channel) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Configure {channel.name}</DialogTitle>
        <DialogDescription>
          Enter your {channel.name} credentials to connect.
        </DialogDescription>
      </DialogHeader>
      <DialogContent>
        <div className="text-sm text-muted-foreground">
          Use the channel configuration on the Channels page to set up {channel.name}.
        </div>
        <Button onClick={() => onOpenChange(false)} variant="outline">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  )
}
