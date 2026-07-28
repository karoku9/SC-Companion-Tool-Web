'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('Contracts is a guided acquire, resolve and configure flow', () => {
  const ui = read('ui/app-shell.js');
  ['acquire', 'resolve', 'configure'].forEach((stage) => assert.match(ui, new RegExp(`'${stage}'`)));
  assert.match(ui, /Mission index/);
  assert.match(ui, /Need attention/);
  assert.match(ui, /Configure route/);
  assert.match(ui, /Build plan/);
});

test('Plan compares sessions by operational outcomes', () => {
  const ui = read('ui/app-shell.js');
  ['Travel', 'Route', 'Missions', 'Operations', 'Peak cargo'].forEach((label) => assert.match(ui, new RegExp(label)));
  assert.match(ui, /Start \$\{escapeHtml\(selected\.title\)\}/);
  assert.match(ui, /sessionPlanner\.plan/);
});

test('Live Ops connects action, cargo, physical grid and route progress', () => {
  const ui = read('ui/app-shell.js');
  assert.match(ui, /commandButtonLabel/);
  assert.match(ui, /cargoGridMarkup/);
  assert.match(ui, /currentKeys\.has\(key\)/);
  assert.match(ui, /operational\.completeCurrent/);
  assert.match(ui, /operational\.previous/);
  assert.match(ui, /Route orientation/);
  assert.match(ui, /Edit grid/);
});

test('manual cargo editing preserves move, assign, reserve, empty, clear and reset', () => {
  const ui = read('ui/app-shell.js');
  ['toggleReserved', 'toggleEmpty', 'clearCell', 'assignGroup', 'moveCell', 'reset'].forEach((method) => assert.match(ui, new RegExp(`cargoLayout\\.${method}`)));
  assert.match(ui, /\$\{model\.snapGrid\.rows\} × \$\{model\.snapGrid\.columns\}/);
  assert.match(ui, /Rows display/);
  assert.match(ui, /not an official blueprint/);
});
