# SC Companion Tool — Clean Rebuild

A local-first Star Citizen mission, cargo and route companion built through small, independently testable releases.

The previous implementation is preserved unchanged on the branch:

`backup/pre-zero-rebuild-2026-07-21`

## Current release

**v0.23 — Game.log Assisted Intake**

The current application includes:

- explicit, user-initiated local `Game.log` selection with no silent filesystem scanning;
- incremental reads that retain byte offsets and defer unfinished final lines until the next refresh;
- stable source generations with truncation and rotation isolation;
- duplicate and replay protection for already imported log events;
- raw line, timestamp, source file, line number and byte-offset provenance;
- separation between complete objective candidates and partial events that still need manual review;
- cautious correlation with nearby contract/title context rather than invented mission fields;
- conversion of supported events into compact mission drafts that enter the existing field-by-field validation flow;
- no automatic replacement of the active route: generation still requires explicit review and confirmation;
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
- guided Operations with travel, final-approach, landing support and service information at the current stop;
- dependency-safe, capacity-safe multi-stop route planning;
- itinerary, system and network navigation layers for Stanton, Pyro and Nyx;
- per-ship cargo zones and structured named loadouts;
- automated Node and Chromium tests plus GitHub Pages deployment.

### Game.log workflow

1. Open **Missions** and choose `Game.log` explicitly.
2. Inspect detected complete and unresolved candidate events, including their raw provenance.
3. Use **Read new lines** during the same page session, or reselect the file when the browser cannot retain a handle.
4. Load the extracted draft into the normal mission review.
5. Correct or reject uncertain fields.
6. Generate the route explicitly only after validation.

The browser cannot silently monitor the Star Citizen installation. File permission is not retained after a page reload. Previously extracted candidate events can remain in the local browser session, but reading newer filesystem content requires another explicit file selection or permission grant.

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

GitHub Actions also runs JavaScript syntax checks and Playwright/Chromium workflows across operational states and supported viewport sizes. Game.log coverage verifies parser noise rejection, complete and partial events, source provenance, context correlation, replay protection and integration with the existing review path.

## Data boundaries

Official/static universe facts, reviewed community and unpacked game-data records, project-derived estimates, user-entered component data and unavailable information remain visibly separate. Schematic map anchors are not presented as verified coordinates. Static danger guidance is not a live report of players, piracy, comm-array state or shard conditions. Service records do not claim current stock or uptime.

The public Game.log test fixture uses a Game.log notification envelope observed in real output with synthetic hauling payloads. Actual Alpha 4.9 mission-bearing log wording may vary. Unsupported or incomplete lines remain visible as unresolved raw events instead of receiving invented SCU, commodity, destination or contract data.

## Development direction

The roadmap displayed inside the site is the active product roadmap. Content is stored in `roadmap.js`; detailed architecture and verification rules are documented in `PROJECT-STATE.md`, `PROJECT-CHECKLIST.md` and the project documents under `docs/`.

The locked remaining core sequence is:

1. **v0.24 — OCR assisted intake**: screenshot import as a secondary fallback through the same mission-validation workflow.
2. **v0.25 — Release hardening**: backup, migrations, recovery, performance, accessibility and browser verification.
3. **v1.0 — Core companion release**: a stable mission-to-execution workflow.

Session history, companion pairing and commodity trading are intentionally deferred until after v1.0.