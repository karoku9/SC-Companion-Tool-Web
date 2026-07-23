# Project State

## Current release

**v0.21 — UX Foundation and Starmap 2.0**

The product paused feature expansion to repair navigation UX at the structural level. Starmap now separates the itinerary, the selected local system and the inter-system network into distinct layers instead of presenting three unrelated models as interchangeable map modes. The current objective, next stop and final destination remain visible while the user inspects route or universe context.

## Active Starmap architecture

- `starmap-view.js` owns the task-oriented Starmap interface and interaction state.
- `starmap-v2.css` is loaded after the clean interface and legibility contracts so the map can use the established design tokens without creating a parallel visual system.
- Itinerary, System and Network are explicit navigation layers with separate labels and purposes.
- Selected stops, bodies and systems remain selected until the user chooses another object.
- Selecting a route-list entry no longer forces an unexpected return to the itinerary layer.
- Current, next and final route objectives remain visible in the map HUD.
- Pan, wheel/button zoom, fit and center-current controls operate on the SVG view box.
- Keyboard users can move with arrow keys, zoom with `+` and `-`, fit with `Home` and activate nodes with Enter or Space.
- System selection is explicit in the System layer.
- Desktop keeps a persistent context panel; mobile uses a focused bottom sheet instead of stacking a full desktop sidebar below the map.

## Starmap information hierarchy

1. Current objective and route orientation.
2. Map surface and selected object.
3. Route progress and navigation estimate.
4. Full stop sequence and source boundary.

The interface does not treat every available datum as equally important. Detailed leg estimates remain available in the route drawer while the map itself prioritizes location, order, state and direction.

## Browser verification contract

- The map must expose current, next and final objective labels for an active route.
- Itinerary, System and Network must remain distinct layers.
- Selecting a route-list entry must not silently change the active layer.
- The selected object must have a persistent visible state.
- Fit, zoom and center-current controls must update the SVG camera without document overflow.
- Route labels must remain inside the visible map and avoid overlap in the interstellar sample.
- Desktop, tablet and mobile screenshots must be inspected rather than accepted only because code tests pass.
- Mobile map controls must retain the established 44 px interaction target.
- The mobile details panel must open and close without hiding the map permanently or creating horizontal overflow.
- Existing mission validation, Location Context, Fleet Loadouts, accessibility, Operations dialog and multi-viewport suites remain required.

## Active Fleet Loadout architecture

- `fleet-loadouts.js` remains the domain source for structured components, named loadouts, migration and derived ship performance.
- Component records retain explicit slots, source kind, authority, reference, review note and optional performance inputs.
- Loadouts remain stored per ship instance in `fleetLoadouts`; the selected configuration remains separate in `activeLoadoutByShip`.
- Existing free-text quantum-drive and factor fields migrate into an `Imported configuration` loadout with `legacy` provenance.
- Missing or unsourced component data remains visibly unknown rather than receiving an invented catalogue value.

## Loadout-derived estimates

- The active quantum time factor feeds normal-space and interstellar navigation estimates.
- The active cargo-capacity delta changes the physical capacity used by the Route Planner and Fleet readout.
- The active handling factor changes pickup and delivery handling ranges and total route estimates.
- `fleet-estimate-adapter.js` enriches the existing planner engine without replacing mission, dependency or cargo-capacity rules.

## Active Location Context architecture

- `location-context.js` remains the shared context source for route, cargo placement, Planner proposals and detailed location views.
- Official location/system facts, reviewed community facility records, derived cargo guidance and unavailable data remain separate.
- Freshness and source ledgers retain authority, link, kind and review date.
- Cargo exposure remains categorical: clear, controlled, caution, high exposure or unknown.
- No exposure category is live shard or security telemetry.

## Mission validation and provenance

- Mission intake remains review-first with independent field confidence.
- Blocking errors remain separate from reviewable warnings.
- Unknown locations require explicit correction or custom confirmation.
- Original and reviewed text plus pickup/delivery line provenance remain stored.

## Universe and estimate boundary

- Official RSI web sources were verified on 2026-07-22 against Alpha 4.9.x.
- The universe snapshot and current jump topology are static web-source data, not live shard telemetry.
- Normal-space quantum distance is a project-derived operational estimate shown in km or Gm.
- Jump tunnels are counted separately and never converted into invented kilometres.
- Arrival, cargo handling and navigation remain separate estimate categories.

## Active interface architecture

- One shell stylesheet: `ui-v2.css`, plus shared design-system and feature modules.
- Six primary workspaces: Operations, Missions, Planner, Starmap, Fleet and Development.
- Operations tools remain native compact views.
- Fleet includes ship schematics, cargo-zone editing and structured loadouts.
- Starmap is two-dimensional, task-oriented and explicit about schematic geometry.
- Drake remains a project-derived manufacturer theme, not an official CIG visual package.

## Next release

**v0.22 — Expanded universe data**

- Broaden the destination registry around real hauling mission coverage rather than adding locations arbitrarily.
- Normalize system, body, orbit, landing-zone, station and facility hierarchy.
- Keep operational navigation targets separate from display labels and searchable aliases.
- Attach source authority, game version, review date and freshness to every maintained record.
- Keep verified coordinates, project-derived anchors and schematic map placement visibly distinct.
- Reject duplicate locations, orphaned hierarchy nodes and unresolved ambiguous aliases in automated tests.

This release is a prerequisite for automated intake: Game.log and OCR cannot reliably generate routes until the location resolver recognizes the destinations that those sources contain.

## Locked path to v1.0

1. **v0.22 — Expanded universe data.** Build the complete, sourced resolver foundation.
2. **v0.23 — Game.log assisted intake.** Treat logs as the primary automated source, preserve event provenance and require review before replacing a route.
3. **v0.24 — OCR assisted intake.** Add screenshots as a secondary fallback through the same validation pipeline.
4. **v0.25 — Release hardening.** Add backup, migrations, recovery, performance, accessibility and cross-browser verification.
5. **v1.0 — Core companion release.** Stabilize the full mission-to-execution workflow.

## Deferred until after v1.0

- Session history and reusable completed-run templates.
- Companion pairing and remote route controls.
- Commodity trading and route-compatible spare-capacity suggestions.

These features remain valuable, but they must not delay the sourced location model, Game.log intake, OCR fallback or release reliability.