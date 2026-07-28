'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

global.SCCompanionLocations = require('../location-field-registry.js');
global.SCCompanionStarmapData = require('../starmap-data.js');
global.SCCompanionOfficialUniverseData = require('../official-universe-data.js');
global.SCCompanionNavigationEstimates = require('../navigation-estimates.js');
global.SCCompanionLocationProfiles = require('../location-profiles.js');
global.SCCompanionArrivalEstimates = require('../arrival-estimates.js');
global.SCCompanionRoutePlanner = require('../route-planner.js');
global.SCCompanionRoutePlannerEngine = require('../route-planner-engine.js');
global.SCCompanionRouteOptimization = require('../route-optimization.js');
global.SCCompanionSession = {
  getState: () => ({
    selectedShipId: 'corsair',
    selectedShipModelId: 'drake-corsair',
    hangarShips: [{ id: 'corsair', modelId: 'drake-corsair', cargoCapacityScu: 72, quantumTimeFactor: 1 }],
    routePlannerSettings: { offGridAllowanceScu: 0 }
  })
};
global.SCCompanionShipCatalog = require('../ship-catalog.js');

const planner = require('../focused-route-optimizer.js');
const validator = require('../mission-validation.js');
const missionModel = require('../missions.js');

test('replan locks completed progress and reorders only the remaining capacity-safe route', () => {
  const report = validator.inspectMissionText(`Mission A
collect teasa 10scu titanium
deliver area18 10scu titanium

Mission B
collect teasa 8scu laranite
deliver baijini 8scu laranite

Mission C
collect area18 6scu etam
deliver port tressler 6scu etam`, global.SCCompanionLocations);
  assert.equal(report.ready, true);
  const route = planner.buildRoute(report.missions, missionModel, {
    startLocationId: 'stanton-hurston-lorville-teasa',
    routeStrategy: 'balanced'
  });
  const completedId = route.stops[0].id;
  const result = planner.replanRemaining(route, [completedId], {
    startLocationId: 'stanton-hurston-lorville-teasa',
    routeStrategy: 'complete-missions'
  });
  assert.equal(result.completedStopIds.length, 1);
  assert.equal(result.route.stops[0].locationId, route.stops[0].locationId);
  assert.ok(result.route.estimate.capacityFeasible);
  assert.equal(result.route.optimization.replanLockedStopCount, 1);
});
