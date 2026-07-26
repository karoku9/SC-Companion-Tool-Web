'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const locations = require('../location-field-registry.js');
const validator = require('../mission-validation.js');
const missions = require('../missions.js');

global.SCCompanionRoutePlanner = require('../route-planner.js');
global.SCCompanionRoutePlannerEngine = require('../route-planner-engine.js');
global.SCCompanionSession = {
  getState: () => ({
    selectedShipId: 'corsair',
    selectedShipModelId: 'drake-corsair',
    hangarShips: [{ id: 'corsair', modelId: 'drake-corsair', cargoCapacityScu: 72, quantumTimeFactor: 1 }],
    routePlannerSettings: { offGridAllowanceScu: 0, cargoSafetyEnabled: true, safetyMarginMinutes: 15 }
  })
};
global.SCCompanionShipCatalog = require('../ship-catalog.js');
global.SCCompanionLocations = locations;

const optimizer = require('../focused-route-optimizer.js');

const source = `Mission 1
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

test('focused route visits each feasible destination once without exceeding Corsair capacity', () => {
  const report = validator.inspectMissionText(source, locations);
  assert.equal(report.ready, true, report.blockingIssues.map((item) => item.message).join('\n'));
  const route = optimizer.buildRoute(report.missions, missions);
  assert.equal(route.totalCargoScu, 84);
  assert.equal(route.optimization.strategy, 'consolidated-fastest');
  assert.equal(route.optimization.capacityFeasible, true);
  assert.ok(route.optimization.peakOnboardScu <= 72);
  assert.ok(route.stops.length < 16);
  const locationsInRoute = route.stops.map((stop) => stop.locationId);
  assert.equal(new Set(locationsInRoute).size, locationsInRoute.length);
  assert.equal(route.stops.filter((stop) => /grim-hex/.test(stop.locationId)).length, 1);
});

test('optimizer preserves dependency-safe fallback when consolidation exceeds capacity', () => {
  global.SCCompanionSession.getState = () => ({
    selectedShipId: 'tiny',
    hangarShips: [{ id: 'tiny', modelId: 'drake-cutlass-black', cargoCapacityScu: 10, quantumTimeFactor: 1 }],
    routePlannerSettings: { offGridAllowanceScu: 0 }
  });
  const report = validator.inspectMissionText(source, locations);
  const route = optimizer.buildRoute(report.missions, missions);
  assert.equal(route.optimization.strategy, 'dependency-safe-fallback');
  assert.ok(route.stops.length >= route.optimization.consolidatedStopCount);
});