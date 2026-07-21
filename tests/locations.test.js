'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const locations = require('../locations.js');

test('Lorville resolves to its operational arrival point', () => {
  const [result] = locations.searchOperationalLocations('Lorville');

  assert.equal(result.id, 'stanton-hurston-lorville-teasa');
  assert.equal(locations.formatOperationalLabel(result), 'Teasa Spaceport · Lorville');
  assert.equal(result.navigationTarget, 'Lorville');
});

test('location hierarchy preserves system, body, area and operational place', () => {
  const path = locations.getLocationPath('stanton-hurston-lorville-teasa');

  assert.deepEqual(
    path.map((location) => location.name),
    ['Stanton', 'Hurston', 'Lorville', 'Teasa Spaceport']
  );
});

test('non-operational hierarchy nodes are not selectable destinations', () => {
  const results = locations.searchOperationalLocations('Hurston');

  assert.equal(results.length, 1);
  assert.equal(results[0].name, 'Teasa Spaceport');
});

test('unknown locations return an empty result', () => {
  assert.deepEqual(locations.searchOperationalLocations('Definitely Not A Place'), []);
});
