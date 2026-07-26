'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const locationRecords = new Map([
  ['start', { id: 'start', name: 'Starting Port' }],
  ['loc-a', { id: 'loc-a', name: 'End A' }],
  ['loc-b', { id: 'loc-b', name: 'End B' }],
  ['loc-c', { id: 'loc-c', name: 'End C' }]
]);

global.SCCompanionLocations = {
  getLocation(id) { return locationRecords.get(id) ?? null; },
  formatOperationalLabel(location) { return location.name; }
};

global.SCCompanionRoutePlanner = {
  buildRoute(missions, missionModel, options = {}) {
    const totalMinutes = missions.reduce((sum, mission) => sum + mission.testMinutes, 0);
    const totalScu = missions.reduce((sum, mission) => sum + mission.cargoLots.reduce((cargo, lot) => cargo + lot.scu, 0), 0);
    const stops = missions.map((mission, index) => Object.freeze({
      id: `stop-${mission.id}`,
      index,
      locationId: `loc-${mission.id}`,
      locationLabel: `End ${mission.id.toUpperCase()}`,
      operations: Object.freeze([])
    }));
    const gatewaySegments = missions.some((mission) => mission.gateway)
      ? Object.freeze([{ stopId: stops.at(-1).id, label: 'Stanton Gateway → Pyro Gateway' }])
      : Object.freeze([]);
    return Object.freeze({
      missions: Object.freeze(missions),
      stops: Object.freeze(stops),
      allStops: Object.freeze(stops),
      totalCargoScu: totalScu,
      gatewaySegments,
      optimization: Object.freeze({ startLocationId: options.startLocationId, capacityFeasible: true }),
      estimate: Object.freeze({
        totalMin: totalMinutes,
        totalMax: totalMinutes + 10,
        midpoint: totalMinutes,
        peakOnboardScu: totalScu,
        totalJumpCount: gatewaySegments.length,
        capacityFeasible: true
      })
    });
  }
};

const planner = require('../route-session-planner.js');

function mission(id, minutes, scu, gateway = false) {
  return Object.freeze({
    id,
    title: `Mission ${id.toUpperCase()}`,
    rewardAuec: minutes * 1000,
    testMinutes: minutes,
    gateway,
    cargoLots: Object.freeze([{ id: `lot-${id}`, scu }])
  });
}

const missions = Object.freeze([
  mission('a', 25, 10),
  mission('b', 25, 12),
  mission('c', 50, 18, true)
]);

test('current location is mandatory for every route mode', () => {
  assert.throws(
    () => planner.plan(missions, {}, { targetMinutes: 60, mode: 'sessions' }),
    /Select your current location/i
  );
  assert.throws(
    () => planner.plan(missions, {}, { targetMinutes: 60, mode: 'fastest' }),
    /Select your current location/i
  );
});

test('safe sessions keep missions whole and include every mission exactly once', () => {
  const plan = planner.plan(missions, {}, {
    startLocationId: 'start',
    targetMinutes: 60,
    mode: 'sessions'
  });

  assert.equal(plan.mode, 'sessions');
  assert.equal(plan.startLocationLabel, 'Starting Port');
  assert.equal(plan.sessions.length, 2);

  const flattened = plan.sessions.flatMap((session) => session.missionIds);
  assert.deepEqual([...flattened].sort(), ['a', 'b', 'c']);
  assert.equal(new Set(flattened).size, missions.length);
  missions.forEach((item) => assert.equal(flattened.filter((id) => id === item.id).length, 1));

  assert.ok(plan.sessions.every((session) => session.missionIds.length === session.missionCount));
  assert.equal(plan.sessions[1].startLocationId, plan.sessions[0].endLocationId);
  assert.ok(plan.sessions.some((session) => session.gatewaySegments.length === 1));
  assert.equal(plan.sessions.reduce((sum, session) => sum + session.totalCargoScu, 0), 40);
  assert.equal(plan.sessions.reduce((sum, session) => sum + session.rewardAuec, 0), 100000);
});

test('fastest mode keeps the full mission set in one route', () => {
  const plan = planner.plan(missions, {}, {
    startLocationId: 'start',
    targetMinutes: 60,
    mode: 'fastest'
  });

  assert.equal(plan.mode, 'fastest');
  assert.equal(plan.sessions.length, 1);
  assert.deepEqual(plan.sessions[0].missionIds, ['a', 'b', 'c']);
  assert.equal(plan.sessions[0].startLocationId, 'start');
  assert.equal(plan.sessions[0].route.optimization.startLocationId, 'start');
  assert.equal(plan.sessions[0].gatewaySegments.length, 1);
});