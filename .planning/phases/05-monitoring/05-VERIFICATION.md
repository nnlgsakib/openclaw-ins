---
phase: 05-monitoring
verified: 2026-03-26T05:00:00Z
status: gaps_found
score: 3/4 must-haves verified (truths); 7/7 artifacts verified; 5/5 key links verified
gaps:
  - truth: "User can see container logs streamed from OpenClaw sandbox containers"
    status: partial
    reason: "MON-03 requires streamed activity logs. LogViewer UI section exists and is wired, but useContainerLogs returns hardcoded empty string ('TODO: invoke when backend supports it'). No get_container_logs backend command exists. Users see 'Waiting for log streaming backend...' placeholder instead of real log output."
    artifacts:
      - path: "src/hooks/use-monitoring.ts"
        issue: "useContainerLogs queryFn returns empty string — no backend command to invoke"
      - path: "src/pages/monitor.tsx"
        issue: "Activity Logs card shows static placeholder text instead of streaming log data"
      - path: "src-tauri/src/commands/monitoring.rs"
        issue: "No get_container_logs command implemented"
    missing:
      - "Backend: get_container_logs Tauri command that streams Docker container logs via bollard"
      - "Frontend: Wire useContainerLogs to invoke get_container_logs when backend exists"
      - "Frontend: Render actual log lines in LogViewer instead of placeholder text"
human_verification:
  - test: "Open Monitor page in running app"
    expected: "Status card shows Running/Stopped/Error with correct badge colors. Sessions card lists active agents. Sandbox card shows containers. Logs card shows streaming output or appropriate empty state."
    why_human: "Visual layout, badge colors, and real-time polling behavior cannot be verified programmatically without running the Tauri app"
  - test: "Verify auto-refresh behavior"
    expected: "Status polls every 15s when not running, 1min when running. Sessions/containers poll every 30s. Refresh button spins during load and invalidates all queries."
    why_human: "Polling intervals and animation timing require runtime observation"
---

# Phase 05: Monitoring Verification Report

**Phase Goal:** User can see what OpenClaw is doing in real-time from the desktop app.
**Verified:** 2026-03-26T05:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | App can check whether OpenClaw is running by querying Docker containers | ✓ VERIFIED | `get_openclaw_status` in monitoring.rs:47-94 — connects via bollard, filters by name "openclaw", maps container state to OpenClawStatus enum (Running/Stopped/Error/Unknown) |
| 2 | App can retrieve active agent sessions from OpenClaw API | ✓ VERIFIED | `get_agent_sessions` in monitoring.rs:100-125 — calls get_openclaw_status internally, reqwest GET to localhost:{port}/api/sessions with 5s timeout, returns empty Vec on failure |
| 3 | User can see sandbox container status (running/stopped) with container names | ✓ VERIFIED | `get_sandbox_containers` in monitoring.rs:132-191 — lists all Docker containers, filters by name "openclaw-sandbox" or label openclaw.component=sandbox |
| 4 | User can see container logs streamed from OpenClaw sandbox containers | ✗ PARTIAL | LogViewer UI card exists in monitor.tsx:207-239 but shows "Waiting for log streaming backend..." placeholder. `useContainerLogs` returns hardcoded empty string (use-monitoring.ts:99). No `get_container_logs` backend command exists. |

**Score:** 3/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src-tauri/src/commands/monitoring.rs` | Types + 3 Tauri commands | ✓ VERIFIED | 280 lines. OpenClawStatus enum, AgentSession struct, SandboxContainer struct, get_openclaw_status, get_agent_sessions, get_sandbox_containers commands, connect_docker helper. |
| `src-tauri/src/commands/mod.rs` | `pub mod monitoring` | ✓ VERIFIED | Line 4: `pub mod monitoring;` |
| `src-tauri/src/lib.rs` | 3 commands in invoke_handler | ✓ VERIFIED | Lines 32-34: all 3 monitoring commands registered |
| `src/hooks/use-monitoring.ts` | 4 TanStack Query hooks | ✓ VERIFIED | 106 lines. Exports: useOpenClawStatus, useAgentSessions, useSandboxContainers, useContainerLogs. Adaptive polling intervals. TypeScript types match Rust structs. |
| `src/pages/monitor.tsx` | Full monitoring dashboard | ✓ VERIFIED | 430 lines. 4 card sections (Status, Sessions, Logs, Sandbox). StatusBadge/SessionStatusBadge/ContainerStateBadge components. Refresh button with spin animation. Routes at /monitor. |
| `src/lib/errors.ts` | Monitoring error entries | ✓ VERIFIED | openclaw_not_running (line 55) and api_unavailable (line 59) entries. Pattern matching for "openclaw...not running" and "openclaw...api" (lines 126-127). |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| monitoring.rs | bollard Docker API | connect_docker() + ListContainersOptions | ✓ WIRED | bollard::container::ListContainersOptions imported (line 1), used in get_openclaw_status and get_sandbox_containers |
| monitoring.rs | OpenClaw HTTP API | reqwest GET to localhost:{port}/api/sessions | ✓ WIRED | reqwest::Client with 5s timeout (lines 108-114), GET to /api/sessions (line 116) |
| use-monitoring.ts | Tauri monitoring commands | invoke() calls | ✓ WIRED | invoke("get_openclaw_status") line 48, invoke("get_agent_sessions") line 67, invoke("get_sandbox_containers") line 83 |
| monitor.tsx | use-monitoring.ts | useOpenClawStatus/useAgentSessions/useSandboxContainers | ✓ WIRED | Lines 31-34: all 3 hooks called, data rendered in respective card sections |
| monitor.tsx | shadcn Card/Badge/Alert | Card, Badge, Alert, Button imports | ✓ WIRED | Lines 7-15: all UI components imported and used throughout the 4 card sections |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| monitor.tsx (Status) | `status` | useOpenClawStatus → invoke("get_openclaw_status") → Docker query | Yes — queries real Docker containers | ✓ FLOWING |
| monitor.tsx (Sessions) | `sessions` | useAgentSessions → invoke("get_agent_sessions") → reqwest to OpenClaw API | Yes — fetches from live API | ✓ FLOWING |
| monitor.tsx (Containers) | `containers` | useSandboxContainers → invoke("get_sandbox_containers") → Docker query | Yes — queries real Docker containers | ✓ FLOWING |
| monitor.tsx (Logs) | hardcoded placeholder | useContainerLogs → returns "" | No — static placeholder | ✗ HOLLOW_PROP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| MON-01 | 05-monitoring-01, 05-monitoring-02 | User can see OpenClaw running status (running/stopped/error) | ✓ SATISFIED | get_openclaw_status command + Monitor page StatusCard with green/yellow/red badges for all 4 states |
| MON-02 | 05-monitoring-01, 05-monitoring-02 | User can see active agent sessions | ✓ SATISFIED | get_agent_sessions command + Monitor page SessionCard with session name, model, status badge, relative time |
| MON-03 | 05-monitoring-02 | User can view agent activity logs (streamed) | ✗ BLOCKED | Activity Logs card exists but shows placeholder "Waiting for log streaming backend...". No backend command. useContainerLogs returns empty string. |
| MON-04 | 05-monitoring-01, 05-monitoring-02 | User can see sandbox container status | ✓ SATISFIED | get_sandbox_containers command + Monitor page SandboxCard with container name, image, state badge, status text |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `src/hooks/use-monitoring.ts` | 99 | TODO comment in useContainerLogs | ⚠️ Warning | Known placeholder — logs not implemented |
| `src/pages/monitor.tsx` | 226 | "Log streaming coming soon" hardcoded text | ⚠️ Warning | User-facing placeholder for unimplemented MON-03 |

No blocker anti-patterns found. The two warnings are the same issue: MON-03 log streaming is not yet implemented. This is an explicitly deferred feature (plan states "Placeholder until get_container_logs backend command exists"), not an oversight.

### Human Verification Required

#### 1. Visual Layout and Badge Rendering

**Test:** Open Monitor page in running app at /monitor
**Expected:** 4 card sections render with correct layout. Status badge shows green "Running" with CheckCircle2 icon when OpenClaw is running, yellow "Stopped" with AlertTriangle when stopped, red "Error" with XCircle when error, gray "Unknown" with HelpCircle. Session badges show green for "active", gray for "idle", red for "error". Container badges show green for "running", red for "exited"/"dead", yellow for "paused".
**Why human:** Badge colors, icon rendering, and card layout require visual inspection in a running Tauri app.

#### 2. Auto-Refresh Behavior

**Test:** Observe Monitor page for 2 minutes without interaction
**Expected:** Status data refreshes every 15s when not running (or 1min when running). Sessions and containers refresh every 30s. Refresh button shows spinning animation during load. Clicking Refresh immediately invalidates and refetches all queries.
**Why human:** Polling intervals and animation timing require runtime observation over time.

### Gaps Summary

**1 gap found blocking full goal achievement:**

**MON-03 (Activity Logs)** is partially implemented. The frontend infrastructure exists — the LogViewer card section, the `useContainerLogs` hook signature, and the adaptive 5s polling interval are all wired and ready. However, the backend `get_container_logs` command was not implemented, so `useContainerLogs` returns a hardcoded empty string. Users see a "Live" badge and "Waiting for log streaming backend..." placeholder text instead of actual container log output.

**What's needed to close this gap:**
1. **Backend:** Implement `get_container_logs` Tauri command in monitoring.rs using bollard's container log streaming API
2. **Frontend:** Wire `useContainerLogs` to `invoke("get_container_logs", { containerId })` instead of returning ""
3. **Frontend:** Render actual log lines in the LogViewer monospace area instead of the placeholder

**Assessment:** This is a known deferral, not a bug. The plan explicitly states "useContainerLogs is a placeholder" and "Log streaming coming soon". The remaining 3 of 4 requirements (MON-01, MON-02, MON-04) are fully satisfied with real data flowing end-to-end. The phase goal "User can see what OpenClaw is doing in real-time" is **mostly achieved** — status, sessions, and sandbox containers are live. Logs require a follow-up backend task.

---

_Verified: 2026-03-26T05:00:00Z_
_Verifier: gsd-verifier (phase 05)_
