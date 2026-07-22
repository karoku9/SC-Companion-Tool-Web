'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../route-planner-engine.js');
const locations = require('../locations.js');
const profiles = require('../location-profiles.js');
const arrivals = require('../arrival-estimates.js');
const starmap = require('../starmap-data.js');

function operation(id, dependsOn = [], type = 'collect', scu = 1) {
  return Object.freeze({ id, dependsOn: Object.freeze(dependsOn), type, scu, missionId: 'mission', lotId: id });
}

function stop(id, locationId, locationLabel, operations, index) {
  return Object.freeze({ id, locationId, locationLabel, operations: Object.freeze(operations), baseIndex: index, orderIndex: index });
}

function route(stops) {
  return Object.freeze({ stops: Object.freeze(stops), allStops: Object.freeze(stops), missions: Object.freeze([]) });
}

const context = Object.freeze({ locations, locationProfiles: profiles, arrivalEstimates: arrivals, starmap, quantumTimeFactor: 1, startStop: null });

test('route planner enumerates only dependency-safe stop orders', () => {
  const pickup = stop('pickup', 'stanton-hurston-lorville-teasa', 'Teasa', [operation('pickup-op')], 0);
  const delivery = stop('delivery', 'stanton-arccorp-area18-riker', 'Area18', [operation('delivery-op', ['pickup-op'], 'delivery')], 1);
  const independent = stop('independent', 'stanton-arccorp-baijini', 'Baijini', [operation('independent-op')], 2);
  const orders = engine.enumerateOrders(route([pickup, delivery, independent]), [pickup, delivery, independent]);
  assert.equal(orders.length, 3);
  orders.forEach((order) => {
    const ids = order.map((item) => item.id);
    assert.ok(ids.indexOf('pickup') < ids.indexOf('delivery'));
  });
});

test('route planner exposes fastest and fewest-quantum profiles', () => {
  const stops = [
    stop('teasa', 'stanton-hurston-lorville-teasa', 'Teasa', [operation('a')], 0),
    stop('area18', 'stanton-arccorp-area18-riker', 'Area18', [operation('b')], 1),
    stop('baijini', 'stanton-arccorp-baijini', 'Baijini', [operation('c')], 2)
  ];
  const comparison = engine.compare(route(stops), { completedSet: new Set() }, context);
  assert.equal(comparison.candidateCount, 6);
  assert.deepEqual(comparison.profiles.map((profile) => profile.id), ['fastest', 'fewest-quantum']);
  comparison.profiles.forEach((profile) => {
    assert.equal(profile.result.stopCount, 3);
    assert.ok(profile.result.totalMin > 0);
    assert.ok(profile.result.totalMax >= profile.result.totalMin);
  });
});

test('completed stops stay locked outside future proposals', () => {
  const stops = [
    stop('teasa', 'stanton-hurston-lorville-teasa', 'Teasa', [operation('a')], 0),
    stop('area18', 'stanton-arccorp-area18-riker', 'Area18', [operation('b')], 1),
    stop('baijini', 'stanton-arccorp-baijini', 'Baijini', [operation('c')], 2)
  ];
  const comparison = engine.compare(route(stops), { completedSet: new Set(['teasa']) }, { ...context, startStop: stops[0] });
  assert.equal(comparison.lockedStops.length, 1);
  assert.equal(comparison.candidateCount, 2);
  comparison.profiles.forEach((profile) => assert.ok(profile.result.stops.every((item) => item.id !== 'teasa')));
});

test('ship quantum-time factor changes travel estimates but not route validity', () => {
  const from = stop('teasa', 'stanton-hurston-lorville-teasa', 'Teasa', [operation('a')], 0);
  const to = stop('area18', 'stanton-arccorp-area18-riker', 'Area18', [operation('b')], 1);
  const faster = engine.travelEstimate(from, to, { ...context, quantumTimeFactor: 0.75 });
  const slower = engine.travelEstimate(from, to, { ...context, quantumTimeFactor: 1.25 });
  assert.ok(faster.minMinutes < slower.minMinutes);
  assert.ok(faster.maxMinutes < slower.maxMinutes);
  assert.equal(faster.quantumLeg, slower.quantumLeg);
});

test('arrival estimates distinguish landing zones from orbital stations', () => {
  const teasa = stop('teasa', 'stanton-hurston-lorville-teasa', 'Teasa', [operation('a')], 0);
  const baijini = stop('baijini', 'stanton-arccorp-baijini', 'Baijini', [operation('b')], 1);
  const landing = engine.arrivalEstimate(teasa, context);
  const station = engine.arrivalEstimate(baijini, context);
  assert.match(landing.source, /landing-zone/);
  assert.match(station.source, /orbital-station/);
  assert.ok(landing.maxMinutes > station.maxMinutes);
});
