'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const locations = require('../locations.js');
const profiles = require('../location-profiles.js');
require('../official-universe-data.js');
require('../starmap-data.js');
const contextModel = require('../location-context.js');

const TEASA = 'stanton-hurston-lorville-teasa';
const AREA18 = 'stanton-arccorp-area18-riker';
const ARC_L2 = 'stanton-arc-l2-lively-pathway';
const GRIM_HEX = 'stanton-crusader-yela-grim-hex';
const CHECKMATE = 'pyro-monox-checkmate';
const LEVSKI = 'nyx-delamar-levski';

function service(context, id) {
  return context.services.find((item) => item.id === id);
}

test('freshness uses explicit dates and never depends on hidden current time in tests', () => {
  assert.deepEqual(contextModel.assessFreshness('2026-07-21', '2026-07-22'), {
    state: 'fresh', ageDays: 1, label: 'Reviewed 1 day ago'
  });
  assert.equal(contextModel.assessFreshness('2026-05-01', '2026-07-22').state, 'aging');
  assert.equal(contextModel.assessFreshness('2025-12-01', '2026-07-22').state, 'stale');
  assert.equal(contextModel.assessFreshness('', '2026-07-22').state, 'unknown');
});

test('every operational destination has a complete reviewed service and static-risk profile', () => {
  const operational = locations.locations.filter((location) => location.operational);
  assert.deepEqual(profiles.coverage, {
    operationalDestinations: 34,
    reviewedProfiles: 34,
    complete: true,
    gameVersion: '4.9.0-LIVE.12232306',
    reviewedAt: '2026-07-23'
  });
  operational.forEach((location) => {
    const profile = profiles.getProfile(location.id);
    const context = contextModel.buildContext(location.id, { asOf: '2026-07-23' });
    assert.ok(profile, `${location.id} has no facility profile`);
    assert.equal(context.services.length, contextModel.SERVICE_CATALOG.length);
    assert.notEqual(context.risk.level, 'unknown', `${location.id} has unknown baseline risk`);
    assert.notEqual(service(context, 'food').status, 'unavailable-data', `${location.id} has no food answer`);
    assert.notEqual(service(context, 'landing-services').status, 'unavailable-data', `${location.id} has no fuel/repair answer`);
    assert.ok(context.facts.some((fact) => fact.id === 'classification' && fact.value !== 'Unavailable'));
    assert.ok(context.sources.some((source) => source.authority === 'community' || source.authority === 'game-data'));
    assert.equal(context.dataBoundary.liveTelemetry, false);
  });
});

test('major stations expose direct practical answers rather than generic unavailable cards', () => {
  const teasa = contextModel.buildContext(TEASA, { asOf: '2026-07-23' });
  const arcL2 = contextModel.buildContext(ARC_L2, { asOf: '2026-07-23' });
  const grim = contextModel.buildContext(GRIM_HEX, { asOf: '2026-07-23' });
  const checkmate = contextModel.buildContext(CHECKMATE, { asOf: '2026-07-23' });
  const levski = contextModel.buildContext(LEVSKI, { asOf: '2026-07-23' });

  assert.equal(service(teasa, 'food').status, 'available');
  assert.equal(service(teasa, 'landing-services').status, 'available');
  assert.equal(service(teasa, 'medical').status, 'local-transfer');
  assert.equal(teasa.risk.level, 'low');

  assert.equal(service(arcL2, 'food').status, 'available');
  assert.equal(service(arcL2, 'landing-services').status, 'available');
  assert.equal(service(arcL2, 'refinery').status, 'available');
  assert.equal(arcL2.risk.level, 'guarded');

  assert.equal(service(grim, 'medical').status, 'available');
  assert.equal(service(grim, 'illegal-trade').status, 'available');
  assert.equal(grim.risk.level, 'high');

  assert.equal(service(checkmate, 'food').status, 'available');
  assert.equal(service(checkmate, 'landing-services').status, 'available');
  assert.equal(service(checkmate, 'illegal-trade').status, 'unregulated');
  assert.equal(checkmate.risk.level, 'extreme');

  assert.equal(service(levski, 'refinery').status, 'available');
  assert.equal(service(levski, 'ground-vehicles').status, 'available');
  assert.equal(levski.risk.level, 'elevated');
});

test('official facts, reviewed services and derived risk remain separately labelled', () => {
  const context = contextModel.buildContext(TEASA, { asOf: '2026-07-23' });
  assert.equal(context.confidence.level, 'official-current');
  assert.equal(context.system.id, 'stanton');
  assert.ok(context.sources.some((source) => source.authority === 'official'));
  assert.ok(context.sources.some((source) => source.authority === 'community'));
  assert.ok(context.sources.some((source) => source.authority === 'game-data'));
  assert.equal(service(context, 'hangars').sourceKind, 'community-reviewed');
  assert.equal(context.risk.sourceKind, 'reviewed-static-location-guidance');
  assert.equal(context.exposure.sourceKind, 'derived-operational-guidance');
});

test('cargo exposure combines onboard cargo with the specific destination profile', () => {
  const clear = contextModel.exposureFor(CHECKMATE, { onboardScu: 0 });
  const stanton = contextModel.exposureFor(AREA18, { onboardScu: 4 });
  const pyro = contextModel.exposureFor(CHECKMATE, { onboardScu: 4 });
  const nyx = contextModel.exposureFor(LEVSKI, { onboardScu: 4 });
  const custom = contextModel.exposureFor('custom-hidden-depot', { onboardScu: 4 });

  assert.equal(clear.level, 'clear');
  assert.equal(stanton.level, 'controlled');
  assert.equal(pyro.level, 'high-exposure');
  assert.equal(nyx.level, 'caution');
  assert.equal(custom.level, 'unknown');
  assert.match(pyro.reasons.join(' '), /4 SCU/);
  assert.match(pyro.reasons.join(' '), /Extreme frontier exposure/);
  [clear, stanton, pyro, nyx, custom].forEach((exposure) => {
    assert.equal('riskScore' in exposure, false);
    assert.equal(typeof exposure.level, 'string');
    assert.ok(exposure.reasons.length > 0);
  });
});

test('cargo placement compatibility consumes specific destination risk without exposing a fake score', () => {
  assert.equal(contextModel.placementPriority(AREA18), 0);
  assert.equal(contextModel.placementPriority(ARC_L2), 0);
  assert.equal(contextModel.placementPriority(LEVSKI), 1);
  assert.equal(contextModel.placementPriority(GRIM_HEX), 3);
  assert.equal(contextModel.placementPriority(CHECKMATE), 3);
  assert.equal(contextModel.placementPriority('custom-hidden-depot'), 2);
  const context = contextModel.buildContext(CHECKMATE, { onboardScu: 4, asOf: '2026-07-23' });
  assert.equal('placementPriority' in context, false);
  assert.equal('riskScore' in context, false);
});

test('source ledger preserves official, community and unpacked-game-data provenance', () => {
  const checkmate = contextModel.buildContext(CHECKMATE, { asOf: '2026-07-23' });
  const officialSource = checkmate.sources.find((source) => source.id === 'rsi-checkmate');
  const wikiSource = checkmate.sources.find((source) => source.id === 'sctools-pyro-monox-checkmate');
  const gameDataSource = checkmate.sources.find((source) => source.id === 'scunpacked-starmap-4-9');
  assert.ok(officialSource);
  assert.ok(wikiSource);
  assert.ok(gameDataSource);
  assert.equal(officialSource.authority, 'official');
  assert.equal(wikiSource.authority, 'community');
  assert.equal(gameDataSource.authority, 'game-data');
  assert.equal(officialSource.reviewedAt, '2026-07-23');
  assert.match(officialSource.url, /^https:\/\/robertsspaceindustries\.com\//);
});
