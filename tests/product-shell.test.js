'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pages = require('../product-pages.js');
const catalog = require('../ship-catalog.js');
const roadmap = require('../roadmap.js');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('page registry and compatibility routes remain stable', () => {
  const ids = pages.pages.map((page) => page.id);
  assert.deepEqual(ids, ['route', 'missions', 'route-planner', 'map', 'hangar', 'roadmap']);
  assert.equal(pages.defaultPageId, 'route');
  assert.equal(pages.resolveView('cargo'), 'route');
  assert.equal(pages.resolveView('load-operations'), 'route');
  assert.equal(pages.resolveView('locations'), 'route-planner');
  assert.equal(pages.resolveView('changelog'), 'roadmap');
});

test('ship cargo geometry remains layered and capacity-safe', () => {
  catalog.models.forEach((model) => {
    assert.equal(model.layout.zones.reduce((sum, zone) => sum + zone.capacityScu, 0), model.capacityScu);
    model.layout.zones.forEach((zone) => {
      assert.ok(zone.layers > 0);
      assert.ok(zone.columns > 0);
      assert.equal(zone.separable, true);
    });
  });
  const corsair = catalog.getModel('drake-corsair');
  assert.equal(corsair.snapGrid.rows, 6);
  assert.equal(corsair.snapGrid.columns, 4);
  assert.equal(corsair.snapGrid.layers, 3);
  assert.equal(corsair.snapGrid.rows * corsair.snapGrid.columns * corsair.snapGrid.layers, 72);
});

test('design system, icons and shell load before application runtimes', () => {
  const html = read('index.html');
  const shell = read('product-shell.js');
  assert.match(html, /id="product-navigation"/);
  assert.match(html, /id="future-pages-root"/);
  assert.ok(html.indexOf('src="design-system.js"') < html.indexOf('src="mfd-icons.js"'));
  assert.ok(html.indexOf('src="mfd-icons.js"') < html.indexOf('src="product-pages.js"'));
  assert.match(shell, /SCCompanionMfdIcons/);
  assert.match(shell, /CORE 0\.25 · UI 0\.29\.2/);
});

test('Operations 0.40 connects the existing route, cargo, fleet and mission models', () => {
  const app = read('app.js');
  const operations = read('operations-rebuild-v040.js');
  const loader = read('operations-rebuild-v040-loader.js');
  const entry = read('ui-v2.css');

  ['fleet-loadouts.js', 'fleet-estimate-adapter.js', 'fleet-loadouts-view.js', 'official-universe-data.js', 'navigation-estimates.js', 'location-context.js', 'location-context-planner.js', 'cargo-zone-model.js', 'cargo-ship-grid-profile-v030.js', 'cargo-auto-layout-v0292.js', 'cargo-manual-layout-v030.js', 'cargo-manual-grid-view-v0301.js', 'route-session-planner.js', 'missions-focus-workflow.js', 'operations-rebuild-v040-loader.js'].forEach((file) => assert.match(app, new RegExp(file.replaceAll('.', '\\.'))));

  assert.doesNotMatch(app, /operational-ui-v025\.js|operations-exposure-intel\.js|operations-cargo-guidance-v0292\.js|ship-selector-sync\.js/);
  assert.doesNotMatch(entry, /operational-ui-v025\.css|operations-design-v027\.css|operations-flow-v028\.css|operations-single-screen|operations-readable-short-desktop|operations-spacing/);
  assert.match(loader, /operations-rebuild-v040\.css/);
  assert.match(loader, /operations-rebuild-v040\.js/);
  assert.match(operations, /renderTop/);
  assert.match(operations, /renderCargo/);
  assert.match(operations, /renderStep/);
  assert.match(operations, /renderTimeline/);
  assert.match(operations, /sessionPlanner\.plan/);
  assert.match(operations, /corrections\.changeOrder/);
  assert.match(operations, /operationalSteps\.completeCurrent/);
});

test('roadmap remains a product history rather than a UI implementation contract', () => {
  assert.equal(roadmap.currentVersion, '0.25');
  assert.equal(roadmap.releases.find((release) => release.version === '0.25').status, 'current');
});
