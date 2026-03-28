# ClawStation

**The desktop app that makes [OpenClaw](https://github.com/openclaw/openclaw) accessible to everyone.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/Built%20with-Tauri-ffc131)](https://v2.tauri.app/)
[![Built with React](https://img.shields.io/badge/Built%20with-React-61dafb)](https://react.dev/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-lightgrey)](#platform-support)

> OpenClaw is a powerful AI agent platform — but it requires command-line knowledge to install, configure, and manage. **ClawStation replaces the terminal with a polished desktop app.** Install OpenClaw, connect your AI models, sandbox agents safely, and monitor everything — all without touching a command line.

<!-- Screenshot: Add app screenshot here -->

---

## What is ClawStation?

OpenClaw lets you run AI agents that can browse the web, write code, send messages, and automate tasks. But setting it up normally means opening a terminal, installing Docker, editing config files, and running CLI commands.

**ClawStation gives you a friendly desktop window to do all of that.** Click to install. Fill in a form to configure. Watch a progress bar as your sandbox sets up. Connect your messaging apps with a few clicks. It's OpenClaw without the complexity.

---

## Features

| Feature | What it does |
|---------|-------------|
| **Guided Setup** | Step-by-step wizard walks you through prerequisites, API keys, model selection, and sandboxing |
| **Safe Sandboxing** | Run AI agents inside isolated Docker containers so they can't affect your system |
| **Gateway Management** | Start, stop, and monitor the OpenClaw Gateway process from the app |
| **Channel Connections** | Connect WhatsApp (QR pairing), Telegram, and Discord bots |
| **Config Editor** | Edit OpenClaw settings with validation — no manual YAML editing |
| **Live Monitoring** | See agent sessions, container status, and logs in real time |
| **Self-Updating** | The app checks for updates and installs them automatically |
| **Cross-Platform** | Works on Windows and Linux (macOS experimental) |

---

## Quick Start

### For Users (Download & Run)

1. Download the latest installer from [GitHub Releases](https://github.com/openclaw/clawstation/releases)
2. Run the installer:
   - **Windows:** `.msi` installer
   - **Linux:** `.AppImage` or `.deb` package
3. ClawStation launches with a setup wizard

### For Developers (Build from Source)

**Prerequisites:**

- [Node.js](https://nodejs.org/) ≥ 18
- [pnpm](https://pnpm.io/) (recommended) or npm
- [Rust](https://rustup.rs/) stable toolchain
- [Docker](https://docs.docker.com/get-docker/) (for sandboxed installation)

**Platform-specific setup:**

| Platform | Additional requirements |
|----------|------------------------|
| Windows | [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) + WebView2 runtime |
| Linux | `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf` |
| macOS | Xcode Command Line Tools (`xcode-select --install`) |

**Run from source:**

```bash
git clone https://github.com/openclaw/clawstation.git
cd clawstation
pnpm install
pnpm tauri dev
```

**Build for production:**

```bash
pnpm tauri build
```

Output artifacts are in `src-tauri/target/release/bundle/`.

---

## How It Works

ClawStation is a **Tauri v2** application — a Rust backend with a React frontend. The frontend shows you buttons and forms; the backend handles Docker, process management, file I/O, and network communication.

```
┌──────────────────────────────────────────────────────────────┐
│                        ClawStation                           │
│                                                              │
│  ┌─────────────────────┐     Tauri IPC     ┌──────────────┐ │
│  │   React Frontend    │ ◄──────────────►  │ Rust Backend │ │
│  │                     │   invoke/handler   │              │ │
│  │  • 9 Pages          │                    │ • 49 Commands│ │
│  │  • 13 Hooks         │                    │ • Docker API │ │
│  │  • 6 State Stores   │                    │ • WebSocket  │ │
│  │  • TanStack Query   │                    │ • Process Mgmt│ │
│  │  • shadcn/ui        │                    │ • HTTP Client │ │
│  └─────────────────────┘                    └──────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              External Services                          │ │
│  │  Docker Engine ◄────────── bollard (Rust Docker client) │ │
│  │  OpenClaw Gateway ◄─────── WebSocket (tokio-tungstenite)│ │
│  │  AI Provider APIs ◄─────── reqwest (HTTP)               │ │
│  │  OpenClaw CLI ◄─────────── tauri-plugin-shell           │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

When you click "Install" in the app, the React frontend calls a Rust function via Tauri's IPC bridge. The Rust code talks to Docker, manages processes, and streams progress events back to the UI. State is shared between frontend and backend through managed mutexes and async channels.

---

## Development

### Commands

```bash
pnpm dev              # Frontend dev server only (no Tauri window)
pnpm tauri dev        # Full Tauri dev (Rust + frontend)
pnpm tsc              # Type-check TypeScript
pnpm build            # Build production frontend bundle
pnpm tauri build      # Build platform-specific installer
```

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop runtime | Tauri | 2.x |
| Frontend framework | React | 19.1 |
| Language | TypeScript | 5.8 |
| Build tool | Vite | 8.0 |
| CSS | Tailwind CSS | 4.2 |
| UI components | shadcn/ui (Radix UI) | latest |
| Client state | Zustand | 5.0 |
| Server state | TanStack Query | 5.x |
| Backend language | Rust | stable |
| Docker API | bollard | 0.20 |
| Async runtime | tokio | 1.x |
| HTTP client | reqwest | 0.12 |
| WebSocket | tokio-tungstenite | 0.26 |

### Project Structure

<details>
<summary>Click to expand full project tree</summary>

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
│   │   ├── ui/                   # shadcn/ui primitives
│   │   ├── layout/               # App shell, sidebar, header
│   │   ├── wizard/               # Setup wizard step components
│   │   ├── install/              # Install flow step components
│   │   └── channels/             # Channel pairing modals
│   ├── hooks/                    # 13 custom React hooks
│   ├── stores/                   # 6 Zustand state stores
│   ├── config/                   # Default config templates
│   ├── lib/                      # Utilities & error helpers
│   ├── router.tsx                # Route definitions
│   ├── App.tsx                   # Root component
│   └── main.tsx                  # Entry point
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── commands/             # 49 Tauri commands (17 modules)
│   │   ├── docker/               # Docker API integration
│   │   ├── install/              # Install strategies
│   │   ├── state.rs              # App state (gateway PID, WebSocket)
│   │   ├── error.rs              # Structured error types
│   │   ├── lib.rs                # Plugin registration
│   │   └── main.rs               # Entry point
│   ├── capabilities/             # Tauri v2 security permissions
│   ├── tauri.conf.json           # Tauri configuration
│   └── Cargo.toml                # Rust dependencies
├── package.json                  # Frontend dependencies
├── vite.config.ts                # Vite + Tauri dev server config
└── tsconfig.json                 # TypeScript configuration
```

</details>

### Tauri Command Reference

<details>
<summary>Click to expand all 49 backend commands</summary>

The Rust backend exposes these commands to the React frontend:

**System & Platform**
| Command | Description |
|---------|-------------|
| `get_platform_info` | Detect OS, architecture, environment |
| `run_system_check` | Validate all prerequisites |

**Docker**
| Command | Description |
|---------|-------------|
| `detect_docker` | Detect Docker installation |
| `check_docker_health` | Verify Docker daemon is running |
| `get_docker_info` | Get Docker version and system info |

**Installation**
| Command | Description |
|---------|-------------|
| `install_openclaw` | Run installation (Docker or native) |
| `clean_install_dir` | Remove partial install artifacts |
| `cancel_install` | Abort running installation |
| `verify_installation` | Post-install health check |

**Configuration**
| Command | Description |
|---------|-------------|
| `read_config` / `write_config` / `validate_config` | Config file management |
| `read_desktop_config` / `write_desktop_config` | Desktop settings |
| `write_auth_profile` / `write_env_key` | Auth & environment |

**Monitoring**
| Command | Description |
|---------|-------------|
| `get_openclaw_status` | Process/container status |
| `get_agent_sessions` | Active agent sessions |
| `get_sandbox_containers` | Sandbox containers |
| `get_container_logs` | Stream container logs |

**Channels**
| Command | Description |
|---------|-------------|
| `get_channels` / `connect_channel` / `disconnect_channel` | Channel management |
| `get_whatsapp_qr` / `validate_telegram_token` / `validate_discord_token` | Channel auth |
| `get_contacts` / `update_contact_status` / `get_activity` | Contacts & activity |

**Gateway**
| Command | Description |
|---------|-------------|
| `start_gateway` / `stop_gateway` / `restart_gateway` | Gateway lifecycle |
| `get_gateway_status` / `kill_gateway_on_port` | Gateway monitoring |
| `gateway_ws_connect` / `gateway_ws_call` / `gateway_ws_disconnect` | WebSocket bridge |

**Updates & Lifecycle**
| Command | Description |
|---------|-------------|
| `check_openclaw_update` / `update_openclaw` | Update management |
| `uninstall_openclaw` | Clean uninstall |
| `open_control_ui` / `close_control_ui` | Embedded web UI |

</details>

---

## FAQ

**Do I need to know Docker?**
No. ClawStation handles Docker installation, configuration, and container management for you. You only need to click buttons.

**Does it work on Mac?**
macOS is secondary support. It may work but isn't actively tested. Windows and Linux are the primary platforms.

**Is my data safe?**
Everything runs locally on your machine. No data is sent to ClawStation's servers. AI provider API keys are stored in your local config files.

**How is this different from using OpenClaw directly?**
OpenClaw is a command-line tool. If you're comfortable with terminals, you can use it directly. ClawStation gives you the same functionality through a visual desktop app.

**Does it cost anything?**
ClawStation is free and open source. You only need API keys for the AI providers you choose (OpenAI, Anthropic, etc.) — those have their own pricing.

---

## Contributing

Contributions are welcome! Here's how to get involved:

**Report a bug:** Open an [issue](https://github.com/openclaw/clawstation/issues) with steps to reproduce.

**Suggest a feature:** Open an issue describing what you'd like and why.

**Submit code:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run type-checking (`pnpm tsc`) and linting
5. Commit with a descriptive message
6. Push and open a Pull Request

**Code style:**
- Frontend: ESLint + Prettier
- Backend: `cargo fmt` + `cargo clippy`

---

## Community & Support

- [GitHub Issues](https://github.com/openclaw/clawstation/issues) — Bug reports and feature requests
- [OpenClaw Docs](https://github.com/openclaw/openclaw) — The AI agent platform this app manages

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Made with care by the <a href="https://github.com/openclaw">OpenClaw</a> community</sub>
</p>
