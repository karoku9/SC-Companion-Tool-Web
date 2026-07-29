'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const missions = require('../missions.js');
const routePlanner = require('../route-planner.js');
const routeCorrections = require('../route-corrections.js');

function deadSaint(id, commodity, scu) {
  return {
    id,
    title: `Dead Saints ${id}`,
    cargoLots: [{
      id: `${id}-lot-1`,
      commodity,
      scu,
      pickupLocationId: 'pickup-yard',
      pickupType: 'collect',
      deliveryLocationId: 'stanton-hurston-lorville-teasa'
    }]
  };
}

test('multiple contracts keep their identity when grouped at one stop', () => {
  const operations = missions.buildOperations([
    deadSaint('ds-1', 'OrganicMass', 4),
    deadSaint('ds-2', 'Crushed Human Remains', 2),
    deadSaint('ds-3', 'OrganicMass', 6)
  ]);
  const stops = missions.groupOperationsByLocation(operations);
  const teasa = stops.find((stop) => (
    stop.locationId === 'stanton-hurston-lorville-teasa'
  ));

  assert.equal(teasa.operations.length, 3);
  assert.deepEqual(
    teasa.operations.map((operation) => operation.missionId),
    ['ds-1', 'ds-2', 'ds-3']
  );
});

test('every cargo delivery depends on its own pickup or collect operation', () => {
  const operations = missions.buildOperations([
    deadSaint('ds-1', 'OrganicMass', 4)
  ]);
  const collect = operations.find((operation) => operation.type === 'collect');
  const delivery = operations.find((operation) => operation.type === 'delivery');

  assert.deepEqual(delivery.dependsOn, [collect.id]);
  assert.equal(delivery.lotId, collect.lotId);
  assert.equal(delivery.missionId, collect.missionId);
});

test('delivery cannot be used as a pickup operation type', () => {
  const mission = deadSaint('ds-1', 'OrganicMass', 4);
  mission.cargoLots[0].pickupType = 'delivery';

  const operations = missions.buildOperations([mission]);
  assert.equal(operations[0].type, 'pickup');
  assert.equal(operations[1].type, 'delivery');
});

test('non-cargo objectives use the same operation model', () => {
  const [operation] = missions.buildOperations([{
    id: 'visit-1',
    title: 'Visit Teasa',
    category: 'general',
    objectives: [{
      id: 'reach-spaceport',
      type: 'visit',
      locationId: 'stanton-hurston-lorville-teasa',
      label: 'Reach Teasa Spaceport'
    }]
  }]);

  assert.equal(operation.type, 'visit');
  assert.equal(operation.missionId, 'visit-1');
  assert.equal(operation.locationId, 'stanton-hurston-lorville-teasa');
});

test('duplicate mission ids are rejected', () => {
  assert.throws(
    () => missions.buildOperations([
      deadSaint('ds-1', 'OrganicMass', 4),
      deadSaint('ds-1', 'Medical Supplies', 2)
    ]),
    /Mission ids must be unique/
  );
});

function cargoMission(id, commodity, scu, pickupId, pickupLabel, deliveryId, deliveryLabel) {
  return {
    id,
    title: `Contract ${id}`,
    cargoLots: [{
      id: `${id}-lot`,
      commodity,
      scu,
      pickupLocationId: pickupId,
      pickupLocationLabel: pickupLabel,
      deliveryLocationId: deliveryId,
      deliveryLocationLabel: deliveryLabel
    }]
  };
}

test('cargo action journeys use the lot pickup and delivery instead of mission metadata', () => {
  const operations = missions.buildOperations([
    cargoMission('physical-route', 'DCSR2', 10, 'fallow', 'Fallow Field', 'grim-hex', 'Grim HEX')
  ]);
  const load = operations.find((operation) => operation.type !== 'delivery');
  const unload = operations.find((operation) => operation.type === 'delivery');

  assert.deepEqual(missions.getCargoActionJourney(load), {
    kind: 'load',
    label: 'LOAD',
    symbol: '↑',
    origin: 'Fallow Field',
    destination: 'Grim HEX'
  });
  assert.deepEqual(missions.getCargoActionJourney(unload), {
    kind: 'unload',
    label: 'UNLOAD',
    symbol: '↓',
    origin: 'Fallow Field',
    destination: 'Grim HEX'
  });
  assert.notEqual(missions.getCargoActionJourney(unload).origin, unload.missionTitle);
});

test('same commodity remains separate when origin or destination differs', () => {
  const operations = missions.buildOperations([
    cargoMission('origin-a', 'E’tam', 2, 'fallow', 'Fallow Field', 'grim-hex', 'Grim HEX'),
    cargoMission('origin-b', 'E’tam', 3, 'rustville', 'Rustville', 'grim-hex', 'Grim HEX'),
    cargoMission('destination-b', 'E’tam', 4, 'fallow', 'Fallow Field', 'checkmate', 'Checkmate')
  ]);
  const stops = missions.groupOperationsByLocation(operations);
  const grimHex = stops.find((stop) => stop.locationId === 'grim-hex');
  const fallow = stops.find((stop) => stop.locationId === 'fallow');

  assert.equal(grimHex.operations.length, 2);
  assert.deepEqual(
    grimHex.operations.map((operation) => missions.getCargoActionJourney(operation).origin),
    ['Fallow Field', 'Rustville']
  );
  assert.equal(fallow.operations.length, 2);
  assert.deepEqual(
    fallow.operations.map((operation) => missions.getCargoActionJourney(operation).destination),
    ['Grim HEX', 'Checkmate']
  );
});

test('ambiguous multi-origin delivery reports ORIGIN UNKNOWN', () => {
  const operations = missions.buildOperations([{
    id: 'shared-origin',
    title: 'Shared pickup contract',
    cargoLots: [{
      id: 'shared-lot',
      commodity: 'Medical Supplies',
      scu: 6,
      pickupLocations: [
        { id: 'fallow', label: 'Fallow Field' },
        { id: 'rustville', label: 'Rustville' }
      ],
      deliveryLocationId: 'grim-hex',
      deliveryLocationLabel: 'Grim HEX'
    }]
  }]);
  const unload = operations.find((operation) => operation.type === 'delivery');

  assert.equal(missions.getCargoActionJourney(unload).origin, 'ORIGIN UNKNOWN');
  assert.equal(missions.getCargoActionJourney(unload).destination, 'Grim HEX');
});

test('cargo journeys remain stable after route reordering and replanning', () => {
  const inputs = [
    cargoMission('a', 'DCSR2', 10, 'fallow', 'Fallow Field', 'grim-hex', 'Grim HEX'),
    cargoMission('b', 'E’tam', 2, 'fallow', 'Fallow Field', 'checkmate', 'Checkmate')
  ];
  const original = routePlanner.buildRoute(inputs, missions);
  const routeOperations = (route) => (route.allStops ?? route.stops).flatMap((stop) => stop.operations);
  const originalJourneys = new Map(routeOperations(original).map((operation) => [
    operation.id,
    missions.getCargoActionJourney(operation)
  ]));
  const checkmate = routeCorrections.deriveRoute(original).allStops.find((stop) => stop.locationId === 'checkmate');
  const reordered = routeCorrections.deriveRoute(
    original,
    routeCorrections.changeOrder(original, null, checkmate.id, -1, [])
  );
  const replanned = routePlanner.buildRoute([...inputs].reverse(), missions);

  [reordered, replanned].forEach((route) => {
    routeOperations(route).forEach((operation) => {
      assert.deepEqual(missions.getCargoActionJourney(operation), originalJourneys.get(operation.id));
    });
  });
});
