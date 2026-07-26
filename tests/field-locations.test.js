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

test('field registry adds reviewed hauling outposts, Hathor sites and distribution centers', () => {
  assert.deepEqual(catalog.validation.errors, []);
  assert.deepEqual(catalog.validation.warnings, []);
  assert.deepEqual(catalog.getCoverageSummary(), {
    totalRecords: 152,
    operationalDestinations: 106,
    fieldDestinations: 72,
    bySystem: { stanton: 97, pyro: 8, nyx: 1 },
    reviewedAt: '2026-07-26',
    gameVersion: 'Alpha 4.9.x'
  });
  assert.equal(catalog.fieldLocations.filter((location) => location.type === 'outpost').length, 61);
  assert.equal(catalog.fieldLocations.filter((location) => location.type === 'distribution-center').length, 7);
  assert.equal(catalog.fieldLocations.filter((location) => location.facilityClass === 'orbital-laser-platform').length, 4);
});

test('field names and common compact forms resolve predictably', () => {
  assert.equal(catalog.searchOperationalLocations('HDMS Bezdek')[0]?.id, BEZDEK);
  assert.equal(catalog.searchOperationalLocations('Rayari Deltana')[0]?.id, DELTANA);
  assert.equal(catalog.searchOperationalLocations('Rayari Cantwell')[0]?.id, CANTWELL);
  assert.equal(catalog.searchOperationalLocations('S4LD01')[0]?.id, S4LD01);
  assert.equal(catalog.searchOperationalLocations('Buds Growery')[0]?.id, BUDS);
  assert.equal(catalog.searchOperationalLocations('Attritus PAF 3')[0]?.id, 'stanton-crusader-daymar-attritus-paf-iii');
  assert.equal(catalog.searchOperationalLocations('Vivere OLP')[0]?.id, 'stanton-hurston-aberdeen-vivere-olp');
});

test('every field destination has one complete service, risk and finite schematic profile', () => {
  assert.deepEqual(profiles.coverage, {
    operationalDestinations: 106,
    reviewedProfiles: 106,
    fieldProfiles: 72,
    complete: true,
    gameVersion: '4.9.0-LIVE.12232306',
    reviewedAt: '2026-07-26'
  });
  catalog.fieldLocations.forEach((location) => {
    const profile = profiles.getProfile(location.id);
    const anchor = starmap.getLocationAnchor(location.id);
    assert.ok(profile, `${location.id} lacks a profile`);
    assert.equal(profile.services.length, 12);
    assert.notEqual(profile.risk.level, 'unknown');
    assert.ok(anchor, `${location.id} lacks a Starmap anchor`);
    assert.ok(['schematic-surface-anchor', 'parent-verified-schematic-orbit'].includes(location.anchor.geometryStatus));
    [...anchor.position, ...anchor.distancePositionGm].forEach((value) => assert.ok(Number.isFinite(value)));
  });
});

test('outposts answer operational essentials without pretending to be full stations', () => {
  const bezdek = context.buildContext(BEZDEK, { asOf: '2026-07-26' });
  assert.equal(bezdek.location.type, 'outpost');
  assert.equal(bezdek.profile.classification, 'Surface industrial or research outpost');
  assert.equal(service(bezdek, 'landing-services').status, 'available');
  assert.equal(service(bezdek, 'food').status, 'not-available');
  assert.equal(service(bezdek, 'medical').status, 'not-available');
  assert.equal(service(bezdek, 'ground-vehicles').status, 'available');
  assert.equal(service(bezdek, 'commodity-trade').status, 'available');
  assert.equal(bezdek.risk.level, 'elevated');
});

test('distribution centers, Hathor facilities and outlaw sites retain distinct profiles', () => {
  const depot = context.buildContext(S4LD01, { asOf: '2026-07-26' });
  const buds = context.buildContext(BUDS, { asOf: '2026-07-26' });
  const paf = context.buildContext('stanton-crusader-daymar-attritus-paf-iii', { asOf: '2026-07-26' });
  const olp = context.buildContext('stanton-hurston-aberdeen-vivere-olp', { asOf: '2026-07-26' });
  assert.equal(service(depot, 'cargo-center').status, 'available');
  assert.equal(service(buds, 'illegal-trade').status, 'unregulated');
  assert.equal(paf.profile.classification, 'Hathor planetary alignment facility');
  assert.equal(olp.profile.classification, 'Hathor orbital laser platform');
  assert.equal(paf.risk.level, 'high');
});

test('mission parser accepts surface hauling destinations through the same validation path', () => {
  const parsed = parser.parseMissionText(`Surface hauling\ncollect HDMS-Bezdek 4scu etam\ndeliver Rayari Deltana 4scu etam`, catalog);
  assert.equal(parsed.missions.length, 1);
  assert.equal(parsed.missions[0].cargoLots[0].pickupLocationId, BEZDEK);
  assert.equal(parsed.missions[0].cargoLots[0].deliveryLocationId, DELTANA);
});
