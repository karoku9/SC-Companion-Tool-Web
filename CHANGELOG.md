# Changelog

This file is the append-only project history baseline. From this entry forward, existing entries must never be deleted, reordered, or silently rewritten. A correction must be appended as a new dated entry that identifies the entry being corrected.

## 2026-07-20 — Checkpoint 3: hauling operations and data portability

Relevant commit: `05a7e26d8f387c57cd97a7e1a182b81409bc2b2e` (`Checkpoint 3 hauling operations and data portability`).

### Added

- Added `hauling-core.js`, an independent deterministic engine for filtering local market records, comparing buy/sell opportunities, capacity-aware quantities, one-way and constrained multi-stop plans, immutable run snapshots, transaction validation, reversible run events, cargo adjustments, and planned-versus-actual accounting. This separated calculation rules from interface rendering so scenarios can be tested without a browser. Affected areas: Hauling, Dashboard, Map, Fleet, Settings, persistence.
- Added a 26-row immutable local market-reference dataset and expanded commodity definitions with legality, value tier, handling notes and warnings. The data is explicitly labelled as reference/demo data because no live market source exists. Affected areas: `data.js`, Hauling, Intel.
- Added actual purchase and sale entry, including partial quantities, corrected prices, fees, notes, field-level validation, and Previous confirmation before recorded financial values are discarded. Unsold cargo is excluded from realized profit.
- Added hauling history with completed/abandoned distinction, inspection, draft duplication, individual deletion, typed clear confirmation, and remaining-cargo disposition.
- Added a single-primary-workflow rule: an active mission route and an active hauling run cannot silently replace each other. The user must keep, replace, or cancel.
- Added `transfer-core.js` with versioned full/partial JSON envelopes, validation, previews, safe filenames, replace/merge behavior, duplicate-fleet detection, collision remapping, and internal mission/lot and hauling batch-reference preservation.
- Added storage schema version 2 plus explicit version-1 migration that retains Checkpoint 2 fleet, missions, settings, planned route, and active-route data while adding safe hauling defaults.
- Added `tests/checkpoint3.test.js` with 14 scenarios covering one-way flow, capacity, budget, demand, partial transactions, Previous, multi-stop causality, persistence, workflow conflict, migration, full backup, merge, invalid imports, and illegal-commodity visibility.
- Added populated Checkpoint 3 screenshots and responsive QA captures under `screenshots/checkpoint-3/`.

### Modified

- Updated Dashboard to prioritize the active hauling run and show ship snapshot, current command, cargo held, actual investment, realized result, and estimated remaining result.
- Updated Map and Entity Tree to display hauling stops, commodity actions, and the established completed/current/remaining state hierarchy without animation.
- Updated Fleet removal messaging so plans, active runs, and history retain safe ship snapshots after the source fleet entry is removed.
- Updated Settings and Tools to expose working JSON transfer and hauling defaults while keeping OCR, Game.log monitoring, cloud synchronization, external integrations, and display textures locked.

### Tests and QA

- Checkpoint 2 regression suite updated for schema version 2 and still reports 11 passing tests.
- Checkpoint 3 suite reports 14 passing tests; combined verified count is 25.
- Browser QA documented all nine populated pages at 1680×900 and hauling states/dialogs at 1366×768 and 1920×1080, with no horizontal overflow or console errors observed.

### Known limitations and deferrals

- Market records are a deliberately small local dataset and may not match the current game economy.
- Multi-stop planning is a constrained deterministic chain, not a global optimizer.
- Map geometry, distance, duration, service details, and route previews remain schematic/reference-level.
- Live APIs, web scraping, OCR, Game.log monitoring, local Companion Agent, backend/cloud synchronization, true telemetry, and display textures remain deferred.

## 2026-07-20 — Checkpoint 2.1: route-snapshot safety and UI clarity

Relevant commit: `9ec5ffeb07e3234b51ae212c6b460b5fdd813870` (`Checkpoint 2.1 route safety and UI clarity`). Production publication merge: `9367d3846e07fc674c6a00073aecc5754f7e201a` (`Merge Checkpoint 2.1 working core`). The versioned Pages workflow is triggered by pushes to `main`; the repository history verifies the merge, not a retained historical job result.

### Modified

- Enforced immutable Active Route ship, origin, manifest, metrics, and steps so Planner mission edits/deletions/duplication, ship changes, origin changes, and recalculation affect only future routes. Replacing an active route requires explicit confirmation.
- Replaced the ambiguous overload-dialog action `Keep it` with `Cancel` while retaining `Start overloaded route` as the primary action.
- Standardized fleet labels so nicknamed instances remain identifiable as `Nickname — Manufacturer Model` across Planner, status, Dashboard, Fleet, and dialogs.
- Strengthened completed/current/remaining contrast on Orbital Map and Entity Tree without adding animation.
- Changed sidebar status from `Local prototype` to `Local application`, retaining `No live telemetry`.

### Tests

- Expanded `tests/checkpoint2.test.js` to 11 tests, including route-source mutation safety, legacy snapshot enrichment, replacement confirmation, ship-label identity, dialog copy, and map-state contrast.

### Known limitations

- Route estimates still use a small static coordinate/reference model and are not the in-game quantum router.

## 2026-07-20 — Checkpoint 2: working local core

Relevant commit: `072d0154d90f5858ff3cc496c982513fe3c969bb` (`Complete Checkpoint 2 working core`).

### Added

- Added storage schema version 1 at key `waypoint-cargo-companion-state`, automatic/manual saving, malformed-data recovery, and typed local reset. This made Fleet, missions, Planner settings, route progress, cargo corrections, and interface preferences survive reloads.
- Added functional Fleet instances with optional nicknames and duplicate protection; validated mission create/edit/duplicate/delete; multiple stable cargo lots; and readable multi-block mission import with preview.
- Added deterministic mission-route generation using static coordinates, pickup-before-delivery constraints, grouped same-location operations, unknown custom-location distances, and local distance/duration/fuel/OM-assist estimates.
- Added resumable Active Route Previous / EXECUTE NEXT behavior with cargo state derived reversibly from route progress and separate visible manual corrections.
- Connected the generated route to Orbital Map and synchronized Entity Tree selection.
- Added manufacturer-adaptive themes, persistent manual theme override, density, reduced motion, number formatting, default ship/origin/map mode, and illegal-commodity visibility settings.
- Added `CHECKPOINT-2.md` and the initial Node test suite.

### Tests

- Initial Checkpoint 2 suite covered route causality, stable cargo-lot identity, grouped location actions, reversible cargo status, malformed persistence recovery, and responsive/browser scenarios documented in `CHECKPOINT-2.md`.

### Known limitations and deferrals

- Commodity hauling operations and JSON transfer were not functional until Checkpoint 3.
- OCR, Game.log monitoring, cloud synchronization, external backends, and display textures remained locked.

## 2026-07-20 — Checkpoint 1.1: visual and responsive polish

Relevant commit: `119c6c587829d5374a48696a0e991bd61852776f` (`Checkpoint 1.1 visual polish`). Production publication merge: `8c50e8fdfbe7e57281d89069dcfa5199b9cb61b0` (`Merge approved Checkpoint 1.1 MFD rebuild`). The versioned Pages workflow is triggered by pushes to `main`; the repository history verifies the merge, not a retained historical job result.

### Modified

- Refined the approved manufacturer MFD compositions and responsive behavior in `app.js` and `styles.css` after the complete shell was established.
- Preserved the compact navigation strategy so primary content remains unobstructed at narrower desktop widths.

### Known limitations

- Core application data was still in-memory; persistent working logic arrived in Checkpoint 2.

## 2026-07-20 — Checkpoint 1: complete manufacturer-MFD application shell

Relevant commits: `4c83280e054665169aa8cd5519d04ee79bfd259b` (`Redesign Planner and Active Route as manufacturer MFDs`), `b777336ecc6e3854394d5230b5aa04c907e4113c` (`Document independent display texture system`), and `11788b1586e7ae33ebd215219ff01bcb27bcac9a` (`Complete Checkpoint 1 MFD application shell`).

### Added

- Established the shared MFD material, panel, control, typography, marking, and geometry system with Neutral, Drake, RSI, and MISC manufacturer variants.
- Completed all nine page compositions, responsive sidebar/top navigation, populated mock/reference states, menus, tabs, dialogs, drawers, Fleet visuals, Intel, Tools, Settings, Orbital Map, and Entity Tree.
- Kept the NEXT action visually central in Active Route and manual cargo correction secondary.
- Documented a future display-texture system as independent from manufacturer identity. Manufacturer themes control chassis identity; future textures would control only simulated screen rendering.

### Functional scope

- Included in-memory ship/origin selection, mission CRUD, multiple cargo lots, readable-text import, page navigation, map/tree switching, and predefined Active Route Previous/NEXT cargo-state progression for workflow evaluation.

### QA and limitations

- README records visual QA at 1680×900 and narrower/wider Planner and Active Route checks.
- No durable application persistence, generated working core, market accounting, live data, or external integrations were part of this checkpoint.
- CRT/phosphor, glass MFD, industrial LCD, and related display textures were deliberately documented but not implemented.

## 2026-07-20 — Initial greenfield HTML/CSS/JavaScript rebuild

Relevant commit: `15d6e440af066765fb8ad4d6e08eb26c30d4c371` (`Build greenfield cargo companion checkpoint 1`). This is the root of the accepted greenfield checkpoint history.

### Added

- Recreated the static application from zero as dependency-free HTML, CSS, JavaScript, data, README, and GitHub Pages workflow files.
- Established the initial nine-page cargo-companion structure and working in-memory review flows without reusing the rejected frontend implementation.

### Architectural decision

- The accepted application remains a static, browser-local system with immutable reference data separated from mutable state and no backend requirement.

### Known limitations

- The first greenfield commit was an implementation baseline; later Checkpoint 1 commits supplied the approved MFD identity and responsive polish.

## Permanent documentation policy

For every future implementation task:

- Read `CHANGELOG.md`, `PROJECT-CHECKLIST.md`, and `PROJECT-STATE.md` before planning or editing.
- Update every affected documentation file in the same commit as the code.
- Append to this changelog without overwriting, deleting, or reordering existing entries.
- Update checklist completion state and append newly discovered work.
- Update `PROJECT-STATE.md` so it remains a truthful handoff.
- Give a brief reason for every meaningful addition, modification, removal, or deferral.
- Document storage migrations and breaking changes explicitly.
- Report tests, QA evidence, and known limitations.

Documentation updates are mandatory deliverables, not optional follow-up work.
