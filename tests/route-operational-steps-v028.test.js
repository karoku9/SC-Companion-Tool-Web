'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const baseLocations = require('../locations.js');
global.SCCompanionLocations = baseLocations;
const locations = require('../location-field-registry.js');
global.SCCompanionLocations = locations;
require('../starmap-data.js');
require('../official-universe-data.js');
require('../navigation-estimates.js');
require('../route-progress.js');
const operational = require('../route-operational-steps-v028.js');

function destination(query) {
  const match = locations.searchOperationalLocations(query, { limit: 1 })[0];
  assert.ok(match, `Missing operational location: ${query}`);
  return match;
}

function routeFixture() {
  const fallow = destination('Fallow Field');
  const grim = destination('Grim HEX');
  const operation = Object.freeze({
    id: 'delivery-1',
    type: 'delivery',
    missionId: 'mission-1',
    missionTitle: 'Gateway delivery',
    lotId: 'lot-1',
    scu: 4,
    commodity: 'Neon',
    locationId: grim.id,
    locationLabel: locations.formatOperationalLabel(grim),
    dependsOn: Object.freeze([])
  });
  const stop = Object.freeze({
    id: `stop-0-${grim.id}`,
    index: 0,
    locationId: grim.id,
    locationLabel: locations.formatOperationalLabel(grim),
    operations: Object.freeze([operation])
  });
  return Object.freeze({
    missions: Object.freeze([]),
    stops: Object.freeze([stop]),
    allStops: Object.freeze([stop]),
    optimization: Object.freeze({ startLocationId: fallow.id, startLocationLabel: locations.formatOperationalLabel(fallow) }),
    gatewaySegments: Object.freeze([Object.freeze({
      legIndex: 0,
      stopId: stop.id,
      connectionId: 'stanton-pyro',
      fromSystemId: 'pyro',
      toSystemId: 'stanton',
      fromGateway: 'Stanton Gateway',
      toGateway: 'Pyro Gateway',
      label: 'Stanton Gateway → Pyro Gateway'
    })])
  });
}

test('inter-system legs become navigable gateway steps', () => {
  const route = routeFixture();
  const built = operational.build(route, {
    startLocationId: route.optimization.startLocationId,
    startLocationLabel: route.optimization.startLocationLabel
  });

  assert.deepEqual(built.steps.map((step) => step.kind), ['gateway-approach', 'jump', 'travel', 'action']);
  assert.match(built.steps[0].title, /Travel to Stanton Gateway/i);
  assert.match(built.steps[1].title, /Jump to Pyro Gateway/i);
  assert.match(built.steps[2].title, /Fly to Grim HEX/i);
  assert.match(built.steps[3].title, /Drop 4 SCU/i);
  assert.equal(built.steps[0].from.systemName, 'Pyro');
  assert.equal(built.steps[1].to.systemName, 'Stanton');
  assert.equal(built.steps[2].to.systemName, 'Stanton');
});

test('travel progress does not complete cargo stops before the action step', () => {
  const route = routeFixture();
  let state = {
    routeStartLocationId: route.optimization.startLocationId,
    routeStartLocationLabel: route.optimization.startLocationLabel,
    completedStopIds: [],
    currentStopIndex: 0,
    completedOperationalStepIds: []
  };

  let progress = operational.derive(route, state);
  assert.equal(progress.currentStep.kind, 'gateway-approach');

  state = { ...state, ...operational.completeCurrent(route, state) };
  assert.deepEqual(state.completedStopIds, []);
  assert.equal(operational.derive(route, state).currentStep.kind, 'jump');

  state = { ...state, ...operational.completeCurrent(route, state) };
  assert.deepEqual(state.completedStopIds, []);
  assert.equal(operational.derive(route, state).currentStep.kind, 'travel');

  state = { ...state, ...operational.completeCurrent(route, state) };
  assert.deepEqual(state.completedStopIds, []);
  assert.equal(operational.derive(route, state).currentStep.kind, 'action');

  state = { ...state, ...operational.completeCurrent(route, state) };
  assert.equal(state.completedStopIds.length, 1);
  progress = operational.derive(route, state);
  assert.equal(progress.complete, true);
});
