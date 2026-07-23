# Project State

## Current release

**v0.22.1 — Expanded Universe Data with Complete Location Intel**

The application resolves the supported hauling destinations through one sourced, versioned location registry and now provides practical facility and static-risk intelligence for every operational destination in that registry. Mission text, Location Context, navigation estimates and Starmap anchors consume the same destination IDs before Game.log intake is introduced.

## Active universe registry

- `locations.js` is the canonical source for systems, hierarchy nodes, operational destinations, aliases, sources and review metadata.
- The v0.22 snapshot contains 80 normalized records and 34 operational destinations: 30 in Stanton, 3 in Pyro and 1 in Nyx.
- Stanton coverage includes four landing-zone arrival points, four orbital stations, Grim HEX, eighteen Lagrange stations and the Pyro, Magnus and Terra gateways.
- Pyro retains Checkmate Station, Orbituary and Ruin Station; Nyx retains Levski.
- Operational display labels remain separate from in-game navigation targets and searchable aliases.
- Search normalization accepts punctuation and spacing variants such as `ARC-L2`, `ARC L2`, full station names and abbreviations such as `NBIS`.
- Parent chains preserve system, body, moon, landing zone, station and facility context without making non-operational hierarchy nodes selectable mission destinations.

## Provenance and geometry boundary

- Every maintained location record carries source IDs, source authority, game version and review date.
- Official RSI references, reviewed community location pages and unpacked game-data records remain distinguishable.
- Physical body mappings, parent-relative offsets, Lagrange anchors and gateway anchors carry explicit geometry statuses.
- Schematic anchors support route comparison and map layout; they are never presented as verified physical coordinates.
- Facility profiles and risk guidance are static reviewed records, not current shard telemetry.
- Registry presence does not imply current traffic, hostile-player activity, market stock or service uptime.

## Complete Location Intel contract

- All 34 operational destinations expose a reviewed profile.
- Every profile answers hangars or pads, fuel/repair/rearm, food, medical care, habitation, transit, cargo services, refinery, ships or rentals, ground vehicles, commodity trade and unregulated trade.
- Status is explicit: direct availability, local transfer, limited, unregulated, not available, unverified or unavailable data.
- Risk is destination-specific and separate from onboard-cargo exposure.
- Static risk includes jurisdiction, station protection or armistice context, communication coverage and practical factors.
- City spaceports, planetary orbitals, Lagrange rest stops, gateway chokepoints, Grim HEX, Pyro stations and Levski use distinct profiles.
- Location Intel begins with an at-a-glance row for risk, fuel/repair, food/drink and medical care.
- The complete dossier remains responsive and source-labelled on desktop and mobile.

## Validation contract

- Location IDs and source IDs must be unique.
- Every parent, source and anchor body reference must resolve.
- Every operational destination must expose a navigation target and finite Starmap/distance coordinates.
- Exact operational aliases must not resolve ambiguously.
- Supported aliases must pass through the existing mission parser without becoming custom locations.
- Every supported destination must expose complete service and non-unknown static-risk coverage.
- Browser coverage exercises Checkmate, ARC-L2, Grim HEX and Teasa as representative service/risk profiles.
- Desktop and mobile screenshots must be inspected before merge.
- Additional test-suite output is persisted in the workflow artifact for diagnosis.

## Active Starmap architecture

- `starmap-data.js` derives systems, connections and operational anchors from the canonical registry.
- `starmap-view.js` owns the task-oriented Starmap interface and interaction state.
- Itinerary, System and Network remain explicit navigation layers with separate purposes.
- Selected stops, bodies and systems remain selected until another object is chosen.
- Current, next and final route objectives remain visible in the map HUD.
- Pan, wheel/button zoom, fit and center-current controls operate on the SVG view box.
- Keyboard users can move with arrow keys, zoom with `+` and `-`, fit with `Home` and activate nodes with Enter or Space.
- Desktop keeps persistent context; mobile uses a focused details dialog.

## Active Location Context architecture

- `location-context.js` remains the shared context source for Operations, Planner and Location Intel.
- Official facts, reviewed facility records, static destination risk, derived cargo guidance and unavailable data remain separate.
- Freshness and source ledgers retain authority, link, kind and review date.
- Cargo exposure remains categorical rather than pretending to be a universal numerical risk score.
- Cargo placement consumes the selected destination profile privately without exposing a fake precision score.
- No view claims live piracy, player-density, traffic or security telemetry.

## Active Fleet and estimate architecture

- `fleet-loadouts.js` remains the domain source for structured components, named loadouts, migration and derived ship performance.
- Active quantum configuration feeds normal-space and interstellar estimates.
- Active cargo and handling factors feed capacity and handling estimates.
- `fleet-estimate-adapter.js` enriches the planner without replacing mission, dependency or capacity rules.
- Jump tunnels remain separate from normal-space distance and are never converted into invented kilometres.

## Mission validation and provenance

- Mission intake remains review-first with independent field confidence.
- Unknown locations require explicit correction or custom confirmation.
- Original and reviewed text plus pickup/delivery line provenance remain stored.
- Expanded universe aliases reuse this existing validation path rather than bypassing it.

## Active interface architecture

- One shell stylesheet: `ui-v2.css`, plus shared design-system and feature modules.
- Six primary workspaces: Operations, Missions, Planner, Starmap, Fleet and Development.
- Operations tools remain native compact views.
- Fleet includes ship schematics, cargo-zone editing and structured loadouts.
- Starmap remains two-dimensional, task-oriented and explicit about schematic geometry.
- Drake remains a project-derived manufacturer theme, not an official CIG visual package.

## Next release

**v0.23 — Game.log Assisted Intake**

- Provide explicit, opt-in local Game.log selection; the web application must never claim silent filesystem access.
- Parse mission and contract events incrementally while preserving raw event lines, timestamps and source-file identity.
- Prevent duplicate and replayed events from creating duplicate missions.
- Reconstruct partial mission state while marking unavailable fields unresolved.
- Resolve extracted destinations through the v0.22 registry.
- Send extracted missions through the existing validation and correction flow.
- Require explicit confirmation before replacing the active route.

## Locked path to v1.0

1. **v0.23 — Game.log assisted intake.** Primary automated source with event provenance and review.
2. **v0.24 — OCR assisted intake.** Screenshot fallback through the same validation model.
3. **v0.25 — Release hardening.** Backup, migrations, recovery, performance, accessibility and cross-browser verification.
4. **v1.0 — Core companion release.** Stable mission-to-execution workflow.

Session history, companion pairing and commodity trading remain deferred until after v1.0.
