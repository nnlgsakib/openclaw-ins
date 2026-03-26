# Domain Pitfalls: OpenClaw Desktop Installer

**Domain:** Desktop app managing Docker containers, CLI tools, and system-level configurations
**Researched:** 2026-03-25, updated 2026-03-26 for v1.1 features

## Executive Summary

Desktop apps that manage system-level tools face a unique class of failures: they straddle user-space and system-space, must handle privilege elevation across platforms, manage Docker's fragile ecosystem, and coordinate config formats that were never designed for GUI editing. The research reveals that **most pain comes from orchestration details, not core functionality** — Docker compose quality, permission models, endpoint reachability, and config hygiene.

**v1.1 Addition:** The v1.1 milestone adds three high-risk feature areas:
1. **Real-time log streaming** — Memory management, IPC pressure, cleanup
2. **UI/UX animations** — Tauri webview GPU limits, layout thrashing, library weight
3. **Channel management** — OAuth security, token storage, pairing UX

These features introduce integration pitfalls specific to adding them to an existing working system.

---

## v1.1-Specific Pitfalls

### Log Streaming Pitfalls

#### LS-01: Event Listener Memory Leaks

**Severity:** Critical
**Phase:** Log Streaming Implementation

**What goes wrong:** Frontend event listeners (`listen()` from `@tauri-apps/api/event`) accumulate when components mount/unmount without cleanup. Each navigation to the install page adds another listener. After 10 navigations, 10 listeners fire in parallel, causing exponential memory growth and UI lag.

**Why it happens:**
- React component unmounts don't automatically clean up Tauri event listeners
- `useEffect` cleanup functions are easy to forget
- TanStack Query doesn't manage Tauri events — they live outside the cache

**Current codebase state:** The existing `useContainerLogs` hook uses polling (`refetchInterval: 5_000`), not streaming. Switching to event-based streaming requires new cleanup patterns.

**Consequences:**
- Memory usage grows with each navigation
- Multiple handlers process same event, causing duplicate log entries
- Eventually crashes the webview

**Prevention:**
```typescript
// ALWAYS return the unlisten function from useEffect
useEffect(() => {
  const unlisten = listen<LogLine>("install-log", handler);
  return () => { unlisten.then(fn => fn()); };
}, []);
```
1. **Use a custom hook** that wraps `listen` with automatic cleanup
2. **Add a dev-mode listener counter** that warns when listeners > 1
3. **Test navigation patterns** — mount/unmount install page 20 times, check memory

**Warning signs:**
- Memory usage grows over time in dev tools
- Same log line appears multiple times
- `listen()` calls without corresponding cleanup

---

#### LS-02: Unbounded Log Buffer Growth

**Severity:** High
**Phase:** Log Streaming Implementation

**What goes wrong:** Docker image pulls can emit thousands of log lines. If the frontend stores all log lines in state without bounds, memory grows unbounded. A large image pull (multi-GB) can emit 50,000+ progress messages.

**Why it happens:**
- `useState` array grows without limit
- No virtualization for log display
- Backend streams everything, frontend buffers everything

**Current codebase state:** `get_container_logs` returns last 200 lines via `tail` parameter. Real-time streaming has no built-in limit.

**Consequences:**
- UI becomes unresponsive during long installs
- Browser tab crashes from memory pressure
- Scrolling performance degrades with log length

**Prevention:**
1. **Cap log buffer to N lines** (e.g., 500-1000 lines) — shift old lines out
2. **Use virtualized rendering** — only render visible lines (e.g., `react-window`)
3. **Implement log rotation** — write to file, display tail in UI
4. **Emit aggregate progress** — don't send every Docker layer progress tick

```typescript
const MAX_LOG_LINES = 500;
setLogs(prev => [...prev, newLine].slice(-MAX_LOG_LINES));
```

**Warning signs:**
- Log component re-renders slowing down
- Array length in React DevTools growing without bound
- Installation progress becomes sluggish mid-install

---

#### LS-03: Tauri Event Channel Backpressure

**Severity:** Medium
**Phase:** Log Streaming Implementation

**What goes wrong:** Rust backend emits events faster than the frontend can process them. During rapid Docker layer downloads, the backend might emit 100+ events/second. The IPC channel buffers these, causing memory pressure on both sides.

**Why it happens:**
- `app_handle.emit()` is fire-and-forget with no backpressure
- bollard's image pull stream emits at Docker's pace, not UI's pace
- Frontend JS event loop can only process so fast

**Current codebase state:** `emit_progress()` in `progress.rs` calls `handle.emit().ok()` — errors are silently swallowed, no throttling.

**Consequences:**
- Events queue up, causing delayed UI updates
- Memory pressure on Rust side
- UI "catches up" in bursts after downloads complete

**Prevention:**
1. **Debounce/throttle emissions** — emit at most every 100ms during rapid progress
2. **Aggregate progress events** — batch multiple Docker layers into one event
3. **Use progress milestones** — emit at 5% increments, not every byte
4. **Monitor queue depth** in dev mode

```rust
// Debounce pattern: track last emit time
let now = Instant::now();
if now.duration_since(last_emit) > Duration::from_millis(100) {
    emit_progress(handle, step, percent, message);
    last_emit = now;
}
```

**Warning signs:**
- UI progress jumps suddenly after being stuck
- Memory spike during image pulls
- Logs appear in batches rather than streaming

---

#### LS-04: Stream Cleanup on Cancellation

**Severity:** High
**Phase:** Log Streaming Implementation

**What goes wrong:** User navigates away during installation. The bollard image pull stream continues running in the background, emitting events to a dead listener. Resources leak, and the installation might "complete" without the user knowing.

**Why it happens:**
- Tokio tasks spawned for streaming aren't cancelled on navigation
- No cancellation token passed to async operations
- Tauri command handlers run to completion regardless of frontend state

**Current codebase state:** `docker_install` is a synchronous flow — it runs to completion or error. Adding streaming requires explicit cancellation handling.

**Consequences:**
- Background resource consumption
- Confusing state when user returns to install page
- Potential for zombie containers if install partially completes

**Prevention:**
1. **Use CancellationToken** from `tokio_util` — pass to streaming operations
2. **Store cancel handle in app state** — allow frontend to trigger cancellation
3. **Implement cleanup on cancel** — remove partial state (containers, files)
4. **Add "Cancel Installation" button** with explicit cleanup

```rust
use tokio_util::sync::CancellationToken;

let token = CancellationToken::new();
tokio::select! {
    result = pull_image(&docker, token.clone()) => { ... }
    _ = token.cancelled() => { cleanup(); }
}
```

**Warning signs:**
- Docker pulls continue after leaving install page
- No cancel button on long operations
- `docker ps` shows containers user didn't expect

---

### Animation & UI Pitfalls

#### UI-01: GPU Compositing Layer Explosion

**Severity:** High
**Phase:** UI/UX Overhaul

**What goes wrong:** Every animated element creates a GPU compositing layer. Animating 20+ elements simultaneously (e.g., staggered list animations) exhausts GPU memory. Tauri webview (WebView2 on Windows, WebKitGTK on Linux) has lower GPU budgets than Chrome.

**Why it happens:**
- `transform` and `opacity` create GPU layers (good)
- Too many layers = GPU memory pressure
- `will-change: transform` on every element
- Framer Motion's default exit animations keep layers alive

**Current codebase state:** Current UI uses minimal animations (`animate-spin` on loaders). Adding micro-interactions to every component could trigger this.

**Consequences:**
- Janky animations, especially on integrated GPUs
- High GPU memory usage
- Blank frames during transitions
- Worse on Linux (WebKitGTK) than Windows (WebView2)

**Prevention:**
1. **Limit concurrent animations** — stagger with delays, max 3-5 simultaneous
2. **Use CSS animations over JS** where possible — lower overhead
3. **Audit with "Layers" panel** in DevTools — count active layers
4. **Test on low-end hardware** — integrated Intel GPU is baseline
5. **Avoid `will-change` except for active animations**

```css
/* DO: Only promote during animation */
.card { transition: transform 200ms; }
.card:hover { transform: scale(1.02); }

/* DON'T: Permanent promotion */
.card { will-change: transform; }
```

**Warning signs:**
- Animations smooth in Chrome, janky in app
- DevTools shows 50+ compositing layers
- GPU memory usage spikes during transitions

---

#### UI-02: Layout Thrashing During Animations

**Severity:** Medium
**Phase:** UI/UX Overhaul

**What goes wrong:** Animations that read layout properties (width, height, offsetTop) during animation cause forced synchronous layouts. Each frame triggers layout recalculation, dropping frames.

**Why it happens:**
- Reading `getBoundingClientRect()` during animation
- Framer Motion's `AnimatePresence` measuring exiting elements
- Mixing layout properties (height, margin) with transforms

**Current codebase state:** No layout-based animations currently. Adding height transitions (accordions, expandable cards) could trigger this.

**Consequences:**
- 60fps drops to 10-20fps
- Animations stutter on expand/collapse
- Visible "jank" that makes UI feel cheap

**Prevention:**
1. **Only animate transform and opacity** — these don't trigger layout
2. **Use FLIP technique** for layout changes — measure once, animate transforms
3. **Avoid animating height** — use `max-height` with overflow, or scale transforms
4. **Batch DOM reads/writes** — read all measurements, then write all changes

```typescript
// FLIP: First, Last, Invert, Play
const first = element.getBoundingClientRect();
// ... trigger layout change ...
const last = element.getBoundingClientRect();
const deltaX = first.left - last.left;
element.animate([
  { transform: `translateX(${deltaX}px)` },
  { transform: 'translateX(0)' }
], { duration: 200 });
```

**Warning signs:**
- DevTools Performance panel shows long "Layout" tasks
- Purple bars in frame graph during animations
- Height/width animations stuttering

---

#### UI-03: Animation Library Bundle Weight

**Severity:** Low
**Phase:** UI/UX Overhaul

**What goes wrong:** Framer Motion adds ~50KB (gzipped) to the bundle. Combined with other animation libraries (spring physics, gesture handling), the frontend bundle grows significantly. Tauri apps should be lightweight.

**Why it happens:**
- Framer Motion includes spring physics, gesture system, SVG paths
- Tree-shaking doesn't remove unused features well
- Multiple animation libraries for different use cases

**Current codebase state:** No animation library currently. Adding one increases bundle by 50-100KB.

**Consequences:**
- Slower app startup (more JS to parse)
- Larger installer size
- Conflicts with Tauri's "lightweight" value proposition

**Prevention:**
1. **Evaluate if Framer Motion is needed** — CSS animations handle 80% of cases
2. **Use `motion/react` (Motion One)** — 4KB alternative, lighter than Framer
3. **Import only what you use** — `import { motion } from 'framer-motion'` not `import * as`
4. **Measure bundle impact** — `pnpm build && du -h dist/assets/*.js`

**Decision:** CSS transitions + minimal JS for complex animations. Only add Framer Motion if CSS proves insufficient.

**Warning signs:**
- Bundle size increases >30% after adding animations
- Multiple animation libraries imported
- Slow time-to-interactive in cold starts

---

#### UI-04: Inconsistent Animation Timing Across Overhaul

**Severity:** Medium
**Phase:** UI/UX Overhaul

**What goes wrong:** Different pages animate with different durations, easings, and styles. Install page uses 200ms transitions, settings uses 500ms. Buttons on one page slide, on another they fade. The app feels inconsistent.

**Why it happens:**
- Multiple developers/phases adding animations independently
- No design system for motion
- Copy-pasting animation code with different values
- "It looked good on this page" without global standards

**Current codebase state:** Existing animations are minimal (`animate-spin`). An overhaul without standards will create inconsistency.

**Consequences:**
- Unprofessional feel — animations should be invisible, not noticeable
- User cognitive load from learning different motion patterns
- Harder to maintain as inconsistencies compound

**Prevention:**
1. **Define motion tokens** — standard durations (100/200/300/500ms), standard easings
2. **Create animation variants** — `fadeIn`, `slideUp`, `scaleIn` as reusable configs
3. **Document motion guidelines** — when to use which animation, how long
4. **Review animations holistically** — test all pages back-to-back before shipping

```css
:root {
  --duration-fast: 100ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1);
}
```

**Warning signs:**
- Magic numbers for durations in components
- Different easing functions across pages
- No shared animation utilities/variants

---

### Channel Management Pitfalls

#### CH-01: OAuth Token Storage Insecurity

**Severity:** Critical
**Phase:** Channel Management

**What goes wrong:** Discord/Telegram bot tokens stored in plaintext in config files or Tauri store. Any app with file read access can steal tokens. Token theft = full account compromise.

**Why it happens:**
- `tauri-plugin-store` writes to JSON file — readable by any process
- Developers treat tokens like config, not secrets
- No native keychain integration by default

**Current codebase state:** No token storage yet. Channel management will require storing sensitive tokens.

**Consequences:**
- Bot token theft → attacker controls your Discord bot
- WhatsApp session theft → attacker can impersonate user
- API key theft → billing/quota abuse

**Prevention:**
1. **Use OS keychain** — `tauri-plugin-keychain` or direct Windows Credential Manager / Linux Secret Service APIs
2. **Never store tokens in tauri-plugin-store** — it's for preferences, not secrets
3. **Encrypt at rest** — if keychain unavailable, encrypt with machine-specific key
4. **Limit token scope** — request minimal permissions for each channel
5. **Token rotation** — implement refresh token flows where available

```rust
// Use keyring crate for cross-platform secure storage
use keyring::Entry;
let entry = Entry::new("openclaw", "discord_token")?;
entry.set_password(&token)?;
```

**Warning signs:**
- Tokens visible in `~/.openclaw/` files
- No mention of secure storage in channel implementation
- Tokens logged during debugging

---

#### CH-02: WhatsApp QR Code Pairing Race Conditions

**Severity:** High
**Phase:** Channel Management

**What goes wrong:** WhatsApp Web pairing requires real-time QR code display. If the QR expires (typically 20-30 seconds) before user scans, pairing fails silently. User keeps scanning an expired QR, nothing happens.

**Why it happens:**
- WhatsApp QR codes are time-limited
- No expiration indicator in UI
- Backend generates QR, doesn't track its validity
- User is fumbling with phone while QR expires

**Current codebase state:** No WhatsApp integration yet. QR pairing is a known UX challenge.

**Consequences:**
- Frustrated users who "scanned but nothing happened"
- Support tickets for "WhatsApp won't connect"
- Users give up before successfully pairing

**Prevention:**
1. **Show QR countdown timer** — visible seconds remaining
2. **Auto-regenerate QR** before expiration — seamless to user
3. **Clear error state** — "QR expired, generating new one..."
4. **Pre-flight check** — verify WhatsApp backend is reachable before showing QR
5. **Test with slow scanners** — elderly users need more time

```typescript
// QR with auto-refresh
const [qrData, setQrData] = useState<string | null>(null);
const [expiresAt, setExpiresAt] = useState<number>(0);

useEffect(() => {
  const interval = setInterval(() => {
    if (Date.now() > expiresAt - 5000) { // Refresh 5s before expiry
      regenerateQR();
    }
  }, 1000);
  return () => clearInterval(interval);
}, [expiresAt]);
```

**Warning signs:**
- Static QR code with no timer
- No handling for expired QR state
- QR generation doesn't return expiry timestamp

---

#### CH-03: Channel Connection Status Staleness

**Severity:** Medium
**Phase:** Channel Management

**What goes wrong:** Channel shows "Connected" but the underlying session expired/died. User thinks agent is responding to messages, but nothing is getting through. Discord bot shows online but webhook is broken.

**Why it happens:**
- Status cached from last successful check
- No active health monitoring
- Backend connection dies but frontend doesn't know
- Different timeout behaviors per platform (WhatsApp session expires differently than Discord token)

**Current codebase state:** Monitoring page already has status polling patterns (`useOpenClawStatus`). Channel status needs similar treatment.

**Consequences:**
- Users miss messages because they think agent is active
- Silent failures erode trust
- Delayed discovery of broken channels

**Prevention:**
1. **Active heartbeat per channel** — verify connection is alive, not just "was alive"
2. **Show last verified time** — "Connected (verified 2 min ago)"
3. **Different polling intervals per channel type** — WhatsApp needs more frequent checks
4. **Proactive notifications** — alert user when channel goes unhealthy

```typescript
// Channel health includes freshness
interface ChannelStatus {
  connected: boolean;
  lastVerified: Date;
  error?: string;
}

// Show staleness in UI
const isStale = Date.now() - lastVerified.getTime() > 5 * 60 * 1000;
{isStale && <Badge variant="warning">Unverified</Badge>}
```

**Warning signs:**
- Status only updated on user action (no polling)
- No "last checked" timestamp
- Same status for hours without verification

---

#### CH-04: OAuth Redirect URI Handling on Desktop

**Severity:** High
**Phase:** Channel Management

**What goes wrong:** OAuth flows (Discord, Slack, Telegram) require redirect URIs. Desktop apps can't use `http://localhost` reliably (port conflicts, firewall issues). Custom protocol handlers (`openclaw://callback`) require OS registration that might fail.

**Why it happens:**
- OAuth designed for web apps with stable URLs
- Desktop apps need workarounds: localhost server, custom protocols, or deep links
- Custom protocol registration varies by OS and can fail silently
- Windows Defender/firewall may block localhost servers

**Current codebase state:** No OAuth flows yet. Any channel requiring OAuth will hit this.

**Consequences:**
- OAuth flow opens browser, callback never arrives
- Users stuck on "Waiting for authorization..." forever
- Works for developer (protocol registered), fails for user (not registered)

**Prevention:**
1. **Use Tauri's deep link plugin** — handles protocol registration properly
2. **Fallback to copy-paste token** — manual flow if OAuth fails
3. **Test on fresh installs** — don't rely on dev machine registrations
4. **Timeout with clear error** — "Didn't receive callback within 2 minutes. Try manual setup."
5. **Verify protocol handler** before starting OAuth — `tauri-plugin-deep-link` can check

```rust
// Check if protocol is registered before starting OAuth
if !is_protocol_registered("openclaw") {
    register_protocol("openclaw")?;
}
```

**Warning signs:**
- OAuth works in dev, fails after fresh install
- No timeout on OAuth waiting screen
- No manual fallback for token entry

---

#### CH-05: Rate Limiting and API Abuse

**Severity:** Medium
**Phase:** Channel Management

**What goes wrong:** Polling channel status too frequently triggers rate limits. Discord: 50 requests/second. Telegram: 30 messages/second. Hitting limits causes temporary bans, making the channel appear broken.

**Why it happens:**
- Aggressive polling intervals (every second)
- No request deduplication (multiple components polling same endpoint)
- No exponential backoff on errors
- Testing with rapid UI interactions

**Current codebase state:** Monitoring uses 15-60 second polling intervals. Channel status might tempt faster polling.

**Consequences:**
- 429 errors from platform APIs
- Temporary bans (minutes to hours)
- Channel appears "broken" when it's just rate-limited

**Prevention:**
1. **Respect documented rate limits** — Discord, Telegram, Slack all publish limits
2. **Use exponential backoff** on errors — double delay on each retry
3. **Centralize API calls** — single source of truth for channel status
4. **Cache aggressively** — status doesn't change every second
5. **Implement circuit breaker** — stop calling after repeated failures

```typescript
// TanStack Query handles this well
useQuery({
  queryKey: ['channel', channelId, 'status'],
  queryFn: fetchChannelStatus,
  refetchInterval: 30_000, // Not too aggressive
  retry: 3,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
});
```

**Warning signs:**
- 429 errors in logs
- Polling intervals under 10 seconds for external APIs
- No backoff on errors

---

## Integration Pitfalls (Adding Features to Existing System)

### INT-01: Breaking Existing Progress Flow

**Severity:** High
**Phase:** Log Streaming Implementation

**What goes wrong:** Log streaming replaces fake percentage progress. But the UI was designed around percentage — progress bar, "45% complete" text. Switching to log-based progress without updating UI leaves mismatched states.

**Current codebase state:** `StepInstall.tsx` shows `Progress` component driven by `progress.percent`. `docker_install.rs` emits synthetic percentages. Both need coordinated changes.

**Prevention:**
1. **Design new progress model first** — logs + optional percentage + phases
2. **Update UI to handle both** — percentage OR log-based progress
3. **Feature flag the change** — toggle between old/new progress
4. **Don't remove old code until new is stable**

---

### INT-02: Animation Breaking Accessibility

**Severity:** Medium
**Phase:** UI/UX Overhaul

**What goes wrong:** Adding animations breaks keyboard navigation (focus lost during transitions), screen reader announcements (elements announced mid-animation), and reduced-motion preferences (ignored).

**Current codebase state:** Current UI is functional without animations. Adding motion without accessibility consideration creates regressions.

**Prevention:**
1. **Respect `prefers-reduced-motion`** — disable or minimize animations
2. **Maintain focus during transitions** — focus trap during modals
3. **Use `aria-live` for status updates** — screen readers announce changes
4. **Test with keyboard only** — complete full flow without mouse

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

### INT-03: Channel State Interfering with Install State

**Severity:** Medium
**Phase:** Channel Management

**What goes wrong:** Channel management adds new state (connected channels, pending pairings). This state interacts with install state — can't configure channels if not installed, channel status depends on OpenClaw running. Improper state separation causes bugs.

**Current codebase state:** `useOnboardingStore` manages install wizard state. `useOpenClawStatus` tracks runtime state. Channels need both.

**Prevention:**
1. **Clear state dependencies** — channels require `OpenClawStatus.Running`
2. **Disable channel UI when not applicable** — grey out if not installed
3. **Separate stores** — don't mix channel state with install state
4. **Handle state transitions** — what happens to channels when OpenClaw stops?

---

## Critical Pitfalls (From v1.0 Research)

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

## v1.1 Phase Mapping Summary

| Pitfall ID | Name | Severity | Phase to Address |
|------------|------|----------|------------------|
| LS-01 | Event Listener Memory Leaks | Critical | Log Streaming |
| LS-02 | Unbounded Log Buffer Growth | High | Log Streaming |
| LS-03 | Tauri Event Channel Backpressure | Medium | Log Streaming |
| LS-04 | Stream Cleanup on Cancellation | High | Log Streaming |
| UI-01 | GPU Compositing Layer Explosion | High | UI/UX Overhaul |
| UI-02 | Layout Thrashing During Animations | Medium | UI/UX Overhaul |
| UI-03 | Animation Library Bundle Weight | Low | UI/UX Overhaul |
| UI-04 | Inconsistent Animation Timing | Medium | UI/UX Overhaul |
| CH-01 | OAuth Token Storage Insecurity | Critical | Channel Management |
| CH-02 | WhatsApp QR Code Pairing Race | High | Channel Management |
| CH-03 | Channel Connection Status Staleness | Medium | Channel Management |
| CH-04 | OAuth Redirect URI Handling | High | Channel Management |
| CH-05 | Rate Limiting and API Abuse | Medium | Channel Management |
| INT-01 | Breaking Existing Progress Flow | High | Log Streaming |
| INT-02 | Animation Breaking Accessibility | Medium | UI/UX Overhaul |
| INT-03 | Channel State Interfering with Install | Medium | Channel Management |

---

## Sources

### v1.0 Sources
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

### v1.1 Sources (Domain Knowledge)
- Tauri event system documentation — event listener cleanup patterns
- React useEffect cleanup — standard React patterns for resource cleanup
- bollard crate documentation — Docker streaming API behavior
- CSS GPU compositing — Web platform animation performance characteristics
- OAuth 2.0 for desktop apps (RFC 8252) — redirect URI handling for native apps
- Platform API rate limit documentation (Discord, Telegram, Slack) — published limits
