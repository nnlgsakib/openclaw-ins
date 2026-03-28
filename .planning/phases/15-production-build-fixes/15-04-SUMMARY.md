# Plan 15-04: PATH Augmentation for Production Builds

**Date:** 2026-03-28
**Commit:** e3fdba6

## Problem

In production builds (launched from Windows Explorer), the app couldn't find `openclaw`, `pnpm`, `yarn`, or `npm` global binaries. Dev mode worked because the terminal session has the full PATH.

User's error:
```
The configured global bin directory "D:\soft\nvm\pnpm-global" is not in PATH
pnpm failed with exit code 1
yarn reported success but openclaw not found
```

## Root Cause

Production builds inherit minimal PATH from Windows Explorer, missing:
- `%APPDATA%\npm` (npm global bin)
- `%LOCALAPPDATA%\pnpm` (pnpm global bin)
- Custom nvm locations (e.g., `D:\soft\nvm`)
- `NVM_HOME` / `NVM_SYMLINK` env vars

## Fix (3 parts)

### 1. Enhanced PATH augmentation (`silent.rs`)
- Added `NVM_HOME` and `NVM_SYMLINK` env var support
- Added `%LOCALAPPDATA%\Yarn\bin` (Yarn v1 global)
- Added scanning of common non-standard nvm locations (`D:\soft\nvm`, `E:\tools\nvm`, etc.)

### 2. Filesystem fallback (`nodejs.rs`)
- Added `find_openclaw_binary()` — searches common install paths directly
- Updated `check_openclaw()` to use filesystem fallback after PATH attempts
- Scans `NVM_HOME` and non-standard nvm paths for `openclaw.cmd`

### 3. Gateway and version detection fixes
- **gateway.rs**: Removed `pnpm exec openclaw` attempt (fails with `ERR_PNPM_RECURSIVE_EXEC_NO_PACKAGE`). Now uses direct `openclaw` first, then `npx`, then filesystem search.
- **update.rs**: Added `find_openclaw_binary()` fallback to `detect_install_method()`
- **native_install.rs**: Added triple fallback (direct → npx → filesystem) to `get_openclaw_version()`

## Files Changed

| File | Change |
|------|--------|
| `commands/silent.rs` | Enhanced `nodejs_path_env()` with NVM_HOME, Yarn, custom nvm scanning |
| `commands/nodejs.rs` | Added `find_openclaw_binary()`, updated `check_openclaw()` fallback |
| `commands/gateway.rs` | Removed pnpm exec, added filesystem fallback |
| `commands/update.rs` | Added `find_openclaw_binary()` fallback to version detection |
| `install/native_install.rs` | Added triple fallback to `get_openclaw_version()` |

## Verification

- `cargo clippy --all-targets --all-features -- -D warnings` → clean
- `cargo test` → 28/28 passed (up from 23)
