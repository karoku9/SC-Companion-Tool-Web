'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('Operations 0.40 fits a normal desktop viewport without whole-page scaling', () => {
  const app = read('app.js');
  const loader = read('operations-rebuild-v040-loader.js');
  const css = read('operations-rebuild-v040.css');

  assert.match(app, /operations-rebuild-v040-loader\.js/);
  assert.match(loader, /operations-rebuild-v040\.css/);
  assert.match(css, /\.ops40-shell[\s\S]*height:\s*100dvh/);
  assert.match(css, /grid-template-rows:\s*var\(--ops40-top\) var\(--ops40-sessions\) minmax\(0, 1fr\) var\(--ops40-timeline\) var\(--ops40-dock\)/);
  assert.match(css, /\.ops40-main[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(var\(--ops40-side\), \.62fr\)/);
  assert.match(css, /html\[data-active-view="route"\][\s\S]*overflow:\s*hidden/);
  assert.doesNotMatch(css, /transform:\s*scale|zoom:/);
});

test('Operations 0.40 falls back to natural flow when the viewport is genuinely small', () => {
  const css = read('operations-rebuild-v040.css');

  assert.match(css, /@media \(max-width: 1279px\), \(max-height: 679px\)/);
  assert.match(css, /\.ops40-shell[\s\S]*height:\s*auto[\s\S]*min-height:\s*100dvh/);
  assert.match(css, /\.ops40-main[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /overflow-y:\s*auto/);
});
