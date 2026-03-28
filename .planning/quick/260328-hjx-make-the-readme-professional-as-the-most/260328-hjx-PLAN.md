---
phase: quick
plan: 260328-hjx
type: execute
wave: 1
depends_on: []
files_modified:
  - README.md
autonomous: true
requirements: []
user_setup: []

must_haves:
  truths:
    - "A non-technical user can understand what ClawStation does within 30 seconds of reading the top"
    - "The README has a professional badge row (build status, license, platform, downloads)"
    - "Contributing guidelines exist so potential contributors know how to help"
    - "A FAQ section answers common questions for newcomers"
    - "The README follows the structure of top open-source projects (badges → intro → features → install → contribute → license)"
  artifacts:
    - path: "README.md"
      provides: "Professional open-source README accessible to technical and non-technical users"
      min_lines: 250
  key_links:
    - from: "README.md"
      to: "user comprehension"
      via: "clear problem/solution, badges, visual hierarchy, FAQ"
      pattern: "badge|FAQ|Contributing|What is ClawStation"
---

<objective>
Transform README.md into a professional, accessible open-source README that both technical and non-technical users can understand — following best practices from top GitHub projects.

Purpose: First impressions matter. A polished README attracts users, contributors, and trust. The current README is technically solid but reads like internal developer docs, not a project landing page.
Output: Rewritten README.md with badges, hero intro, non-technical explanation, contributing section, FAQ, and professional structure.
</objective>

<execution_context>
@D:/projects/rust/openclaw-ins/.opencode/get-shit-done/workflows/execute-plan.md
@D:/projects/rust/openclaw-ins/.opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@README.md

Key facts from STATE.md:
- ClawStation = Tauri v2 desktop app managing OpenClaw (AI agent platform)
- Core value: Make OpenClaw installable/usable without a terminal
- 49 Tauri commands, 13 hooks, 9 pages
- Windows + Linux primary, macOS secondary
- No LICENSE file exists yet (refer as MIT or note TBD)
- GitHub org: openclaw
</context>

<tasks>

<task type="auto">
  <name>Rewrite README.md as professional open-source README</name>
  <files>README.md</files>
  <action>
Rewrite README.md to be a professional, accessible open-source README. Keep ALL existing technical content (project structure, Tauri command reference, architecture, tech stack) but reorganize and add professional polish.

**Structure (in order):**

1. **Badge row** — Shields.io badges for: GitHub stars, license (MIT), platform support (Windows/Linux), built with Tauri, built with React. Use flat-square style. Example:
   `[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)`

2. **Project name + one-liner** — `# ClawStation` with a compelling tagline below it (max 1 line). Example: "The desktop app that makes OpenClaw accessible to everyone."

3. **Hero section** — A `> ` blockquote or centered text with a clear 2-3 sentence pitch. What is it, who is it for, why does it matter. Non-technical language. Include a placeholder comment `<!-- Screenshot: Add app screenshot here -->` for a future hero image.

4. **"What is ClawStation?" section** — Non-technical explanation. No jargon. Explain that OpenClaw is a powerful AI agent tool but requires command-line skills, and ClawStation gives you a friendly desktop app to do everything. 3-4 sentences max.

5. **Features section** — Keep existing features list but make it scannable. Use emoji or bold headers for each feature. Ensure non-technical users can understand each bullet (e.g., "Docker sandboxing" → "Safe sandboxing — Run AI agents in isolated containers so they can't affect your system").

6. **Quick Start section** — Merge "How to Install" + "From Source" into a clean Quick Start. Add a "For Users" subsection (download installer) and "For Developers" subsection (clone + dev). Keep prerequisites.

7. **Screenshots / Demo** — Add a section with placeholder comments for screenshots. Reference that screenshots will be added.

8. **Architecture section** — Keep existing ASCII diagram. Add a brief 2-3 sentence explanation before it for non-technical readers.

9. **Development section** — Keep existing dev commands and tech stack table. Keep project structure (it's valuable for contributors). Keep Tauri command reference (move to a collapsible `<details>` block to reduce visual noise).

10. **Contributing section** — NEW. Add standard contributing guidelines:
    - How to report bugs (GitHub Issues)
    - How to suggest features
    - How to submit PRs (fork → branch → PR)
    - Code style (ESLint + Prettier, Rust fmt)
    - Link to LICENSE

11. **FAQ section** — NEW. Add 4-5 common questions:
    - "Do I need to know Docker?" → "No, ClawStation handles it for you."
    - "Does it work on Mac?" → "macOS is secondary support — it may work but isn't actively tested."
    - "Is my data safe?" → "Everything runs locally. No data is sent to external servers."
    - "How is this different from using OpenClaw directly?" → "OpenClaw is a CLI tool. ClawStation wraps it in a visual app."
    - "Can I contribute?" → "Yes! See the Contributing section."

12. **Community / Support section** — GitHub Issues link, discussion link placeholder.

13. **License** — "MIT License — see [LICENSE](LICENSE) for details." (add note if LICENSE file doesn't exist yet)

14. **Footer** — Star history chart URL (use `https://star-history.com/#openclaw/clawstation&Date` placeholder). "Made with ❤️ by the OpenClaw community."

**Formatting rules:**
- Use `---` horizontal rules between major sections
- Keep headings consistent (## for major, ### for sub)
- No walls of text — break into short paragraphs and bullet lists
- Use code blocks with language hints (```bash, ```typescript)
- Collapsible `<details>` for long reference content (Tauri commands, project structure)

**What to preserve from current README:**
- All technical content (project structure, commands, architecture, tech stack, dev commands, plugins)
- All factual accuracy (versions, command names, file paths)
- The architecture ASCII diagram

**What NOT to do:**
- Do not remove any technical content — reorganize and compress into collapsible sections
- Do not add real screenshots (use placeholder comments)
- Do not fabricate download counts or star counts (use badge URLs that auto-fetch)
  </action>
  <verify>
    <automated>rg -c "^#" README.md</automated>
    Verify: README has at least 12 section headings, contains badge markdown, contains FAQ section, contains Contributing section, and line count is 300+.
  </verify>
  <done>
    README.md is a professional open-source README with: badge row, hero intro, non-technical "What is" section, features, quick start, architecture, development (with collapsible details), contributing guidelines, FAQ, license, and footer. All existing technical content preserved in reorganized form. Non-technical users can understand the project within 30 seconds.
  </done>
</task>

</tasks>

<verification>
- README.md exists and is 300+ lines
- Contains shields.io badge URLs
- Contains "Contributing" section heading
- Contains "FAQ" section heading
- Contains placeholder comment for screenshots
- Architecture ASCII diagram preserved
- Tauri command reference preserved (in collapsible details)
- Tech stack table preserved
</verification>

<success_criteria>
- A non-technical user can answer "What does ClawStation do?" after reading only the top 30 lines
- A developer can find contributing guidelines, dev setup, and architecture info
- The README looks like it belongs alongside top open-source projects (VS Code, Tauri, etc.)
- No existing technical content was lost
</success_criteria>

<output>
After completion, create `.planning/quick/260328-hjx-make-the-readme-professional-as-the-most/260328-hjx-SUMMARY.md`
</output>
