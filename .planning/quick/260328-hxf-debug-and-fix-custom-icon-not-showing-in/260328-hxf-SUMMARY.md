# Quick Task 260328-hxf: Fix Icon Not Showing in Dev Mode — Summary

**Date:** 2026-03-28
**Status:** Complete

## Problem
Custom icon (generated via `pnpm tauri icon`) was not showing in Tauri dev mode, only in bundled builds.

## Root Cause
The `tauri.conf.json` only had icons in `bundle.icon` (used for final installers) but was missing:
1. `app.icon` — top-level app icon config
2. `app.windows[0].icon` — per-window icon for dev mode

## Fix
Added both fields to `tauri.conf.json`:
- `app.icon`: `["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"]`
- `app.windows[0].icon`: `"icons/128x128.png"`

Also cleaned Tauri debug build cache to force icon refresh.

## Files Modified
- `src-tauri/tauri.conf.json` — Added `app.icon` and `app.windows[0].icon` fields

## How to Verify
Run `pnpm tauri dev` — the window should now show the custom ClawStation icon in the title bar and taskbar.
