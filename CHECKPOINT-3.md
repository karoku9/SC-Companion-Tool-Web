# Checkpoint 3 — Hauling operations and data portability

Checkpoint 3 turns Hauling into a functional local market planner and freight ledger. All prices, stock, demand, record age and confidence values are immutable demo/reference data. They are not live game data and are never presented as current stock or telemetry.

## Architecture

- `data.js` contains immutable ships, locations, commodity definitions and market records. Market rows store commodity/location IDs, terminal, transaction type, price, availability or demand, legality, reference age, reliability and notes.
- `hauling-core.js` is a UI-independent calculation and run-state engine. It owns normalized filters, opportunities, planning, batch state, validation, event execution, reversal, adjustments and accounting.
- `transfer-core.js` is a UI-independent export/import engine. It owns envelopes, validation, previews, replace/merge behavior and reference-safe ID remapping.
- `app.js` connects those pure engines to persisted application state, the approved MFD components and the nine-page navigation model.

Immutable reference data never shares objects with mutable plans or runs. Starting a run deep-copies its plan, ship label/capacity, batches, steps, prices and source market-record IDs into a run snapshot.

## Persistent state schema version 2

The localStorage key remains `waypoint-cargo-companion-state`. Version 2 preserves the Checkpoint 2 fields and adds:

```json
{
  "version": 2,
  "ui": {
    "haulingView": "list",
    "haulingTab": "search",
    "selectedHaulingOpportunityId": null
  },
  "preferences": {
    "haulingSort": "balanced",
    "haulingMode": "one-way",
    "haulingInvestmentLimit": 500000,
    "haulingIncludeLowReliability": false,
    "confirmFinancialActions": true
  },
  "hauling": {
    "filters": {},
    "draftPlan": null,
    "activeRun": null,
    "history": [],
    "lastSearchAt": null,
    "selectedOpportunityId": null
  }
}
```

Temporary menus, dialogs, pending confirmation values, pending transactions and pending import files are not persisted or exported.

### Version-1 migration

`migrateVersionOne` accepts only a valid version-1 object with fleet and mission arrays. It retains fleet, missions, selected ship, starting location, preferences, planned route, active-route snapshot/progress and Intel data. It overlays current preference defaults and creates an empty, normalized hauling state tied to the existing ship and origin.

Malformed data falls back to safe in-memory defaults and exposes a recovery notice. Unsupported future versions are not treated as compatible. Failed migration does not overwrite the original localStorage value.

## Opportunity calculation

Every compatible buy record is paired with a higher-priced sell record for the same commodity at a different location. Illegal rows are removed before calculation unless the global setting is enabled. Legal-status, commodity, reliability, text, minimum profit and minimum margin filters are then applied.

Recommended SCU is:

```text
floor(min(ship capacity,
          optional capacity limit,
          buy availability,
          sell demand,
          floor(maximum investment / buy price),
          optional requested quantity))
```

The interface identifies every active limiter and separately displays capacity, planned cargo and unused capacity. No invalid manual quantity is silently clamped.

```text
required investment = planned SCU × buy price / SCU
estimated revenue   = planned SCU × sell price / SCU
estimated profit    = estimated revenue − required investment
profit / SCU        = sell price / SCU − buy price / SCU
```

Distance uses the same fixed local coordinate estimate as the navigation system. An unmapped location produces an unknown distance rather than a fabricated number.

Sorting is deterministic with opportunity ID as the final tie-breaker. Balanced ranking is:

```text
45% normalized total profit
+ 25% normalized profit per SCU
+ 15% confidence
+ 15% inverse normalized duration
```

## Multi-stop heuristic

The constrained planner begins with the selected deterministic opportunity. In multi-stop mode it may add one chained trade whose buy location is the first sale location, whose commodity differs and whose sale does not simply return to the first origin. Budget is consumed in order.

Each batch is purchased, loaded and sold before the next batch purchase. This makes cargo ownership and capacity constraints explicit, avoids unnecessary repeat travel, and guarantees that a sale cannot precede its purchase. The output is intentionally understandable rather than globally optimal, and the Plan panel explains each chosen chain.

## Run events and cargo state

Run steps include travel, arrival, purchase, load, depart, sale and completion; travel to the current location is omitted. Purchase and sale entries retain actual quantity, price, fees and note. Validation rejects negative values, purchases beyond remaining capacity or planned reference quantity, and sales beyond cargo held.

Batch state derives from purchased, loaded, sold and separately adjusted quantities. Partial sales remain visibly on board. Previous reverses physical events directly; reversing a recorded purchase or sale requires confirmation when financial confirmation is enabled.

Only one guided workflow may be primary. Starting Hauling while a mission route is active—or the reverse—requires the user to keep, replace or cancel. Source Planner and Fleet changes do not mutate an active hauling snapshot.

## Accounting

```text
planned investment     = Σ(planned SCU × planned buy price)
actual investment      = Σ(purchased SCU × actual buy price)
planned revenue        = Σ(planned SCU × planned sell price)
actual revenue         = Σ(sold SCU × actual sell price)
realized gross profit  = actual revenue − cost basis of sold SCU
estimated remaining    = held SCU × (planned sell − actual/planned buy)
unrealized cargo value = held SCU × planned sell price
losses                 = adjusted/lost SCU × actual/planned buy price
final net profit       = realized gross profit − fees − losses
ROI                    = final net profit / actual investment × 100
```

Unsold cargo is never counted as realized revenue or profit. Completed and abandoned ledgers remain distinct, and ending a run requires an explicit remaining-cargo disposition.

## JSON envelope and merge rules

Exports use this stable envelope:

```json
{
  "applicationId": "waypoint-cargo-companion",
  "exportSchemaVersion": 1,
  "exportType": "full | missions | fleet | hauling-history | preferences",
  "exportedAt": "ISO-8601 timestamp",
  "sourceApplicationVersion": "checkpoint-3",
  "payload": {}
}
```

Filenames use `waypoint-cargo-companion-{type}-{YYYY-MM-DD}.json`. Import validates application ID, schema, type, payload shape, mission/lot ownership and hauling batch references before presenting a preview. Selecting a file never applies it.

Full backups can replace the complete persisted state or merge compatible records. Partial imports merge. Existing records are preserved; colliding mission, lot, fleet-entry, run and batch IDs are remapped. Mission-to-lot and step/event-to-batch references are rewritten to the new IDs. Duplicate fleet instances with the same catalog ship and case-insensitive nickname are skipped. The apply path keeps a temporary in-memory backup and rolls back on failure.

## Verification

Automated suites:

```powershell
node --test tests/checkpoint2.test.js tests/checkpoint3.test.js
```

- 11/11 Checkpoint 2 and 2.1 regression tests pass.
- 14/14 Checkpoint 3 scenarios A–N pass.
- Browser QA covers all nine populated pages at 1680×900.
- Hauling search/results, Plan, active run, transaction dialog, accounting, export and import preview were additionally checked at 1366×768 and 1920×1080.
- No horizontal page overflow, clipped primary controls or browser console errors were observed.

Screenshots are stored in `screenshots/checkpoint-3/`.

## Known limitations

- Market data is a deliberately small local reference dataset and may not match the game economy.
- Multi-stop planning is a constrained deterministic chain, not a global optimizer.
- Coordinates, distance and duration are planning estimates, not the in-game quantum router.
- Manually sold-elsewhere closure is retained as an explicit history disposition; it does not invent sale proceeds.
- There are no live APIs, scraping, backend, cloud sync, OCR, Game.log telemetry or display textures.
