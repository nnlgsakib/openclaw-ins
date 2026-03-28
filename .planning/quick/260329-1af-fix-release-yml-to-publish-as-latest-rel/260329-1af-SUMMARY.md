# Quick Task 260329-1af: Fix Release Workflow Pre-release Issue

**Date:** 2026-03-28
**Commit:** c8e5612

## Problem

The release workflow (`release.yml`) was marking all beta/rc/alpha tagged releases as pre-release on GitHub:

```yaml
prerelease: ${{ contains(github.ref_name, '-beta') || contains(github.ref_name, '-rc') || contains(github.ref_name, '-alpha') }}
```

This meant `v1.1.0-beta.2` was published as a pre-release instead of the latest release.

## Fix

Changed line 205 in `.github/workflows/release.yml`:

```yaml
# Before:
prerelease: ${{ contains(github.ref_name, '-beta') || contains(github.ref_name, '-rc') || contains(github.ref_name, '-alpha') }}

# After:
prerelease: false
```

All tagged releases now publish as the latest release.
