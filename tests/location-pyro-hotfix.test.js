'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('../location-field-registry.js');
const locations = require('../location-pyro-hotfix-v0293.js');
const missionText = require('../mission-text.js');

test("Seer's Canyon and Chawla's Beach resolve with OCR-friendly aliases", () => {
  const cases = [
    ["Seer's Canyon", 'pyro-vatra-seers-canyon'],
    ['Seers Canyon', 'pyro-vatra-seers-canyon'],
    ["Chawla's Beach", 'pyro-pyro-iv-chawlas-beach'],
    ['Chawlas Beach', 'pyro-pyro-iv-chawlas-beach'],
    ['Chawla Beach', 'pyro-pyro-iv-chawlas-beach']
  ];
  cases.forEach(([query, id]) => assert.equal(locations.searchOperationalLocations(query)[0]?.id, id, query));
  assert.deepEqual(locations.validation.errors, []);
});

test('mission parser accepts a route between both Pyro outposts', () => {
  const parsed = missionText.parseMissionText(`Mission Pyro run
collect Seer's Canyon 2scu etam
deliver Chawla's Beach 2scu etam`, locations);
  assert.equal(parsed.missions.length, 1);
  assert.equal(parsed.missions[0].objectives[0].locationId, 'pyro-vatra-seers-canyon');
  assert.equal(parsed.missions[0].objectives[1].locationId, 'pyro-pyro-iv-chawlas-beach');
});
