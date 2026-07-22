# Project State

## Current release

**v0.20 — Fleet loadouts**

Fleet now separates a saved ship instance from the configuration currently installed on it. Named loadouts contain structured component records, source provenance and explicit performance inputs. Switching a loadout keeps the ship identity, cargo zones, route state and notes intact while updating the estimates that depend on the selected configuration.

## Active Fleet Loadout architecture

- `fleet-loadouts.js` is the domain source for structured components, named loadouts, migration and derived ship performance.
- Component records use explicit slots and retain source kind, authority, reference, review note and optional performance inputs.
- Loadouts are stored per ship instance in `fleetLoadouts`; the selected configuration is stored separately in `activeLoadoutByShip`.
- Ship identity is not duplicated when a loadout changes.
- Existing free-text quantum-drive and factor fields migrate into an `Imported configuration` loadout with `legacy` provenance.
- Compatibility fields remain on each ship record so older route, Starmap and cargo consumers continue to work during the transition.
- Missing or unsourced component data remains visibly unknown rather than being replaced with an invented catalogue value.

## Loadout-derived estimates

- The active quantum time factor feeds normal-space and interstellar navigation estimates.
- The active cargo-capacity delta changes the physical capacity used by the Route Planner and Fleet readout.
- The active handling factor changes pickup and delivery handling ranges and total route estimates.
- Fuel-efficiency and quantum-spool inputs are stored with their assumptions for later fuel and detailed drive modelling.
- `fleet-estimate-adapter.js` enriches the existing planner engine without replacing mission, dependency or cargo-capacity rules.
- Planner results retain the same capacity-safe and dependency-safe guarantees after loadout selection.

## Fleet interface

- Fleet contains a responsive named-loadout browser and structured editor below the existing ship and cargo-zone surfaces.
- Loadouts can be created, edited, activated and deleted while every ship keeps at least one configuration.
- The editor records component slot, name, manufacturer, size/class, source kind, authority, reference and notes.
- Operational factors are shown as assumptions and never presented as official component specifications unless the saved source explicitly says so.
- The selected ship readout updates immediately with active quantum drive, travel factor and operational cargo capacity.

## Browser verification contract

- A pre-v0.20 Corsair session must migrate to one `Imported configuration` loadout without changing the ship ID.
- A second named loadout must activate without losing the first configuration.
- Active loadout values must update compatibility fields and derived performance.
- Fleet must remain free of document-level horizontal overflow on desktop and mobile.
- Mobile loadout controls must keep the established 44 px interaction target.
- Existing mission validation, Location Context, accessibility, Operations dialog and multi-viewport suites remain required.

## Active Location Context architecture

- `location-context.js` remains the shared context source for route, cargo placement, Planner proposals and detailed location views.
- Official location/system facts, reviewed community facility records, derived cargo guidance and unavailable data remain separate.
- Freshness and source ledgers retain authority, link, kind and review date.
- Cargo exposure remains categorical: clear, controlled, caution, high exposure or unknown.
- No exposure category is live shard or security telemetry.

## Mission validation and provenance

- Mission intake remains review-first with independent field confidence.
- Blocking errors remain separate from reviewable warnings.
- Unknown locations require explicit correction or custom confirmation.
- Original and reviewed text plus pickup/delivery line provenance remain stored.

## Universe and estimate boundary

- Official RSI web sources were verified on 2026-07-22 against Alpha 4.9.x.
- The universe snapshot and current jump topology are static web-source data, not live shard telemetry.
- Normal-space quantum distance is a project-derived operational estimate shown in km or Gm.
- Jump tunnels are counted separately and never converted into invented kilometres.
- Arrival, cargo handling and navigation remain separate estimate categories.

## Active interface architecture

- One shell stylesheet: `ui-v2.css`, plus shared design-system and feature modules.
- Six primary workspaces: Operations, Missions, Planner, Starmap, Fleet and Development.
- Operations tools remain native compact views.
- Fleet includes ship schematics, cargo-zone editing and structured loadouts.
- Starmap remains route-first and two-dimensional.
- Drake remains a project-derived manufacturer theme, not an official CIG visual package.

## Next release

**v0.21 — Session history**

- Archive completed sessions without mutating the active route.
- Record planned and observed timings, incidents and corrections.
- Allow a completed run to become a reusable session template.
- Keep historical outcomes separate from static universe facts and future estimates.
