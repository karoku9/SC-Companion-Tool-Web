'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const missions = require('../missions.js');

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
