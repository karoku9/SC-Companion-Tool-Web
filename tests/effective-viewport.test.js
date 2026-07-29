'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('Live Ops fits short desktop viewports without scaling the document', () => {
  const css = read('ui/app.css');
  assert.match(css, /@media \(min-width: 821px\) and \(max-height: 820px\)/);
  assert.match(css, /\.workspace\.live-workspace/);
  assert.match(css, /width: clamp\(280px, 58%, 360px\)/);
  assert.match(css, /max-width: 100%/);
  assert.equal(css.match(/font-size: clamp\(32px, 3vw, 44px\)/g)?.length, 2);
  assert.match(css, /\.command-panel, \.cargo-panel \{ min-height: 300px/);
  assert.match(css, /\.route-step \{ min-height: 72px/);
  assert.match(css, /aspect-ratio: 1 \/ 1/);
  assert.match(css, /\.execution-bar[\s\S]*position: fixed/);
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
  assert.match(css, /min-height: 64px/);
});
