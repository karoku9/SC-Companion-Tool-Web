'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const locations = require('../locations.js');
global.SCCompanionLocations = locations;
const profiles = require('../location-profiles.js');
global.SCCompanionLocationProfiles = profiles;
require('../official-universe-data.js');
require('../starmap-data.js');
require('../location-context.js');
const context = require('../location-exposure-v028.js');

const GRIM_HEX = 'stanton-crusader-yela-grim-hex';

test('Grim HEX hangar delivery is not presented as fully exposed cargo handling', () => {
  const result = context.buildContext(GRIM_HEX, {
    onboardScu: 50,
    onboardAfterScu: 24,
    hasDelivery: true,
    hasPickup: false,
    operationKind: 'delivery'
  });
  assert.doesNotMatch(result.exposure.label, /High cargo exposure/i);
  assert.match(result.exposure.label, /Protected hangar delivery/i);
  assert.equal(result.exposure.level, 'caution');
  assert.ok(result.exposure.reasons.some((reason) => /hangar|cargo/i.test(reason)));
});

test('a delivery that empties the ship reports cargo cleared', () => {
  const result = context.buildContext(GRIM_HEX, {
    onboardScu: 26,
    onboardAfterScu: 0,
    hasDelivery: true,
    operationKind: 'delivery'
  });
  assert.equal(result.exposure.level, 'clear');
  assert.match(result.exposure.label, /Cargo cleared/i);
});
