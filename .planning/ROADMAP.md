# Roadmap: OpenClaw Desktop

**Created:** 2026-03-25
**Core Value:** Make OpenClaw installable and manageable by anyone — from download to daily use — without touching a terminal.

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-03-26)
- ✅ **v1.1 UX Polish & Channels** — Phases 7-10 (complete 2026-03-26)

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

## Progress Table

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
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

---

*For v1.0 phase details, see `.planning/milestones/v1.0-ROADMAP.md`*
