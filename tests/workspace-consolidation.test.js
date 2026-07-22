'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('Operations owns compact moves, cargo, adjustment and route tools', () => {
  const html = read('index.html');
  const ui = read('ui-v2-operations.js');
  ['moves', 'cargo', 'adjust', 'route'].forEach((tool) => assert.match(html, new RegExp(`data-ops-tool="${tool}"`)));
  assert.match(ui, /openTool/);
  assert.match(ui, /closeTool/);
  assert.match(ui, /toolPanel\.hidden = false/);
  assert.match(ui, /toolPanel\.hidden = true/);
});

test('location intel, changelog and UI Kit become contextual content without old workspace shell', () => {
  const app = read('app.js');
  const ui = read('ui-v2-shell.js');
  assert.doesNotMatch(app, /workspace-shell\.js/);
  assert.match(ui, /contextual-location-intel/);
  assert.match(ui, /development-changelog/);
  assert.match(ui, /development-ui-kit/);
});

test('product shell creates only the live route planner host', () => {
  const shell = read('product-shell.js');
  assert.match(shell, /id="route-planner"/);
  assert.doesNotMatch(shell, /id="load-operations"/);
  ['overviewTemplate', 'shipCatalogTemplate', 'tradingTemplate', 'automationTemplate'].forEach((name) => assert.doesNotMatch(shell, new RegExp(name)));
});

test('cargo panels resolve saved ship zones and temporal cargo placement', () => {
  const ui = read('ui-v2-operations.js');
  assert.match(ui, /zoneModel\.resolveModel/);
  assert.match(ui, /planner\.planCargo/);
  assert.match(ui, /cargoLayout\.locateSlot/);
  assert.match(ui, /cargoZoneOverrides/);
});

test('primary action, route sequence and auxiliary tools have separate visual hierarchy', () => {
  const css = [read('ui-v2-operations.css'), read('ui-v2-workspaces.css')].join('\n');
  assert.match(css, /current-operation-panel/);
  assert.match(css, /route-sequence-panel/);
  assert.match(css, /tool-keys/);
  assert.match(css, /operation-primary strong/);
  assert.match(css, /operation-mission/);
});
