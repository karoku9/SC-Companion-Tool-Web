# SC Companion Tool — Clean Rebuild

Fresh development foundation for a Star Citizen mission and route companion.

The previous implementation is preserved unchanged on the branch:

`backup/pre-zero-rebuild-2026-07-21`

## Current baseline

- precise operational locations separated from mobiGlas navigation targets;
- mission, contract and cargo-lot identity model;
- cargo and non-cargo operation model;
- English Drake-inspired interface;
- horizontal macro-phase and vertical objective roadmap;
- automated Node tests and GitHub Pages deployment.

Searching for `Lorville` resolves to:

- operational arrival: `Teasa Spaceport · Lorville`;
- in-game navigation target: `Lorville`;
- hierarchy: `Stanton / Hurston / Lorville / Teasa Spaceport`.

## Run locally

Serve the repository root through any static HTTP server, for example:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Test

```bash
node --test tests/*.test.js
```

## Development direction

The application is being rebuilt through small, independently testable modules. The roadmap displayed inside the site is the active product roadmap and will be updated as objectives move between future, next, in progress and completed states.

The next implementation slice is deterministic route planning that respects operation dependencies. Time, fuel and risk optimization will only use explicit, traceable data sources rather than invented values.
