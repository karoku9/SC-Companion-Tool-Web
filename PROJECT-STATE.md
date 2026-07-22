# Project State

## Current release

**v0.17 — Visual hardening**

The clean interface is now protected by a multi-state Chromium matrix instead of depending on manual visual review. Desktop, compact desktop and two mobile viewports exercise empty, active and completed routes, every Operations panel, long content, multiple ships, keyboard input and reduced-motion behaviour.

## Active interface architecture

- One shell stylesheet: `ui-v2.css`, plus shared design-system tokens, components and a final legibility/interaction contract.
- Six primary workspaces: Operations, Missions, Planner, Starmap, Fleet and Development.
- Operations tools are native compact views. Cargo, Moves, Adjust and Route do not embed full pages.
- Expanded Operations tools behave as dialogs, contain keyboard focus and return focus to the originating function key when closed.
- Development and Starmap modes support Arrow, Home and End navigation.
- Fleet includes original schematic ship line art and a cargo-zone editor tied to the selected ship.
- Mobile Fleet edits cargo zones as stacked cards rather than a clipped desktop table.
- Starmap is route-first and two-dimensional with Route, Local system and Systems modes.
- Drake is the current manufacturer theme. Its palette and treatment are project-derived approximations, not official CIG design assets.

## Browser verification contract

- Chromium covers 1664×936, 1366×768, 430×932 and 390×844.
- All six workspaces reject document-level horizontal overflow and visible text below the canonical floor.
- Operations is tested with no route, an active interstellar route and a completed route.
- Moves, Cargo, Adjust and Route are tested open, expanded, closed by Escape and with focus restoration.
- Long mission, destination and commodity strings are exercised.
- Fleet is tested with the default Corsair and a second saved Cutlass Black configuration.
- Mobile controls have a 44 px minimum interaction target.
- Reduced-motion removes animations and transitions; forced-colour mode retains visible focus.
- Clean-shell initialization is awaited before contextual Development content is wired, removing the previous timing race.

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

## UI and trust boundaries

- Visible operational text uses a canonical 12–36 px scale; hierarchy is created through weight, colour and placement rather than microscopic metadata.
- Route and cargo data remain browser-local.
- Pickup must remain before delivery.
- Mission identity and cargo provenance remain attached to every lot.
- Ship silhouettes and cargo zones are operational schematics, not certified geometry.
- Starmap drawing positions are schematic and optimized for navigation clarity, not physical scale.

## Legacy status

Legacy CSS and view files remain in the repository for history and rollback, but `index.html` and `app.js` do not load them. Their removal is intentionally deferred until repository-level reference cleanup can be performed independently from the now-verified live interface.

## Next release

**v0.18 — Mission validation**

- Assign confidence to parsed fields and location matches.
- Surface actionable warnings before route generation.
- Allow inline review and correction of uncertain mission data.
- Preserve original mission text and provenance throughout corrections.
