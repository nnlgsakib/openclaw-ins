---
phase: 06-lifecycle
plan: "01"
subsystem: lifecycle
tags: [update, tauri, docker, bollard, tanstack-query, settings]

requires:
  - phase: 03-installation-engine
    provides: Docker and native install flows, progress event infrastructure
  - phase: 05-monitoring
    provides: TanStack Query hook patterns, graceful degradation pattern
provides:
  - OpenClaw version check command (Docker + native)
  - One-click update command with progress streaming
  - TanStack Query hooks for update check and execution
  - Settings page with OpenClaw Update card
affects:
  - Settings page (update card + existing sections)

tech-stack:
  added: []
  patterns:
    - Duplicated connect_docker() helper per command module (self-containment)
    - Graceful degradation: return unknown/false when OpenClaw not installed
    - TanStack Query useQuery for version check, useMutation for update
    - Progress events via emit_progress on install-progress channel

key-files:
  created:
    - src-tauri/src/commands/update.rs - Tauri commands for version check and update
    - src/hooks/use-update.ts - TanStack Query hooks for update check and execution
  modified:
    - src-tauri/src/commands/mod.rs - Added pub mod update
    - src-tauri/src/lib.rs - Registered check_openclaw_update and update_openclaw
    - src/pages/settings.tsx - OpenClaw Update card with version info and buttons
    - src/lib/errors.ts - update_failed and version_check_failed error patterns

key-decisions:
  - "Docker always reports updateAvailable=true (pulling latest ensures image freshness)"
  - "Native update uses npm install -g openclaw@latest (npm-based distribution assumed)"
  - "Progress events reuse install-progress channel (no new event infrastructure needed)"
  - "Graceful degradation: check returns unknown/false when OpenClaw not installed"

patterns-established:
  - "Update module: self-contained with duplicated connect_docker() helper"
  - "TanStack Query pattern: useQuery for version check (staleTime: 5min), useMutation for update"
  - "Progress streaming: emit_progress during Docker pull, compose up, and native install"

requirements-completed:
  - LIFE-01

duration: 3min
completed: 2026-03-26
---

# Phase 06 Plan 01: OpenClaw One-Click Update Summary

**OpenClaw version check and one-click update with Rust backend commands, TanStack Query hooks, and settings page UI supporting both Docker and native install methods**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T04:58:43Z
- **Completed:** 2026-03-26T05:08:48Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Rust backend with `check_openclaw_update` (Docker inspect + GitHub releases API) and `update_openclaw` (Docker pull/restart or npm update) commands
- Progress event streaming via `emit_progress` during Docker image pull, compose restart, and native binary download
- TanStack Query hooks: `useOpenClawUpdateCheck` (5min staleTime, no window focus refetch) and `useUpdateOpenClaw` (mutation)
- Settings page with OpenClaw Update card showing current/latest version, install method badge, update availability status, and action buttons
- Error patterns for update failures and version check failures in errors.ts

## Task Commits

1. **Task 1: Create OpenClaw update Rust backend** - `8d14015` (feat)
2. **Task 2: Create update frontend hook and settings page UI** - `d13eb6e` (feat)

## Files Created/Modified
- `src-tauri/src/commands/update.rs` - Tauri commands: check_openclaw_update, update_openclaw with Docker and native flows
- `src/hooks/use-update.ts` - TanStack Query hooks: useOpenClawUpdateCheck, useUpdateOpenClaw
- `src-tauri/src/commands/mod.rs` - Added pub mod update
- `src-tauri/src/lib.rs` - Registered update commands in invoke_handler
- `src/pages/settings.tsx` - OpenClaw Update card integrated with existing Desktop App Update and Danger Zone sections
- `src/lib/errors.ts` - update_failed and version_check_failed error entries with pattern matching

## Decisions Made
- Docker always reports updateAvailable=true (pulling latest ensures image freshness without digest comparison)
- Native update uses npm install -g openclaw@latest (assumes npm-based distribution; may need adjustment if OpenClaw switches to GitHub releases binary)
- Progress events reuse existing install-progress channel (no new event infrastructure needed)
- Graceful degradation: check returns unknown/false when OpenClaw not installed rather than erroring

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Update infrastructure complete, ready for remaining Phase 06 plans (06-lifecycle-02, 06-lifecycle-03)
- Settings page now has both OpenClaw Update and Desktop App Update cards

---
*Phase: 06-lifecycle*
*Completed: 2026-03-26*
