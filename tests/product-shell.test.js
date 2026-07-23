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

test('secondary links resolve into their parent workspace', () => {
  assert.equal(pages.resolveView('cargo'), 'route');
  assert.equal(pages.resolveView('load-operations'), 'route');
  assert.equal(pages.resolveView('locations'), 'route-planner');
  assert.equal(pages.resolveView('changelog'), 'roadmap');
  assert.equal(pages.resolveView('route-planner'), 'route-planner');
});

test('ship cargo zones remain separable, layered and capacity-safe', () => {
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

test('design system, icons and clean shell load before page routing', () => {
  const html = read('index.html');
  const shell = read('product-shell.js');
  assert.match(html, /id="product-navigation"/);
  assert.match(html, /id="future-pages-root"/);
  assert.ok(html.indexOf('src="design-system.js"') < html.indexOf('src="mfd-icons.js"'));
  assert.ok(html.indexOf('src="mfd-icons.js"') < html.indexOf('src="product-pages.js"'));
  assert.ok(html.indexOf('src="product-shell.js"') < html.indexOf('src="sections.js"'));
  assert.match(shell, /id="route-planner"/);
  assert.doesNotMatch(shell, /id="load-operations"/);
  assert.match(shell, /nav-glyph/);
  assert.match(shell, /SCCompanionMfdIcons/);
  assert.match(shell, /BUILD 0\.24/);
  assert.match(shell, /local image review/);
});

test('v0.24 keeps delivered runtimes and adds assisted OCR intake', () => {
  const app = read('app.js');
  const clean = read('ui-v2.js');
  const accessibility = read('ui-v2-accessibility.js');
  const validation = read('mission-validation.js');
  const context = read('location-context.js');
  const contextView = read('location-intel-view.js');
  const plannerContext = read('location-context-planner.js');
  const fleet = read('fleet-loadouts.js');
  const adapter = read('fleet-estimate-adapter.js');
  const fleetView = read('fleet-loadouts-view.js');
  const starmap = read('starmap-view.js');
  const locations = read('locations.js');
  const mapData = read('starmap-data.js');
  const entry = read('ui-v2.css');
  const gameLog = read('game-log-intake.js');
  const gameLogCorrelation = read('game-log-intake-correlation.js');
  const gameLogView = read('game-log-intake-view.js');
  const ocr = read('ocr-intake.js');
  const ocrView = read('ocr-intake-view.js');
  assert.equal(roadmap.currentVersion, '0.24');
  assert.match(app, /fleet-loadouts\.js/);
  assert.match(app, /fleet-estimate-adapter\.js/);
  assert.match(app, /fleet-loadouts-view\.js/);
  assert.match(app, /official-universe-data\.js/);
  assert.match(app, /navigation-estimates\.js/);
  assert.match(app, /location-context\.js/);
  assert.match(app, /location-context-planner\.js/);
  assert.match(app, /cargo-zone-model\.js/);
  assert.match(app, /ui-v2-accessibility\.js/);
  assert.match(app, /game-log-intake\.js/);
  assert.match(app, /game-log-intake-correlation\.js/);
  assert.match(app, /game-log-intake-view\.js/);
  assert.match(app, /ocr-intake\.js/);
  assert.match(app, /ocr-intake-view\.js/);
  assert.match(app, /SCCompanionCleanInterfaceReady/);
  assert.match(clean, /SCCompanionCleanInterfaceReady/);
  assert.match(accessibility, /activateDevelopmentTab/);
  assert.match(validation, /inspectMissionText/);
  assert.match(context, /exposureFor/);
  assert.match(contextView, /SOURCE LEDGER/);
  assert.match(plannerContext, /planner-location-context/);
  assert.match(fleet, /activeLoadoutByShip/);
  assert.match(fleet, /Imported configuration/);
  assert.match(adapter, /handlingTimeFactor/);
  assert.match(fleetView, /Ship loadouts/);
  assert.match(starmap, /CURRENT OBJECTIVE/);
  assert.match(starmap, /data-map-action="current"/);
  assert.match(locations, /operationalDestinations/);
  assert.match(locations, /validateCatalog/);
  assert.match(mapData, /registry\.locations/);
  assert.match(entry, /game-log-intake\.css/);
  assert.match(entry, /ocr-intake\.css/);
  assert.match(entry, /starmap-v2\.css/);
  assert.match(gameLog, /mergeImportedEvents/);
  assert.match(gameLogCorrelation, /nearest-preceding-contract-context/);
  assert.match(gameLogCorrelation, /normalizeStructuredFields/);
  assert.match(gameLogView, /showOpenFilePicker/);
  assert.match(gameLogView, /Load extracted draft into review/);
  assert.match(ocr, /inspectOcrText/);
  assert.match(ocr, /selectActionAnchors/);
  assert.match(ocrView, /TESSERACT_VERSION = '7\.0\.0'/);
  assert.match(ocrView, /Load OCR draft into review/);
  assert.doesNotMatch(app, /workspace-shell\.js/);
  assert.match(read('design-system.js'), /manufacturer: 'Drake Interplanetary'/);
});

test('OCR and hardening form the remaining pre-1.0 sequence', () => {
  const universe = roadmap.releases.find((release) => release.version === '0.22');
  const gameLog = roadmap.releases.find((release) => release.version === '0.23');
  const ocr = roadmap.releases.find((release) => release.version === '0.24');
  const hardening = roadmap.releases.find((release) => release.version === '0.25');
  assert.equal(universe.status, 'done');
  assert.match(universe.title, /Expanded universe data/i);
  assert.equal(gameLog.status, 'done');
  assert.match(gameLog.title, /Game\.log assisted intake/i);
  assert.equal(ocr.status, 'current');
  assert.match(ocr.title, /OCR assisted intake/i);
  assert.equal(hardening.status, 'next');
  assert.match(hardening.title, /Release hardening/i);
});
