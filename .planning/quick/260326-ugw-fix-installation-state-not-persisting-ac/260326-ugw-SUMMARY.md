---
id: 260326-ugw
date: 2026-03-26
status: complete
---

# Quick Task 260326-ugw: Fix installation state not persisting across page navigation — Summary

## Problem

TanStack Query mutation state (`isPending`, `isSuccess`, `isError`) is component-local and resets when `StepInstall` unmounts. When navigating away during installation and back, the component re-mounts with idle mutation state, showing the "Start Installation" button even though the backend is still installing.

## Changes

### 1. src/stores/use-onboarding-store.ts
- Added `isInstalling: boolean` field to `OnboardingState` interface and `initialState`
- Added `setIsInstalling` setter method
- Cleared `isInstalling: false` in `transitionToVerify`, `transitionToError`, `retryInstallation` transitions

### 2. src/components/install/step-install.tsx
- Read `isInstalling` (as `storeIsInstalling`) and `setIsInstalling` from onboarding store
- Set `isInstalling: true` when mutation starts (`mutate()` called)
- Set `isInstalling: false` in `onSuccess` and `onError` callbacks
- Computed `isInstalling = isPending || storeIsInstalling` — if either the mutation is in-flight OR the store says we're installing, show the log viewer

## Result

Navigating away during installation and back now correctly shows the install log viewer instead of the idle button. The event listener re-attaches on re-mount and picks up live progress events.
