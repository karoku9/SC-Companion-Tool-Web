# Design Iteration 0.27 — Industrial Library and Operations Rework

## Scope

Design iteration 0.27 replaces the previous manufacturer-imitation presentation with an original SC Companion industrial interface language. The functional application remains build 0.25: the mission parser, route planner, cargo state and correction mechanics are unchanged while the primary Mission and Operations composition is replaced.

## Design foundation

- Original warm-neutral dark palette with restrained amber emphasis.
- Shared typography, spacing, control-size, border, motion and status tokens.
- Reusable buttons, fields, tabs, panels, tables, status badges, mission cards, objective rows, cargo chips and route timeline components.
- Local Lucide-derived icon subset as the single generic icon family.
- No copied Star Citizen assets, proprietary fonts, logos or exact screen compositions.
- No glassmorphism, persistent glow or cyberpunk-neon treatment.
- Standalone `design-library.html` laboratory for visual component review.
- Research and reference policy documented under `docs/` and `reference/`.

## Missions

- Mission Input, Run Sheet and Sessions now use the shared industrial language.
- Route settings remain deferred until contracts have been parsed.
- Run Sheet keeps canonical destination labels and graphical cargo chips.
- Raw title, contractor, payout, location and cargo fields remain behind explicit edit mode.
- Session cards prioritize travel time, gateway sequence, mission count and peak SCU.

## Operations

- New command deck summarizes active session, current stop, next stop, required gateway, travel budget, onboard SCU and active ship.
- The active-leg map is the primary visual surface.
- Current-stop cargo actions remain beside the map instead of in a separate management page.
- Location Intel is icon-first, with concise values and complete accessible tooltip text.
- One session timeline replaces the visible legacy route index.
- Add, edit, inspect, reorder and Cargo tools remain directly below the active route.
- The legacy route structure remains hidden only as a compatibility data host for existing runtimes.

## Verification

- Node contracts for design tokens, component inventory, reference boundaries and runtime load order.
- Chromium workflow for the exact seven-mission fixture.
- Structural visual-order assertions ensure command deck → active workspace → timeline → editing tools.
- Desktop 1664×936 and 1366×768 coverage.
- Mobile 390×844 coverage.
- Horizontal-overflow, minimum typography, touch-target and reduced-motion checks.
- Existing OCR, Game.log, mission validation, location context, ship selection, cargo, route correction and integrated-map suites remain active.

## Known boundary

Cargo remains an Operations tool using the existing cargo workflow. A separate full Cargo information architecture is intentionally deferred until its player task and editing model are defined clearly enough to avoid another decorative page without a useful decision flow.
