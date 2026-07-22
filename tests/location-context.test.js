'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('../locations.js');
require('../location-profiles.js');
require('../official-universe-data.js');
require('../starmap-data.js');
const contextModel = require('../location-context.js');

const TEASA = 'stanton-hurston-lorville-teasa';
const AREA18 = 'stanton-arccorp-area18-riker';
const CHECKMATE = 'pyro-monox-checkmate';
const LEVSKI = 'nyx-delamar-levski';

test('freshness uses explicit dates and never depends on hidden current time in tests', () => {
  assert.deepEqual(contextModel.assessFreshness('2026-07-21', '2026-07-22'), {
    state: 'fresh', ageDays: 1, label: 'Reviewed 1 day ago'
  });
  assert.equal(contextModel.assessFreshness('2026-05-01', '2026-07-22').state, 'aging');
  assert.equal(contextModel.assessFreshness('2025-12-01', '2026-07-22').state, 'stale');
  assert.equal(contextModel.assessFreshness('', '2026-07-22').state, 'unknown');
});

test('official location facts and reviewed service data remain separate', () => {
  const context = contextModel.buildContext(TEASA, { asOf: '2026-07-22' });
  assert.equal(context.confidence.level, 'official-current');
  assert.equal(context.system.id, 'stanton');
  assert.ok(context.sources.some((source) => source.authority === 'official'));
  assert.ok(context.sources.some((source) => source.authority === 'community'));
  assert.equal(context.services.find((service) => service.id === 'hangars').sourceKind, 'community-reviewed');
  assert.equal(context.services.find((service) => service.id === 'hangars').status, 'available');
  assert.equal(context.dataBoundary.liveTelemetry, false);
});

test('locations without reviewed facility profiles expose missing data rather than invented services', () => {
  const context = contextModel.buildContext(CHECKMATE, { asOf: '2026-07-22' });
  assert.equal(context.confidence.level, 'official-current');
  assert.equal(context.system.id, 'pyro');
  assert.ok(context.sources.some((source) => source.url?.includes('robertsspaceindustries.com')));
  assert.ok(context.services.every((service) => service.status === 'unavailable-data'));
  assert.ok(context.unavailable.some((message) => /No reviewed facility profile/.test(message)));
  assert.ok(context.unavailable.some((message) => /service records/.test(message)));
});

test('cargo exposure is categorical and derived from onboard cargo plus official system context', () => {
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
  assert.match(pyro.reasons.join(' '), /Pyro/);
  [clear, stanton, pyro, nyx, custom].forEach((exposure) => {
    assert.equal('riskScore' in exposure, false);
    assert.equal(typeof exposure.level, 'string');
    assert.ok(exposure.reasons.length > 0);
  });
});

test('cargo placement compatibility derives a private priority without exposing it as context truth', () => {
  assert.equal(contextModel.placementPriority(AREA18), 0);
  assert.equal(contextModel.placementPriority(LEVSKI), 1);
  assert.equal(contextModel.placementPriority(CHECKMATE), 3);
  assert.equal(contextModel.placementPriority('custom-hidden-depot'), 2);
  const context = contextModel.buildContext(CHECKMATE, { onboardScu: 4, asOf: '2026-07-22' });
  assert.equal('placementPriority' in context, false);
  assert.equal('riskScore' in context, false);
});

test('source ledger preserves authority, review date and link provenance', () => {
  const checkmate = contextModel.buildContext(CHECKMATE, { asOf: '2026-07-22' });
  const officialSource = checkmate.sources.find((source) => source.id === 'rsi-checkmate');
  assert.ok(officialSource);
  assert.equal(officialSource.authority, 'official');
  assert.equal(officialSource.reviewedAt, '2026-07-22');
  assert.match(officialSource.url, /^https:\/\/robertsspaceindustries\.com\//);
});
