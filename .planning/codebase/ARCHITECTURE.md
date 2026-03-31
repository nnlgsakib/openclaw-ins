# Architecture

**Analysis Date:** 2026-03-31

## Pattern Overview

**Overall:** Tauri v2 Desktop Application with IPC Bridge Architecture

**Key Characteristics:**
- Hybrid Rust backend + React/TypeScript frontend communicating via Tauri IPC
- Event-driven architecture using Tauri events for real-time status updates
- Global state management with Zustand stores on frontend, Mutex-protected AppState on backend
- TanStack Query for async data fetching with caching
- HashRouter-based SPA with animated page transitions

## Layers

**Frontend (React/TypeScript):**
- Purpose: User interface, state presentation, user interactions
- Location: `src/`
- Contains: Pages, components, hooks, stores, utilities
- Depends on: Tauri API (`@tauri-apps/api`), TanStack Query, Zustand
- Used by: User via desktop window

**IPC Bridge (Tauri Invoke/Events):**
- Purpose: Typed communication between frontend and Rust backend
- Location: Implicit via `invoke()` calls and `listen()` event subscriptions
- Contains: Command invocations in hooks, event listeners in `use-gateway.ts`
- Depends on: `@tauri-apps/api/core`, `@tauri-apps/api/event`
- Used by: Frontend hooks and Rust command handlers

**Backend Commands (Rust Tauri Commands):**
- Purpose: Business logic, process management, Docker operations
- Location: `src-tauri/src/commands/`
- Contains: `#[tauri::command]` functions registered in `lib.rs`
- Depends on: Tokio async, bollard (Docker), reqwest (HTTP), serde
- Used by: Tauri runtime, invoked from frontend

**Domain Modules (Rust):**
- Purpose: Shared business logic across commands
- Location: `src-tauri/src/docker/`, `src-tauri/src/install/`
- Contains: Docker health checks, installation strategies (Docker/native)
- Depends on: bollard, process-wrap, tokio
- Used by: Command modules

**Application State (Rust):**
- Purpose: Persistent state managed via Tauri's `manage()`
- Location: `src-tauri/src/state.rs`
- Contains: `AppState` struct with platform, gateway PID, WebSocket connections
- Depends on: std::sync::Mutex, tokio::sync::Mutex
- Used by: All Tauri commands via `tauri::State`

## Data Flow

**Command Invocation Flow:**
1. Frontend component calls a custom hook (e.g., `useGatewayActions`)
2. Hook calls `invoke("command_name", { args })` from `@tauri-apps/api/core`
3. Tauri dispatches to corresponding `#[tauri::command]` function in Rust
4. Command reads/writes `AppState` via `tauri::State<'_, Mutex<AppState>>`
5. Command returns `Result<T, String>` serialized back to frontend
6. TanStack Query caches result, component re-renders

**Event-Driven Flow (Gateway):**
1. Rust backend spawns child process (OpenClaw gateway)
2. Tokio tasks stream stdout/stderr lines
3. Backend emits `gateway-output` events via `app.emit()`
4. Frontend `useGatewayStatusListener` hook receives events via `listen()`
5. Zustand store (`useGatewayStore`) updates state
6. React components subscribed to store re-render

**WebSocket Communication (Gateway API):**
1. Frontend calls `useGatewayConnection()` hook
2. Hook invokes `gateway_ws_connect` command
3. Rust opens tokio-tungstenite WebSocket to local gateway
4. Subsequent calls use `gateway_ws_call` for RPC-style requests
5. Responses routed via pending call HashMap with oneshot channels

## Key Abstractions

**Custom Hooks:**
- Purpose: Encapsulate Tauri IPC patterns, manage async state
- Examples: `src/hooks/use-gateway.ts`, `src/hooks/use-config.ts`, `src/hooks/use-install.ts`
- Pattern: Combine `invoke()` calls with TanStack Query `useQuery`/`useMutation`

**Zustand Stores:**
- Purpose: Global UI state not tied to server data
- Examples: `src/stores/use-gateway-store.ts`, `src/stores/use-wizard-store.ts`, `src/stores/ui.ts`
- Pattern: `create<StateType>()` with action methods

**Serde Bridge Types:**
- Purpose: Shared data structures between Rust and TypeScript
- Pattern: `#[derive(Serialize, Deserialize)]` with `#[serde(rename_all = "camelCase")]`
- Examples: `GatewayStatus`, `AppError`, `InstallResult`

**Error Types:**
- Purpose: Structured errors with user-facing suggestions
- Location: `src-tauri/src/error.rs`
- Pattern: `thiserror::Error` enum with `suggestion` field on every variant

## Entry Points

**Frontend Entry:**
- Location: `src/main.tsx`
- Triggers: Browser/WebView initialization
- Responsibilities: Mount React app, wrap with QueryClientProvider

**Router Entry:**
- Location: `src/router.tsx`
- Triggers: Route changes
- Responsibilities: HashRouter setup, page component mapping, AnimatePresence transitions

**Rust Entry:**
- Location: `src-tauri/src/main.rs` -> `src-tauri/src/lib.rs`
- Triggers: Tauri application startup
- Responsibilities: Plugin registration, command handler setup, AppState initialization

**Command Registration:**
- Location: `src-tauri/src/lib.rs` (lines 33-87)
- Triggers: `tauri::generate_handler![]` macro
- Responsibilities: Maps command names to Rust functions

## Error Handling

**Strategy:** Structured error types with user-facing suggestions

**Patterns:**
- Backend: `AppError` enum with `#[derive(thiserror::Error)]`, each variant has `suggestion` field
- Frontend: TanStack Query `onError` callbacks, toast notifications via `sonner`
- IPC: Commands return `Result<T, String>` - String errors are user-facing messages
- Hooks: Try-catch around `invoke()`, errors propagated to Zustand stores or React state

## Cross-Cutting Concerns

**Logging:** Gateway output streamed as Tauri events, displayed via `LogViewer` component
**Validation:** Config validation via dedicated `validate_config` command, schema-driven forms
**Authentication:** Gateway tokens managed in desktop config, passed to OpenClaw process
**Platform Detection:** `get_platform_info` command provides OS/arch details for conditional logic
**Process Management:** Silent command wrappers in `src-tauri/src/commands/silent.rs` with timeout support

---

*Architecture analysis: 2026-03-31*
