'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('operational text stays readable and only the route rail scrolls horizontally', () => {
  const css = read('ui/app.css');
  assert.match(css, /font-size: 14px/);
  assert.match(css, /\.eyebrow[\s\S]*font-size: 11px/);
  assert.match(css, /\.route-rail-list[\s\S]*overflow-x: auto/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.doesNotMatch(css, /font(?:-size)?:[^;]*(?:9px|10px)/);
});
