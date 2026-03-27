---
phase: quick
plan: 260327-bde
type: execute
wave: 1
depends_on: []
files_modified:
  - src-tauri/src/install/docker_install.rs
autonomous: true
requirements: []
---

## Optimize OpenClaw repo clone to use shallow clone

### Objective

Reduce Docker installation time and disk usage by using `--depth 1` for the OpenClaw repo clone. Shallow clones fetch only the latest snapshot (~5-10MB) instead of full history (~500MB). The existing `git pull --ff-only` update path remains compatible — shallow clones can fetch and fast-forward normally.

### Context

The git clone happens at `docker_install.rs:138-144`. The current clone command:
```rust
let output = tokio::process::Command::new("git")
    .args([
        "clone",
        "--progress",
        OPENCLAW_REPO,
        repo_dir.to_str().unwrap(),
    ])
```

The update path at line 114-127 (`git pull --ff-only`) works on shallow clones without modification.

### Tasks

#### Task 1: Add `--depth 1` to git clone command

**File:** `src-tauri/src/install/docker_install.rs`

**Action:** Add `"--depth", "1"` to the `git clone` args array at line 138-144. Insert after `"clone"` and before `"--progress"`.

Change:
```rust
.args([
    "clone",
    "--progress",
    OPENCLAW_REPO,
    repo_dir.to_str().unwrap(),
])
```
To:
```rust
.args([
    "clone",
    "--depth", "1",
    "--progress",
    OPENCLAW_REPO,
    repo_dir.to_str().unwrap(),
])
```

**Verify:** `cargo check -p openclaw-desktop` passes with no errors.

**Done:** Clone command includes `--depth 1`; update path (`git pull --ff-only`) unchanged and remains compatible with shallow clones.
