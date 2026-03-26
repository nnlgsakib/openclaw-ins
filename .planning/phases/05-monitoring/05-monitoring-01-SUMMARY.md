---
phase: 05-monitoring
plan: 01
subsystem: monitoring
tags: [tauri-commands, docker, bollard, reqwest, serde, openclaw-api]

requires:
  - phase: 02-docker-integration
    provides: Docker status detection and bollard API patterns
  - phase: 03-installation-engine
    provides: OpenClaw container lifecycle context
  - phase: 04-configuration-sandboxing
    provides: Sandbox container naming conventions and label patterns

provides:
  - 3 Tauri commands for OpenClaw monitoring (status, sessions, containers)
  - OpenClawStatus enum for container state matching
  - AgentSession type for OpenClaw API integration
  - SandboxContainer type for Docker sandbox inspection

affects: 05-monitoring-02 (frontend monitoring dashboard)

tech-stack:
  added: []
  patterns:
    - Duplicated connect_docker() helper per module (no cross-module coupling)
    - Graceful degradation: Docker unavailability returns empty/unknown, not errors
    - Tagged enum serialization via #[serde(tag = "state")]
    - reqwest with 5s timeout for external API calls

key-files:
  created:
    - src-tauri/src/commands/monitoring.rs - Monitoring types and 3 Tauri commands
  modified:
    - src-tauri/src/commands/mod.rs - Added pub mod monitoring
    - src-tauri/src/lib.rs - Registered 3 monitoring commands in invoke_handler

key-decisions:
  - "Duplicated connect_docker() helper in monitoring.rs to keep module self-contained (10 lines, avoids coupling with docker.rs)"
  - "Used tagged enum with #[serde(tag = 'state')] for OpenClawStatus so frontend can match on state variant"
  - "Agent sessions and sandbox containers return empty Vec on failure (not errors) — graceful degradation for optional data"

patterns-established:
  - "Monitoring pattern: Docker queries return empty/unknown on failure, never propagate errors to frontend"
  - "Module self-containment: Each command module duplicates connect_docker() rather than importing from docker.rs"

requirements-completed:
  - MON-01
  - MON-02
  - MON-04

duration: 3min
completed: 2026-03-26
---

# Phase 05 Plan 01: Monitoring Backend Summary

**3 Tauri commands for OpenClaw status, agent sessions, and sandbox container inspection — all gracefully handling Docker unavailability**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T03:56:52Z
- **Completed:** 2026-03-26T03:59:52Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Created `OpenClawStatus` enum with tagged serialization for frontend pattern matching
- Implemented `get_openclaw_status` — queries Docker for openclaw container state (Running/Stopped/Error/Unknown)
- Implemented `get_agent_sessions` — fetches from OpenClaw API at localhost:{port}/api/sessions with 5s timeout
- Implemented `get_sandbox_containers` — filters containers by name "openclaw-sandbox" or label openclaw.component=sandbox
- All commands gracefully degrade when Docker is unavailable (return empty/unknown, not crashes)

## Task Commits

1. **Task 1: Create monitoring types and OpenClaw status command** - `5c6c08a` (feat)

## Files Created/Modified
- `src-tauri/src/commands/monitoring.rs` - OpenClawStatus enum, AgentSession struct, SandboxContainer struct, 3 Tauri commands, duplicated connect_docker() helper
- `src-tauri/src/commands/mod.rs` - Added `pub mod monitoring`
- `src-tauri/src/lib.rs` - Registered get_openclaw_status, get_agent_sessions, get_sandbox_containers in invoke_handler

## Decisions Made
- Duplicated connect_docker() helper (10 lines) in monitoring.rs instead of importing from docker.rs — keeps modules self-contained
- OpenClawStatus uses tagged enum (`#[serde(tag = "state")]`) so frontend can match on variant
- Agent sessions and sandbox containers return empty Vec on failure, not errors — graceful degradation for optional monitoring data

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness
- Monitoring backend provides 3 commands that frontend can invoke via `invoke()`
- Ready for 05-monitoring-02: frontend monitoring dashboard that consumes these commands
- MON-03 (resource metrics) not covered — would need system info commands beyond current scope

---
*Phase: 05-monitoring*
*Completed: 2026-03-26*
