---
phase: 18-docker-sandbox-integration
plan: 03
subsystem: install
tags: [sandbox, docker, install, progress-streaming]
dependencies:
  requires: [18-01, 18-02]
  provides: [sandbox-install-config, sandbox-setup-in-install]
  affects: [install-flow, frontend-wizard]
tech_stack:
  added: []
  patterns: [graceful-degradation, progress-streaming, child-process-streaming]
key_files:
  created: []
  modified:
    - src-tauri/src/install/mod.rs
    - src-tauri/src/commands/install.rs
    - src-tauri/src/install/docker_install.rs
decisions:
  - "SandboxInstallConfig defined in install/mod.rs to avoid circular imports between commands/install.rs and install/docker_install.rs"
  - "Graceful degradation: sandbox setup failure emits warning progress event, does not abort installation"
  - "Image existence check via docker image inspect before attempting build to prevent redundant builds"
  - "stream_command_output helper reuses DockerLogEvent for consistent event format across channels"
metrics:
  duration: ~8min
  tasks_completed: 1
  tasks_total: 1
  files_modified: 3
  lines_added: 220
  completed_date: "2026-03-31"
---

# Phase 18 Plan 03: Integrate Sandbox Setup Scripts in Installation Summary

**One-liner:** Sandbox Docker image auto-built during OpenClaw installation with real-time progress streaming and graceful degradation on failure.

## What Was Built

### 1. SandboxInstallConfig struct (install/mod.rs)
New configuration struct with 5 fields for passing sandbox settings from the frontend wizard:
- `mode`: "off", "non-main", "all"
- `backend`: "docker", "ssh", "openshell"
- `docker_image`: optional image name (default: "openclaw-sandbox:bookworm-slim")
- `docker_network`: optional network mode
- `docker_binds`: optional bind mounts

### 2. InstallRequest sandbox_config field (commands/install.rs)
Added `sandbox_config: Option<SandboxInstallConfig>` to `InstallRequest` struct. Field is optional for backwards compatibility — frontend can omit it when sandbox is disabled. Passed through to `docker_install`.

### 3. Sandbox setup step in docker_install (install/docker_install.rs)
New Step 7 added after gateway verification (Step 6):
1. Check if sandbox mode != "off" and backend == "docker"
2. Check if Docker image already exists via `docker image inspect`
3. If not found, try `scripts/sandbox-setup.sh` in the OpenClaw repo
4. If no script, fall back to `docker build -t <image> -f Dockerfile.sandbox .`
5. Stream build output via `sandbox-setup-progress` event channel
6. On any failure: emit warning progress event, continue (do not return Err)

### 4. stream_command_output helper
New async helper that reads stdout and stderr from a spawned child process concurrently, emitting each line as a `DockerLogEvent` to a configurable Tauri event channel.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- [x] `cargo check` passes with no errors
- [x] All 17 install-related tests pass (including new sandbox_config deserialization test)
- [x] InstallRequest accepts sandbox_config field from frontend JSON
- [x] docker_install calls sandbox setup when sandbox is Docker-enabled
- [x] Sandbox setup failure emits warning progress event, does not return Err
- [x] Image existence checked via `docker image inspect` before attempting build

## Self-Check: PASSED

All files exist, commit `e0794b3` verified, tests pass.
