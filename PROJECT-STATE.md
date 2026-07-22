# Project State

## Current release

**v0.15 — Clean UI rebuild**

The application now uses a second-generation frontend built directly on the shared design system. Mission parsing, session persistence, route planning, route corrections and cargo lifecycle remain the existing domain layer; the old visual shell is no longer loaded.

## Active interface architecture

- One shell stylesheet: `ui-v2.css`, plus the shared `design-system.css` tokens and components.
- Six primary workspaces: Operations, Missions, Planner, Starmap, Fleet and Development.
- Operations tools are native compact views. Cargo, Moves, Adjust and Route do not embed full pages.
- Fleet includes original schematic ship line art and a cargo-zone editor tied to the selected ship.
- Starmap is route-first and two-dimensional with explicit Route, Stanton and Systems modes.
- Drake is the current manufacturer theme. Its palette and treatment are project-derived approximations, not official CIG design assets.

## Data and trust boundaries

- Route and cargo data remain browser-local.
- Pickup must remain before delivery.
- Mission identity and cargo provenance remain attached to every lot.
- Ship silhouettes and cargo zones are operational schematics, not certified geometry.
- Starmap positions are schematic and optimized for navigation clarity, not physical scale.

## Legacy status

Legacy CSS and view files remain in the repository temporarily for history and rollback, but `index.html` and `app.js` no longer load them. They can be deleted after the v0.16 visual-hardening pass confirms no missing functionality.

## Next release

**v0.16 — Visual hardening**

- Browser screenshot checks for desktop, tool-open, mobile and completed-session states.
- Keyboard, overflow, contrast and responsive audits.
- Remove dead legacy UI files after verification.
- Resolve any remaining page-specific layout defects before Mission Validation.
