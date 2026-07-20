# Waypoint Cargo Companion

Greenfield, dependency-free frontend prototype for Star Citizen contract hauling and player commodity trading.

## Run locally

Serve this directory with any static HTTP server, then open `index.html` through that server.

```powershell
python -m http.server 4173
```

## Checkpoint 1 visual prototype

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

The manufacturer visual language demonstrated on Mission Planner and Active Route is approved as the basis for the remaining interface work.

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

Route calculation, optimization, persistent fleet changes and localStorage are intentionally deferred to Checkpoint 2. Market APIs, OCR recognition and Game.log monitoring are not connected.

Production code uses only `index.html`, `styles.css`, `data.js` and `app.js`.
