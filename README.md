# SC Companion Tool Web

Dependency-free Star Citizen cargo mission and route planner.

## Current build

The interface was rebuilt from scratch as a compact, stable three-column operations console.

- fixed community ship cargo profiles;
- mission creation, editing, deletion and readable-text import;
- manual SCU quantities without container breakdowns;
- orbital map and entity-tree toggle;
- route calculation with capacity, reward, distance, fuel and stop estimates;
- fixed landing services, traffic, danger and reliability profiles;
- app-tracked Active Route with no fake live telemetry or animated travel;
- local browser persistence and JSON backup.

The production app consists of `index.html`, `styles.css` and `app.js`. GitHub Pages deploys from `main` through the included workflow.
