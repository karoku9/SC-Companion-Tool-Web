'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const records = new Map([
  ['hurston-start', { id: 'hurston-start', anchor: { systemId: 'stanton', bodyId: 'hurston' } }],
  ['hurston-a', { id: 'hurston-a', anchor: { systemId: 'stanton', bodyId: 'hurston' } }],
  ['hurston-b', { id: 'hurston-b', anchor: { systemId: 'stanton', bodyId: 'hurston' } }],
  ['area18', { id: 'area18', anchor: { systemId: 'stanton', bodyId: 'arccorp' } }]
]);

function makeStop(id, order) {
  return Object.freeze({ id, locationId: id, locationLabel: id, orderIndex: order, baseIndex: order, operations: Object.freeze([]) });
}

const hurstonA = makeStop('hurston-a', 0);
const area18 = makeStop('area18', 1);
const hurstonB = makeStop('hurston-b', 2);
const badOrder = Object.freeze([hurstonA, area18, hurstonB]);
const groupedOrder = Object.freeze([hurstonA, hurstonB, area18]);

const locations = {
  getLocation(id) { return records.get(id) ?? null; },
  getSystemForLocation(id) { return records.has(id) ? { id: 'stanton' } : null; }
};

function evaluateOrder(stops) {
  const grouped = stops.map((item) => item.locationId).join('|') === 'hurston-a|hurston-b|area18';
  return Object.freeze({
    stops: Object.freeze(stops), legs: Object.freeze([]),
    totalMin: grouped ? 12 : 10, totalMax: grouped ? 16 : 14, midpoint: grouped ? 14 : 12,
    totalJumpCount: 0, missionCompletionScore: 0, exposureScuMinutes: 0,
    capacityFeasible: true, peakOnboardScu: 0
  });
}

global.SCCompanionRoutePlannerEngine = {
  enumerateOrders() { return [badOrder, groupedOrder]; },
  evaluateOrder,
  travelEstimate(from, to) {
    const sameBody = from && records.get(from.locationId)?.anchor.bodyId === records.get(to.locationId)?.anchor.bodyId;
    return { minMinutes: sameBody ? 1 : 4, maxMinutes: sameBody ? 2 : 6, jumpCount: 0 };
  }
};

global.SCCompanionRoutePlanner = {
  focusedOptimization: true,
  buildRoute() { return null; },
  comparisonContext() {
    return {
      locations,
      starmap: null,
      cargoLotsByKey: new Map(),
      physicalCapacityScu: 72,
      offGridAllowanceScu: 0,
      initialOnboardLots: [],
      startStop: makeStop('hurston-start', -1)
    };
  }
};

global.SCCompanionStarmapData = { systems: [{ id: 'stanton', name: 'Stanton' }] };

const optimizer = require('../route-locality-hotfix-v0294.js');
const route = Object.freeze({
  missions: Object.freeze([]), stops: badOrder, allStops: badOrder,
  estimate: evaluateOrder(badOrder), gatewaySegments: Object.freeze([]),
  optimization: Object.freeze({ strategy: 'phase-safe-fastest' })
});

test('same-planet work is grouped before another planet', () => {
  const improved = optimizer.improveLocality(route);
  assert.deepEqual(improved.stops.map((item) => item.locationId), ['hurston-a', 'hurston-b', 'area18']);
  assert.equal(improved.optimization.localityRevisitCountBefore, 1);
  assert.equal(improved.optimization.localityRevisitCount, 0);
});

test('locality metrics detect planet backtracking', () => {
  const context = global.SCCompanionRoutePlanner.comparisonContext(route);
  assert.deepEqual(optimizer.localityMetrics(badOrder, context), { switches: 2, revisits: 1 });
  assert.deepEqual(optimizer.localityMetrics(groupedOrder, context), { switches: 1, revisits: 0 });
});

test('greedy candidate stays on Hurston before Area18', () => {
  const context = global.SCCompanionRoutePlanner.comparisonContext(route);
  assert.deepEqual(optimizer.localityStickyOrder(route, context).map((item) => item.locationId), ['hurston-a', 'hurston-b', 'area18']);
});
