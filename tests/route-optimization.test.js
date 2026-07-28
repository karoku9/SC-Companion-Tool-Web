'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const optimization = require('../route-optimization.js');

function operation(id, missionId, type, scu = 10) {
  return { id, missionId, lotId: missionId, type, scu, dependsOn: type === 'delivery' ? [`p-${missionId}`] : [] };
}

function stop(id, operations, locationId = id) {
  return { id, locationId, locationLabel: id, operations };
}

function candidate(stops, {
  minutes = 30,
  jumps = 0,
  exposure = 300,
  peak = 20,
  onboard = []
} = {}) {
  return {
    stops,
    legs: stops.map((item, index) => ({
      stop: item,
      onboardBeforeScu: onboard[index] ?? 10,
      onboardAfterScu: onboard[index] ?? 10
    })),
    midpoint: minutes,
    totalMin: minutes,
    totalMax: minutes,
    totalDistanceGm: minutes,
    totalJumpCount: jumps,
    stopCount: stops.length,
    peakOnboardScu: peak,
    exposureScuMinutes: exposure,
    effectiveCapacityScu: 72,
    capacityFeasible: peak <= 72
  };
}

function engineFor(results) {
  return {
    enumerateOrders: () => results.map((result) => result.stops),
    evaluateOrder: (order) => results.find((result) => result.stops === order)
  };
}

function context(profiles = {}) {
  return {
    cargoLotsByKey: new Map(),
    locationProfiles: {
      getProfile: (id) => profiles[id] ?? {
        risk: { level: 'guarded' },
        traffic: { level: 'normal' }
      }
    }
  };
}

test('Fastest selects the least travel time while Fewest Jumps is lexicographic', () => {
  const fast = candidate([stop('fast', [])], { minutes: 20, jumps: 2 });
  const lowJump = candidate([stop('low-jump', [])], { minutes: 24, jumps: 1 });
  const route = { stops: fast.stops, orders: [fast.stops, lowJump.stops] };
  assert.equal(optimization.optimize(route, context(), engineFor([fast, lowJump]), { strategy: 'fastest' }).recommended.result, fast);
  assert.equal(optimization.optimize(route, context(), engineFor([fast, lowJump]), { strategy: 'fewest-jumps' }).recommended.result, lowJump);
});

test('Complete Missions closes a whole mission earlier instead of choosing only by travel', () => {
  const early = candidate([
    stop('p-a', [operation('p-a', 'a', 'pickup')]),
    stop('d-a', [operation('d-a', 'a', 'delivery')]),
    stop('p-b', [operation('p-b', 'b', 'pickup')]),
    stop('d-b', [operation('d-b', 'b', 'delivery')])
  ], { minutes: 35 });
  const openBoth = candidate([
    stop('p-a-2', [operation('p-a', 'a', 'pickup')]),
    stop('p-b-2', [operation('p-b', 'b', 'pickup')]),
    stop('d-a-2', [operation('d-a', 'a', 'delivery')]),
    stop('d-b-2', [operation('d-b', 'b', 'delivery')])
  ], { minutes: 30 });
  const selected = optimization.optimize({ stops: early.stops }, context(), engineFor([early, openBoth]), { strategy: 'complete-missions' });
  assert.equal(selected.recommended.result, early);
  assert.equal(selected.recommended.metrics.firstMissionCompletedAtStep, 2);
});

test('Fewest Stops groups compatible work before jumps and time', () => {
  const grouped = candidate([stop('a', []), stop('b', [])], { minutes: 32, jumps: 1 });
  const scattered = candidate([stop('a1', []), stop('b1', []), stop('a2', [])], { minutes: 25, jumps: 0 });
  assert.equal(
    optimization.optimize({ stops: grouped.stops }, context(), engineFor([grouped, scattered]), { strategy: 'fewest-stops' }).recommended.result,
    grouped
  );
});

test('Safer Route reduces reviewed risk exposure when a valid alternative exists', () => {
  const riskyLoaded = candidate([stop('risk-first', [], 'risk'), stop('safe-last', [], 'safe')], { minutes: 25, onboard: [60, 5] });
  const safeLoaded = candidate([stop('safe-first', [], 'safe'), stop('risk-last', [], 'risk')], { minutes: 28, onboard: [60, 5] });
  const profiles = {
    risk: { risk: { level: 'extreme' }, traffic: { level: 'normal' } },
    safe: { risk: { level: 'low' }, traffic: { level: 'normal' } }
  };
  assert.equal(
    optimization.optimize({ stops: riskyLoaded.stops }, context(profiles), engineFor([riskyLoaded, safeLoaded]), { strategy: 'safer-route' }).recommended.result,
    safeLoaded
  );
});

test('Low Traffic never treats unknown as low and disables insufficient coverage', () => {
  const unknown = candidate([stop('unknown', [], 'unknown')], { minutes: 20 });
  const known = candidate([stop('known', [], 'known')], { minutes: 22 });
  const profiles = {
    unknown: { risk: { level: 'guarded' }, traffic: { level: 'unknown' } },
    known: { risk: { level: 'guarded' }, traffic: { level: 'low' } }
  };
  const result = optimization.optimize({ stops: unknown.stops }, context(profiles), engineFor([unknown, known]), { strategy: 'low-traffic' });
  assert.equal(result.availability.available, false);
  assert.equal(result.effectiveStrategy, 'balanced');
});

test('Cargo Turnover minimizes SCU-time and custom weights cannot normalize all-zero input', () => {
  const loadedLong = candidate([stop('long', [])], { minutes: 20, exposure: 900, peak: 60 });
  const deliveredEarly = candidate([stop('early', [])], { minutes: 24, exposure: 300, peak: 45 });
  assert.equal(
    optimization.optimize({ stops: loadedLong.stops }, context(), engineFor([loadedLong, deliveredEarly]), { strategy: 'cargo-turnover' }).recommended.result,
    deliveredEarly
  );
  const weights = optimization.normalizeWeights(Object.fromEntries(optimization.WEIGHT_KEYS.map((key) => [key, 0])));
  assert.ok(Object.values(weights.raw).some((value) => value > 0));
  assert.ok(Math.abs(Object.values(weights.normalized).reduce((sum, value) => sum + value, 0) - 1) < 0.000001);
});
