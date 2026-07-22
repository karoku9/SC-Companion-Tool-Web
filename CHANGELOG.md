# Changelog

All notable changes to SC Companion Tool are documented here.

The project was already under active development before this changelog was introduced, therefore early versions are reconstructed retroactively from completed milestones.

## [Unreleased]

### Planned
- Completed-session archive and operational outcomes.
- Planned versus observed timings and incident notes.
- Reusable session templates built from completed runs.

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
- Session History moves to v0.22 so navigation UX can be repaired before further feature expansion.

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
