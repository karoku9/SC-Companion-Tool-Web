# SC Companion Tool — Clean Rebuild

Fresh development foundation for a Star Citizen mission and route companion.

The previous implementation is preserved unchanged on the branch:

`backup/pre-zero-rebuild-2026-07-21`

## Product direction

The application will be rebuilt in small, verifiable increments around:

- precise operational destinations, such as `Teasa Spaceport · Lorville`;
- the in-game search destination required by the mobiGlas, such as `Lorville`;
- cargo and non-cargo mission intake;
- multi-stop route planning;
- guided in-game execution;
- optional commodity opportunities along an already planned route;
- manufacturer-themed MFD interfaces.

No previous application code is carried into this branch by default. New slices should remain small, testable and useful on their own.

## Current functional slices

### Operational locations

The hierarchical location model distinguishes a physical arrival point from the name that must be selected in the game.

Searching for `Lorville` resolves to:

- operational arrival: `Teasa Spaceport · Lorville`;
- in-game navigation target: `Lorville`;
- hierarchy: `Stanton / Hurston / Lorville / Teasa Spaceport`.

Only operational nodes are selectable. Systems, planets and landing-zone hierarchy nodes remain available for future maps and routing without being shown as false physical destinations.

### Unified mission operations

Cargo and non-cargo missions use one operation format. Cargo lots generate a pickup or collect operation plus a delivery that depends on that specific operation.

Operations may be grouped into one physical stop while retaining:

- mission id and title;
- cargo-lot id;
- commodity and SCU;
- pickup, collect or delivery type;
- dependency on the correct earlier operation.

This allows several Dead Saints contracts to share a stop without merging their contract identity.

## Checks

```bash
node --test tests/locations.test.js tests/missions.test.js
node --check locations.js
node --check missions.js
node --check app.js
```

Current result: 9 tests passing; all JavaScript files pass syntax checks.

## Next slice

Add a deterministic route-plan model that respects operation dependencies. Actual time, fuel and risk optimization will only use explicit, traceable data sources rather than invented values.
