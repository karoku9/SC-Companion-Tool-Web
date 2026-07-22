'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pages = require('../product-pages.js');
const catalog = require('../ship-catalog.js');
const roadmap = require('../roadmap.js');

const requiredPages = [
  'overview', 'missions', 'route', 'cargo', 'load-operations',
  'route-planner', 'map', 'locations', 'hangar', 'ship-catalog',
  'loadouts', 'trading', 'market-intel', 'history', 'companion',
  'settings', 'roadmap', 'changelog', 'automation'
];

test('product shell reserves every planned page with unique ids', () => {
  const ids = pages.pages.map((page) => page.id);
  assert.equal(ids.length, 19);
  assert.equal(new Set(ids).size, ids.length);
  requiredPages.forEach((id) => assert.ok(ids.includes(id), `missing page ${id}`));
  assert.equal(pages.defaultPageId, 'overview');
});

test('page statuses distinguish live, blueprint and deferred work', () => {
  assert.equal(pages.getPage('missions').status, 'live');
  assert.equal(pages.getPage('changelog').status, 'live');
  assert.equal(pages.getPage('route-planner').status, 'blueprint');
  assert.equal(pages.getPage('automation').status, 'later');
});

test('ship cargo zones are separable, layered and capacity-safe', () => {
  catalog.models.forEach((model) => {
    const zones = model.layout.zones;
    assert.ok(Array.isArray(zones) && zones.length > 1);
    assert.equal(zones.reduce((total, zone) => total + zone.capacityScu, 0), model.capacityScu);
    zones.forEach((zone) => {
      assert.ok(zone.layers > 0);
      assert.ok(zone.columns > 0);
      assert.equal(zone.separable, true);
    });
    assert.equal(model.layout.geometryStatus, 'concept');
  });
});

test('index loads the generated navigation shell before section routing', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /id="product-navigation"/);
  assert.match(html, /id="future-pages-root"/);
  assert.match(html, /src="product-pages\.js"/);
  assert.match(html, /src="product-shell\.js"/);
  assert.ok(html.indexOf('src="product-shell.js"') < html.indexOf('src="sections.js"'));
});

test('changelog markdown contains the current release and is loaded by the runtime', () => {
  const changelog = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.match(changelog, /## \[0\.7\.0\]/);
  assert.match(app, /changelog-view\.js/);
});

test('OCR and Game.log remain in the deferred automation phase', () => {
  const automation = roadmap.phases.find((phase) => phase.id === 'automation');
  assert.equal(automation.status, 'future');
  assert.equal(automation.items.find((item) => item.id === 'ocr').status, 'future');
  assert.equal(automation.items.find((item) => item.id === 'game-log').status, 'future');
});