# Phase 7: Installation UX & Animation Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 07-installation-ux-animation-foundation
**Areas discussed:** Log stream display, Animation library, Skeleton loading scope, Micro-interaction coverage

---

## Log stream display

| Option | Description | Selected |
|--------|-------------|----------|
| Terminal-style scroll view | Raw Docker output in a dark terminal-like panel. Authentic feel, shows real pull progress. Users see layer hashes and technical detail — but that's what 'real logs' means. | ✓ |
| Parsed layer cards | Each Docker layer gets its own card with name, size, and progress bar. Cleaner look, hides technical noise. Requires backend to parse layer data from Docker API (bollard supports this). |  |
| Hybrid: cards + expandable raw | Default shows parsed layer cards with progress. User can expand a 'show raw logs' panel to see terminal output. Best of both worlds but more implementation. |  |

**User's choice:** Terminal-style scroll view
**Notes:** User emphasized authenticity and seeing real Docker progress as it happens, matching the requirement for real-time Docker log streaming during installation.

---

## Animation library

| Option | Description | Selected |
|--------|-------------|----------|
| Framer Motion (Recommended) | Popular React animation library with spring physics, easy to use, excellent docs. Would add ~15KB bundle size but gives precise control for UI-04 spring progress bars and page transitions. | ✓ |
| Tailwind CSS transitions only | Use existing Tailwind v4 with transition utilities + custom CSS keyframes. Zero bundle cost but limited to basic easing functions - harder to achieve spring physics for progress bars. |  |
| React Spring | Spring-physics focused library (~8KB). More specialized for natural motion but steeper learning curve. Good for UI-04 but less versatile for other UI animations. |  |

**User's choice:** Framer Motion (Recommended)
**Notes:** User selected the recommended option for its spring physics capabilities needed for UI-04 and overall ease of implementation.

---

## Skeleton loading scope

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard only (Recommended) | Apply skeletons to the main dashboard cards showing OpenClaw status, sessions, containers. Keeps scope focused and leverages existing 4-card monitoring layout pattern. |  |
| All data-fetching pages | Add skeletons to configuration editor, channel management, logs view, etc. Consistent UX but requires more component updates across the app. | ✓ |
| Installation and update flows only | Focus skeletons where users wait longest: install progress, update checks, verification. High impact for less work. |  |

**User's choice:** All data-fetching pages
**Notes:** User preferred comprehensive coverage for consistent UX across the application rather than limiting to specific areas.

---

## Micro-interaction coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Enhanced shadcn/ui (Recommended) | Extend existing shadcn Button component with press animations (scale transform), loading states, and subtle hover effects. Builds on current foundation. | ✓ |
| Ripple effect everywhere | Material-style ripple on click for all buttons, links, and interactive elements. More pronounced feedback but may feel heavy on desktop. |  |
| Hover only, no press | Keep current shadcn hover states but remove press/loading animations. Simpler but less engaging feedback. |  |

**User's choice:** Enhanced shadcn/ui (Recommended)
**Notes:** User selected the recommended option to build on existing shadcn/ui foundation while enhancing feedback with press animations and loading states.

---