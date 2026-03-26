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
- ✓ User can monitor OpenClaw agent status and activity — Phase 5
- ✓ User can update OpenClaw to newer versions — Phase 6
- ✓ User can uninstall OpenClaw cleanly — Phase 6
- ✓ Real-time Docker log streaming during installation (replace fake percentage) — Phase 7
- ✓ Show actual pull progress, layer downloads, container startup — Phase 7
- ✓ Make installation feel alive and trustworthy — Phase 7
- ✓ Micro-interactions and animations throughout — Phase 7
- ✓ Loading states, transitions, hover effects — Phase 7

### Active

#### v1.1: UX Polish & Channels

**UI/UX Overhaul**
- [ ] Modern, interactive design (not flat)
- [ ] Better visual hierarchy and feedback
- [ ] Consistent design language across all pages

**Channel Management (NEW)**
- [ ] Visual UI for connecting social apps (WhatsApp, Telegram, Discord, Slack, etc.)
- [ ] QR code pairing flow for WhatsApp
- [ ] Bot token setup for Telegram/Discord
- [ ] Connection status and health monitoring
- [ ] Pairing/approval controls (who can message your agent)

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
| Tauri v2 over Electron | Smaller bundle, native performance, Rust security model | ✓ Validated v1.0 |
| Docker-first sandboxing | OpenClaw's primary sandbox backend is Docker | ✓ Validated v1.0 |
| Windows + Linux primary | Biggest pain point is CLI install on these platforms | ✓ Validated v1.0 |
| Full config exposure | Users should never need to edit YAML/JSON manually | ✓ Validated v1.0 |
| Docker connection duplicated in monitoring.rs | 10 lines vs coupling with docker.rs | ✓ Validated v1.0 |
| Log streaming placeholder pattern | Frontend API stable before backend exists | ✓ Validated v1.0 |

## Current Milestone: v1.1 UX Polish & Channels

**Goal:** Transform the flat MVP into a polished, interactive experience with real-time feedback and channel management.

**Target features:**
- Real installation progress with Docker log streaming
- UI/UX overhaul with animations and micro-interactions
- Channel management for social app connections (WhatsApp, Telegram, Discord, etc.)

## Current State

**Shipped:** v1.0 MVP (2026-03-26)
**Scope:** 7 phases, 18 plans, 37/31 requirements validated
**Codebase:** ~28k LOC across ~170 files (Rust + TypeScript)
**Tech stack:** Tauri v2 + React 19 + TypeScript + Tailwind v4 + shadcn/ui + bollard + Zustand + TanStack Query + motion (Framer Motion)

### What's Working
- Full onboarding wizard: system check → method selection → install → verification → ready
- Docker and native installation paths with real-time log streaming and per-layer progress bars
- Visual config editor: provider, sandbox, tools, agents settings
- Real-time monitoring dashboard: status, sessions, containers, log streaming
- One-click updates (OpenClaw + desktop app) with progress
- Clean uninstall with config preservation option
- Polished UI: skeleton loading states, button micro-interactions, page transition animations

### Known Technical Debt
- `setup_sandbox` backend command stubbed (frontend handles gracefully)
- `cargo check` blocked in headless CI (missing GTK dev libs)
- tauri-plugin-updater requires manual signing key generation

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
*Last updated: 2026-03-26 after Phase 07 (installation-ux-animation-foundation) completion*
