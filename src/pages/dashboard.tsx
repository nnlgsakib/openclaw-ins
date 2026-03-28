import { Rocket, Monitor, Settings, ArrowRight, Play, Globe, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useGatewayStore } from "@/stores/use-gateway-store"
import { Link } from "react-router-dom"
import { invoke } from "@tauri-apps/api/core"
import { useState } from "react"
import { toast } from "sonner"

/**
 * Dashboard landing page with status overview and quick actions.
 */
export default function DashboardPage() {
  const { connected } = useGatewayStore()
  const [starting, setStarting] = useState(false)

  const handleStartGateway = async () => {
    setStarting(true)
    try {
      await invoke("start_gateway", { port: 18789 })
      toast.success("Gateway is running")
    } catch (e) {
      toast.error(`Failed to start: ${e}`)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {connected
            ? "OpenClaw Gateway is running."
            : "Your OpenClaw installation overview."}
        </p>
      </div>

      {/* Primary action card */}
      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <CardTitle>
              {connected ? "Gateway Running" : "Get Started"}
            </CardTitle>
          </div>
          <CardDescription>
            {connected
              ? "OpenClaw is ready. Access the Control UI or manage your setup."
              : "Set up your AI assistant — configure model, sandbox, and channels."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connected ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/webapp">
                  <Globe className="mr-2 h-4 w-4" />
                  OpenClaw UI
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/monitor">
                  <Monitor className="mr-2 h-4 w-4" />
                  Monitor
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/configure">
                  <Settings className="mr-2 h-4 w-4" />
                  Configure
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/setup">
                  Run Setup Wizard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={handleStartGateway}
                disabled={starting}
              >
                {starting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {starting ? "Starting..." : "Start Gateway"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick action cards when not connected */}
      {!connected && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            title="1. Setup"
            description="Configure model, API keys, sandbox"
            to="/setup"
          />
          <QuickActionCard
            title="2. Install"
            description="Install OpenClaw & start Gateway"
            to="/install"
          />
          <QuickActionCard
            title="3. Channels"
            description="Connect messaging platforms"
            to="/channels"
          />
        </div>
      )}
    </div>
  )
}

function QuickActionCard({
  title,
  description,
  to,
}: {
  title: string
  description: string
  to: string
}) {
  return (
    <Card className="transition-colors hover:border-primary/50">
      <Link to={to} className="block">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Link>
    </Card>
  )
}
