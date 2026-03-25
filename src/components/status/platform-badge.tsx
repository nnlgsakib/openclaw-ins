import { Monitor, Cpu, HelpCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { usePlatform } from "@/hooks/use-platform"

/**
 * Platform indicator badge displayed in the header.
 * Shows Windows or Linux with the appropriate icon.
 */
export function PlatformBadge() {
  const { data: platform, isLoading } = usePlatform()

  if (isLoading) {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <HelpCircle className="h-3.5 w-3.5" />
        <span>Loading...</span>
      </Badge>
    )
  }

  const os = platform?.os ?? "unknown"

  const platformConfig: Record<string, { icon: typeof Monitor; label: string }> = {
    windows: { icon: Monitor, label: "Windows" },
    linux: { icon: Cpu, label: "Linux" },
  }

  const config = platformConfig[os] ?? { icon: HelpCircle, label: "Unknown" }
  const Icon = config.icon

  return (
    <Badge variant="secondary" className="gap-1.5">
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}</span>
    </Badge>
  )
}
