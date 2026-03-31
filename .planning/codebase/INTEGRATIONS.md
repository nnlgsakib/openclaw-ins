# External Integrations

**Analysis Date:** 2026-03-31

## APIs & External Services

**OpenClaw Gateway (Local):**
- Local gateway service running on `http://127.0.0.1:18789`
- WebSocket connection at `ws://127.0.0.1:18789` for JSON-RPC style calls
- Health endpoints: `/healthz`, `/readyz`
- REST API endpoints: `/api/channels`, `/api/sessions`, `/api/contacts`, `/api/activity`
- Managed via Tauri commands in `src-tauri/src/commands/gateway.rs` and `gateway_ws.rs`

**GitHub API:**
- Fetches latest OpenClaw release version from `https://api.github.com/repos/openclaw/openclaw/releases/latest`
- Used for update checking in `src-tauri/src/commands/update.rs`
- Updater endpoint: `https://raw.githubusercontent.com/openclaw/clawstation/main/latest.json`
- Client: `reqwest` crate

**AI Model Providers (for OpenClaw configuration):**
- OpenAI: `https://api.openai.com/v1/models`
- Groq: `https://api.groq.com/v1/models`
- Cerebras: `https://api.cerebras.ai/v1/models`
- Moonshot: `https://api.moonshot.ai/v1/models`
- Mistral: `https://api.mistral.ai/v1/models`
- xAI: `https://api.x.ai/v1/models`
- ZhipuAI: `https://open.bigmodel.cn/paas/v4/v1/models`
- Together: `https://api.together.xyz/v1/models`
- HuggingFace: `https://api-inference.huggingface.co/v1/models`
- OpenRouter: `https://openrouter.ai/api/v1/models`
- Anthropic: Static model list (no public models API)
- Google: Static model list
- Ollama (local): `http://127.0.0.1:11434/api/tags`
- Local vLLM: `http://127.0.0.1:8000/v1/models`
- Local SGLang: `http://127.0.0.1:30000/v1/models`
- Kilo Code: `https://api.kilo.ai/api/gateway/v1/models`
- Vercel AI Gateway: `https://ai-gateway.vercel.sh/v1/models`
- OpenCode: `https://api.opencode.ai/v1/models`
- Managed via `src-tauri/src/commands/models.rs`

**Messaging Channels (via OpenClaw):**
- WhatsApp - QR code pairing via `/api/channels/whatsapp/qr`
- Telegram - Token validation via `/api/channels/telegram/validate`
- Discord - Token validation via `/api/channels/discord/validate`
- Slack - Channel management via OpenClaw API
- Managed via `src-tauri/src/commands/channels.rs`

**Docker API:**
- Docker daemon connection via Unix socket (Linux) or named pipe/HTTP (Windows)
- Container management: list, inspect, logs, create images
- Image registry: `ghcr.io/openclaw/openclaw` (GitHub Container Registry)
- Client: `bollard` crate in `src-tauri/src/docker/check.rs` and `src-tauri/src/commands/monitoring.rs`

## Data Storage

**Databases:**
- None - application uses file-based configuration

**File Storage:**
- OpenClaw config: `~/.openclaw/openclaw.json` (JSON5 format)
- Docker compose: `~/.openclaw/docker-compose.yml`
- Desktop config: Tauri Store plugin (async file-based key-value)
- Managed in `src-tauri/src/commands/config.rs` and `desktop_config.rs`

**Caching:**
- TanStack Query in-memory cache for frontend (5-300s stale times depending on query)

## Authentication & Identity

**Auth Provider:**
- Custom - OpenClaw handles its own authentication
- Desktop config stores auth profiles via `write_auth_profile` command
- API keys managed through config write operations in `src-tauri/src/commands/desktop_config.rs`

## Monitoring & Observability

**Error Tracking:**
- None detected - errors returned via structured `AppError` enum

**Logs:**
- Gateway stdout/stderr streamed to frontend via Tauri events (`gateway-output`)
- Docker container logs fetched via `bollard` and displayed in UI log viewer
- Log viewer component: `src/components/ui/log-viewer.tsx`

## CI/CD & Deployment

**Hosting:**
- GitHub Releases for binary distribution
- GitHub Container Registry (`ghcr.io`) for Docker images

**CI Pipeline:**
- Not detected in codebase (GitHub Actions likely at repository root, not explored)

**Updater:**
- Tauri Updater plugin configured in `src-tauri/tauri.conf.json`
- Endpoint: `https://raw.githubusercontent.com/openclaw/clawstation/main/latest.json`
- Public key for signature verification included in config

## Environment Configuration

**Required env vars:**
- `OPENCLAW_WORKSPACE` - Set when starting gateway (from desktop config)
- `OPENCLAW_PORT` - Read for Docker container port detection
- `TAURI_DEV_HOST` - Vite dev server host for HMR

**Secrets location:**
- Tauri Store plugin (`@tauri-apps/plugin-store`) for persistent app settings
- `~/.openclaw/openclaw.json` for OpenClaw API keys and provider configs
- Environment variables passed to gateway process

## Webhooks & Callbacks

**Incoming:**
- Tauri events emitted to frontend:
  - `gateway-output` - Gateway stdout/stderr lines
  - `gateway-status` - Connection status changes
  - `gateway-stopped` - Gateway process exit
  - `gateway-startup-phase` - Startup phase changes (starting, healthChecking, ready, failed)
  - `gateway-ws-status` - WebSocket connection status
  - `install-progress` - Installation progress updates

**Outgoing:**
- HTTP requests to OpenClaw Gateway REST API
- HTTP requests to provider model APIs
- WebSocket JSON-RPC calls to Gateway
- GitHub API calls for update checks

---

*Integration audit: 2026-03-31*
