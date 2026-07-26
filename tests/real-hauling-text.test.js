'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const locations = require('../location-field-registry.js');
const validation = require('../mission-validation.js');
const missions = require('../missions.js');
const routePlanner = require('../route-planner.js');

const sevenMissionSample = `Mission 1
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

test('real seven-mission text resolves PAF OLP outposts and multi-word commodities', () => {
  const report = validation.inspectMissionText(sevenMissionSample, locations);
  assert.equal(report.blockingIssues.length, 0, report.blockingIssues.map((item) => item.message).join('\n'));
  assert.equal(report.missions.length, 7);
  assert.equal(report.ready, true);

  const allLots = report.missions.flatMap((mission) => mission.cargoLots);
  assert.ok(allLots.some((lot) => lot.commodity === 'medical supplies'));
  assert.ok(allLots.some((lot) => lot.commodity === 'revenant tree pollen'));
  assert.ok(allLots.some((lot) => lot.commodity === "e'tam"));
  assert.ok(allLots.some((lot) => lot.pickupLocationId.includes('attritus-paf-iii')));
  assert.ok(allLots.some((lot) => lot.pickupLocationId.includes('vivere-olp')));
  assert.ok(allLots.some((lot) => lot.deliveryLocationId.endsWith('rustville')));
  assert.ok(allLots.some((lot) => lot.deliveryLocationId.endsWith('fallow-field')));
  assert.ok(allLots.some((lot) => lot.deliveryLocationId.endsWith('shepherds-rest')));
});

test('shared pickup total visits both facilities without doubling cargo', () => {
  const report = validation.inspectMissionText(sevenMissionSample, locations);
  const mission = report.missions[1];
  const lot = mission.cargoLots.find((item) => item.commodity === 'hydrogen');
  assert.equal(lot.scu, 5);
  assert.equal(lot.sharedPickupTotal, true);
  assert.equal(lot.pickupLocations.length, 2);
  assert.deepEqual(lot.pickupLocations.map((item) => item.id), [
    'stanton-hurston-aberdeen-vivere-paf-iii',
    'stanton-crusader-daymar-attritus-paf-ii'
  ]);

  const normalized = missions.normalizeMission(mission);
  assert.equal(normalized.cargoLots[0].scu, 5);
  assert.equal(normalized.cargoLots[0].pickupLocations.length, 2);
  const operations = missions.buildOperations([mission]);
  const pickups = operations.filter((operation) => operation.type === 'collect');
  const delivery = operations.find((operation) => operation.type === 'delivery');
  assert.equal(pickups.length, 2);
  assert.equal(delivery.dependsOn.length, 2);

  const route = routePlanner.buildRoute([mission], missions);
  const pickupIndexes = lot.pickupLocations.map((location) => route.stops.findIndex((stop) => stop.locationId === location.id));
  const deliveryIndex = route.stops.findIndex((stop) => stop.locationId === lot.deliveryLocationId);
  assert.ok(pickupIndexes.every((index) => index >= 0 && index < deliveryIndex));
  assert.equal(route.totalCargoScu, 5);
});

test('rich contract title contractor and reward are metadata, not extra missions', () => {
  const report = validation.inspectMissionText(`DEAD SAINTS - Rookie Rank - Medium Cargo Haul
contractor Dead Saints
paga 525,500 aUEC
collect cru-l4 shallow fields 32scu revenant tree pollen 8scu neon 4scu slam 4scu e'tam
deliver rustville 16scu revenant tree pollen 8scu neon
deliver fallow field 16scu revenant tree pollen 4scu slam 4scu e'tam`, locations);

  assert.equal(report.blockingIssues.length, 0, report.blockingIssues.map((item) => item.message).join('\n'));
  assert.equal(report.missions.length, 1);
  assert.equal(report.missions[0].title, 'DEAD SAINTS - Rookie Rank - Medium Cargo Haul');
  assert.equal(report.missions[0].contractor, 'Dead Saints');
  assert.equal(report.missions[0].rewardAuec, 525500);
  assert.equal(report.missions[0].cargoLots.length, 5);
  assert.equal(report.entries.filter((entry) => entry.kind === 'metadata').length, 2);
});

test('contract destination aliases resolve directly', () => {
  const checks = {
    'attritus paf-iii': 'stanton-crusader-daymar-attritus-paf-iii',
    'vivere paf 3': 'stanton-hurston-aberdeen-vivere-paf-iii',
    'vivere olp': 'stanton-hurston-aberdeen-vivere-olp',
    orinth: 'stanton-hurston-reclamation-disposal-orinth',
    rustville: 'pyro-rustville',
    'fallow field': 'pyro-fallow-field',
    ashland: 'pyro-ashland',
    'last landings': 'pyro-terminus-last-landings',
    "shepherd's rest": 'pyro-bloom-shepherds-rest'
  };
  Object.entries(checks).forEach(([query, expected]) => assert.equal(locations.searchOperationalLocations(query)[0]?.id, expected, query));
  assert.deepEqual(locations.validation.errors, []);
});
