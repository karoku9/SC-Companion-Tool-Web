'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const planner = require('../cargo-planner.js');

const ship = {
  model: 'Test Ship',
  capacityScu: 72,
  layout: { rows: 8, columns: 9, accessPoints: ['rear'] }
};

function lot(id, missionId, scu, pickup, delivery) {
  return {
    id,
    missionId,
    commodity: id,
    scu,
    pickupType: 'collect',
    pickupLocationId: pickup,
    pickupLocationLabel: pickup,
    deliveryLocationId: delivery,
    deliveryLocationLabel: delivery
  };
}

function operation(id, missionId, lotId, type) {
  return {
    id,
    missionId,
    lotId,
    type,
    dependsOn: [],
    locationId: id,
    locationLabel: id
  };
}

test('cargo slots are reused when lots do not overlap onboard', () => {
  const route = {
    missions: [
      { id: 'a', title: 'A', cargoLots: [lot('lot-a', 'a', 60, 'p1', 'hub')] },
      { id: 'b', title: 'B', cargoLots: [lot('lot-b', 'b', 60, 'hub', 'd2')] }
    ],
    stops: [
      { operations: [operation('a-pick', 'a', 'lot-a', 'collect')] },
      { operations: [operation('a-deliver', 'a', 'lot-a', 'delivery'), operation('b-pick', 'b', 'lot-b', 'collect')] },
      { operations: [operation('b-deliver', 'b', 'lot-b', 'delivery')] }
    ]
  };
  route.stops[0].operations[0].locationId = 'p1';
  route.stops[1].operations[0].locationId = 'hub';
  route.stops[1].operations[1].locationId = 'hub';
  route.stops[2].operations[0].locationId = 'd2';

  const plan = planner.planCargo(route, ship);
  assert.equal(plan.usedScu, 120);
  assert.equal(plan.peakPlannedScu, 60);
  assert.equal(plan.assignments.filter((item) => item.cargoKey === 'a::lot-a')[0].planSlotIndex, 0);
  assert.equal(plan.assignments.filter((item) => item.cargoKey === 'b::lot-b')[0].planSlotIndex, 0);
});

test('off-grid allowance is explicit when simultaneous cargo exceeds the physical grid', () => {
  const route = {
    missions: [
      { id: 'a', title: 'A', cargoLots: [lot('lot-a', 'a', 80, 'p1', 'd1')] }
    ],
    stops: [
      { operations: [operation('a-pick', 'a', 'lot-a', 'collect')] },
      { operations: [operation('a-deliver', 'a', 'lot-a', 'delivery')] }
    ]
  };
  route.stops[0].operations[0].locationId = 'p1';
  route.stops[1].operations[0].locationId = 'd1';

  assert.throws(() => planner.planCargo(route, ship), /effective capacity/);
  const plan = planner.planCargo(route, { ...ship, offGridAllowanceScu: 8 });
  assert.equal(plan.effectiveCapacityScu, 80);
  assert.equal(plan.assignments.filter((item) => item.offGrid).length, 8);
});
