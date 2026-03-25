<!-- GSD:project-start source:PROJECT.md -->
## Project

**OpenClaw Desktop**

A Tauri desktop application that makes OpenClaw — the viral open-source AI agent platform — accessible to non-technical users. It provides a visual interface for the full OpenClaw lifecycle: installing (via Docker or native), configuring, sandboxing, monitoring, updating, and uninstalling. Windows and Linux are primary targets; macOS works but isn't the focus.

**Core Value:** Make OpenClaw installable and manageable by anyone — from download to daily use — without touching a terminal.

### Constraints

- **Tech stack**: Tauri v2 (Rust + web frontend), not Electron
- **Platforms**: Windows + Linux primary; macOS secondary
- **OpenClaw version**: Must support current OpenClaw config format and sandboxing API
- **Docker dependency**: Docker must be installable/available for sandboxed mode
- **Security**: Sandboxing config must not expose dangerous defaults (e.g., full host access by default)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Tauri** | 2.10.x | Desktop app runtime | Chosen over Electron (5-15MB vs 150-200MB bundles, <1s startup, Rust security model). v2 is stable with mature plugin ecosystem. |
| **React** | 19.x | Frontend UI framework | Dominant ecosystem (91% adoption), shadcn/ui only supports React, Zustand+TanStack Query stack is React-native, largest talent pool. Svelte 5 and SolidJS are faster but lack ecosystem depth for this project's needs. |
| **TypeScript** | 5.x | Type safety | Non-negotiable for IPC type safety between React frontend and Rust backend. Catches serde serialization mismatches at compile time. |
| **Vite** | 8.0.x | Build tool & dev server | Now ships with Rolldown (Rust-based bundler), 10-30x faster builds than Vite 7, first-class Tauri integration. |
| **Rust** | stable (1.87+) | Backend language | Required by Tauri. Memory safety, fearless concurrency, Tokio async runtime for Docker/process management. |
### Styling & UI Components
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Tailwind CSS** | 4.2.x | Utility-first CSS | v4 is a ground-up rewrite with Rust-based engine (5x faster), CSS-native `@theme` config, zero PostCSS dependency. The standard for 2026. |
| **shadcn/ui** | latest | Component collection | Not a library—copy-paste components you own. Built on Radix UI primitives (accessible, headless) + Tailwind. 65K+ GitHub stars, used by Vercel/Supabase. Provides forms, dialogs, tables, navigation out of the box. |
| **Radix UI** | latest | Headless primitives | Foundation that shadcn/ui builds on. Handles keyboard nav, focus management, ARIA. We consume via shadcn/ui, not directly. |
| **Lucide Icons** | latest | Icon library | Clean, consistent SVG icons. Pairs well with Tailwind/shadcn stack. ~1500 icons covering all UI needs. |
### State Management
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Zustand** | 5.x | Global client state | ~1KB, no providers, no boilerplate. Manages UI state (sidebar, modals, selected items), auth session, user preferences. The 2026 consensus for client state. |
| **TanStack Query** | 5.x | Server/async state | ~5M weekly downloads. Handles Tauri command results as "server state"—caching, loading states, error handling, background refetch, optimistic updates. Prevents the anti-pattern of storing async results in Zustand. |
### Rust Backend Crates
| Crate | Version | Purpose | When to Use |
|-------|---------|---------|-------------|
| **bollard** | 0.20.x | Docker API client | All Docker operations: check/install Docker, create/manage containers, pull images, manage volumes. Async via Tokio. Supports Unix sockets + Windows named pipes. |
| **tokio** | 1.x | Async runtime | Required by Tauri. All async Rust commands run on Tokio's thread pool. Use `#[tokio::process::Command]` for spawning child processes. |
| **serde** | 1.x | Serialization | IPC data types. Use `#[serde(rename_all = "camelCase")]` on structs shared with frontend—Rust snake_case ↔ JS camelCase bridge. |
| **serde_json** | 1.x | JSON handling | Parse OpenClaw config files (YAML→JSON bridge if needed), Docker API responses. |
| **thiserror** | 2.x | Error types | Define domain-specific errors (DockerError, InstallError, ConfigError). Structured error propagation to frontend. |
| **anyhow** | 1.x | Error context | Application-level error handling with context chains. Use in command implementations. |
| **process-wrap** | 9.1.x | Process management | Composable process wrappers: process groups, kill-on-drop, cross-platform (POSIX + Windows job objects). For managing long-running OpenClaw/Docker processes. |
| **reqwest** | 0.13.x | HTTP client | Download OpenClaw releases, check for updates, GitHub API calls. Async with Tokio. |
### Tauri Plugins (Official)
| Plugin | Version | Purpose | Notes |
|--------|---------|---------|-------|
| **tauri-plugin-shell** | 2.3.x | Spawn child processes | Execute shell commands, manage long-running processes. Scoped permissions via capabilities. Primary mechanism for running CLI tools. |
| **tauri-plugin-dialog** | 2.6.x | Native system dialogs | File pickers, confirmation dialogs, alerts. Use XDG portal on Linux for Flatpak compatibility. |
| **tauri-plugin-store** | 2.4.x | Persistent key-value store | App settings, user preferences, last-known state. Async file-based persistence. |
| **tauri-plugin-updater** | 2.10.x | Auto-update | Self-update the installer app itself. Supports static JSON endpoints or update servers. |
| **tauri-plugin-fs** | latest | Filesystem access | Scoped file operations. Read/write OpenClaw configs, manage workspace directories. |
| **tauri-plugin-notification** | latest | System notifications | Notify user of install progress, updates available, errors. |
| **tauri-plugin-process** | 2.3.x | Process control | App exit/relaunch after updates. |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| **pnpm** | Package manager | Fast, disk-efficient. Use for frontend deps. |
| **Cargo** | Rust package manager | Standard for Rust. |
| **rust-analyzer** | Rust LSP | Essential for IDE support. |
| **Tauri CLI** (`@tauri-apps/cli`) | Dev/build tooling | `npm run tauri dev`, `npm run tauri build`. |
| **ESLint + Prettier** | Linting/formatting | Standard React/TS tooling. |
| **Vitest** | Frontend testing | Fast, Vite-native test runner. Mock `invoke` for unit tests. |
| **GitHub Actions** | CI/CD | `tauri-apps/tauri-action` for cross-platform builds. Matrix strategy for Win/Linux/macOS. |
## Installation
# Scaffold project (choose React + TypeScript)
# Frontend dependencies
# Dev dependencies
# shadcn/ui components (after setup)
# Rust dependencies (add to Cargo.toml)
# bollard = "0.20"
# tokio = { version = "1", features = ["full"] }
# serde = { version = "1", features = ["derive"] }
# serde_json = "1"
# thiserror = "2"
# anyhow = "1"
# process-wrap = { version = "9.1", features = ["tokio1"] }
# reqwest = { version = "0.13", features = ["json"] }
## Alternatives Considered
| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| Frontend | React 19 | Svelte 5 | If team is Svelte-native and no shadcn/ui needed. Svelte has smaller bundles and better Tauri affinity (compile-time optimized). But shadcn/ui ecosystem is a hard requirement for this project. |
| Frontend | React 19 | SolidJS 1.9 | For performance-critical dashboards with heavy re-renders. SolidJS has fine-grained reactivity (no virtual DOM). But ecosystem is too small (~2-4% adoption). |
| UI Components | shadcn/ui | Mantine | If you want a traditional component library with more pre-built complex components (date pickers, rich text editors). But adds runtime dependency weight. |
| UI Components | shadcn/ui | Ant Design | For enterprise-heavy data tables/forms. But too opinionated visually for a consumer desktop app. |
| CSS | Tailwind v4 | CSS Modules | If team prefers scoped CSS without utility classes. But Tailwind v4's speed and shadcn/ui integration make it the clear default. |
| State | Zustand | Redux Toolkit | For large teams (10+ devs) needing strict action/reducer patterns. Overkill for this project size. |
| Docker | bollard | docker-cli wrapper | Shelling out to `docker` CLI is simpler but loses type safety, error handling, and progress streaming. bollard provides typed Rust API over Docker socket. |
| Process | process-wrap | std::process::Command | For simple one-shot commands. But process-wrap gives cross-platform process groups, kill-on-drop, and Windows job objects—critical for managing OpenClaw lifecycle. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Electron** | 150-200MB bundles, 300-500MB RAM, ships entire Chromium | Tauri v2 (5-15MB, native webview) |
| **Redux** | Massive boilerplate, overkill for this state complexity | Zustand + TanStack Query |
| **styled-components / Emotion** | Runtime CSS-in-JS overhead, dying ecosystem | Tailwind CSS v4 |
| **Material UI (MUI)** | Heavy runtime, hard to customize, doesn't match desktop UX patterns | shadcn/ui (you own the code) |
| **Webpack** | Slow, complex config, being replaced | Vite 8 (Rolldown-based) |
| **JavaScript (no types)** | IPC type mismatches between React and Rust will cause runtime bugs | TypeScript with shared type definitions |
| **npm** | Slower than pnpm, phantom dependency issues | pnpm |
| **Dockerode (Node)** | This is a Rust backend, not Node.js | bollard (Rust Docker client) |
| **reqwest + manual JSON** | For Tauri commands, use Tauri's built-in invoke/IPC | Tauri commands via `#[tauri::command]` |
| **React Context for all state** | Causes unnecessary re-renders, no caching | Zustand (frequent updates) + TanStack Query (async) |
## Stack Patterns for This Project
### Pattern: Tauri Command → TanStack Query
### Pattern: Rust State with Mutex
### Pattern: Serde Bridge
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Tauri 2.10.x | @tauri-apps/api 2.10.x | JS and Rust versions must match |
| Tailwind v4 | shadcn/ui (latest) | shadcn officially supports v4 as of Feb 2025 |
| Vite 8 | @tailwindcss/vite 4.2.x | Tailwind v4.2.2 added Vite 8 support |
| React 19 | TanStack Query 5.x | Full compatibility |
| React 19 | Zustand 5.x | Full compatibility |
| bollard 0.20 | tokio 1.x | Both use Tokio async runtime |
| Tauri plugins 2.x | tauri 2.10.x | All official plugins track Tauri v2 releases |
| process-wrap 9.1 | tokio 1.x | Enable `tokio1` feature flag |
## Sources
- [Tauri v2 Release Page](https://v2.tauri.app/release/) — tauri v2.10.3 confirmed latest stable (HIGH)
- [Tauri v2 Shell Plugin](https://v2.tauri.app/plugin/shell/) — Official docs, process management (HIGH)
- [Tauri v2 Store Plugin](https://v2.tauri.app/plugin/store/) — Official docs, persistence (HIGH)
- [Tauri v2 Capabilities](https://v2.tauri.app/security/capabilities/) — Security model (HIGH)
- [bollard on crates.io](https://crates.io/crates/bollard) — v0.20.1, Docker API client (HIGH)
- [process-wrap on crates.io](https://crates.io/crates/process-wrap) — v9.1.0, process management (HIGH)
- [Vite 8 Announcement](https://vite.dev/blog/announcing-vite8) — Rolldown integration, March 2026 (HIGH)
- [Tailwind v4.2.2 Release](https://github.com/tailwindlabs/tailwindcss/releases/tag/v4.2.2) — Vite 8 support (HIGH)
- [shadcn/ui Guide 2026](https://designrevision.com/blog/shadcn-ui-guide) — Ecosystem status (MEDIUM)
- [React State Management 2026](https://ncctcr.com/blog/react-state-management-2026) — Zustand + TanStack Query pattern (MEDIUM)
- [Tauri + Svelte Stack](https://medium.com/@puneetpm/native-apps-reimagined-why-tauri-rust-and-svelte-is-my-go-to-stack-in-2025-209f5b2937a1) — Alternative framework consideration (MEDIUM)
- [ClawPier Reddit](https://www.reddit.com/r/rust/comments/1rztfsz/clawpier_a_tauri_v2_desktop_app_for_managing/) — Real Tauri v2 + bollard Docker manager app (MEDIUM)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
