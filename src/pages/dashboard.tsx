import { Rocket, Monitor, Settings, Container } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useOpenClawStatus, useSandboxContainers, useAgentSessions } from "@/hooks/use-monitoring"
import { Link } from "react-router-dom"

/**
 * Dashboard landing page with status overview and quick actions.
 * Shows skeleton loading states while data fetches.
 */
export default function DashboardPage() {
  const { data: status, isLoading: statusLoading } = useOpenClawStatus()
  const { data: containers, isLoading: containersLoading } = useSandboxContainers()
  const { data: sessions, isLoading: sessionsLoading } = useAgentSessions()

  const isLoading = statusLoading || containersLoading || sessionsLoading

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your OpenClaw installation.</p>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Status Overview Card */}
          <Card className="max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                <CardTitle>
                  {status?.state === "running" ? "OpenClaw is Running" : "Get Started"}
                </CardTitle>
              </div>
              <CardDescription>
                {status?.state === "running"
                  ? `Version ${status.version ?? "unknown"} on port ${status.port}`
                  : "Let's get your system ready. Start by checking your environment."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {status?.state === "running" ? (
                <div className="flex gap-2">
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
                <Button asChild>
                  <Link to="/install">Get Started</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Agent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{sessions?.length ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Container className="h-4 w-4" />
                  Sandbox Containers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{containers?.length ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold capitalize">
                  {status?.state ?? "unknown"}
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Skeleton loading state matching the dashboard layout.
 * Prevents layout shift by matching actual content shapes.
 */
function DashboardSkeleton() {
  return (
    <>
      {/* Status card skeleton */}
      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-9 w-28" />
        </CardContent>
      </Card>

      {/* Quick stats skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
