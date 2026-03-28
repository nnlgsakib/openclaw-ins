# ClawStation

A desktop application that makes [OpenClaw](https://github.com/openclaw/openclaw) — the open-source AI agent platform — installable and manageable by anyone. Provides a visual interface for the full lifecycle: installing, configuring, sandboxing, monitoring, updating, and uninstalling.

Built with [Tauri v2](https://v2.tauri.app/) (Rust backend + React frontend) for a native desktop experience on Windows and Linux.

## The Problem

OpenClaw is a powerful CLI-based AI agent platform — but it requires terminal knowledge to install, configure, sandbox, and manage. Non-technical users who want AI agents without CLI complexity are left out.

## The Solution

ClawStation replaces the terminal with a polished desktop GUI. One-click install, visual config editor, Docker sandboxing with live progress, real-time monitoring, and self-updating — all without touching a command line.

## Features

- **Guided installation** — Step-by-step setup wizard walks through prerequisites, API keys, model selection, sandboxing, and channel connections
- **Docker sandboxing** — Install and manage OpenClaw inside Docker containers with real-time layer progress and log streaming
- **Gateway integration** — Start, stop, and monitor the OpenClaw Gateway process; WebSocket bridge for live RPC communication
- **Channel management** — Connect WhatsApp (QR pairing), Telegram, and Discord; view contacts and activity feeds
- **Configuration editor** — Read, validate, and write OpenClaw config files with schema-aware validation
- **Live monitoring** — Agent session tracking, sandbox container status, and container log streaming
- **Self-updating** — Built-in updater checks for new ClawStation releases via GitHub
- **Cross-platform** — Windows (primary), Linux (primary), macOS (secondary)

## How to Install

### From Releases (Recommended)

1. Download the installer from [GitHub Releases](https://github.com/openclaw/clawstation/releases)
2. Run the installer:
   - **Windows:** `.msi` installer
   - **Linux:** `.AppImage` or `.deb` package
3. ClawStation launches with a setup wizard

### From Source

```bash
# Clone the repository
git clone https://github.com/openclaw/clawstation.git
cd clawstation

# Install frontend dependencies
pnpm install

# Run in development mode (launches Tauri window)
pnpm tauri dev
```

## Building

```bash
# Build for production (creates platform-specific installer)
pnpm tauri build
```

Output artifacts are in `src-tauri/target/release/bundle/`.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop runtime | Tauri | 2.x |
| Frontend framework | React | 19.1 |
| Language | TypeScript | 5.8 |
| Build tool | Vite | 8.0 |
| CSS | Tailwind CSS | 4.2 |
| UI components | shadcn/ui (Radix UI primitives) | latest |
| Client state | Zustand | 5.0 |
| Server state | TanStack Query | 5.x |
| Routing | react-router-dom | 7.13 |
| Animations | Motion (Framer Motion) | 12.38 |
| Icons | Lucide React | 1.6 |
| Toasts | Sonner | 2.0 |
| Backend language | Rust | stable (1.87+) |
| Docker API | bollard | 0.20 |
| Async runtime | tokio | 1.x |
| HTTP client | reqwest | 0.12 |
| WebSocket | tokio-tungstenite | 0.26 |
| Serialization | serde / serde_json | 1.x |
| System info | sysinfo | 0.33 |

## Prerequisites

- **Node.js** ≥ 18
- **pnpm** (recommended) or npm
- **Rust** stable toolchain ([rustup.rs](https://rustup.rs))
- **Docker** (for sandboxed installation mode)

### Platform-specific

| Platform | Notes |
|----------|-------|
| Windows | Install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and WebView2 runtime |
| Linux | Install `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf` (Debian/Ubuntu packages listed) |
| macOS | Xcode Command Line Tools (`xcode-select --install`) |

## Project Structure

```
clawstation/
├── src/                          # React frontend
│   ├── pages/                    # Route-level page components
│   │   ├── dashboard.tsx         # Home / status overview
│   │   ├── setup-wizard.tsx      # First-run onboarding wizard
│   │   ├── install.tsx           # OpenClaw installation flow
│   │   ├── docker.tsx            # Docker management UI
│   │   ├── configure.tsx         # Config file editor
│   │   ├── monitor.tsx           # Live monitoring dashboard
│   │   ├── channels.tsx          # Messaging channel management
│   │   ├── settings.tsx          # App settings
│   │   └── openclaw-webapp.tsx   # Embedded OpenClaw control UI
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives (button, card, dialog, etc.)
│   │   ├── layout/               # App shell, sidebar, header
│   │   ├── wizard/               # Setup wizard step components
│   │   ├── install/              # Install flow step components
│   │   ├── channels/             # Channel pairing modals
│   │   ├── config/               # Config editing components
│   │   ├── status/               # Status display components
│   │   └── system-check.tsx      # Prerequisite checker
│   ├── hooks/                    # 13 custom React hooks
│   │   ├── use-docker.ts         # Docker health & detection
│   │   ├── use-install.ts        # Installation lifecycle
│   │   ├── use-gateway.ts        # Gateway start/stop/status
│   │   ├── use-channels.ts       # Channel connections
│   │   ├── use-config.ts         # Config read/write
│   │   ├── use-monitoring.ts     # Status & sessions
│   │   └── ...                   # + 7 more
│   ├── stores/                   # Zustand state stores
│   │   ├── ui.ts                 # UI state (sidebar, theme)
│   │   ├── use-install-store.ts  # Install progress state
│   │   ├── use-gateway-store.ts  # Gateway process state
│   │   ├── use-wizard-store.ts   # Wizard step state
│   │   └── ...                   # + 2 more
│   ├── config/                   # Default config templates
│   ├── lib/                      # Utilities & error helpers
│   ├── router.tsx                # Route definitions (HashRouter)
│   ├── App.tsx                   # Root component
│   └── main.tsx                  # Entry point
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── commands/             # 49 Tauri commands across 17 modules
│   │   │   ├── docker.rs         # Docker health, info, detection
│   │   │   ├── install.rs        # Install/cancel/clean
│   │   │   ├── config.rs         # Config read/write/validate
│   │   │   ├── monitoring.rs     # Status, sessions, containers, logs
│   │   │   ├── channels.rs       # Channel CRUD & validation
│   │   │   ├── gateway.rs        # Gateway process management
│   │   │   ├── gateway_ws.rs     # WebSocket bridge
│   │   │   ├── update.rs         # Update checking & application
│   │   │   ├── uninstall.rs      # Clean uninstall
│   │   │   ├── models.rs         # AI provider model fetching
│   │   │   ├── nodejs.rs         # Node.js/OpenClaw CLI checks
│   │   │   ├── desktop_config.rs # Desktop-specific config
│   │   │   ├── platform.rs       # Platform detection
│   │   │   ├── system_check.rs   # Prerequisite validation
│   │   │   └── ...               # + 3 more
│   │   ├── docker/               # Docker API integration (bollard)
│   │   ├── install/              # Install strategies (Docker + native)
│   │   ├── state.rs              # AppState (gateway PID, WS state)
│   │   ├── error.rs              # Structured AppError enum
│   │   ├── lib.rs                # Plugin registration & command handler
│   │   └── main.rs               # Entry point
│   ├── capabilities/             # Tauri v2 security permissions
│   ├── tauri.conf.json           # Tauri configuration
│   └── Cargo.toml                # Rust dependencies
├── public/                       # Static assets
├── package.json                  # Frontend dependencies
├── vite.config.ts                # Vite + Tauri dev server config
└── tsconfig.json                 # TypeScript configuration
```

## Tauri Command Reference

The Rust backend exposes 49 commands to the frontend via Tauri IPC.

### System & Platform
| Command | Description |
|---------|-------------|
| `get_platform_info` | Detect OS, architecture, and environment |
| `run_system_check` | Validate all prerequisites (Docker, disk, ports, Node.js) |

### Docker
| Command | Description |
|---------|-------------|
| `detect_docker` | Detect Docker installation (Desktop, Engine, Podman) |
| `check_docker_health` | Verify Docker daemon is running |
| `get_docker_info` | Get Docker version and system info |

### Installation
| Command | Description |
|---------|-------------|
| `install_openclaw` | Run OpenClaw installation (Docker or native) |
| `clean_install_dir` | Remove partial/corrupt install artifacts |
| `cancel_install` | Abort a running installation |
| `verify_installation` | Post-install health check |

### Configuration
| Command | Description |
|---------|-------------|
| `read_config` | Read OpenClaw config file |
| `write_config` | Write OpenClaw config file |
| `validate_config` | Validate config against schema |
| `read_desktop_config` | Read desktop-specific settings |
| `write_desktop_config` | Write desktop-specific settings |
| `write_auth_profile` | Write authentication profile |
| `write_env_key` | Write environment variable |

### Monitoring
| Command | Description |
|---------|-------------|
| `get_openclaw_status` | Get OpenClaw process/container status |
| `get_agent_sessions` | List active agent sessions |
| `get_sandbox_containers` | List sandboxed containers |
| `get_container_logs` | Stream container logs |

### Channels
| Command | Description |
|---------|-------------|
| `get_channels` | List configured messaging channels |
| `connect_channel` | Connect a new channel |
| `disconnect_channel` | Disconnect a channel |
| `get_whatsapp_qr` | Get WhatsApp QR code for pairing |
| `validate_telegram_token` | Validate Telegram bot token |
| `validate_discord_token` | Validate Discord bot token |
| `get_contacts` | List channel contacts |
| `update_contact_status` | Update contact mute/block status |
| `get_activity` | Get channel activity feed |

### Gateway
| Command | Description |
|---------|-------------|
| `start_gateway` | Start the OpenClaw Gateway process |
| `stop_gateway` | Stop the gateway |
| `restart_gateway` | Restart the gateway |
| `get_gateway_status` | Get gateway process status |
| `kill_gateway_on_port` | Kill process occupying gateway port |
| `gateway_ws_connect` | Open WebSocket to gateway |
| `gateway_ws_call` | Send RPC call over WebSocket |
| `gateway_ws_disconnect` | Close WebSocket connection |

### Node.js & OpenClaw CLI
| Command | Description |
|---------|-------------|
| `check_nodejs` | Check Node.js installation and version |
| `check_openclaw` | Check OpenClaw CLI availability |
| `check_prerequisites` | Check all Node.js prerequisites |
| `install_openclaw_script` | Install OpenClaw via npm |
| `reinstall_openclaw` | Reinstall OpenClaw CLI |

### Updates & Lifecycle
| Command | Description |
|---------|-------------|
| `check_openclaw_update` | Check for OpenClaw updates |
| `update_openclaw` | Apply OpenClaw update |
| `uninstall_openclaw` | Clean uninstall of OpenClaw |

### UI Control
| Command | Description |
|---------|-------------|
| `open_control_ui` | Open the embedded OpenClaw web UI |
| `close_control_ui` | Close the embedded OpenClaw web UI |
| `fetch_provider_models` | Fetch available models from AI providers |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        ClawStation                           │
│                                                              │
│  ┌─────────────────────┐     Tauri IPC     ┌──────────────┐ │
│  │   React Frontend    │ ◄──────────────►  │ Rust Backend │ │
│  │                     │   invoke/handler   │              │ │
│  │  • 9 Pages          │                    │ • 49 Commands│ │
│  │  • 13 Hooks         │                    │ • bollard    │ │
│  │  • 6 Zustand Stores │                    │ • tokio      │ │
│  │  • TanStack Query   │                    │ • reqwest    │ │
│  │  • shadcn/ui        │                    │ • WebSocket  │ │
│  └─────────────────────┘                    └──────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              External Dependencies                      │ │
│  │  Docker Engine/Desktop ◄── bollard (Unix socket/pipe)  │ │
│  │  OpenClaw Gateway ◄────── tokio-tungstenite (WebSocket)│ │
│  │  AI Provider APIs ◄────── reqwest (HTTP)                │ │
│  │  OpenClaw CLI ◄────────── tauri-plugin-shell (spawning)│ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

The React frontend communicates with the Rust backend through Tauri's `invoke()` IPC. Each Rust command is a `#[tauri::command]` function that runs on the Tokio async runtime. State is managed via `Mutex<AppState>` registered with Tauri's managed state.

## Development

```bash
# Frontend dev server only (no Tauri window)
pnpm dev

# Full Tauri dev (Rust + frontend)
pnpm tauri dev

# Type-check
pnpm tsc

# Build production bundle
pnpm build

# Build Tauri installer
pnpm tauri build
```

### Tauri Plugins Used

| Plugin | Purpose |
|--------|---------|
| `tauri-plugin-os` | Platform detection |
| `tauri-plugin-shell` | Spawn child processes (Docker, npm, etc.) |
| `tauri-plugin-store` | Persistent key-value settings |
| `tauri-plugin-notification` | System notifications |
| `tauri-plugin-dialog` | Native file/confirmation dialogs |
| `tauri-plugin-updater` | Self-update mechanism |
| `tauri-plugin-process` | App restart after updates |

## License

See [LICENSE](LICENSE) for details.
