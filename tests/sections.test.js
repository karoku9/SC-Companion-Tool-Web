'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pages = require('../product-pages.js');

test('the application exposes six primary workspaces and contextual secondary views', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ['route', 'missions', 'route-planner', 'map', 'hangar', 'roadmap'].forEach((id) => {
    assert.ok(pages.getPage(id), `missing registered page ${id}`);
  });
  ['route', 'missions', 'map', 'hangar', 'roadmap'].forEach((id) => assert.match(html, new RegExp(`data-view="${id}"`)));
  ['locations', 'changelog', 'cargo', 'load-operations'].forEach((id) => assert.ok(pages.getPage(id)?.parentView, `${id} must remain contextual`));
  assert.match(html, /id="product-navigation"/);
  assert.match(html, /product-pages\.js/);
  assert.match(html, /product-shell\.js/);
  assert.match(html, /sections\.js/);
  assert.match(html, /ui-v2\.css/);
  assert.doesNotMatch(html, /sections\.css/);
});
