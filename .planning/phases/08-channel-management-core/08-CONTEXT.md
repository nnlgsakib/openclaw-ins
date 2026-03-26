# Phase 8: Channel Management Core - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the channel management overview page — a new route at `/channels` showing all available messaging channels (WhatsApp, Telegram, Discord, Slack) with connection status badges, connect/disconnect actions, expired session detection, and sidebar navigation entry. This is the foundation for Phase 9 (pairing flows) and Phase 10 (access control).

</domain>

<decisions>
## Implementation Decisions

### Channel Data Source
- Channel data fetched from OpenClaw backend via Tauri commands calling OpenClaw's HTTP API
- Tauri command `get_channels` wraps OpenClaw API endpoint, returns channel list with status
- Follows existing monitoring pattern: Tauri command → reqwest HTTP → OpenClaw API

### Channel Status Model
- Four states: `connected`, `disconnected`, `expired`, `connecting`
- Status badges use shadcn/ui Badge component with color variants (green/gray/yellow/blue)
- `expired` state triggers reconnection prompt in the UI

### Channel Page Layout
- Card-based layout matching monitor.tsx pattern (Card + CardHeader + CardContent)
- One Card per channel type with status badge, last activity timestamp, and action button
- Skeleton loading during data fetch (per Phase 7 D-09 decision)
- Empty state when OpenClaw is not running: informative message with link to install

### Connect/Disconnect Actions
- Connect action navigates to pairing wizard (Phase 9 scope) — for now, shows placeholder toast
- Disconnect action calls `disconnect_channel` Tauri command with confirmation dialog
- Uses shadcn/ui AlertDialog for disconnect confirmation
- Button micro-interactions from Phase 7 (springPresets.stable)

### Session Expiration Detection
- Poll channel health via TanStack Query `refetchInterval` (30s when any channel expired, 1min when all healthy)
- `expired` status detected server-side by OpenClaw — frontend displays the status
- Toast notification (sonner) when session transitions from connected to expired

### Sidebar Integration
- New nav item: `{ to: "/channels", label: "Channels", icon: MessageSquare }` from lucide-react
- Positioned after "Install" and before "Configure" in sidebar order
- NavLink active state follows existing pattern

### the agent's Discretion
- Exact card layout details and spacing
- Specific error messages for connection failures
- Toast positioning and duration for expiration alerts
- Whether to group channels by type or show flat list

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useMonitoring` hook pattern: TanStack Query + Tauri invoke for data fetching with polling
- `Card`/`CardHeader`/`CardTitle`/`CardContent` from shadcn/ui for card layout
- `Badge` component from shadcn/ui for status indicators
- `AlertDialog` from shadcn/ui for disconnect confirmation
- `Skeleton` component for loading states (Phase 7)
- `useToast` (sonner) for notifications
- `Button` with micro-interactions (Phase 7 springPresets)

### Established Patterns
- Pages: Named exports, `<h1>` + `<p>` header pattern, `space-y-6` for layout
- Hooks: `use<Entity>()` naming, TanStack Query with query keys like `["channels"]`
- Tauri commands: `async fn` returning `Result<T, AppError>`, serde rename_all camelCase
- Backend: `connect_docker()` helper per module, `reqwest::Client` for OpenClaw API
- Error handling: `AppError` enum with suggestion field, graceful degradation on failure

### Integration Points
- Route: `src/router.tsx` — add `/channels` route
- Sidebar: `src/components/layout/sidebar-nav.tsx` — add Channels nav item
- Commands: `src-tauri/src/commands/mod.rs` — register channels module
- Command handler: `src-tauri/src/lib.rs` — add to generate_handler!
- Error messages: `src/lib/errors.ts` — add channel-specific error patterns

</code_context>

<specifics>
## Specific Ideas

- "Channel page should feel like the monitoring dashboard — cards with live status"
- "Users need to quickly see which channels are connected and which need attention"
- "Expired sessions should be obvious — don't let users miss reconnection needs"

</specifics>

<deferred>
## Deferred Ideas

- Channel-specific pairing wizards (QR, token entry) — Phase 9
- Contact management and access control — Phase 10
- Message activity feed — Phase 10
- Channel-specific configuration (notification settings, rate limits) — future phase
- Bulk connect/disconnect actions — future phase

</deferred>

---

*Phase: 08-channel-management-core*
*Context gathered: 2026-03-26*
