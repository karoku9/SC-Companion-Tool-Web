# SC Companion Tool — Clean Rebuild

A local-first Star Citizen mission, cargo and route companion built through small, independently testable releases.

The previous implementation is preserved unchanged on the branch:

`backup/pre-zero-rebuild-2026-07-21`

## Current release

**v0.24 — OCR Assisted Intake**

The current application includes:

- explicit screenshot and cropped-contract image selection inside **Missions**;
- PNG, JPEG, WebP and BMP input, with up to six images per OCR batch;
- a pinned Tesseract.js 7.0.0 browser worker loaded only when OCR is requested;
- bounded-resolution preprocessing with grayscale, contrast and automatic dark-HUD inversion;
- independent extraction and confidence for action, destination, SCU and commodity;
- source filename, image hash, dimensions and OCR-line provenance for every extracted field;
- editable OCR fields before draft handoff, plus a raw-text fallback for manual cleanup;
- no persistence of source image bytes or previews; only sanitized extracted text, source metadata and field provenance remain in local browser state;
- the same mission-validation, ambiguity, custom-location and explicit-generation gates used by manual and Game.log intake;
- no automatic replacement of the active route;
- explicit, user-initiated local `Game.log` selection with incremental reads, source generations, replay protection and raw event provenance;
- one sourced and versioned location model with 130 normalized records and 84 operational destinations;
- complete reviewed destination services and static-risk guidance;
- guided Operations with travel, final-approach, landing support and service information at the current stop;
- dependency-safe, capacity-safe multi-stop route planning;
- itinerary, system and network navigation layers for Stanton, Pyro and Nyx;
- per-ship cargo zones and structured named loadouts;
- authoritative Node and Chromium tests, including an end-to-end mocked OCR upload and review workflow.

### OCR workflow

1. Open **Missions** and choose one or more screenshots.
2. Wait for local recognition and inspect the image preview, extracted text and field-level confidence.
3. Correct mission title, action, destination, SCU or commodity directly in the OCR review panel.
4. Use **Load OCR draft into review**.
5. Resolve any blocker in the normal mission-validation panel.
6. Generate the route explicitly only after validation.

The selected image is handled by the browser OCR worker and is not retained in saved session state. On first OCR use, the pinned JavaScript module, WebAssembly OCR core and English language model must be downloaded. Later availability depends on browser caching and network policy; fully offline first-use OCR is not claimed.

### Game.log workflow

1. Choose `Game.log` explicitly.
2. Inspect complete and unresolved candidate events with raw provenance.
3. Read newer complete lines during the same page session, or reselect the file where a persistent handle is unavailable.
4. Load the extracted draft into the normal mission review.
5. Generate only after explicit validation.

The browser cannot silently monitor the Star Citizen installation. File permission is not claimed across a page reload.

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

GitHub Actions also runs JavaScript syntax checks and Playwright/Chromium workflows across operational states and supported viewport sizes. OCR coverage verifies field extraction, unresolved-field preservation, correction serialization, image upload, browser preprocessing, field provenance, validation handoff, mobile layout and the rule that route state remains unchanged until explicit generation.

## Data boundaries

Official/static universe facts, reviewed community and unpacked game-data records, project-derived estimates, user-entered component data and unavailable information remain visibly separate. Schematic map anchors are not presented as verified coordinates. Static danger guidance is not a live report of players, piracy, comm-array state or shard conditions. Service records do not claim current stock or uptime.

OCR confidence is recognition evidence, not proof that an extracted field matches the in-game contract. Low-confidence and incomplete fields remain editable and must still pass mission validation. The public Game.log fixture uses an observed notification envelope with synthetic hauling payloads; unsupported real-world variants remain unresolved rather than receiving invented data.

## Development direction

The roadmap displayed inside the site is the active product roadmap. Content is stored in `roadmap.js`; detailed architecture and verification rules are documented in `PROJECT-STATE.md`, `PROJECT-CHECKLIST.md` and the project documents under `docs/`.

The locked remaining core sequence is:

1. **v0.25 — Release hardening**: backup, migrations, recovery, performance, accessibility, offline/static deployment and cross-browser verification.
2. **v1.0 — Core companion release**: a stable mission-to-execution workflow.

Session history, companion pairing and commodity trading are intentionally deferred until after v1.0.
