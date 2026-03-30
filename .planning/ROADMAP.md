# Roadmap: ClawStation

**Created:** 2026-03-25
**Core Value:** Make OpenClaw installable and manageable by anyone — from download to daily use — without touching a terminal.

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-03-26)
- ✅ **v1.1 UX Polish & Channels** — Phases 7-10 (complete 2026-03-26)
- 🔲 **v2.0 Gateway Integration & Setup Wizard** — Phase 12 (config-first flow, Gateway WebSocket, real management)
- 🔲 **v1.2 OpenClaw Branding** — Phase 11 (theme redesign)

## Phases

### ✅ v1.1 UX Polish & Channels (Phases 7-10) — COMPLETE 2026-03-26

#### Phase 7: Installation UX & Animation Foundation

**Goal:** Replace fake install progress with real Docker logs and establish animation system.

**Requirements:** INST-10, INST-11, INST-12, UI-01, UI-02, UI-03, UI-04

**Success Criteria:**
1. User sees actual Docker layer downloads with per-layer progress bars during installation
2. Log viewer auto-scrolls but pauses when user scrolls up to read
3. All buttons respond with hover/press visual feedback
4. Loading states show skeleton placeholders instead of blank space
5. Page transitions are smooth with fade/slide animations

**Plans:** 9 plans

Plans:
- [x] 07-installation-ux-animation-foundation-01-PLAN.md — Create Docker log viewer and integrate into installation flow
- [x] 07-installation-ux-animation-foundation-02-PLAN.md — Implement per-layer progress tracking for Docker layers
- [x] 07-installation-ux-animation-foundation-03-PLAN.md — Enhance progress bar with spring physics animations
- [x] 07-installation-ux-animation-foundation-04-PLAN.md — Create animation utilities for consistent timing and spring presets
- [x] 07-installation-ux-animation-foundation-05-PLAN.md — Enhance button micro-interactions with Framer Motion
- [x] 07-installation-ux-animation-foundation-06-PLAN.md — Implement skeleton loading states for data-fetching pages
- [x] 07-installation-ux-animation-foundation-07-PLAN.md — Implement smooth page transitions throughout the application
- [x] 07-installation-ux-animation-foundation-08-PLAN.md — Final integration verification of all UX enhancements in installation step
- [x] 07-installation-ux-animation-foundation-09-PLAN.md — Gap closure: Docker log streaming + animation.ts wiring
---

#### Phase 8: Channel Management Core

**Goal:** Build channel overview UI and connection infrastructure.

**Requirements:** CHAN-01, CHAN-02, CMON-01

**Success Criteria:**
1. User sees list of all available channels (WhatsApp, Telegram, Discord, Slack) with status badges
2. User can connect/disconnect channels from the UI
3. App detects expired sessions and prompts for reconnection
4. Channel page is accessible from sidebar navigation

---

#### Phase 9: Channel Pairing Flows

**Goal:** Implement channel-specific setup wizards (QR, token entry).

**Requirements:** CHAN-03, CHAN-04, CHAN-05

**Success Criteria:**
1. User can pair WhatsApp by scanning QR code displayed in-app
2. User can set up Telegram bot with guided token entry and validation
3. User can set up Discord bot with guided token entry and validation
4. Setup wizards show clear instructions and error handling

---

#### Phase 10: Access Control & Activity

**Goal:** Add contact management and message activity monitoring.

**Requirements:** ACC-01, ACC-02, ACC-03, CMON-02

**Success Criteria:**
1. User can whitelist specific contacts allowed to message agent
2. User can approve/deny new contacts before they can chat
3. User can block/ban users from reaching agent
4. User can view recent message activity feed across all channels

---

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-26</summary>

- [x] Phase 1: Foundation (3/3 plans) — completed 2026-03-25
- [x] Phase 2: Docker Integration (2/2 plans) — completed 2026-03-25
- [x] Phase 3: Installation Engine (3/3 plans) — completed 2026-03-26
- [x] Phase 4: Configuration & Sandboxing (3/3 plans) — completed 2026-03-26
- [x] Phase 5: Monitoring (3/3 plans) — completed 2026-03-26
- [x] Phase 6: Lifecycle (3/3 plans) — completed 2026-03-26

</details>

### Phase 12: Gateway Integration & Setup Wizard

**Goal:** Make ClawStation actually work by connecting to the OpenClaw Gateway, providing a config-first setup wizard, and exposing real management APIs. The current app only manages Docker installation — this phase delivers actual Gateway integration.

**Requirements:** GW-01, GW-02, GW-03, GW-04, GW-05, GW-06, GW-07, GW-08, GW-09, GW-10, GW-11, GW-12, GW-13, GW-14, GW-15, GW-16, GW-17

**Success Criteria:**
1. Users see a setup wizard on first launch — configure model, API keys, sandbox, channels before installation
2. App detects Node.js 24+ (recommended) or 22.14+ (minimum) and installs OpenClaw via platform-specific install script
3. App starts/stops the OpenClaw Gateway process
4. App connects to Gateway WebSocket (JSON-RPC) for real-time status and config management
5. Dashboard shows live Gateway data (sessions, channels, status)
6. Config changes apply via Gateway hot-reload (config.patch with baseHash)
7. Channel management uses real Gateway API (not mock data)
8. OpenClaw Control UI accessible from webapp page when Gateway is running

**Plans:** 5 plans in 4 waves

Plans:
- [ ] 12-01-PLAN.md — Setup Wizard: Config-first multi-step wizard UI (Welcome → Model → API Keys → Sandbox → Channels → Review)
- [ ] 12-02-PLAN.md — Gateway Process Manager: Start/stop Gateway, Node.js detection, install script
- [ ] 12-03-PLAN.md — Gateway WebSocket Client: Connect to Gateway API (JSON-RPC), React hooks for real-time data
- [ ] 12-04-PLAN.md — Live Dashboard, Install Flow & Webapp: Real-time dashboard, Gateway startup page, OpenClaw UI page, sidebar indicator
- [ ] 12-05-PLAN.md — Channel Management via Gateway: Real channel config (correct field names), pairing dialogs, status monitoring

---

### Phase 13: Documentation & README

**Goal:** Replace the default Tauri template README with a production-grade project README covering features, architecture, tech stack, setup, and build instructions.

**Requirements:** (none — documentation phase)

**Success Criteria:**
1. README is 200+ lines of project-specific content — no boilerplate
2. All 9 pages, 50+ Tauri commands, 13 hooks documented
3. Tech stack versions match package.json and Cargo.toml exactly
4. Prerequisites, setup, and build instructions are complete and accurate
5. Project structure tree matches actual directory layout

**Plans:** 1 plan

Plans:
- [ ] 13-documentation-readme-01-PLAN.md — Deep codebase analysis and production-grade README.md

---

### Phase 11: OpenClaw Theme Redesign

**Goal:** Replace the current light blue/slate color palette with OpenClaw's official dark theme — deep black backgrounds with signature red (#ff5c5c) accents.

**Requirements:** UI-THEME-01, UI-THEME-02, UI-THEME-03

**Success Criteria:**
1. App background is dark (#0e1015) with layered depth surfaces
2. Primary accent is OpenClaw red (#ff5c5c) — buttons, links, focus rings
3. All text meets WCAG AA contrast ratios on dark backgrounds
4. All shadcn/ui components render correctly with new palette
5. Sidebar, cards, dialogs, badges all use dark theme tokens
6. No hardcoded light-theme colors remain in components

**Plans:** 3 plans

Plans:
- [ ] 11-openclaw-theme-redesign-01-PLAN.md — Update core CSS theme tokens and body/base styles
- [ ] 11-openclaw-theme-redesign-02-PLAN.md — Audit and fix components with hardcoded colors
- [ ] 11-openclaw-theme-redesign-03-PLAN.md — Visual verification and contrast audit

---

### Phase 15: Production Build Fixes

**Goal:** Fix three critical Windows production build bugs — CMD windows flashing when executing internal commands, installation verification hanging after package manager install, and PATH not containing Node.js global bin directories (causing "command not found" for npm/pnpm/yarn/openclaw).

**Requirements:** PROD-01, PROD-02

**Success Criteria:**
1. No visible CMD/console windows flash when the app executes internal commands on Windows production build
2. Installation verification (openclaw --version) completes within 30 seconds without hanging
3. All shell command execution paths use CREATE_NO_WINDOW flag (0x08000000) on Windows
4. Commands that exceed timeout return a clear error instead of hanging indefinitely
5. Production build can find npm, pnpm, yarn, and openclaw binaries (PATH augmented with global bin dirs)
6. All existing tests pass with zero regressions

**Plans:** 4 plans in 3 waves

Plans:
- [x] 15-01-PLAN.md — Create CREATE_NO_WINDOW helper module and migrate all 12 command/install files
- [ ] 15-02-PLAN.md — Fix 8 compilation errors (E0716 borrow checker) and warning in migrated files
- [ ] 15-03-PLAN.md — Migrate 3 install files (native_install, verify, docker_install) to use silent_cmd
- [ ] 15-04-PLAN.md — Fix production PATH: augment silent_cmd with Node.js global bin dirs + binary fallback lookup

---

### Phase 16: OpenClaw Full Integration (Dynamic Discovery)

**Goal:** Expose ALL OpenClaw capabilities dynamically in ClawStation — 27+ channels, 25+ providers, 24+ config sections — instead of hardcoding a small subset.

**Requirements:** DYN-01, DYN-02, DYN-03, DYN-04, DYN-05, DYN-06, DYN-07

**Success Criteria:**
1. Setup wizard shows all 25+ providers from OpenClaw metadata (not 20 hardcoded)
2. Setup wizard shows all 27+ channels from OpenClaw metadata (not 6 hardcoded)
3. Configure page exposes all 24+ config sections with schema-driven forms
4. Channel pairing dialogs dynamically generated from per-channel config schema
5. Provider list enriched by Gateway API when connected (real status)
6. New OpenClaw extensions automatically appear without ClawStation code changes
7. Channel config fields generated from JSON Schema (no hardcoded field definitions)

**Plans:** 4/4 plans complete

Plans:
- [x] 16-01-PLAN.md — Dynamic metadata extraction: Rust command to parse OpenClaw bundled metadata, extract channel/provider lists with schemas
- [x] 16-02-PLAN.md — Dynamic provider & channel lists: Update wizard store, channels page, configure page to use dynamic data
- [x] 16-03-PLAN.md — Schema-driven config editor: Dynamic form generation from OpenClaw config JSON Schema for all 24+ sections
- [x] 16-04-PLAN.md — Dynamic channel pairing: Generate pairing dialogs from per-channel config schema instead of hardcoded fields

---

### Phase 14: GitHub Workflows & CI/CD

**Goal:** Add professional GitHub Actions workflows for format checking, CI testing, cross-platform release builds with checksums, and dependency management. Ship installers for Linux (x64/arm64), Windows (x64), and macOS (Intel/Apple Silicon) via tagged releases.

**Requirements:** CI-LINT-01, CI-LINT-02, CI-BUILD-01, CI-BUILD-02, REL-01, REL-02, REL-03, REL-04, REL-05, DEP-01

**Success Criteria:**
1. Every push/PR triggers Rust (fmt, clippy) and TypeScript (tsc, eslint) lint checks
2. Every push/PR triggers build verification on Linux and Windows
3. Pushing a `v*` tag triggers full release builds on 5 platform/arch combinations
4. Release artifacts include AppImage, .deb, .msi, .dmg with SHA256 checksums
5. All artifacts auto-publish to GitHub Release with changelog
6. Dependabot manages weekly Rust and npm dependency updates

**Plans:** 2/3 plans complete

Plans:
- [x] 14-01-PLAN.md — CI workflows: lint checks (Rust + TypeScript) and build-test matrix
- [x] 14-02-PLAN.md — Release workflow: cross-platform builds, checksums, GitHub Release, dependabot
- [ ] 14-03-PLAN.md — Fix release workflow artifact handling (gap closure)

---

### Phase 17: Gateway Startup UX Fix

**Goal:** Fix the gateway startup status detection race condition and improve UX so users see accurate, real-time status instead of optimistic "connected" state before gateway is actually ready to serve the WebUI.

**Requirements:** GW-FIX-01, GW-FIX-02, GW-FIX-03

**Success Criteria:**
1. UI shows "Starting..." state while gateway process is initializing (not immediately "Connected")
2. Gateway status reflects actual readiness (health check passed, not just process spawned)
3. WebUI link only becomes clickable when gateway is confirmed ready to serve requests
4. Status transitions are smooth with clear visual feedback at each stage
5. No stale "connected" state if gateway crashes without emitting stopped event

**Plans:** 3/3 plans complete

Plans:
- [x] 17-gateway-startup-ux-fix-01-PLAN.md — Backend: Add health check polling to gateway status, expose startup phases via events
- [x] 17-gateway-startup-ux-fix-02-PLAN.md — Frontend: Add "starting" state to gateway store, update status indicator with phase feedback
- [x] 17-gateway-startup-ux-fix-03-PLAN.md — UX Polish: Add startup progress indicator, disable WebUI link until ready, add timeout handling

---

## Progress Table

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 17. Gateway Startup UX Fix | — | 3/3 | Complete    | 2026-03-30 |
| 16. OpenClaw Full Integration | v2.0 | 4/4 | Complete   | 2026-03-29 |
| 15. Production Build Fixes | — | 1/4 | In Progress | — |
| 14. GitHub Workflows & CI/CD | — | 2/3 | In Progress | — |
| 13. Documentation & README | — | 0/1 | 🔲 | — |
| 12. Gateway Integration & Setup | v2.0 | 0/5 | 🔲 | — |
| 11. OpenClaw Theme Redesign | v1.2 | 0/3 | 🔲 | — |
| 7. Installation UX & Animation | v1.1 | 9/9 | ✅ | 2026-03-26 |
| 8. Channel Management Core | v1.1 | 1/1 | ✅ | 2026-03-26 |
| 9. Channel Pairing Flows | v1.1 | 1/1 | ✅ | 2026-03-26 |
| 10. Access Control & Activity | v1.1 | 1/1 | ✅ | 2026-03-26 |

## v1.1 Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INST-10 | Phase 7 | ✅ |
| INST-11 | Phase 7 | ✅ |
| INST-12 | Phase 7 | ✅ |
| UI-01 | Phase 7 | ✅ |
| UI-02 | Phase 7 | ✅ |
| UI-03 | Phase 7 | ✅ |
| UI-04 | Phase 7 | ✅ |
| CHAN-01 | Phase 8 | ✅ |
| CHAN-02 | Phase 8 | ✅ |
| CMON-01 | Phase 8 | ✅ |
| CHAN-03 | Phase 9 | ✅ |
| CHAN-04 | Phase 9 | ✅ |
| CHAN-05 | Phase 9 | ✅ |
| ACC-01 | Phase 10 | ✅ |
| ACC-02 | Phase 10 | ✅ |
| ACC-03 | Phase 10 | ✅ |
| CMON-02 | Phase 10 | ✅ |

**Coverage:** 17/17 v1.1 requirements complete ✓

## v2.0 Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| GW-01 | Phase 12 | 🔲 |
| GW-02 | Phase 12 | 🔲 |
| GW-03 | Phase 12 | 🔲 |
| GW-04 | Phase 12 | 🔲 |
| GW-05 | Phase 12 | 🔲 |
| GW-06 | Phase 12 | 🔲 |
| GW-07 | Phase 12 | 🔲 |
| GW-08 | Phase 12 | 🔲 |
| GW-09 | Phase 12 | 🔲 |
| GW-10 | Phase 12 | 🔲 |
| GW-11 | Phase 12 | 🔲 |
| GW-12 | Phase 12 | 🔲 |
| GW-13 | Phase 12 | 🔲 |
| GW-14 | Phase 12 | 🔲 |
| GW-15 | Phase 12 | 🔲 |
| GW-16 | Phase 12 | 🔲 |
| GW-17 | Phase 12 | 🔲 |

**Coverage:** 0/17 v2.0 requirements planned ✓

## CI/CD Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CI-LINT-01 | Phase 14 | 🔲 |
| CI-LINT-02 | Phase 14 | 🔲 |
| CI-BUILD-01 | Phase 14 | 🔲 |
| CI-BUILD-02 | Phase 14 | 🔲 |
| REL-01 | Phase 14 | 🔲 |
| REL-02 | Phase 14 | 🔲 |
| REL-03 | Phase 14 | 🔲 |
| REL-04 | Phase 14 | 🔲 |
| REL-05 | Phase 14 | 🔲 |
| DEP-01 | Phase 14 | 🔲 |

**Coverage:** 0/10 CI/CD requirements planned ✓

## Production Build Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROD-01 | Phase 15 | 🔲 |
| PROD-02 | Phase 15 | 🔲 |

**Coverage:** 0/2 production build requirements planned ✓

## Full Integration Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DYN-01 | Phase 16 | 🔲 |
| DYN-02 | Phase 16 | 🔲 |
| DYN-03 | Phase 16 | 🔲 |
| DYN-04 | Phase 16 | 🔲 |
| DYN-05 | Phase 16 | 🔲 |
| DYN-06 | Phase 16 | 🔲 |
| DYN-07 | Phase 16 | 🔲 |

**Coverage:** 0/7 full integration requirements planned ✓

---

*For v1.0 phase details, see `.planning/milestones/v1.0-ROADMAP.md`*
