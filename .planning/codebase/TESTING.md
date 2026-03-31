# Testing Patterns

**Analysis Date:** 2026-03-31

## Test Framework

**Runner:**
- Vitest v4.1.1 (listed in `devDependencies` in `/d/projects/rust/openclaw-ins/package.json`)
- Config: No `vitest.config.*` file found in project root; Vitest uses default config
- Vitest config exists in `openclaw/` subdirectory only (upstream dependency)

**Assertion Library:**
- Vitest built-in assertions (`expect`, `describe`, `it`)
- `@testing-library/jest-dom` v6.9.1 for DOM matchers
- `@testing-library/react` v16.3.2 for component testing

**Run Commands:**
```bash
pnpm test              # Run tests (if configured in package.json)
pnpm test:watch        # Watch mode (if configured)
pnpm test:coverage     # Coverage (if configured)
```

Note: No test scripts are currently defined in `package.json`. Testing infrastructure is installed but not yet configured with run scripts.

## Test File Organization

**Location:**
- No test files exist in the `src/` directory
- Tests are not yet implemented for the ClawStation codebase

**Naming:**
- Expected pattern: `*.test.ts` or `*.test.tsx` based on installed dependencies
- Based on CLAUDE.md recommendations, co-located tests alongside source

**Structure:**
- Expected: `src/components/`, `src/hooks/`, `src/lib/` would contain co-located test files

## Test Structure

**No existing tests in codebase.** Based on the installed dependencies (`@testing-library/react`, `vitest`), expected patterns would be:

```typescript
// Expected pattern based on dependencies
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

describe("ComponentName", () => {
  it("should render correctly", () => {
    render(<ComponentName />);
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });
});
```

**Suite Organization:**
- Not yet established

## Mocking

**Framework:**
- Vitest built-in mocking (`vi.mock`, `vi.fn`, `vi.spyOn`)

**Expected Patterns (for Tauri IPC):**
```typescript
// Mock Tauri invoke for unit testing hooks
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));
```

**What to Mock:**
- `@tauri-apps/api/core` (`invoke`) for hook unit tests
- `@tauri-apps/api/event` (`listen`) for event-based hooks
- External API calls
- Zustand stores when testing components that use them

**What NOT to Mock:**
- Pure utility functions (`cn`, `formatError`)
- Type definitions
- Constants

## Fixtures and Factories

**Test Data:**
- Not yet established
- Would benefit from factory functions for complex types like `DockerStatus`, `InstallProgress`, `GatewayState`

**Location:**
- Expected: `src/test/fixtures/` or co-located with test files

## Coverage

**Requirements:** None enforced currently

**View Coverage:**
- Would require adding `coverage` to Vitest config
- `@vitest/coverage-v8` or `@vitest/coverage-istanbul` would need to be added

## Test Types

**Unit Tests:**
- Hooks: Test individual hook logic with mocked Tauri IPC
- Utils: Test pure functions directly
- Stores: Test Zustand store actions and state updates

**Integration Tests:**
- Components: Test component rendering with mocked hooks
- Pages: Test page composition and navigation
- Not yet implemented

**E2E Tests:**
- Not used; no E2E testing framework detected
- Tauri integration tests exist in `src-tauri/tests/` (standard Tauri pattern, not created yet)

## Key Testing Targets (Not Yet Implemented)

**High Priority Hooks to Test:**
- `/d/projects/rust/openclaw-ins/src/hooks/use-docker.ts` - Docker health checking logic
- `/d/projects/rust/openclaw-ins/src/hooks/use-gateway.ts` - Gateway connection lifecycle
- `/d/projects/rust/openclaw-ins/src/hooks/use-install.ts` - Installation process

**High Priority Utils to Test:**
- `/d/projects/rust/openclaw-ins/src/lib/errors.ts` - Error formatting and pattern matching
- `/d/projects/rust/openclaw-ins/src/lib/utils.ts` - `cn()` utility

**High Priority Components to Test:**
- `/d/projects/rust/openclaw-ins/src/components/ui/button.tsx` - Variant rendering
- `/d/projects/rust/openclaw-ins/src/components/layout/app-shell.tsx` - Status display logic

**Rust Tests (Tauri):**
- `/d/projects/rust/openclaw-ins/src-tauri/src/commands/docker.rs` - Docker detection logic
- `/d/projects/rust/openclaw-ins/src-tauri/src/error.rs` - Error serialization

## Vitest Configuration (Recommended)

To enable testing, create `/d/projects/rust/openclaw-ins/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
```

Add test script to `package.json`:
```json
"scripts": {
  "test": "vitest",
  "test:watch": "vitest --watch",
  "test:coverage": "vitest --coverage"
}
```

---

*Testing analysis: 2026-03-31*
