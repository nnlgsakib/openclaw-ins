# Requirements: OpenClaw Desktop

**Defined:** 2026-03-25
**Updated:** 2026-03-26 (v1.1 milestone)
**Core Value:** Make OpenClaw installable and manageable by anyone — from download to daily use — without touching a terminal.

## v1.1 Requirements

Requirements for v1.1 UX Polish & Channels milestone.

### Installation UX (Enhanced)

- [x] **INST-10**: User sees real-time Docker logs during installation (not fake percentage)
- [x] **INST-11**: User sees per-layer progress bars showing individual download status
- [x] **INST-12**: Log viewer auto-scrolls to latest but pauses when user scrolls up

### UI/UX Polish

- [x] **UI-01**: All buttons have hover/press micro-interactions with visual feedback
- [x] **UI-02**: Loading states show skeleton placeholders instead of blank space
- [x] **UI-03**: Page transitions use smooth fade/slide animations
- [x] **UI-04**: Spring physics animations for progress bars and status changes

### Channel Management

- [ ] **CHAN-01**: User can view list of all available channels with connection status
- [ ] **CHAN-02**: User can connect/disconnect channels from the UI
- [ ] **CHAN-03**: User can pair WhatsApp via in-app QR code display
- [ ] **CHAN-04**: User can set up Telegram bot with guided token entry
- [ ] **CHAN-05**: User can set up Discord bot with guided token entry

### Access Control

- [ ] **ACC-01**: User can whitelist specific contacts allowed to message agent
- [ ] **ACC-02**: User can approve/deny new contacts before they can chat
- [ ] **ACC-03**: User can block/ban specific users from reaching agent

### Channel Monitoring

- [ ] **CMON-01**: User can see connection health with auto-detect of expired sessions
- [ ] **CMON-02**: User can view recent message activity feed across all channels

## v1 Requirements (Complete)

Requirements for initial release. Each maps to roadmap phases.

### Installation

- [x] **INST-01**: User can install OpenClaw via one-click Docker setup with system requirements pre-check
- [x] **INST-02**: User can install OpenClaw natively on their machine (without Docker)
- [x] **INST-03**: App detects Docker availability and guides installation if missing (Windows WSL path)
- [x] **INST-04**: App verifies installation succeeded by running a health check post-install
- [x] **INST-05**: App shows first-run onboarding (3-step: system check → install → ready)

### Configuration

- [x] **CONF-01**: User can configure OpenClaw provider/model selection visually
- [x] **CONF-02**: User can configure sandbox settings visually (mode, scope, workspace access)
- [x] **CONF-03**: User can configure tool policies visually (which tools are allowed/denied)
- [x] **CONF-04**: User can configure agent defaults visually (sandbox mode, autonomy)
- [x] **CONF-05**: Config editor validates changes before writing (schema validation)
- [x] **CONF-06**: User can configure bind mounts for sandbox (directory picker)

### Sandboxing

- [x] **SAND-01**: User can enable/disable sandboxing with a toggle
- [x] **SAND-02**: User can choose sandbox backend (Docker, SSH, OpenShell)
- [x] **SAND-03**: User can set sandbox mode (off, non-main, all)
- [x] **SAND-04**: User can set workspace access level (none, read-only, read-write)
- [x] **SAND-05**: User can configure sandbox network policy (none, custom)
- [x] **SAND-06**: App runs sandbox setup scripts automatically when sandbox is enabled

### Monitoring

- [x] **MON-01**: User can see OpenClaw running status (running/stopped/error)
- [x] **MON-02**: User can see active agent sessions
- [x] **MON-03**: User can view agent activity logs (streamed)
- [x] **MON-04**: User can see sandbox container status

### Lifecycle

- [x] **LIFE-01**: User can update OpenClaw to newer versions with one click
- [x] **LIFE-02**: User can update the desktop app itself (auto-updater)
- [x] **LIFE-03**: User can uninstall OpenClaw cleanly (binary, config, containers)
- [x] **LIFE-04**: User can choose to keep config on uninstall

### Error Handling

- [x] **ERR-01**: App translates technical errors into plain language with fix suggestions
- [x] **ERR-02**: App shows actionable error messages during install failures
- [x] **ERR-03**: App handles Docker Desktop unavailability gracefully

### Platform

- [x] **PLAT-01**: App works on Windows (including WSL2/Docker Desktop path)
- [x] **PLAT-02**: App works on Linux (native + Docker)
- [x] **PLAT-03**: App detects platform and adjusts install flow accordingly

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Provider Setup

- **PROV-01**: Guided provider selection wizard (what do you want to do → recommend provider)
- **PROV-02**: API key entry with connection test
- **PROV-03**: Pre-configured profiles for common setups

### Security

- **SECU-01**: Visual security health check (scan config, show risk level, suggest fixes)
- **SECU-02**: Pre-built security profiles (Starter, Balanced, Locked Down)
- **SECU-03**: Security audit of sandbox configuration

### Presets

- **PRES-01**: Template/preset system (Coding Assistant, Personal Secretary, Research Agent)
- **PRES-02**: Presets configure sandbox, tools, and integrations in one click

### Workspace

- **WORK-01**: Visual directory picker for agent workspace access
- **WORK-02**: Permission indicators (none/ro/rw) for each directory

## Out of Scope

| Feature | Reason |
|---------|--------|
| Built-in terminal | Defeats purpose of "no terminal needed" — link to system terminal instead |
| Custom agent creation UI | Agent creation requires deep understanding of skills/tools — power-user feature |
| Plugin/extension marketplace | Massive scope (moderation, security review, hosting) — defer post-launch |
| Multi-machine fleet management | Enterprise feature — single-user desktop app for v1 |
| Cloud-hosted OpenClaw | Changes product from desktop manager to SaaS — stay local |
| Real-time everything | Polling everywhere drains battery — poll on focus, refresh button |
| macOS-focused polish | macOS users can build from source; Unix similarity makes it work |
| Mobile companion app | Desktop-first; mobile monitoring comes later |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLAT-01 | Phase 1 | Complete |
| PLAT-02 | Phase 1 | Complete |
| ERR-01 | Phase 1 | Complete |
| INST-03 | Phase 2 | Complete |
| ERR-03 | Phase 2 | Complete |
| INST-01 | Phase 3 | Complete |
| INST-02 | Phase 3 | Complete |
| INST-04 | Phase 3 | Complete |
| INST-05 | Phase 3 | Complete |
| PLAT-03 | Phase 3 | Complete |
| ERR-02 | Phase 3 | Complete |
| CONF-01 | Phase 4 | Complete |
| CONF-02 | Phase 4 | Complete |
| CONF-03 | Phase 4 | Complete |
| CONF-04 | Phase 4 | Complete |
| CONF-05 | Phase 4 | Complete |
| CONF-06 | Phase 4 | Complete |
| SAND-01 | Phase 4 | Complete |
| SAND-02 | Phase 4 | Complete |
| SAND-03 | Phase 4 | Complete |
| SAND-04 | Phase 4 | Complete |
| SAND-05 | Phase 4 | Complete |
| SAND-06 | Phase 4 | Complete |
| MON-01 | Phase 5 | Complete |
| MON-02 | Phase 5 | Complete |
| MON-03 | Phase 5 | Complete |
| MON-04 | Phase 5 | Complete |
| LIFE-01 | Phase 6 | Complete |
| LIFE-02 | Phase 6 | Complete |
| LIFE-03 | Phase 6 | Complete |
| LIFE-04 | Phase 6 | Complete |
| INST-10 | Phase 7 | Complete |
| INST-11 | Phase 7 | Complete |
| INST-12 | Phase 7 | Complete |
| UI-01 | Phase 7 | Complete |
| UI-02 | Phase 7 | Complete |
| UI-03 | Phase 7 | Complete |
| UI-04 | Phase 7 | Complete |
| CHAN-01 | Phase 8 | Pending |
| CHAN-02 | Phase 8 | Pending |
| CMON-01 | Phase 8 | Pending |
| CHAN-03 | Phase 9 | Pending |
| CHAN-04 | Phase 9 | Pending |
| CHAN-05 | Phase 9 | Pending |
| ACC-01 | Phase 10 | Pending |
| ACC-02 | Phase 10 | Pending |
| ACC-03 | Phase 10 | Pending |
| CMON-02 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 31 total (all complete)
- v1.1 requirements: 16 total (all mapped)
- Mapped to phases: 47/47 ✓
- Unmapped: 0

**Phase distribution (v1):**
- Phase 1: 3 requirements (PLAT-01, PLAT-02, ERR-01)
- Phase 2: 2 requirements (INST-03, ERR-03)
- Phase 3: 6 requirements (INST-01, INST-02, INST-04, INST-05, PLAT-03, ERR-02)
- Phase 4: 12 requirements (CONF-01–06, SAND-01–06)
- Phase 5: 4 requirements (MON-01–04)
- Phase 6: 4 requirements (LIFE-01–04)

**Phase distribution (v1.1):**
- Phase 7: 7 requirements (INST-10–12, UI-01–04)
- Phase 8: 3 requirements (CHAN-01–02, CMON-01)
- Phase 9: 3 requirements (CHAN-03–05)
- Phase 10: 4 requirements (ACC-01–03, CMON-02)

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-26 after v1.1 roadmap creation*
