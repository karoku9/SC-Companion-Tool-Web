'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const baseCatalog = require('../locations.js');
global.SCCompanionLocations = baseCatalog;
const catalog = require('../location-field-registry.js');
global.SCCompanionLocations = catalog;
const baseProfiles = require('../location-profiles.js');
global.SCCompanionLocationProfiles = baseProfiles;
const profiles = require('../location-field-profiles.js');
global.SCCompanionLocationProfiles = profiles;
require('../official-universe-data.js');
const starmap = require('../starmap-data.js');
global.SCCompanionStarmapData = starmap;
const context = require('../location-context.js');
const parser = require('../mission-text.js');

const BEZDEK = 'stanton-hurston-arial-hdms-bezdek';
const DELTANA = 'stanton-microtech-rayari-deltana-research-outpost';
const CANTWELL = 'stanton-microtech-clio-rayari-cantwell-research-outpost';
const S4LD01 = 'stanton-microtech-microtech-logistics-depot-s4ld01';
const BUDS = 'stanton-microtech-euterpe-buds-growery';

function service(locationContext, id) {
  return locationContext.services.find((item) => item.id === id);
}

test('field registry adds reviewed hauling outposts and distribution centers', () => {
  assert.deepEqual(catalog.validation.errors, []);
  assert.deepEqual(catalog.validation.warnings, []);
  assert.deepEqual(catalog.getCoverageSummary(), {
    totalRecords: 130,
    operationalDestinations: 84,
    fieldDestinations: 50,
    bySystem: { stanton: 80, pyro: 3, nyx: 1 },
    reviewedAt: '2026-07-23',
    gameVersion: 'Alpha 4.9.x'
  });
  assert.equal(catalog.fieldLocations.filter((location) => location.type === 'outpost').length, 43);
  assert.equal(catalog.fieldLocations.filter((location) => location.type === 'distribution-center').length, 7);
});

test('field names and common compact forms resolve predictably', () => {
  assert.equal(catalog.searchOperationalLocations('HDMS Bezdek')[0]?.id, BEZDEK);
  assert.equal(catalog.searchOperationalLocations('Rayari Deltana')[0]?.id, DELTANA);
  assert.equal(catalog.searchOperationalLocations('Rayari Cantwell')[0]?.id, CANTWELL);
  assert.equal(catalog.searchOperationalLocations('S4LD01')[0]?.id, S4LD01);
  assert.equal(catalog.searchOperationalLocations('Buds Growery')[0]?.id, BUDS);
});

test('every field destination has a complete service, risk and schematic anchor profile', () => {
  assert.deepEqual(profiles.coverage, {
    operationalDestinations: 84,
    reviewedProfiles: 84,
    fieldProfiles: 50,
    complete: true,
    gameVersion: '4.9.0-LIVE.12232306',
    reviewedAt: '2026-07-23'
  });
  catalog.fieldLocations.forEach((location) => {
    const profile = profiles.getProfile(location.id);
    const anchor = starmap.getLocationAnchor(location.id);
    assert.ok(profile, `${location.id} lacks a profile`);
    assert.equal(profile.services.length, 12);
    assert.notEqual(profile.risk.level, 'unknown');
    assert.ok(anchor, `${location.id} lacks a Starmap anchor`);
    assert.equal(location.anchor.geometryStatus, 'schematic-surface-anchor');
    [...anchor.position, ...anchor.distancePositionGm].forEach((value) => assert.ok(Number.isFinite(value)));
  });
});

test('outposts answer operational essentials without pretending to be full stations', () => {
  const bezdek = context.buildContext(BEZDEK, { asOf: '2026-07-23' });
  assert.equal(bezdek.location.type, 'outpost');
  assert.equal(bezdek.profile.classification, 'Surface industrial or research outpost');
  assert.equal(service(bezdek, 'landing-services').status, 'available');
  assert.equal(service(bezdek, 'food').status, 'not-available');
  assert.equal(service(bezdek, 'medical').status, 'not-available');
  assert.equal(service(bezdek, 'ground-vehicles').status, 'available');
  assert.equal(service(bezdek, 'commodity-trade').status, 'available');
  assert.equal(bezdek.risk.level, 'elevated');
});

test('distribution centers and outlaw field sites retain distinct profiles', () => {
  const depot = context.buildContext(S4LD01, { asOf: '2026-07-23' });
  const buds = context.buildContext(BUDS, { asOf: '2026-07-23' });
  assert.equal(depot.location.type, 'distribution-center');
  assert.equal(service(depot, 'cargo-center').status, 'available');
  assert.equal(service(depot, 'food').status, 'limited');
  assert.equal(depot.risk.level, 'elevated');
  assert.equal(service(buds, 'illegal-trade').status, 'unregulated');
  assert.equal(buds.risk.level, 'high');
});

test('mission parser accepts surface hauling destinations through the same validation path', () => {
  const parsed = parser.parseMissionText(`Surface hauling\ncollect HDMS-Bezdek 4scu etam\ndeliver Rayari Deltana 4scu etam`, catalog);
  assert.equal(parsed.missions.length, 1);
  assert.equal(parsed.missions[0].cargoLots[0].pickupLocationId, BEZDEK);
  assert.equal(parsed.missions[0].cargoLots[0].deliveryLocationId, DELTANA);
});
