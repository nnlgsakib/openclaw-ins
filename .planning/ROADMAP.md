# Roadmap: OpenClaw Desktop

**Created:** 2026-03-25
**Core Value:** Make OpenClaw installable and manageable by anyone — from download to daily use — without touching a terminal.
**Granularity:** fine
**Total v1 Requirements:** 31

## Phases

- [ ] **Phase 1: Foundation** — Tauri v2 scaffold, security model, platform detection, error infrastructure
- [ ] **Phase 2: Docker Integration** — Docker health checks, WSL2 detection, container management layer
- [ ] **Phase 3: Installation Engine** — One-click install wizard, native install, system checks, verification
- [ ] **Phase 4: Configuration & Sandboxing** — Visual config editor, sandbox settings, tool policies, validation
- [ ] **Phase 5: Monitoring** — Status dashboard, agent sessions, activity logs, container status
- [ ] **Phase 6: Lifecycle** — Update notifications, one-click updates, clean uninstall

## Phase Details

### Phase 1: Foundation
**Goal**: Project scaffold is operational with platform detection, security model, and error infrastructure
**Depends on**: Nothing
**Requirements**: PLAT-01, PLAT-02, ERR-01
**Success Criteria** (what must be TRUE):
  1. App launches and displays a functional UI shell with navigation between pages
  2. App detects the current operating system (Windows or Linux) and adjusts behavior accordingly
  3. Technical errors encountered by the app are displayed as plain-language messages with suggested fixes
**Plans**: 3 plans
Plans:
- [ ] 01-foundation-01-PLAN.md — Project scaffold (Tauri v2 + dependencies + capabilities)
- [ ] 01-foundation-02-PLAN.md — UI shell + error infrastructure (sidebar, routing, AppError)
- [ ] 01-foundation-03-PLAN.md — Platform detection + dashboard + error display

### Phase 2: Docker Integration
**Goal**: App can reliably detect, health-check, and manage Docker on the current platform
**Depends on**: Phase 1
**Requirements**: INST-03, ERR-03
**Success Criteria** (what must be TRUE):
  1. App detects whether Docker is installed and running on the current system
  2. When Docker is missing on Windows, app shows WSL2 setup guidance with actionable steps
  3. When Docker Desktop is unavailable or misconfigured, app shows a clear error with recovery instructions
  4. Docker health check runs before any Docker-dependent operation
**Plans**: 2 plans
Plans:
- [x] 02-docker-integration-01-PLAN.md — Docker backend (Rust types, detection, health check commands)
- [x] 02-docker-integration-02-PLAN.md — Docker frontend (status hook, page UI, error messages)

### Phase 3: Installation Engine
**Goal**: User can install OpenClaw on their machine through a guided wizard
**Depends on**: Phase 2
**Requirements**: INST-01, INST-02, INST-04, INST-05, PLAT-03, ERR-02
**Success Criteria** (what must be TRUE):
  1. New user sees a first-run onboarding flow (system check → install → ready)
  2. User can complete a one-click Docker-based OpenClaw installation after system requirements pass
  3. User can install OpenClaw natively without Docker on supported platforms
  4. After installation completes, app automatically verifies the install by running a health check
  5. When installation fails, user sees a specific error message explaining what went wrong and how to fix it
**Plans**: 3 plans
Plans:
- [x] 03-installation-engine-01-PLAN.md — System check step (platform, Docker, Node.js, disk, RAM, port validation)
- [x] 03-installation-engine-02-PLAN.md — Installation orchestration (Docker and native install flows with progress tracking)
- [x] 03-installation-engine-03-PLAN.md — Verification and completion steps (health check, success/error screens)

### Phase 4: Configuration & Sandboxing
**Goal**: User can visually configure OpenClaw settings without editing files manually
**Depends on**: Phase 3
**Requirements**: CONF-01, CONF-02, CONF-03, CONF-04, CONF-05, CONF-06, SAND-01, SAND-02, SAND-03, SAND-04, SAND-05, SAND-06
**Success Criteria** (what must be TRUE):
  1. User can select their AI provider and model from a visual dropdown
  2. User can toggle sandboxing on/off and choose between Docker, SSH, or OpenShell backends
  3. User can configure sandbox scope (off, non-main, all), workspace access (none, read-only, read-write), and network policy
  4. User can select directories for sandbox bind mounts using a file picker
  5. User can enable/disable individual tools (shell, filesystem, browser, API) via toggle switches
  6. Config editor validates all changes before writing and shows the user if something is invalid
  7. When sandbox is enabled, app automatically runs setup scripts without manual intervention
**Plans**: 3 plans
Plans:
- [x] 04-configuration-sandboxing-01-PLAN.md — Config backend (Rust types, read/write/validate commands)
- [x] 04-configuration-sandboxing-02-PLAN.md — Config frontend (Zustand store, provider + sandbox UI)
- [x] 04-configuration-sandboxing-03-PLAN.md — Tool policies + agent defaults + sandbox setup trigger

### Phase 5: Monitoring
**Goal**: User can see what OpenClaw is doing in real-time from the desktop app
**Depends on**: Phase 2
**Requirements**: MON-01, MON-02, MON-03, MON-04
**Success Criteria** (what must be TRUE):
  1. User can see whether OpenClaw is running, stopped, or in an error state at a glance
  2. User can see a list of currently active agent sessions
  3. User can view streamed agent activity logs in the app
  4. User can see the status of sandbox containers (running, stopped, absent)
**Plans**: 3 plans
Plans:
- [x] 05-monitoring-01-PLAN.md — Monitoring backend (Rust types, Tauri commands for status/sessions/containers)
- [x] 05-monitoring-02-PLAN.md — Monitoring frontend (hooks, dashboard page replacing PageStub)
- [x] 05-monitoring-03-PLAN.md — Gap closure: container log streaming (backend command + frontend wiring)
**UI hint**: yes

### Phase 6: Lifecycle
**Goal**: User can keep OpenClaw updated and cleanly remove it when needed
**Depends on**: Phase 3
**Requirements**: LIFE-01, LIFE-02, LIFE-03, LIFE-04
**Success Criteria** (what must be TRUE):
  1. User is notified when a new version of OpenClaw is available
  2. User can update OpenClaw to the latest version with one click
  3. User can update the desktop app itself with one click
  4. User can uninstall OpenClaw completely (binary, config, sandbox containers)
  5. User can choose to preserve their configuration during uninstall
  **Plans**: 3 plans
  Plans:
  - [x] 06-lifecycle-01-PLAN.md — OpenClaw one-click update (backend + frontend)
  - [x] 06-lifecycle-02-PLAN.md — Desktop app auto-update (tauri-plugin-updater)
  - [x] 06-lifecycle-03-PLAN.md — Uninstall engine (clean removal + config preservation)
  **UI hint**: yes

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Planning complete | - |
| 2. Docker Integration | 0/2 | Planning complete | - |
| 3. Installation Engine | 0/3 | Planning complete | - |
| 4. Configuration & Sandboxing | 0/3 | Planning complete | - |
| 5. Monitoring | 0/2 | Planning complete | - |
| 6. Lifecycle | 0/3 | Planning complete | - |
