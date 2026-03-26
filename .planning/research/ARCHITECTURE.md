# Architecture Patterns: OpenClaw Desktop Installer

**Domain:** Tauri v2 desktop app managing system-level tool installations (Docker, CLI tools, services)
**Researched:** 2026-03-26
**Overall confidence:** HIGH

---

## v1.1 Feature Integration Analysis

This document now includes integration analysis for v1.1 UX Polish & Channels milestone features:
1. Real-time Docker log streaming during installation
2. UI/UX overhaul with animations and micro-interactions
3. Channel management for social app connections

---

## Current Architecture (v1.0 Reference)

### Layered Architecture

```
+-----------------------------------------------------+
|              React Frontend (WebView)               |
|  Zustand store <- Tauri events -> invoke() calls    |
|  Pages: Install . Configure . Monitor . Settings    |
+-------------------------+---------------------------+
                          | Tauri IPC Bridge
                          | invoke() <-> #[tauri::command]
+-------------------------v---------------------------+
|              Tauri Core Process (Rust)              |
|                                                     |
|  +-------------+  +-------------+  +-------------+  |
|  |  Commands   |  |   State     |  |  Events     |  |
|  |  (IPC API)  |  | (AppState)  |  | (streaming) |  |
|  +------+------+  +------+------+  +------+------+  |
|         |                |                |         |
|  +------v--------------------------------v------+   |
|  |              Business Logic Layer            |   |
|  |  +----------+ +----------+ +----------+      |   |
|  |  |docker/   | |install/  | |commands/ |      |   |
|  |  |(bollard) | |(native)  | |(config)  |      |   |
|  |  +----------+ +----------+ +----------+      |   |
|  +----------------------------------------------+   |
+-----------------------------------------------------+
         |                    |
+--------v--------+  +--------v--------+
|  Docker Engine  |  | Host System     |
|  (bollard API)  |  | (filesystem,    |
|  docker.sock    |  |  shell, PATH)   |
+-----------------+  +-----------------+
```

### Existing IPC Commands (registered in lib.rs)

| Category | Commands | Pattern |
|----------|----------|---------|
| **Platform** | `get_platform_info` | Query -> Result |
| **Docker** | `check_docker_health`, `get_docker_info`, `detect_docker` | Query -> Result |
| **System** | `run_system_check` | Query -> Result |
| **Install** | `install_openclaw`, `verify_installation` | Mutation + Events |
| **Config** | `read_config`, `write_config`, `validate_config` | Query/Mutation |
| **Monitoring** | `get_openclaw_status`, `get_agent_sessions`, `get_sandbox_containers`, `get_container_logs` | Query (polling) |
| **Lifecycle** | `uninstall_openclaw` | Mutation |
| **Update** | `check_openclaw_update`, `update_openclaw` | Query/Mutation |

### Existing Event Pattern

```
Rust Backend                    Frontend
    |                               |
    |--[emit("install-progress")]-->| listen("install-progress")
    |                               |   -> setProgress(payload)
    |                               |   -> Zustand store update
```

**Current event payload (InstallProgress):**
```rust
pub struct InstallProgress {
    pub step: String,      // "pulling_image", "creating_dirs", etc.
    pub percent: u8,       // 0-100
    pub message: String,   // Human-readable status
}
```

### Existing State Management

| Layer | Store | Purpose |
|-------|-------|---------|
| **Frontend** | `useOnboardingStore` | Install wizard state machine |
| **Frontend** | `useConfigStore` | Config editor dirty state |
| **Frontend** | `useUIStore` | Sidebar open/closed |
| **Backend** | `AppState` | Minimal (just `platform: String`) |

### Frontend Data Fetching

| Hook | Pattern | Data Source |
|------|---------|-------------|
| `useConfig()` | TanStack Query | `invoke("read_config")` |
| `useSaveConfig()` | TanStack Mutation | `invoke("write_config")` |
| `useOpenClawStatus()` | TanStack Query (polling) | `invoke("get_openclaw_status")` |
| `useInstallOpenClaw()` | TanStack Mutation + Event listener | `invoke("install_openclaw")` + `listen("install-progress")` |

---

## v1.1 Integration: Real-Time Docker Log Streaming

### Current State

The `docker_install.rs` already streams image pull progress via bollard:

```rust
// Current: Emits progress during image pull
while let Some(result) = stream.next().await {
    if let Some(status) = &info.status {
        emit_progress(app_handle, "pulling_image", percent, &format!("{status}..."));
    }
}
```

**Gap:** Only emits high-level status (`"Downloading..."`, `"Extracting..."`), not detailed Docker layer output.

### Enhanced Event Structure

**NEW EVENT: `docker-log`**

```
+-------------------+                    +-------------------+
|   docker_install  |                    |   Frontend        |
+-------------------+                    +-------------------+
        |                                        |
        |  emit("docker-log", DockerLogLine)     |
        |--------------------------------------->|
        |                                        | append to log buffer
        |  emit("install-progress", Progress)    |
        |--------------------------------------->|
        |                                        | update progress bar
```

**Rust types:**

```rust
// NEW: Detailed log line for Docker operations
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerLogLine {
    pub timestamp: String,      // ISO 8601
    pub level: LogLevel,        // info, warn, error, debug
    pub layer_id: Option<String>, // Docker layer SHA
    pub message: String,        // Raw log message
    pub progress: Option<LayerProgress>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LayerProgress {
    pub current: u64,
    pub total: u64,
    pub unit: String,           // "bytes", "MB"
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Info,
    Warn,
    Error,
    Debug,
}
```

**Frontend hook enhancement:**

```typescript
// Enhanced useInstallOpenClaw hook
interface DockerLogLine {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  layerId?: string;
  message: string;
  progress?: { current: number; total: number; unit: string };
}

export function useInstallOpenClaw() {
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [logs, setLogs] = useState<DockerLogLine[]>([]);  // NEW

  useEffect(() => {
    const unlistenProgress = listen<InstallProgress>("install-progress", (e) => {
      setProgress(e.payload);
    });

    // NEW: Listen for detailed Docker logs
    const unlistenLogs = listen<DockerLogLine>("docker-log", (e) => {
      setLogs(prev => [...prev.slice(-500), e.payload]); // Keep last 500 lines
    });

    return () => {
      unlistenProgress.then(fn => fn());
      unlistenLogs.then(fn => fn());
    };
  }, []);
  // ...
}
```

### Rust Implementation Points

**Modify:** `src-tauri/src/install/docker_install.rs`

```
docker_install()
    |
    +-- emit_progress() [existing - keep for progress bar]
    |
    +-- emit_docker_log() [NEW - detailed layer logs]
```

**No new commands needed** - log streaming uses existing event pattern, just adds new event type.

### Build Order for Log Streaming

1. **Add types** - `DockerLogLine`, `LayerProgress` in `install/progress.rs`
2. **Add emit helper** - `emit_docker_log()` function
3. **Modify docker_install** - Emit logs during `create_image` stream
4. **Update frontend hook** - Add log listener to `useInstallOpenClaw`
5. **Add log viewer component** - Terminal-style component in `step-install.tsx`

---

## v1.1 Integration: Animation State Management

### Current UI State

```
useUIStore (Zustand)
  +-- sidebarOpen: boolean
  +-- toggleSidebar()
  +-- setSidebarOpen()
```

**Gap:** No animation state, no transition coordination.

### Animation Strategy

**Recommended approach:** CSS-first animations with Tailwind, not JS animation state.

```
+-----------------------------------------+
|          Animation Categories           |
+-----------------------------------------+
| Micro-interactions   | CSS transitions  |
| (hover, focus, tap)  | (Tailwind only)  |
+-----------------------------------------+
| Component entrances  | CSS @keyframes   |
| (mount animations)   | (Tailwind only)  |
+-----------------------------------------+
| Progress animations  | CSS transitions  |
| (bars, spinners)     | on state change  |
+-----------------------------------------+
| Page transitions     | Framer Motion    |
| (optional, complex)  | (if needed)      |
+-----------------------------------------+
```

### No New Zustand State Needed

Animation state should NOT live in global stores because:
1. Animations are transient (not persisted)
2. Each component owns its animation lifecycle
3. CSS handles most cases via Tailwind classes

**Pattern for component-level animation:**

```tsx
// Local state for animations, not Zustand
function ChannelCard({ channel }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);

  return (
    <div
      className={cn(
        "transition-all duration-200",
        isHovered && "scale-[1.02] shadow-lg",
        isExpanding && "animate-expand"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ... */}
    </div>
  );
}
```

### Animation Utilities (Tailwind v4)

**Add to `src/index.css`:**

```css
@theme {
  --animate-fade-in: fade-in 0.2s ease-out;
  --animate-slide-up: slide-up 0.3s ease-out;
  --animate-pulse-subtle: pulse-subtle 2s ease-in-out infinite;
  --animate-expand: expand 0.2s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes expand {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

### Build Order for Animations

1. **Add CSS utilities** - Custom keyframes in `index.css`
2. **Create animation primitives** - `AnimatedCard`, `AnimatedList` components
3. **Update existing components** - Add transitions to Cards, Buttons, Progress
4. **Add page transitions** - (Optional) Consider Framer Motion if needed

---

## v1.1 Integration: Channel Management

### Architecture Overview

```
+------------------------------------------------------------------+
|                        Frontend                                   |
+------------------------------------------------------------------+
|  /channels page                                                  |
|  +-------------------+  +--------------------+  +---------------+ |
|  | ChannelsOverview  |  | ChannelSetupWizard |  | ChannelStatus | |
|  | (list all)        |  | (per-channel)      |  | (monitoring)  | |
|  +-------------------+  +--------------------+  +---------------+ |
|           |                      |                     |          |
|  +--------v----------------------v---------------------v--------+ |
|  |                    useChannelsStore (Zustand)                | |
|  |  channels: Channel[]                                          | |
|  |  activeSetup: ChannelType | null                              | |
|  |  setupProgress: SetupProgress | null                          | |
|  +-------------------------------+------------------------------+ |
|                                  |                                |
|                    invoke() + listen()                            |
+----------------------------------+--------------------------------+
                                   |
+----------------------------------v--------------------------------+
|                       Rust Backend                                |
+------------------------------------------------------------------+
|  NEW MODULE: src-tauri/src/commands/channels.rs                  |
|                                                                   |
|  Commands:                                                        |
|  +------------------------+  +-------------------------+          |
|  | get_channel_status     |  | start_whatsapp_pairing  |          |
|  | list_channels          |  | submit_telegram_token   |          |
|  | disconnect_channel     |  | submit_discord_token    |          |
|  +------------------------+  +-------------------------+          |
|                                                                   |
|  Events:                                                          |
|  +------------------------+  +-------------------------+          |
|  | channel-status-changed |  | whatsapp-qr-code        |          |
|  | pairing-progress       |  | channel-message         |          |
|  +------------------------+  +-------------------------+          |
+------------------------------------------------------------------+
                                   |
+----------------------------------v--------------------------------+
|                    OpenClaw API / Config                          |
+------------------------------------------------------------------+
|  ~/.openclaw/config.yaml                                         |
|    channels:                                                      |
|      whatsapp:                                                    |
|        enabled: true                                              |
|        session_path: ~/.openclaw/channels/whatsapp                |
|      telegram:                                                    |
|        enabled: true                                              |
|        bot_token_env: TELEGRAM_BOT_TOKEN                          |
|      discord:                                                     |
|        enabled: true                                              |
|        bot_token_env: DISCORD_BOT_TOKEN                           |
+------------------------------------------------------------------+
```

### New Rust Types

**File:** `src-tauri/src/commands/channels.rs` (NEW)

```rust
use serde::{Deserialize, Serialize};

/// Supported channel types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ChannelType {
    Whatsapp,
    Telegram,
    Discord,
    Slack,
    Email,
}

/// Channel connection status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "status")]
pub enum ChannelStatus {
    Connected {
        connected_at: String,
        account_info: Option<String>,
    },
    Disconnected,
    Pairing {
        qr_code: Option<String>,  // Base64 QR for WhatsApp
        instructions: String,
    },
    Error {
        message: String,
        suggestion: String,
    },
}

/// A configured channel
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Channel {
    pub channel_type: ChannelType,
    pub enabled: bool,
    pub status: ChannelStatus,
    pub display_name: String,
    pub icon: String,           // Icon identifier for frontend
    pub requires_token: bool,   // Telegram/Discord need tokens
    pub requires_pairing: bool, // WhatsApp needs QR pairing
}

/// Progress during channel setup
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelSetupProgress {
    pub channel: ChannelType,
    pub step: String,
    pub percent: u8,
    pub message: String,
}
```

### New Rust Commands

**File:** `src-tauri/src/commands/channels.rs` (NEW)

| Command | Input | Output | Events |
|---------|-------|--------|--------|
| `list_channels` | none | `Vec<Channel>` | none |
| `get_channel_status` | `channel: ChannelType` | `Channel` | none |
| `start_whatsapp_pairing` | none | `()` | `whatsapp-qr-code`, `pairing-progress` |
| `submit_telegram_token` | `token: String` | `Result<(), AppError>` | `channel-status-changed` |
| `submit_discord_token` | `token: String` | `Result<(), AppError>` | `channel-status-changed` |
| `disconnect_channel` | `channel: ChannelType` | `()` | `channel-status-changed` |
| `test_channel_connection` | `channel: ChannelType` | `Result<(), AppError>` | none |

### New Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `whatsapp-qr-code` | `{ qrCode: string (base64) }` | During WhatsApp pairing |
| `pairing-progress` | `ChannelSetupProgress` | During any channel setup |
| `channel-status-changed` | `{ channel: ChannelType, status: ChannelStatus }` | On connect/disconnect |
| `channel-message` | `{ channel: ChannelType, preview: string }` | (Optional) New message notification |

### Frontend Store

**File:** `src/stores/use-channels-store.ts` (NEW)

```typescript
import { create } from "zustand";

export type ChannelType = 'whatsapp' | 'telegram' | 'discord' | 'slack' | 'email';

export type ChannelStatus =
  | { status: 'connected'; connectedAt: string; accountInfo?: string }
  | { status: 'disconnected' }
  | { status: 'pairing'; qrCode?: string; instructions: string }
  | { status: 'error'; message: string; suggestion: string };

export interface Channel {
  channelType: ChannelType;
  enabled: boolean;
  status: ChannelStatus;
  displayName: string;
  icon: string;
  requiresToken: boolean;
  requiresPairing: boolean;
}

interface ChannelsState {
  channels: Channel[];
  activeSetup: ChannelType | null;
  setupProgress: { step: string; percent: number; message: string } | null;
  qrCode: string | null;

  setChannels: (channels: Channel[]) => void;
  updateChannelStatus: (type: ChannelType, status: ChannelStatus) => void;
  startSetup: (type: ChannelType) => void;
  setSetupProgress: (progress: { step: string; percent: number; message: string } | null) => void;
  setQrCode: (qr: string | null) => void;
  clearSetup: () => void;
}

export const useChannelsStore = create<ChannelsState>((set) => ({
  channels: [],
  activeSetup: null,
  setupProgress: null,
  qrCode: null,

  setChannels: (channels) => set({ channels }),
  updateChannelStatus: (type, status) => set((state) => ({
    channels: state.channels.map(ch =>
      ch.channelType === type ? { ...ch, status } : ch
    ),
  })),
  startSetup: (type) => set({ activeSetup: type, setupProgress: null, qrCode: null }),
  setSetupProgress: (progress) => set({ setupProgress: progress }),
  setQrCode: (qrCode) => set({ qrCode }),
  clearSetup: () => set({ activeSetup: null, setupProgress: null, qrCode: null }),
}));
```

### Frontend Hook

**File:** `src/hooks/use-channels.ts` (NEW)

```typescript
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useChannelsStore } from "@/stores/use-channels-store";
import type { Channel, ChannelType, ChannelStatus } from "@/stores/use-channels-store";

export function useChannels() {
  const { setChannels, updateChannelStatus, setQrCode, setSetupProgress } = useChannelsStore();

  // Event listeners for real-time updates
  useEffect(() => {
    const unlistenStatus = listen<{ channel: ChannelType; status: ChannelStatus }>(
      "channel-status-changed",
      (e) => updateChannelStatus(e.payload.channel, e.payload.status)
    );

    const unlistenQr = listen<{ qrCode: string }>(
      "whatsapp-qr-code",
      (e) => setQrCode(e.payload.qrCode)
    );

    const unlistenProgress = listen<{ step: string; percent: number; message: string }>(
      "pairing-progress",
      (e) => setSetupProgress(e.payload)
    );

    return () => {
      unlistenStatus.then(fn => fn());
      unlistenQr.then(fn => fn());
      unlistenProgress.then(fn => fn());
    };
  }, []);

  return useQuery<Channel[]>({
    queryKey: ["channels"],
    queryFn: async () => {
      const channels = await invoke<Channel[]>("list_channels");
      setChannels(channels);
      return channels;
    },
    refetchInterval: 30_000, // Poll every 30s
  });
}

export function useStartWhatsAppPairing() {
  const { startSetup } = useChannelsStore();
  return useMutation({
    mutationFn: async () => {
      startSetup('whatsapp');
      await invoke("start_whatsapp_pairing");
    },
  });
}

export function useSubmitToken(channelType: 'telegram' | 'discord') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const command = channelType === 'telegram'
        ? "submit_telegram_token"
        : "submit_discord_token";
      await invoke(command, { token });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}

export function useDisconnectChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channelType: ChannelType) => {
      await invoke("disconnect_channel", { channel: channelType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}
```

### New Components

```
src/
  pages/
    channels.tsx           (NEW - main channels page)
  components/
    channels/
      channels-overview.tsx    (NEW - list of all channels)
      channel-card.tsx         (NEW - individual channel status card)
      whatsapp-setup.tsx       (NEW - QR code pairing flow)
      token-setup.tsx          (NEW - Telegram/Discord token input)
      connection-status.tsx    (NEW - status indicator)
```

### Router Update

**Modify:** `src/router.tsx`

```tsx
import { Channels } from "@/pages/channels";  // NEW

<Routes>
  {/* ... existing routes ... */}
  <Route path="/channels" element={<Channels />} />  {/* NEW */}
</Routes>
```

### Sidebar Update

**Modify:** `src/components/layout/sidebar-nav.tsx`

Add new navigation item between Configure and Monitor:
```tsx
{ icon: MessageSquare, label: "Channels", path: "/channels" }
```

### Config Schema Extension

**Modify:** `src-tauri/src/commands/config.rs`

```rust
// Add to OpenClawConfig
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct OpenClawConfig {
    pub provider: Option<ProviderConfig>,
    pub sandbox: Option<SandboxConfig>,
    pub tools: Option<ToolsConfig>,
    pub agents: Option<AgentsConfig>,
    pub channels: Option<ChannelsConfig>,  // NEW
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelsConfig {
    pub whatsapp: Option<WhatsAppConfig>,
    pub telegram: Option<TelegramConfig>,
    pub discord: Option<DiscordConfig>,
    pub slack: Option<SlackConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WhatsAppConfig {
    pub enabled: bool,
    pub session_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TelegramConfig {
    pub enabled: bool,
    pub bot_token_env: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscordConfig {
    pub enabled: bool,
    pub bot_token_env: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SlackConfig {
    pub enabled: bool,
    pub app_token_env: Option<String>,
    pub bot_token_env: Option<String>,
}
```

---

## Suggested Build Order (v1.1)

Based on dependencies between features:

```
Week 1: Foundation
+-----------------------------------------------+
|  1. Docker Log Streaming (backend)            |
|     - Add DockerLogLine types                 |
|     - Add emit_docker_log() helper            |
|     - Modify docker_install.rs                |
|                                               |
|  2. Docker Log Streaming (frontend)           |
|     - Update useInstallOpenClaw hook          |
|     - Add log viewer component                |
+-----------------------------------------------+
         |
         v
Week 2: Animation System
+-----------------------------------------------+
|  3. CSS Animation Utilities                   |
|     - Add keyframes to index.css              |
|     - Create animation utility classes        |
|                                               |
|  4. Component Animation Updates               |
|     - Update Card, Button, Progress           |
|     - Add AnimatedList primitive              |
|     - Update step-install.tsx with animations |
+-----------------------------------------------+
         |
         v
Week 3-4: Channel Management
+-----------------------------------------------+
|  5. Channel Types & Commands (backend)        |
|     - Create channels.rs module               |
|     - Add ChannelType, Channel, ChannelStatus |
|     - Implement list_channels command         |
|     - Register in lib.rs                      |
|                                               |
|  6. Channel Store & Hooks (frontend)          |
|     - Create use-channels-store.ts            |
|     - Create use-channels.ts hook             |
|                                               |
|  7. Channels Page & Components                |
|     - Create channels.tsx page                |
|     - Create channel-card.tsx                 |
|     - Create channels-overview.tsx            |
|     - Update router and sidebar               |
|                                               |
|  8. WhatsApp Pairing Flow                     |
|     - Implement start_whatsapp_pairing        |
|     - Add QR code event streaming             |
|     - Create whatsapp-setup.tsx               |
|                                               |
|  9. Token-Based Channels                      |
|     - Implement submit_telegram_token         |
|     - Implement submit_discord_token          |
|     - Create token-setup.tsx                  |
|                                               |
| 10. Channel Monitoring                        |
|     - Add disconnect_channel                  |
|     - Add test_channel_connection             |
|     - Create connection-status.tsx            |
+-----------------------------------------------+
```

### Dependency Graph

```
                    Docker Log Streaming
                           |
                           v
                    Animation System
                           |
                           v
+----------------------+   |   +----------------------+
|  Channel Backend     |<--+-->|  Channel Frontend    |
|  (types, commands)   |       |  (store, hooks)      |
+----------+-----------+       +----------+-----------+
           |                              |
           v                              v
+----------+-----------+       +----------+-----------+
|  WhatsApp Pairing    |       |  Channel UI          |
|  (QR flow)           |       |  (page, cards)       |
+----------+-----------+       +----------+-----------+
           |                              |
           +---------------+--------------+
                           |
                           v
              +------------+-------------+
              |  Token Channels          |
              |  (Telegram, Discord)     |
              +------------+-------------+
                           |
                           v
              +------------+-------------+
              |  Channel Monitoring      |
              |  (status, disconnect)    |
              +--------------------------+
```

---

## Files to Create (NEW)

| File | Purpose |
|------|---------|
| `src-tauri/src/commands/channels.rs` | Channel management commands |
| `src/stores/use-channels-store.ts` | Channel state management |
| `src/hooks/use-channels.ts` | Channel data hooks |
| `src/pages/channels.tsx` | Main channels page |
| `src/components/channels/channels-overview.tsx` | Channel list view |
| `src/components/channels/channel-card.tsx` | Individual channel card |
| `src/components/channels/whatsapp-setup.tsx` | QR code pairing wizard |
| `src/components/channels/token-setup.tsx` | Token input for Telegram/Discord |
| `src/components/channels/connection-status.tsx` | Status indicator component |
| `src/components/install/log-viewer.tsx` | Terminal-style Docker log viewer |

## Files to Modify

| File | Changes |
|------|---------|
| `src-tauri/src/commands/mod.rs` | Add `pub mod channels;` |
| `src-tauri/src/lib.rs` | Register new channel commands |
| `src-tauri/src/commands/config.rs` | Add `ChannelsConfig` to `OpenClawConfig` |
| `src-tauri/src/install/progress.rs` | Add `DockerLogLine` type, `emit_docker_log()` |
| `src-tauri/src/install/docker_install.rs` | Emit detailed logs during install |
| `src/hooks/use-install.ts` | Add Docker log listener |
| `src/components/install/step-install.tsx` | Add log viewer, animations |
| `src/router.tsx` | Add `/channels` route |
| `src/components/layout/sidebar-nav.tsx` | Add Channels nav item |
| `src/index.css` | Add animation keyframes |
| `src/stores/use-config-store.ts` | Add channel config types |

---

## Confidence Assessment

| Feature | Confidence | Notes |
|---------|------------|-------|
| Docker log streaming | HIGH | Extends existing event pattern |
| Animation approach | HIGH | Tailwind v4 CSS-first is industry standard |
| Channel types/commands | HIGH | Follows existing command patterns |
| WhatsApp QR pairing | MEDIUM | Depends on OpenClaw's internal WhatsApp bridge API |
| Token-based channels | HIGH | Simple string storage/validation |
| Channel monitoring | MEDIUM | May need OpenClaw API research for status polling |

---

## Sources

| Source | Type | Confidence |
|--------|------|------------|
| [Existing codebase analysis](./src-tauri/) | Primary source | HIGH |
| [Tauri v2 Events docs](https://v2.tauri.app/develop/calling-rust/#event-system) | Official docs | HIGH |
| [bollard CreateImage streaming](https://docs.rs/bollard/latest/bollard/image/struct.Image.html) | Crate docs | HIGH |
| [Tailwind v4 animations](https://tailwindcss.com/docs/animation) | Official docs | HIGH |
| [OpenClaw channels config](https://openclaw.dev/docs/channels) | OpenClaw docs | MEDIUM |

---

*Updated: 2026-03-26 for v1.1 milestone integration analysis*
