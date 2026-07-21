'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const locations = require('../locations.js');
const missionText = require('../mission-text.js');
const missions = require('../missions.js');
const routePlanner = require('../route-planner.js');
const ships = require('../ship-catalog.js');
const cargoPlanner = require('../cargo-planner.js');

const example = `Mission X
collect teasa 2scu etam
deliver area18 2scu etam

Mission Y
collect area18 1scu meds
collect teasa 2scu etam
deliver baijini 2scu etam 1scu meds`;

function buildExample() {
  const parsed = missionText.parseMissionText(example, locations);
  const route = routePlanner.buildRoute(parsed.missions, missions);
  return { parsed, route };
}

test('mission text keeps contracts and cargo origins separate', () => {
  const { parsed } = buildExample();
  assert.equal(parsed.missions.length, 2);
  assert.equal(parsed.missions[0].cargoLots[0].pickupLocationLabel, 'Teasa Spaceport · Lorville');
  assert.equal(parsed.missions[1].cargoLots.length, 2);
  assert.deepEqual(parsed.missions[1].cargoLots.map((lot) => lot.pickupLocationLabel), [
    'Teasa Spaceport · Lorville',
    'Riker Memorial Spaceport · Area18'
  ]);
});

test('dependency route groups Teasa, Area18 and Baijini', () => {
  const { route } = buildExample();
  assert.deepEqual(route.stops.map((stop) => stop.locationLabel), [
    'Teasa Spaceport · Lorville',
    'Riker Memorial Spaceport · Area18',
    'Baijini Point · ArcCorp'
  ]);
  assert.deepEqual(route.stops.map((stop) => stop.operations.length), [2, 2, 2]);
});

test('delivery instruction identifies mission and pickup origin', () => {
  const { route } = buildExample();
  const delivery = route.stops[1].operations.find((operation) => operation.type === 'delivery');
  const instruction = routePlanner.operationInstruction(delivery);
  assert.ok(instruction.includes('Mission X'));
  assert.ok(instruction.includes('Teasa Spaceport'));
});

test('cargo plan keeps earlier deliveries closer to access', () => {
  const { route } = buildExample();
  const plan = cargoPlanner.planCargo(route, ships.getModel('drake-corsair'));
  const missionX = plan.assignments.filter((cell) => cell.missionTitle === 'Mission X');
  const missionY = plan.assignments.filter((cell) => cell.missionTitle === 'Mission Y');
  assert.ok(Math.max(...missionX.map((cell) => cell.accessDistance)) <= Math.min(...missionY.map((cell) => cell.accessDistance)));
  assert.equal(plan.usedScu, 5);
});

test('starter ship profiles expose capacity and access points', () => {
  assert.equal(ships.getModel('drake-corsair').capacityScu, 72);
  assert.equal(ships.getModel('drake-cutlass-black').capacityScu, 46);
  assert.deepEqual(ships.getModel('drake-cutlass-black').layout.accessPoints, ['rear', 'left', 'right']);
});
