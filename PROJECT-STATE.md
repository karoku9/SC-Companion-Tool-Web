# Project State

## Current release

**v0.16 — Interstellar navigation**

The application now treats Stanton, Pyro and Nyx as operationally connected systems instead of accepting their locations as unstructured custom text. Mission parsing, route planning, Operations and Starmap use the same verified universe registry and transparent navigation-estimate boundary.

## Active interface architecture

- One shell stylesheet: `ui-v2.css`, plus shared design-system tokens, components and a final legibility contract.
- Six primary workspaces: Operations, Missions, Planner, Starmap, Fleet and Development.
- Operations tools are native compact views. Cargo, Moves, Adjust and Route do not embed full pages.
- Fleet includes original schematic ship line art and a cargo-zone editor tied to the selected ship.
- Starmap is route-first and two-dimensional with Route, Local system and Systems modes.
- Drake is the current manufacturer theme. Its palette and treatment are project-derived approximations, not official CIG design assets.

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

Legacy CSS and view files remain in the repository temporarily for history and rollback, but `index.html` and `app.js` no longer load them. They can be deleted after the v0.17 visual-hardening pass confirms no missing functionality.

## Next release

**v0.17 — Visual hardening**

- Broaden browser screenshots to more viewport sizes and completed-session states.
- Complete keyboard, focus, contrast and responsive audits.
- Remove dead legacy UI files after verification.
- Resolve any remaining page-specific layout defects before Mission Validation.
