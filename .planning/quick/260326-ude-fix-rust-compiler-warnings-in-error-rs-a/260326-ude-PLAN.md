---
id: 260326-ude
mode: quick
date: 2026-03-26
status: complete
---

# Quick Task 260326-ude: Fix Rust compiler warnings

## Problem

`cargo build` produces 3 warnings:
1. `error.rs:1` — unused import `Deserialize`
2. `native_install.rs:3` — unused import `verify_native_install`
3. `error.rs` — 4 `AppError` variants never constructed (`DockerNotInstalled`, `WslBackendNotReady`, `InsufficientDiskSpace`, `PortInUse`)

## Tasks

### Task 1: Fix error.rs warnings

**Files:** `src-tauri/src/error.rs`

**Action:** Remove unused `Deserialize` import. Add `#[allow(dead_code)]` to `AppError` enum — variants are defined for future phases.

**Verify:** `cargo build` — no warnings

### Task 2: Fix native_install.rs warning

**Files:** `src-tauri/src/install/native_install.rs`

**Action:** Remove unused `verify_native_install` import.

**Verify:** `cargo build` — no warnings

## must_haves

- truths: `cargo build` completes with zero warnings
- artifacts: error.rs, native_install.rs
