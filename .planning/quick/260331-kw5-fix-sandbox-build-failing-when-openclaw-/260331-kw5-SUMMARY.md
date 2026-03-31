---
phase: quick
plan: 260331-kw5
subsystem: docker-sandbox
tags: [docker, sandbox, build, offline]
key-files:
  modified:
    - src-tauri/src/commands/docker.rs
tech-stack:
  - Rust (docker build with fallback)
decisions: []
---

# Quick Task 260331-kw5: Fix Sandbox Build Failing When OpenClaw Repo Doesn't Exist

## One-liner

When `~/.openclaw/repo` doesn't exist (user hasn't run Docker install yet), sandbox image build now creates a temporary Dockerfile in `~/.openclaw/.sandbox-build/` and builds from there instead of failing.

## Root Cause

Previous fix required `~/.openclaw/repo` to exist and returned an error if it didn't. But users can configure sandbox settings before completing the Docker installation, so the repo may not exist yet.

## What Was Done

Restructured `pull_sandbox_image` to use early returns with fallback:
1. If repo exists + `sandbox-setup.sh` → run it
2. If repo exists + `Dockerfile.sandbox` → build from it
3. Otherwise → create `~/.openclaw/.sandbox-build/Dockerfile.sandbox` and build from temp dir

No error is thrown when the repo is missing — the image just builds from the inline Dockerfile.

## Commits

| Hash | Message |
|------|---------|
| `43b15f5` | `fix(quick-260331-kw5): sandbox build works without openclaw repo - uses temp Dockerfile` |

## Self-Check: PASSED

- [x] `cargo check` passes
- [x] Build works with and without repo directory
