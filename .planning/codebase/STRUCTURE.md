# Codebase Structure

**Analysis Date:** 2026-03-31

## Directory Layout

```
openclaw-ins/
├── src/                    # React/TypeScript frontend
│   ├── assets/             # Static assets (images, icons)
│   ├── components/         # Reusable UI components
│   │   ├── channels/       # Channel management components
│   │   ├── config/         # Configuration section components
│   │   ├── install/        # Installation wizard step components
│   │   ├── layout/         # App shell, header, sidebar
│   │   ├── status/         # Status display components
│   │   ├── ui/             # shadcn/ui primitives (button, card, dialog, etc.)
│   │   └── wizard/         # Setup wizard step components
│   ├── config/             # Frontend configuration files
│   ├── hooks/              # Custom React hooks for Tauri IPC
│   ├── lib/                # Utility functions, error helpers
│   ├── pages/              # Route-level page components
│   └── stores/             # Zustand state stores
├── src-tauri/              # Rust backend (Tauri v2)
│   ├── capabilities/       # Tauri security capability definitions
│   ├── gen/                # Generated schemas
│   ├── icons/              # App icons (all platforms)
│   └── src/
│       ├── commands/       # Tauri command handlers
│       ├── docker/         # Docker health check logic
│       └── install/        # Installation strategies
├── design-system/          # Design tokens and component docs
├── dist/                   # Build output
├── openclaw/               # OpenClaw related files
└── public/                 # Public static assets
```

## Directory Purposes

**`src/components/ui/`:**
- Purpose: Base shadcn/ui component library
- Contains: button, card, dialog, input, badge, alert, switch, progress, skeleton, log-viewer, layer-progress
- Key files: `button.tsx`, `card.tsx`, `dialog.tsx`, `log-viewer.tsx`

**`src/components/layout/`:**
- Purpose: Application chrome and navigation
- Contains: App shell with sidebar, header, navigation
- Key files: `app-shell.tsx`, `header.tsx`, `sidebar-nav.tsx`

**`src/hooks/`:**
- Purpose: Encapsulate Tauri IPC calls and state management
- Contains: Custom hooks wrapping `invoke()` with TanStack Query
- Key files: `use-gateway.ts`, `use-config.ts`, `use-install.ts`, `use-channels.ts`

**`src/stores/`:**
- Purpose: Global UI state via Zustand
- Contains: Gateway connection state, wizard state, config state, onboarding state
- Key files: `use-gateway-store.ts`, `use-wizard-store.ts`, `use-config-store.ts`

**`src/pages/`:**
- Purpose: Route-level components
- Contains: One component per route (dashboard, install, configure, monitor, channels, settings, docker, setup-wizard)
- Key files: `dashboard.tsx`, `install.tsx`, `configure.tsx`, `monitor.tsx`

**`src-tauri/src/commands/`:**
- Purpose: All Tauri command handlers
- Contains: One module per domain (docker, install, config, gateway, channels, monitoring, etc.)
- Key files: `gateway.rs`, `install.rs`, `config.rs`, `docker.rs`, `channels.rs`, `monitoring.rs`

**`src-tauri/src/docker/`:**
- Purpose: Docker daemon health checks and detection
- Contains: Platform-specific Docker detection logic
- Key files: `check.rs`

**`src-tauri/src/install/`:**
- Purpose: Installation strategies and progress tracking
- Contains: Docker install, native install, progress reporting, verification
- Key files: `docker_install.rs`, `native_install.rs`, `progress.rs`, `verify.rs`

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React app bootstrap, QueryClient setup
- `src/router.tsx`: Route definitions, HashRouter, animated transitions
- `src/App.tsx`: Root component (thin wrapper around AppRouter)
- `src-tauri/src/main.rs`: Rust entry point, calls `run()`
- `src-tauri/src/lib.rs`: Tauri builder, plugin/command registration (lines 33-87)

**Configuration:**
- `src-tauri/Cargo.toml`: Rust dependencies (not read, standard Tauri location)
- `package.json`: Frontend dependencies and scripts
- `vite.config.ts`: Vite build configuration
- `tsconfig.json`: TypeScript configuration
- `src-tauri/capabilities/`: Tauri security permissions

**Core Logic:**
- `src-tauri/src/state.rs`: AppState definition (platform, gateway_pid, WebSocket)
- `src-tauri/src/error.rs`: AppError enum with user-facing suggestions
- `src-tauri/src/commands/gateway.rs`: Gateway lifecycle management
- `src/hooks/use-gateway.ts`: Frontend gateway state and actions
- `src/stores/use-gateway-store.ts`: Zustand store for gateway connection

**Testing:**
- No test files detected in current codebase

## Naming Conventions

**Files:**
- Components: kebab-case (`app-shell.tsx`, `sidebar-nav.tsx`, `error-banner.tsx`)
- Hooks: `use-` prefix with kebab-case (`use-gateway.ts`, `use-config.ts`, `use-install.ts`)
- Stores: `use-` prefix with kebab-case (`use-gateway-store.ts`, `use-wizard-store.ts`)
- Rust modules: snake_case (`gateway.rs`, `desktop_config.rs`, `system_check.rs`)

**Directories:**
- All lowercase, kebab-case for multi-word (`design-system`)
- Rust modules follow Rust conventions (snake_case)

**Types:**
- Rust: PascalCase (`AppState`, `AppError`, `GatewayStartupPhase`)
- TypeScript: PascalCase interfaces (`GatewayStatusResult`, `GatewayConnectionResult`)
- Serde bridge types use `#[serde(rename_all = "camelCase")]` for JS compatibility

**Functions:**
- Rust: snake_case (`start_gateway`, `check_docker_health`, `get_platform_info`)
- TypeScript: camelCase (`setConnected`, `useGatewayActions`, `fetchProviderModels`)

## Where to Add New Code

**New Feature (Frontend + Backend):**
- Frontend hook: `src/hooks/use-{feature}.ts`
- Frontend store: `src/stores/use-{feature}-store.ts` (if global state needed)
- Frontend components: `src/components/{domain}/{component}.tsx`
- Frontend page: `src/pages/{feature}.tsx`
- Rust commands: `src-tauri/src/commands/{feature}.rs`
- Register in: `src-tauri/src/commands/mod.rs` and `src-tauri/src/lib.rs` handler list

**New Component/Module:**
- shadcn/ui primitives: `src/components/ui/`
- Feature-specific components: `src/components/{domain}/`
- Page-level: `src/pages/`

**New Tauri Command:**
1. Create function in `src-tauri/src/commands/{module}.rs` with `#[tauri::command]`
2. Add to `mod.rs` exports
3. Register in `src-tauri/src/lib.rs` `invoke_handler`
4. Create frontend hook using `invoke()` in `src/hooks/`

**Utilities:**
- Frontend helpers: `src/lib/utils.ts`, `src/lib/errors.ts`, `src/lib/toast-errors.ts`
- Rust shared logic: Create new module in `src-tauri/src/` with `mod.rs` pattern

## Special Directories

**`.planning/`:**
- Purpose: GSD workflow planning artifacts
- Generated: Yes (by GSD commands)
- Committed: Yes

**`src-tauri/gen/`:**
- Purpose: Auto-generated Tauri schemas
- Generated: Yes (by Tauri build process)
- Committed: Partially (schemas only)

**`design-system/`:**
- Purpose: Design tokens and component documentation
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-03-31*
