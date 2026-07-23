'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const locations = require('../locations.js');
const starmap = require('../starmap-data.js');
const profiles = require('../location-profiles.js');
const parser = require('../mission-text.js');

const expectedOperational = [
  'stanton-hurston-lorville-teasa',
  'stanton-crusader-orison-august-dunlow',
  'stanton-arccorp-area18-riker',
  'stanton-microtech-new-babbage-nbis',
  'stanton-hurston-everus',
  'stanton-crusader-seraphim',
  'stanton-arccorp-baijini',
  'stanton-microtech-port-tressler',
  'stanton-crusader-yela-grim-hex',
  'stanton-arc-l1-wide-forest',
  'stanton-arc-l2-lively-pathway',
  'stanton-arc-l3-modern-express',
  'stanton-arc-l4-faint-glen',
  'stanton-arc-l5-yellow-core',
  'stanton-hur-l1-green-glade',
  'stanton-hur-l2-faithful-dream',
  'stanton-hur-l3-thundering-express',
  'stanton-hur-l4-melodic-fields',
  'stanton-hur-l5-high-course',
  'stanton-cru-l1-ambitious-dream',
  'stanton-cru-l4-shallow-fields',
  'stanton-cru-l5-beautiful-glen',
  'stanton-mic-l1-shallow-frontier',
  'stanton-mic-l2-long-forest',
  'stanton-mic-l3-endless-odyssey',
  'stanton-mic-l4-red-crossroads',
  'stanton-mic-l5-modern-icarus',
  'stanton-pyro-gateway',
  'stanton-magnus-gateway',
  'stanton-terra-gateway',
  'pyro-monox-checkmate',
  'pyro-bloom-orbituary',
  'pyro-terminus-ruin',
  'nyx-delamar-levski'
];

test('v0.22 catalog is internally valid and exposes the locked coverage', () => {
  assert.deepEqual(locations.validation.errors, []);
  assert.deepEqual(locations.validation.warnings, []);
  assert.deepEqual(locations.getCoverageSummary(), {
    totalRecords: 80,
    operationalDestinations: 34,
    bySystem: { stanton: 30, pyro: 3, nyx: 1 },
    reviewedAt: '2026-07-23',
    gameVersion: 'Alpha 4.9.x'
  });
  assert.deepEqual(locations.locations.filter((location) => location.operational).map((location) => location.id), expectedOperational);
});

test('every operational destination has provenance, version metadata and a finite Starmap anchor', () => {
  expectedOperational.forEach((locationId) => {
    const location = locations.getLocation(locationId);
    const anchor = starmap.getLocationAnchor(locationId);
    assert.ok(location.navigationTarget, `${locationId} lacks a navigation target`);
    assert.ok(location.sourceIds.length, `${locationId} lacks sources`);
    assert.ok(location.lastVerified, `${locationId} lacks a review date`);
    assert.ok(location.gameVersion, `${locationId} lacks a game version`);
    assert.ok(location.anchor.geometryStatus, `${locationId} lacks geometry status`);
    assert.ok(anchor, `${locationId} lacks a Starmap anchor`);
    [...anchor.position, ...anchor.distancePositionGm].forEach((value) => assert.ok(Number.isFinite(value), `${locationId} has a non-finite anchor`));
  });
  assert.equal(Object.keys(starmap.locationAnchors).length, expectedOperational.length);
});

test('official and reviewed-community sources remain distinguishable', () => {
  const official = locations.getSource('rsi-stanton');
  const community = locations.getSource('scwiki-stanton-4-9');
  assert.equal(official.authority, 'official');
  assert.equal(community.authority, 'community');
  assert.equal(community.gameVersion, '4.9.0-LIVE.12232306');
  assert.equal(community.reviewedAt, '2026-07-23');
  const lagrange = locations.getLocation('stanton-arc-l2-lively-pathway');
  assert.equal(lagrange.sourceStatus, 'reviewed-community-current');
  assert.equal(lagrange.anchor.geometryStatus, 'schematic-lagrange-anchor');
});

test('expanded aliases feed the existing mission parser without custom locations', () => {
  const parsed = parser.parseMissionText(`Mission: Stanton registry\ncollect ARC-L2 4scu etam\ndeliver Seraphim 4scu etam`, locations);
  assert.equal(parsed.missions.length, 1);
  assert.equal(parsed.missions[0].cargoLots[0].pickupLocationId, 'stanton-arc-l2-lively-pathway');
  assert.equal(parsed.missions[0].cargoLots[0].deliveryLocationId, 'stanton-crusader-seraphim');
});

test('reviewed profiles now add complete service and risk intelligence without claiming live telemetry', () => {
  expectedOperational.forEach((locationId) => {
    const profile = profiles.getProfile(locationId);
    assert.ok(profile, `${locationId} lacks a reviewed profile`);
    assert.equal(profile.dataStatus, 'community-reviewed');
    assert.equal(profile.services.length, 12);
    assert.notEqual(profile.risk.level, 'unknown');
    assert.equal(profile.risk.live, false);
    assert.ok(profile.sources.some((source) => source.id === 'scunpacked-starmap-4-9'));
  });
  assert.equal(profiles.coverage.complete, true);
  assert.equal(profiles.coverage.reviewedProfiles, 34);
});
