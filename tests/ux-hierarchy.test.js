'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('operation hierarchy keeps cargo and destination above mission metadata', () => {
  const routeView = fs.readFileSync(path.join(__dirname, '..', 'route-view.js'), 'utf8');
  const loadView = fs.readFileSync(path.join(__dirname, '..', 'load-operations-view.js'), 'utf8');
  const corrections = fs.readFileSync(path.join(__dirname, '..', 'cargo-corrections-view.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'ux-hierarchy-v2.css'), 'utf8');

  assert.match(routeView, /operation-primary/);
  assert.match(routeView, /operation-mission/);
  assert.match(loadView, /move-primary/);
  assert.match(corrections, /planned \$\{lot\.plannedScu\} SCU/);
  assert.match(css, /\.operation-primary strong/);
  assert.match(css, /\.operation-mission/);
});
