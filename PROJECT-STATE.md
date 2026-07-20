# Project state

## Current handoff

- **Purpose:** dependency-free browser-local cargo companion for Star Citizen mission hauling and player commodity-run planning/accounting.
- **Public URL:** `https://karoku9.github.io/SC-Companion-Tool-Web/`
- **Production branch:** `main` at `9367d3846e07fc674c6a00073aecc5754f7e201a` before the approved Checkpoint 3 publication in this release task.
- **Development branch:** `codex-html-rebuild` at approved implementation commit `05a7e26d8f387c57cd97a7e1a182b81409bc2b2e`; the mandatory documentation baseline is the next commit on this branch.
- **Latest completed checkpoint:** Checkpoint 3 — hauling operations and data portability.
- **Immediate next objective:** real-use location/navigation data and in-game usability work. Do not expand decorative visuals or start another checkpoint without explicit approval.

## Application architecture

The product is a static application with no package manager, build step, backend, or runtime dependency. `index.html` loads immutable reference data and two independent core modules before the interface controller. Mutable user state is held by `app.js` and serialized to localStorage.

Important files:

- `index.html` — semantic shell, dialogs, drawer, and script order.
- `styles.css` — single tokenized MFD system, manufacturer themes, page compositions, route-state language, and responsive behavior.
- `data.js` — immutable ships, locations, missions, commodities, market records, issues, and reports.
- `app.js` — state lifecycle, schema migration, rendering, event wiring, mission/Fleet/route workflows, integration, and persistence.
- `hauling-core.js` — deterministic opportunity, plan, run, validation, reversal, cargo-state, adjustment, and accounting rules.
- `transfer-core.js` — JSON envelope, validation, preview, merge/replace, duplicate detection, and ID remapping.
- `tests/checkpoint2.test.js` — 11 mission-core, snapshot-safety, UI-copy, and map-state regression tests.
- `tests/checkpoint3.test.js` — 14 hauling, persistence, migration, and transfer scenarios.
- `CHECKPOINT-2.md` and `CHECKPOINT-3.md` — checkpoint-specific schemas, algorithms, formulas, QA, and limitations.
- `.github/workflows/deploy-pages.yml` — static GitHub Pages deployment on pushes to `main`.

## Storage and snapshots

- **Storage key:** `waypoint-cargo-companion-state`
- **Current application schema:** version 2
- **Migration path:** explicit version 1 → version 2 migration through `migrateVersionOne`. It retains valid Checkpoint 2 fleet, missions, preferences, selected ship/origin, planned route, active route, and Intel state, then adds normalized hauling defaults. Malformed/incompatible state falls back safely without deleting the old localStorage value; future schema versions are not loaded as compatible.
- **Active Route safety:** mission routes carry immutable source, ship, capacity, origin, manifest, steps, and metrics snapshots. Planner edits affect only a future recalculation.
- **Hauling-run safety:** active runs deep-copy the source plan, market-price references, ship label/capacity, batches, and steps. Search, Fleet, or draft changes do not mutate the run.
- **Workflow exclusivity:** only one guided workflow may be primary. Starting mission execution over an active hauling run, or the reverse, requires keep/replace/cancel confirmation.

## Genuinely functional

- Nine-page navigation, responsive sidebar/top bar, tabs, menus, drawers, and dialogs.
- Neutral, Drake, RSI, and MISC manufacturer themes; adaptive theme and persistent manual override.
- Fleet instance management and unambiguous nickname/model labels.
- Mission CRUD, multiple cargo lots, readable-text import, deterministic local route generation, Previous / EXECUTE NEXT, reversible derived cargo states, manual corrections, and route-map integration.
- Versioned local persistence, automatic/manual save, recovery, typed reset, and schema migration.
- Hauling filters and deterministic comparisons, one-way/constrained multi-stop plans, immutable active runs, partial purchase/sale entry, validation, cargo adjustments, accounting, history, Dashboard/Map/Fleet integration, and workflow conflict protection.
- Full/partial JSON export and validated preview-before-apply import with replace/merge and reference-safe collision remapping.

## Demo/reference-only or incomplete

- Market prices, availability, demand, refresh age, and confidence are immutable local reference/demo data. They are not live, real-time, or guaranteed to match the game.
- The current map is schematic and incomplete. It uses a limited fixed coordinate set, estimated distances, a partial Entity Tree, and non-authoritative destination/service profiles.
- Mission rewards, sample missions, Intel records, reports, and some service/risk descriptions are populated reference data.
- OCR and Log Agent/Datalink surfaces are visual placeholders; they do not process screenshots or monitor files.

## Locked or deferred

- Local Companion Agent and Game.log monitoring.
- Cloud synchronization, shared sessions, backend relay, and true live telemetry.
- External market feeds and automatic scraping.
- Display textures, including CRT/phosphor, glass MFD, and industrial LCD rendering.
- Advanced decorative map rendering.

Manufacturer themes and future display textures are separate systems by design. Themes control chassis geometry, materials, colors, controls, typography treatment, markings, and manufacturer identity. A future `data-display-texture` layer may affect only simulated display surfaces and must remain independently overridable. It is not implemented.

## Design decisions

- **Greenfield static rebuild:** keeps deployment and inspection simple and avoids accidental dependence on the rejected frontend.
- **Readable MFD rather than cockpit density:** preserves the approved manufacturer identity without compromising operational clarity.
- **NEXT-first execution:** keeps the physical workflow central while hiding manual correction until requested.
- **Immutable route/run snapshots:** protects in-progress work from later Planner, Fleet, or market-reference edits.
- **Pure hauling and transfer cores:** makes calculation, validation, migration-adjacent behavior, and data portability testable without the browser UI.
- **Reference/live distinction:** prevents local seed data and heuristic navigation from being misrepresented as current game information.
- **No local agent yet:** avoids premature file access, installation, telemetry, and trust complexity while browser-local real-use workflows remain unfinished.
- **Function before visual expansion:** the next priority is verified real-use locations, routing, operational data, and in-game usability—not more visual effects.

## Tests

Run from the repository root:

```powershell
node --test tests/checkpoint2.test.js
node --test tests/checkpoint3.test.js
```

Current verified automated count at the Checkpoint 3 implementation baseline: **25 total** — 11 Checkpoint 2/2.1 regressions and 14 Checkpoint 3 scenarios.

## Known limitations

- Location/system coverage is too small for broad real-session use and does not yet cover complete Stanton, Pyro, or Nyx routing.
- No gateway/jump-point routing, map pan/zoom, or marker level-of-detail filtering.
- Navigation distances, duration, fuel, OM assists, landing, repair, refuel, logistics, danger, and reliability are local estimates/reference values.
- Multi-stop hauling is a constrained deterministic chain, not a global optimizer.
- Mission history is not yet designed for durable real-session review; hauling history is intentionally small.
- Manually sold-elsewhere closure records the explicit disposition but does not invent sale proceeds.
- No live data, OCR, local agent, Game.log monitoring, cloud/backend, shared session, or display texture exists.

## Safe start for a future developer or AI agent

1. Confirm the requested checkpoint and branch before editing; never develop directly on `main` unless publication is explicitly requested.
2. Read `CHANGELOG.md`, `PROJECT-CHECKLIST.md`, and this file completely before planning.
3. Run both Node test commands and confirm the existing 25-test baseline.
4. Inspect `git status` and preserve unrelated user changes.
5. Keep immutable reference data in `data.js`, testable domain rules in the relevant core module, and interface/state wiring in `app.js`.
6. Preserve schema version 2 compatibility; add an explicit migration and tests before changing persisted shape.
7. Preserve immutable Active Route and hauling-run snapshots and the single-primary-workflow rule.
8. Keep manufacturer themes independent from any future display-texture layer.
9. Label reference/demo data honestly and never claim live telemetry without a real source.
10. Update all affected documentation in the same commit as code, append to the changelog, report tests and limitations, and stop at the approved checkpoint boundary.

## Permanent documentation policy

For every future implementation task, documentation is mandatory: read the three baseline documents first; update all affected documentation with the code; append rather than rewrite changelog history; update checklist state and newly discovered work; keep this handoff current; explain meaningful additions, changes, removals, and deferrals; document migrations/breaking changes; and report tests plus known limitations.
