'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const locations = require('../locations.js');

test('major landing zones resolve to their operational spaceports', () => {
  const cases = [
    ['Lorville', 'stanton-hurston-lorville-teasa'],
    ['Orison', 'stanton-crusader-orison-august-dunlow'],
    ['Area18', 'stanton-arccorp-area18-riker'],
    ['New Babbage', 'stanton-microtech-new-babbage-nbis']
  ];
  cases.forEach(([query, expected]) => {
    const exact = locations.searchOperationalLocations(query)
      .find((item) => [item.name, item.contextName, item.navigationTarget, ...(item.aliases ?? [])]
        .map(locations.normalizeSearchTerm).includes(locations.normalizeSearchTerm(query)));
    assert.equal(exact?.id, expected, `${query} did not resolve to ${expected}`);
  });
});

test('punctuation and station-name variants resolve to the same Lagrange destination', () => {
  ['ARC-L2', 'ARC L2', 'Lively Pathway', 'Lively Pathway Station'].forEach((query) => {
    assert.equal(locations.searchOperationalLocations(query)[0]?.id, 'stanton-arc-l2-lively-pathway');
  });
  assert.equal(locations.searchOperationalLocations('MIC L5')[0]?.id, 'stanton-mic-l5-modern-icarus');
});

test('hierarchy preserves system, body, landing zone and operational arrival point', () => {
  const path = locations.getLocationPath('stanton-microtech-new-babbage-nbis');
  assert.deepEqual(path.map((location) => location.name), [
    'Stanton', 'microTech', 'New Babbage', 'New Babbage Interstellar Spaceport'
  ]);
});

test('non-operational hierarchy nodes never become selectable destinations', () => {
  const results = locations.searchOperationalLocations('Hurston');
  assert.ok(results.length >= 2);
  assert.ok(results.every((location) => location.operational));
  assert.ok(results.some((location) => location.id === 'stanton-hurston-lorville-teasa'));
  assert.ok(results.some((location) => location.id === 'stanton-hurston-everus'));
  assert.ok(!results.some((location) => location.id === 'stanton-hurston'));
});

test('unknown locations return an empty result', () => {
  assert.deepEqual(locations.searchOperationalLocations('Definitely Not A Place'), []);
});
