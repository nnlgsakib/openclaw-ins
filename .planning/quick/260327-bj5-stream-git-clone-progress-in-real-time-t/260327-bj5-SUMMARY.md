---
phase: quick
plan: 260327-bj5
subsystem: install
tags: [git, streaming, ux, real-time, docker-install]
dependency_graph:
  requires: [emit_log, AppError::InstallationFailed]
  provides: [real-time-git-stderr-streaming]
  affects: [docker_install, DockerLogViewer]
tech_stack:
  added:
    - tokio::io::{AsyncBufReadExt, BufReader} — line-by-line async reading
    - std::process::Stdio — pipe child process streams
  patterns:
    - spawn + BufReader lines loop — async process with real-time output
key_files:
  modified:
    - src-tauri/src/install/docker_install.rs
decisions: []
metrics:
  completed: "2026-03-27T02:21:19Z"
  duration: ~2min
  tasks_completed: 1
  files_modified: 1
---

# Phase quick Plan 260327-bj5: Stream Git Clone Progress in Real-Time Summary

## One-Liner

Replaced buffered `.output().await` with `.spawn()` + `BufReader` line-by-line stderr streaming for both `git clone --progress` and `git pull`, so the frontend log viewer shows progress lines as they're emitted rather than all at once after completion.

## What Was Done

### Task 1: Replace git clone and git pull with spawn + line-by-line stderr streaming

**Changes to `src-tauri/src/install/docker_install.rs`:**

1. **Added imports** (lines 7-8):
   - `use std::process::Stdio;`
   - `use tokio::io::{AsyncBufReadExt, BufReader};`

2. **Git pull block** (lines 116-142): Replaced `.output().await` with `.spawn()` pattern:
   - Pipes stdout and stderr via `Stdio::piped()`
   - Reads stderr line-by-line with `BufReader::lines()` and emits each via `emit_log()`
   - Waits for process completion, emits warning message on non-zero exit

3. **Git clone block** (lines 153-191): Same `.spawn()` pattern:
   - Pipes stdout and stderr via `Stdio::piped()`
   - Streams stderr lines (where `git --progress` outputs) in real-time via `emit_log()`
   - Returns `AppError::InstallationFailed` on non-zero exit status
   - Emits "Repository cloned successfully." on success

**Verification:** `cargo check` passes (1 warning for now-unused `emit_log_lines` helper — retained for potential future use).

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] File `src-tauri/src/install/docker_install.rs` exists and contains new imports
- [x] Git pull block uses `.spawn()` with `Stdio::piped()` and `BufReader`
- [x] Git clone block uses `.spawn()` with `Stdio::piped()` and `BufReader`
- [x] `cargo check` passes with no errors
- [x] Commit `64a98de` exists on branch
