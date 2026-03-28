# Roadmap: OpenClaw Desktop

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

**Goal:** Make OpenClaw Desktop actually work by connecting to the OpenClaw Gateway, providing a config-first setup wizard, and exposing real management APIs. The current app only manages Docker installation — this phase delivers actual Gateway integration.

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

## Progress Table

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
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

---

*For v1.0 phase details, see `.planning/milestones/v1.0-ROADMAP.md`*
