# Changelog

All notable changes to SC Companion Tool are documented here.

The project was already under active development before this changelog was introduced, therefore early versions are reconstructed retroactively from completed milestones.

## [Unreleased]

### Planned
- Browser screenshot hardening for desktop, tool-open, mobile and completed-session states.
- Keyboard, overflow, contrast and responsive audits.
- Removal of dead legacy visual files after verification.
- Mission input validation after visual hardening.

---

## [0.15.0] - 2026-07-22

### Added
- Second-generation clean frontend built directly on the shared design system.
- Panel-native Moves, Cargo, Adjust and Route displays inside Operations.
- Explicit PICK UP and DROP OFF operational hierarchy.
- Original schematic line art for the Drake Corsair and Cutlass Black in Fleet.
- Integrated per-ship cargo-zone editor in the Fleet workspace.
- Route-first SVG Starmap with Route, Stanton and Systems modes.
- Project-state and visual-hardening verification documents.

### Changed
- `index.html` now loads only the design system and one clean page-layout entry instead of the accumulated legacy stylesheet stack.
- `app.js` no longer loads the old workspace shell, UI override layers or embedded cargo-page runtimes.
- Operations tools render below the primary operation and route-index displays instead of creating a squeezed third desktop column.
- Pickup/drop-off action and SCU/commodity are primary; route context is secondary; mission provenance is tertiary.
- Missions, Planner, Fleet, Starmap and Development now use the same clean shell generation.
- Mission Validation follows a dedicated browser visual-hardening release.

### Fixed
- Opening Cargo, Moves, Adjust or Route can no longer produce the broken narrow page-within-a-panel layout.
- Auxiliary tool closing and expansion no longer mutate the main Operations grid.
- Fleet no longer presents configuration as an unstructured form without a selected-ship visual.
- Starmap no longer relies on difficult free-camera 3D canvas controls for the primary hauling workflow.
- Legacy UI contracts in CI were replaced with explicit clean-frontend, design-system and hierarchy tests.

---

## [0.14.0] - 2026-07-22

### Added
- Four-layer design-system registry covering primitive tokens, semantic roles, component contracts and manufacturer themes.
- Project-derived Drake palette documented as an approximation rather than an official CIG palette.
- Semantic roles for surfaces, content, borders, actions, cargo pickup/drop-off/mixed/off-grid and system states.
- Canonical button variants: primary, secondary, ghost, danger, function and icon.
- Canonical panel, field, status, spacing, typography and control-size definitions.
- Canonical icon metadata using a 24 px grid, 1.7 px stroke and 16/20/24 px rendered sizes.
- Development → UI Kit showing the palette, typography, buttons, fields, statuses, icons and manufacturer-theme contract.
- UI research and implementation rules documenting official Drake references, hauling workflow references, W3C design-token guidance, Carbon components and NASA human-factors guidance.

### Changed
- Page-specific CSS may no longer introduce a raw colour, button variant or icon meaning without first extending the reviewed design system.
- Existing legacy visual variables now map to semantic design-system roles while pages are migrated in later pull requests.
- The UI rebuild is split into dedicated releases for Operations, Fleet, Starmap, Missions/Planner and final hardening.
- Mission Validation moved to v0.20 so it does not interrupt the interface rebuild sequence.

### Improved
- Future manufacturer MFD themes can replace approved brand tokens and treatment rules without changing component meaning or interaction behaviour.
- The roadmap now distinguishes foundational design work from page migrations instead of claiming the whole interface is fixed at once.

---

## [0.13.0] - 2026-07-22

### Added
- Compact cockpit-style primary Operations display with a fixed top status rail and bottom function-key rail.
- Dedicated route-index display that remains visible without competing with the current operation.
- Defensive close handler that resets the auxiliary panel, backdrop, body lock, expanded state and active tool buttons.
- A final MFD layout layer loaded after the previous interface styles so screen proportions remain consistent.

### Improved
- Destination typography is capped at cockpit-display proportions instead of scaling into a page-sized hero.
- The application top bar, sidebar, page headings, forms and planner cards use substantially less vertical space.
- Current actions use a compact three-column readout: action and cargo, operational destination, then mission provenance.
- Moves, onboard cargo and session totals are rendered as dense amber readouts rather than separate dashboard cards.
- Operational tools now behave like hardware function keys and show only their label and icon.
- Wide desktop layouts dock the auxiliary display from 1120 px while narrower layouts use a full overlay.
- Route, mission, fleet, planner and development workspaces inherit the reduced typography and spacing scale.

### Changed
- The visual target is now the actual Drake cockpit pattern: dark physical bezels around amber monochrome screens, compact system labels and fixed display controls.
- Mission Validation moved to v0.14 so the MFD structure could be corrected before adding another workflow.
- The initial angular-card treatment remains part of the history but is superseded by screen-first MFD proportions.

### Fixed
- Close and Escape reliably dismiss the auxiliary display even when nested SVG elements receive the click.
- Changing workspace closes an open operational display instead of leaving it layered over another page.
- Hidden panels cannot be forced visible by later display declarations.
- The primary operation and utility display no longer waste most of a 1080p viewport on repeated headers and empty card space.

---

## [0.12.0] - 2026-07-22

### Added
- Original SC Companion MFD mark and a purpose-built SVG icon family for workspaces and operational actions.
- Drake-inspired industrial panel chrome, amber hierarchy, technical labels and angular display surfaces.
- Docked auxiliary operations MFD on wide desktop layouts.
- Dedicated move, cargo, correction and route icons in both desktop and mobile navigation.

### Improved
- Operations now keeps the current destination and required action as the only primary hero.
- The auxiliary MFD shows move queue, onboard manifest and cargo totals without repeating the destination hero or progression buttons.
- Opening an operational tool reduces the main workspace width instead of covering it on screens wide enough to dock both surfaces.
- Narrow desktop and mobile layouts retain a full-height overlay where docking would make both surfaces unusably narrow.
- Missions, Planner, Starmap, Fleet and Development inherit the same industrial MFD tokens and component language.
- Cargo quantities, action state and navigation data use a stronger technical hierarchy than mission metadata.

### Changed
- The product identity is now Companion MFD rather than a generic dashboard mark.
- Mission Validation moved to v0.13 after the Drake MFD pass.
- Rounded SaaS-style cards and text abbreviations were replaced by angular panels and descriptive SVG symbols.

### Fixed
- The operational tool panel no longer overlaps the primary Operations workspace on wide desktop screens.
- Moves no longer duplicates the current destination, Previous or Complete controls.
- Opening the same docked tool a second time closes it instead of stacking another visual layer.

---

## [0.11.0] - 2026-07-22

### Added
- Unified interface design system with shared spacing, typography, surfaces, controls and focus states.
- Collapsible desktop navigation with persistent local preference.
- Mobile bottom navigation for all six primary workspaces.
- Responsive full-screen and floating operational drawer modes.
- Reduced-motion support for interface transitions.

### Improved
- Every primary page now has one dominant task surface and clearly secondary supporting content.
- Operations gives the current destination and required actions substantially more visual weight than route history and metadata.
- Planner profiles, route details and the apply action use a clearer decision hierarchy.
- Missions, Fleet, Cargo, Starmap and Development now share the same component language.
- Panels use fewer borders, badges and nested containers.
- Buttons, labels and navigation use sentence case where operationally appropriate.
- Desktop and mobile layouts use independent navigation patterns instead of shrinking the same sidebar.

### Changed
- Mission Validation moved to v0.12 so the core interface could be rebuilt first.
- Navigation items now include a compact identifier and a short functional description.
- The application shell now fills the viewport instead of appearing as a bordered page inside the browser.

### Fixed
- Primary and secondary actions no longer receive nearly identical visual weight.
- Narrow layouts no longer rely on the desktop page selector as their main navigation.
- Drawer controls and page controls now share consistent hover, focus and disabled behavior.

---

## [0.10.0] - 2026-07-22

### Added
- Per-ship Cargo Zone Editor with editable labels, access paths, capacities, layers, columns and separators.
- Expandable Operations drawer for load moves, cargo layout, cargo corrections and route corrections.
- Compact cargo and next-move previews inside the Operations workspace.
- Contextual Location Intel inside the Route Planner.
- Development tabs combining Roadmap and Changelog.
- Linear release roadmap from v0.1 through v1.0.

### Improved
- Primary navigation now contains only six workspaces: Operations, Missions, Planner, Starmap, Fleet and Development.
- Cargo layout and load instructions use the saved logical zones of the selected ship instance.
- Secondary tools can expand to a full-screen operational panel without leaving the current route.
- Page hierarchy now prioritizes active workspaces and hides unfinished mockups from normal navigation.
- Old cargo, load-operations, location and changelog links resolve to their new contextual panels.

### Changed
- Cargo Layout, Load Operations, Manual Corrections and Route Corrections are no longer separate primary pages.
- Location Intel is no longer a separate primary page.
- Changelog is now part of the Development workspace.
- The roadmap is organized by sequential releases instead of parallel product departments.

### Fixed
- Route Planner no longer depends on a generated blueprint page to create its runtime host.
- Saved sessions migrate with empty cargo-zone overrides without losing existing route or cargo state.

---

## [0.9.0] - 2026-07-22

### Added
- MINIMIZE CARGO ONBOARD route profile.
- Protect cargo flag with a configurable safety-delay margin.
- Per-route physical-capacity validation.
- Manual off-grid SCU allowance.
- Peak onboard and cargo-exposure metrics.
- Explicit onboard SCU after every proposed stop.
- Temporal cargo-slot reuse across non-overlapping lots.

### Improved
- FASTEST PRACTICAL can finish loaded missions sooner when Protect cargo is enabled.
- Cargo planning now checks simultaneous onboard cargo instead of total session cargo.
- Sessions larger than the ship grid can be valid when earlier deliveries free capacity.
- Cargo Layout and Load Operations clearly label off-grid staging.
- Destination, action, quantity and commodity now dominate mission metadata in the visual hierarchy.
- Panels, labels and operation rows use less visual weight and less repeated uppercase text.

### Changed
- FEWEST QUANTUM LEGS was removed because it usually duplicated FASTEST PRACTICAL with the current data model.
- Mission names are treated as secondary provenance, not primary operational instructions.

### Fixed
- Cargo Planner no longer rejects every session whose total delivered SCU exceeds ship capacity.
- Capacity-impossible proposals are filtered before they can be applied.
- Manual actual-SCU corrections are included in route capacity calculations.

---

## [0.8.0] - 2026-07-22

### Added
- Live Planning → Route Planner page.
- FASTEST PRACTICAL route profile.
- FEWEST QUANTUM LEGS route profile.
- Dependency-safe future-stop permutation engine.
- Per-stop travel, arrival and cargo-handling estimate breakdown.
- One-click application of a proposed route while preserving completed, skipped and mandatory stops.
- Orbital-station and outpost arrival estimate presets.
- Session-aware status control in the top bar.
- Toast feedback for route updates and rejected changes.

### Improved
- Global focus visibility, button feedback and active navigation styling.
- Route comparison hierarchy and mobile layout.
- Route correction feedback now explains the exact operation performed.
- Estimates use the selected Hangar ship quantum-time factor.

### Fixed
- Route proposals cannot alter already completed stops.
- Unmapped locations use an explicitly labelled fallback instead of borrowing an unrelated arrival preset.

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
