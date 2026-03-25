# Domain Pitfalls: OpenClaw Desktop Installer

**Domain:** Desktop app managing Docker containers, CLI tools, and system-level configurations
**Researched:** 2026-03-25

## Executive Summary

Desktop apps that manage system-level tools face a unique class of failures: they straddle user-space and system-space, must handle privilege elevation across platforms, manage Docker's fragile ecosystem, and coordinate config formats that were never designed for GUI editing. The research reveals that **most pain comes from orchestration details, not core functionality** — Docker compose quality, permission models, endpoint reachability, and config hygiene.

Three sources of real-world postmortems were particularly informative:
- OpenClaw's own GitHub issues (broken systemd paths, Conda PATH conflicts)
- Claude Code's installer failures (silent failures, auto-updater race conditions)
- Docker Desktop's WSL integration issues (fragile VM networking, update breakage)

---

## Critical Pitfalls

### Pitfall 1: Docker Desktop Is Not a Stable Dependency

**What goes wrong:** Docker Desktop on Windows is a house of cards. WSL2 kernel updates break networking. Docker Desktop updates break container connectivity. Virtualization can be disabled by BIOS updates or corporate policy. The WSL distributions (`docker-desktop`, `docker-desktop-data`) get corrupted and require full reset.

**Why it happens:** Docker Desktop runs a Linux VM on Windows via WSL2/Hyper-V. This VM has its own networking stack, disk images, and kernel. Any disruption to WSL (Windows updates, kernel mismatches, disk space) cascades into Docker failures. On Linux, Docker runs natively but still has daemon startup timing issues.

**Consequences:**
- "Docker Desktop is starting..." forever
- Containers lose network connection after Docker Desktop updates
- "Unexpected WSL error" blocks all Docker operations
- Engine stops silently while the dashboard shows running

**Prevention:**
1. **Never assume Docker is running** — check `docker info` with timeout before every operation
2. **Build a Docker health check** that verifies: daemon reachable, WSL distros running, virtualization enabled
3. **Implement graceful degradation** — show clear error with fix steps, not cryptic failures
4. **Cache Docker availability state** — don't re-check on every UI interaction
5. **Detect WSL version mismatches** proactively — `wsl --status` and `wsl --list --verbose`

**Warning signs:**
- Users reporting "Docker not found" after Windows updates
- Network timeouts in containers that work from CLI
- `docker context ls` showing wrong default context

**Phase mapping:** Phase 2 (Docker Integration) — build the health check system FIRST, before container management features.

---

### Pitfall 2: The Shell Plugin Is an RCE Vector

**What goes wrong:** Tauri's `tauri-plugin-shell` had CVE-2025-31477 — a critical RCE vulnerability where the `open` endpoint allowed dangerous protocols (`file://`, `smb://`, `nfs://`) due to improper protocol validation. Any app using `shell:allow-open` was vulnerable.

**Why it happens:** The plugin's protocol allowlist validation was broken. The default configuration claimed to restrict protocols but didn't actually enforce restrictions. Passing untrusted input to the `open` endpoint enabled arbitrary code execution.

**Consequences:**
- Remote code execution via crafted URIs
- Full system compromise if frontend is compromised
- Even without CVE, overly broad shell permissions expose the host

**Prevention:**
1. **Pin `tauri-plugin-shell` to >= 2.2.1** (the patched version)
2. **Never use `shell:allow-open`** — use `shell:default` which properly restricts protocols
3. **Use capability scoping** — limit shell commands to specific allowlists
4. **Audit all Tauri plugin permissions** — follow least-privilege principle
5. **Separate capabilities by window** — UI windows shouldn't have shell access

**Warning signs:**
- `shell:allow-open` in capability files
- Unrestricted shell command execution from frontend
- No input validation on paths passed to shell commands

**Phase mapping:** Phase 1 (Foundation) — security model must be correct from the start. Retrofitting is dangerous.

---

### Pitfall 3: Silent Installer Failures

**What goes wrong:** Installers report success but don't actually install anything. Claude Code's Windows installer (`install.ps1`) silently succeeded on clean machines without VC++ Runtime — the binary was never placed but the script said "installation complete." OpenClaw's `openclaw gateway install --force` wrote broken systemd `ExecStart` paths for npm-global installs.

**Why it happens:**
- No post-install verification (check that binary exists at expected path)
- No exit code checking after install commands
- Hardcoded paths that break with non-standard npm layouts (Conda, custom prefixes)
- Missing dependency detection (VC++ Runtime, Node.js version)

**Consequences:**
- Users think installation succeeded but nothing works
- Support burden of debugging "why doesn't it work" when install said success
- Gateway service fails immediately with cryptic systemd errors

**Prevention:**
1. **Always verify installation** — check binary exists at expected path, runs with `--version`
2. **Check exit codes** on every subprocess call — non-zero = failure
3. **Detect npm layout** — use `which openclaw` or equivalent to find actual paths, don't guess
4. **Pre-flight checks** — verify prerequisites (Node.js version, Docker, WSL, virtualization) BEFORE attempting install
5. **Never report success without verification** — "installed" means "binary runs and responds"

**Warning signs:**
- `ExecStart` paths that look like guesses (`/dist/index.js`)
- No verification after install steps
- "Success" messages without confirming the tool actually works

**Phase mapping:** Phase 2 (Installation) — every install path needs verification built in.

---

### Pitfall 4: YAML Config Is Not Safe Because It's Declarative

**What goes wrong:** YAML feels safe to edit because it's "just config." But YAML has parser differences between libraries, surprising merge behavior, implicit nulls, and type coercion. A missing key is not the same as `null`, and `null` is not the same as `false`. Config changes that pass code review can silently break across environments. OpenClaw users hit YAML indentation errors (`ervices:` typo), duplicate mapping keys, and stale enum values that break compose startup.

**Why it happens:**
- YAML parsers disagree on edge cases (tabs vs spaces, multiline strings, anchors)
- Config drift across environments (different parser versions, different base images)
- Removing "unused" defaults that were load-bearing
- No schema validation before applying config

**Consequences:**
- Container restart loops from bad compose syntax
- OpenClaw gateway crashes from invalid config values
- Config changes that work on dev but fail on user's machine
- "It worked before I changed this one line"

**Prevention:**
1. **Schema-validate before write** — use JSON Schema or equivalent to validate config before saving
2. **Test config round-trip** — write, read back, compare — detect parser differences
3. **Never remove defaults without understanding why they exist**
4. **Show config diff before applying** — let users see exactly what changes
5. **Version config format** — detect format version and migrate automatically
6. **Prefer TOML or JSON over YAML** for user-facing config if possible (fewer footguns)

**Warning signs:**
- Raw YAML/JSON editing exposed to users
- No config validation before applying
- "Config worked on my machine" support tickets

**Phase mapping:** Phase 3 (Config Management) — config editing UI must include validation and diff preview.

---

### Pitfall 5: PATH and Environment Pollution

**What goes wrong:** Conda active during install creates binary wrappers hard-linked to Conda paths. When Conda deactivates, those binaries break. Multiple Node.js installations (nvm, system, Homebrew) create PATH confusion. The gateway service launched via launchctl/systemd gets a different PATH than the user's shell, missing required tools.

**Why it happens:**
- npm global installs resolve paths based on current environment
- Service managers (systemd, launchctl) have minimal, clean environments
- Conda prepends its own bin directory, shadowing system tools
- Different shells (bash, zsh, fish) have different PATH initialization

**Consequences:**
- `openclaw` works in terminal but service can't find it
- "command not found" errors in daemon context
- Broken installs that require manual cleanup

**Prevention:**
1. **Detect Conda/pyenv/nvm before install** — warn users to deactivate
2. **Use absolute paths everywhere** — never rely on PATH resolution in service definitions
3. **Verify tools work in service context** — test with minimal PATH, not developer shell
4. **Document environment requirements** — clear list of what PATH must contain
5. **Don't install globally when Conda is active** — detect and refuse

**Warning signs:**
- Relative paths in systemd units or launchctl plists
- "Works in terminal, fails in service" reports
- Install script doesn't check for virtual environments

**Phase mapping:** Phase 2 (Installation) — environment detection must happen before any system modification.

---

### Pitfall 6: Windows WSL Is Not Linux

**What goes wrong:** Code that works perfectly on Linux fails on Windows because Docker on Windows goes through WSL2 — a different kernel, different filesystem (ext4.vhdx), different networking (NAT bridge), and different systemd (not enabled by default in WSL2). WSL2 doesn't enable systemd by default, so `openclaw gateway install` fails trying to create systemd units.

**Why it happens:**
- Assuming Docker behaves the same on all platforms
- Not detecting WSL vs native Linux
- WSL2 networking is NAT'd — containers can't be reached from Windows by default
- WSL distributions can be unregistered/corrupted, breaking Docker

**Consequences:**
- Gateway service install fails on Windows
- Docker containers unreachable from host
- "Docker is running" but containers can't connect to anything

**Prevention:**
1. **Detect platform explicitly** — `is_wsl`, `is_windows`, `is_native_linux` checks
2. **Separate code paths for Windows/Docker** — don't share install logic between Linux-native and WSL
3. **Check WSL status** — `wsl --status`, `wsl --list --verbose` before Docker operations
4. **Handle WSL2 networking** — configure port forwarding or use `host.docker.internal`
5. **Don't assume systemd** — check if systemd is available before creating units

**Warning signs:**
- Single code path for "Linux" that doesn't distinguish WSL
- No WSL detection in installation flow
- Port binding that assumes localhost works the same everywhere

**Phase mapping:** Phase 2 (Installation) — platform detection is a prerequisite for all install logic.

---

### Pitfall 7: Update Race Conditions Corrupt Installations

**What goes wrong:** Auto-updaters with scheduled checks cause race conditions when multiple instances run simultaneously. Claude Code's auto-updater corrupted npm global installations when 3+ sessions raced to update at the same scheduled time. Tauri's MSI updater creates update loops when installed to custom directories — it downloads, "installs" to the wrong place, restarts on old version, repeats forever.

**Why it happens:**
- No global lock file for update operations
- Multiple app instances don't coordinate
- MSI upgrade logic doesn't handle custom install directories
- No verification that update actually applied

**Consequences:**
- Corrupted installation requiring manual reinstall
- Infinite update loops consuming bandwidth
- Multiple versions registered in Programs & Features
- Users stuck on old versions thinking they're updated

**Prevention:**
1. **Implement update locking** — file lock with PID and timestamp, auto-expire stale locks
2. **Single update coordinator** — only one instance should check/apply updates
3. **Verify update applied** — check version after restart, don't trust download success
4. **Handle custom install paths** — test MSI updates with non-default directories
5. **Rollback on failure** — if new version doesn't start, restore previous

**Warning signs:**
- No lock file for update operations
- Multiple instances can trigger updates simultaneously
- Update success reported without version verification

**Phase mapping:** Phase 4 (Updates) — update system needs careful state machine design with failure recovery.

---

### Pitfall 8: Privilege Elevation Is Different Everywhere

**What goes wrong:** Windows uses UAC (prompt-based, per-process elevation). Linux uses sudo (per-command, policy-based). macOS has both sudo and authorization dialogs. Treating them the same leads to either too many prompts (user annoyance) or too few (security holes). Windows 11 added `sudo` but it doesn't have a `sudoers` file — no fine-grained control.

**Why it happens:**
- Abstracting "run as admin" into a cross-platform API
- Not understanding that UAC elevation is per-process, not per-command
- Assuming sudo is available on all Linux systems (it might not be)
- WSL sudo is inside the VM, not on the Windows host

**Consequences:**
- Multiple UAC prompts for what should be one operation
- Commands fail because elevation wasn't requested
- Security violations from running too much as admin

**Prevention:**
1. **Batch privileged operations** — minimize elevation prompts
2. **Use platform-specific elevation** — UAC for Windows, sudo/pkexec for Linux
3. **Detect elevation capability** — check if sudo is available, check UAC settings
4. **Never run the whole app elevated** — elevate only specific operations
5. **Test with non-admin users** — don't develop as root/admin

**Warning signs:**
- Single "run as admin" wrapper for everything
- No platform detection for elevation strategy
- Developed and tested only as admin user

**Phase mapping:** Phase 1 (Foundation) — elevation strategy must be designed before any system operations.

---

## Moderate Pitfalls

### Pitfall 9: Docker Compose YAML Is Fragile

**What goes wrong:** Compose files with indentation drift, flattened YAML, duplicate keys, or syntax errors cause containers to fail silently. OpenClaw postmortems show `services must be a mapping`, duplicate mapping keys, and YAML token errors blocking startup.

**Prevention:**
1. **Validate compose files** before `docker compose up` — `docker compose config` catches syntax errors
2. **Use a YAML linter** in the app before writing compose files
3. **Template compose files** — don't let users hand-edit; generate from structured data
4. **Test compose files** in CI across platforms

**Phase mapping:** Phase 2 (Docker Integration) — compose generation must be validated.

---

### Pitfall 10: Port Conflicts Are User-Hostile

**What goes wrong:** Docker containers fail with "port is already allocated" when another service (nginx, another container, development server) uses the same port. Users see cryptic errors.

**Prevention:**
1. **Check port availability** before binding — `lsof -i :PORT` or equivalent
2. **Offer alternative ports** — don't just fail, suggest next available
3. **Document default ports** — make them configurable in the UI
4. **Detect conflicts proactively** — scan for common port collisions

**Phase mapping:** Phase 2 (Docker Integration) — port management is part of container lifecycle.

---

### Pitfall 11: Volume Mount Permissions Fail Silently

**What goes wrong:** Docker volume mounts fail with permission errors. On Linux, host directory ownership must match container user. On Windows/WSL, filesystem boundaries between NTFS and ext4 cause permission translation issues. Empty directories appear instead of mounted content.

**Prevention:**
1. **Set correct ownership** on mounted directories before container start
2. **Handle WSL filesystem boundaries** — use paths within WSL, not `/mnt/c/`
3. **Verify mount success** — check that expected files exist inside container after mount
4. **Document workspace access model** — users need to understand what gets mounted where

**Phase mapping:** Phase 2 (Docker Integration) — sandboxing depends on correct volume mounts.

---

### Pitfall 12: Tauri Capabilities Are Easy to Get Wrong

**What goes wrong:** Tauri v2's permission/capability system is powerful but complex. Granting `fs:default` gives broad filesystem access. Mixing `shell:allow-open` with user-facing windows creates RCE surface. Platform-specific capabilities aren't always separated.

**Prevention:**
1. **Use scopes everywhere** — `fs:allow-read` with path scopes, not `fs:default`
2. **Separate capabilities by window** — main window vs settings window vs update window
3. **Platform-target capabilities** — `"platforms": ["linux", "windows"]` on desktop-only capabilities
4. **Audit capability files** — review every permission granted, document why each is needed

**Phase mapping:** Phase 1 (Foundation) — security model is foundational.

---

### Pitfall 13: Container Lifecycle Management Is Surprisingly Hard

**What goes wrong:** Containers that should be running aren't. Containers that should be stopped are still consuming resources. Restart loops from wrong startup commands (CLI help instead of gateway process). Health checks that don't actually verify the service is functional.

**Prevention:**
1. **Use health checks** in compose files — don't just check "running", check "functional"
2. **Implement restart policies** — `unless-stopped` or `on-failure` with max retries
3. **Monitor container logs** — surface errors to UI, don't let them hide in `docker logs`
4. **Handle graceful shutdown** — stop containers cleanly on app exit

**Phase mapping:** Phase 3 (Monitoring) — container lifecycle is ongoing, not one-time.

---

## Minor Pitfalls

### Pitfall 14: Cache and State Directory Conflicts

**What goes wrong:** App state, Docker state, and OpenClaw state all live in different directories. Uninstalling one doesn't clean the others. Old state files break new installations.

**Prevention:**
1. **Document all state locations** — `~/.openclaw/`, Docker volumes, app data directory
2. **Clean uninstall** — remove all state, not just binaries
3. **Backup before destructive operations** — export config before upgrade

**Phase mapping:** Phase 5 (Uninstall) — clean removal is as important as clean install.

---

### Pitfall 15: Error Messages That Help No One

**What goes wrong:** Technical errors surface directly to non-technical users. "Wsl/Service/RegisterDistro/CreateVm/MountDisk/HCS/ERROR_NOT_FOUND" means nothing to anyone. Docker compose errors span dozens of lines.

**Prevention:**
1. **Translate errors to user language** — "Docker couldn't start because virtualization is disabled" not "HCS_E_HYPERV_NOT_INSTALLED"
2. **Provide fix steps** — every error should have a "Try this" section
3. **Log technical details separately** — full error in logs, summary in UI
4. **Link to troubleshooting docs** — for errors that need manual intervention

**Phase mapping:** All phases — error handling is cross-cutting.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Docker health checks | Assuming Docker is always available | Check before every operation, cache state |
| Windows installation | WSL2 not configured / virtualization disabled | Pre-flight checks with clear error messages |
| Service registration | Wrong ExecStart paths for non-standard npm layouts | Use `which`/absolute paths, verify after write |
| Config editing | YAML parser differences / type coercion | Schema validation, round-trip testing |
| Auto-updater | Race conditions with multiple instances | Global locking, version verification |
| Sandboxing | Overly broad Tauri permissions | Capability scoping, least privilege |
| Uninstall | Orphaned state files | Document all state locations, clean all |
| Error reporting | Cryptic technical errors | Translate to user-friendly messages |

---

## Sources

- [Docker Desktop troubleshooting](https://oneuptime.com/blog/post/2026-02-08-how-to-troubleshoot-docker-desktop-not-starting/view) (2026-02-08) — HIGH confidence, comprehensive
- [Docker Desktop WSL error issue #14618](https://github.com/docker/for-win/issues/14618) (2025-02-19) — HIGH confidence, official issue tracker
- [OpenClaw installation troubleshooting](http://coclaw.com/guides/openclaw-installation-troubleshooting) (2026-03-02) — HIGH confidence, OpenClaw-specific
- [OpenClaw broken systemd ExecStart issue #42367](https://github.com/openclaw/openclaw/issues/42367) (2026-03-10) — HIGH confidence, real bug
- [Claude Code silent installer failure issue #32312](https://github.com/anthropics/claude-code/issues/32312) (2026-03-09) — HIGH confidence, same class of bug
- [Claude Code auto-updater race condition issue #19063](https://github.com/anthropics/claude-code/issues/19063) (2026-01-18) — HIGH confidence, real corruption
- [CVE-2025-31477: Tauri shell plugin RCE](https://www.sentinelone.com/vulnerability-database/cve-2025-31477/) (2026-03-18) — HIGH confidence, CVE documented
- [Tauri v2 updater MSI custom directory bug #14828](https://github.com/tauri-apps/tauri/issues/14828) (2026-01-25) — HIGH confidence, open bug
- [OpenClaw setup postmortem](https://medium.com/@mohammad.aboali/openclaw-setup-postmortem) (2026-02-23) — MEDIUM confidence, individual experience
- [YAML config pitfalls article](https://medium.com/@aniruddhasonawane/the-configuration-change-that-passed-code-review-and-still-broke-everything) (2026-01-20) — MEDIUM confidence, general config wisdom
- [Tauri security documentation](https://tauri.app/security/) (2025-02-22) — HIGH confidence, official docs
- [Tauri capabilities documentation](https://tauri.app/security/capabilities) (2025-08-01) — HIGH confidence, official docs
