# SC Companion Tool Web

Browser-based Star Citizen companion focused on cargo contracts, route planning, active runs, fleet management and operational intel.

## Current prototype

The first Planner implementation is a dependency-free HTML/CSS/JavaScript prototype with:

- family + variant ship selection and direct search;
- editable, duplicable, deletable and reorderable cargo contracts;
- commodity and location autocomplete with custom-value preservation;
- interactive SVG map with pan, zoom, selection, breadcrumbs and planetary drill-down;
- generated route overlay, route metrics, preview timeline and start-route state;
- responsive desktop layouts;
- browser-local planner persistence.

GitHub Pages is deployed from `main` through the included Pages workflow.
