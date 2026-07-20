# Project checklist

Status vocabulary: **completed**, **in progress**, **pending**, **blocked**, **deferred**. Priority vocabulary: **HIGH**, **NORMAL**, **LOW**.

A feature is marked completed only when the current source and tests demonstrate working behavior. A visual mockup is identified as demo-only and is not treated as functional.

## HIGH — completed

- [x] **Completed — MFD visual rebuild:** coherent panel, control, typography, marking, map, and material language.
- [x] **Completed — nine-page application shell:** Dashboard, Mission Planner, Active Route, Hauling, Map, Fleet, Intel, Tools, and Settings.
- [x] **Completed — manufacturer themes:** Neutral, Drake, RSI, and MISC themes plus adaptive selection and persistent manual override.
- [x] **Completed — responsive layouts:** compact desktop sidebar and mobile navigation; verified populated pages and critical dialogs at documented viewport sizes.
- [x] **Completed — Fleet management:** saved instances, optional nicknames, duplicate protection, selection, removal, and snapshot-safe historical labels.
- [x] **Completed — mission CRUD and multi-lot cargo:** validated create, edit, duplicate, delete, and stable mission/lot identity.
- [x] **Completed — readable mission import:** multi-block readable text parsing, preview, and correction through the standard editor.
- [x] **Completed — mission route generation:** deterministic pickup-before-delivery sequence with grouped stops and local estimates.
- [x] **Completed — Active Route Previous / EXECUTE NEXT:** persistent, reversible mission execution workflow.
- [x] **Completed — reversible derived cargo states:** route-index-derived state plus separate visible manual corrections.
- [x] **Completed — route snapshot safety:** active mission routes retain immutable source, ship, origin, manifest, steps, and metrics snapshots.
- [x] **Completed — local persistence:** versioned browser storage, automatic/manual saving, recovery, and typed reset.
- [x] **Completed — mission-map integration:** generated mission steps appear in Orbital Map and synchronized Entity Tree states.
- [x] **Completed — functional hauling search:** filters, deterministic sorting, legality/reliability visibility, capacity/budget/availability/demand constraints.
- [x] **Completed — one-way and constrained multi-stop hauling:** explainable deterministic plan generation with separate commodity batches.
- [x] **Completed — purchases and sales:** actual quantities, prices, fees, notes, and validation.
- [x] **Completed — partial transaction handling:** partial purchases/sales retain on-board cargo and separate realized/remaining results.
- [x] **Completed — hauling accounting:** planned and actual investment/revenue, realized/remaining result, fees, losses, ROI, and duration.
- [x] **Completed — hauling history:** completed/abandoned records, inspection, duplication, deletion, and typed clear.
- [x] **Completed — JSON import/export:** full and partial envelopes, safe download names, validation, preview, replace/merge, collision remapping, and rollback copy.
- [x] **Completed — schema-v1 to schema-v2 migration:** existing Checkpoint 2 data is retained while safe hauling defaults are added.
- [x] **Completed — automated Checkpoint 2 and 3 tests:** 11 Checkpoint 2/2.1 tests and 14 Checkpoint 3 scenarios.

## HIGH — next

- [ ] **Pending — real-use location database:** replace the small planning dataset with maintainable, game-session-useful records.
- [ ] **Pending — Stanton, Pyro, and Nyx support:** define verified systems, bodies, stations, landing zones, outposts, gateways, and relevant services.
- [ ] **Pending — correct system/body/location hierarchy:** normalize ownership, nesting, location types, aliases, and parent relationships.
- [ ] **Pending — gateway and jump-point routing:** represent inter-system route boundaries and traversal requirements.
- [ ] **Pending — searchable real locations:** add robust alias/search behavior over the real-use hierarchy.
- [ ] **Pending — zoomable and pannable map:** replace the fixed schematic viewport with usable navigation controls.
- [ ] **Pending — level-of-detail marker filtering:** prevent dense location sets from overwhelming the map at broad zoom levels.
- [ ] **Pending — real route preview:** show practical system/body/gateway legs over verified data instead of schematic coordinates alone.
- [ ] **Pending — refuel, repair, landing, and logistics information:** expand and verify operational profiles for actual destinations.
- [ ] **Pending — cargo and mission history for actual sessions:** persist useful completion context beyond the current hauling ledger and active snapshots.
- [ ] **Pending — OCR without a local agent:** process uploaded or pasted screenshots within an explicitly approved browser/local workflow.
- [ ] **Pending — real in-game usability testing:** validate terminology, route order, field workload, and recovery during actual sessions.
- [ ] **Pending — reduce real-use clutter:** simplify only after evidence from in-game testing identifies unnecessary controls or information.

## NORMAL — future

- [ ] **Pending — touch-first mobile Companion mode:** recompose primary workflows for touch rather than merely shrinking desktop layouts.
- [ ] **Pending — shared-session data architecture:** define ownership, conflict, expiration, and privacy before adding synchronization.
- [ ] **Pending — temporary session code and QR-code preparation:** design safe short-lived pairing only after shared-session architecture exists.
- [ ] **Pending — external market-data sources:** add provenance, timestamps, failure behavior, and explicit live/reference distinction before integration.
- [ ] **Pending — expanded manufacturer themes:** add only after functional priorities and real-use QA are satisfied.
- [ ] **Pending — dataset maintenance tools:** support validated editing/import of real-use location and market reference records.

## LOW — deferred

- [ ] **Deferred — local Companion Agent:** intentionally postponed; browser-local flows remain the product baseline.
- [ ] **Deferred — Game.log monitoring:** no file watcher or automatic telemetry is implemented.
- [ ] **Deferred — cloud synchronization:** no remote persistence exists.
- [ ] **Deferred — backend relay:** no server or relay exists.
- [ ] **Deferred — true live telemetry:** the application does not read the game state.
- [ ] **Deferred — display textures:** the independent texture system is documented but unimplemented.
- [ ] **Deferred — CRT/phosphor effects:** no scanline, bloom, vignette, curvature, noise, ghosting, or flicker layer is implemented.
- [ ] **Deferred — advanced decorative map rendering:** visual expansion remains behind real data, navigation, and usability work.

## Visual/demo-only or incomplete reference areas

- [ ] **Deferred — Mission OCR panel:** visual placeholder only; readable text import is the functional alternative.
- [ ] **Deferred — Log Agent / Datalink panel:** visual placeholder only; no external process or file access.
- [ ] **Pending — market dataset completeness:** current prices, availability, demand, ages, and confidence are local reference/demo values.
- [ ] **Pending — map dataset completeness:** current map and Entity Tree contain a limited schematic hierarchy and local coordinates.
- [ ] **Pending — Intel dataset completeness:** fixed profiles and reports are reference content, not current verified game state.

## Blocked

- No work item is currently marked blocked. External integrations will require explicit product, privacy, data-source, and deployment decisions before implementation.

## Permanent documentation checklist

- [ ] For every implementation task, read `CHANGELOG.md`, `PROJECT-CHECKLIST.md`, and `PROJECT-STATE.md` first.
- [ ] Update affected documentation in the same commit as code.
- [ ] Append changelog entries; never delete, reorder, or silently rewrite history.
- [ ] Update feature states and append newly discovered work.
- [ ] Record reasons for meaningful additions, modifications, removals, and deferrals.
- [ ] Record storage migrations and breaking changes.
- [ ] Report tests, QA evidence, and known limitations.

Documentation is a mandatory deliverable for all future implementation work.
