'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const locations = require('../locations.js');
const missionText = require('../mission-text.js');
const missions = require('../missions.js');
const routePlanner = require('../route-planner.js');
const corrections = require('../route-corrections.js');
const progressModel = require('../route-progress.js');
const cargoState = require('../cargo-state.js');

const example = `Mission A
collect teasa 2scu etam
deliver area18 2scu etam

Mission B
collect teasa 1scu neon
deliver baijini 1scu neon`;

function buildRoute() {
  const parsed = missionText.parseMissionText(example, locations);
  return routePlanner.buildRoute(parsed.missions, missions);
}

test('route stops expose stable identities and legacy progress migrates to ids', () => {
  const route = corrections.deriveRoute(buildRoute());
  assert.ok(route.stops.every((stop) => stop.id));
  const progress = progressModel.derive(route, null, 1);
  assert.deepEqual(progress.completedStopIds, [route.stops[0].id]);
  assert.equal(progress.currentStop.id, route.stops[1].id);
});

test('independent future deliveries can be reordered', () => {
  const route = buildRoute();
  const base = corrections.normalizeCorrections(route);
  const baijini = corrections.deriveRoute(route, base).allStops.find((stop) => stop.locationLabel.includes('Baijini'));
  const updated = corrections.changeOrder(route, base, baijini.id, -1, []);
  const effective = corrections.deriveRoute(route, updated);
  assert.deepEqual(effective.stops.map((stop) => stop.locationLabel), [
    'Teasa Spaceport · Lorville',
    'Baijini Point · ArcCorp',
    'Riker Memorial Spaceport · Area18'
  ]);
});

test('pickup dependencies prevent invalid reorder and skip', () => {
  const route = buildRoute();
  const effective = corrections.deriveRoute(route);
  const teasa = effective.allStops[0];
  const area18 = effective.allStops.find((stop) => stop.locationLabel.includes('Area18'));
  assert.throws(() => corrections.changeOrder(route, null, area18.id, -1, []), /must remain after/);
  assert.throws(() => corrections.setSkipped(route, null, teasa.id, true, []), /depends on skipped stop/);
});

test('terminal delivery can be skipped and its cargo remains onboard', () => {
  const route = buildRoute();
  const area18 = corrections.deriveRoute(route).allStops.find((stop) => stop.locationLabel.includes('Area18'));
  const changed = corrections.setSkipped(route, null, area18.id, true, []);
  const effective = corrections.deriveRoute(route, changed);
  assert.equal(effective.stops.some((stop) => stop.id === area18.id), false);

  const completed = effective.stops.map((stop) => stop.id);
  const lifecycle = cargoState.deriveCargoState(effective, completed, {});
  assert.equal(lifecycle.complete, true);
  assert.equal(lifecycle.totals.onboardScu, 2);
  assert.equal(lifecycle.totals.deliveredScu, 1);
});

test('completed stops are locked until PREVIOUS removes completion', () => {
  const route = buildRoute();
  const effective = corrections.deriveRoute(route);
  const first = effective.stops[0];
  assert.throws(() => corrections.setSkipped(route, null, first.id, true, [first.id]), /Completed stops cannot be skipped/);
  assert.throws(() => corrections.changeOrder(route, null, first.id, 1, [first.id]), /Completed stops cannot be moved/);
});

test('mandatory stop cannot be skipped and reset restores generated route', () => {
  const route = buildRoute();
  const area18 = corrections.deriveRoute(route).allStops.find((stop) => stop.locationLabel.includes('Area18'));
  const mandatory = corrections.setMandatory(route, null, area18.id, true);
  assert.throws(() => corrections.setSkipped(route, mandatory, area18.id, true, []), /Mandatory stops cannot be skipped/);
  assert.deepEqual(corrections.reset(route), corrections.normalizeCorrections(route));
});