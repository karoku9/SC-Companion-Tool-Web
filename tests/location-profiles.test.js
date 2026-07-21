'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const profiles = require('../location-profiles.js');

test('Teasa profile separates services, city trade and unverified illegal trade', () => {
  const profile = profiles.getProfile('stanton-hurston-lorville-teasa');
  assert.equal(profiles.getService(profile, 'hangars').status, 'available');
  assert.equal(profiles.getService(profile, 'commodity-trade').status, 'city-transfer');
  assert.equal(profiles.getService(profile, 'illegal-trade').status, 'unverified');
});

test('traffic is explicitly an estimate rather than live telemetry', () => {
  const profile = profiles.getProfile('stanton-hurston-lorville-teasa');
  assert.equal(profile.traffic.live, false);
  assert.match(profile.traffic.note, /not live/i);
});
