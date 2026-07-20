# Waypoint Cargo Companion

Greenfield, dependency-free frontend prototype for Star Citizen contract hauling and player commodity trading.

## Run locally

Serve this directory with any static HTTP server, then open `index.html` through that server.

```powershell
python -m http.server 4173
```

## Checkpoint 1

This checkpoint includes:

- all nine product pages;
- responsive navigation and one coherent visual system;
- in-memory ship and starting-location selection;
- in-memory mission create, edit, duplicate, delete, multi-lot editing and readable-text import;
- Orbital Map and Entity Tree modes;
- a predefined Active Route with Previous/NEXT and automatic cargo-status progression;
- functional tabs, dialogs, drawers, menus and clearly labelled mock integrations.
- a single MFD-style CSS architecture with Neutral, Drake, RSI and MISC manufacturer themes;
- adaptive ship-brand theming and an in-memory manual theme override;
- an original CSS-built display grid, scanlines, chassis texture and navigation map treatment;
- a visible unofficial fan-tool disclaimer and link to the official Star Citizen website.

The approved manufacturer MFD visual language now covers all nine pages. Dashboard, Hauling, Map, Fleet, Intel, Tools and Settings use page-specific operational compositions while sharing the same chassis, display, control and theme-token architecture established by Mission Planner and Active Route.

Checkpoint 1 visual QA covers every page at 1680×900, plus Mission Planner and Active Route at 1920×1080 and 1366×768. The compact navigation and every dialog/drawer are also verified at 1366×768.

## Approved future visual setting: display texture

Display texture will be an independent rendering layer and must not be coupled to the manufacturer theme.

- `data-theme` continues to control panel geometry, materials, colours, controls, typography treatment, markings and chassis identity.
- `data-display-texture` will control only the simulated display rendering on screens, maps and data panels.
- Required texture choices: Auto, Off, Clean, MFD Glass, CRT / Phosphor and Industrial LCD.
- Required intensity control: 0–100 percent, exposed through a CSS custom property.
- A manual texture selection always overrides Auto.

Auto defaults:

- Drake: restrained rugged CRT/phosphor;
- RSI: clean glass MFD with controlled emission;
- MISC: industrial LCD with subtle grain;
- Neutral or unknown manufacturer: restrained clean MFD.

The Drake CRT/phosphor treatment may use fine scanlines, restrained phosphor bloom, mild edge vignette, a faint curvature impression, extremely light static noise, slight persistence and subtle brightness unevenness. It must preserve sharp, readable text and avoid strong chromatic aberration, aggressive flicker or distracting continuously animated static.

Reduced Motion must disable flicker, animated noise and transient display instability. Texture effects must remain scoped to actual display surfaces rather than the full application chassis.

Target root architecture:

```html
<html data-theme="drake" data-display-texture="crt">
```

This requirement is documented but intentionally not implemented during the currently approved visual checkpoint work.

## Checkpoint 2

The local application core is now functional:

- versioned localStorage persistence with malformed-data recovery, automatic saving, manual saving and typed reset confirmation;
- saved fleet instances, optional nicknames, duplicate protection, removal and manufacturer-adaptive selection;
- validated mission CRUD, stable mission/cargo-lot identity and readable multi-block text import with preview;
- deterministic coordinate-based route generation with grouped same-location operations and pickup-before-delivery constraints;
- local distance, duration, handling, fuel-demand and orbital-marker-assist estimates;
- resumable Active Route progress, reversible Previous/NEXT cargo status derivation and separate manual corrections;
- route-aware Orbital Map, synchronized Entity Tree, custom/unmapped location support and fixed destination profiles;
- working interface defaults, reduced motion, density, number formatting, theme override and illegal-commodity visibility.

See [CHECKPOINT-2.md](CHECKPOINT-2.md) for the persisted schema, route algorithm, scenario results and known limitations.

Market APIs, active commodity trading, JSON transfer, OCR recognition, Game.log monitoring and display textures remain deferred.

The static application remains dependency-free. Automated core checks use Node's built-in test runner.
