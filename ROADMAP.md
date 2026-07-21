# Product roadmap

The live roadmap is displayed inside the application. Macro phases are arranged horizontally; the objectives inside each phase run vertically.

## Status vocabulary

- `COMPLETED`
- `IN PROGRESS`
- `NEXT`
- `FUTURE`

## Product direction

The tool is intended to become a unified Star Citizen mission and route companion with:

1. precise operational locations and mobiGlas navigation targets;
2. cargo and non-cargo mission intake;
3. dependency-aware multi-stop routing;
4. a guided second-monitor execution mode;
5. a real hierarchical map for Stanton, Pyro and Nyx;
6. classic commodity trading and optional opportunities along planned routes;
7. manufacturer-themed MFD interfaces.

The implementation is intentionally split into small, independently testable modules. The roadmap data used by the website lives in `roadmap.js` and should be updated whenever work changes status.
