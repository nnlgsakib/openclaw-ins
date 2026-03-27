# Quick Task 260327-cpt: Fix git safe.directory warning on non-NTFS filesystems

## Task 1: Add git safe.directory before git operations

**Files:** `src-tauri/src/install/docker_install.rs`
**Action:** Add `git config --global --add safe.directory <repo_dir>` before `git pull` on existing repos and after `git clone` on fresh clones
**Verify:** cargo check passes
**Done:** git pull no longer fails with "dubious ownership" on non-NTFS filesystems
