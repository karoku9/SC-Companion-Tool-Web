'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('../locations.js');
const catalog = require('../ship-catalog.js');
require('../cargo-auto-layout-v028.js');
const layout = require('../cargo-auto-layout-v0292.js');

function lot(id, missionId, deliveryLocationId, deliveryLocationLabel, scu) {
  return Object.freeze({
    id,
    pickupType: 'collect',
    pickupLocationId: 'pickup',
    pickupLocationLabel: 'Pickup',
    deliveryLocationId,
    deliveryLocationLabel,
    commodity: 'Test cargo',
    scu
  });
}

function fixture() {
  const missions = Object.freeze([
    Object.freeze({ id: 'mission-red', title: 'Early Grim delivery', cargoLots: Object.freeze([lot('lot-red', 'mission-red', 'grim', 'Grim HEX', 6)]) }),
    Object.freeze({ id: 'mission-blue', title: 'Later Rustville delivery', cargoLots: Object.freeze([lot('lot-blue', 'mission-blue', 'rustville', 'Rustville', 6)]) }),
    Object.freeze({ id: 'mission-green', title: 'Shared Grim destination', cargoLots: Object.freeze([lot('lot-green', 'mission-green', 'grim', 'Grim HEX', 2)]) })
  ]);
  const pickupOperations = missions.flatMap((mission) => mission.cargoLots.map((cargo) => Object.freeze({
    id: `pickup-${cargo.id}`,
    type: 'collect',
    missionId: mission.id,
    lotId: cargo.id,
    locationId: 'pickup',
    scu: cargo.scu
  })));
  const grimOperations = Object.freeze([
    Object.freeze({ id: 'deliver-red', type: 'delivery', missionId: 'mission-red', lotId: 'lot-red', locationId: 'grim', scu: 6 }),
    Object.freeze({ id: 'deliver-green', type: 'delivery', missionId: 'mission-green', lotId: 'lot-green', locationId: 'grim', scu: 2 })
  ]);
  const rustvilleOperations = Object.freeze([
    Object.freeze({ id: 'deliver-blue', type: 'delivery', missionId: 'mission-blue', lotId: 'lot-blue', locationId: 'rustville', scu: 6 })
  ]);
  return Object.freeze({
    missions,
    stops: Object.freeze([
      Object.freeze({ id: 'pickup-stop', locationId: 'pickup', operations: Object.freeze(pickupOperations) }),
      Object.freeze({ id: 'grim-stop', locationId: 'grim', operations: grimOperations }),
      Object.freeze({ id: 'rustville-stop', locationId: 'rustville', operations: rustvilleOperations })
    ])
  });
}

function twoDestinationFixture(redScu = 26, blueScu = 24) {
  const missions = Object.freeze([
    Object.freeze({ id: 'red', title: 'Grim HEX cargo', cargoLots: Object.freeze([lot('red-lot', 'red', 'grim', 'Grim HEX', redScu)]) }),
    Object.freeze({ id: 'blue', title: 'Rustville cargo', cargoLots: Object.freeze([lot('blue-lot', 'blue', 'rustville', 'Rustville', blueScu)]) })
  ]);
  return Object.freeze({
    missions,
    stops: Object.freeze([
      Object.freeze({
        id: 'pickup',
        locationId: 'pickup',
        operations: Object.freeze([
          Object.freeze({ id: 'pickup-red', type: 'collect', missionId: 'red', lotId: 'red-lot', locationId: 'pickup', scu: redScu }),
          Object.freeze({ id: 'pickup-blue', type: 'collect', missionId: 'blue', lotId: 'blue-lot', locationId: 'pickup', scu: blueScu })
        ])
      }),
      Object.freeze({ id: 'grim', locationId: 'grim', operations: Object.freeze([Object.freeze({ id: 'drop-red', type: 'delivery', missionId: 'red', lotId: 'red-lot', locationId: 'grim', scu: redScu })]) }),
      Object.freeze({ id: 'rustville', locationId: 'rustville', operations: Object.freeze([Object.freeze({ id: 'drop-blue', type: 'delivery', missionId: 'blue', lotId: 'blue-lot', locationId: 'rustville', scu: blueScu })]) })
    ])
  });
}

test('destination grouping merges lots with the same drop-off', () => {
  const route = fixture();
  const model = catalog.getModel('drake-corsair');
  const result = layout.plan(route, model, { snapshotStopIndex: 0, mode: 'destination' });

  assert.equal(result.groups.length, 2);
  assert.equal(result.usedScu, 14);
  assert.equal(result.freeScu, 58);
  const grim = result.groups.find((group) => group.destinationLocationId === 'grim');
  const rustville = result.groups.find((group) => group.destinationLocationId === 'rustville');
  assert.ok(grim);
  assert.ok(rustville);
  assert.equal(grim.scu, 8);
  assert.equal(grim.missionIds.length, 2);
  assert.equal(grim.unloadOrder, 1);
  assert.equal(rustville.unloadOrder, 2);
  assert.ok(grim.averageDepth <= rustville.averageDepth, `Earlier drop must remain at least as accessible: ${grim.averageDepth} vs ${rustville.averageDepth}`);
});

test('groups never share a floor cell and preserve destination separation', () => {
  const route = fixture();
  const model = catalog.getModel('drake-corsair');
  const result = layout.plan(route, model, { snapshotStopIndex: 0, mode: 'destination' });
  const owners = new Map();
  result.assignments.forEach((assignment) => {
    const existing = owners.get(assignment.floorId);
    if (existing) assert.equal(existing, assignment.groupKey, `Floor cell ${assignment.floorId} mixes cargo groups`);
    owners.set(assignment.floorId, assignment.groupKey);
  });
  assert.equal(result.separationMode, 'left-right-first');
  assert.match(result.geometry.orientation, /row A/i);
});

test('Corsair packs two large destinations into compact left and right zones', () => {
  const route = twoDestinationFixture();
  const model = catalog.getModel('drake-corsair');
  const result = layout.plan(route, model, { snapshotStopIndex: 0, mode: 'destination' });
  const red = result.groups.find((group) => group.destinationLocationId === 'grim');
  const blue = result.groups.find((group) => group.destinationLocationId === 'rustville');
  assert.equal(red.side, 'left');
  assert.equal(blue.side, 'right');

  const redCells = result.floorCells.filter((cell) => cell.groupKey === red.key);
  const blueCells = result.floorCells.filter((cell) => cell.groupKey === blue.key);
  assert.ok(redCells.every((cell) => cell.column <= 1), `Red cargo escaped the left zone: ${redCells.map((cell) => cell.coordinate).join(', ')}`);
  assert.ok(blueCells.every((cell) => cell.column >= 2), `Blue cargo escaped the right zone: ${blueCells.map((cell) => cell.coordinate).join(', ')}`);

  const compactPrefix = (cells, columns) => {
    const ordered = [];
    for (let row = 0; row < 6; row += 1) columns.forEach((column) => ordered.push(`${row}:${column}`));
    const occupied = new Set(cells.map((cell) => cell.id));
    const first = Math.min(...cells.map((cell) => ordered.indexOf(cell.id)));
    const last = Math.max(...cells.map((cell) => ordered.indexOf(cell.id)));
    return ordered.slice(first, last + 1).every((id) => occupied.has(id));
  };

  assert.equal(compactPrefix(redCells, [0, 1]), true, `Red cargo has holes: ${redCells.map((cell) => cell.coordinate).join(', ')}`);
  assert.equal(compactPrefix(blueCells, [3, 2]), true, `Blue cargo has holes: ${blueCells.map((cell) => cell.coordinate).join(', ')}`);
  assert.ok(red.averageDepth <= blue.averageDepth, `Later blue cargo should remain deeper: ${red.averageDepth} vs ${blue.averageDepth}`);
});

test('mission mode keeps missions separate even with a shared destination', () => {
  const route = fixture();
  const model = catalog.getModel('drake-corsair');
  const result = layout.plan(route, model, { snapshotStopIndex: 0, mode: 'mission' });
  assert.equal(result.groups.length, 3);
  assert.ok(result.groups.every((group) => group.missionIds.length === 1));
});
