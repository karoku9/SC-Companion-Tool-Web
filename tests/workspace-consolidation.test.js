'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('secondary controls use focused drawers instead of permanent dashboard panels', () => {
  const ui = read('ui/app-shell.js');
  assert.match(ui, /routeDrawerMarkup/);
  assert.match(ui, /cargoDrawerMarkup/);
  assert.match(ui, /addShipDrawerMarkup/);
  assert.match(ui, /aria-modal="true"/);
});

test('Intel unifies location lookup and a separate starmap', () => {
  const ui = read('ui/app-shell.js');
  assert.match(ui, /Location Intel/);
  assert.match(ui, /Starmap/);
  assert.match(ui, /intelLocationsMarkup/);
  assert.match(ui, /intelMapMarkup/);
  assert.doesNotMatch(ui, /livePage[\s\S]{0,500}starmap/i);
});

test('Fleet is master-detail and distinguishes planning geometry', () => {
  const ui = read('ui/app-shell.js');
  const css = read('ui/app.css');
  assert.match(css, /\.fleet-layout[\s\S]*grid-template-columns: 300px/);
  assert.match(ui, /Saved ships/);
  assert.match(ui, /Active configuration/);
  assert.match(ui, /tool-defined planning aids/);
});
