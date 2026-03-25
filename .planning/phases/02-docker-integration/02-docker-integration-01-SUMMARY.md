---
phase: 02-docker-integration
plan: "01"
subsystem: infra
tags: [docker, bollard, rust, tauri, detection]

requires:
  - phase: 01-foundation
    provides: AppError with DockerUnavailable variant, Tauri scaffold with platform detection, capabilities model

provides:
  - Docker backend foundation: types, detection logic, health check, and Tauri command interface
  - DockerStatus struct with platform-specific fields
  - DockerInfo struct for extended status
  - 3 Tauri commands: check_docker_health, get_docker_info, detect_docker
  - Platform-specific Docker detection (Linux socket, Windows HTTP/WSL2)
  - 4 Docker-specific AppError variants with user-facing suggestions

affects:
  - Future Docker installation, monitoring, and lifecycle management features
  - Frontend Docker page (docker.tsx)

tech-stack:
  added:
    - bollard 0.20 (Docker API client for Rust)
  patterns:
    - Tauri async commands with Result<T, AppError> return type
    - Platform-specific detection via std::env::consts::OS dispatch
    - bollard Docker::connect_with_socket_defaults (Linux) / connect_with_http_defaults (Windows)
    - WSL2 backend detection via wsl -l -v subprocess
    - Error suggestion messages with concrete fix instructions

key-files:
  created:
    - src-tauri/src/commands/docker.rs — Docker detection, health check, and info commands
  modified:
    - src-tauri/Cargo.toml — Added bollard 0.20 dependency
    - src-tauri/src/error.rs — Expanded AppError with 4 Docker-specific variants
    - src-tauri/src/commands/mod.rs — Added pub mod docker
    - src-tauri/src/lib.rs — Registered 3 docker commands in invoke_handler
    - src-tauri/capabilities/default.json — Added shell:allow-execute for which/where/wsl

key-decisions:
  - "bollard 0.20 for Docker API: async, type-safe, cross-platform (Unix sockets + Windows HTTP)"
  - "Platform dispatch via std::env::consts::OS: simple, compile-time known, no runtime abstraction needed"
  - "WSL2 detection via subprocess (wsl -l -v): only reliable way to check Docker Desktop WSL2 backend on Windows"
  - "DockerStatus as data struct, not enum: frontend needs all fields simultaneously for status display"
  - "detect_docker as alias for check_docker_health: semantic entry point for frontend convenience"

patterns-established:
  - "Docker detection pattern: try API connection first, fall back to binary check, then feature-specific detection"
  - "Platform-agnostic error messages: all errors include platform-specific fix suggestions"
  - "Async Tauri commands: use #[tauri::command] with async fn and Result<T, AppError>"

requirements-completed:
  - INST-03
  - ERR-03

# Metrics
duration: 8min
completed: 2026-03-25
---

# Phase 02 Plan 01: Docker Backend Foundation Summary

**Rust Docker backend with bollard 0.20: 3 Tauri commands for Docker detection, health checking, and extended info with platform-specific logic for Linux (unix socket) and Windows (HTTP + WSL2 detection)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-25T09:02:51Z
- **Completed:** 2026-03-25T09:10:52Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added bollard 0.20 Docker API client to Cargo.toml
- Expanded AppError with 4 Docker-specific variants (DockerNotInstalled, DockerDaemonNotRunning, DockerDesktopNotRunning, WslBackendNotReady) plus existing DockerUnavailable
- Defined DockerStatus and DockerInfo structs with serde camelCase serialization
- Implemented 3 Tauri commands: check_docker_health, get_docker_info, detect_docker
- Linux detection: socket check → connect → ping → version
- Windows detection: HTTP connect → binary check (where) → WSL2 backend detection (wsl -l -v)
- Registered all commands in lib.rs invoke_handler
- Configured shell execute permissions for which/where/wsl in capabilities

## Task Commits

1. **Task 1: Add Docker error variants, types, and bollard dependency** - `c9e6483` (feat)
2. **Task 2: Implement Docker detection, health check, and info commands** - `614fa6d` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src-tauri/Cargo.toml` — Added bollard = "0.20" dependency
- `src-tauri/src/error.rs` — Added DockerNotInstalled, DockerDaemonNotRunning, DockerDesktopNotRunning, WslBackendNotReady variants with suggestion fields
- `src-tauri/src/commands/docker.rs` — New file: DockerStatus/DockerInfo structs + 3 async Tauri commands with platform-specific detection
- `src-tauri/src/commands/mod.rs` — Added pub mod docker declaration
- `src-tauri/src/lib.rs` — Registered check_docker_health, get_docker_info, detect_docker in invoke_handler
- `src-tauri/capabilities/default.json` — Added shell:allow-execute for which/where/wsl commands

## Decisions Made
- bollard 0.20 chosen for Docker API: async, type-safe, cross-platform support (Unix sockets + Windows HTTP)
- Platform dispatch via std::env::consts::OS: simple runtime check, no abstraction layer needed
- WSL2 detection via subprocess (wsl -l -v parsing): only reliable way to check Docker Desktop WSL2 backend
- DockerStatus as flat struct with all fields: frontend needs complete status simultaneously for display
- detect_docker as semantic alias for check_docker_health: gives frontend a clean entry point

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `cargo check` fails due to missing system library `glib-2.0-dev` — this is a pre-existing environment issue (fails on clean master too), not caused by our changes. The Tauri v2 GTK backend requires system-level glib development headers. Need to install `libglib2.0-dev` and `pkg-config` on the build machine.

## Next Phase Readiness
- Docker backend foundation complete — all detection commands implemented and registered
- Ready for frontend integration: Docker page can invoke check_docker_health via TanStack Query
- Ready for subsequent Docker features: installation, container management, monitoring
- Next plan: 02-docker-integration-02 (Docker frontend UI or installation flow)

---

*Phase: 02-docker-integration*
*Completed: 2026-03-25*
