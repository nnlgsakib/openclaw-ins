---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: UX Polish & Channels
status: verifying
last_updated: "2026-03-26T15:41:42.924Z"
last_activity: 2026-03-26
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 9
  completed_plans: 9
---

# STATE: OpenClaw Desktop

## Project Reference

**Core Value:** Make OpenClaw installable and manageable by anyone — from download to daily use — without touching a terminal.
**Current Focus:** Phase 07 — installation-ux-animation-foundation
**Tech Stack:** Tauri v2 + React 19 + TypeScript + Tailwind v4 + shadcn/ui + bollard (Rust Docker client)

## Current Position

Phase: 08
Plan: Not started
Status: Gap closure plan executed, all verification gaps closed
Last activity: 2026-03-26

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases planned | 6 |
| Requirements mapped | 31/31 |
| Coverage | 100% |
| Plans completed | 9/9 |
| Phases completed | 0/6 |
| Phase 01-foundation P01 | 33min | 3 tasks | 40 files |
| Phase 01-foundation P03 | 23min | 3 tasks | 15 files |
| Phase 01-foundation P02 | 18min | 2 tasks | 17 files |
| Phase 02-docker-integration P01 | 8min | 2 tasks | 5 files |
| Phase 02-docker-integration P02 | 4min | 2 tasks | 4 files |
| Phase 03-installation-engine P01 | 8min | 2 tasks | 7 files |
| Phase 03-installation-engine P02 | 11min | 4 tasks | 15 files |
| Phase 03-installation-engine P03 | 8min | 2 tasks | 9 files |
| Phase 04-configuration-sandboxing P01 | 2min | 2 tasks | 4 files |
| Phase 04-configuration-sandboxing P02 | 8min | 2 tasks | 7 files |
| Phase 04-configuration-sandboxing P03 | 14min | 2 tasks | 7 files |
| Phase 05-monitoring P01 | 3min | 1 tasks | 3 files |
| Phase 05-monitoring P02 | 3min | 2 tasks | 3 files |
| Phase 05-monitoring P03 | 3min | 2 tasks | 4 files |
| Phase 06-lifecycle P03 | 3min | 2 tasks | 6 files |
| Phase 06-lifecycle P02 | 3min | 2 tasks | 7 files |
| Phase 06-lifecycle P01 | 3min | 2 tasks | 6 files |
| Phase 07-installation-ux-animation-foundation P04 | 1min | 1 tasks | 1 files |
| Phase 07 P05 | 4min | 1 tasks | 2 files |
| Phase 07-installation-ux-animation-foundation P03 | 5min | 1 tasks | 1 files |
| Phase 07-installation-ux-animation-foundation P01 | 5min | 2 tasks | 3 files |
| Phase 07-installation-ux-animation-foundation P06 | 0min | 3 tasks | 4 files |
| Phase 07-installation-ux-animation-foundation P02 | 8min | 3 tasks | 4 files |
| Phase 07-installation-ux-animation-foundation P07 | 1min | 1 tasks | 1 files |
| Phase 07-installation-ux-animation-foundation P07 | 1min | 1 tasks | 1 files |
| Phase 07-installation-ux-animation-foundation P08 | 2min | 1 tasks | 1 files |
| Phase 07-installation-ux-animation-foundation P09 | 5min | 2 tasks | 3 files |

## Accumulated Context

### Key Decisions

- Tauri v2 over Electron (smaller bundle, Rust security model)
- Docker-first sandboxing (OpenClaw's primary sandbox backend)
- Windows + Linux primary; macOS secondary
- bollard 0.20 for Docker API (async, cross-platform)
- React 19 + Zustand + TanStack Query for frontend state
- Upgraded scaffold Vite 7→8 + plugin-react v4→v6 for Rolldown bundler
- Removed tauri-plugin-opener, registered os/shell/store/notification plugins
- tauri-plugin-os frontend API directly (no custom Rust command wrapper)
- TanStack Query staleTime: Infinity for platform data (static at runtime)
- shadcn/ui new-york preset with CVA variants + Radix primitives
- Custom sidebar (NavLink + Tailwind) over shadcn sidebar component
- HashRouter over BrowserRouter for Tauri compatibility
- Tailwind CSS v4 via @tailwindcss/vite plugin (Rust-based engine, zero PostCSS)
- Toaster (sonner) at app root for ERR-01 error display
- AppState registered with Tauri via `app.manage(Mutex::new(AppState::default()))`
- Docker detection: platform dispatch via std::env::consts::OS (socket on Linux, HTTP on Windows)
- WSL2 backend detection via wsl -l -v subprocess parsing
- DockerStatus as flat struct (not enum): frontend needs all fields simultaneously
- Adaptive polling for Docker health: 30s when down, 5min when healthy
- useDockerInfo disabled by default (enabled: false) to avoid unnecessary API calls
- Switch component installed early (Phase 2) for sandbox toggle in Phase 4
- Error pattern matching: specific Docker patterns before generic "docker" fallback
- Shared Docker check module (docker/check.rs) for cross-command reuse
- SystemCheckResult flat struct with 8 fields (platform, docker, node, disk, RAM, port)
- sysinfo 0.33 crate for disk/RAM checks in system check command
- Onboarding state machine via Zustand: system_check → install → verify → ready → error
- Predefined system check thresholds: 2GB disk, 2GB RAM minimum
- Embedded docker-compose.yml template (env var substitution, no runtime generation)
- getrandom crate for gateway token generation (64 hex chars, auditable entropy)
- Simple semver comparison (major.minor.patch) without external crate
- Install method selector as dedicated step before install starts
- Non-fatal onboarding wizard errors in native install (interactive input may be required)
- Verification method as string parameter (simpler than shared managed state for single-use)
- Verification reuses install-progress event channel (no new event infrastructure)
- Gateway token read from .env at verification time (no secrets in frontend state)
- Sandbox setup gracefully degrades when backend command missing (informational toast, not error)
- OpenClawStatus as tagged enum (serde tag="state") for frontend pattern matching
- Monitoring commands return empty/unknown on failure (graceful degradation, not errors)
- Duplicated connect_docker() helper per command module (self-containment over shared code)
- Adaptive polling for monitoring: 15s when OpenClaw not running, 1min when running, 30s for sessions/containers
- useContainerLogs wired to get_container_logs backend (tail=200, 5s polling)
- Monitoring dashboard 4-card layout matching docker.tsx visual pattern
- get_container_logs returns empty string on Docker failure (graceful degradation, consistent with monitoring pattern)
- DownloadEvent discriminated union: capture contentLength from Started event, track chunkLength from Progress for percentage
- Animation utilities at src/lib/animation.ts (not utils/ dir) — centralized timing/spring presets, CSS transition helper
- motion v12.38.0 as Framer Motion package (modern import path: motion/react) — gesture props (whileHover/whileTap/whileFocus) for Button micro-interactions
- Docker log streaming via Tauri events (docker-log-output channel) — real-time terminal display replacing fake progress
- Auto-scroll pause threshold: 200px from bottom — standard terminal UX for reading historical output
- AnimatePresence at router level (mode='wait') wrapping Routes with motion.div keyed by location.pathname — single point of control for all page transitions
- Docker layer progress events via dedicated Tauri channel (docker-layer-progress) — per-layer ID tracking with update-or-add semantics
- DockerLogEvent struct separate from DockerLayerProgressEvent — raw text log output vs structured per-layer progress
- springPresets.stable for button micro-interactions (400/30), springPresets.gentle for progress bars (200/20) — centralized animation presets from @/lib/animation

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

**Last action:** Completed 07-09-PLAN.md (5min, 2 tasks, 3 files) — Gap closure: Docker log streaming + animation.ts wiring
**Next action:** Phase 07 fully complete (9/9 plans). Ready for Phase 08 (channel-management) or milestone completion review.
**Files to review:** `.planning/phases/07-installation-ux-animation-foundation/07-09-SUMMARY.md`
