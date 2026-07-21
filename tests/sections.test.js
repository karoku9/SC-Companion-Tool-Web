'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('the application exposes separate low-clutter views', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ['route', 'locations', 'companion', 'roadmap'].forEach((id) => {
    assert.match(html, new RegExp(`data-view="${id}"`));
    assert.match(html, new RegExp(`data-view-target="${id}"`));
  });
  assert.match(html, /sections\.js/);
  assert.match(html, /sections\.css/);
});
