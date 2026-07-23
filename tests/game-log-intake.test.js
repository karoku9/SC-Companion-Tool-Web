'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const core = require('../game-log-intake.js');
globalThis.SCCompanionGameLogIntake = core;
const intake = require('../game-log-intake-correlation.js');

const locations = [
  { id: 'pyro-checkmate', operational: true, name: 'Checkmate Station', contextName: 'Pyro', navigationTarget: 'Checkmate Station', aliases: ['checkmate'] },
  { id: 'pyro-ruin', operational: true, name: 'Ruin Station', contextName: 'Pyro', navigationTarget: 'Ruin Station', aliases: ['ruin'] },
  { id: 'nyx-levski', operational: true, name: 'Levski', contextName: 'Nyx', navigationTarget: 'Levski', aliases: ['levski nyx'] },
  { id: 'stanton-arcl2', operational: true, name: 'ARC-L2 Lively Pathway Station', contextName: 'Stanton', navigationTarget: 'ARC-L2 Lively Pathway Station', aliases: ['ARC-L2', 'Lively Pathway'] },
  { id: 'stanton-teasa', operational: true, name: 'Teasa Spaceport', contextName: 'Lorville', navigationTarget: 'Teasa Spaceport', aliases: ['teasa'] }
];

const locationModel = {
  locations,
  formatOperationalLabel(location) { return `${location.name} · ${location.contextName}`; },
  searchOperationalLocations(query, options = {}) {
    const normalized = core.normalize(query);
    return locations.filter((location) => [location.name, location.navigationTarget, ...(location.aliases ?? [])]
      .some((value) => core.normalize(value).includes(normalized) || normalized.includes(core.normalize(value))))
      .slice(0, options.limit ?? locations.length);
  }
};

function fixture(name) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
}

function readProject(name) {
  return fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
}

test('Game.log parser ignores unrelated notifications and keeps mission-bearing provenance', () => {
  // The UpdateNotificationItem envelope is observed in real Game.log output; the hauling payloads are synthetic parser fixtures.
  const events = intake.parseLines(fixture('game-log-hauling-envelope.log'), {
    sourceName: 'Game.log',
    baseLineNumber: 1,
    locationModel
  });

  assert.equal(events.length, 6);
  assert.equal(events.some((event) => event.message.includes('Medical Device')), false);
  assert.equal(events[0].title, 'Three-System Relay');
  assert.equal(events[0].timestamp, '2026-07-23T12:01:00.000Z');
  assert.equal(events[0].lineNumber, 2);
  assert.match(events[0].rawLine, /UpdateNotificationItem/);
});

test('Game.log parser reconstructs pickup and delivery candidates without bypassing review', () => {
  const events = intake.parseLines(fixture('game-log-hauling-envelope.log'), {
    sourceName: 'Game.log',
    baseLineNumber: 1,
    locationModel
  });
  const report = intake.buildDraft(events);

  assert.equal(report.summary.completeEventCount, 4);
  assert.equal(report.summary.unresolvedEventCount, 2);
  assert.equal(report.summary.missionCount, 2);
  assert.equal(report.summary.correlatedEventCount, 2);
  assert.match(report.draftText, /Three-System Relay/);
  assert.match(report.draftText, /pickup Checkmate Station 5scu medical-supplies/);
  assert.match(report.draftText, /deliver Ruin Station 5scu medical-supplies/);
  assert.match(report.draftText, /Refinery transfer/);
  assert.match(report.draftText, /collect ARC-L2 Lively Pathway Station 3scu titanium/);
  assert.match(report.draftText, /deliver Teasa Spaceport 3scu titanium/);

  const pickup = report.completeEvents.find((event) => event.location.id === 'pyro-checkmate');
  assert.equal(pickup.action, 'pickup');
  assert.equal(pickup.cargo.scu, 5);
  assert.equal(pickup.cargo.commodity, 'Medical Supplies');
  assert.equal(pickup.correlation.kind, 'nearest-preceding-contract-context');
  assert.match(pickup.rawLine, /Pick up 5 SCU/);
});

test('Partial mission events stay unresolved instead of receiving invented cargo', () => {
  const event = intake.parseLine(
    '<2026-07-23T12:01:10.000Z> [Notice] <UpdateNotificationItem> Notification "Deliver cargo to Levski." [43], Action: Add',
    { sourceName: 'Game.log', lineNumber: 7, locationModel }
  );

  assert.equal(event.status, 'partial');
  assert.equal(event.action, 'deliver');
  assert.equal(event.location.id, 'nyx-levski');
  assert.equal(event.cargo.scu, null);
  assert.equal(event.cargo.commodity, null);
});

test('Replay protection rejects already processed exact log lines', () => {
  const event = intake.parseLine(
    '<2026-07-23T12:01:02.000Z> Collect 5 SCU of Medical Supplies from Checkmate Station',
    { sourceName: 'Game.log', lineNumber: 1, locationModel }
  );
  const first = intake.mergeImportedEvents([], [event], []);
  const replay = intake.mergeImportedEvents(first.events, [event], first.processedIds);

  assert.equal(first.fresh.length, 1);
  assert.equal(replay.fresh.length, 0);
  assert.equal(replay.events.length, 1);
});

test('Game.log UI uses explicit file access, incremental offsets and the existing mission review', () => {
  const view = readProject('game-log-intake-view.js');
  const store = readProject('session-store.js');
  const css = readProject('game-log-intake.css');
  const app = readProject('app.js');

  assert.match(view, /showOpenFilePicker/);
  assert.match(view, /file\.slice\(startOffset\)/);
  assert.match(view, /previousSource\.offset/);
  assert.match(view, /processedIds/);
  assert.match(view, /rotationCount/);
  assert.match(view, /rawLine/);
  assert.match(view, /form\.requestSubmit\(\)/);
  assert.match(view, /never replaces the active route automatically/);
  assert.match(store, /gameLogImport/);
  assert.match(store, /normalizeGameLogImport/);
  assert.match(css, /\.game-log-event\.is-complete/);
  assert.match(app, /game-log-intake-correlation\.js/);
  assert.match(app, /game-log-intake-view\.js/);
});