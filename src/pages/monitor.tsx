import {
  useOpenClawStatus,
  useAgentSessions,
  useSandboxContainers,
  useContainerLogs,
} from "@/hooks/use-monitoring"
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
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Container,
  Activity,
  Terminal,
  HelpCircle,
  ExternalLink,
  Loader2,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"

export function Monitor() {
  const { data: status, isLoading: statusLoading } = useOpenClawStatus()
  const { data: sessions, isLoading: sessionsLoading } = useAgentSessions()
  const { data: containers, isLoading: containersLoading } =
    useSandboxContainers()
  const queryClient = useQueryClient()

  const isRunning = status?.state === "running"

  const { data: containerLogs, isLoading: logsLoading } = useContainerLogs(
    containers?.[0]?.id ?? "",
    isRunning,
  )

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["monitoring"] })
  }

  const isLoading = statusLoading || sessionsLoading || containersLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monitor</h1>
          <p className="text-muted-foreground">
            Real-time OpenClaw status and activity
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

      {/* OpenClaw Status Card — MON-01 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              OpenClaw
            </CardTitle>
            <StatusBadge status={status} isLoading={statusLoading} />
          </div>
          <CardDescription>OpenClaw agent platform status</CardDescription>
        </CardHeader>
        <CardContent>
          {statusLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Checking status...</span>
            </div>
          )}

          {/* Running — show details */}
          {status?.state === "running" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Version
                </p>
                <p className="text-sm font-mono">
                  {status.version ?? "Unknown"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Port
                </p>
                <p className="text-sm font-mono">{status.port}</p>
              </div>
            </div>
          )}

          {/* Stopped */}
          {status?.state === "stopped" && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Not Running</AlertTitle>
              <AlertDescription>
                OpenClaw is not currently running.{" "}
                <Link
                  to="/install"
                  className="underline font-medium hover:text-foreground"
                >
                  Start or install OpenClaw
                  <ExternalLink className="inline ml-1 h-3 w-3" />
                </Link>
              </AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {status?.state === "error" && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}

          {/* Unknown */}
          {status?.state === "unknown" && (
            <Alert>
              <HelpCircle className="h-4 w-4" />
              <AlertTitle>Unknown Status</AlertTitle>
              <AlertDescription>
                Could not determine OpenClaw status. Docker may not be available.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Agent Sessions Card — MON-02 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Agent Sessions
            </CardTitle>
            {sessions && sessions.length > 0 && (
              <Badge variant="secondary">{sessions.length}</Badge>
            )}
          </div>
          <CardDescription>Active agent sessions in OpenClaw</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionsLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading sessions...</span>
            </div>
          )}

          {!sessionsLoading && sessions && sessions.length === 0 && (
            <p className="text-sm text-muted-foreground">No active sessions</p>
          )}

          {sessions && sessions.length > 0 && (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {session.name ?? `Session ${session.id}`}
                    </p>
                    {session.model && (
                      <p className="text-xs text-muted-foreground truncate">
                        {session.model}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <SessionStatusBadge status={session.status} />
                    {session.startedAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(session.startedAt)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Logs Card — MON-03 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Activity Logs
          </CardTitle>
          <CardDescription>Container log output</CardDescription>
        </CardHeader>
        <CardContent>
          {isRunning ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Live
                </Badge>
                {logsLoading && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="rounded-md bg-muted p-4 font-mono text-xs text-muted-foreground max-h-64 overflow-y-auto">
                {containerLogs ? (
                  containerLogs.split("\n").map((line, i) => (
                    <p key={i} className="whitespace-pre-wrap">
                      {line || "\u00A0"}
                    </p>
                  ))
                ) : (
                  <p className="text-muted-foreground italic">
                    No log output yet...
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No logs available — OpenClaw is not running.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sandbox Containers Card — MON-04 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Container className="h-5 w-5" />
              Sandbox Containers
            </CardTitle>
            {containers && containers.length > 0 && (
              <Badge variant="secondary">{containers.length}</Badge>
            )}
          </div>
          <CardDescription>
            Docker containers for OpenClaw sandboxing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {containersLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading containers...</span>
            </div>
          )}

          {!containersLoading && containers && containers.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                No sandbox containers
              </p>
              <p className="text-xs text-muted-foreground">
                Enable sandboxing in{" "}
                <Link
                  to="/configure"
                  className="underline hover:text-foreground"
                >
                  Configure
                </Link>{" "}
                to create sandbox containers.
              </p>
            </div>
          )}

          {containers && containers.length > 0 && (
            <div className="space-y-3">
              {containers.map((container) => (
                <div
                  key={container.id}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {container.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {container.image}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ContainerStateBadge state={container.state} />
                    <span className="text-xs text-muted-foreground truncate max-w-32">
                      {container.statusText}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Internal Components ───────────────────────────────────────────

function StatusBadge({
  status,
  isLoading,
}: {
  status: ReturnType<typeof useOpenClawStatus>["data"]
  isLoading: boolean
}) {
  if (isLoading) {
    return <Badge variant="secondary">Checking...</Badge>
  }
  if (!status) {
    return <Badge variant="secondary">Unknown</Badge>
  }
  switch (status.state) {
    case "running":
      return (
        <Badge
          variant="default"
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Running
        </Badge>
      )
    case "stopped":
      return (
        <Badge
          variant="outline"
          className="text-yellow-600 border-yellow-600"
        >
          <AlertTriangle className="mr-1 h-3 w-3" />
          Stopped
        </Badge>
      )
    case "error":
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Error
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

function SessionStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return (
        <Badge
          variant="default"
          className="bg-green-600 hover:bg-green-700"
        >
          Active
        </Badge>
      )
    case "idle":
      return <Badge variant="secondary">Idle</Badge>
    case "error":
      return <Badge variant="destructive">Error</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function ContainerStateBadge({ state }: { state: string }) {
  switch (state) {
    case "running":
      return (
        <Badge
          variant="default"
          className="bg-green-600 hover:bg-green-700"
        >
          Running
        </Badge>
      )
    case "exited":
    case "dead":
      return <Badge variant="destructive">{state}</Badge>
    case "paused":
      return (
        <Badge
          variant="outline"
          className="text-yellow-600 border-yellow-600"
        >
          Paused
        </Badge>
      )
    default:
      return <Badge variant="outline">{state}</Badge>
  }
}

/**
 * Format an ISO timestamp as a relative time string (e.g., "5m ago").
 */
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
