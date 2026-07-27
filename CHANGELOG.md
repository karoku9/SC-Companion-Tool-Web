# Changelog

All notable changes to SC Companion Tool are documented here.

The project was already under active development before this changelog was introduced, therefore early versions are reconstructed retroactively from completed milestones.

## [Unreleased]

### Planned
- Versioned export, backup and restore.
- Explicit local-data migrations with recoverable pre-migration snapshots.
- Cross-browser, offline/static, performance and accessibility hardening before v1.0.

### Added
- Explicit operational steps for local travel, gateway approach, inter-system jump, post-jump travel and cargo action.
- A focused route map that follows the active segment instead of rendering the entire session at full density.
- System, cargo delta, onboard total and remaining free capacity on every session-timeline stop.
- Automatic cargo-bay guidance grouped by destination or mission, with unload-order priority and deliberate buffer cells between groups when capacity permits.
- A conceptual Corsair 72 SCU placement grid that keeps earlier drop-offs nearer the access edge while remaining extensible to verified ship-specific geometries.

### Changed
- Fastest-route selection now minimizes required gateway crossings before comparing travel-time and cargo-exposure scores.
- The optimizer adds a capacity-aware, system-sticky candidate so large mission sets do not bounce unnecessarily between Stanton and Pyro.
- Repeated locations remain separate dependency phases when a later delivery depends on cargo collected after the first visit.
- Operations now presents one current instruction, one immediate continuation and a short upcoming sequence instead of competing current-destination and next-leg concepts.
- Cargo exposure guidance is based on the active operation and protected cargo access rather than only the location's general static risk.

### Fixed
- Inter-system travel no longer completes a cargo stop before its gateway approach, jump and arrival steps are completed.
- The seven-mission Corsair route no longer uses the previous Stanton → Pyro → Stanton → Pyro backtracking pattern; the verified minimum is two system jumps while respecting dependencies and the 72 SCU limit.
- Gateway nodes and labels now remain aligned with their actual route segment, and the map keeps only the current segment plus its immediate continuation in focus.

---

## [0.24.0] - 2026-07-23

### Added
- Explicit PNG, JPEG, WebP and BMP contract-image selection inside Missions, supporting up to six images per OCR batch.
- Pinned Tesseract.js 7.0.0 English browser worker loaded only when OCR is requested.
- Browser-side bounded scaling, grayscale, contrast and automatic dark-HUD inversion preprocessing.
- Independent mission title, action, destination, SCU and commodity extraction with field-level confidence.
- Source filename, type, size, hash, processed dimensions and OCR-line provenance.
- Editable OCR field cards plus a raw-text fallback into the manual mission editor.
- A real Chromium image-upload workflow with deterministic mocked OCR recognition and desktop/mobile screenshots.
- Dedicated OCR architecture, privacy, dependency and known-limit documentation.

### Changed
- Missions now supports manual text, Game.log and screenshot OCR through the same mission-validation and explicit-generation gate.
- Source image bytes and preview object URLs are no longer candidates for persisted session state; only bounded extracted reports and provenance remain local.
- The Missions editor grows naturally with assisted-input panels instead of forcing OCR content into the previous fixed-height layout.
- The quality workflow now checks OCR syntax and runs the OCR browser workflow in the main Chromium matrix.
- Additional Node suites now use `pipefail`, so test failures cannot be hidden by `tee`.
- The roadmap advances Release Hardening to v0.25 and the navigation footer identifies build 0.24.

### Fixed
- Destination rows such as `Destination:` no longer create duplicate OCR objectives when explicit action headings exist.
- Mission titles containing words such as “delivery” no longer become phantom delivery objectives.
- Missing OCR action, destination, SCU or commodity fields remain unresolved instead of receiving fabricated data.
- OCR upload, field correction and draft handoff cannot replace the active route before explicit validated generation.
- Whitespace-delimited structured Game.log fields are normalized so repeated contract IDs group into the same mission.
- Previously masked Current Stop and Teasa service-profile contract expectations now match the active implementation.

### Dependency and privacy boundary
- The pinned OCR JavaScript module, WebAssembly core and English model require network retrieval on first use. Fully offline first-use OCR is not claimed.
- Selected image pixels are processed by the browser worker; application code does not upload them to an application server.
- Recognition confidence is evidence for review, not proof that extracted fields match the in-game contract.

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
