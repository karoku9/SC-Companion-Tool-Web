'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const locations = require('../locations.js');
const missionText = require('../mission-text.js');
const missions = require('../missions.js');
const routePlanner = require('../route-planner.js');
const cargoState = require('../cargo-state.js');
const cargoLayout = require('../cargo-layout.js');
const cargoPlanner = require('../cargo-planner.js');
const ships = require('../ship-catalog.js');

const example = `Mission X
collect teasa 2scu etam
deliver area18 2scu etam

Mission Y
collect area18 1scu neon
collect teasa 2scu etam
deliver baijini 2scu etam 1scu neon`;

function buildExample() {
  const parsed = missionText.parseMissionText(example, locations);
  return routePlanner.buildRoute(parsed.missions, missions);
}

function totals(pendingScu, onboardScu, deliveredScu, lostScu = 0) {
  return { pendingScu, onboardScu, deliveredScu, lostScu };
}

test('cargo state follows completed stops without storing duplicate cargo truth', () => {
  const route = buildExample();
  const beforeTeasa = cargoState.deriveCargoState(route, 0);
  assert.deepEqual(beforeTeasa.totals, totals(5, 0, 0));
  assert.deepEqual(beforeTeasa.currentMoves.map((move) => move.action), ['load', 'load']);

  const afterTeasa = cargoState.deriveCargoState(route, 1);
  assert.deepEqual(afterTeasa.totals, totals(1, 4, 0));
  assert.deepEqual(afterTeasa.currentMoves.map((move) => move.action).sort(), ['load', 'unload']);

  const afterArea18 = cargoState.deriveCargoState(route, 2);
  assert.deepEqual(afterArea18.totals, totals(0, 3, 2));
  assert.deepEqual(afterArea18.onboardLots.map((lot) => `${lot.missionTitle}:${lot.commodity}`).sort(), [
    'Mission Y:etam',
    'Mission Y:neon'
  ]);

  const complete = cargoState.deriveCargoState(route, 3);
  assert.equal(complete.complete, true);
  assert.deepEqual(complete.totals, totals(0, 0, 5));

  assert.deepEqual(cargoState.deriveCargoState(route, 1).totals, afterTeasa.totals);
});

test('cargo planner keys duplicate lot ids by mission as well as lot', () => {
  const route = routePlanner.buildRoute([
    {
      id: 'mission-a', title: 'Mission A', cargoLots: [{
        id: 'lot-1', commodity: 'etam', scu: 1, pickupType: 'collect',
        pickupLocationId: 'stanton-hurston-lorville-teasa', pickupLocationLabel: 'Teasa Spaceport · Lorville',
        deliveryLocationId: 'stanton-arccorp-area18-riker', deliveryLocationLabel: 'Riker Memorial Spaceport · Area18'
      }]
    },
    {
      id: 'mission-b', title: 'Mission B', cargoLots: [{
        id: 'lot-1', commodity: 'neon', scu: 1, pickupType: 'collect',
        pickupLocationId: 'stanton-arccorp-area18-riker', pickupLocationLabel: 'Riker Memorial Spaceport · Area18',
        deliveryLocationId: 'stanton-arccorp-baijini', deliveryLocationLabel: 'Baijini Point · ArcCorp'
      }]
    }
  ], missions);

  const plan = cargoPlanner.planCargo(route, ships.getModel('drake-corsair'));
  assert.deepEqual(new Set(plan.assignments.map((assignment) => assignment.cargoKey)), new Set([
    'mission-a::lot-1',
    'mission-b::lot-1'
  ]));
  assert.equal(plan.assignments.find((assignment) => assignment.missionId === 'mission-a').deliveryStopIndex, 1);
  assert.equal(plan.assignments.find((assignment) => assignment.missionId === 'mission-b').pickupStopIndex, 1);
});

test('planned slots stay stable while non-overlapping cargo reuses released cells', () => {
  const route = buildExample();
  const model = ships.getModel('drake-corsair');
  const plan = cargoPlanner.planCargo(route, model);
  assert.deepEqual(plan.assignments.map((assignment) => assignment.planSlotIndex), [0, 1, 2, 3, 0]);
  assert.equal(plan.peakPlannedScu, 4);
  const first = cargoLayout.locateSlot(model, plan.assignments[0].planSlotIndex);
  const reused = cargoLayout.locateSlot(model, plan.assignments.at(-1).planSlotIndex);
  assert.ok(first.zoneLabel);
  assert.equal(first.layer, 0);
  assert.equal(reused.zoneLabel, first.zoneLabel);
  assert.equal(reused.layer, first.layer);
});
