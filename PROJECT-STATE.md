# Project State

## Current release

**v0.23 — Game.log Assisted Intake**

The application can read an explicitly selected local `Game.log`, retain incremental import state, expose complete and partial mission-bearing events with raw provenance, and send supported extracted objectives through the existing mission review before any route can be generated.

## Game.log access boundary

- The static web application never claims silent access to the Star Citizen installation or arbitrary local files.
- The user selects `Game.log` explicitly through the File System Access API where supported or a standard file input fallback.
- A granted file handle exists only in page memory; after reload the user must select or authorize the file again.
- Previously extracted candidate events can remain in local browser state without retaining filesystem permission.
- The standard file-input fallback requires reselection before reading newer content.
- Only mission-bearing candidate lines are retained, bounded to the latest 500 events and 4,000 processed event IDs.

## Incremental import contract

- Every source generation stores its filename, stable prefix hash, size, modification time, byte offset, completed-line count, import time and generation number.
- Reads begin from the last complete byte offset instead of reparsing the whole file.
- An unfinished final line is not parsed and remains pending until a later refresh completes it.
- First import scans at most the newest 24 MiB and aligns to a full line before parsing.
- A fixed 4 KiB prefix avoids treating ordinary appends to a small growing log as a new source.
- A smaller-than-offset file or changed stable prefix creates an isolated truncation/rotation generation.
- Event identity includes the source generation and exact raw line.
- Duplicate or replayed event IDs are rejected before storage and draft reconstruction.

## Event and provenance model

- `game-log-intake.js` parses timestamps, notification envelopes, structured key/value fields, contract identifiers, titles, actions, registered locations, SCU and commodity candidates.
- `game-log-intake-correlation.js` normalizes multi-word action phrases and may associate a complete objective with the nearest preceding contract/title context from the same source within a bounded line distance.
- Correlation is marked as derived context and never upgrades a missing action, location, quantity or commodity into a complete event.
- Every retained event preserves source filename, source generation, line number, byte offset, timestamp, raw line and extracted message.
- Complete events require action, a registered location, positive SCU and a commodity.
- Partial events remain visible with unresolved fields and can be copied as raw diagnostic lines.
- Unrelated tutorial and ordinary log lines are ignored rather than shown as missions.

## Mission review integration

- Supported complete events become compact mission-text drafts grouped by explicit contract ID, title or a clearly labelled unidentified import batch.
- Duplicate objective candidates inside a draft are collapsed.
- The user must choose **Load extracted draft into review** before the text enters mission validation.
- Existing per-field action, location and cargo checks remain authoritative.
- Ambiguous and unknown locations still require correction or explicit custom-location confirmation.
- The active route is never replaced by file import, event parsing, correlation or draft loading.
- Route replacement occurs only after the existing explicit validated-session generation action.
- Stored Game.log draft metadata retains the event IDs that produced it, linking the review source back to local raw events.

## Empirical format boundary

- The public fixture uses an `UpdateNotificationItem` envelope observed in real `Game.log` output.
- Hauling payload wording inside the fixture is synthetic because no user-provided Alpha 4.9 mission-bearing log was available during implementation.
- Structured key/value and natural-language extraction therefore represent supported parser patterns, not a claim that every current contract event uses those exact strings.
- Unknown real-world variants remain unresolved and source-visible instead of receiving fabricated SCU, commodity, destination or contract information.
- The **Copy unresolved lines** path exists specifically to improve format coverage from actual logs without weakening review safeguards.

## Active universe registry

- `locations.js` retains the base interstellar systems, hierarchy nodes, stations and source metadata.
- `location-field-registry.js` extends that model with reviewed Stanton surface facilities before dependent runtimes load.
- The combined snapshot contains 130 normalized records and 84 operational destinations: 80 in Stanton, 3 in Pyro and 1 in Nyx.
- The original 34 operational destinations cover spaceports, planetary orbitals, Grim HEX, Lagrange rest stops, gateways, Pyro stations and Levski.
- The field extension adds 43 mining, research, agricultural or industrial outposts and 7 distribution centers or logistics complexes.
- Mission validation and Game.log extraction resolve destination text through the same operational IDs, aliases and navigation targets.

## Location and Operations context

- All 84 operational destinations expose reviewed service and static-risk profiles.
- Every profile answers hangars or pads, fuel/repair/rearm, food, medical care, habitation, transit, cargo services, refinery, ships or rentals, ground vehicles, commodity trade and unregulated trade.
- Risk is destination-specific and separate from onboard-cargo exposure.
- Operations shows inbound travel range, final approach, risk, protection/comms, hangar/pad, fuel, food and medical information below current cargo actions.
- Facility guidance and danger records remain static; they do not claim live shard, player, piracy, traffic, stock or service uptime.

## Active Starmap architecture

- `starmap-data.js` derives systems, connections and operational anchors from the combined registry.
- Itinerary, System and Network remain explicit navigation layers with separate purposes.
- Selected stops, bodies and systems remain selected until another object is chosen.
- Current, next and final route objectives remain visible in the map HUD.
- Pan, wheel/button zoom, fit, center-current and keyboard controls operate on the SVG view box.
- Surface anchors support route estimates and stop placement but do not claim surveyed map coordinates.

## Active Fleet and estimate architecture

- `fleet-loadouts.js` remains the domain source for structured components, named loadouts, migration and derived ship performance.
- Active quantum configuration feeds normal-space and interstellar estimates.
- Active cargo and handling factors feed capacity and handling estimates.
- Jump tunnels remain separate from normal-space distance and are never converted into invented kilometres.

## Validation contract

- Game.log parser tests cover unrelated notification rejection, exact raw provenance, complete/partial separation, multi-word actions, location resolution, context correlation and replay rejection.
- Static interface contracts require explicit file selection, incremental offsets, stable source generations, rotation isolation, raw provenance and reuse of the mission review form.
- Existing location, route, cargo, Fleet, Starmap, responsive and Chromium suites must remain green.
- Missions desktop and mobile layouts must remain readable without horizontal overflow.
- An actual Alpha 4.9 hauling `Game.log` remains the required empirical input for expanding known payload signatures beyond the documented parser boundary.

## Active interface architecture

- Six primary workspaces remain: Operations, Missions, Planner, Starmap, Fleet and Development.
- Game.log intake is embedded in Missions instead of becoming a separate workspace.
- The mission text editor remains available as the universal manual fallback.
- Complete and partial events, raw provenance and the review handoff are responsive on desktop and mobile.
- Drake remains a project-derived manufacturer theme, not an official CIG visual package.

## Next release

**v0.24 — OCR Assisted Intake**

- Accept screenshots and cropped mission images as a secondary import path.
- Extract title, action, location and cargo fields with independent confidence.
- Preserve source-image references and extracted text.
- Reuse the existing ambiguity, custom-location, stale-review and explicit-generation safeguards.
- Prevent OCR output from bypassing mission validation or replacing the active route automatically.

## Locked path to v1.0

1. **v0.24 — OCR assisted intake.** Screenshot fallback through the same review model.
2. **v0.25 — Release hardening.** Backup, migrations, recovery, performance, accessibility and cross-browser verification.
3. **v1.0 — Core companion release.** Stable mission-to-execution workflow.

Session history, companion pairing and commodity trading remain deferred until after v1.0.