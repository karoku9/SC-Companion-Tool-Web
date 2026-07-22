'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../route-planner-engine.js');

function operation(id, options = {}) {
  return Object.freeze({
    id,
    dependsOn: Object.freeze(options.dependsOn ?? []),
    type: options.type ?? 'collect',
    scu: options.scu ?? 1,
    missionId: options.missionId ?? 'mission',
    lotId: options.lotId ?? id,
    commodity: options.commodity ?? 'cargo'
  });
}

function stop(id, locationId, operations, index) {
  return Object.freeze({
    id,
    locationId,
    locationLabel: id,
    operations: Object.freeze(operations),
    baseIndex: index,
    orderIndex: index
  });
}

function route(stops) {
  return Object.freeze({ stops: Object.freeze(stops), allStops: Object.freeze(stops), missions: Object.freeze([]) });
}

const simpleContext = Object.freeze({
  locations: { getLocation: () => ({ type: 'orbital-station' }) },
  locationProfiles: { getProfile: () => null },
  arrivalEstimates: { presets: {}, estimateArrival: () => ({ minMinutes: 1, maxMinutes: 1 }) },
  starmap: null,
  quantumTimeFactor: 1,
  physicalCapacityScu: 100,
  offGridAllowanceScu: 0,
  startStop: null
});

test('route planner enumerates only dependency-safe stop orders', () => {
  const pickup = stop('pickup', 'pickup-location', [operation('pickup-op')], 0);
  const delivery = stop('delivery', 'delivery-location', [operation('delivery-op', { dependsOn: ['pickup-op'], type: 'delivery' })], 1);
  const independent = stop('independent', 'independent-location', [operation('independent-op')], 2);
  const orders = engine.enumerateOrders(route([pickup, delivery, independent]), [pickup, delivery, independent]);
  assert.equal(orders.length, 3);
  orders.forEach((order) => {
    const ids = order.map((item) => item.id);
    assert.ok(ids.indexOf('pickup') < ids.indexOf('delivery'));
  });
});

test('route planner exposes fastest and minimum-onboard profiles', () => {
  const stops = [
    stop('a', 'a', [operation('a')], 0),
    stop('b', 'b', [operation('b')], 1),
    stop('c', 'c', [operation('c')], 2)
  ];
  const comparison = engine.compare(route(stops), { completedSet: new Set() }, simpleContext);
  assert.equal(comparison.candidateCount, 6);
  assert.deepEqual(comparison.profiles.map((profile) => profile.id), ['fastest', 'min-onboard']);
});

test('minimum-onboard can choose a different route than fastest', () => {
  const deliveryA = stop('deliver-a', 'far', [
    operation('deliver-a-op', { type: 'delivery', missionId: 'mission-a', lotId: 'lot-a', scu: 50 })
  ], 0);
  const pickupB = stop('pickup-b', 'near', [
    operation('pickup-b-op', { missionId: 'mission-b', lotId: 'lot-b', scu: 40 })
  ], 1);
  const anchors = {
    start: { position: [0, 0, 0], systemId: 's', bodyId: 'b' },
    near: { position: [1, 0, 0], systemId: 's', bodyId: 'b' },
    far: { position: [40, 0, 0], systemId: 's', bodyId: 'b' }
  };
  const context = {
    ...simpleContext,
    starmap: { getLocationAnchor: (id) => anchors[id] ?? null },
    startStop: { locationId: 'start' },
    initialOnboardLots: [{ key: 'mission-a::lot-a', missionId: 'mission-a', lotId: 'lot-a', scu: 50 }]
  };
  const comparison = engine.compare(route([deliveryA, pickupB]), { completedSet: new Set() }, context);
  const fastest = comparison.profiles.find((profile) => profile.id === 'fastest').result;
  const minOnboard = comparison.profiles.find((profile) => profile.id === 'min-onboard').result;
  assert.equal(fastest.stops[0].id, 'pickup-b');
  assert.equal(minOnboard.stops[0].id, 'deliver-a');
  assert.ok(fastest.peakOnboardScu > minOnboard.peakOnboardScu);
});

test('cargo protection uses the delay margin to deliver loaded missions sooner', () => {
  const deliveryA = stop('deliver-a', 'far', [
    operation('deliver-a-op', { type: 'delivery', missionId: 'mission-a', lotId: 'lot-a', scu: 50 })
  ], 0);
  const pickupB = stop('pickup-b', 'near', [
    operation('pickup-b-op', { missionId: 'mission-b', lotId: 'lot-b', scu: 40 })
  ], 1);
  const anchors = {
    start: { position: [0, 0, 0], systemId: 's', bodyId: 'b' },
    near: { position: [1, 0, 0], systemId: 's', bodyId: 'b' },
    far: { position: [40, 0, 0], systemId: 's', bodyId: 'b' }
  };
  const baseContext = {
    ...simpleContext,
    starmap: { getLocationAnchor: (id) => anchors[id] ?? null },
    startStop: { locationId: 'start' },
    initialOnboardLots: [{ key: 'mission-a::lot-a', missionId: 'mission-a', lotId: 'lot-a', scu: 50 }]
  };
  const pure = engine.compare(route([deliveryA, pickupB]), { completedSet: new Set() }, baseContext);
  const protectedResult = engine.compare(route([deliveryA, pickupB]), { completedSet: new Set() }, {
    ...baseContext,
    cargoSafetyEnabled: true,
    safetyMarginMinutes: 100
  });
  assert.equal(pure.profiles[0].result.stops[0].id, 'pickup-b');
  assert.equal(protectedResult.profiles[0].result.stops[0].id, 'deliver-a');
  assert.equal(protectedResult.profiles[0].safetyAdjusted, true);
});

test('capacity removes impossible candidates and off-grid allowance restores them', () => {
  const pickup = stop('pickup', 'pickup', [
    operation('pickup-op', { missionId: 'm', lotId: 'lot', scu: 80 })
  ], 0);
  const delivery = stop('delivery', 'delivery', [
    operation('delivery-op', { dependsOn: ['pickup-op'], type: 'delivery', missionId: 'm', lotId: 'lot', scu: 80 })
  ], 1);
  const noOverride = engine.compare(route([pickup, delivery]), { completedSet: new Set() }, {
    ...simpleContext,
    physicalCapacityScu: 72
  });
  assert.equal(noOverride.feasibleCandidateCount, 0);
  assert.equal(noOverride.minimumRequiredCapacityScu, 80);

  const withOverride = engine.compare(route([pickup, delivery]), { completedSet: new Set() }, {
    ...simpleContext,
    physicalCapacityScu: 72,
    offGridAllowanceScu: 8
  });
  assert.equal(withOverride.feasibleCandidateCount, 1);
  assert.equal(withOverride.profiles[0].result.effectiveCapacityScu, 80);
});

test('completed stops stay locked outside future proposals', () => {
  const stops = [
    stop('a', 'a', [operation('a')], 0),
    stop('b', 'b', [operation('b')], 1),
    stop('c', 'c', [operation('c')], 2)
  ];
  const comparison = engine.compare(route(stops), { completedSet: new Set(['a']) }, { ...simpleContext, startStop: stops[0] });
  assert.equal(comparison.lockedStops.length, 1);
  assert.equal(comparison.candidateCount, 2);
  comparison.profiles.forEach((profile) => assert.ok(profile.result.stops.every((item) => item.id !== 'a')));
});

test('ship quantum-time factor changes travel estimates but not transition count', () => {
  const from = stop('from', 'from', [operation('a')], 0);
  const to = stop('to', 'to', [operation('b')], 1);
  const starmap = {
    getLocationAnchor(id) {
      return id === 'from'
        ? { position: [0, 0, 0], systemId: 's', bodyId: 'a' }
        : { position: [20, 0, 0], systemId: 's', bodyId: 'b' };
    }
  };
  const faster = engine.travelEstimate(from, to, { ...simpleContext, starmap, quantumTimeFactor: 0.75 });
  const slower = engine.travelEstimate(from, to, { ...simpleContext, starmap, quantumTimeFactor: 1.25 });
  assert.ok(faster.minMinutes < slower.minMinutes);
  assert.ok(faster.maxMinutes < slower.maxMinutes);
  assert.equal(faster.quantumLeg, slower.quantumLeg);
});
