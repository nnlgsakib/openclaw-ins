# PLAN: Sandbox Image Pre-Pull & Native Sandbox Backend

**ID:** 260331-sip
**Date:** 2026-03-31
**Task:** Add native/local sandbox backend option and sandbox image pre-pull UI in setup wizard

## Context

Current sandbox backends in wizard: `docker | ssh | openshell`. The user wants:
1. A new `native`/`local` backend option for running agents directly on host (no Docker)
2. A "Get Image" button in the wizard sandbox step that checks and pre-pulls the Docker sandbox image with real-time progress, blocking navigation until complete

Key files:
- `src/stores/use-wizard-store.ts` — SandboxBackend type, getGeneratedConfig()
- `src/components/wizard/sandbox-step.tsx` — Wizard sandbox UI
- `src-tauri/src/commands/docker.rs` — Docker commands
- `src-tauri/src/commands/config.rs` — Config validation (valid_backends: docker, ssh, openshell)
- `src-tauri/src/lib.rs` — Command registration

## Tasks

### Task 1: Add native/local sandbox backend

**Files:** `src/stores/use-wizard-store.ts`, `src/components/wizard/sandbox-step.tsx`, `src/components/config/sandbox-section.tsx`, `src-tauri/src/commands/config.rs`

**Actions:**
- Add `"native"` to `SandboxBackend` type union (line 40 of use-wizard-store.ts)
- Add card to `SANDBOX_BACKENDS` array: value `"native"`, label `"Local"`, description `"Run agents directly on host — no Docker required. Less isolation but simpler setup."`
- Add `{ value: "native", label: "Local" }` to `BACKEND_OPTIONS` in sandbox-section.tsx
- In `getGeneratedConfig()` (line 674): when `sandboxBackend === "native"`, set `sandboxConfig.backend = "native"` with no Docker/SSH sub-config
- In config.rs validation (line 152): add `"native"` to `valid_backends` array

**Verify:** `npx tsc --noEmit` passes, wizard shows 4 backend cards, config validates "native"

---

### Task 2: Add check_sandbox_image + pull_sandbox_image Tauri commands

**Files:** `src-tauri/src/commands/docker.rs`, `src-tauri/src/lib.rs`

**Actions:**
- Add `check_sandbox_image(image: String)` command: runs `docker image inspect {image}`, returns `{ exists: bool }`. Returns `{ exists: false }` if Docker unavailable (graceful).
- Add `pull_sandbox_image(image: String, app_handle: AppHandle)` command: runs `docker pull {image}`, streams output lines via Tauri event channel `"sandbox-pull-progress"` using `DockerLogEvent` struct pattern. Returns `Result<(), AppError>`.
- Register both in lib.rs invoke handler

**Verify:** `cargo check` passes

---

### Task 3: Add Get Image button with pull progress to sandbox step

**Files:** `src/components/wizard/sandbox-step.tsx`

**Actions:**
- Add state: `imageStatus` (unknown/checking/available/missing), `pullLogs` (string[]), `isPulling` (boolean)
- When `sandboxBackend === "docker"`: auto-invoke `check_sandbox_image` with `dockerImage` on mount/backend change
- Show inline status: "Checking image..." → "Image available" (green check) or "Image not found" (yellow warning)
- If missing: show "Get Sandbox Image" button with download icon
- On click: invoke `pull_sandbox_image`, listen to `"sandbox-pull-progress"` events, show terminal-style log panel (`bg-black text-green-100 font-mono pre-wrap`)
- Block wizard Next/Back while pulling (add `wizardLocked` to wizard store or use local state passed up)
- On completion: update imageStatus to "available", show green check, re-enable navigation
- On error: show toast, allow retry

**Verify:** Docker backend selected → auto-check runs → if missing, Get Image button visible → click starts pull with live output → Next disabled until done → success shows green check

## Verification

1. Select "Local" backend → config has `backend: "native"`, no Docker fields
2. Select "Docker" backend → image auto-checked → status shown
3. Missing image → Get Image button → pull with progress → blocked nav → success
4. `cargo check` + `npx tsc --noEmit` pass
5. Config validation accepts "native" backend
