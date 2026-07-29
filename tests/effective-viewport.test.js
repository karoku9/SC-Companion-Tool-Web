'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('Live Ops fits short desktop viewports without scaling the document', () => {
  const css = read('ui/app.css');
  const shell = read('ui/app-shell.js');
  assert.match(css, /@media \(min-width: 1024px\) and \(min-height: 700px\) and \(max-height: 850px\)/);
  assert.match(css, /height: 100dvh/);
  assert.match(css, /grid-template-rows: auto minmax\(0, 1fr\) auto auto/);
  assert.match(css, /width: clamp\(280px, 58%, 360px\)/);
  assert.match(css, /max-width: 100%/);
  assert.equal(css.match(/font-size: clamp\(32px, 3vw, 44px\)/g)?.length, 2);
  assert.match(css, /\.cargo-grid\.is-foldable/);
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) 10px repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.route-step \{ min-height: 68px/);
  assert.match(css, /aspect-ratio: 1 \/ 1/);
  assert.match(css, /\.app-shell\.is-live-active \.execution-bar \{[\s\S]*position: static/);
  assert.match(shell, /class="app-shell\$\{liveViewport \? ' is-live-active' : ''\}"/);
  assert.match(shell, /--fold-row:\$\{foldedRow\};--fold-column:\$\{foldedColumn\}/);
  assert.match(shell, /data-cargo-coordinate=/);
  assert.doesNotMatch(css, /transform:\s*scale|zoom\s*:/);
});

test('tablet and mobile use natural flow and a dedicated bottom navigation', () => {
  const css = read('ui/app.css');
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /\.primary-nav \{ grid-template-columns: repeat\(5, 1fr\)/);
  assert.match(css, /\.live-grid \.command-panel \{ order: 1/);
  assert.match(css, /\.live-grid \.cargo-panel \{ order: 2/);
  assert.match(css, /\.cargo-disclosure > summary \{ display: flex/);
  assert.doesNotMatch(css, /\.live-grid \.cargo-panel \.cargo-hold \{ display: none/);
  assert.match(css, /\.execution-bar \{ position: fixed; left: 0/);
  assert.match(css, /min-height: 64px/);
});
