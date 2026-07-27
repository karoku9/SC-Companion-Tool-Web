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

test('focused route preserves dependency phases without exceeding Corsair capacity', () => {
  const report = validator.inspectMissionText(source, locations);
  assert.equal(report.ready, true, report.blockingIssues.map((item) => item.message).join('\n'));
  const route = optimizer.buildRoute(report.missions, missions);
  assert.equal(route.totalCargoScu, 84);
  assert.equal(route.optimization.strategy, 'phase-safe-fastest');
  assert.equal(route.optimization.capacityFeasible, true);
  assert.equal(route.optimization.repeatedLocationsAllowed, true);
  assert.equal(route.optimization.gatewayEfficient, true);
  assert.equal(route.optimization.minimumJumpCount, 2);
  assert.equal(route.optimization.totalJumpCount, 2);
  assert.equal(route.optimization.systemStickyCandidateAdded, true);
  assert.ok(route.optimization.peakOnboardScu <= 72);
  assert.ok(route.stops.length <= route.optimization.originalStopCount);

  const collapsedSystems = route.stops
    .map((stop) => locations.getSystemForLocation(stop.locationId)?.id ?? 'unknown')
    .filter((systemId, index, systems) => index === 0 || systemId !== systems[index - 1]);
  assert.deepEqual(collapsedSystems, ['stanton', 'pyro', 'stanton']);

  const grimStops = route.stops.filter((stop) => /grim-hex/.test(stop.locationId));
  assert.ok(grimStops.length >= 2, 'Grim HEX must remain in separate phases because the final delivery depends on the later Fallow Field pickup');
  route.stops.slice(1).forEach((stop, index) => {
    assert.notEqual(stop.locationId, route.stops[index].locationId, 'Only adjacent compatible visits may be merged');
  });
});

test('optimizer preserves phase-safe dependency fallback when capacity is insufficient', () => {
  global.SCCompanionSession.getState = () => ({
    selectedShipId: 'tiny',
    hangarShips: [{ id: 'tiny', modelId: 'drake-cutlass-black', cargoCapacityScu: 10, quantumTimeFactor: 1 }],
    routePlannerSettings: { offGridAllowanceScu: 0 }
  });
  const report = validator.inspectMissionText(source, locations);
  const route = optimizer.buildRoute(report.missions, missions);
  assert.equal(route.optimization.strategy, 'phase-safe-dependency-fallback');
  assert.equal(route.optimization.repeatedLocationsAllowed, true);
  assert.equal(route.optimization.capacityFeasible, false);
  assert.ok(route.stops.length >= 1);
});
