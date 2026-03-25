---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to execute
last_updated: "2026-03-25T06:46:29.724Z"
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 3
  completed_plans: 1
---

# STATE: OpenClaw Desktop

## Project Reference

**Core Value:** Make OpenClaw installable and manageable by anyone — from download to daily use — without touching a terminal.
**Current Focus:** Phase 01 — Foundation
**Tech Stack:** Tauri v2 + React 19 + TypeScript + Tailwind v4 + shadcn/ui + bollard (Rust Docker client)

## Current Position

Phase: 01 (Foundation) — EXECUTING
Plan: 2 of 3

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases planned | 6 |
| Requirements mapped | 31/31 |
| Coverage | 100% |
| Plans completed | 1/3 |
| Phases completed | 0/6 |
| Phase 01-foundation P01 | 33min | 3 tasks | 40 files |

## Accumulated Context

### Key Decisions

- Tauri v2 over Electron (smaller bundle, Rust security model)
- Docker-first sandboxing (OpenClaw's primary sandbox backend)
- Windows + Linux primary; macOS secondary
- bollard 0.20 for Docker API (async, cross-platform)
- React 19 + Zustand + TanStack Query for frontend state
- Upgraded scaffold Vite 7→8 + plugin-react v4→v6 for Rolldown bundler
- Removed tauri-plugin-opener, registered os/shell/store/notification plugins

### Critical Pitfalls (from research)

1. Docker Desktop instability on Windows (WSL2 networking, kernel updates)
2. Tauri shell plugin RCE vector (pin >= 2.2.1, never use shell:allow-open)
3. Silent installer failures (always verify post-install)
4. YAML config dangers (schema validate before write)
5. PATH/environment pollution (use absolute paths)

### Open Items

- OpenClaw config schema needs validation against actual binary output (Phase 4)
- OpenClaw binary update mechanism unclear (npm? GitHub releases?) — resolve during Phase 6
- macOS support not specifically tested — consider adding to Phase 2 platform detection if needed

## Session Continuity

**Last action:** Completed 01-foundation-01-PLAN.md (33min, 3 tasks, 40 files)
**Next action:** Execute 01-foundation-02-PLAN.md (error infrastructure)
**Files to review:** `.planning/phases/01-foundation/01-02-PLAN.md`
