---
phase: quick
plan: 260331-n9g
subsystem: error-handling
tags: [errors, tauri, settings, update]
key-files:
  modified:
    - src/lib/errors.ts
tech-stack:
  - TypeScript (error extraction)
decisions: []
---

# Quick Task 260331-n9g: Fix Settings Page Update Buttons Crashing With Unexpected Error

## One-liner

Fixed `formatError()` to properly extract messages from Tauri's serialized Rust error format, instead of always falling back to the generic "Something went wrong" / "An unexpected error occurred" message.

## Root Cause

When Rust returns `Err(AppError::InstallationFailed{reason, suggestion})`, Tauri serializes it as `{installationFailed: {reason: "...", suggestion: "..."}}`. The `formatError()` function had no handling for this single-key variant object format — it fell through all checks and returned `errorMessages.unknown`.

This affected all Tauri command errors across the app, including:
- OpenClaw Update button (check_openclaw_update, update_openclaw)
- App Update button (check from tauri-plugin-updater)
- Uninstall button
- Any other command that returns Err(AppError)

## What Was Done

Added `extractTauriErrorFields()` helper that:
1. Checks if the error object has exactly one key (the variant name)
2. Extracts `reason`, `message`, or `suggestion` from the inner fields
3. Runs `matchErrorPattern()` on the extracted message for better UX (e.g., maps "docker daemon not running" to the specific Docker error message)
4. Returns null if the format doesn't match, so other handlers still work

## Commits

| Hash | Message |
|------|---------|
| `15f4462` | `fix: formatError now handles Tauri serialized Rust errors instead of showing generic message` |

## Self-Check: PASSED

- [x] `npx tsc --noEmit` passes
- [x] Tauri error format `{variantName: {fields}}` is properly unwrapped
- [x] Known error patterns still matched via `matchErrorPattern()`
