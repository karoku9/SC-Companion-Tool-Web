# Checkpoint 2 — Working Core

## Persisted state schema

Storage key: `waypoint-cargo-companion-state`

Schema version: `1`

```text
state
├─ version
├─ ui
│  ├─ mapMode, selectedLocationId, selectedCustomLocation
│  ├─ haulingView, intelTab, toolsTab
│  └─ sidebarCollapsed
├─ preferences
│  ├─ density, reducedMotion, numberFormat
│  ├─ automaticSave, showIllegalCommodities
│  ├─ defaultShipCatalogId, defaultStartingLocationId, defaultMapMode
│  └─ adaptiveTheme, themeOverride, manualTheme
├─ fleet[]
│  └─ id, shipId, nickname
├─ missions[]
│  ├─ id, title, type, reference, reward, notes
│  └─ cargo[]
│     └─ id, missionId, commodity, scu,
│        pickupLocationId/pickupLabel,
│        deliveryLocationId/deliveryLabel, note
├─ selectedShipId
├─ startingLocationId
├─ plannedRoute
├─ activeRoute
│  ├─ routeId, status, stepIndex, steps, metrics
│  ├─ lotIds, manifest, stopLabels, customLocations
│  └─ manualCorrections
├─ hauling
├─ intel
└─ lastSavedAt
```

Immutable catalogue data remains in `data.js`. Temporary page/dialog state is not serialized. Startup accepts only schema version 1 with valid fleet and mission collections; malformed or incompatible payloads fall back to safe defaults and surface a recovery notice.

## Mutation and saving model

Meaningful changes pass through the `mutate` function. It applies one state mutation, respects Automatic local save, and performs one coherent page render. `Save now` forces persistence even when automatic saving is disabled. Reset requires the exact typed confirmation `RESET`.

## Route generation

The generator is deterministic and local:

1. Start at the selected fixed location.
2. Process every currently eligible action at that location.
3. Pickups make their matching deliveries eligible.
4. Choose the nearest eligible fixed stop using static coordinates.
5. Break equal distances alphabetically.
6. Put all eligible actions at the chosen location next to one another.
7. Never create a travel step for identical consecutive locations.
8. Retain custom labels; their legs are marked with unknown distance.
9. Finish only after every cargo lot has a delivery action.

The resulting steps retain `missionId` and `lotId`. Estimates use static coordinate distance plus simple handling, travel, fuel-demand and OM-assist heuristics. They are explicitly labelled as local estimates and not the in-game quantum router.

## Cargo-status derivation

Cargo status is calculated from pickup/delivery step positions relative to the current Active Route index:

- before pickup: `Pending`;
- current pickup: `Ready to load`;
- completed pickup: `On board`;
- current delivery: `Ready to deliver`;
- completed delivery: `Delivered`.

Previous changes only the route index (or reopens a completed route); the displayed cargo state is then derived again, so reversal cannot leave stale statuses. Manual overrides are stored separately and visibly marked `MANUAL`. Removing an override returns the lot to its derived state.

## Scenario results

| Scenario | Result | Evidence |
|---|---|---|
| A — Basic mission | Pass | One-lot route completed through Pending → Ready to load → On board → Ready to deliver → Delivered. |
| B — Same commodity, different missions | Pass | Two Titanium lots retain separate mission IDs, lot IDs, pickup steps, delivery steps and manifest rows. |
| C — Multiple locations | Pass | Every pickup precedes delivery; Bezdek pickup/delivery actions are grouped without duplicate travel. |
| D — Over capacity | Pass | 52 SCU on a 46 SCU Cutlass shows a 6 SCU warning and requires explicit start confirmation. |
| E — Previous | Pass | Browser and automated tests confirm reverse status derivation. |
| F — Persistence | Pass | Selected ship, mission state, route index, cargo status and manual corrections survive reload. |
| G — Theme | Pass | Drake, RSI and MISC adaptive themes work; manual override persists and wins after reload. |
| H — Malformed storage | Pass | Isolated startup test loads safe defaults and marks recovery instead of producing a blank page. |

Automated checks live in `tests/checkpoint2.test.js` and run with:

```powershell
node --test tests/checkpoint2.test.js
```

## Responsive QA

- All nine pages: 1680×900.
- Planner and Active Route: 1920×1080 and 1366×768.
- Populated two-lot mission editor: 1366×768.
- Mission validation, manual correction and overload confirmation dialogs: 1366×768.
- No horizontal page overflow, off-screen enabled controls, clipped dialogs or browser console errors were found.

## Known limitations

- Distances and timing are heuristics over static 2D coordinates, not game telemetry or a global quantum optimizer.
- Custom locations remain routable but have unknown distance and service data.
- Fixed destination profiles may not reflect current live-game conditions.
- Hauling filters, active market runs and accounting remain Checkpoint 3.
- JSON transfer, OCR, Game.log monitoring, cloud synchronization and external backends remain locked.
- The independent display-texture system remains documented but unimplemented; no CRT texture was added.
