# Project State

## Current release

**v0.24 — OCR Assisted Intake**

The application can recognize text from explicitly selected contract screenshots, expose independently reviewable mission fields with OCR-line provenance, and send corrected drafts through the same mission-validation gate used by manual and Game.log intake. OCR never creates or replaces an active route by itself.

## OCR access and dependency boundary

- The user explicitly selects one to six PNG, JPEG, WebP or BMP images inside the Missions workspace.
- The application does not scan the clipboard, screenshot folders or arbitrary local files silently.
- `ocr-intake-view.js` loads a pinned Tesseract.js 7.0.0 ESM module only when OCR is requested.
- The JavaScript module, WebAssembly OCR core and English language model require network retrieval on first use; a fully offline first OCR run is not claimed.
- Selected image pixels are passed to the browser OCR worker and are not uploaded by application code.
- Source image bytes, object URLs and previews are not persisted in session state.
- Saved OCR state contains bounded extracted text, source filename/hash/dimensions, field provenance and the last generated draft.

## Image preprocessing contract

- Images are decoded in the browser and scaled so the longest processed dimension does not exceed 2,400 pixels.
- Small images may be enlarged up to twice their source size before recognition.
- The preprocessing canvas applies grayscale and increased contrast.
- Average sampled luminance determines whether a dark-HUD inversion pass is used.
- The processed canvas is the recognition source; the original selected image remains the visual preview for the current page session.
- Preprocessing improves OCR conditions but is not presented as proof that recognized text is correct.

## OCR field and provenance model

- `ocr-intake.js` remains independent from the browser OCR engine and converts recognized text into reviewable mission fields.
- Mission title, action, location, quantity and commodity retain separate values, confidence and source-line provenance.
- Explicit action headings take priority over derived `From:` and `To:` labels so destination rows do not create duplicate objectives.
- Titles containing words such as “delivery” do not become action objectives.
- Destination candidates resolve through the same 84-destination registry used by manual and Game.log intake.
- Exact, ambiguous and unresolved destination states remain distinguishable.
- Positive explicit SCU expressions are preferred over lower-confidence labelled quantity inference.
- Labelled commodity fields and commodity text on the same line as SCU are preferred over nearby unlabelled fallback text.
- Missing action, destination, quantity or commodity remains unresolved; no field is invented merely to make an objective complete.
- Each objective preserves its OCR source-line range and recognized text lines.

## OCR review integration

- The OCR panel appears inside Missions beneath Game.log intake and before the canonical mission text editor.
- Source previews, raw extracted text and editable mission fields remain visible before handoff.
- **Load raw text into editor** is available when field extraction is not useful.
- **Load OCR draft into review** serializes the corrected title and objectives into the existing compact mission-text format.
- Draft handoff triggers the normal mission-validation form rather than bypassing it.
- Existing action, location, SCU, commodity, ambiguity, custom-location and stale-review rules remain authoritative.
- The active route remains unchanged after image selection, OCR, field edits and draft loading.
- Route replacement occurs only after the existing explicit **Generate validated session** action.

## Game.log assisted intake

- Explicit local `Game.log` selection, complete-line incremental reads, stable byte offsets, source generations and replay protection remain delivered.
- Raw filename, generation, line number, byte offset, timestamp and original line provenance remain retained for candidate events.
- Complete and partial events remain separate.
- Whitespace-delimited structured fields are normalized before extraction so repeated contract IDs group consistently.
- Nearby contract/title correlation remains bounded and visibly marked as derived context.
- Actual unsupported log formats remain unresolved rather than receiving fabricated fields.

## Active universe registry

- `locations.js` retains the base interstellar systems, hierarchy nodes, stations and source metadata.
- `location-field-registry.js` extends that model with reviewed Stanton surface facilities before dependent runtimes load.
- The combined snapshot contains 130 normalized records and 84 operational destinations: 80 in Stanton, 3 in Pyro and 1 in Nyx.
- The original 34 operational destinations cover spaceports, planetary orbitals, Grim HEX, Lagrange rest stops, gateways, Pyro stations and Levski.
- The field extension adds 43 mining, research, agricultural or industrial outposts and 7 distribution centers or logistics complexes.
- Manual, Game.log and OCR destination text resolve through the same operational IDs, aliases and navigation targets.

## Location, Operations and navigation context

- All 84 operational destinations expose reviewed service and static-risk profiles.
- Every profile answers hangars or pads, fuel/repair/rearm, food, medical care, habitation, transit, cargo services, refinery, rentals, ground vehicles, commodity trade and unregulated trade.
- Risk is destination-specific and separate from onboard-cargo exposure.
- Operations shows inbound travel range, final approach, risk, protection/comms, hangar/pad, fuel, food and medical information below current cargo actions.
- Facility guidance and danger records remain static and do not claim live shard, player, piracy, traffic, stock or service uptime.
- Itinerary, System and Network remain separate Starmap navigation layers with persistent selection and explicit camera controls.
- Surface anchors remain schematic rather than surveyed coordinates.

## Fleet and estimate architecture

- `fleet-loadouts.js` remains the domain source for structured components, named loadouts, migration and derived ship performance.
- Active quantum configuration feeds normal-space and interstellar estimates.
- Active cargo and handling factors feed capacity and handling estimates.
- Jump tunnels remain separate from normal-space distance and are never converted into invented kilometres.

## Validation and CI contract

- OCR domain tests cover independent field extraction, incomplete-field preservation, correction serialization, explicit-versus-derived action anchors and dependency pinning.
- The Chromium OCR workflow uses a real browser file upload and preprocessing path with a deterministic mocked OCR module.
- Browser verification checks field rendering, line provenance, correction, mission-review handoff, unchanged route state, mobile targets and horizontal overflow.
- The normal quality workflow now uses `pipefail`; additional test failures can no longer be hidden by `tee`.
- Previously masked Current Stop, location-profile and Game.log grouping contracts were corrected and remain authoritative.
- Existing route, cargo, location, Fleet, Starmap, responsive and accessibility suites must remain green.
- Real Star Citizen screenshots remain the empirical input required to tune recognition and field-layout coverage beyond the deterministic fixture.

## Active interface architecture

- Six primary workspaces remain: Operations, Missions, Planner, Starmap, Fleet and Development.
- Manual, Game.log and OCR input coexist inside Missions rather than becoming separate workspaces.
- The mission text editor remains the universal manual fallback.
- Assisted-input panels expand the Missions editor naturally instead of overlapping generated-session output.
- OCR field cards collapse to a single-column mobile layout and retain 44-pixel interaction targets.
- Drake remains a project-derived manufacturer theme, not an official CIG visual package.

## Next release

**v0.25 — Release Hardening**

- Add versioned export, backup and restore.
- Add explicit, tested local-data migrations and pre-migration recovery snapshots.
- Recover from corrupt or partially incompatible local state.
- Verify large routes, location datasets and many saved ships/loadouts.
- Verify Firefox and WebKit where supported, plus offline/static deployment boundaries.
- Complete keyboard, screen-reader, contrast, zoom, reduced-motion and release verification.

## Locked path to v1.0

1. **v0.25 — Release hardening.** Backup, migrations, recovery, performance, accessibility and cross-browser verification.
2. **v1.0 — Core companion release.** Stable mission-to-execution workflow.

Session history, companion pairing and commodity trading remain deferred until after v1.0.
