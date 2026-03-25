# STATE: OpenClaw Desktop

## Project Reference

**Core Value:** Make OpenClaw installable and manageable by anyone — from download to daily use — without touching a terminal.
**Current Focus:** Roadmap approved, ready for Phase 1 planning
**Tech Stack:** Tauri v2 + React 19 + TypeScript + Tailwind v4 + shadcn/ui + bollard (Rust Docker client)

## Current Position

**Phase:** 0 (Roadmap complete)
**Plan:** None
**Status:** Awaiting `/gsd-plan-phase 1`
**Progress:**
```
[ ] Phase 1: Foundation — not started
[ ] Phase 2: Docker Integration — not started
[ ] Phase 3: Installation Engine — not started
[ ] Phase 4: Configuration & Sandboxing — not started
[ ] Phase 5: Monitoring — not started
[ ] Phase 6: Lifecycle — not started
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases planned | 6 |
| Requirements mapped | 31/31 |
| Coverage | 100% |
| Plans completed | 0/6 |
| Phases completed | 0/6 |

## Accumulated Context

### Key Decisions
- Tauri v2 over Electron (smaller bundle, Rust security model)
- Docker-first sandboxing (OpenClaw's primary sandbox backend)
- Windows + Linux primary; macOS secondary
- bollard 0.20 for Docker API (async, cross-platform)
- React 19 + Zustand + TanStack Query for frontend state

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

**Last action:** Roadmap created (2026-03-25)
**Next action:** `/gsd-plan-phase 1` to plan Foundation phase
**Files to review:** `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`
