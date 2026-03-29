# Phase 16 Research: OpenClaw Full Integration

## Research Complete

### Scope

ClawStation currently hardcodes a small fraction of OpenClaw's capabilities. This phase integrates ALL OpenClaw features dynamically into the desktop app.

### Gap Analysis: What OpenClaw Has vs What ClawStation Exposes

#### Channels

| OpenClaw Built-In (9) | Extension Channels (18+) | ClawStation (6) |
|---|---|---|
| telegram | bluebubbles | whatsapp ✓ |
| whatsapp | feishu | telegram ✓ |
| discord | matrix | discord ✓ |
| irc | mattermost | slack ✓ |
| googlechat | msteams | signal ✓ |
| slack | nextcloud-talk | msteams ✓ |
| signal | nostr | |
| imessage | synology-chat | |
| line | tlon | |
| | twitch | |
| | voice-call | |
| | openshell | |
| | zalo | |
| | zalouser | |
| | feishu | |

**Gap:** 21 channel types missing from ClawStation's UI.

#### Providers

| OpenClaw Extensions (25+) | ClawStation Wizard (20) |
|---|---|
| anthropic ✓ | anthropic ✓ |
| openai ✓ | openai ✓ |
| google ✓ | google ✓ |
| deepseek ✗ | deepseek ✗ |
| groq ✓ | groq ✓ |
| mistral ✓ | mistral ✓ |
| together ✗ | together ✗ |
| xai ✓ | xai ✓ |
| huggingface ✓ | huggingface ✓ |
| moonshot ✓ | moonshot ✓ |
| nvidia ✓ | nvidia ✗ |
| chutes ✗ | chutes ✗ |
| ollama ✓ | ollama ✓ |
| vllm ✓ | vllm ✓ |
| byteplus ✗ | byteplus ✗ |
| amazon-bedrock ✗ | amazon-bedrock ✗ |
| anthropic-vertex ✗ | anthropic-vertex ✗ |
| microsoft ✗ | microsoft ✗ |
| microsoft-foundry ✗ | microsoft-foundry ✗ |
| qianfan ✗ | qianfan ✗ |
| volcengine ✗ | volcengine ✗ |
| venice ✗ | venice ✗ |
| xiaomi ✗ | xiaomi ✗ |
| cloudflare-ai-gateway ✗ | cloudflare-ai-gateway ✗ |
| litellm ✗ | litellm ✗ |
| perplexity ✗ | perplexity ✗ |

**Gap:** ~10 provider types missing. Configure page only has 5 (even worse than wizard's 20).

#### Config Sections

| OpenClaw Config Schema | ClawStation Exposes |
|---|---|
| meta | ✗ |
| env | ✗ |
| wizard | ✗ |
| diagnostics | ✗ |
| agents ✓ | ✓ (basic) |
| models ✓ | ✓ (basic) |
| channels ✓ | ✓ (dynamic from GW) |
| plugins | ✗ |
| gateway | ✗ (used internally) |
| session | ✗ |
| commands | ✗ |
| hooks | ✗ |
| cron | ✗ |
| tools ✓ | ✓ (basic) |
| sandbox ✓ | ✓ |
| skills | ✗ |
| memory | ✗ |
| mcp | ✗ |
| tts | ✗ |
| routing | ✗ |
| secrets | ✗ |
| auth | ✗ |
| approvals | ✗ |
| logging | ✗ |

**Gap:** 16+ config sections not exposed in UI.

### OpenClaw Metadata Sources (for dynamic discovery)

1. **`src/plugins/bundled-plugin-metadata.generated.ts`** — Master plugin registry (19K lines). Contains manifest, config schema, UI hints, providers, channels for every bundled extension.
2. **`src/config/bundled-channel-config-metadata.generated.ts`** — Per-channel config schema (14K lines). JSON Schema for each channel's configuration fields.
3. **`src/channels/ids.ts`** — `CHAT_CHANNEL_ORDER` — canonical built-in channel IDs.
4. **`src/config/schema.base.generated.ts`** — Full config JSON Schema (15K lines). Every config section with types, constraints, defaults.
5. **`src/channels/plugins/catalog.ts`** — Channel plugin catalog with UI metadata (labels, icons, install specs).
6. **`src/config/schema.ts`** — Config schema with UI hints (labels, help text, sensitive flags, advanced flags).
7. **Gateway API** — `/api/channels`, `/api/config`, `/api/config/schema` endpoints when Gateway is running.

### Architecture Approach

**Option A: Static data file + Gateway overlay**
- Extract channel/provider metadata from OpenClaw source into a JSON data file
- Overlay live data from Gateway API when connected
- Simplest, works offline

**Option B: Full Gateway API dependency**
- All data comes from Gateway API
- Cleaner but requires Gateway to be running for discovery
- Breaks setup wizard flow (wizard runs before Gateway)

**Recommended: Option A** — Static metadata bundled with ClawStation, enriched by Gateway API at runtime.

### Key Implementation Files

- `openclaw/src/channels/ids.ts` → canonical channel ID list
- `openclaw/src/config/zod-schema.providers.ts` → channel config schemas
- `openclaw/src/plugins/bundled-plugin-metadata.generated.ts` → all plugin metadata
- `openclaw/src/config/bundled-channel-config-metadata.generated.ts` → channel config fields
- `openclaw/src/config/schema.base.generated.ts` → full config JSON schema

### Technical Patterns

1. **Channel config schema from metadata:** Each channel in `bundled-channel-config-metadata.generated.ts` has a JSON Schema with `properties` listing config fields. Each property has `type`, `enum` (for selects), `description`, etc.

2. **Provider discovery:** Look for `manifest.providers` array in bundled plugin metadata. Each provider extension has `providers: ["provider-name"]`.

3. **Config UI hints:** `schema.ts` has `ConfigUiHint` type with `label`, `help`, `tags`, `advanced`, `sensitive`, `placeholder` — can drive dynamic form generation.

4. **Gateway API patterns:** Gateway exposes `/api/config` (read), `/api/config/patch` (write), `/api/channels` (list). ClawStation already uses these for channels page.

### Requirements

Based on gap analysis:
- DYN-01: Dynamic channel discovery from OpenClaw metadata (all 27+ channels)
- DYN-02: Dynamic provider discovery from OpenClaw metadata (all 25+ providers)
- DYN-03: Full config schema UI for all 24+ config sections
- DYN-04: Gateway API enrichment when connected (real-time status)
- DYN-05: Setup wizard uses dynamic provider/channel lists
- DYN-06: Configure page shows all config sections
- DYN-07: Channel pairing dialogs generated from config schema

### Risks

- Config schema is 15K lines — need smart filtering (show common fields, hide advanced)
- Some channels require CLI tools or plugins — need capability detection
- Provider auth varies (API key, OAuth, AWS SDK) — need auth-type-aware UI
- Dynamic form generation from JSON Schema is complex — consider incremental approach
