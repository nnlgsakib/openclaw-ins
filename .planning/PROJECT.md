# OpenClaw Desktop

## What This Is

A Tauri desktop application that makes OpenClaw — the viral open-source AI agent platform — accessible to non-technical users. It provides a visual interface for the full OpenClaw lifecycle: installing (via Docker or native), configuring, sandboxing, monitoring, updating, and uninstalling. Windows and Linux are primary targets; macOS works but isn't the focus.

## Core Value

Make OpenClaw installable and manageable by anyone — from download to daily use — without touching a terminal.

## Requirements

### Validated

- ✓ App works on Windows (including WSL/Docker path) — Phase 1
- ✓ App works on Linux (native + Docker) — Phase 1
- ✓ App translates technical errors into plain language with fix suggestions — Phase 1
- ✓ App detects Docker availability and guides installation if missing — Phase 2
- ✓ App handles Docker Desktop unavailability gracefully — Phase 2
- ✓ User can install OpenClaw via one-click Docker setup — Phase 3
- ✓ User can install OpenClaw natively on their machine — Phase 3
- ✓ User can configure sandboxing (Docker isolation, workspace access, bind mounts) — Phase 4
- ✓ User can manage all OpenClaw config visually (models, skills, permissions, integrations) — Phase 4

### Active

- [ ] User can monitor OpenClaw agent status and activity
- [ ] User can update OpenClaw to newer versions
- [ ] User can uninstall OpenClaw cleanly

### Out of Scope

- [macOS-focused polish] — macOS users can build from source; Unix similarity makes it work but we're not optimizing UX for it yet
- [Mobile companion app] — Desktop-first; mobile monitoring comes later
- [Multi-user/team management] — Single-user desktop app for v1
- [Custom agent creation UI] — Users configure existing agents, don't build new ones from scratch

## Context

- OpenClaw is a CLI-based AI agent platform (100+ GitHub stars, viral in 2026)
- It runs locally, connects to apps (WhatsApp, Slack, Discord, email, calendars)
- It can execute tools: shell commands, filesystem ops, browser automation, API calls
- Sandboxing uses Docker/SSH/OpenShell backends with configurable workspace access
- The target audience is non-technical users who want AI agents without CLI complexity
- Tauri provides a lightweight native app (Rust backend + web frontend)

## Constraints

- **Tech stack**: Tauri v2 (Rust + web frontend), not Electron
- **Platforms**: Windows + Linux primary; macOS secondary
- **OpenClaw version**: Must support current OpenClaw config format and sandboxing API
- **Docker dependency**: Docker must be installable/available for sandboxed mode
- **Security**: Sandboxing config must not expose dangerous defaults (e.g., full host access by default)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tauri over Electron | Smaller bundle, native performance, Rust security | — Pending |
| Docker-first sandboxing | OpenClaw's primary sandbox backend is Docker | — Pending |
| Windows + Linux primary | Biggest pain point is CLI install on these platforms | — Pending |
| Full config exposure | Users should never need to edit YAML/JSON manually | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-26 after Phase 4: Configuration & Sandboxing*
