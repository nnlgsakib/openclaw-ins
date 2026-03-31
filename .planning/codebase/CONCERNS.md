# Codebase Concerns

**Analysis Date:** 2026-03-31

## Tech Debt

**JSON5 Parsing Implementation:**
- Issue: Hand-rolled JSON5 comment/trailing-comma parser in `src-tauri/src/commands/config.rs` (lines 159-251) rather than using a crate like `json5` or `jsonc-parser`
- Files: `src-tauri/src/commands/config.rs`
- Impact: Fragile edge cases with escape sequences in strings; potential parse failures on valid JSON5
- Fix approach: Replace with `json5` crate or `jsonc-parser` for robust JSON5/JSONC support

**Hardcoded Gateway Port (18789):**
- Issue: Gateway port 18789 is hardcoded in ~15+ locations across Rust and TypeScript
- Files: `src-tauri/src/install/docker_install.rs`, `src-tauri/src/commands/gateway.rs`, `src-tauri/src/commands/gateway_ws.rs`, `src-tauri/src/install/verify.rs`, `src/hooks/use-gateway.ts`, `src/pages/settings.tsx`
- Impact: Changing the port requires updating many files; inconsistency risk
- Fix approach: Define a single constant or configuration for the gateway port

**Static Metadata in openclaw_metadata.rs:**
- Issue: Channel and provider metadata is hardcoded in `src-tauri/src/commands/openclaw_metadata.rs` (1072 lines) rather than being dynamically loaded from OpenClaw
- Files: `src-tauri/src/commands/openclaw_metadata.rs`
- Impact: Metadata will drift from actual OpenClaw capabilities; requires code updates for new channels/providers
- Fix approach: Load metadata dynamically from OpenClaw at runtime, cache with TTL

**Wizard Store Size:**
- Issue: `src/stores/use-wizard-store.ts` is 755 lines with all provider/channel constants embedded
- Files: `src/stores/use-wizard-store.ts`
- Impact: Large file with mixed concerns (types, constants, logic); difficult to maintain
- Fix approach: Extract constants to separate files, split store into smaller modules

## Known Bugs

**No Known Bugs Detected:**
- No TODO/FIXME/HACK/XXX comments found in source code
- No explicit bug reports in codebase

## Security Considerations

**Hardcoded Gateway Bind Mode:**
- Issue: Gateway is configured to bind to `lan` (all interfaces) in `src-tauri/src/install/docker_install.rs` line 241 (`OPENCLAW_GATEWAY_BIND=lan`)
- Files: `src-tauri/src/install/docker_install.rs`
- Impact: Gateway accessible from network, not just localhost
- Current mitigation: Token-based authentication is generated
- Recommendation: Default to `localhost` binding with explicit user opt-in for LAN access

**Token Generation Fallback:**
- Issue: In `generate_token()` at `src-tauri/src/install/docker_install.rs` lines 450-467, if `getrandom::fill` fails, falls back to time+PID based RNG which is predictable
- Files: `src-tauri/src/install/docker_install.rs`
- Impact: Predictable tokens if CSPRNG unavailable
- Current mitigation: `getrandom` should always work on supported platforms
- Recommendation: Use `expect` instead of fallback for production; or log warning when fallback is used

**Global Git Safe Directory Config:**
- Issue: `git config --global --add safe.directory` modifies user's global git config during install
- Files: `src-tauri/src/install/docker_install.rs` lines 124-132, 213-221
- Impact: Modifies user's git configuration without explicit consent
- Recommendation: Use `--system` scope or document behavior; consider per-repo config

**Uninstall Uses Force Kill:**
- Issue: `kill -9` and `taskkill /F /T` used without process ownership verification
- Files: `src-tauri/src/commands/uninstall.rs` line 466, `src-tauri/src/commands/gateway.rs` line 448
- Impact: Could kill unrelated processes if PID detection is incorrect
- Recommendation: Verify process name/ownership before force-killing

**WebSocket Connection to Localhost:**
- Issue: Gateway WebSocket connects to `ws://127.0.0.1:{port}` without TLS in `src-tauri/src/commands/gateway_ws.rs`
- Files: `src-tauri/src/commands/gateway_ws.rs`
- Impact: Unencrypted communication on localhost (acceptable for local-only)
- Current mitigation: Connection is to localhost only

## Performance Bottlenecks

**Large Wizard Store Re-renders:**
- Problem: Zustand store at `src/stores/use-wizard-store.ts` has 755 lines with many derived state computations
- Files: `src/stores/use-wizard-store.ts`
- Cause: Single large store triggers unnecessary re-renders when any slice changes
- Improvement: Split into multiple stores by concern (providers, channels, sandbox)

**Gateway Status Polling:**
- Problem: Frontend polls gateway status every 5 seconds in `src/hooks/use-gateway.ts` line 98-114
- Files: `src/hooks/use-gateway.ts`
- Cause: Fallback polling runs even when not needed
- Improvement: Only poll during startup phase, use WebSocket events otherwise

**Docker Metadata Loading:**
- Problem: `check_docker_health_internal()` in `src-tauri/src/docker/check.rs` may be called multiple times
- Files: `src-tauri/src/docker/check.rs`
- Cause: No caching of Docker daemon status
- Improvement: Cache Docker status with TTL to avoid repeated socket connections

## Fragile Areas

**Process Output Parsing:**
- Files: `src-tauri/src/commands/gateway.rs` lines 441-453 (netstat parsing), `src-tauri/src/commands/uninstall.rs` lines 189-194
- Why fragile: Parses `netstat` and `lsof` output which varies across OS versions and locales
- Safe modification: Add more robust PID detection with fallback to process name matching
- Test coverage: Minimal - no integration tests for cross-platform process detection

**Git Clone/Pull Error Handling:**
- Files: `src-tauri/src/install/docker_install.rs` lines 136-160, 180-208
- Why fragile: Reads stderr line-by-line; git output format varies by version and locale
- Safe modification: Check exit codes primarily, parse stderr only for diagnostics
- Test coverage: Unit test for token generation only

**Path Handling on Windows:**
- Files: `src-tauri/src/install/docker_install.rs` multiple `.unwrap()` on `to_str()`
- Why fragile: Non-UTF-8 paths on Windows would cause panics
- Safe modification: Use `to_string_lossy()` or proper error handling
- Test coverage: None for non-ASCII path scenarios

**Hardcoded NVM Path Scan:**
- Files: `src-tauri/src/commands/silent.rs` lines 241-271, `src-tauri/src/commands/nodejs.rs` lines 457-471
- Why fragile: Scans fixed list of drive letters (C-F) and directory names for NVM installations
- Safe modification: Add user-configurable scan paths or registry-based discovery
- Test coverage: Windows registry tests exist but path scanning is not tested

## Scaling Limits

**Single Gateway Process:**
- Current capacity: Single OpenClaw gateway process per installation
- Limit: Cannot run multiple gateways simultaneously (port conflict)
- Scaling path: Support multiple gateway instances with configurable ports

**In-Memory WebSocket State:**
- Current capacity: Single WebSocket connection with HashMap of pending calls
- Limit: Pending calls map grows unbounded during long sessions
- Scaling path: Add timeout cleanup for orphaned pending calls

**No Connection Pooling for HTTP:**
- Files: `src-tauri/src/commands/channels.rs`, `src-tauri/src/commands/update.rs`
- Current capacity: New `reqwest::Client` created per command invocation
- Impact: No connection reuse; higher latency for sequential API calls
- Improvement: Share a single HTTP client in AppState

## Dependencies at Risk

**process-wrap (not in Cargo.toml):**
- Risk: Listed in CLAUDE.md recommendations but not in `src-tauri/Cargo.toml`
- Impact: Process management features (kill-on-drop, Windows job objects) not available
- Migration plan: Add to Cargo.toml if needed, or document current approach using direct `tokio::process::Command`

**Multiple Tauri Plugin Version Mismatches:**
- Risk: Plugins at various versions (2.3.x through 2.10.x) may have compatibility issues
- Files: `src-tauri/Cargo.toml`, `package.json`
- Impact: Potential runtime issues with plugin API mismatches
- Recommendation: Pin all Tauri plugins to same minor version

**OpenClaw npm Package in Dev:**
- Files: `package.json` line 37 - `"openclaw": "^2026.3.24"` in dependencies (not devDependencies)
- Impact: OpenClaw bundled with frontend even though it is a CLI tool for the backend
- Recommendation: Move to devDependencies or remove if not directly imported

## Missing Critical Features

**No Graceful Shutdown Handler:**
- Problem: App does not handle SIGTERM/Ctrl+C gracefully for cleanup
- Impact: Gateway child process may not be terminated when app closes
- Fix approach: Register shutdown handler to stop gateway on app exit

**No Config Backup Before Write:**
- Problem: `write_config` in `src-tauri/src/commands/config.rs` overwrites without backup
- Impact: Corrupted config cannot be restored
- Fix approach: Create `.bak` file before overwriting

**No Input Validation on Gateway WebSocket:**
- Problem: `gateway_ws_call` in `src-tauri/src/commands/gateway_ws.rs` accepts arbitrary method names
- Impact: Could potentially call unintended gateway methods
- Recommendation: Whitelist allowed gateway API methods

## Test Coverage Gaps

**Frontend:**
- What's not tested: No test files found in `src/` directory
- Files: All `src/**/*.ts(x)` files
- Risk: UI regressions, state management bugs
- Priority: High

**Backend Integration:**
- What's not tested: Docker interactions, gateway lifecycle, installation flows
- Files: `src-tauri/src/commands/*.rs`, `src-tauri/src/install/*.rs`
- Risk: Installation failures on edge cases, process management bugs
- Priority: High

**Cross-Platform:**
- What's not tested: Windows vs Linux behavior differences
- Files: `src-tauri/src/commands/silent.rs`, `src-tauri/src/commands/nodejs.rs`
- Risk: Platform-specific regressions
- Priority: Medium

---

*Concerns audit: 2026-03-31*
