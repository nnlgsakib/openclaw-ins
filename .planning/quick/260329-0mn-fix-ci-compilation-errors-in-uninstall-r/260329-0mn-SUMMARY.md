# Quick Task 260329-0mn: Fix CI Compilation Errors in uninstall.rs

**Date:** 2026-03-28
**Commit:** c97b040

## Problem

CI failed on Linux with `cargo clippy --all-targets --all-features -- -D warnings`:

```
error[E0716]: temporary value dropped while borrowed
   --> src/commands/uninstall.rs:260:23
    |
260 |         let mut cmd = silent_cmd("pgrep").args(["-f", "openclaw"]);
    |                       ^^^^^^^^^^^^^^^^^^^                         - temporary value is freed at the end of this statement

error[E0716]: temporary value dropped while borrowed
   --> src/commands/uninstall.rs:264:31
    |
264 |                 let mut cmd = silent_cmd("pkill").args(["-f", "openclaw"]);
    |                               ^^^^^^^^^^^^^^^^^^^                         - temporary value is freed at the end of this statement
```

## Root Cause

The Linux-specific `#[cfg(target_os = "linux")]` block in `stop_native_process()` still had chained `silent_cmd().args()` calls. These were not caught locally because the Windows build doesn't compile the Linux `cfg` block.

## Fix

Split the chained calls into two statements:

```rust
// Before (broken on Linux):
let mut cmd = silent_cmd("pgrep").args(["-f", "openclaw"]);

// After (fixed):
let mut cmd = silent_cmd("pgrep");
cmd.args(["-f", "openclaw"]);
```

Applied to both `pgrep` (line 260) and `pkill` (line 264) calls.

## Verification

- `cargo clippy --all-targets --all-features -- -D warnings` → clean (0 errors, 0 warnings)
- `cargo test` → 23/23 passed
