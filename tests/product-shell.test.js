'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pages = require('../product-pages.js');
const catalog = require('../ship-catalog.js');
const roadmap = require('../roadmap.js');

const visiblePages = ['route', 'missions', 'route-planner', 'map', 'hangar', 'roadmap'];

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('primary navigation contains only six focused workspaces', () => {
  const ids = pages.pages.map((page) => page.id);
  assert.deepEqual(ids, visiblePages);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(pages.defaultPageId, 'route');
  assert.equal(pages.groups.length, 3);
  pages.pages.forEach((page) => {
    assert.ok(page.icon);
    assert.ok(page.hint);
  });
});

test('secondary tools resolve into their parent workspace', () => {
  assert.equal(pages.resolveView('cargo'), 'route');
  assert.equal(pages.resolveView('load-operations'), 'route');
  assert.equal(pages.resolveView('locations'), 'route-planner');
  assert.equal(pages.resolveView('changelog'), 'roadmap');
  assert.equal(pages.resolveView('route-planner'), 'route-planner');
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

test('dynamic hosts are created before section routing', () => {
  const html = read('index.html');
  const shell = read('product-shell.js');
  assert.match(html, /id="product-navigation"/);
  assert.match(html, /id="future-pages-root"/);
  assert.ok(html.indexOf('src="product-shell.js"') < html.indexOf('src="sections.js"'));
  assert.match(shell, /id="route-planner"/);
  assert.match(shell, /id="load-operations"/);
  assert.match(shell, /nav-glyph/);
  assert.match(shell, /nav-copy/);
});

test('v0.11 interface rebuild and existing workspace runtimes are registered', () => {
  const changelog = read('CHANGELOG.md');
  const app = read('app.js');
  assert.match(changelog, /## \[0\.11\.0\]/);
  assert.equal(roadmap.currentVersion, '0.11');
  assert.match(app, /cargo-zone-model\.js/);
  assert.match(app, /workspace-shell\.js/);
  assert.match(app, /ui-rebuild\.css/);
  assert.match(app, /ui-rebuild\.js/);
});

test('assisted OCR and Game.log intake remain after the current release', () => {
  const assisted = roadmap.releases.find((release) => release.version === '0.19');
  assert.equal(assisted.status, 'future');
  assert.ok(assisted.changes.some((change) => /OCR/.test(change)));
  assert.ok(assisted.changes.some((change) => /Game\.log/.test(change)));
});
