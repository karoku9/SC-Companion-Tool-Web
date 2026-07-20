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

The manufacturer visual language is currently applied for review to Mission Planner and Active Route. It must be approved before it is propagated across the remaining pages.

Route calculation, optimization, persistent fleet changes and localStorage are intentionally deferred to Checkpoint 2. Market APIs, OCR recognition and Game.log monitoring are not connected.

Production code uses only `index.html`, `styles.css`, `data.js` and `app.js`.
