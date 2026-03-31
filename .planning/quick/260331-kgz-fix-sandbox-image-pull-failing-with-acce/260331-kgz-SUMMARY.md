---
phase: quick
plan: 260331-kgz
subsystem: docker-sandbox
tags: [docker, sandbox, build, error-handling]
key-files:
  created:
    - src/lib/tauri-errors.ts
  modified:
    - src-tauri/src/commands/docker.rs
    - src/components/wizard/sandbox-step.tsx
tech-stack:
  - Rust (docker build instead of docker pull)
  - React (error message extraction)
decisions: []
---

# Quick Task 260331-kgz: Fix Sandbox Image Pull Failing With Access Denied

## One-liner

Changed sandbox image acquisition from `docker pull` (fails — image doesn't exist on Docker Hub) to `docker build` (builds locally from Dockerfile.sandbox), and fixed error display showing `[object Object]`.

## Root Cause

1. **`docker pull openclaw-sandbox:bookworm-slim` fails** — This image is locally-built, not on Docker Hub. The `pull_sandbox_image` command was using `docker pull` which fails with "access denied".
2. **Error displayed as `[object Object]`** — Tauri serializes `AppError` as a JSON object (`{installationFailed: {reason, suggestion}}`). The frontend's `String(err)` produced `[object Object]` instead of the actual message.

## What Was Done

### 1. Rust Backend (`docker.rs`)

- Rewrote `pull_sandbox_image` to build the image locally instead of pulling:
  1. Check for `scripts/sandbox-setup.sh` in `~/.openclaw/repo/` → run it
  2. Otherwise check for `Dockerfile.sandbox` → `docker build -t openclaw-sandbox:bookworm-slim`
  3. Otherwise create `Dockerfile.sandbox` inline (node:20-slim base) → build
- Extracted `run_build_command` helper with concurrent stdout/stderr reading
- Returns proper error with suggestion if repo directory doesn't exist

### 2. Frontend Error Utility (`tauri-errors.ts`)

- Created `extractTauriErrorMessage(err)` that properly extracts messages from Tauri's serialized error objects
- Handles `{variantName: {reason, message, suggestion}}` structure

### 3. UI Text (`sandbox-step.tsx`)

- Updated from "Pull" to "Build" terminology throughout
- Error card now shows actual error message instead of `[object Object]`

## Commits

| Hash | Message |
|------|---------|
| `95ac416` | `fix(quick-260331-kgz): build sandbox image locally instead of pulling from registry` |

## Self-Check: PASSED

- [x] `cargo check` passes
- [x] `npx tsc --noEmit` passes
- [x] Image builds locally via `docker build` not `docker pull`
- [x] Error messages display correctly (not `[object Object]`)
