# SC Companion Tool — Clean Rebuild

A local-first Star Citizen mission, cargo and route companion built through small, independently testable releases.

The previous implementation is preserved unchanged on the branch:

`backup/pre-zero-rebuild-2026-07-21`

## Current release

**v0.21 — UX Foundation and Starmap 2.0**

The current application includes:

- review-first mission intake with contract and cargo-lot provenance;
- dependency-safe, capacity-safe multi-stop route planning;
- guided Operations with live cargo state and manual corrections;
- operational locations separated from mobiGlas navigation targets;
- sourced Location Context and categorical cargo-exposure guidance;
- itinerary, system and network navigation layers for Stanton, Pyro and Nyx;
- persistent map selection plus current, next and final objective orientation;
- pan, zoom, fit and center-current Starmap controls;
- a dedicated mobile map details sheet instead of a stacked desktop sidebar;
- per-ship cargo zones and structured named loadouts;
- loadout-aware quantum, cargo-capacity and handling estimates;
- English Drake-inspired MFD interface with desktop/mobile browser coverage;
- automated Node and Chromium tests plus GitHub Pages deployment.

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

GitHub Actions also runs JavaScript syntax checks and Playwright/Chromium workflows across the main operational states and supported viewport sizes. Starmap verification includes task-oriented checks for route orientation, persistent selection, layer switching, camera controls and the mobile details sheet.

## Data boundaries

Official/static universe facts, reviewed community facility records, project-derived estimates, user-entered component data and unavailable information remain visibly separate. The application does not claim live shard, market, security or component telemetry where none is available.

## Development direction

The roadmap displayed inside the site is the active product roadmap. Content is stored in `roadmap.js`; detailed current architecture and verification rules are documented in `PROJECT-STATE.md` and `PROJECT-CHECKLIST.md`.

The locked core sequence is:

1. **v0.22 — Expanded universe data**: broader hauling destinations, aliases, hierarchy, provenance and geometry validation.
2. **v0.23 — Game.log assisted intake**: the primary automated intake path, with incremental event parsing, provenance and review before route replacement.
3. **v0.24 — OCR assisted intake**: screenshot import as a secondary fallback through the same mission-validation workflow.
4. **v0.25 — Release hardening**: backup, migrations, recovery, performance, accessibility and browser verification.
5. **v1.0 — Core companion release**: a stable mission-to-execution workflow.

Session history, companion pairing and commodity trading are intentionally deferred until after v1.0 so they cannot delay location coverage, Game.log intake, OCR fallback or release reliability.