---
phase: quick
plan: 260327-cpt
subsystem: installation
tags: [git, windows, filesystem, safe-directory]
tech-stack: [rust, tokio, git]
key-files:
  - src-tauri/src/install/docker_install.rs
---

# Quick Task 260327-cpt: Fix git safe.directory warning

## One-liner
Added `git config --global --add safe.directory <repo_dir>` before git pull and after git clone to fix "dubious ownership" errors on non-NTFS Windows filesystems.

## Changes

### `src-tauri/src/install/docker_install.rs`

- Before `git pull` on existing repos (line ~118): added safe.directory config command
- After successful `git clone` (line ~195): added safe.directory config command
- Both use `.ok()` to silently handle cases where git config fails (non-critical)

## Why this happens
Git refuses to operate on repos where file ownership can't be verified (non-NTFS drives, external drives, network shares). The `safe.directory` config tells git to trust specific directories regardless of ownership metadata.

## Self-Check: PASSED
- [x] cargo check passes
- [x] safe.directory added before git pull
- [x] safe.directory added after git clone
