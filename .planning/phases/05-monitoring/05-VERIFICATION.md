---
phase: 05-monitoring
verified: 2026-03-26T06:00:00Z
status: passed
score: 4/4 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 3/4
  gaps_closed:
    - "User can see container logs streamed from OpenClaw sandbox containers (MON-03)"
  gaps_remaining: []
  regressions: []
---

# Phase 05: Monitoring Verification Report

**Phase Goal:** User can see what OpenClaw is doing in real-time from the desktop app.
**Verified:** 2026-03-26T06:00:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plan 03)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | App can check whether OpenClaw is running by querying Docker containers | ✓ VERIFIED | `get_openclaw_status` in monitoring.rs:47-94 — connects via bollard, filters by name "openclaw", maps container state to OpenClawStatus enum (Running/Stopped/Error/Unknown) |
| 2 | App can retrieve active agent sessions from OpenClaw API | ✓ VERIFIED | `get_agent_sessions` in monitoring.rs:100-125 — calls get_openclaw_status internally, reqwest GET to localhost:{port}/api/sessions with 5s timeout, returns empty Vec on failure |
| 3 | User can see sandbox container status (running/stopped) with container names | ✓ VERIFIED | `get_sandbox_containers` in monitoring.rs:132-191 — lists all Docker containers, filters by name "openclaw-sandbox" or label openclaw.component=sandbox |
| 4 | User can see container logs streamed from OpenClaw sandbox containers | ✓ VERIFIED | `get_container_logs` in monitoring.rs:193-228 — bollard LogsOptions streaming with stdout+stderr, tail parameter, graceful empty-string on failure. useContainerLogs hook wired to invoke (use-monitoring.ts:99). Activity Logs card renders split log lines in monospace area (monitor.tsx:236-248). Placeholder text fully removed. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src-tauri/src/commands/monitoring.rs` | Types + 4 Tauri commands | ✓ VERIFIED | 317 lines. OpenClawStatus enum, AgentSession struct, SandboxContainer struct, get_openclaw_status, get_agent_sessions, get_sandbox_containers, **get_container_logs** commands. |
| `src-tauri/src/commands/mod.rs` | `pub mod monitoring` | ✓ VERIFIED | Line 4: `pub mod monitoring;` |
| `src-tauri/src/lib.rs` | 4 commands in invoke_handler | ✓ VERIFIED | Lines 32-35: all 4 monitoring commands registered, including `get_container_logs` at line 35 |
| `src/hooks/use-monitoring.ts` | 4 TanStack Query hooks | ✓ VERIFIED | 108 lines. Exports: useOpenClawStatus, useAgentSessions, useSandboxContainers, useContainerLogs. **useContainerLogs invokes `get_container_logs` with containerId + tail:200** (lines 99-102). No placeholder/TODO remains. |
| `src/pages/monitor.tsx` | Full monitoring dashboard | ✓ VERIFIED | 447 lines. 4 card sections (Status, Sessions, **Logs with real rendering**, Sandbox). **Activity Logs card renders `containerLogs.split("\n")` as monospace rows** (lines 237-241). Loader2 spinner during load (line 233). Empty state for stopped/not-yet-produced logs (lines 244-246). |
| `src/lib/errors.ts` | Monitoring error entries | ✓ VERIFIED | openclaw_not_running (line 55) and api_unavailable (line 59) entries. Pattern matching for "openclaw...not running" and "openclaw...api" (lines 126-127). |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| monitoring.rs | bollard Docker API | connect_docker() + ListContainersOptions | ✓ WIRED | bollard::container::ListContainersOptions imported (line 1), used in get_openclaw_status and get_sandbox_containers |
| monitoring.rs | bollard Logs API | LogsOptions + futures_util StreamExt | ✓ WIRED | **LogsOptions imported (line 1), used in get_container_logs (line 207). futures_util::StreamExt for async stream collection (line 217).** |
| monitoring.rs | OpenClaw HTTP API | reqwest GET to localhost:{port}/api/sessions | ✓ WIRED | reqwest::Client with 5s timeout (lines 108-114), GET to /api/sessions (line 116) |
| use-monitoring.ts | Tauri monitoring commands | invoke() calls | ✓ WIRED | invoke("get_openclaw_status") line 48, invoke("get_agent_sessions") line 67, invoke("get_sandbox_containers") line 83, **invoke("get_container_logs") line 99** |
| monitor.tsx | use-monitoring.ts | useOpenClawStatus/useAgentSessions/useSandboxContainers/useContainerLogs | ✓ WIRED | Lines 33-44: all 4 hooks called. **useContainerLogs called with containers[0].id and isRunning** (lines 41-44). |
| monitor.tsx | shadcn Card/Badge/Alert | Card, Badge, Alert, Button imports | ✓ WIRED | Lines 7-16: all UI components imported and used throughout the 4 card sections. **Loader2 imported from lucide-react** (line 27). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| monitor.tsx (Status) | `status` | useOpenClawStatus → invoke("get_openclaw_status") → Docker query | Yes — queries real Docker containers | ✓ FLOWING |
| monitor.tsx (Sessions) | `sessions` | useAgentSessions → invoke("get_agent_sessions") → reqwest to OpenClaw API | Yes — fetches from live API | ✓ FLOWING |
| monitor.tsx (Containers) | `containers` | useSandboxContainers → invoke("get_sandbox_containers") → Docker query | Yes — queries real Docker containers | ✓ FLOWING |
| monitor.tsx (Logs) | `containerLogs` | useContainerLogs → invoke("get_container_logs") → bollard docker.logs() | **Yes — streams real Docker container logs via LogsOptions** | **✓ FLOWING** |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| TypeScript compiles cleanly | `npx tsc --noEmit` | No errors | ✓ PASS |
| Placeholder text removed | `grep "Waiting for log streaming backend" src/` | No matches | ✓ PASS |
| Placeholder text removed | `grep "Log streaming coming soon" src/` | No matches | ✓ PASS |
| futures-util dependency present | `grep futures-util src-tauri/Cargo.toml` | `futures-util = "0.3"` at line 35 | ✓ PASS |
| No TODO/placeholder in useContainerLogs | `grep "TODO.*invoke\|placeholder\|coming soon" src/hooks/use-monitoring.ts` | No matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| MON-01 | 05-monitoring-01, 05-monitoring-02 | User can see OpenClaw running status (running/stopped/error) | ✓ SATISFIED | get_openclaw_status command + Monitor page StatusCard with green/yellow/red badges for all 4 states |
| MON-02 | 05-monitoring-01, 05-monitoring-02 | User can see active agent sessions | ✓ SATISFIED | get_agent_sessions command + Monitor page SessionCard with session name, model, status badge, relative time |
| MON-03 | 05-monitoring-02, **05-monitoring-03** | User can view agent activity logs (streamed) | **✓ SATISFIED** | **get_container_logs command (monitoring.rs:193-228) using bollard LogsOptions streaming. useContainerLogs hook invokes backend (use-monitoring.ts:99). Activity Logs card renders log lines as monospace rows (monitor.tsx:237-241). Placeholder fully removed.** |
| MON-04 | 05-monitoring-01, 05-monitoring-02 | User can see sandbox container status | ✓ SATISFIED | get_sandbox_containers command + Monitor page SandboxCard with container name, image, state badge, status text |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |

No anti-patterns found. Previous warnings (TODO placeholder, hardcoded "Log streaming coming soon") have been resolved by plan 03.

### Human Verification Required

#### 1. Visual Layout and Badge Rendering

**Test:** Open Monitor page in running app at /monitor
**Expected:** 4 card sections render with correct layout. Status badge shows green "Running" with CheckCircle2 icon when OpenClaw is running, yellow "Stopped" with AlertTriangle when stopped, red "Error" with XCircle when error, gray "Unknown" with HelpCircle. Session badges show green for "active", gray for "idle", red for "error". Container badges show green for "running", red for "exited"/"dead", yellow for "paused". **Activity Logs card shows "Live" green badge with Loader2 spinner during fetch, real log lines in monospace scroll area, or "No log output yet..." italic empty state.**
**Why human:** Badge colors, icon rendering, and card layout require visual inspection in a running Tauri app.

#### 2. Auto-Refresh Behavior

**Test:** Observe Monitor page for 2 minutes without interaction
**Expected:** Status data refreshes every 15s when not running (or 1min when running). Sessions and containers refresh every 30s. **Container logs refresh every 5s when running.** Refresh button shows spinning animation during load. Clicking Refresh immediately invalidates and refetches all queries.
**Why human:** Polling intervals and animation timing require runtime observation over time.

### Gaps Summary

**No gaps found.** All 4 must-haves verified. All 4 requirements (MON-01 through MON-04) satisfied.

The previous gap — MON-03 Activity Logs showing placeholder text with no backend — has been fully closed by plan 05-monitoring-03:

1. **Backend:** `get_container_logs` Tauri command implemented using bollard `LogsOptions` with `futures_util::StreamExt` for async stream collection. Accepts `container_id` and optional `tail` (default 100). Returns log output as string. Graceful degradation: returns empty string on Docker failure.

2. **Frontend hook:** `useContainerLogs` now calls `invoke("get_container_logs", { containerId, tail: 200 })` instead of returning hardcoded empty string. Polls every 5s for near-real-time updates.

3. **Frontend UI:** Activity Logs card renders `containerLogs.split("\n")` as individual monospace `<p>` elements with `whitespace-pre-wrap`. Shows Loader2 spinner during fetch, "No log output yet..." italic empty state when container has no logs, and "No logs available — OpenClaw is not running." when stopped.

4. **Cleanup:** All placeholder text removed — no "Waiting for log streaming backend...", no "Log streaming coming soon", no TODO comments related to logs.

---

_Verified: 2026-03-26T06:00:00Z_
_Verifier: gsd-verifier (phase 05 re-verification)_
