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

- [x] Add automated screenshots at 1366×768, 430×932 and 360×800.
- [x] Test Operations with no route and a completed route in Chromium.
- [x] Test every Operations tool open and expanded.
- [x] Test long mission and commodity names without horizontal overflow.
- [x] Test Fleet with Cutlass Black and multiple saved ships.
- [x] Add and verify visible keyboard focus states.
- [x] Add reduced-motion and disabled-control behavior.
- [x] Keep visual rules on semantic design-system tokens.
- [x] Keep legacy files unloaded and document rollback retention until Mission Validation.

## v0.18 mission validation

- [ ] Add field-level confidence for parsed mission data.
- [ ] Warn on incomplete pickup, delivery, commodity or SCU information.
- [ ] Provide inline correction before route generation.
- [ ] Preserve mission identity and pickup provenance through edits.

## Later

- [ ] Location danger context with sourced data.
- [ ] Additional manufacturer MFD themes using the same semantic components.
- [ ] Expanded universe data and assisted intake.
