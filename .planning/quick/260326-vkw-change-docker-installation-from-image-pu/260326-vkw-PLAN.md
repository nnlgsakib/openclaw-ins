---
id: 260326-vkw
mode: quick
date: 2026-03-26
status: complete
---

# Quick Task 260326-vkw: Change Docker installation from image pull to git clone + docker compose

## Problem

The Docker installation flow was pulling a pre-built image (`ghcr.io/openclaw/openclaw:latest`) via bollard, then generating an embedded `docker-compose.yml`. The user wants to clone the OpenClaw source repository and use its own `docker-compose.yml` instead.

## Design

**Repo URL:** `https://github.com/openclaw/openclaw.git`
**Clone location:** `~/.openclaw/repo`
**Compose approach:** Use the repo's own `docker-compose.yml` directly (run `docker compose up --build -d` from the repo directory)

## New Installation Flow

1. Check Docker availability
2. Create `~/.openclaw`, `~/.openclaw/workspace`, `~/.openclaw/repo` directories
3. Clone repo (or `git pull` if already exists)
4. Write `.env` file with gateway token and config paths
5. Run `docker compose up --build -d` from repo directory
6. Verify gateway health

## Tasks

### Task 1: Rewrite docker_install.rs

**Files:** `src-tauri/src/install/docker_install.rs`

**Changes:**
- Removed bollard image pull stream (create_image + layer progress events)
- Removed embedded `generate_compose_yaml()` function
- Removed `OPENCLAW_IMAGE` constant
- Added `OPENCLAW_REPO` constant
- Added `emit_log()` and `emit_log_lines()` helpers
- New flow: `git clone --progress` (or `git pull` if repo exists)
- Write `.env` to `~/.openclaw/repo/.env`
- Run `docker compose up --build -d` with `current_dir` set to repo

### Task 2: Update INSTALL_STEPS in step-install.tsx

**Files:** `src/components/install/step-install.tsx`

**Changes:**
- Updated step labels: "Clone Repo", "Configure", "Build & Start" (was "Pull Image", "Write Config", "Generate Token", "Start Gateway")

## must_haves

- truths: TypeScript and Rust compile cleanly
- truths: Docker install clones repo to ~/.openclaw/repo
- truths: Uses repo's docker-compose.yml, not embedded template
- artifacts: docker_install.rs, step-install.tsx
