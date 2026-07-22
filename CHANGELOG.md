# Changelog

All notable changes to SC Companion Tool are documented here.

The project was already under active development before this changelog was introduced, therefore early versions are reconstructed retroactively from completed milestones.

## [Unreleased]

### Planned
- Route Planner v1 with selectable optimization profiles.
- Expanded location intelligence.
- Additional ship and component integrations.

---

## [0.7.0] - 2026-07-22

### Added
- System → Changelog page rendered directly from this file.
- Current build card in Overview.
- Dependency-safe Route Corrections panel.
- Future-stop reordering controls.
- Temporary SKIP and REOPEN controls.
- Per-stop MANDATORY protection.
- Reset to generated route.

### Improved
- Route progress now uses stable completed-stop identities instead of relying only on a numeric index.
- Cargo lifecycle follows corrected route progress.
- Skipped deliveries leave their cargo onboard instead of marking it delivered.
- Existing locally saved sessions migrate through the legacy progress index.

### Fixed
- Reordering future stops can no longer shift completion onto the wrong stop.
- Invalid pickup → delivery orders and dependency-breaking skips are rejected.

---

## [0.6.0] - 2026-07-22

### Added
- Manual Cargo Corrections.
- Per-lot actual SCU overrides while preserving original planning data.
- Cargo states: AUTO, PENDING, ONBOARD, DELIVERED and LOST.
- Cargo loss tracking without deleting session history.
- Cargo Layout synchronization with corrected quantities.
- Validation against impossible cargo transitions.

### Improved
- Cargo lifecycle reliability.
- Reversible operational corrections.

---

## [0.5.0] - 2026-07-22

### Added
- Live Load Operations page.
- Cargo loading and unloading state tracking.
- Mission cargo provenance.
- Planned cargo slot stability.

---

## [0.4.0] - 2026-07-21

### Added
- Guided Route workflow.
- Current stop navigation.
- COMPLETE STOP → NEXT progression.
- PREVIOUS route rewind support.
- Mission-labelled pickup, collect and delivery actions.

---

## [0.3.0] - 2026-07-20

### Added
- Cargo Planning foundation.
- Mission sectors.
- Cargo zones and vertical layers.
- Delivery-access based placement logic.

---

## [0.2.0] - 2026-07-19

### Added
- Mission intake system.
- Manual mission editor.
- Mission text parsing.
- Structured cargo lots.
- Mission and cargo provenance tracking.

---

## [0.1.0] - Initial Foundation

### Added
- Application architecture.
- Separate application sections.
- Local state persistence.
- Location model.
- Mission model.
- Initial route planning foundation.

---

## Versioning

Version format follows:

`MAJOR.MINOR.PATCH`

- MAJOR: large architectural changes or product milestones.
- MINOR: new features and major workflow additions.
- PATCH: fixes, balancing and small improvements.