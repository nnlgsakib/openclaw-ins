---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: UX Polish & Channels
status: executing
last_updated: "2026-03-31T12:00:00.000Z"
last_activity: 2026-03-31
progress:
  total_phases: 11
  completed_phases: 7
  total_plans: 35
  completed_plans: 24
---

# STATE: ClawStation

## Project Reference

**Core Value:** Make OpenClaw installable and manageable by anyone — from download to daily use — without touching a terminal.
**Current Focus:** Phase 18 — docker-sandbox-integration
**Tech Stack:** Tauri v2 + React 19 + TypeScript + Tailwind v4 + shadcn/ui + bollard (Rust Docker client)

## Current Position

Phase: 18 (docker-sandbox-integration) — COMPLETE
Plan: 3 of 3
Status: All plans executed
Last activity: 2026-03-31

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
| Phase 14-github-workflows-ci-cd P01 | 3min | 2 tasks | 2 files |
| Phase 14-github-workflows-ci-cd P02 | 5min | 3 tasks | 4 files |
| Phase 16-openclaw-full-integration P04 | 5min | 2 tasks | 3 files |
| Phase 17-gateway-startup-ux-fix P01 | 8min | 3 tasks | 1 files |
| Phase 17-gateway-startup-ux-fix P02 | 4min | 4 tasks | 2 files |
| Phase 18-docker-sandbox-integration P01 | 8min | 2 tasks | 2 files |
| Phase 18-docker-sandbox-integration P02 | 5min | 1 tasks | 1 files |
| Phase 18-docker-sandbox-integration P03 | 8min | 1 tasks | 3 files |

## Accumulated Context

### Roadmap Evolution

- Phase 18 added: Docker Sandbox Integration (backend selection, sandbox setup scripts, wizard config generation)

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
- Sandbox setup in Docker install flow: image existence check via docker image inspect, graceful degradation on failure, progress via sandbox-setup-progress channel
- Auto-scroll pause threshold: 200px from bottom — standard terminal UX for reading historical output
- AnimatePresence at router level (mode='wait') wrapping Routes with motion.div keyed by location.pathname — single point of control for all page transitions
- Docker layer progress events via dedicated Tauri channel (docker-layer-progress) — per-layer ID tracking with update-or-add semantics
- DockerLogEvent struct separate from DockerLayerProgressEvent — raw text log output vs structured per-layer progress
- springPresets.stable for button micro-interactions (400/30), springPresets.gentle for progress bars (200/20) — centralized animation presets from @/lib/animation
- Channel data fetched from OpenClaw backend via Tauri commands (Phase 8)
- Channel status model: connected/disconnected/expired/connecting (Phase 8)
- Pairing modal as dialog (not separate route) with channel-specific components (Phase 9)
- WhatsApp QR polling every 5s for refresh detection (Phase 9)
- Telegram/Discord token validation: format check before API call (Phase 9)
- Contact states: approved/pending/blocked with inline action buttons (Phase 10)
- Activity feed: 30s polling, sender + channel icon + preview + timestamp (Phase 10)
- Tab system on channels page: Channels | Contacts | Activity (Phase 10)
- Separate release.yml from ci.yml (different triggers/permissions — Phase 14)
- Release concurrency cancel-in-progress: false (tags are intentional — Phase 14)
- Dependabot groups Tauri/React packages, minor/patch grouped (Phase 14)
- Windows ARM64 cross-compiled, no dedicated ARM runner (Phase 14)
- Unified CI: lint -> test -> build sequential jobs in single workflow (Phase 14)

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

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260326-uaf | Fix framer-motion TypeScript type errors in button.tsx and layer-progress.tsx | 2026-03-26 | f321473 | [260326-uaf-fix-framer-motion-typescript-type-errors](./quick/260326-uaf-fix-framer-motion-typescript-type-errors/) |
| 260326-ude | Fix Rust compiler warnings in error.rs and native_install.rs | 2026-03-26 | a334dc8 | [260326-ude-fix-rust-compiler-warnings-in-error-rs-a](./quick/260326-ude-fix-rust-compiler-warnings-in-error-rs-a/) |
| 260326-ugw | Fix installation state not persisting across page navigation | 2026-03-26 | 554bb96 | [260326-ugw-fix-installation-state-not-persisting-ac](./quick/260326-ugw-fix-installation-state-not-persisting-ac/) |
| 260326-v0s | Improve Docker installation UX - progress display and log viewer | 2026-03-26 | ebbc8ff | [260326-v0s-improve-docker-installation-ux-progress-](./quick/260326-v0s-improve-docker-installation-ux-progress-/) |
| 260326-vkw | Change Docker installation from image pull to git clone + docker compose | 2026-03-26 | 03cf9f7 | [260326-vkw-change-docker-installation-from-image-pu](./quick/260326-vkw-change-docker-installation-from-image-pu/) |
| 260326-w1f | Add install dir selection, clean install support, and cancel/pause installation | 2026-03-26 | c9c2948 | [260326-w1f-add-install-dir-selection-clean-install-](./quick/260326-w1f-add-install-dir-selection-clean-install-/) |
| 260327-bde | Optimize OpenClaw repo clone with --depth 1 shallow clone | 2026-03-27 | 59caa7a | [260327-bde-optimize-openclaw-repo-clone-to-skip-ful](./quick/260327-bde-optimize-openclaw-repo-clone-to-skip-ful/) |
| 260327-bj5 | Stream git clone/pull progress in real-time | 2026-03-27 | 64a98de | [260327-bj5-stream-git-clone-progress-in-real-time-t](./quick/260327-bj5-stream-git-clone-progress-in-real-time-t/) |
| 260327-bu3 | Fix Docker installation to use pre-built image and correct setup flow | 2026-03-27 | f838e0a | [260327-bu3-fix-docker-installation-read-openclaw-do](./quick/260327-bu3-fix-docker-installation-read-openclaw-do/) |
| 260327-cpt | Fix git safe.directory warning on non-NTFS filesystems | 2026-03-27 | a716946 | [260327-cpt-fix-git-safe-directory-warning-on-non-nt](./quick/260327-cpt-fix-git-safe-directory-warning-on-non-nt/) |
| 260328-hjx | Make README professional and accessible to all users | 2026-03-28 | f06c207 | [260328-hjx-make-the-readme-professional-as-the-most](./quick/260328-hjx-make-the-readme-professional-as-the-most/) |
| 260328-hqt | Replace default Tauri icons with custom app icon | 2026-03-28 | 493b734 | [260328-hqt-replace-default-tauri-icons-with-custom-](./quick/260328-hqt-replace-default-tauri-icons-with-custom-/) |
| 260328-hxf | Fix custom icon not showing in Tauri dev mode | 2026-03-28 | - | [260328-hxf-debug-and-fix-custom-icon-not-showing-in](./quick/260328-hxf-debug-and-fix-custom-icon-not-showing-in/) |
| 260328-k2m | Push ESLint setup to git | 2026-03-28 | 8edba36 | [260328-k2m-push-to-git](./quick/260328-k2m-push-to-git/) |
| 260328-k8h | Fix all ESLint errors and warnings | 2026-03-28 | - | [260328-k8h-fix-eslint-errors-and-warnings](./quick/260328-k8h-fix-eslint-errors-and-warnings/) |
| 260328-omt | Create a new tag and push it as a beta | 2026-03-28 | - | [260328-omt-create-a-new-tag-and-push-it-as-a-beta](./quick/260328-omt-create-a-new-tag-and-push-it-as-a-beta/) |
| 260328-ovi | Fix release.yml bash syntax error in checksum loop | 2026-03-28 | - | [260328-ovi-fix-release-yml-bash-syntax-error-in-che](./quick/260328-ovi-fix-release-yml-bash-syntax-error-in-che/) |
| 260328-p01 | Delete previous tags and push new beta tag | 2026-03-28 | - | [260328-p01-delete-previous-tags-and-push-new-beta-t](./quick/260328-p01-delete-previous-tags-and-push-new-beta-t/) |
| 260328-pfs | Rewrite release.yml professionally | 2026-03-28 | - | [260328-pfs-rewrite-release-yml-professionally-linux](./quick/260328-pfs-rewrite-release-yml-professionally-linux/) |
| 260328-v9j | Add open-source license (MIT) for the project | 2026-03-28 | - | [260328-v9j-add-open-source-license-mit-for-the-proj](./quick/260328-v9j-add-open-source-license-mit-for-the-proj/) |
| 260329-0fy | Format code, run clippy fix, resolve warnings, push, tag | 2026-03-28 | 63ea31a | [260329-0fy-format-code-run-clippy-fix-resolve-warni](./quick/260329-0fy-format-code-run-clippy-fix-resolve-warni/) |
| 260329-0mn | Fix CI compilation errors in uninstall.rs Linux-specific pgrep/pkill | 2026-03-28 | c97b040 | [260329-0mn-fix-ci-compilation-errors-in-uninstall-r](./quick/260329-0mn-fix-ci-compilation-errors-in-uninstall-r/) |
| 260329-1af | Fix release.yml to publish as latest release instead of pre-release | 2026-03-28 | c8e5612 | [260329-1af-fix-release-yml-to-publish-as-latest-rel](./quick/260329-1af-fix-release-yml-to-publish-as-latest-rel/) |
| 260329-kep | Push all Phase 16 changes - OpenClaw full integration | 2026-03-29 | ba2b0aa | [260329-kep-push-all-phase-16-changes](./quick/260329-kep-push-all-phase-16-changes/) |
| 260331-qcf | Run cargo fmt, clippy and fix things | 2026-03-31 | b6f7d51 | [260331-qcf-run-cargo-fmt-clippy-and-fix](./quick/260331-qcf-run-cargo-fmt-clippy-and-fix/) |
| 260331-g5h | Publish the current branch | 2026-03-31 | 2c3072f | [260331-g5h-publish-the-current-branch](./quick/260331-g5h-publish-the-current-branch/) |

## Session Continuity

**Last action:** 2026-03-31 - Published feature/phase-18-docker-sandbox branch to origin
**Next action:** Phase 18 complete (3/3 plans). Ready for Phase 12 Gateway Integration or Phase 15 Production Build Fixes
**Files to review:** `.planning/phases/18-docker-sandbox-integration/18-03-SUMMARY.md`
