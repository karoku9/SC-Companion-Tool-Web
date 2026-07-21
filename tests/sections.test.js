'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pages = require('../product-pages.js');

test('the application exposes separate low-clutter views through one registry', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ['route', 'locations', 'companion', 'roadmap'].forEach((id) => {
    assert.ok(pages.getPage(id), `missing registered page ${id}`);
    assert.match(html, new RegExp(`data-view="${id}"`));
  });
  assert.match(html, /id="product-navigation"/);
  assert.match(html, /product-pages\.js/);
  assert.match(html, /product-shell\.js/);
  assert.match(html, /sections\.js/);
  assert.match(html, /sections\.css/);
});
