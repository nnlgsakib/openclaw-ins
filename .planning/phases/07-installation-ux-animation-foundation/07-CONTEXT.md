# Phase 7: Installation UX & Animation Foundation - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace fake install progress with real Docker logs showing actual layer downloads and establish app-wide animation system with micro-interactions, skeleton loading states, and spring physics transitions.

</domain>

<decisions>
## Implementation Decisions

### Log Stream Display
- **D-01:** Terminal-style scroll view showing raw Docker output in a dark terminal-like panel
- **D-02:** Users see authentic pull progress with layer hashes and technical details
- **D-03:** Log viewer auto-scrolls to latest but pauses when user scrolls up to read (INST-12)

### Animation Library
- **D-04:** Framer Motion for spring physics and smooth transitions throughout the app
- **D-05:** Provides precise control for spring physics progress bars (UI-04) and page transitions (UI-03)
- **D-06:** Adds ~15KB bundle size but gives excellent developer experience and documentation

### Skeleton Loading Scope
- **D-07:** Skeleton placeholders applied to all data-fetching pages during loading states
- **D-08:** Replaces blank space with loading skeletons for better UX (UI-02)
- **D-09:** Applies to dashboard, configuration editor, channel management, logs view, and all data-fetching components

### Micro-interaction Coverage
- **D-10:** Enhanced shadcn/ui Button component with press animations (scale transform)
- **D-11:** Subtle hover effects and loading states on all buttons
- **D-12:** Builds on existing shadcn/ui foundation for consistent interactive feedback (UI-01)

### the agent's Discretion
- Exact timing and easing values for Framer Motion animations
- Specific skeleton shapes and animations for different content types
- Press animation scale factor and hover intensity
- Terminal color scheme and font for log display
- Integration points between Rust backend events and frontend animation triggers

</decisions>

<canonical_refs>
## Canonical References

### Installation Progress
- `src/hooks/use-install.ts` — Install progress hook listening for "install-progress" events
- `src/components/ui/progress.tsx` — Existing progress bar component using CSS transitions
- `src/hooks/use-app-update.ts` — Update hook showing DownloadEvent progress tracking pattern

### Animation & Motion
- `docs/decisions/adr-012-infinite-scroll.md` — Precedent for smooth scroll behavior patterns
- `docs/features/social-feed.md` — Animation requirements for loading states and transitions

### UI Components
- `src/components/ui/button.tsx` — Base shadcn/ui Button component to enhance
- `src/components/ui/card.tsx` — Card component pattern for potential skeleton loading

### Logging & Events
- `src/lib/docker/logs.rs` — Rust backend Docker log streaming implementation
- Event structure definitions for Docker install progress reporting

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useInstall` hook: Already handles install-progress events and state management
- `Progress` component: Existing foundation for progress bar display
- `shadcn/ui` Button: Foundation for enhanced micro-interactions
- `useAppUpdate` hook: Pattern for handling DownloadEvent with chunk-level progress
- `useMonitoring` hook: Existing real-time log streaming implementation for monitoring dashboard

### Established Patterns
- Event-driven updates: Frontend listens to Tauri events for backend progress
- Zustand stores: Potential pattern for managing animation state and loading status
- TanStack Query: Established pattern for data fetching that could integrate with skeletons
- Tailwind CSS v4: Animation utilities available for transitional effects

### Integration Points
- Install flow: `useInstall` hook → `install_openclaw` Tauri command → Rust backend
- Update flow: `useAppUpdate` hook → existing DownloadEvent pattern
- Dashboard: `useMonitoring` hook → real-time container/log streaming
- All data-fetching: Potential skeleton integration with TanStack Query loading states

</code_context>

<specifics>
## Specific Ideas

- "I want the install to feel like watching a real terminal — not a fake progress bar"
- "Animations should feel natural and responsive, not flashy or distracting"
- "Skeletons should match the actual content shape so layout doesn't jump when loading finishes"
- "Button feedback should be subtle but noticeable — users should feel their actions are registered"

</specifics>

<deferred>
## Deferred Ideas

- Custom terminal styling options (font size, color schemes) — future accessibility phase
- Animation duration/user preference settings — future UX refinement phase
- Per-component animation variants (fade, slide, zoom) — future design system phase
- Advanced terminal features (search, filter, highlight in logs) — future logging enhancement phase

### Reviewed Todos (not folded)
None — discussion stayed within phase scope
</deferred>

---

*Phase: 07-installation-ux-animation-foundation*
*Context gathered: 2026-03-26*