# Project State

## Current release

**v0.18 — Mission validation**

Mission intake is now a review-first workflow. Raw contract text can be inspected without replacing the active route; a session is generated only after required fields are resolved, uncertain values are reviewed and any custom location is explicitly confirmed.

## Active mission-intake architecture

- `mission-validation.js` inspects mission titles, actions, locations, SCU quantities and commodity expressions before route generation.
- Every parsed field carries a confidence contribution rather than sharing one opaque parser result.
- Blocking errors are separate from reviewable warnings.
- Near-action typos such as `delver` are treated as uncertain objectives with a suggested action, not as new mission titles.
- Unknown locations remain blocked until corrected or explicitly accepted as custom.
- Ambiguous registry matches expose selectable known-location suggestions.
- Mission title, action, location and cargo expression can be corrected inline.
- Editing raw text invalidates the previous review and disables generation until the new source is inspected.
- Missions require at least one complete pickup-to-delivery cargo flow.

## Source and provenance boundary

- Original pasted text and reviewed text are stored separately.
- A validation snapshot records status, confidence, warnings, blockers and review time.
- Cargo lots retain original pickup and delivery line numbers and text.
- Live route operations retain the cargo-lot provenance and mission-level source metadata.
- Custom locations are preserved only after an explicit per-field confirmation.
- Confirmed custom locations have no verified navigation geometry or sourced location context.

## Active interface architecture

- One shell stylesheet: `ui-v2.css`, plus shared design-system tokens, components and a final legibility/interaction contract.
- Six primary workspaces: Operations, Missions, Planner, Starmap, Fleet and Development.
- Missions uses three distinct surfaces: raw input, field review and generated-session output.
- Desktop mission review uses a stable cockpit-height display with an internally scrollable contract list.
- Operations tools are native compact views. Cargo, Moves, Adjust and Route do not embed full pages.
- Expanded Operations tools behave as dialogs, contain keyboard focus and return focus to the originating function key when closed.
- Fleet includes original schematic ship line art and a cargo-zone editor tied to the selected ship.
- Starmap is route-first and two-dimensional with Route, Local system and Systems modes.
- Drake is the current manufacturer theme. Its palette and treatment are project-derived approximations, not official CIG design assets.

## Browser verification contract

- Chromium covers valid interstellar intake, blocked input, corrected custom input and ambiguous location selection.
- Chromium also covers 1664×936, 1366×768, 430×932 and 390×844 across the six workspaces.
- Invalid review cannot create or replace a route.
- A generated validation snapshot must keep original and reviewed text distinct.
- Source edits after review must disable generation.
- All six workspaces reject document-level horizontal overflow and visible text below the canonical floor.
- Operations is tested with no route, an active interstellar route and a completed route.
- Moves, Cargo, Adjust and Route are tested open, expanded, closed by Escape and with focus restoration.
- Mobile controls have a 44 px minimum interaction target.

## Universe-data boundary

- Official RSI web sources were verified on 2026-07-22 against Alpha 4.9.x.
- Registered operational locations include Checkmate Station, Orbituary, Ruin Station and Levski.
- Current topology includes Stanton–Pyro, Pyro–Nyx and the CIG-documented placeholder Stanton–Nyx connection.
- The snapshot is static web-source data, not live shard telemetry.
- Each official record carries source IDs and a last-verified date.

## Navigation-estimate boundary

- Normal-space quantum distance is a project-derived operational estimate shown in km or Gm.
- Jump tunnels are counted separately and are never converted into invented kilometres.
- Navigation times are ranges affected by the selected ship quantum-time factor plus a visible jump allowance.
- Arrival, cargo handling and navigation remain separate estimate categories.
- Planner, Operations and Starmap expose the same distance/time result instead of calculating independent values.

## Legacy status

Legacy CSS and view files remain in the repository for history and rollback, but `index.html` and `app.js` do not load them. Their removal is intentionally deferred until repository-level reference cleanup can be performed independently from the verified live interface.

## Next release

**v0.19 — Location context**

- Show source confidence for operational location information.
- Add service and facility context without presenting assumptions as official data.
- Surface cargo-exposure warnings tied to route and location conditions.
- Keep sourced facts, derived guidance and unavailable data visibly separate.
