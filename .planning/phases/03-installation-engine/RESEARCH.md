# Phase 3: Installation Engine - Research

**Researched:** 2026-03-25
**Domain:** OpenClaw installation mechanisms, onboarding wizard UX, post-install verification, platform-specific install flows
**Confidence:** HIGH

## Summary

Phase 3 implements the installation engine — the core user-facing feature of OpenClaw Desktop. Research reveals two primary OpenClaw installation paths: (1) a Docker-based install using `docker-setup.sh` + Docker Compose with two services (`openclaw-gateway` and `openclaw-cli`), and (2) a native npm global install (`npm install -g openclaw@latest`). The Docker path is the primary install method for our app — it provides isolation, reproducibility, and the sandbox capability. The native path is the fallback for users who don't want Docker. Both paths terminate with the OpenClaw onboarding wizard, which handles provider/API key configuration.

OpenClaw has a built-in health verification system: `openclaw doctor --fix` for comprehensive audits, and HTTP health endpoints (`/healthz`, `/readyz`) for Docker containers. Our installation engine should shell out to these existing verification mechanisms rather than reimplementing them. The `tauri-plugin-shell` plugin and Tauri event streaming pattern (from Phase 2's established architecture) are the primary mechanisms for running install steps and streaming progress to the frontend.

**Primary recommendation:** Implement install as an orchestrator that delegates to platform-specific install commands (Docker Compose or npm), streams progress via Tauri events, and verifies using existing OpenClaw health checks.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| bollard | 0.20.x | Docker API client (already in Phase 2) | Pull images, create/manage containers via typed Rust API |
| tauri-plugin-shell | 2.3.x | Spawn install processes | Execute shell commands for native install, docker compose |
| tauri-plugin-store | 2.4.x | Persist install state | Track which install method was used, last known status |
| process-wrap | 9.1.x | Process management | Kill-on-drop, process groups for long-running installs |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| reqwest | 0.13.x | HTTP client | Download OpenClaw releases for native install, verify endpoints |
| serde / serde_json | 1.x | Serialization | Install config types, IPC data |
| thiserror | 2.x | Error types | `InstallError` variants with user-friendly suggestions |
| anyhow | 1.x | Error context | Command-level error chains |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Docker install (primary) | Native npm-only | Simpler but loses sandbox isolation, harder to manage lifecycle. Docker is the standard for OpenClaw self-hosting. |
| bollard for all Docker ops | docker CLI wrapper | Loses type safety and progress streaming. bollard is already in the stack. |
| Custom health check | `openclaw doctor --fix` | OpenClaw's doctor command already covers 70% of issues automatically. Don't reimplement. |
| Custom compose file generation | Embedded compose template | OpenClaw's compose structure is well-defined. Embed a tested template, not a generator. |

## Architecture Patterns

### Recommended Project Structure

```
src-tauri/src/
├── commands/
│   ├── mod.rs
│   ├── docker.rs           # Phase 2 — existing
│   ├── platform.rs         # Phase 1 — existing
│   └── install.rs           # NEW — install orchestration commands
├── install/
│   ├── mod.rs
│   ├── docker_install.rs    # Docker Compose-based install flow
│   ├── native_install.rs    # npm-based native install flow
│   ├── verify.rs            # Post-install health verification
│   └── progress.rs          # Progress event streaming
├── error.rs                 # Phase 2 — add InstallFailed, VerificationFailed variants
├── state.rs                 # Add InstallState to AppState
└── lib.rs
```

### Pattern 1: Install Orchestrator Command

The install command is a long-running async function that emits progress events. It delegates to the appropriate backend (Docker or native) based on user choice.

```rust
// Source: ARCHITECTURE.md — Flow 1: One-Click Docker Install
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum InstallMethod {
    Docker,
    Native,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallRequest {
    pub method: InstallMethod,
    pub workspace_path: Option<String>,
}

#[tauri::command]
pub async fn install_openclaw(
    request: InstallRequest,
    app_handle: tauri::AppHandle,
) -> Result<InstallResult, AppError> {
    match request.method {
        InstallMethod::Docker => docker_install(&app_handle).await,
        InstallMethod::Native => native_install(&app_handle).await,
    }
}
```

### Pattern 2: Progress Event Streaming

Backend emits structured progress events. Frontend listens via `@tauri-apps/api/event`.

```rust
// Source: ARCHITECTURE.md — Event Streaming pattern
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallProgress {
    pub step: String,       // "checking_docker", "pulling_image", "creating_config", etc.
    pub percent: u8,        // 0-100
    pub message: String,    // Human-readable: "Downloading OpenClaw image..."
}

fn emit_progress(handle: &tauri::AppHandle, step: &str, percent: u8, message: &str) {
    handle.emit("install-progress", InstallProgress {
        step: step.to_string(),
        percent,
        message: message.to_string(),
    }).ok();
}
```

Frontend hook:
```typescript
// Source: STACK.md — Pattern: Tauri Command → TanStack Query
import { useQuery, useMutation } from '@tanstack/react-query'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { useEffect, useState } from 'react'

export function useInstallOpenClaw() {
  const [progress, setProgress] = useState<InstallProgress | null>(null)

  useEffect(() => {
    const unlisten = listen<InstallProgress>('install-progress', (event) => {
      setProgress(event.payload)
    })
    return () => { unlisten.then(fn => fn()) }
  }, [])

  const mutation = useMutation({
    mutationFn: (method: InstallMethod) =>
      invoke<InstallResult>('install_openclaw', { request: { method } }),
  })

  return { ...mutation, progress }
}
```

### Pattern 3: Docker Compose Install Flow

The Docker install pulls the official `ghcr.io/openclaw/openclaw:latest` image, creates config directories, writes a compose file, and starts the gateway.

```rust
// Source: OpenClaw official docker.md — verified 2026-03-23
async fn docker_install(app_handle: &tauri::AppHandle) -> Result<InstallResult, AppError> {
    // Step 1: Verify Docker is available (reuse Phase 2 check_docker_health)
    emit_progress(app_handle, "checking_docker", 5, "Checking Docker availability...");
    let docker_status = check_docker_health_internal().await?;
    if !docker_status.running {
        return Err(AppError::DockerDaemonNotRunning {
            suggestion: "Start Docker Desktop (Windows) or run: sudo systemctl start docker (Linux)".into(),
        });
    }

    // Step 2: Create config directories
    emit_progress(app_handle, "creating_dirs", 15, "Creating configuration directories...");
    let config_dir = dirs::home_dir()
        .ok_or_else(|| AppError::Internal { message: "Cannot find home directory".into(), suggestion: "...".into() })?
        .join(".openclaw");
    let workspace_dir = config_dir.join("workspace");
    tokio::fs::create_dir_all(&config_dir).await?;
    tokio::fs::create_dir_all(&workspace_dir).await?;

    // Step 3: Pull OpenClaw image via bollard
    emit_progress(app_handle, "pulling_image", 20, "Downloading OpenClaw image...");
    let docker = bollard::Docker::connect_with_socket_defaults()?;
    let mut stream = docker.create_image(
        Some(bollard::image::CreateImageOptions {
            from_image: "ghcr.io/openclaw/openclaw",
            tag: "latest",
            ..Default::default()
        }),
        None,
        None,
    );
    while let Some(result) = stream.next().await {
        // Parse pull progress and emit
        // percent: 20-70 range mapped from pull progress
    }

    // Step 4: Write docker-compose.yml
    emit_progress(app_handle, "writing_compose", 75, "Configuring Docker services...");
    let compose_content = generate_compose_yaml(&config_dir, &workspace_dir);
    let compose_path = config_dir.join("docker-compose.yml");
    tokio::fs::write(&compose_path, compose_content).await?;

    // Step 5: Write .env file
    emit_progress(app_handle, "writing_env", 80, "Generating gateway token...");
    let gateway_token = generate_token();
    let env_content = format!(
        "OPENCLAW_IMAGE=ghcr.io/openclaw/openclaw:latest\nOPENCLAW_GATEWAY_TOKEN={}\nOPENCLAW_GATEWAY_PORT=18789\nOPENCLAW_BRIDGE_PORT=18790\nOPENCLAW_CONFIG_DIR={}\nOPENCLAW_WORKSPACE_DIR={}\n",
        gateway_token,
        config_dir.display(),
        workspace_dir.display(),
    );
    tokio::fs::write(config_dir.join(".env"), env_content).await?;

    // Step 6: Start gateway via docker compose up
    emit_progress(app_handle, "starting_gateway", 85, "Starting OpenClaw gateway...");
    // Use bollard or docker compose CLI to start
    let output = tokio::process::Command::new("docker")
        .args(["compose", "-f", compose_path.to_str().unwrap(), "up", "-d", "openclaw-gateway"])
        .output()
        .await?;

    // Step 7: Verify gateway is healthy
    emit_progress(app_handle, "verifying", 95, "Verifying installation...");
    verify_gateway_health(30).await?; // Wait up to 30s for /healthz

    emit_progress(app_handle, "complete", 100, "OpenClaw installed successfully!");
    Ok(InstallResult {
        method: InstallMethod::Docker,
        version: get_installed_version().await,
        gateway_url: "http://127.0.0.1:18789".into(),
        gateway_token: Some(gateway_token),
    })
}
```

### Pattern 4: Native Install Flow

```rust
// Source: OpenClaw official install docs — npm install -g openclaw@latest
async fn native_install(app_handle: &tauri::AppHandle) -> Result<InstallResult, AppError> {
    // Step 1: Check Node.js version (>= 22.12.0)
    emit_progress(app_handle, "checking_node", 10, "Checking Node.js...");
    let node_version = get_node_version().await?;
    if !meets_minimum_version(&node_version, "22.12.0") {
        return Err(AppError::InstallationFailed {
            reason: format!("Node.js {} detected, but 22.12.0+ required", node_version),
            suggestion: "Download Node.js 22+ from https://nodejs.org or use your package manager".into(),
        });
    }

    // Step 2: Install openclaw globally
    emit_progress(app_handle, "installing_npm", 30, "Installing OpenClaw via npm...");
    let output = tokio::process::Command::new("npm")
        .args(["install", "-g", "openclaw@latest"])
        .output()
        .await?;
    // Handle permission errors (sudo required on Linux/macOS)

    // Step 3: Run onboard --install-daemon
    emit_progress(app_handle, "configuring", 60, "Running OpenClaw setup...");
    let output = tokio::process::Command::new("openclaw")
        .args(["onboard", "--install-daemon"])
        .output()
        .await?;
    // Onboarding wizard runs interactively — may need to pass flags non-interactively

    // Step 4: Verify
    emit_progress(app_handle, "verifying", 90, "Verifying installation...");
    let version = get_openclaw_version().await?;

    emit_progress(app_handle, "complete", 100, "OpenClaw installed successfully!");
    Ok(InstallResult {
        method: InstallMethod::Native,
        version: Some(version),
        gateway_url: "http://127.0.0.1:18789".into(),
        gateway_token: None,
    })
}
```

### Pattern 5: Post-Install Verification

```rust
// Source: OpenClaw health endpoints — official docs verified
async fn verify_gateway_health(timeout_secs: u64) -> Result<(), AppError> {
    let client = reqwest::Client::new();
    let deadline = tokio::time::Instant::now() + tokio::time::Duration::from_secs(timeout_secs);

    loop {
        if tokio::time::Instant::now() > deadline {
            return Err(AppError::VerificationFailed {
                reason: "Gateway did not become healthy within timeout".into(),
                suggestion: "Check Docker logs: docker compose logs openclaw-gateway. Run: openclaw doctor --fix".into(),
            });
        }

        // Liveness check — no auth required
        if let Ok(resp) = client.get("http://127.0.0.1:18789/healthz").send().await {
            if resp.status().is_success() {
                // Also check readiness
                if let Ok(ready) = client.get("http://127.0.0.1:18789/readyz").send().await {
                    if ready.status().is_success() {
                        return Ok(());
                    }
                }
            }
        }

        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    }
}

// Native install verification uses openclaw doctor
async fn verify_native_install() -> Result<(), AppError> {
    let output = tokio::process::Command::new("openclaw")
        .args(["doctor", "--yes"])
        .output()
        .await?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::VerificationFailed {
            reason: format!("openclaw doctor reported issues: {}", stderr),
            suggestion: "Run 'openclaw doctor --fix' manually to diagnose and repair".into(),
        });
    }
    Ok(())
}
```

### Pattern 6: First-Run Onboarding State Machine

```
┌──────────────────────────────────────────────────┐
│              Onboarding State Machine             │
│                                                   │
│  ┌─────────┐    ┌─────────┐    ┌─────────────┐  │
│  │ SYSTEM  │───>│ INSTALL │───>│   VERIFY    │  │
│  │  CHECK  │    │  FLOW   │    │  & READY    │  │
│  └────┬────┘    └────┬────┘    └──────┬──────┘  │
│       │              │                │          │
│       │ FAIL         │ FAIL           │ FAIL     │
│       ▼              ▼                ▼          │
│  ┌─────────┐    ┌─────────┐    ┌─────────────┐  │
│  │ FIX     │    │ ERROR   │    │ RETRY       │  │
│  │ PROMPT  │    │ MESSAGE │    │ / DOCTOR    │  │
│  └─────────┘    └─────────┘    └─────────────┘  │
└──────────────────────────────────────────────────┘
```

**Step 1 — System Check:**
- Platform detected (PLAT-03 — already from Phase 1)
- Docker available? → Show Docker install guidance if missing (INST-03 from Phase 2)
- Node.js available? (for native path only) → Show install instructions
- Disk space sufficient? → Warn if < 2GB free
- All checks pass → Proceed to step 2

**Step 2 — Install Flow:**
- User chooses: Docker (recommended) or Native
- Install runs with progress bar (step + percent + message)
- Errors shown inline with fix suggestions (ERR-02)

**Step 3 — Verify & Ready:**
- Post-install health check runs automatically (INST-04)
- Docker: `/healthz` + `/readyz` poll
- Native: `openclaw doctor --yes`
- Success → Show gateway URL, copy token, "Open Dashboard" button
- Failure → Show error with retry / manual-fix options

### Anti-Patterns to Avoid

- **Blocking the UI during install:** All install steps must be `async fn` commands that emit progress events. Never run synchronous shell or Docker commands in the core process. (Source: ARCHITECTURE.md anti-pattern #3)
- **Hardcoded container names:** Use `openclaw-installer-{uuid}` pattern from Phase 2, not fixed names. (Source: ARCHITECTURE.md anti-pattern #5)
- **Reimplementing health checks:** OpenClaw has `openclaw doctor --fix` and HTTP health endpoints. Use these, don't build custom verification. (Source: OpenClaw official docs — verified)
- **Storing secrets in frontend:** Gateway token stays in Rust state. Frontend receives masked copy for display only. (Source: STACK.md security pattern)
- **Synchronous file operations:** Use `tokio::fs` for all directory/file creation during install. (Source: Tauri v2 async docs)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Docker image pulling | Custom HTTP download + pipe to Docker | bollard `create_image()` streaming | Handles auth, progress, retries, layer caching automatically |
| Health verification | Custom HTTP polling with hardcoded checks | `openclaw doctor --yes` + `/healthz` `/readyz` endpoints | OpenClaw's doctor covers config migration, permissions, services — 70% auto-repair rate (community data) |
| Gateway token generation | Custom crypto | `openssl rand -hex 32` or Rust `ring` crate | Standard, auditable, correct entropy |
| Process spawning | `std::process::Command` (blocking) | `tokio::process::Command` or `tauri-plugin-shell` | Non-blocking, works with Tokio runtime |
| Compose file parsing/generation | String template engine | Embedded static YAML template + env substitution | OpenClaw's compose structure is stable; don't over-engineer |
| Docker socket detection | Manual path probing | bollard `connect_with_socket_defaults()` | Handles Linux socket, Windows named pipe, platform-specific defaults |

**Key insight:** OpenClaw already provides everything needed for installation verification and repair. Our job is orchestration, not reimplementation. The `docker-setup.sh`, `openclaw doctor --fix`, and HTTP health endpoints are the authoritative verification layer.

## Common Pitfalls

### Pitfall 1: Docker Desktop vs Docker Engine Confusion on Windows
**What goes wrong:** Assuming Docker socket path is the same on Windows as Linux. Windows uses named pipes (`//var/run/docker.sock` via WSL2) or Docker Desktop's HTTP API, not a Unix socket.
**Why it happens:** bollard defaults work differently on each platform. `connect_with_socket_defaults()` tries socket first, but Windows needs HTTP.
**How to avoid:** Use bollard's `connect_with_socket_defaults()` on Linux and `connect_with_http_defaults()` on Windows. Check Phase 2's `check_docker_health` command which already handles this.
**Warning signs:** "connection refused" or "pipe not found" errors on Windows during Docker pull.

### Pitfall 2: Native Install PATH Issues
**What goes wrong:** After `npm install -g openclaw`, the `openclaw` binary isn't found. The npm global bin directory isn't in PATH.
**Why it happens:** npm's global prefix varies by system. On Linux with custom Node installs, or on Windows, the PATH may not include the global bin dir.
**How to avoid:** Before calling `openclaw` commands, verify PATH with `which openclaw` (Linux) or `where openclaw` (Windows). If missing, add the npm prefix to PATH: `export PATH="$(npm config get prefix)/bin:$PATH"`.
**Warning signs:** "openclaw: command not found" after successful npm install.

### Pitfall 3: Insufficient RAM for Docker Image Build
**What goes wrong:** Docker build or image pull fails with exit code 137 (OOM kill).
**Why it happens:** Building the OpenClaw image from source requires 2GB+ RAM. Pre-built images are much lighter.
**How to avoid:** Always use `OPENCLAW_IMAGE=ghcr.io/openclaw/openclaw:latest` to skip the local build. Check available RAM before install starts and warn the user if < 2GB.
**Warning signs:** Exit code 137, "Killed" message during `docker compose up`.

### Pitfall 4: Gateway Not Ready Before Verification
**What goes wrong:** Health check runs immediately after `docker compose up` and fails because the gateway takes 5-15 seconds to start.
**Why it happens:** Docker Compose returns control as soon as the container starts, not when the app inside is ready.
**How to avoid:** Poll `/healthz` with exponential backoff (start at 2s intervals, max 30s total). Don't check once and fail.
**Warning signs:** First health check always fails, then succeeds on retry.

### Pitfall 5: Port 18789 Already in Use
**What goes wrong:** Gateway fails to start because port 18789 is occupied by another service or a previous OpenClaw instance.
**Why it happens:** OpenClaw defaults to port 18789. If another OpenClaw instance or conflicting service is running, the bind fails.
**How to avoid:** Before install, check if port 18789 is in use. If so, offer to use an alternative port or stop the conflicting service. The `OPENCLAW_GATEWAY_PORT` env var controls this.
**Warning signs:** "address already in use" error in Docker logs.

## Code Examples

### Docker Compose Template (Embedded)

```yaml
# Source: OpenClaw official docker-compose.yml — verified 2026-03-23
# This template is embedded in Rust and written to disk during install
services:
  openclaw-gateway:
    image: ${OPENCLAW_IMAGE:-ghcr.io/openclaw/openclaw:latest}
    container_name: openclaw-gateway
    restart: unless-stopped
    ports:
      - "127.0.0.1:${OPENCLAW_GATEWAY_PORT:-18789}:18789"
      - "${OPENCLAW_BRIDGE_PORT:-18790}:18790"
    environment:
      HOME: /home/node
      TERM: xterm-256color
      OPENCLAW_GATEWAY_TOKEN: ${OPENCLAW_GATEWAY_TOKEN}
    volumes:
      - ${OPENCLAW_CONFIG_DIR:-~/.openclaw}:/home/node/.openclaw
      - ${OPENCLAW_WORKSPACE_DIR:-~/.openclaw/workspace}:/home/node/.openclaw/workspace
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:18789/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3

  openclaw-cli:
    image: ${OPENCLAW_IMAGE:-ghcr.io/openclaw/openclaw:latest}
    container_name: openclaw-cli
    network_mode: "service:openclaw-gateway"
    cap_drop:
      - NET_RAW
      - NET_ADMIN
    security_opt:
      - no-new-privileges:true
    volumes:
      - ${OPENCLAW_CONFIG_DIR:-~/.openclaw}:/home/node/.openclaw
      - ${OPENCLAW_WORKSPACE_DIR:-~/.openclaw/workspace}:/home/node/.openclaw/workspace
```

### Install Request / Result Types

```rust
// Source: STACK.md — Serde Bridge pattern
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallResult {
    pub method: InstallMethod,
    pub version: Option<String>,
    pub gateway_url: String,
    pub gateway_token: Option<String>,  // Only for Docker install
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemCheckResult {
    pub platform: String,           // "windows" | "linux"
    pub docker_available: bool,
    pub docker_running: bool,
    pub node_available: bool,
    pub node_version: Option<String>,
    pub disk_free_gb: u64,
    pub ram_available_gb: u64,
    pub port_18789_free: bool,
}
```

### System Pre-Check Command

```rust
#[tauri::command]
pub async fn run_system_check() -> Result<SystemCheckResult, AppError> {
    let platform = std::env::consts::OS.to_string();

    // Docker check (reuse Phase 2)
    let docker_status = check_docker_health_internal().await.unwrap_or(DockerStatus {
        installed: false, running: false, version: None, api_version: None,
        platform: platform.clone(), docker_desktop: false, wsl_backend: false,
    });

    // Node.js check
    let (node_available, node_version) = match get_node_version().await {
        Ok(v) => (true, Some(v)),
        Err(_) => (false, None),
    };

    // Disk space
    let disk_free_gb = get_free_disk_gb().await;

    // Port check
    let port_18789_free = is_port_free(18789).await;

    // RAM check
    let ram_available_gb = get_available_ram_gb().await;

    Ok(SystemCheckResult {
        platform,
        docker_available: docker_status.installed,
        docker_running: docker_status.running,
        node_available,
        node_version,
        disk_free_gb,
        ram_available_gb,
        port_18789_free,
    })
}
```

### Error Variants for Installation

```rust
// Source: error.rs from Phase 2 — extend with install variants
#[derive(Debug, thiserror::Error, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum AppError {
    // ... existing variants from Phase 1/2 ...

    #[error("Installation failed: {reason}. {suggestion}")]
    InstallationFailed { reason: String, suggestion: String },

    #[error("Installation verification failed: {reason}. {suggestion}")]
    VerificationFailed { reason: String, suggestion: String },

    #[error("Node.js version too old: {current}. Minimum required: {minimum}. {suggestion}")]
    NodeVersionTooOld { current: String, minimum: String, suggestion: String },

    #[error("Insufficient disk space: {free_gb}GB free, need {required_gb}GB. {suggestion}")]
    InsufficientDiskSpace { free_gb: u64, required_gb: u64, suggestion: String },

    #[error("Port {port} is already in use. {suggestion}")]
    PortInUse { port: u16, suggestion: String },
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sequential multi-page wizard | Single-page stepper with inline validation | ~2023-2024 | Faster UX, less "back" button friction |
| Polling for install progress | WebSocket/event streaming | Tauri events | Real-time progress without HTTP overhead |
| Custom health check logic | Delegating to `openclaw doctor --fix` | OpenClaw 2026.x | 70% auto-repair rate, handles edge cases |
| Building Docker image locally | Pulling pre-built from GHCR | 2026 | Saves 30+ minutes, avoids OOM on low-RAM hosts |

**Deprecated/outdated:**
- Building Docker images locally: Use `ghcr.io/openclaw/openclaw:latest` pre-built images instead
- `docker-compose` (v1, hyphenated): Use `docker compose` (v2, space-separated) — Compose v1 deprecated in 2023
- `openclaw gateway-daemon`: Renamed to `openclaw gateway` in v2026.1.21+

## Open Questions

1. **Native install onboarding wizard interactivity**
   - What we know: `openclaw onboard --install-daemon` runs an interactive wizard that prompts for provider, API key, channel setup
   - What's unclear: Whether the wizard supports non-interactive flags for all prompts (some community guides suggest `--mode local`, `--anthropic-api-key "..."` flags but not all steps are automatable)
   - Recommendation: For the native path, launch the onboard wizard in the app's terminal emulator (or link to system terminal). Don't try to fully automate — let the user complete provider setup interactively. For Docker path, the onboarding runs inside the container during setup.

2. **Docker Compose management via Rust (bollard vs CLI)**
   - What we know: bollard handles Docker API operations (pull, create, start containers). Docker Compose operations (`docker compose up -d`) are higher-level and typically require shelling out to the CLI.
   - What's unclear: Whether there's a pure-Rust compose alternative (e.g., `docker-compose-yml` crate). Research shows no mature option.
   - Recommendation: Use `tokio::process::Command` to shell out to `docker compose` for the compose orchestration step. Use bollard for individual container operations (pull, health check, status). This matches ClawPier's approach.

3. **Node.js auto-install for native path**
   - What we know: OpenClaw requires Node.js >= 22.12.0. Some install scripts auto-detect and install Node.
   - What's unclear: Whether our app should auto-install Node.js or just guide the user.
   - Recommendation: Detect Node.js availability. If missing, show a guided install step (download link, or run platform-specific installer). Don't auto-install without explicit user consent — Node.js installation is a system-level change.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker Engine / Desktop | Docker install path | — (check at runtime) | — | Native npm path |
| Node.js >= 22.12.0 | Native install path | — (check at runtime) | — | Docker path (includes Node internally) |
| npm | Native install | — (check at runtime) | — | pnpm or bun |
| docker compose (v2) | Docker install | — (check at runtime) | — | Manual container management |
| Port 18789 | Gateway bind | — (check at runtime) | — | Configurable via OPENCLAW_GATEWAY_PORT |

**Missing dependencies with no fallback:**
- Docker (for Docker install path) — must be installed first; Phase 2 provides install guidance

**Missing dependencies with fallback:**
- Node.js (for native path) — fallback to Docker path which bundles its own Node.js
- npm (for native path) — fallback to pnpm or bun
- Port 18789 (default) — fallback to any available port via configuration

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (frontend) + Rust `#[test]` (backend) |
| Config file | vitest.config.ts (from Phase 1 scaffold) |
| Quick run command | `pnpm vitest run --reporter=verbose` |
| Full suite command | `pnpm vitest run && cargo test --manifest-path src-tauri/Cargo.toml` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INST-01 | User can install via one-click Docker setup with pre-check | integration | `cargo test docker_install_flow` | ❌ Wave 0 |
| INST-02 | User can install natively without Docker | integration | `cargo test native_install_flow` | ❌ Wave 0 |
| INST-04 | App verifies installation via health check | unit + integration | `cargo test verify_gateway_health` + `cargo test verify_native_install` | ❌ Wave 0 |
| INST-05 | First-run onboarding (3-step: check → install → ready) | e2e (manual) | Manual verification — wizard state machine | ❌ Manual |
| PLAT-03 | App detects platform and adjusts install flow | unit | `cargo test platform_adjusted_flow` | ❌ Wave 0 |
| ERR-02 | Actionable error messages during install failures | unit | `cargo test install_error_suggestions` + Vitest error display | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cargo check --manifest-path src-tauri/Cargo.toml`
- **Per wave merge:** `pnpm vitest run && cargo test --manifest-path src-tauri/Cargo.toml`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src-tauri/src/commands/install.rs` — install orchestration commands
- [ ] `src-tauri/src/install/docker_install.rs` — Docker Compose install flow
- [ ] `src-tauri/src/install/native_install.rs` — npm-based native install flow
- [ ] `src-tauri/src/install/verify.rs` — post-install health verification
- [ ] `src-tauri/src/install/progress.rs` — progress event types
- [ ] `src/pages/install.tsx` — install wizard page component
- [ ] `src/hooks/use-install.ts` — install state + progress hook
- [ ] `src/components/install/step-check.tsx` — system check step UI
- [ ] `src/components/install/step-install.tsx` — install progress step UI
- [ ] `src/components/install/step-ready.tsx` — completion step UI

## Sources

### Primary (HIGH confidence)
- [OpenClaw Docker Install Docs](https://github.com/openclaw/openclaw/blob/main/docs/install/docker.md) — Official Docker setup reference, compose template, env vars, health endpoints (2026-03-23)
- [OpenClaw Install Docs](https://openclaws.io/docs/install) — Official install methods (installer script, npm, pnpm, source) (2026)
- [OpenClaw Health Checks](https://openclawlab.com/en/docs/gateway/health/) — Official health check CLI commands and diagnostics
- [OpenClaw Doctor Docs](https://docs.clawd.bot/doctor) — Doctor command reference, flags, what it checks
- [Tauri v2 Shell Plugin](https://v2.tauri.app/plugin/shell/) — Process spawning, permissions
- [Tauri v2 Events](https://v2.tauri.app/develop/calling-rust/#event-system) — Event streaming pattern
- [ARCHITECTURE.md](.planning/research/ARCHITECTURE.md) — Flow 1: One-Click Docker Install, event streaming, state management
- [STACK.md](.planning/research/STACK.md) — Technology choices, bollard, process-wrap, error handling

### Secondary (MEDIUM confidence)
- [DoneClaw Docker Guide](https://doneclaw.com/blog/how-to-run-openclaw-in-docker-the-complete-setup-guide-2026/) — Practical Docker setup walkthrough with compose template (2026-03-04)
- [ClawCloud Docker Setup](https://www.clawcloud.sh/guides/openclaw-docker-setup) — Setup guide with health check commands (2026-03-11)
- [OpenClaw Docker Deployment](https://openclaws.io/blog/openclaw-docker-deployment/) — Compose reference, env vars, troubleshooting (2026-03-06)
- [OpenClaw Install Guide (MyClaw)](https://myclaw.ai/blog/how-to-install-openclaw) — Native install paths, daemon setup, platform-specific notes (2026-02-07)
- [OpenClaw Doctor Guide (ClawTank)](https://clawtank.dev/blog/openclaw-doctor-command-guide) — Doctor command deep-dive (2026-02-25)
- [OpenClaw Doctor Troubleshooting (LaoZhang)](https://blog.laozhang.ai/en/posts/openclaw-doctor-gateway-restart) — 70% auto-repair rate statistic (2026-03-15)

### Tertiary (LOW confidence)
- [OpenClaw Complete Guide (LumaDock)](https://lumadock.com/tutorials/openclaw-complete-guide) — General install reference (2026-03-18)
- [OpenClaw CLI Setup (Nylas)](https://cli.nylas.com/guides/openclaw-cli-setup) — npm install, PATH troubleshooting (2026-03-16)
- [Docker Compose Issue](https://github.com/openclaw/openclaw/issues/1514) — `gateway-daemon` renamed to `gateway` (2026-01-23)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All tools already in stack from Phase 1/2. bollard, shell plugin, process-wrap all confirmed.
- Architecture: HIGH — Flow patterns verified against ARCHITECTURE.md and multiple production Tauri v2 apps. OpenClaw compose template is official.
- Pitfalls: MEDIUM-HIGH — Platform-specific issues (Windows WSL2, PATH) verified across multiple community guides. RAM/pull issues documented in OpenClaw GitHub.
- Install mechanism: HIGH — OpenClaw's official docs and GitHub repo confirm both Docker and npm paths with exact commands.
- Health verification: HIGH — `openclaw doctor --fix` and `/healthz` `/readyz` endpoints confirmed in official OpenClaw docs.

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (30 days — OpenClaw install mechanism is stable, but compose template may evolve with new releases)
