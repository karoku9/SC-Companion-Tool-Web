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

- [ ] Add source confidence to operational location profiles.
- [ ] Expose verified facilities and service availability where sourced.
- [ ] Add route-aware cargo-exposure guidance without inventing a universal risk score.
- [ ] Distinguish official facts, derived operational guidance and unavailable information.
- [ ] Add stale-source warnings and review dates to location detail views.

## Repository cleanup

- [ ] Remove legacy CSS and view files in a dedicated reference-cleanup change after confirming no documentation or historical test still links to them.

## Later

- [ ] Additional manufacturer MFD themes using the same semantic components.
- [ ] Expanded universe data and assisted intake.
