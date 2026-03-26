# Technology Stack

**Project:** OpenClaw Desktop Installer (Tauri v2 Desktop App)
**Researched:** 2026-03-26
**Confidence:** HIGH

---

## v1.1 Stack Additions

This document covers **only the new capabilities** needed for v1.1 features. The existing stack (Tauri v2, React 19, TypeScript, Tailwind v4, shadcn/ui, Zustand, TanStack Query, bollard, Vite 8) remains unchanged.

### New Feature Areas

| Feature | What's Needed | Why |
|---------|---------------|-----|
| Real-time Docker log streaming | Tauri Channels, bollard streaming API | Replace fake percentages with actual Docker pull progress |
| Animations & micro-interactions | Motion library, shadcn animation components | Modern, interactive UI feel |
| Channel management UI | QR code component, additional shadcn components | WhatsApp pairing, visual channel status |

---

## 1. Real-Time Log Streaming

### Backend: Use Existing Stack (No Changes)

The current stack **already supports real-time streaming**:

| Component | Version | Capability | Notes |
|-----------|---------|------------|-------|
| **bollard** | 0.20.2 | Docker event/log streaming | `logs()` returns `Stream<Result<LogOutput>>`, `image_pull()` streams `CreateImageInfo` progress events |
| **futures-util** | 0.3 | Stream processing | Already in Cargo.toml, provides `StreamExt` for `.next()` |
| **tokio** | 1.50.0 | Async runtime | Already handles streams |

### Tauri Channel API (No New Dependencies)

**Use Tauri's built-in Channel for high-throughput streaming** instead of events:

```rust
// Rust: Stream Docker pull progress via Channel
use tauri::ipc::Channel;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum DockerProgress {
    LayerDownloading { id: String, current: u64, total: u64 },
    LayerComplete { id: String },
    Extracting { id: String, current: u64, total: u64 },
    Complete,
    Error { message: String },
}

#[tauri::command]
async fn install_with_progress(
    on_progress: Channel<DockerProgress>,
) -> Result<(), String> {
    // Stream Docker image pull events
    let mut stream = docker.create_image(options, None, None);
    while let Some(result) = stream.next().await {
        match result {
            Ok(info) => on_progress.send(DockerProgress::from(info)).unwrap(),
            Err(e) => on_progress.send(DockerProgress::Error { message: e.to_string() }).unwrap(),
        }
    }
    Ok(())
}
```

```typescript
// TypeScript: Listen to Channel
import { Channel } from '@tauri-apps/api/core';

const onProgress = new Channel<DockerProgress>();
onProgress.onmessage = (event) => {
  switch (event.type) {
    case 'layerDownloading':
      updateLayerProgress(event.id, event.current, event.total);
      break;
    case 'complete':
      setInstallComplete(true);
      break;
  }
};
await invoke('install_with_progress', { onProgress });
```

**Why Channels over Events:**
- Designed for streaming (ordered, fast)
- Type-safe payload via generics
- Automatic cleanup when command completes
- No need for `unlisten()` management

### What NOT to Add

| Avoid | Why |
|-------|-----|
| WebSocket crates | Tauri Channels solve the same problem natively |
| Server-Sent Events | Adds HTTP server complexity |
| Polling with `refetchInterval: 100ms` | Inefficient, poor UX compared to push |

---

## 2. Animations & Micro-Interactions

### Frontend: Motion Library

| Package | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| **motion** | 12.x | React animations | Formerly framer-motion. Spring physics, layout animations, gesture support. De facto standard for React animation (65K+ GitHub stars). |

**Verified Version:** 12.38.0 (March 2026)

```bash
pnpm add motion
```

**Key features for v1.1:**
- `motion.div` for enter/exit animations
- `AnimatePresence` for route transitions
- `useSpring` for smooth progress bars
- `whileHover`, `whileTap` for micro-interactions
- `layout` prop for auto-animated reflows
- `variants` for orchestrated animations

### shadcn/ui Animation Components (Already Available)

These components are already in the shadcn registry and can be added without new packages:

| Component | Use Case | Installation |
|-----------|----------|--------------|
| **Skeleton** | Loading placeholders | `npx shadcn-ui@latest add skeleton` |
| **Progress** | Already installed | Built-in |
| **Spinner** | Button/inline loading | `npx shadcn-ui@latest add spinner` |
| **Collapsible** | Expandable sections | `npx shadcn-ui@latest add collapsible` |

### Sonner for Toast Animations

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| **sonner** | 2.0.7 | Toast notifications | Already in package.json, has built-in animations |

**Verified Version:** 2.0.7 (August 2025) - Already installed

### Animation Patterns for v1.1

```typescript
// Page transition wrapper
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';

export function AnimatedRoutes({ children }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Micro-interaction button
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  className="..."
>
  Install
</motion.button>

// Spring-animated progress bar
import { motion, useSpring, useTransform } from 'motion/react';

function SmoothProgress({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 100, damping: 20 });
  return (
    <motion.div
      className="h-2 bg-primary rounded-full"
      style={{ width: useTransform(spring, v => `${v}%`) }}
    />
  );
}
```

### What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **@formkit/auto-animate** | Less control than Motion, no spring physics | motion |
| **react-spring** | Motion is newer, better maintained, same features | motion |
| **Lottie** | Overkill for UI micro-interactions (designed for complex illustrations) | motion + CSS |
| **GSAP** | Too heavy, designed for marketing sites | motion |
| **tailwindcss-animate** | CSS-only animations lack spring physics, interruptibility | motion |
| **anime.js** | Lower-level, more boilerplate | motion |

---

## 3. Channel Management UI

### QR Code Component for WhatsApp Pairing

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| **react-qr-code** | 2.0.18 | QR code generation | Lightweight (4KB), SVG output, React 19 compatible, no canvas dependency |

**Verified Version:** 2.0.18 (July 2025)

```bash
pnpm add react-qr-code
```

```typescript
import QRCode from 'react-qr-code';

function WhatsAppPairing({ pairingCode }: { pairingCode: string }) {
  return (
    <div className="p-4 bg-white rounded-lg">
      <QRCode value={pairingCode} size={200} level="M" />
    </div>
  );
}
```

**Why react-qr-code over alternatives:**
- Pure SVG (no canvas, better accessibility)
- 4KB gzipped vs 15KB+ for qrcode.react
- Actively maintained (July 2025 release)
- No peer dependencies

### Additional shadcn/ui Components

Add these for channel management UI:

| Component | Use Case | Installation |
|-----------|----------|--------------|
| **Avatar** | Channel icons (WhatsApp, Telegram logos) | `npx shadcn-ui@latest add avatar` |
| **Drawer** | Mobile-friendly channel setup panel | `npx shadcn-ui@latest add drawer` |
| **Tabs** | Switch between channels | `npx shadcn-ui@latest add tabs` |
| **Input OTP** | Bot token entry | `npx shadcn-ui@latest add input-otp` |
| **Empty** | No channels connected state | `npx shadcn-ui@latest add empty` |
| **Separator** | Visual dividers | Already installed |
| **Tooltip** | Already installed | Channel status hints |

### Channel State Pattern

```typescript
// types/channels.ts
export type ChannelType = 'whatsapp' | 'telegram' | 'discord' | 'slack';

export type ChannelStatus =
  | { state: 'disconnected' }
  | { state: 'pairing'; qrCode?: string; expiresAt?: string }
  | { state: 'connected'; connectedAt: string; lastMessage?: string }
  | { state: 'error'; message: string };

export interface Channel {
  id: string;
  type: ChannelType;
  name: string;
  status: ChannelStatus;
}

// Store in Zustand for UI state, backend manages persistence
```

### What NOT to Add

| Avoid | Why |
|-------|-----|
| **qrcode.react** | Larger bundle, canvas-based |
| **Socket.io client** | Use Tauri events/channels for backend communication |
| **External OAuth libraries** | Channels use QR/token pairing, not OAuth |

---

## Installation Summary

### New npm Dependencies

```bash
# Animation
pnpm add motion

# QR codes
pnpm add react-qr-code
```

### New shadcn Components

```bash
npx shadcn-ui@latest add skeleton spinner collapsible avatar drawer tabs input-otp empty
```

### Rust Dependencies

**No new Cargo dependencies required.** The existing stack handles everything:
- `bollard` 0.20.2 for Docker streaming
- `futures-util` 0.3 for stream processing
- `tauri` 2.x for Channel IPC

---

## Version Compatibility Matrix

| Package | Version | Compatible With |
|---------|---------|-----------------|
| motion | 12.38.0 | React 19.x |
| react-qr-code | 2.0.18 | React 19.x |
| sonner | 2.0.7 | React 19.x (already installed) |
| bollard | 0.20.2 | tokio 1.x (already installed) |
| @tauri-apps/api | 2.x | Channel API included |

---

## Architecture Notes

### Log Streaming Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (React)                                            │
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────┐  │
│  │ InstallPage │────▶│ Channel<T>   │────▶│ Progress UI │  │
│  └─────────────┘     │ .onmessage   │     │ (motion)    │  │
│         │            └──────────────┘     └─────────────┘  │
│         │ invoke('install_with_progress', { onProgress })  │
└─────────│───────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend (Rust/Tauri)                                        │
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────┐  │
│  │ Command     │────▶│ bollard      │────▶│ Docker API  │  │
│  │ handler     │     │ .logs()      │     │ (Unix sock) │  │
│  └─────────────┘     │ .create_img  │     └─────────────┘  │
│         │            └──────────────┘                       │
│         │ channel.send(DockerProgress::...)                │
│         ▼                                                   │
│  ┌─────────────┐                                           │
│  │ Tauri IPC   │ ◀─── JSON serialization via serde         │
│  └─────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

### Animation Strategy

| Area | Approach |
|------|----------|
| Page transitions | `AnimatePresence` + `motion.div` with fade/slide |
| Progress bars | `useSpring` for smooth interpolation |
| Cards/lists | `layout` prop for reflow animations |
| Buttons | `whileHover`/`whileTap` scale transforms |
| Loading states | Skeleton shimmer + Spinner |
| Toasts | Sonner's built-in animations (already configured) |

---

## Sources

- [Tauri v2 Calling Frontend](https://v2.tauri.app/develop/calling-frontend/) - Channel API documentation (HIGH)
- [motion.dev](https://motion.dev/) - Motion library v12.38.0 verified (HIGH)
- [bollard docs.rs](https://docs.rs/bollard/latest/bollard/) - v0.20.2 streaming API (HIGH)
- [react-qr-code GitHub](https://github.com/rosskhanas/react-qr-code) - v2.0.18 (July 2025) (HIGH)
- [sonner GitHub](https://github.com/emilkowalski/sonner) - v2.0.7 (August 2025) (HIGH)
- [shadcn/ui Components](https://ui.shadcn.com/docs/components) - Full component list (HIGH)

---

*Stack additions for: OpenClaw Desktop v1.1 (UX Polish & Channels)*
*Researched: 2026-03-26*
