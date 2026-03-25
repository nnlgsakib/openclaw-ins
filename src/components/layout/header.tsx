import { Clapperboard } from "lucide-react"
import { PlatformBadge } from "@/components/status/platform-badge"

/**
 * App header with logo, title, and platform badge.
 * Height: 48px, border-bottom, slate-50 background.
 */
export function Header() {
  return (
    <header className="flex h-12 items-center justify-between border-b bg-slate-50 px-4">
      <div className="flex items-center gap-2">
        <Clapperboard className="h-5 w-5 text-blue-600" />
        <span className="text-lg font-semibold text-slate-900">OpenClaw Desktop</span>
      </div>
      <div className="flex items-center gap-3">
        <PlatformBadge />
      </div>
    </header>
  )
}
