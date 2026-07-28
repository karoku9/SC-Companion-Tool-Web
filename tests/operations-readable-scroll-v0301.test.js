'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('Operations 0.40 keeps cargo primary in one desktop viewport', () => {
  const app = read('app.js');
  const loader = read('operations-rebuild-v040-loader.js');
  const ui = read('operations-rebuild-v040.js');
  const css = read('operations-rebuild-v040.css');

  assert.match(app, /operations-rebuild-v040-loader\.js/);
  assert.doesNotMatch(app, /operations-cargo-primary-v0302\.js|operations-adaptive-fit-v0303\.js|ship-selector-sync\.js/);
  assert.match(loader, /operations-rebuild-v040\.css/);
  assert.match(ui, /ops40-main/);
  assert.match(ui, /ops40-cargo-panel/);
  assert.match(ui, /ops40-step-panel/);
  assert.doesNotMatch(ui, /ops-live-navigation|ops-live-map/);

  assert.match(css, /\.ops40-shell[\s\S]*grid-template-rows/);
  assert.match(css, /\.ops40-main[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(var\(--ops40-side\), \.62fr\)/);
  assert.match(css, /\.ops40-cargo-panel[\s\S]*grid-template-rows:\s*42px minmax\(0, 1fr\)/);
  assert.match(css, /\.ops40-step-panel[\s\S]*grid-template-rows:\s*42px minmax\(0, 1fr\) 50px/);
  assert.match(css, /\.ops40-timeline-panel[\s\S]*grid-template-rows:\s*38px minmax\(0, 1fr\)/);
});

test('Operations 0.40 uses natural vertical flow on small screens', () => {
  const css = read('operations-rebuild-v040.css');

  assert.match(css, /@media \(max-width: 1279px\), \(max-height: 679px\)/);
  assert.match(css, /html\[data-active-view="route"\][\s\S]*height:\s*auto[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.ops40-shell[\s\S]*grid-template-rows:\s*auto auto auto auto auto/);
  assert.match(css, /\.ops40-main[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
});
