'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const locations = require('../locations.js');
const missionText = require('../mission-text.js');
const missions = require('../missions.js');
const routePlanner = require('../route-planner.js');
const cargoState = require('../cargo-state.js');

const input = `Mission X
collect teasa 2scu etam
deliver area18 2scu etam

Mission Y
collect area18 1scu neon
collect teasa 2scu etam
deliver baijini 2scu etam 1scu neon`;

function route() {
  const parsed = missionText.parseMissionText(input, locations);
  return routePlanner.buildRoute(parsed.missions, missions);
}

function missionXKey(activeRoute) {
  const lifecycle = cargoState.deriveCargoState(activeRoute, 0, {});
  return lifecycle.lots.find((lot) => lot.missionTitle === 'Mission X').key;
}

test('actual SCU correction changes lifecycle totals without changing planned SCU', () => {
  const activeRoute = route();
  const key = missionXKey(activeRoute);
  cargoState.validateCorrection(activeRoute, 1, key, { actualScu: 1, status: 'onboard' });
  const lifecycle = cargoState.deriveCargoState(activeRoute, 1, { [key]: { actualScu: 1, status: 'onboard' } });
  const lot = lifecycle.lots.find((item) => item.key === key);
  assert.equal(lot.plannedScu, 2);
  assert.equal(lot.scu, 1);
  assert.equal(lot.status, 'onboard');
  assert.equal(lifecycle.totals.onboardScu, 3);
  assert.equal(lifecycle.correctionCount, 1);
});

test('impossible delivery correction is rejected before delivery stop is completed', () => {
  const activeRoute = route();
  const key = missionXKey(activeRoute);
  assert.throws(
    () => cargoState.validateCorrection(activeRoute, 1, key, { actualScu: 2, status: 'delivered' }),
    /not valid/
  );
});

test('lost cargo leaves onboard totals but remains traceable', () => {
  const activeRoute = route();
  const key = missionXKey(activeRoute);
  const lifecycle = cargoState.deriveCargoState(activeRoute, 1, { [key]: { actualScu: 1, status: 'lost' } });
  assert.equal(lifecycle.lostLots.length, 1);
  assert.equal(lifecycle.totals.lostScu, 1);
  assert.equal(lifecycle.onboardLots.some((lot) => lot.key === key), false);
});

test('a correction that becomes impossible after PREVIOUS is suspended, not deleted', () => {
  const activeRoute = route();
  const key = missionXKey(activeRoute);
  cargoState.validateCorrection(activeRoute, 2, key, { actualScu: 2, status: 'delivered' });
  const rewound = cargoState.deriveCargoState(activeRoute, 1, { [key]: { actualScu: 2, status: 'delivered' } });
  const lot = rewound.lots.find((item) => item.key === key);
  assert.equal(lot.status, 'onboard');
  assert.equal(lot.correction.statusValid, false);
  assert.equal(rewound.correctionIssues.length, 1);
});
