'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('mobile navigation fits all six workspaces without an internal horizontal rail', () => {
  const css = read('ui-v2-responsive.css');
  assert.match(css, /product-navigation \{ overflow-x: hidden/);
  assert.match(css, /product-navigation button \{ flex: 1 1 0; min-width: 0/);
  assert.match(css, /product-navigation \.nav-copy \{ display: none/);
});

test('mobile cargo-zone editing uses stacked cards instead of the desktop minimum width', () => {
  const css = read('ui-v2-responsive.css');
  assert.match(css, /Cargo zones become stacked editing cards/);
  assert.match(css, /\.zone-form \{ overflow: visible/);
  assert.match(css, /\.zone-form-row \{[\s\S]*min-width: 0;[\s\S]*grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.zone-form-row label:nth-child\(1\)/);
  assert.match(css, /\.zone-form-row button \{ grid-column: 1 \/ -1/);
});

test('mobile interaction contract overrides smaller workspace-specific controls', () => {
  const css = read('design-system-legibility.css');
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /min-height: 44px !important/);
  assert.match(css, /\.app-frame \.icon-button \{ min-width: 44px/);
});
