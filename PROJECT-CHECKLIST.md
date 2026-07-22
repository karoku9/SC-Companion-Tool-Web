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

## v0.16 visual hardening

- [ ] Add automated browser screenshots at 1664×936, 1366×768 and mobile width.
- [ ] Test Operations with no route, active route and completed route.
- [ ] Test every Operations tool open, closed and expanded.
- [ ] Test long destination, mission and commodity names.
- [ ] Test Fleet with Corsair, Cutlass and multiple saved ships.
- [ ] Test Starmap with no route, repeated locations and cross-system data.
- [ ] Audit keyboard navigation and visible focus states.
- [ ] Audit horizontal overflow on every workspace.
- [ ] Audit semantic colors and icon reuse against the UI Kit.
- [ ] Remove unused legacy UI files after successful screenshots and regression tests.

## Later

- [ ] Mission Validation.
- [ ] Location danger context with sourced data.
- [ ] Additional manufacturer MFD themes using the same semantic components.
- [ ] Expanded universe data and assisted intake.
