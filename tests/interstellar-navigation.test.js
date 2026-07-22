'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const official = require('../official-universe-data.js');
const locations = require('../locations.js');
const starmap = require('../starmap-data.js');
const navigation = require('../navigation-estimates.js');
const missionText = require('../mission-text.js');
const missions = require('../missions.js');
const engine = require('../route-planner-engine.js');

const sample = `Mission A — Stanton to Pyro and Nyx
collect area18 12scu etam
deliver checkmate station pyro 5scu etam
deliver levski nyx 7scu etam

Mission B — Outer Systems Consolidation
pickup ruin station pyro 4scu neon
pickup orbituary pyro 6scu neon
pickup levski nyx 3scu titanium
deliver teasa 10scu neon 3scu titanium

Mission C — Three-System Relay
collect teasa 8scu processedfood
collect checkmate station pyro 5scu medicalsupplies
collect levski nyx 6scu titanium
deliver ruin station pyro 4scu processedfood 5scu medicalsupplies
deliver area18 4scu processedfood 2scu titanium
deliver orbituary pyro 4scu titanium`;

test('official snapshot identifies the current verified release boundary', () => {
  assert.equal(official.snapshot.gameVersion, 'Alpha 4.9.x');
  assert.equal(official.snapshot.verifiedAt, '2026-07-22');
  assert.equal(official.snapshot.liveData, false);
  assert.match(official.snapshot.note, /not live shard telemetry/i);
});

test('interstellar mission aliases resolve to registered operational locations', () => {
  const parsed = missionText.parseMissionText(sample, locations);
  assert.equal(parsed.missions.length, 3);
  const ids = parsed.missions.flatMap((mission) => mission.cargoLots.flatMap((lot) => [lot.pickupLocationId, lot.deliveryLocationId]));
  ['pyro-monox-checkmate', 'pyro-bloom-orbituary', 'pyro-terminus-ruin', 'nyx-delamar-levski'].forEach((id) => assert.ok(ids.includes(id), `missing ${id}`));
  assert.ok(ids.every((id) => !id.startsWith('custom-')), `unexpected custom location: ${ids.find((id) => id.startsWith('custom-'))}`);
  assert.equal(locations.getSystemForLocation('pyro-monox-checkmate').id, 'pyro');
  assert.equal(locations.getSystemForLocation('nyx-delamar-levski').id, 'nyx');
});

test('current jump topology supports Stanton, Pyro and Nyx paths', () => {
  const stantonPyro = navigation.findSystemPath('stanton', 'pyro');
  const pyroNyx = navigation.findSystemPath('pyro', 'nyx');
  const stantonNyx = navigation.findSystemPath('stanton', 'nyx');
  assert.deepEqual(stantonPyro.systems, ['stanton', 'pyro']);
  assert.deepEqual(pyroNyx.systems, ['pyro', 'nyx']);
  assert.deepEqual(stantonNyx.systems, ['stanton', 'nyx']);
  assert.equal(stantonNyx.connections[0].status, 'active-placeholder');
});

test('distance and navigation estimates keep jump tunnels separate from kilometres', () => {
  const estimate = navigation.estimateLeg('stanton-arccorp-area18-riker', 'pyro-monox-checkmate', { quantumTimeFactor: 1 });
  assert.equal(estimate.jumpCount, 1);
  assert.match(estimate.distanceLabel, /local quantum \+ 1 jump/);
  assert.ok(estimate.distanceGm > 0);
  assert.ok(estimate.maxMinutes > estimate.minMinutes);
  assert.match(estimate.source, /Official jump topology/);
  assert.doesNotMatch(estimate.distanceLabel, /jump.*km/i);
});

test('ship quantum factor changes time but not route distance or jump count', () => {
  const normal = navigation.estimateLeg('pyro-monox-checkmate', 'nyx-delamar-levski', { quantumTimeFactor: 1 });
  const faster = navigation.estimateLeg('pyro-monox-checkmate', 'nyx-delamar-levski', { quantumTimeFactor: 0.75 });
  assert.equal(faster.distanceGm, normal.distanceGm);
  assert.equal(faster.jumpCount, normal.jumpCount);
  assert.ok(faster.minMinutes < normal.minMinutes);
  assert.ok(faster.maxMinutes < normal.maxMinutes);
});

test('route planner aggregates interstellar distance and jumps', () => {
  const parsed = missionText.parseMissionText(sample, locations);
  const operations = missions.buildOperations(parsed.missions, locations);
  const stops = missions.groupOperationsByLocation(operations, locations);
  const result = engine.evaluateOrder(stops, {
    locations,
    starmap,
    navigationEstimates: navigation,
    quantumTimeFactor: 1,
    physicalCapacityScu: 72,
    offGridAllowanceScu: 0,
    cargoLotsByKey: new Map()
  });
  assert.ok(result.totalDistanceGm > 0);
  assert.ok(result.totalJumpCount >= 2);
  assert.ok(result.legs.some((leg) => leg.travel.jumpCount > 0));
  assert.ok(result.legs.every((leg) => 'distanceLabel' in leg.travel));
});
