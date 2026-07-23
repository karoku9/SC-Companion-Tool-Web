# Project Checklist

## v0.15 clean UI rebuild

- [x] Stop loading accumulated legacy UI styles.
- [x] Preserve mission, route, cargo and persistence logic.
- [x] Rebuild the shell from the shared design system.
- [x] Rebuild Operations around one primary stop and one route index.
- [x] Make pickup and drop-off instructions visually explicit.
- [x] Replace embedded cargo pages with panel-native Moves, Cargo, Adjust and Route views.
- [x] Ensure the auxiliary display closes, expands and restores without changing page geometry.
- [x] Rebuild Missions with a dedicated intake and parsed-contract layout.
- [x] Rebuild Fleet with selected-ship schematic, stats and cargo-zone editor.
- [x] Replace the free-camera Starmap with predictable route-first SVG navigation.
- [x] Keep Planner functionality and migrate it to the clean shell.
- [x] Keep Roadmap, Changelog and UI Kit in one Development workspace.
- [x] Retain the six-workspace navigation model.
- [x] Add regression tests that reject legacy UI imports and full-page embedding.

## v0.16 interstellar navigation

- [x] Verify the current Alpha 4.9.x official web-source boundary and record the verification date.
- [x] Register Checkmate Station, Orbituary, Ruin Station and Levski as real Pyro/Nyx locations.
- [x] Register Stanton–Pyro, Pyro–Nyx and placeholder Stanton–Nyx topology.
- [x] Keep jump tunnels separate from normal-space distance estimates.
- [x] Add navigation time ranges affected by the selected ship quantum factor.
- [x] Show estimates in Planner, Operations route index and Starmap.
- [x] Exercise the exact three-mission interstellar sample in Chromium.
- [x] Enforce a readable 12–36 px type scale across desktop and mobile.
- [x] Reject map-label clipping, overlap and horizontal page overflow in browser tests.
- [x] Keep official facts, static snapshot metadata and derived estimates visibly distinct.

## v0.17 visual hardening

- [x] Add automated coverage at 1664×936, 1366×768, 430×932 and 390×844.
- [x] Test Operations with no route, an active route and a completed route in Chromium.
- [x] Test Moves, Cargo, Adjust and Route open, expanded, closed by Escape and with focus restoration.
- [x] Test long destination, mission and commodity names.
- [x] Test Fleet with Corsair, Cutlass Black and multiple saved ships.
- [x] Add visible focus rings and Arrow/Home/End tab navigation.
- [x] Trap focus only inside the expanded Operations dialog and return it to the originating tool.
- [x] Enforce 44 px mobile interaction targets.
- [x] Replace mobile navigation scrolling with a six-icon rail and full workspace picker.
- [x] Replace the clipped mobile cargo-zone table with stacked editing cards.
- [x] Support reduced-motion and forced-colour interaction states.
- [x] Remove the Development initialization race by awaiting clean-shell readiness.
- [x] Keep published Changelog history separate from unreleased planning.

## v0.18 mission validation

- [x] Assign confidence independently to action, location and cargo syntax.
- [x] Separate blocking errors from reviewable warnings.
- [x] Detect near-action typos without turning them into mission titles.
- [x] Block missing titles, objectives, malformed cargo and incomplete pickup-to-delivery flows.
- [x] Require a specific selection for ambiguous known locations.
- [x] Require explicit confirmation before retaining a custom location.
- [x] Provide inline review for mission title, action, location and cargo expression.
- [x] Mark a review stale whenever raw source text changes.
- [x] Prevent validation from replacing an existing route until generation is explicitly confirmed.
- [x] Preserve original and reviewed mission text separately.
- [x] Carry pickup and delivery source lines/text into cargo lots and route operations.
- [x] Exercise valid, blocked, corrected-custom and ambiguous workflows in Chromium.
- [x] Keep the desktop review panel cockpit-height with internal scrolling.

## v0.19 location context

- [x] Add one shared source-confidence model for Operations, Planner and Location Intel.
- [x] Keep official facts and reviewed community facility records as separate layers.
- [x] Expose source authority, links, review dates and freshness states.
- [x] Display missing facility data as unavailable rather than assuming a service exists.
- [x] Add route-aware cargo-exposure guidance without a universal risk score.
- [x] Keep unknown/custom locations visibly unknown.
- [x] Remove the string-based `pyro` / `outpost` / `station` cargo-risk heuristic.
- [x] Feed categorical context into cargo-placement compatibility.
- [x] Show current-stop context in Operations and proposed-stop context in Planner.
- [x] Add responsive facts, services, sources and known-gap sections to Location Intel.
- [x] Exercise Area18 → Checkmate → Levski context on desktop and mobile in Chromium.

## v0.20 fleet loadouts

- [x] Define structured component records and provenance.
- [x] Save named loadouts per ship instance.
- [x] Switch active loadouts without rewriting ship identity.
- [x] Make navigation estimates consume the selected quantum-drive configuration.
- [x] Make cargo capacity and handling estimates consume the selected loadout.
- [x] Expose estimation assumptions and unknown component data.
- [x] Preserve current free-text ship records through migration.
- [x] Add responsive desktop/mobile Fleet loadout coverage.

## v0.21 UX foundation and Starmap 2.0

- [x] Treat Itinerary, System and Network as different navigation layers.
- [x] Keep selected stop, body or system state visible and persistent.
- [x] Show current, next and final route objectives without opening a detail panel.
- [x] Add pan, zoom, fit and center-current map controls.
- [x] Support arrow-key pan, `+`/`-` zoom, `Home` fit and keyboard node activation.
- [x] Stop route-list selection from silently changing the active map layer.
- [x] Make system selection explicit inside the System layer.
- [x] Reduce map/list duplication by moving full route detail into a collapsible drawer.
- [x] Replace stacked mobile map panels with an open/close bottom sheet.
- [x] Preserve 44 px mobile targets, reduced-motion and forced-colour behaviour.
- [x] Add static tests for orientation, selection, camera controls and layer separation.
- [x] Inspect generated desktop, tablet and mobile screenshots before merge.
- [x] Confirm route selection, network selection and Open system tasks in Chromium before merge.

## v0.22 expanded universe data

- [x] Define one canonical location, hierarchy, source and geometry contract.
- [x] Expand the registry to 80 normalized records and 34 operational destinations.
- [x] Add four Stanton spaceports, four orbital stations, Grim HEX, eighteen Lagrange stations and three gateways.
- [x] Retain Checkmate, Orbituary, Ruin Station and Levski coverage.
- [x] Add punctuation-tolerant aliases while keeping in-game navigation targets explicit.
- [x] Attach source authority, game version and review date to maintained records.
- [x] Keep parent mappings, derived offsets, Lagrange anchors and gateway anchors distinguishable.
- [x] Validate duplicate IDs, missing parents, missing sources, invalid anchors and ambiguous operational aliases.
- [x] Ensure every operational destination produces finite Starmap and distance coordinates.
- [x] Reuse the existing parser and validation path for expanded destinations.
- [x] Preserve unavailable facility data instead of inventing services for new locations.
- [x] Add focused Node contracts for coverage, aliases, hierarchy, provenance and anchors.
- [x] Exercise representative expanded-location missions through Planner, Operations and Starmap in Chromium.
- [x] Inspect expanded Stanton desktop, tablet and mobile screenshots before merge.

## v0.22.1 complete Location Intel

- [x] Add reviewed twelve-category service profiles for all 34 original operational destinations.
- [x] Separate destination-specific static risk from onboard-cargo exposure.
- [x] Add at-a-glance risk, fuel/repair, food/drink and medical answers.
- [x] Add jurisdiction, protection or armistice, communication coverage and practical risk factors.
- [x] Expand the operational model with 43 Stanton surface outposts and 7 distribution centers.
- [x] Preserve outpost, outlaw-site and distribution-center service differences.
- [x] Keep all surface geometry explicitly schematic and parent-body anchored.
- [x] Resolve `HDMS Bezdek`, `Rayari Deltana`, `Buds Growery` and `S4LD01` through mission intake and search.
- [x] Validate 130 records, 84 operational destinations, 84 profiles and 84 finite Starmap anchors.
- [x] Exercise Checkmate, ARC-L2, Grim HEX, Teasa, HDMS-Bezdek, S4LD01 and Bud’s Growery in Chromium.
- [x] Inspect station, outpost, distribution-center and mobile screenshots before merge.
- [x] Persist additional-suite diagnostics in the workflow artifact.

## v0.23 Game.log assisted intake

- [ ] Define an opt-in local Game.log import boundary with no silent file access.
- [ ] Parse mission and contract events independently from UI wording.
- [ ] Preserve raw event lines, timestamps and source-file identity.
- [ ] Support incremental imports without duplicating previously processed events.
- [ ] Reconstruct partial mission state while marking missing fields as unresolved.
- [ ] Send extracted missions through the existing validation and correction flow.
- [ ] Require explicit confirmation before replacing the active route.
- [ ] Add replay fixtures from real and truncated logs.

## v0.24 OCR assisted intake

- [ ] Accept screenshots and cropped mission images as a secondary import path.
- [ ] Extract mission title, action, location and cargo fields with independent confidence.
- [ ] Preserve source-image references and extracted text for review.
- [ ] Reuse the existing ambiguity, custom-location and stale-review safeguards.
- [ ] Prevent OCR output from bypassing validation or overwriting a route automatically.
- [ ] Add desktop and mobile correction workflows for low-confidence OCR fields.

## v0.25 release hardening

- [ ] Add versioned full and selective export, backup and restore.
- [ ] Add explicit, tested migrations for every persisted data model.
- [ ] Preserve a recovery snapshot before destructive migration or import.
- [ ] Provide a recoverable error state for corrupt or partially incompatible local data.
- [ ] Test large location registries, long routes and many saved ships/loadouts.
- [ ] Verify Chromium, Firefox and WebKit behaviour where supported.
- [ ] Verify offline/static hosting, refresh during an active session and direct hash navigation.
- [ ] Complete keyboard, screen-reader, contrast, 200% zoom and reduced-motion coverage.
- [ ] Remove obsolete runtime files only after dependency and historical-reference checks.
- [ ] Complete the release checklist and user-facing documentation.

## v1.0 core companion release

- [ ] Confirm manual, Game.log and OCR intake all converge on one validation model.
- [ ] Confirm sourced location resolution across the supported hauling workflow.
- [ ] Confirm route, cargo and Operations state survive refresh and supported upgrades.
- [ ] Document privacy, source, estimate and unsupported-data boundaries.
- [ ] Publish a stable local-first build with tested backup and recovery.

## Deferred until after v1.0

- [ ] Session history and reusable completed-run templates.
- [ ] Companion pairing and remote route controls.
- [ ] Commodity trading and route-compatible spare-capacity suggestions.
- [ ] Additional manufacturer MFD themes using the same semantic components.
