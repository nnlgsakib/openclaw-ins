# Coding Conventions

**Analysis Date:** 2026-03-31

## Naming Patterns

**Files (Frontend):**
- Components: `kebab-case.tsx` (e.g., `app-shell.tsx`, `sidebar-nav.tsx`, `step-install.tsx`)
- Hooks: `use-{name}.ts` (e.g., `use-docker.ts`, `use-gateway.ts`, `use-install.ts`)
- Stores: `use-{name}-store.ts` or `ui.ts` (e.g., `use-gateway-store.ts`, `use-config-store.ts`)
- Pages: `kebab-case.tsx` (e.g., `dashboard.tsx`, `configure.tsx`, `setup-wizard.tsx`)
- Utilities: `kebab-case.ts` (e.g., `errors.ts`, `toast-errors.ts`, `utils.ts`)
- Types are co-located with implementations, not in separate files

**Files (Rust Backend):**
- Modules: `snake_case.rs` (e.g., `docker.rs`, `gateway_ws.rs`, `desktop_config.rs`)
- Organized by domain under `commands/`, `docker/`, `install/`

**Functions:**
- Frontend: `camelCase` (e.g., `handleStartGateway`, `formatError`, `cleanInstallDir`)
- Rust: `snake_case` (e.g., `check_docker_health`, `connect_docker`)

**Variables:**
- Frontend: `camelCase` (e.g., `gatewayConnected`, `isSaving`, `baseHash`)
- Rust: `snake_case` (e.g., `socket_exists`, `version_info`)

**Types/Interfaces:**
- PascalCase (e.g., `DockerStatus`, `InstallProgress`, `GatewayState`, `AppError`)
- Props interfaces: `{ComponentName}Props` (e.g., `AppShellProps`, `StatusBannerDisconnectedProps`)
- Zustand store state interfaces: `{Domain}State` (e.g., `UIState`, `GatewayState`)

**Constants:**
- UPPER_SNAKE_CASE for true constants
- camelCase for exported config objects

## Code Style

**Formatting:**
- Tool: ESLint (v10.1.0) with typescript-eslint
- No Prettier config detected; code uses consistent formatting manually
- Line length: no explicit limit enforced
- Semicolons: used consistently
- Quotes: double quotes in Rust, single or double quotes in TypeScript (inconsistent)

**Linting:**
- ESLint config: `/d/projects/rust/openclaw-ins/eslint.config.js`
- Plugins: `react-hooks` (recommended rules), `react-refresh` (warn on non-component exports)
- TypeScript: `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- Ignores: `dist`, `src-tauri`, `.claude`, `.gemini`, `.opencode`

**TypeScript:**
- Target: ES2020
- Module resolution: bundler
- Path alias: `@/*` maps to `./src/*`
- All components use explicit TypeScript interfaces for props

## Import Organization

**Order (Frontend):**
1. External packages (`react`, `react-router-dom`, `@tanstack/react-query`)
2. Tauri APIs (`@tauri-apps/api/core`, `@tauri-apps/api/event`)
3. Local imports with `@/` alias (`@/hooks/use-docker`, `@/components/ui/button`)
4. Type-only imports where appropriate

**Example:**
```typescript
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { useGatewayStore } from "@/stores/use-gateway-store";
import { Button } from "@/components/ui/button";
```

**Path Aliases:**
- `@/` maps to `src/` (configured in `tsconfig.json` and `vite.config.ts`)
- Use `@/` for all internal imports; never use relative paths for non-sibling files

## Error Handling

**Frontend Patterns:**
- Centralized error infrastructure in `/d/projects/rust/openclaw-ins/src/lib/errors.ts`
- `formatError(error: unknown): AppError` - converts unknown errors to `{message, suggestion}`
- `showError(error)` in `/d/projects/rust/openclaw-ins/src/lib/toast-errors.ts` - displays errors as toast notifications
- Pattern: try/catch with `showError()` in catch block
- Tauri commands return `Result<T, AppError>` which maps to frontend errors

**Backend (Rust) Patterns:**
- Custom `AppError` enum in `/d/projects/rust/openclaw-ins/src-tauri/src/error.rs`
- Every error variant includes a `suggestion: String` field for user-facing guidance
- Uses `#[serde(rename_all = "camelCase")]` for frontend compatibility
- Uses `#[derive(Debug, thiserror::Error, Serialize)]` for error traits
- Commands return `Result<T, AppError>` with descriptive error construction

**Common Pattern:**
```typescript
try {
  await invoke("command_name", { params });
  toast.success("Operation succeeded");
} catch (e) {
  showError(e);
}
```

## Logging

**Framework:** Sonner for toast notifications

**Patterns:**
- `toast.success(message)` for successful operations
- `toast.error(message, { description: suggestion })` for errors
- No console.log in production code; errors go through toast system

## Comments

**When to Comment:**
- JSDoc-style comments on custom hooks explaining purpose and behavior (e.g., `useDockerHealth`)
- Section dividers in Rust code: `// --- Private helpers ---`
- Phase/version annotations in `lib.rs`: `// Gateway integration (Phase 12)`

**JSDoc/TSDoc:**
- Used on hooks and complex functions to explain behavior
- Includes `@param`, `@returns` when applicable
- Example from `use-install.ts`: Documents event listening pattern and mutation behavior

## Function Design

**Size:**
- Functions are kept focused and short (typically under 50 lines)
- Private helpers separated from public API (e.g., `check_docker_linux`, `connect_docker` in Rust)

**Parameters:**
- Hooks accept configuration objects or minimal primitives
- Rust commands use named parameters via Tauri attribute

**Return Values:**
- Hooks return objects with data, loading states, and action functions
- Tauri commands return `Result<T, AppError>`

## Module Design

**Exports:**
- Components: default exports for pages, named exports for UI primitives
- Hooks: named exports only (e.g., `export function useDockerHealth()`)
- Utilities: named exports
- Rust: `#[tauri::command]` annotated functions are auto-registered in `lib.rs`

**Barrel Files:**
- UI components use barrel exports (e.g., `@/components/ui/card.tsx` exports `Card`, `CardHeader`, etc.)
- No index.ts barrel files in directories; imports go directly to files

## State Management

**Zustand (Client State):**
- Stores in `/d/projects/rust/openclaw-ins/src/stores/`
- Pattern: `create<StoreState>((set) => ({ ... }))`
- Direct access via `useStore.getState()` for non-reactive access in callbacks
- Selectors for specific state slices: `useGatewayStore((s) => s.connected)`

**TanStack Query (Server/Async State):**
- Used for all Tauri command invocations
- Query keys: `["resource", "action"]` format (e.g., `["docker", "health"]`)
- Mutations for write operations with `onSuccess` for cache invalidation
- `staleTime` configured per-query based on data freshness needs

## Component Patterns

**UI Components (shadcn/ui style):**
- `React.forwardRef` for all UI primitives
- `cn()` utility for className merging
- `class-variance-authority` (cva) for variant definitions
- Variant props typed via `VariantProps<typeof variants>`
- `asChild` prop pattern using Radix `Slot` for composition

**Page Components:**
- Exported as default from page files
- Contain layout and composition logic
- Sub-components defined below the main component (private to file)

**Form Handling:**
- No form library; manual state with `useState` or Zustand stores
- Validation through Tauri commands or client-side checks
- Save via `useMutation` pattern

---

*Convention analysis: 2026-03-31*
