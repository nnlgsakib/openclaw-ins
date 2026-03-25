# Architecture Patterns: OpenClaw Desktop Installer

**Domain:** Tauri v2 desktop app managing system-level tool installations (Docker, CLI tools, services)
**Researched:** 2026-03-25
**Overall confidence:** HIGH

## Recommended Architecture

Based on Tauri v2 official docs, ClawPier (a production Tauri v2 app managing OpenClaw bots via Docker), Orca Desktop (complex container management), and Docker Desktop clones — all using the same pattern.

### Layered Architecture

```
┌─────────────────────────────────────────────────────┐
│              React Frontend (WebView)                │
│  Zustand store ← Tauri events → invoke() calls      │
│  Pages: Install · Configure · Monitor · Update      │
└──────────────────────────┬──────────────────────────┘
                           │ Tauri IPC Bridge
                           │ invoke() ↔ #[tauri::command]
┌──────────────────────────▼──────────────────────────┐
│              Tauri Core Process (Rust)               │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Commands    │  │   State     │  │  Events     │ │
│  │  (IPC API)   │  │ (AppState)  │  │ (streaming) │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                 │         │
│  ┌──────▼──────────────────────────────────▼──────┐ │
│  │              Business Logic Layer               │ │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐  │ │
│  │  │ DockerMgr  │ │ NativeMgr  │ │ ConfigMgr  │  │ │
│  │  │ (bollard)  │ │ (shell/fs) │ │ (serde)    │  │ │
│  │  └────────────┘ └────────────┘ └────────────┘  │ │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐  │ │
│  │  │ Installer  │ │ Updater    │ │ Monitor    │  │ │
│  │  └────────────┘ └────────────┘ └────────────┘  │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │              Persistence Layer                  │ │
│  │  JSON files (~/.config/openclaw-installer/)     │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
         │                    │
┌────────▼────────┐  ┌───────▼────────┐
│  Docker Engine  │  │ Host System    │
│  (bollard API)  │  │ (filesystem,   │
│  docker.sock    │  │  shell, PATH)  │
└─────────────────┘  └────────────────┘
```

**Source:** ClawPier architecture (verified production pattern), Tauri v2 Process Model docs, Orca Desktop architecture.

## Component Boundaries

### 1. Frontend Layer (React + Zustand)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Pages** | Route-level views: Install Wizard, Config Editor, Monitor Dashboard, Update Manager | Zustand store |
| **Zustand Store** | Global frontend state: installation status, sandbox configs, agent status | `invoke()` wrappers, Tauri events |
| **Hooks** | Tauri event subscriptions, streaming data (logs, stats) | `@tauri-apps/api/event` |
| **`lib/tauri.ts`** | Typed `invoke()` wrappers for all IPC commands | Rust commands via IPC |

**Pattern:** Frontend is a "control surface" — it displays state and sends commands. All business logic lives in Rust. This follows Tauri's security model where the WebView should never hold secrets or make system decisions.

### 2. IPC Command Layer

| Command Category | Example Commands | Data Flow |
|-----------------|------------------|-----------|
| **System Check** | `check_docker`, `check_native_deps`, `get_system_info` | Frontend → Rust → shell/fs → Frontend |
| **Installation** | `install_docker_openclaw`, `install_native_openclaw`, `uninstall_openclaw` | Frontend → Rust → Docker/Shell → events → Frontend |
| **Config** | `read_config`, `write_config`, `validate_config`, `list_models` | Frontend → Rust → serde/filesystem → Frontend |
| **Sandbox** | `get_sandbox_config`, `update_sandbox_config`, `set_workspace_path` | Frontend → Rust → config + Docker → Frontend |
| **Monitor** | `list_containers`, `get_agent_status`, `start_log_stream` | Frontend → Rust → Docker API → events → Frontend |
| **Update** | `check_updates`, `perform_update`, `rollback_update` | Frontend → Rust → Docker/GitHub API → Frontend |

**Pattern:** All commands are `async fn` with `#[tauri::command]`. Async prevents blocking the WebView. Return `Result<T, AppError>` for proper error propagation.

**Source:** Tauri v2 IPC docs, ClawPier `commands.rs` (verified production pattern).

### 3. System Operations Layer

#### DockerManager

| Operation | Mechanism | Library |
|-----------|-----------|---------|
| Check Docker availability | `docker info` or bollard `ping()` | bollard 0.18 |
| List containers | bollard `list_containers()` with name filters | bollard |
| Create/start/stop/remove | bollard container lifecycle | bollard |
| Pull images | bollard `create_image()` with streaming progress | bollard + tokio streams |
| Stream logs | bollard `logs()` with follow flag | bollard + Tauri events |
| Resource stats | bollard `stats()` streaming | bollard + Tauri events |
| Exec commands | bollard `exec_create()` + `exec_start()` | bollard |
| Compose operations | Shell out to `docker compose` | tauri-plugin-shell |

**Why bollard:** It's the standard Docker API client for Rust, async-first (tokio), and used by ClawPier, Orca Desktop, and Dockerman in production. Direct socket communication (`/var/run/docker.sock`) — no CLI dependency for core operations.

**Source:** bollard crate docs, ClawPier `docker_manager.rs`, Orca Desktop architecture.

#### NativeInstaller

| Operation | Mechanism | Notes |
|-----------|-----------|-------|
| Detect OS/platform | `std::env::consts::OS`, `ARCH` | Built-in |
| Check if OpenClaw installed | `which openclaw` or check `~/.openclaw/` | Shell plugin |
| Install via npm/npx | `npm install -g openclaw` | Shell plugin |
| Install Docker (if missing) | Platform-specific: brew/winget/apt/yum | Shell plugin with sudo handling |
| Verify installation | Run `openclaw --version` | Shell plugin |
| PATH management | Check/modify shell profiles | Filesystem + shell |

**Source:** Tauri plugin-shell docs, OpenClaw installation docs.

#### ConfigManager

| Operation | Mechanism | Notes |
|-----------|-----------|-------|
| Read `openclaw.json` | `serde_json` deserialization | Typed config struct |
| Read `openclaw-config.yaml` | `serde_yaml` deserialization | For sandbox-specific config |
| Write config | Serialize + atomic write (write temp, rename) | Prevents corruption on crash |
| Validate config | Schema validation or serde bounds | Prevents invalid states |
| Merge defaults | Deep merge with default config | For new installations |
| Manage `.env` vars | Read/write API keys, env vars | For provider configuration |

**Config locations:**
- `~/.openclaw/openclaw.json` — Main config (models, providers, auth, agents)
- `~/.openclaw/openclaw-config.yaml` — Sandbox-specific config (tools.fs, network)
- `~/.openclaw/workspace/` — Agent working directory (bind-mounted into containers)

**Source:** OpenClaw Docker setup guides (verified 2026), Docker blog on OpenClaw sandboxing.

### 4. State Management (Rust Backend)

```rust
// Pattern from ClawPier (verified production code)
pub struct AppState {
    pub docker_manager: Mutex<DockerManager>,
    pub native_installer: Mutex<NativeInstaller>,
    pub config_manager: Mutex<ConfigManager>,
    pub install_state: Mutex<InstallState>,
    pub stream_manager: Mutex<StreamManager>,
}
```

| State Type | Contents | Mutability Pattern |
|-----------|----------|-------------------|
| `DockerManager` | bollard client handle, cached container info | `Mutex` — commands lock for operations |
| `InstallState` | `Installing(Progress)`, `Installed(Version)`, `NotInstalled`, `Error(String)` | `Mutex` — updated by async install tasks |
| `ConfigManager` | Cached config values, file paths | `Mutex` — read-heavy, write on save |
| `StreamManager` | Active log/stats streams, cleanup handles | `Mutex` — streams added/removed per session |

**State registration in `lib.rs`:**
```rust
tauri::Builder::default()
    .setup(|app| {
        app.manage(Mutex::new(AppState::new()));
        // Start background status polling (5s interval)
        start_status_polling(app.handle().clone());
        Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        check_docker, install_docker_openclaw, /* ... */
    ])
```

**Source:** Tauri v2 State Management docs, ClawPier `state.rs` and `lib.rs` (verified).

### 5. Event Streaming (Backend → Frontend)

Events are fire-and-forget, one-way messages for real-time updates. This is Tauri's recommended pattern for streaming data from backend to frontend.

| Event Name | Payload | Frequency | Purpose |
|-----------|---------|-----------|---------|
| `install-progress` | `{step, percent, message}` | During install | Progress bar updates |
| `container-status` | `{id, status, health}` | Every 5s | Dashboard status |
| `log-line` | `{container_id, timestamp, line}` | Real-time | Log viewer |
| `stats-update` | `{container_id, cpu, memory, network}` | Every 2s | Resource monitoring |
| `config-changed` | `{path, timestamp}` | On save | Config editor refresh |
| `update-available` | `{current, available}` | On check | Update notification |

**Pattern:** Backend spawns `tokio::spawn` polling loops that `emit()` events. Frontend subscribes with `listen()` from `@tauri-apps/api/event`. Zustand store updates from event callbacks.

**Source:** Tauri v2 IPC docs (Events section), ClawPier `streaming.rs`, long-running async task tutorial.

### 6. Persistence Layer

| Data | Location | Format | Access |
|------|----------|--------|--------|
| App settings | `~/.config/openclaw-installer/settings.json` | JSON | serde |
| Installation records | `~/.config/openclaw-installer/installations.json` | JSON | serde |
| Cached configs | In-memory (loaded from `~/.openclaw/`) | Struct | On read |
| Logs | `~/.config/openclaw-installer/logs/` | Rolling files | tracing |

**Pattern:** Atomic writes (write to temp file, then rename) to prevent corruption. Auto-save on every mutation. Name/ID uniqueness enforced.

**Source:** ClawPier `bot_store.rs` (verified pattern), Tauri Store plugin docs.

## Data Flow Examples

### Flow 1: One-Click Docker Install

```
User clicks "Install OpenClaw (Docker)"
    │
    ▼
Frontend: invoke("install_docker_openclaw", { config })
    │
    ▼
Rust Command: install_docker_openclaw()
    ├─ Check Docker availability (bollard ping)
    │   └─ emit("install-progress", {step: "checking_docker", 10%})
    ├─ Pull OpenClaw image (bollard create_image with streaming)
    │   └─ emit("install-progress", {step: "pulling_image", percent: 30-70%})
    ├─ Create config directories (~/.openclaw/)
    │   └─ emit("install-progress", {step: "creating_config", 80%})
    ├─ Write default openclaw.json (ConfigManager)
    │   └─ emit("install-progress", {step: "writing_config", 90%})
    ├─ Create + start container (bollard)
    │   └─ emit("install-progress", {step: "starting", 95%})
    └─ Save installation record (persist)
        └─ emit("install-progress", {step: "complete", 100%})
            emit("container-status", {id: "...", status: "running"})
    │
    ▼
Frontend: Zustand store updates → UI shows "Running ✓"
```

### Flow 2: Config Edit → Live Reload

```
User edits sandbox config (workspace access: "ro" → "rw")
    │
    ▼
Frontend: invoke("update_sandbox_config", { config })
    │
    ▼
Rust Command: update_sandbox_config()
    ├─ Validate new config (schema check)
    ├─ Write to ~/.openclaw/openclaw.json (atomic)
    ├─ Restart affected containers (bollard stop + start)
    │   └─ emit("container-status", {id, status: "restarting"})
    └─ emit("config-changed", {path: "agents.defaults.sandbox"})
    │
    ▼
Frontend: Config editor shows ✓ saved, container cards refresh
```

### Flow 3: Real-Time Monitoring

```
User opens Monitor dashboard
    │
    ▼
Frontend: invoke("start_stats_stream", { container_id })
    │
    ▼
Rust Command: start_stats_stream()
    └─ StreamManager spawns tokio task:
        loop {
            stats = bollard.stats(container_id)  // streaming API
            emit("stats-update", {cpu, memory, network})
            sleep(2s)
        }
    │
    ▼
Frontend: useTauriEvent("stats-update") → Zustand → chart re-renders
```

## Security Architecture

```
┌─────────────────────────────────────────────┐
│           WebView (Frontend)                │
│  - No secrets stored                        │
│  - No direct system access                  │
│  - CSP restricts script sources             │
└──────────────────┬──────────────────────────┘
                   │ IPC (JSON-RPC like)
┌──────────────────▼──────────────────────────┐
│           Core Process (Rust)               │
│  - ALL secrets (API keys, tokens)           │
│  - ALL system operations                    │
│  - ACL validates every command              │
│  - Capabilities defined in                 │
│    capabilities/default.json                │
└─────────────────────────────────────────────┘
```

**Key principle:** Frontend is a "control surface" — it never handles secrets, never makes system decisions. All sensitive operations go through typed IPC commands that the Core process validates.

**Source:** Tauri v2 Security docs, Tauri Process Model docs.

## Platform-Specific Considerations

| Concern | Windows | Linux |
|---------|---------|-------|
| Docker detection | Docker Desktop or WSL2 Docker Engine | Docker Engine (systemd service) |
| Docker socket | `//var/run/docker.sock` (named pipe via WSL2) | `/var/run/docker.sock` |
| Native install | `npm` via winget/Chocolatey, or bundled Node.js | `npm` via apt/yum/pacman |
| PATH resolution | Registry-based PATH, may need refresh | `~/.bashrc`, `~/.zshrc` |
| WSL integration | WSL2 for Docker path, detect available distros | N/A (native) |
| System tray | Supported | Supported (appindicator) |
| Auto-start | Registry `Run` key | `.desktop` file in `~/.config/autostart/` |

**Source:** Tauri v2 platform docs, ClawPier multi-platform build docs.

## Suggested Build Order (Dependencies)

Based on component dependencies — each layer needs the one below it.

### Phase 1: Foundation
**Build:** Project scaffold, Tauri v2 setup, frontend shell, basic state management
**Why:** Everything depends on the Tauri IPC bridge and state container existing

### Phase 2: Docker Layer
**Build:** `DockerManager` (bollard integration), Docker availability check, container listing
**Why:** Docker operations are the core capability. Can't install or monitor without this.

### Phase 3: Installation Engine
**Build:** `NativeInstaller`, `Installer` orchestrator, image pulling, container creation
**Why:** First user-facing feature. Depends on Docker layer + config manager.

### Phase 4: Config Management
**Build:** `ConfigManager`, config read/write/validate, sandbox config UI
**Why:** Users need to configure after installing. Depends on knowing what's installed.

### Phase 5: Monitoring & Streaming
**Build:** Event streaming, log viewer, stats dashboard, real-time status
**Why:** Polishing feature, not blocking. Depends on Docker layer + container lifecycle.

### Phase 6: Update & Uninstall
**Build:** Version checking, update flow, clean uninstall
**Why:** Maintenance features. Depends on everything else being stable.

### Dependency Graph

```
Phase 1 (Foundation)
    │
    ├── Phase 2 (Docker Layer)
    │       │
    │       ├── Phase 3 (Installation)
    │       │       │
    │       │       └── Phase 4 (Config Management)
    │       │               │
    │       └───────────────┤
    │                       │
    │       ┌───────────────┘
    │       │
    │       ├── Phase 5 (Monitoring)
    │       │
    │       └── Phase 6 (Update/Uninstall)
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: CLI Dependency for Core Operations
**What:** Shelling out to `docker` CLI for every operation
**Why bad:** Slow, fragile (output parsing), no streaming, platform-dependent
**Instead:** Use bollard (Rust Docker API client) for all container operations. Only shell out for `docker compose` operations where no good Rust library exists.

**Source:** ClawPier, Orca Desktop — both use bollard exclusively for core Docker ops.

### Anti-Pattern 2: Secrets in Frontend
**What:** Storing API keys or tokens in Zustand/React state
**Why bad:** Visible in WebView devtools, potential extraction via XSS
**Instead:** All secrets managed by Rust Core process. Frontend receives redacted/masked values for display only.

**Source:** Tauri v2 Security docs.

### Anti-Pattern 3: Synchronous System Operations
**What:** Blocking the Core process with synchronous shell/fs/Docker calls
**Why bad:** Freezes the entire app — WebView becomes unresponsive
**Instead:** All system operations are `async fn` commands, executed on tokio thread pool.

**Source:** Tauri v2 IPC docs, long-running async task guide.

### Anti-Pattern 4: Mutable State Without Mutex
**What:** Sharing state between threads without synchronization
**Why bad:** Data races, undefined behavior, crashes
**Instead:** Wrap all shared state in `Mutex<T>`. Use `std::sync::Mutex` (not async) for most cases.

**Source:** Tauri v2 State Management docs.

### Anti-Pattern 5: Hardcoded Container Names
**What:** Using fixed names like `openclaw` for containers
**Why bad:** Breaks with multiple instances, conflicts with user's existing containers
**Instead:** Use UUIDs: `openclaw-installer-{uuid}`. Filter by label, not name.

**Source:** ClawPier naming convention (`clawpier-{uuid}`).

## Tauri v2 Specific Patterns

### Capabilities (Security ACL)

Define in `src-tauri/capabilities/default.json`:
```json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-execute",
    "shell:allow-stdin-write",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    "fs:scope-home"
  ]
}
```

**Why:** Tauri v2 requires explicit capability declarations for all IPC access. This is the security boundary.

**Source:** Tauri v2 Security/Capabilities docs.

### App Identifier

Use `com.openclaw.installer` (not `.app` suffix — conflicts with macOS conventions).

**Source:** ClawPier CLAUDE.md (verified gotcha).

### Vite + React Version Pinning

- Vite 6 (not 8 — esbuild issues)
- `@vitejs/plugin-react@4` (not v6 — requires Vite 8)
- pnpm needs `"onlyBuiltDependencies": ["esbuild"]`

**Source:** ClawPier build gotchas (verified).

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Tauri v2 IPC/Commands pattern | HIGH | Official docs + ClawPier production code |
| bollard for Docker API | HIGH | Official crate + 3 production apps (ClawPier, Orca, Dockerman) |
| State management (Mutex pattern) | HIGH | Official docs + ClawPier + community consensus |
| Event streaming pattern | HIGH | Official docs + ClawPier + async task tutorial |
| OpenClaw config structure | MEDIUM | Multiple blog posts (2026), consistent across sources |
| Platform-specific (Windows) | MEDIUM | Tauri docs (cross-platform), less direct verification |
| Config atomic writes | MEDIUM | ClawPier pattern + common Rust idiom |

## Sources

| Source | Type | Confidence |
|--------|------|------------|
| [Tauri v2 Architecture](https://v2.tauri.app/concept/architecture/) | Official docs | HIGH |
| [Tauri v2 Process Model](https://v2.tauri.app/concept/process-model/) | Official docs | HIGH |
| [Tauri v2 IPC](https://v2.tauri.app/concept/inter-process-communication/) | Official docs | HIGH |
| [Tauri v2 State Management](https://v2.tauri.app/develop/state-management/) | Official docs | HIGH |
| [ClawPier](https://github.com/SebastianElvis/clawpier) | Production app (OpenClaw + Docker + Tauri v2) | HIGH |
| [Orca Desktop](https://github.com/edvin/orca) | Production app (container management + Tauri v2) | HIGH |
| [Dockerman](https://github.com/zingerlittlebee/dockerman.app) | Production app (Docker UI + Tauri) | HIGH |
| [OpenClaw Docker Setup](https://singhajit.com/openclaw-docker-setup/) | Tutorial (2026-03-13) | MEDIUM |
| [Docker Blog: OpenClaw Sandboxes](https://www.docker.com/blog/run-openclaw-securely-in-docker-sandboxes/) | Official Docker blog | HIGH |
| [Long-running async in Tauri v2](https://sneakycrow.dev/blog/2024-05-12-running-async-tasks-in-tauri-v2) | Tutorial | MEDIUM |

---

*Researched: 2026-03-25*
*All architecture patterns verified against production Tauri v2 applications managing Docker containers.*
