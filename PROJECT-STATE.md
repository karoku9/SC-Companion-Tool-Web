# Project State

## Current release

**v0.17 — Visual hardening**

The clean interface is now protected by browser-level contracts covering empty, active and completed Operations states, every auxiliary tool, long operational strings, multiple saved ships and desktop/mobile viewport classes. Visual correctness is no longer inferred from one screenshot.

## Active interface architecture

- One shell stylesheet: `ui-v2.css`, plus shared design-system tokens, components, the legibility contract and `visual-hardening.css`.
- Six primary workspaces: Operations, Missions, Planner, Starmap, Fleet and Development.
- Operations tools are native compact views. Cargo, Moves, Adjust and Route do not embed full pages.
- Fleet includes original schematic ship line art and a cargo-zone editor tied to the selected ship.
- Starmap is route-first and two-dimensional with Route, Local system and Systems modes.
- Drake is the current manufacturer theme. Its palette and treatment are project-derived approximations, not official CIG design assets.

## Browser contract

- Chromium checks the primary 1664×936 path plus 1366×768, 430×932 and 360×800 layouts.
- Operations is exercised with no route, an active route and a completed route.
- Moves, Cargo, Adjust and Route are opened and expanded inside the viewport.
- Long mission, commodity and destination strings must wrap without widening the document.
- Fleet is tested with Corsair and Cutlass Black saved together.
- Horizontal document overflow, invisible focus and browser console errors fail CI.

## Interaction and accessibility contract

- Keyboard focus uses one semantic `:focus-visible` ring across controls and SVG interactions.
- Mobile controls use larger minimum targets while desktop density remains compact.
- Reduced-motion preferences collapse animation and transition duration.
- Disabled controls communicate state through both native behavior and visible treatment.
- Hidden workspaces and panels remain absent from layout and focus order.

## Universe-data boundary

- Official RSI web sources were verified on 2026-07-22 against Alpha 4.9.x.
- Registered operational locations include Checkmate Station, Orbituary, Ruin Station and Levski.
- Current topology includes Stanton–Pyro, Pyro–Nyx and the CIG-documented placeholder Stanton–Nyx connection.
- The snapshot is static web-source data, not live shard telemetry.
- Each official record carries source IDs and a last-verified date.

## Navigation-estimate boundary

- Normal-space quantum distance is a project-derived operational estimate shown in km or Gm.
- Jump tunnels are counted separately and are never converted into invented kilometres.
- Navigation times are ranges affected by the selected ship quantum-time factor plus a visible jump allowance.
- Arrival, cargo handling and navigation remain separate estimate categories.
- Planner, Operations and Starmap expose the same distance/time result instead of calculating independent values.

## Legacy status

Legacy CSS and view files remain physically available for rollback but are not loaded by the application. Deletion is intentionally deferred until Mission Validation lands, so visual cleanup does not remove parsing or correction references that may still be useful during that migration.

## Next release

**v0.18 — Mission validation**

- Identify incomplete or ambiguous fields before route generation.
- Show actionable warnings rather than silently accepting uncertain input.
- Provide inline review and correction of parsed mission data.
- Preserve mission identity, pickup provenance and dependency safety through corrections.
