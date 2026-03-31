---
phase: quick
plan: 260331-jpt
subsystem: docker-sandbox
tags: [docker, sandbox, ux, error-handling]
key-files:
  modified:
    - src-tauri/src/commands/docker.rs
    - src/components/wizard/sandbox-step.tsx
tech-stack:
  - Rust (Tauri command error handling)
  - React (state management, mutation callbacks)
decisions: []
---

# Quick Task 260331-jpt: Fix Sandbox Image Pull Button Not Staying in Loading State

## One-liner

Fixed sandbox image pull button resetting to clickable state immediately after click instead of staying in loading state until the docker pull completes or fails.

## Root Cause

1. **Rust `pull_sandbox_image` returned `Ok(false)` on failure** — TanStack Query mutation treated this as success, so the UI immediately reset to the "Get Sandbox Image" button state.
2. **stderr not captured from docker pull** — If docker wrote errors to stderr, the buffer could fill and deadlock the process, or error details were silently lost.
3. **Frontend used mutation's `isPending` directly** — This resets as soon as the mutation resolves (success or error), giving no persistent loading state.

## What Was Done

### 1. Rust Backend (`docker.rs`)

- Changed `pull_sandbox_image` to return `Err(AppError::InstallationFailed{...})` on failure instead of `Ok(false)`
- Captured stderr concurrently with stdout using `tokio::join!` to prevent buffer deadlock
- Collected stderr lines and included them in the error message for actionable feedback
- Both stdout and stderr lines are emitted as `sandbox-pull-output` events for the log viewer

### 2. Frontend (`sandbox-step.tsx`)

- Added local `pulling` state that persists across the mutation lifecycle (not tied to `isPending`)
- Added `pullError` state to track and display failure messages
- Added error display card with "Pull Failed" title, error message, and "Retry" link
- Used mutation's `onSuccess`/`onError` callbacks to manage local state transitions
- Button stays disabled with spinner until pull actually completes or fails

## Commits

| Hash | Message |
|------|---------|
| `b187853` | `fix(quick-260331-jpt): sandbox image pull button stays in loading state during pull` |

## Self-Check: PASSED

- [x] `cargo check` passes (no Rust compilation errors)
- [x] `npx tsc --noEmit` passes (no TypeScript errors)
- [x] Button stays in loading state during docker pull
- [x] Error message and retry button shown on failure
- [x] Stderr captured concurrently to prevent deadlock
