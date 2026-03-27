---
phase: quick
plan: 260327-bde
subsystem: docker-install
tags: [performance, git, optimization]
tech-stack:
  added: []
  patterns: [shallow clone for repo downloads]
key-files:
  modified:
    - src-tauri/src/install/docker_install.rs
decisions: []
metrics:
  duration: 2min
  completed: 2026-03-27T08:13+06:00
  tasks_completed: 1/1
  files_modified: 1
---

# Quick Task 260327-bde: Optimize OpenClaw repo clone to use shallow clone

## One-liner

Added `--depth 1` to git clone to reduce Docker install download from ~500MB (full history) to ~5-10MB (latest snapshot only).

## Task Summary

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add `--depth 1` to git clone command in docker_install.rs | 59caa7a |

## Changes

- `src-tauri/src/install/docker_install.rs` — Inserted `"--depth", "1"` args into the `git clone` command at line 140-141.

## Verification

- `cargo check` passed with no errors (1.20s compilation)

## Update Compatibility

The existing update path (`git pull --ff-only` at line 114-127) remains fully compatible with shallow clones — git can fetch and fast-forward on `--depth 1` clones without modification.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] File exists: `src-tauri/src/install/docker_install.rs`
- [x] Commit exists: 59caa7a
- [x] `cargo check` passed
