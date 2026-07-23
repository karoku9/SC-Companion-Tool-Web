# Changelog

All notable changes to SC Companion Tool are documented here.

The project was already under active development before this changelog was introduced, therefore early versions are reconstructed retroactively from completed milestones.

## [Unreleased]

### Planned
- Opt-in local Game.log selection and incremental import.
- Mission and contract event extraction with raw-line, timestamp and file provenance.
- Duplicate/replay protection and review before replacing the active route.

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
