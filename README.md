# SC Companion Tool — Clean Rebuild

A local-first Star Citizen mission, cargo and route companion built through small, independently testable releases.

The previous implementation is preserved unchanged on the branch:

`backup/pre-zero-rebuild-2026-07-21`

## Current release

**v0.22.1 — Expanded Universe Data with Complete Location Intel**

The current application includes:

- one sourced and versioned location model with 130 normalized records and 84 operational destinations;
- 34 spaceports, orbital/Lagrange stations, gateways and interstellar destinations;
- 43 Stanton mining, research, agricultural or industrial outposts;
- 7 Stanton distribution centers and logistics complexes;
- Checkmate Station, Orbituary, Ruin Station and Levski coverage across Pyro and Nyx;
- punctuation-tolerant aliases such as `ARC-L2`, `ARC L2`, `NBIS`, `HDMS Bezdek`, `S4LD01` and full facility names;
- explicit facility types and in-game navigation targets;
- at-a-glance risk, fuel/repair, food/drink and medical answers for every supported destination;
- complete reviewed service profiles covering cargo, refinery, rentals, ground vehicles and trade;
- destination-specific static danger guidance separated from onboard-cargo exposure;
- finite Starmap anchors with verified, derived and schematic geometry kept distinguishable;
- review-first mission intake with contract and cargo-lot provenance;
- dependency-safe, capacity-safe multi-stop route planning;
- guided Operations with live cargo state and manual corrections;
- itinerary, system and network navigation layers for Stanton, Pyro and Nyx;
- persistent map selection plus current, next and final objective orientation;
- pan, zoom, fit and center-current Starmap controls;
- a dedicated mobile map details dialog;
- per-ship cargo zones and structured named loadouts;
- loadout-aware quantum, cargo-capacity and handling estimates;
- automated Node and Chromium tests plus GitHub Pages deployment.

Examples:

- `Lorville` resolves to `Teasa Spaceport · Lorville`, with the in-game target `Lorville`.
- `ARC L2` and `Lively Pathway` resolve to `ARC-L2 Lively Pathway Station · ARC-L2`.
- `NBIS` resolves to `New Babbage Interstellar Spaceport · New Babbage`.
- `HDMS Bezdek` resolves to the Arial surface outpost and reports fuel support but no food or clinic.
- `S4LD01` resolves to the microTech logistics depot with cargo-focused services.

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

GitHub Actions also runs JavaScript syntax checks and Playwright/Chromium workflows across operational states and supported viewport sizes. Expanded-universe verification exercises interstellar stations, surface outposts, distribution centers, mission resolution, route generation and Location Intel on desktop and mobile.

## Data boundaries

Official/static universe facts, reviewed community and unpacked game-data records, project-derived estimates, user-entered component data and unavailable information remain visibly separate. Schematic map anchors are not presented as verified coordinates. Static danger guidance is not a live report of players, piracy, comm-array state or shard conditions. Service records do not claim current stock or uptime.

## Development direction

The roadmap displayed inside the site is the active product roadmap. Content is stored in `roadmap.js`; detailed architecture and verification rules are documented in `PROJECT-STATE.md`, `PROJECT-CHECKLIST.md` and `docs/v0.22-expanded-universe-data.md`.

The locked core sequence is:

1. **v0.23 — Game.log assisted intake**: primary automated intake with incremental event parsing, provenance and review before route replacement.
2. **v0.24 — OCR assisted intake**: screenshot import as a secondary fallback through the same mission-validation workflow.
3. **v0.25 — Release hardening**: backup, migrations, recovery, performance, accessibility and browser verification.
4. **v1.0 — Core companion release**: a stable mission-to-execution workflow.

Session history, companion pairing and commodity trading are intentionally deferred until after v1.0.
