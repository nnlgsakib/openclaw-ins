# Requirements: OpenClaw Desktop

**Defined:** 2026-03-25
**Core Value:** Make OpenClaw installable and manageable by anyone — from download to daily use — without touching a terminal.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Installation

- [ ] **INST-01**: User can install OpenClaw via one-click Docker setup with system requirements pre-check
- [ ] **INST-02**: User can install OpenClaw natively on their machine (without Docker)
- [ ] **INST-03**: App detects Docker availability and guides installation if missing (Windows WSL path)
- [ ] **INST-04**: App verifies installation succeeded by running a health check post-install
- [ ] **INST-05**: App shows first-run onboarding (3-step: system check → install → ready)

### Configuration

- [ ] **CONF-01**: User can configure OpenClaw provider/model selection visually
- [ ] **CONF-02**: User can configure sandbox settings visually (mode, scope, workspace access)
- [ ] **CONF-03**: User can configure tool policies visually (which tools are allowed/denied)
- [ ] **CONF-04**: User can configure agent defaults visually (sandbox mode, autonomy)
- [ ] **CONF-05**: Config editor validates changes before writing (schema validation)
- [ ] **CONF-06**: User can configure bind mounts for sandbox (directory picker)

### Sandboxing

- [ ] **SAND-01**: User can enable/disable sandboxing with a toggle
- [ ] **SAND-02**: User can choose sandbox backend (Docker, SSH, OpenShell)
- [ ] **SAND-03**: User can set sandbox mode (off, non-main, all)
- [ ] **SAND-04**: User can set workspace access level (none, read-only, read-write)
- [ ] **SAND-05**: User can configure sandbox network policy (none, custom)
- [ ] **SAND-06**: App runs sandbox setup scripts automatically when sandbox is enabled

### Monitoring

- [ ] **MON-01**: User can see OpenClaw running status (running/stopped/error)
- [ ] **MON-02**: User can see active agent sessions
- [ ] **MON-03**: User can view agent activity logs (streamed)
- [ ] **MON-04**: User can see sandbox container status

### Lifecycle

- [ ] **LIFE-01**: User can update OpenClaw to newer versions with one click
- [ ] **LIFE-02**: User can update the desktop app itself (auto-updater)
- [ ] **LIFE-03**: User can uninstall OpenClaw cleanly (binary, config, containers)
- [ ] **LIFE-04**: User can choose to keep config on uninstall

### Error Handling

- [ ] **ERR-01**: App translates technical errors into plain language with fix suggestions
- [ ] **ERR-02**: App shows actionable error messages during install failures
- [ ] **ERR-03**: App handles Docker Desktop unavailability gracefully

### Platform

- [ ] **PLAT-01**: App works on Windows (including WSL2/Docker Desktop path)
- [ ] **PLAT-02**: App works on Linux (native + Docker)
- [ ] **PLAT-03**: App detects platform and adjusts install flow accordingly

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
| PLAT-01 | Phase 1 | Pending |
| PLAT-02 | Phase 1 | Pending |
| ERR-01 | Phase 1 | Pending |
| INST-03 | Phase 2 | Pending |
| ERR-03 | Phase 2 | Pending |
| INST-01 | Phase 3 | Pending |
| INST-02 | Phase 3 | Pending |
| INST-04 | Phase 3 | Pending |
| INST-05 | Phase 3 | Pending |
| PLAT-03 | Phase 3 | Pending |
| ERR-02 | Phase 3 | Pending |
| CONF-01 | Phase 4 | Pending |
| CONF-02 | Phase 4 | Pending |
| CONF-03 | Phase 4 | Pending |
| CONF-04 | Phase 4 | Pending |
| CONF-05 | Phase 4 | Pending |
| CONF-06 | Phase 4 | Pending |
| SAND-01 | Phase 4 | Pending |
| SAND-02 | Phase 4 | Pending |
| SAND-03 | Phase 4 | Pending |
| SAND-04 | Phase 4 | Pending |
| SAND-05 | Phase 4 | Pending |
| SAND-06 | Phase 4 | Pending |
| MON-01 | Phase 5 | Pending |
| MON-02 | Phase 5 | Pending |
| MON-03 | Phase 5 | Pending |
| MON-04 | Phase 5 | Pending |
| LIFE-01 | Phase 6 | Pending |
| LIFE-02 | Phase 6 | Pending |
| LIFE-03 | Phase 6 | Pending |
| LIFE-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓

**Phase distribution:**
- Phase 1: 3 requirements (PLAT-01, PLAT-02, ERR-01)
- Phase 2: 2 requirements (INST-03, ERR-03)
- Phase 3: 6 requirements (INST-01, INST-02, INST-04, INST-05, PLAT-03, ERR-02)
- Phase 4: 12 requirements (CONF-01–06, SAND-01–06)
- Phase 5: 4 requirements (MON-01–04)
- Phase 6: 4 requirements (LIFE-01–04)

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 after initial definition*
