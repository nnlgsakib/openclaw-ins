# Technology Stack

**Analysis Date:** 2026-03-31

## Languages

**Primary:**
- TypeScript ~6.0.2 - Frontend UI components, hooks, stores, pages
- Rust (stable 2021 edition) - Backend Tauri commands, Docker integration, process management

**Secondary:**
- CSS (via Tailwind) - Utility-first styling in `src/index.css`

## Runtime

**Environment:**
- Tauri v2 (WebView-based desktop app) - Native OS window with embedded webview
- Node.js - Required for OpenClaw gateway execution

**Package Manager:**
- pnpm 10.27.0 - Frontend dependencies (enforced via `packageManager` field)
- Cargo - Rust dependencies

**Lockfile:**
- `pnpm-lock.yaml` - present (via pnpm)
- `Cargo.lock` - present (via Cargo)

## Frameworks

**Core:**
- Tauri v2.10.x - Desktop app runtime with Rust backend + web frontend
- React 19.x - Frontend UI framework (`src/App.tsx`, `src/main.tsx`)
- Vite 8.0.x - Build tool and dev server (`vite.config.ts`)

**Styling:**
- Tailwind CSS v4.2.x - Utility-first CSS via `@tailwindcss/vite` plugin
- shadcn/ui pattern - Component library via Radix UI primitives + CVA

**State Management:**
- Zustand 5.x - Client state stores (`src/stores/ui.ts`, `src/stores/use-*.ts`)
- TanStack Query 5.x - Server/async state via `useQuery` hooks

**Testing:**
- Vitest 4.x - Test runner (dev dependency)
- @testing-library/react - React component testing

**Build/Dev:**
- Vite 8.0.x with React plugin - Dev server on port 1420
- Tauri CLI (`@tauri-apps/cli`) - `pnpm tauri dev`, `pnpm tauri build`

## Key Dependencies

**Frontend Critical:**
- `@tauri-apps/api` ^2 - IPC bridge to Rust backend via `invoke()`
- `@tanstack/react-query` ^5.95.2 - Async state management for Tauri commands
- `zustand` ^5.0.12 - UI state management
- `react-router-dom` ^7.13.2 - Client-side routing
- `openclaw` ^2026.3.24 - OpenClaw SDK (bundled in `node_modules/openclaw`)

**Tauri Plugins (Frontend):**
- `@tauri-apps/plugin-shell` ^2.3.5 - Process spawning
- `@tauri-apps/plugin-dialog` ^2.6.0 - Native dialogs
- `@tauri-apps/plugin-store` ^2.4.2 - Persistent key-value store
- `@tauri-apps/plugin-updater` ^2.10.0 - Self-update mechanism
- `@tauri-apps/plugin-notification` ^2.3.3 - System notifications
- `@tauri-apps/plugin-os` ^2.3.2 - OS info detection
- `@tauri-apps/plugin-process` ^2.3.1 - App exit/relaunch

**UI Components:**
- `@radix-ui/react-alert-dialog`, `react-separator`, `react-slot`, `react-switch`, `react-tooltip` - Headless primitives
- `class-variance-authority` ^0.7.1 - Component variant management
- `clsx` ^2.1.1 + `tailwind-merge` ^3.5.0 - Class merging utility
- `lucide-react` ^1.6.0 - Icon library
- `motion` 12.38.0 - Animation library
- `sonner` ^2.0.7 - Toast notifications

**Rust Critical (`src-tauri/Cargo.toml`):**
- `tauri` ^2 - Desktop app framework
- `bollard` 0.20 - Docker API client (async via Tokio)
- `tokio` 1.50.0 (full features) - Async runtime
- `serde` 1.x + `serde_json` 1.x - Serialization for IPC
- `thiserror` 2.x - Structured error types
- `anyhow` 1.x - Error context chaining
- `reqwest` 0.13 (json feature) - HTTP client for API calls
- `tokio-tungstenite` 0.29 - WebSocket client
- `image` 0.25 - Image processing (app icon)
- `uuid` 1.x (v4) - Unique ID generation
- `serde_yaml` 0.9 - YAML parsing
- `sysinfo` 0.38 - System information
- `dirs` 6 - Platform-specific directories
- `futures` / `futures-util` 0.3 - Async stream utilities
- `winreg` 0.55 - Windows registry access (cfg(windows) only)

**Tauri Plugins (Rust):**
- `tauri-plugin-shell` 2.3.5
- `tauri-plugin-dialog` 2
- `tauri-plugin-store` 2.4.2
- `tauri-plugin-notification` 2.3.3
- `tauri-plugin-os` 2.3.2
- `tauri-plugin-updater` 2
- `tauri-plugin-process` 2.3

## Configuration

**Environment:**
- `.env` file not detected in repository (likely gitignored)
- Key env vars used in code: `OPENCLAW_WORKSPACE`, `OPENCLAW_PORT`, `TAURI_DEV_HOST`

**Build Configuration:**
- `tsconfig.json` - TypeScript config with `@/*` path alias to `./src/*`
- `tsconfig.node.json` - Node-specific TypeScript config
- `vite.config.ts` - Vite with Tailwind + React plugins, port 1420, HMR on 1421
- `eslint.config.js` - ESLint with TypeScript + React Hooks rules
- `src-tauri/tauri.conf.json` - Tauri config (window size, CSP, updater endpoints, icons)

## Platform Requirements

**Development:**
- Node.js (for pnpm)
- Rust toolchain (for Tauri backend)
- Windows: Docker Desktop or Docker CLI in PATH

**Production:**
- Windows: `.msi` installer via Tauri bundler
- Linux: `.AppImage` / `.deb` via Tauri bundler
- Docker: Optional but recommended for sandboxed OpenClaw

---

*Stack analysis: 2026-03-31*
