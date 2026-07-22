'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const locations = require('../locations.js');
const validation = require('../mission-validation.js');
const missions = require('../missions.js');

const validText = `Mission Alpha
collect teasa 2scu etam
deliver area18 2scu etam

Mission Beta
pickup checkmate station 3scu neon
deliver levski 3scu neon`;

test('verified mission text produces a ready report with line provenance', () => {
  const report = validation.inspectMissionText(validText, locations);
  assert.equal(report.ready, true);
  assert.equal(report.status, 'ready');
  assert.equal(report.blockingIssues.length, 0);
  assert.equal(report.missions.length, 2);
  assert.equal(report.summary.cargoLotCount, 2);
  assert.equal(report.missions[0].cargoLots[0].source.pickupLine, 2);
  assert.equal(report.missions[0].cargoLots[0].source.deliveryLine, 3);
  assert.equal(report.missions[0].source.originalText, validText);
});

test('unknown locations block generation until explicitly confirmed', () => {
  const text = `Mission Remote
collect hidden depot 2scu etam
deliver area18 2scu etam`;
  const blocked = validation.inspectMissionText(text, locations);
  const unknown = blocked.entries.find((entry) => entry.kind === 'action' && entry.rawLocation === 'hidden depot');
  assert.equal(blocked.ready, false);
  assert.ok(blocked.blockingIssues.some((item) => item.code === 'unverified-location'));

  const confirmed = validation.inspectMissionText(text, locations, {
    confirmedCustomLocations: { [unknown.key]: 'hidden depot' }
  });
  assert.equal(confirmed.ready, true);
  assert.ok(confirmed.warnings.some((item) => item.code === 'custom-location'));
  assert.equal(confirmed.missions[0].cargoLots[0].pickupLocationId, 'custom-hidden-depot');
});

test('ambiguous location text requires a specific destination', () => {
  const report = validation.inspectMissionText(`Mission Ambiguous
collect pyro 2scu etam
deliver area18 2scu etam`, locations);
  const issue = report.blockingIssues.find((item) => item.code === 'ambiguous-location');
  assert.ok(issue);
  assert.ok(issue.suggestions.length >= 2);
  assert.equal(report.ready, false);
});

test('action typos are surfaced with a correction suggestion instead of becoming titles', () => {
  const report = validation.inspectMissionText(`Mission Typo
collect teasa 2scu etam
delver area18 2scu etam`, locations);
  const issue = report.blockingIssues.find((item) => item.code === 'unknown-action');
  assert.ok(issue);
  assert.deepEqual(issue.suggestions, ['deliver']);
  assert.equal(report.summary.missionCount, 1);
});

test('unparsed cargo and unmatched deliveries are blocking', () => {
  const malformed = validation.inspectMissionText(`Mission Cargo
collect teasa 2scu etam extra words
deliver area18 2scu etam`, locations);
  assert.ok(malformed.blockingIssues.some((item) => item.code === 'unparsed-cargo'));

  const unmatched = validation.inspectMissionText(`Mission Cargo
collect teasa 1scu etam
deliver area18 2scu etam`, locations);
  assert.ok(unmatched.blockingIssues.some((item) => item.code === 'unmatched-delivery'));
  assert.equal(unmatched.ready, false);
});

test('review serialization produces deterministic parser text', () => {
  const text = validation.serializeReview([
    {
      title: 'Mission Corrected',
      objectives: [
        { action: 'collect', location: 'Teasa', cargo: '2scu etam' },
        { action: 'deliver', location: 'Area18', cargo: '2scu etam' }
      ]
    }
  ]);
  assert.equal(text, `Mission Corrected
collect Teasa 2scu etam
deliver Area18 2scu etam`);
  assert.equal(validation.inspectMissionText(text, locations).ready, true);
});

test('validated provenance survives mission normalization and route operations', () => {
  const report = validation.inspectMissionText(validText, locations);
  const operations = missions.buildOperations(report.missions);
  const pickup = operations.find((operation) => operation.type === 'collect');
  const delivery = operations.find((operation) => operation.type === 'delivery');
  assert.equal(pickup.sourceLine, 2);
  assert.equal(delivery.sourceLine, 3);
  assert.equal(pickup.missionSource.titleLine, 1);
  assert.ok(Number.isFinite(pickup.confidence));
});

test('snapshot keeps original and reviewed text separate', () => {
  const report = validation.inspectMissionText(validText, locations);
  const snapshot = validation.snapshot(report, 'raw source', validText);
  assert.equal(snapshot.sourceText, 'raw source');
  assert.equal(snapshot.reviewedText, validText);
  assert.equal(snapshot.status, 'ready');
  assert.equal(snapshot.summary.missionCount, 2);
});
