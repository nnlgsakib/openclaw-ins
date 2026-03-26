---
id: 260326-ugw
mode: quick
date: 2026-03-26
status: complete
---

# Quick Task 260326-ugw: Fix installation state not persisting across page navigation

## Problem

When a user starts an installation, navigates to another page, and returns to `/install`, the UI shows the idle "Start Installation" button instead of the install log viewer. The backend installation is still running in the background, emitting `install-progress` events that no listener receives.

**Root cause:** TanStack Query mutation state (`isPending`, `isSuccess`, `isError`) is component-local — it resets when `StepInstall` unmounts. The Zustand store has no `isInstalling` flag to persist this state across navigation.

## Tasks

### Task 1: Add `isInstalling` to Zustand store

**Files:** `src/stores/use-onboarding-store.ts`

**Action:** Add `isInstalling: boolean` field to the onboarding state. Add `setIsInstalling` setter. Clear `isInstalling` in `transitionToVerify`, `transitionToError`, `retryInstallation`, and `reset`.

### Task 2: Use store flag in StepInstall

**Files:** `src/components/install/step-install.tsx`

**Action:** Read `isInstalling` from the onboarding store. Set it to `true` when `mutate()` is called, `false` on success/error callbacks. Compute `isInstalling = isPending || storeIsInstalling` so the log view shows when re-mounting mid-install.

## must_haves

- truths: Navigating away during install and back shows the log viewer, not the idle button
- truths: TypeScript and Rust compile cleanly
- artifacts: use-onboarding-store.ts, step-install.tsx
