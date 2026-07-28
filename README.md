# SC Companion Tool

A local-first Star Citizen hauling companion for acquiring contracts, planning capacity-safe sessions and executing cargo operations.

## Product workflow

The interface follows one continuous hauling workflow:

`Contracts → Plan → Live Ops → Fleet → Intel`

- **Contracts** supports manual text, screenshot/OCR and experimental Game.log intake. Every source enters the same mission review and ambiguity-resolution flow.
- **Plan** compares fastest or time-boxed sessions by travel time, route, gateways, mission count, cargo operations and peak capacity.
- **Live Ops** keeps the current action, exact navigation target and affected cargo cells dominant. Travel, gateway approach, jump, pickup and delivery remain explicit steps.
- **Fleet** manages saved ships, active capacity, quantum configuration, travel factor and tool-defined cargo zones.
- **Intel** combines location lookup with a separate route-focused starmap.

The approved UX contract and acceptance criteria are documented in [`docs/codex-ui-ux-rebuild.md`](docs/codex-ui-ux-rebuild.md).

## Data and persistence

The rebuild preserves the existing `sc-companion-session-v1` localStorage session and reuses the established:

- mission parser and validation;
- route and time-boxed session planners;
- gateway-aware operational steps;
- cargo state and automatic layout;
- per-ship manual cargo layout;
- ship catalog and cargo zones;
- OCR and Game.log parsers;
- location registry and static context.

Manual cargo planning for the Drake Corsair uses the existing 72 SCU, 6 × 4, 3 SCU-per-cell configuration. Grid geometry is a planning aid, not an official ship blueprint.

## Run locally

Serve the repository root through any static HTTP server:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Test

Run the complete Node matrix:

```bash
node --test tests/*.test.js
```

Run the Chromium behavior and screenshot matrix after starting the local server:

```bash
UI_BASE_URL=http://127.0.0.1:4173 node tests/ui-browser-rebuild.mjs
```

The browser matrix covers valid and blocked contract review, assisted intake, multiple sessions, all Live Ops step types, cargo states, the manual editor, Fleet, Intel, long location names and desktop/tablet/mobile viewports. Screenshots are written to `ui-smoke-artifacts/` and uploaded by GitHub Actions.

## Boundaries

All session data stays local. Static risk guidance is not live telemetry. Service records do not claim current stock or uptime. Schematic map anchors are not verified coordinates. Unknown or ambiguous mission fields remain unresolved rather than receiving invented values.
