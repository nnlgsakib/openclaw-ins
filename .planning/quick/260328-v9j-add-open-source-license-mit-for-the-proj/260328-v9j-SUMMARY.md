# Quick Task 260328-v9j: Add open-source license (MIT) — Summary

## What was done

Added the MIT license to ClawStation:

1. **Created `LICENSE`** — Standard MIT license text with 2026 copyright, "ClawStation Contributors" as holder.
2. **Updated `package.json`** — Added `"license": "MIT"` field.
3. **Updated `src-tauri/Cargo.toml`** — Added `license = "MIT"` to the `[package]` section.

## Why MIT

- The README already had a MIT license badge — this makes it official.
- MIT is maximally permissive, ideal for a community desktop tool.
- Standard for Tauri ecosystem projects.
- Compatible with all project dependencies (Tauri, React, bollard, etc.).

## Files changed

| File | Change |
|------|--------|
| `LICENSE` | Created (MIT license text) |
| `package.json` | Added `"license": "MIT"` |
| `src-tauri/Cargo.toml` | Added `license = "MIT"` |
