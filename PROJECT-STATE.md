# Project State

## Current release

**v0.19 — Location context**

Operational location information now comes from one shared context model used by Operations, Route Planner and Location Intel. The model keeps official/registered facts, reviewed community facility records, derived cargo guidance and unavailable data visibly separate.

## Active Location Context architecture

- `location-context.js` is the single context source for route, cargo placement, Planner proposals and detailed location views.
- Official location and system facts retain their source IDs and review dates.
- Reviewed community facility records remain separately labelled from official facts.
- Missing facility records produce `unavailable-data`; they are never converted into assumed availability.
- Freshness is explicit: fresh, aging, stale or unknown.
- Source ledgers retain authority, link, kind and review date.
- Cargo exposure is categorical rather than a universal numeric score: clear, controlled, caution, high exposure or unknown.
- Exposure guidance combines onboard mission cargo with known system context and is labelled as derived guidance.
- Unknown and custom locations remain unknown rather than inheriting a nearby system assumption.
- Cargo placement uses a private compatibility priority derived from the same categories, but the UI never presents it as factual risk.

## Operational integration

- Operations Moves, Cargo, Adjust and Route surfaces show current-stop source and cargo context.
- The route index shows system, source confidence and freshness for each stop.
- Planner proposals show cargo exposure after each proposed stop.
- Location Intel includes verified/registered facts, arrival estimate, reviewed services, source ledger, known data gaps and the static-snapshot boundary.
- The previous string heuristic based on words such as `pyro`, `outpost` and `station` has been removed.

## Mission validation and provenance

- Mission intake remains review-first.
- Every parsed field carries a confidence contribution.
- Blocking errors remain separate from reviewable warnings.
- Unknown locations require explicit correction or custom confirmation.
- Original pasted text and reviewed text are stored separately.
- Cargo lots and route operations retain original pickup and delivery line provenance.

## Browser verification contract

- Chromium generates an Area18 → Checkmate → Levski cargo route.
- Before pickup, Location Context must report no mission cargo exposure.
- At Checkmate with cargo onboard, it must report high cargo exposure and retain the onboard SCU reason.
- Planner must render categorical context for proposed stops without recursive rendering.
- Checkmate must show official source links and unavailable facility data rather than fabricated services.
- Teasa must keep official location confidence and reviewed community facility records as separate layers.
- Desktop and mobile Location Intel reject document-level horizontal overflow.
- Existing validation, accessibility, Operations dialog and multi-viewport suites remain required.

## Universe-data boundary

- Official RSI web sources were verified on 2026-07-22 against Alpha 4.9.x.
- Registered operational locations include Checkmate Station, Orbituary, Ruin Station and Levski.
- Current topology includes Stanton–Pyro, Pyro–Nyx and the CIG-documented placeholder Stanton–Nyx connection.
- The snapshot is static web-source data, not live shard telemetry.
- No cargo-exposure category is live security telemetry.

## Navigation-estimate boundary

- Normal-space quantum distance is a project-derived operational estimate shown in km or Gm.
- Jump tunnels are counted separately and are never converted into invented kilometres.
- Navigation times are ranges affected by the selected ship quantum-time factor plus a visible jump allowance.
- Arrival, cargo handling and navigation remain separate estimate categories.

## Active interface architecture

- One shell stylesheet: `ui-v2.css`, plus shared design-system tokens and final legibility/interaction rules.
- Six primary workspaces: Operations, Missions, Planner, Starmap, Fleet and Development.
- Operations tools remain native compact views.
- Fleet includes schematic ship line art and cargo-zone editing.
- Starmap remains route-first and two-dimensional.
- Drake remains the current project-derived manufacturer theme, not an official CIG visual package.

## Next release

**v0.20 — Fleet loadouts**

- Store structured ship components rather than free-text component names.
- Save and switch between named ship loadouts.
- Make quantum, cargo and operational estimates consume the selected loadout.
- Keep component provenance and estimation assumptions visible.
