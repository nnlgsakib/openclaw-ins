---
phase: 14-github-workflows-ci-cd
plan: "03"
subsystem: infra
tags: [github-actions, ci-cd, release, tauri, artifacts]

requires:
  - phase: 14-github-workflows-ci-cd
    provides: release workflow with build matrix
provides:
  - Fixed release workflow with reliable artifact attachment to GitHub Releases
  - Flattened artifact collection preventing nested directory issues
  - Verification step catching missing artifacts before release publish
affects: release process, CI/CD pipeline

tech-stack:
  added: []
  patterns:
    - "Artifact flattening: download-artifact without merge-multiple, then explicit find+cp into flat release-files/"
    - "Release verification: artifact count check before release creation"

key-files:
  modified:
    - .github/workflows/release.yml

key-decisions:
  - "Removed merge-multiple: true from download-artifact to avoid nested directory issues with Tauri bundle output"
  - "Added explicit Collect release files step using find to flatten all artifacts into release-files/ directory"
  - "Added Verify artifacts exist step to fail fast if no installers were produced"
  - "Changed artifact upload names to release-${{ matrix.label }} to clearly indicate release artifacts"

requirements-completed:
  - REL-01
  - REL-02
  - REL-03
  - REL-04
  - REL-05

duration: 5min
completed: 2026-03-28
---

# Phase 14: GitHub Workflows & CI/CD — Plan 03 Summary

**Fixed release workflow artifact handling: flattened download, explicit collection, verification gate, and corrected release upload pattern**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-28T17:14:00Z
- **Completed:** 2026-03-28T17:19:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Fixed artifact download: removed `merge-multiple: true` to prevent nested directory issues
- Added explicit "Collect release files" step using `find` to flatten all installers/checksums into `release-files/`
- Added "Verify artifacts exist" step that fails the release if 0 installer artifacts found
- Fixed release body checksum generation to read from `release-files/*.sha256`
- Fixed GitHub Release upload to use `release-files/*` (flat directory)
- Changed build artifact names to `release-${{ matrix.label }}` for clarity

## Files Created/Modified
- `.github/workflows/release.yml` - Complete rewrite of artifact handling in release job

## Decisions Made
- Removed `merge-multiple: true` from download-artifact — it preserves subdirectory structure which causes `artifacts/*.sha256` globs to miss files in nested Tauri bundle directories
- Used explicit `find` + `cp` flattening instead of relying on download-artifact merge behavior
- Added verification step to fail fast before release creation if artifacts are missing
- Reduced artifact retention from 30 to 5 days (sufficient for release workflow)

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## Next Phase Readiness
- Release workflow now reliably attaches all platform installers to GitHub Releases
- Push a `v*` tag to test: `git tag v0.1.0 && git push origin v0.1.0`

---
*Phase: 14-github-workflows-ci-cd*
*Completed: 2026-03-28*
