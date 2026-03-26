---
id: 260326-vkw
date: 2026-03-26
status: complete
---

# Quick Task 260326-vkw: Change Docker installation from image pull to git clone — Summary

## Changes

### 1. src-tauri/src/install/docker_install.rs

**Removed:**
- Bollard image pull stream (`create_image` + layer progress tracking)
- Embedded `generate_compose_yaml()` function
- `OPENCLAW_IMAGE` constant
- `writing_compose` progress step

**Added:**
- `OPENCLAW_REPO` constant (`https://github.com/openclaw/openclaw.git`)
- `emit_log()` / `emit_log_lines()` helpers for clean log output
- Git clone with `--progress` flag (streams to stderr, emitted as log events)
- Git pull fallback when `~/.openclaw/repo/.env` already exists
- `.env` written to `~/.openclaw/repo/.env` (alongside repo's compose file)
- `docker compose up --build -d` runs from repo directory via `current_dir`

**New flow:** Check Docker → Create dirs → Clone repo → Write .env → `docker compose up --build -d` → Verify

### 2. src/components/install/step-install.tsx

Updated `INSTALL_STEPS` to reflect new flow:
- "Pull Image" → "Clone Repo"
- "Write Config" removed
- "Generate Token" → "Configure"
- "Start Gateway" → "Build & Start"

## Result

Docker installation now clones the full OpenClaw repository to `~/.openclaw/repo`, uses the repo's own `docker-compose.yml`, and builds from source. This gives users the latest code and matches upstream conventions.
