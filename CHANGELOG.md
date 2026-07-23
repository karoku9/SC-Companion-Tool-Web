# Changelog

All notable changes to SC Companion Tool are documented here.

The project was already under active development before this changelog was introduced, therefore early versions are reconstructed retroactively from completed milestones.

## [Unreleased]

### Planned
- Screenshot and cropped-image import for OCR-assisted mission intake.
- Per-field OCR confidence, source-image provenance and inline correction.
- Reuse of the existing mission validation flow before route generation.

---

## [0.23.0] - 2026-07-23

### Added
- Explicit local `Game.log` selection through the File System Access API with a standard file-input fallback.
- Incremental reads from the last complete byte offset, preserving unfinished final lines for a later refresh.
- Stable source generations with truncation and rotation isolation.
- Duplicate and replay protection for previously processed event IDs.
- Candidate extraction for timestamps, notification envelopes, contract IDs, titles, actions, registered locations, SCU and commodities.
- Complete and partial event states with raw line, source file, line number, byte offset and timestamp provenance.
- Bounded correlation between complete objectives and nearby preceding contract/title context.
- A responsive Missions panel with event metrics, unresolved-line copying and raw-provenance details.
- Explicit handoff from extracted draft to the existing field-by-field mission review.

### Changed
- Missions now supports manual text and Game.log-assisted intake through the same validation model.
- The roadmap advances OCR assisted intake to the next release.
- The navigation footer identifies build 0.23 and clarifies that local file access is explicit.

### Fixed
- Appending to a small growing log no longer creates a false new source generation.
- Truncated or rotated logs no longer mix their draft with the previous generation.
- Re-importing an unchanged line no longer duplicates a mission objective.
- Incomplete log events no longer receive invented action, destination, SCU, commodity or contract values.
- Selecting or importing a file cannot replace the active route without explicit review and generation.

### Data boundary
- The public test fixture uses a notification envelope observed in real Game.log output with synthetic hauling payloads. Actual Alpha 4.9 mission-bearing wording may vary and unsupported variants remain visible as unresolved raw events.

---

## [0.22.2] - 2026-07-23

### Added
- Inline Current Stop operational intelligence with inbound travel ETA, distance and jump count.
- Final-approach and landing/access ranges for stations, landing zones, outposts and distribution centers.
- Destination-specific security, jurisdiction, protection or armistice and communication context inside Operations.
- Hangar or pad, fuel/repair, food/drink and medical answers below the active cargo instructions.

### Changed
- Operations now uses the previously empty Current Stop area for actionable arrival information while keeping cargo actions primary.
- Current Stop service and safety answers reuse the canonical reviewed Location Context records instead of maintaining a separate dataset.

### Fixed
- Players no longer need to leave the active Operations workflow to discover whether the current destination has landing support, refuel, food or medical care.
- Travel-time information is no longer confined to the route index where it is easy to miss during approach.

---

## [0.22.1] - 2026-07-23

### Added
- Complete reviewed Location Intel profiles for all 84 supported operational destinations.
- Fifty Stanton surface destinations: 43 mining, research, agricultural or industrial outposts and 7 distribution centers or logistics complexes.
- At-a-glance answers for static risk, fuel/repair, food/drink and medical care.
- Twelve service categories covering landing support, habitation, cargo, refinery, rentals, vehicles and regulated or unregulated trade.
- Static per-location risk profiles with jurisdiction, protection or armistice context, communication coverage and practical risk factors.
- Distinct profiles for controlled city spaceports, planetary orbital hubs, Lagrange rest stops, gateway chokepoints, Grim HEX, Pyro stations, Levski, ordinary outposts, outlaw surface sites and distribution centers.
- Reviewed community-location, field-location and unpacked game-data provenance in the source ledger.
- Schematic surface anchors tied to the verified parent planet or moon without claiming surveyed coordinates.
- Persistent diagnostic logs for test suites executed through the additional-suite workflow.

### Changed
- The operational location model expands from 80 records and 34 destinations to 130 records and 84 destinations.
- Cargo exposure now consumes the selected destination’s reviewed static risk instead of relying only on its system.
- Location type and facility class are displayed separately.
- Mobile Location Intel puts the four essential operational answers before the full dossier.
- Mission parsing and location search accept field aliases such as `HDMS Bezdek`, `Buds Growery` and `S4LD01`.

### Fixed
- Supported destinations no longer show generic missing-data cards for food or landing services.
- Outposts no longer masquerade as full stations: available pad, fuel, vehicle and commodity services remain separate from missing food, medical or habitation.
- Grim HEX, Pyro stations and outlaw field sites no longer inherit the same generic system-level warning as ordinary locations.
- Service availability no longer implies safety: facility records and danger guidance remain separate.

---

## [0.22.0] - 2026-07-23

### Added
- Canonical universe registry with 80 normalized records and 34 operational destinations.
- Four Stanton spaceports, four orbital stations, Grim HEX, eighteen Lagrange stations and three gateways.
- Search aliases for punctuation, spacing, abbreviations and full in-game station names.
- Source authority, game version, review date and geometry status on maintained location records.
- Catalog validation for duplicate IDs, missing parents, missing sources, invalid anchors and ambiguous operational aliases.
- Starmap and distance anchors generated from the canonical registry for every operational destination.
- Focused Node and Chromium coverage for `ARC-L2`, Seraphim Station and New Babbage.

### Changed
- Mission parsing, Location Context, navigation estimates and Starmap data now share stable operational destination IDs.
- Operational labels remain separate from in-game navigation targets and searchable aliases.
- Community-backed destinations expose source provenance without receiving invented service or traffic data.
- UX Foundation and Starmap 2.0 are marked delivered; Game.log Assisted Intake becomes the next release.

### Fixed
- Common forms such as `ARC-L2`, `ARC L2`, `Lively Pathway`, `NBIS` and full station names now resolve predictably.
- Non-operational hierarchy nodes no longer become selectable mission destinations.
- Existing official confidence for Teasa, Riker and Baijini is preserved while new community-dependent records remain labelled appropriately.
- Every operational destination now produces finite navigation and Starmap coordinates with an explicit geometry boundary.

---

## [0.21.0] - 2026-07-22

### Added
- Task-oriented Starmap layers for Itinerary, System and Network context.
- Persistent selected-object state for route stops, celestial bodies and systems.
- Current, next and final objective HUD.
- Pan, wheel/button zoom, fit and center-current controls.
- Keyboard map navigation with arrow keys, `+`, `-`, `Home`, Enter and Space.
- Explicit system picker and Open system action.
- Mobile Starmap detail bottom sheet with open, close and backdrop controls.
- Static UX contracts for orientation, selection, camera controls and navigation-layer separation.

### Changed
- Route-first map mode is now labelled as an itinerary instead of pretending to be a spatial map.
- Local system and inter-system network are presented as distinct navigation layers.
- Full route details move into a collapsible context drawer so the map surface remains primary.
- The map fills the available operational height instead of leaving a large unused upper region.
- Desktop keeps persistent context while mobile uses a dedicated interaction model.

### Fixed
- Selecting a stop from the route list no longer forces an unexpected return to the itinerary layer.
- Selected nodes now remain visibly highlighted.
- Current-route orientation no longer disappears while inspecting systems or network context.
- Map controls no longer depend only on pointer interaction.
- Mobile no longer stacks a full desktop detail sidebar underneath the map.

---

## [0.20.0] - 2026-07-22

### Added
- Structured component slots with explicit source kind, authority, reference and notes.
- Named loadouts saved independently for every ship instance.
- Responsive Fleet loadout browser and editor.
- Active-loadout performance covering quantum time, spool assumptions, fuel factor, handling factor and cargo-capacity delta.
- Domain and Chromium coverage for migration, switching, persistence, capacity and mobile layout.

### Changed
- Fleet now separates ship identity from installed configuration.
- Navigation estimates consume the active loadout quantum factor.
- Route handling ranges and capacity validation consume the active loadout.
- Existing ship stat readouts remain compatible through synchronized shadow fields.

### Fixed
- Legacy free-text quantum records now migrate to an `Imported configuration` loadout instead of being discarded.
- Unsourced component data remains visibly unknown rather than receiving an invented specification.
- Switching configurations no longer requires duplicating a saved ship.

---

## [0.19.0] - 2026-07-22

### Added
- Shared Location Context model used by Operations, Route Planner and Location Intel.
- Official/community source ledger with authority, link, review date and freshness state.
- Categorical cargo-exposure guidance: clear, controlled, caution, high exposure and unknown.
- Responsive location detail covering facts, arrival estimates, services, sources and known data gaps.
- Per-stop source context in the active route and proposed Planner routes.

### Changed
- Cargo placement now consumes a private compatibility priority derived from the shared context model.
- Official facts, reviewed community records, derived guidance and unavailable information are visibly separated.
- Missing service records now appear as unavailable data instead of assumed services.
- Location guidance explicitly states that it is not live shard or security telemetry.

### Fixed
- Removed the string-based cargo-risk heuristic that guessed from words such as `pyro`, `outpost` and `station`.
- Custom and unmapped locations no longer inherit a nearby system assumption.
- Planner context rendering is signature-gated to prevent recursive MutationObserver updates.

---

## [0.18.0] - 2026-07-22

### Added
- Review-first Mission Validation between raw contract text and route generation.
- Independent confidence for actions, locations and cargo syntax.
- Blocking errors, reviewable warnings and known-location suggestions.
- Inline mission title, action, location and cargo correction.
- Explicit confirmation before retaining a custom location.
- Original-source and reviewed-source snapshots with pickup and delivery line provenance.

### Changed
- The primary mission action now reviews contracts before generation.
- Editing raw source invalidates a previous review and disables generation.
- Missions require at least one complete pickup-to-delivery cargo flow.

### Fixed
- Near-action typos such as `delver` no longer become accidental mission titles.
- Unknown locations no longer silently become custom destinations.
- Invalid review cannot replace the active route.

---

## [0.17.0] - 2026-07-22

### Added
- Multi-viewport Chromium coverage for no-route, active-route and completed-route states.
- Keyboard focus containment and focus return for expanded Operations tools.
- Arrow-key workspace tabs, 44 px mobile targets, reduced-motion and forced-colour contracts.

### Fixed
- Mobile navigation and cargo-zone editing no longer rely on clipped desktop layouts.
- Clean-shell initialization is deterministic before contextual content is moved.

---

## [0.16.0] - 2026-07-22

### Added
- Operational Stanton, Pyro and Nyx registry with current jump topology.
- Transparent normal-space distance and navigation-time estimates.
- Interstellar estimates in Operations, Planner and Starmap.
- Canonical readable typography contract.

### Changed
- Jump tunnels are counted separately and never converted into invented kilometres.
- Official static snapshot data and derived estimates are labelled separately.

---

## [0.15.0] - 2026-07-22

### Added
- Second-generation clean frontend built directly on the shared design system.
- Panel-native Moves, Cargo, Adjust and Route displays inside Operations.
- Explicit PICK UP and DROP OFF operational hierarchy.
- Original schematic line art for the Drake Corsair and Cutlass Black in Fleet.
- Integrated per-ship cargo-zone editor in the Fleet workspace.
- Route-first SVG Starmap with Route, Local system and Systems modes.
- Project-state and visual-hardening verification documents.

### Changed
- `index.html` loads only the design system and one clean page-layout entry instead of the accumulated legacy stylesheet stack.
- `app.js` no longer loads the old workspace shell, UI override layers or embedded cargo-page runtimes.
- Operations tools render below the primary operation and route-index displays instead of creating a squeezed third desktop column.
- Pickup/drop-off action and SCU/commodity are primary; route context is secondary; mission provenance is tertiary.
- Missions, Planner, Fleet, Starmap and Development use the same clean shell generation.

### Fixed
- Opening Cargo, Moves, Adjust or Route can no longer produce the broken narrow page-within-a-panel layout.
- Auxiliary tool closing and expansion no longer mutate the main Operations grid.
- Fleet no longer presents configuration as an unstructured form without a selected-ship visual.
- Starmap no longer relies on difficult free-camera 3D canvas controls for the primary hauling workflow.

---

## [0.14.0] - 2026-07-22

### Added
- Four-layer design-system registry covering primitive tokens, semantic roles, component contracts and manufacturer themes.
- Project-derived Drake palette documented as an approximation rather than an official CIG palette.
- Semantic roles for surfaces, content, borders, actions, cargo pickup/dropoff/mixed/off-grid and system states.
- Canonical button, panel, field, status, spacing, typography and icon definitions.
- Development → UI Kit and UI research implementation rules.

---

## [0.13.0] - 2026-07-22

### Added
- Compact cockpit-style Operations display with a fixed top status rail and bottom function-key rail.
- Dedicated route-index display and defensive auxiliary-panel closing.

### Improved
- Destination typography, page headings, forms and planner cards use cockpit-display proportions.
- Current actions use action/cargo, operational destination and mission provenance hierarchy.

### Fixed
- Close and Escape reliably dismiss the auxiliary display.
- Hidden panels cannot be forced visible by later display declarations.