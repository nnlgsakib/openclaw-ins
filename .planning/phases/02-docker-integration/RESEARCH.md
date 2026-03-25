# Research: Phase 2 — Docker Integration

**Researched:** 2026-03-25
**Goal:** Understand how to detect, health-check, and manage Docker across platforms

---

## Standard Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Docker API | bollard | 0.20.2 (latest, published 2026-03-15) |
| Async runtime | tokio | Already in Cargo.toml |
| Process mgmt | tauri-plugin-shell | Already registered |
| Platform detection | tauri-plugin-os | Already registered |

## Architecture Patterns

### Docker Connection Model (bollard)
- **Unix (Linux):** `Docker::connect_with_socket_defaults()` — connects to `/var/run/docker.sock`
- **Windows:** `Docker::connect_with_http_defaults()` — connects via HTTP (Docker Desktop listens on `npipe:////./pipe/docker_engine` by default, bollard maps this)
- **Health check:** `docker.ping()` returns `Ok("OK")` if daemon is accessible
- **Version info:** `docker.version()` returns `SystemVersion` struct with version, API version, platform
- **System info:** `docker.info()` returns `SystemInfo` with containers running, images, OS type

### Detection Strategy (Cross-Platform)
```
1. Platform check (tauri-plugin-os) → Windows vs Linux
2. Docker binary exists? → Check PATH or known install locations
3. Docker daemon reachable? → bollard ping()
4. (Windows only) Docker Desktop running? → Check named pipe or process
5. (Windows only) WSL2 backend? → Check for docker-desktop-data distro
```

### Windows WSL2 Detection
- Check `wsl -l -v` output for `docker-desktop` / `docker-desktop-data` distros
- Docker Desktop stores its WSL distro as `docker-desktop` (version 2+)
- Alternative: Check registry `HKLM\SOFTWARE\Docker Inc.\Docker Desktop`
- Named pipe: `\\.\pipe\docker_engine` exists when Docker Desktop engine is running

### Linux Docker Detection
- Binary: `/usr/bin/docker` or check `which docker`
- Socket: `/var/run/docker.sock` exists + has permissions
- Service: `systemctl is-active docker` or `pgrep dockerd`
- Daemon: bollard `ping()` confirms actual connectivity

## Key Crates & APIs

### bollard 0.20
```rust
// Health check
let docker = Docker::connect_with_socket_defaults()?;
docker.ping().await?;  // Returns "OK" if healthy

// Version info
let version = docker.version().await?;
// version.version → "27.5.1"
// version.api_version → "1.47"

// System info
let info = docker.info().await?;
// info.containers_running → count
// info.server_version → "27.5.1"
```

Feature flags needed: `pipe` (default) for Unix sockets + Windows named pipes. No SSL needed for local Docker.

### tauri-plugin-shell (for fallback CLI checks)
```rust
// Check if docker binary exists
let output = Command::new("which")
    .args(["docker"])
    .output()
    .await?;
// Or on Windows:
let output = Command::new("where")
    .args(["docker"])
    .output()
    .await?;
```

### tauri-plugin-store (for caching Docker status)
```rust
// Cache last known Docker status to avoid repeated checks
// Use store.get("docker_status") / store.set("docker_status", ...)
```

## Security Considerations

1. **Never use `shell:allow-open`** — RCE vector per RESEARCH.md critical pitfalls
2. **bollard connects locally only** — no remote Docker by default, safe
3. **Scope shell plugin permissions** — only allow `which`, `where`, `wsl`, `docker` commands
4. **Update capabilities** — add scoped shell execute permissions for Docker detection commands

## Common Pitfalls

1. **Docker Desktop instability on Windows** — WSL2 networking issues after Windows kernel updates. Mitigation: re-check health before operations, not just at startup.
2. **Named pipe timeout** — bollard default timeout may be too short on Windows. Increase to 30s for initial connect.
3. **WSL2 distro not running** — `docker-desktop` WSL distro may be stopped. Need to start it via `wsl -d docker-desktop` or prompt user to open Docker Desktop.
4. **Socket permissions on Linux** — User may need to be in `docker` group. Check and guide if missing.
5. **Docker Desktop license** — Docker Desktop requires paid license for companies >250 employees. Don't assume Docker Desktop is free.

## AppError Pattern (from Phase 1)

Phase 1 established `AppError::DockerUnavailable { suggestion }` variant in `error.rs`. Phase 2 needs to:

1. Add more granular Docker errors:
   - `DockerNotInstalled` — binary not found
   - `DockerDaemonNotRunning` — binary exists but daemon unreachable
   - `DockerDesktopNotRunning` — (Windows) Docker Desktop app not started
   - `WslBackendNotReady` — (Windows) WSL2 backend not initialized

2. Each variant MUST have `suggestion: String` per ERR-01 pattern

3. Frontend `errorMessages` map in `errors.ts` needs matching keys:
   - `docker_not_installed`
   - `docker_daemon_not_running`
   - `docker_desktop_not_running`
   - `wsl_backend_not_ready`

## References

- [bollard 0.20 docs](https://docs.rs/bollard/latest/bollard/)
- [bollard Docker struct](https://docs.rs/bollard/latest/bollard/struct.Docker.html)
- [tauri-plugin-shell](https://v2.tauri.app/plugin/shell/)
- Phase 1 patterns: `src-tauri/src/error.rs`, `src-tauri/src/state.rs`, `src/lib/errors.ts`
