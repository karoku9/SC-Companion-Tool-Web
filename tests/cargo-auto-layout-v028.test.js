'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('../locations.js');
const catalog = require('../ship-catalog.js');
const layout = require('../cargo-auto-layout-v028.js');

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

test('groups never share a floor cell and leave buffer where capacity allows', () => {
  const route = fixture();
  const model = catalog.getModel('drake-corsair');
  const result = layout.plan(route, model, { snapshotStopIndex: 0, mode: 'destination' });
  const owners = new Map();
  result.assignments.forEach((assignment) => {
    const existing = owners.get(assignment.floorId);
    if (existing) assert.equal(existing, assignment.groupKey, `Floor cell ${assignment.floorId} mixes cargo groups`);
    owners.set(assignment.floorId, assignment.groupKey);
  });
  assert.equal(result.leavesBufferSpace, true);
  assert.ok(result.bufferFloorCells > 0);
  assert.match(result.geometry.orientation, /row A/i);
});

test('mission mode keeps missions separate even with a shared destination', () => {
  const route = fixture();
  const model = catalog.getModel('drake-corsair');
  const result = layout.plan(route, model, { snapshotStopIndex: 0, mode: 'mission' });
  assert.equal(result.groups.length, 3);
  assert.ok(result.groups.every((group) => group.missionIds.length === 1));
});
