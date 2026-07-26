'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const locations = require('../location-contract-extension.js');
const validator = require('../mission-validation-rich.js');
const missionModel = require('../missions-rich.js');
const routePlanner = require('../route-planner.js');

const sevenMissions = `Mission 1
collect attritus paf-iii 10scu dcsr2
deliver grim hex 10scu dcsr2

Mission 2
collect vivere paf-iii + attritus paf-ii 5scu hydrogen totale
deliver grim hex 5scu hydrogen

Mission 3
collect vivere olp 3scu medical supplies
deliver grim hex 3scu medical supplies

Mission 4
collect cru-l4 shallow fields 32scu revenant tree pollen 8scu neon 4scu slam 4scu e'tam
deliver rustville 16scu revenant tree pollen 8scu neon
deliver fallow field 16scu revenant tree pollen 4scu slam 4scu e'tam

Mission 5
collect teasa spaceport 4scu cryopod
deliver shepherd's rest 4scu cryopod

Mission 6
collect grim hex 2scu e'tam 2scu slam 2scu neon
deliver rustville 2scu e'tam
deliver ashland 1scu slam 1scu neon
deliver last landings 1scu slam 1scu neon

Mission 7
collect reclamation & disposal orinth 4scu e'tam
collect fallow field 2scu slam 2scu neon
deliver grim hex 4scu e'tam 2scu slam 2scu neon`;

test('contract registry resolves the destinations used by real hauling text', () => {
  [
    'attritus paf-iii', 'vivere paf-iii', 'attritus paf-ii', 'vivere olp',
    'rustville', 'fallow field', "shepherd's rest", 'ashland', 'last landings',
    'reclamation & disposal orinth'
  ].forEach((name) => {
    const result = locations.searchOperationalLocations(name, { limit: 3 });
    assert.equal(result.length, 1, `${name} should resolve exactly once`);
  });
  assert.deepEqual(locations.validation.errors, []);
});

test('seven pasted missions parse without losing multi-word commodities', () => {
  const report = validator.inspectMissionText(sevenMissions, locations);
  assert.equal(report.blockingIssues.length, 0, report.blockingIssues.map((item) => item.message).join('\n'));
  assert.equal(report.missions.length, 7);
  assert.equal(report.ready, true);
  const commodities = new Set(report.missions.flatMap((mission) => mission.cargoLots.map((lot) => lot.commodity.toLowerCase())));
  assert.ok(commodities.has('medical supplies'));
  assert.ok(commodities.has('revenant tree pollen'));
  assert.ok(commodities.has("e'tam"));
  assert.ok(commodities.has('dcsr2'));
});

test('shared pickup total creates two prerequisite stops without doubling cargo', () => {
  const report = validator.inspectMissionText(sevenMissions, locations);
  const mission = report.missions[1];
  assert.equal(mission.cargoLots.length, 1);
  assert.equal(mission.cargoLots[0].scu, 5);
  assert.equal(mission.cargoLots[0].pickupLocations.length, 2);
  assert.equal(mission.cargoLots[0].sharedPickup, true);
  const route = routePlanner.buildRoute(report.missions, missionModel);
  const sharedOperations = route.stops.flatMap((stop) => stop.operations).filter((operation) => operation.missionId === mission.id);
  assert.equal(sharedOperations.filter((operation) => operation.type === 'collect').length, 2);
  assert.equal(sharedOperations.filter((operation) => operation.type === 'delivery').length, 1);
  assert.equal(route.totalCargoScu, 84);
});

test('named contract metadata preserves contractor and reward', () => {
  const source = `DEAD SAINTS - Rookie Rank - Medium Cargo Haul
contractor Dead Saints
paga 525,500 aUEC
collect cru-l4 shallow fields 32scu revenant tree pollen 8scu neon 4scu slam 4scu e'tam
deliver rustville 16scu revenant tree pollen 8scu neon
deliver fallow field 16scu revenant tree pollen 4scu slam 4scu e'tam`;
  const report = validator.inspectMissionText(source, locations);
  assert.equal(report.blockingIssues.length, 0, report.blockingIssues.map((item) => item.message).join('\n'));
  assert.equal(report.missions[0].title, 'DEAD SAINTS - Rookie Rank - Medium Cargo Haul');
  assert.equal(report.missions[0].contractor, 'Dead Saints');
  assert.equal(report.missions[0].rewardAuec, 525500);
  assert.equal(report.missions[0].cargoLots.length, 5);
});