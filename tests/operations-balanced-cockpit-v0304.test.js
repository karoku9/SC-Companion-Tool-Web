'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('Operations 0.40 replaces the retired balanced-cockpit patch', () => {
  const app = read('app.js');
  const ui = read('operations-rebuild-v040.js');
  const css = read('operations-rebuild-v040.css');

  assert.match(app, /operations-rebuild-v040-loader\.js/);
  assert.doesNotMatch(app, /operations-adaptive-fit-v0303\.js|operations-balanced-cockpit-v0304\.js/);
  assert.match(ui, /ops40-cargo-workspace/);
  assert.match(ui, /ops40-cargo-manifest/);
  assert.match(ui, /ops40-step-panel/);
  assert.match(ui, /ops40-timeline-panel/);
  assert.match(css, /\.ops40-cargo-workspace[\s\S]*grid-template-rows:\s*minmax\(0, 1fr\) 58px/);
  assert.match(css, /\.ops40-cargo-manifest[\s\S]*display:\s*flex/);
  assert.match(css, /\.ops40-upcoming[\s\S]*margin-top:\s*auto/);
  assert.match(css, /\.ops40-stop[\s\S]*min-width:\s*230px/);
  assert.match(css, /content:\s*"UI 0\.40"/);
});
