'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function cleanCss() {
  return ['design-system-legibility.css', 'mission-validation.css', 'game-log-intake.css', 'ocr-intake.css', 'location-context.css', 'location-context-adapters.css', 'fleet-loadouts.css', 'starmap-v2.css', 'ui-v2-shell.css', 'ui-v2-operations.css', 'ui-v2-workspaces.css', 'ui-v2-responsive.css', 'operational-ui-v025.css', 'operational-ui-legibility.css', 'operations-readable-short-desktop-v0291.css'].map(read).join('\n');
}

test('clean interface scripts remain valid JavaScript', () => {
  ['app.js', 'ui-v2.js', 'ui-v2-operations.js', 'ui-v2-shell.js', 'ui-v2-accessibility.js', 'mfd-icons.js', 'product-shell.js', 'mission-validation.js', 'mission-view.js', 'game-log-intake.js', 'game-log-intake-correlation.js', 'game-log-intake-view.js', 'ocr-intake.js', 'ocr-intake-view.js', 'location-context.js', 'location-context-planner.js', 'location-intel-view.js', 'fleet-loadouts.js', 'fleet-estimate-adapter.js', 'fleet-loadouts-view.js', 'route-view.js', 'hangar-view.js', 'starmap-view.js', 'focused-route-optimizer.js', 'route-session-planner.js', 'missions-focus-workflow.js', 'operational-ui-v025.js'].forEach((file) => {
    assert.doesNotThrow(() => new Function(read(file)), `${file} contains invalid JavaScript`);
  });
});

test('clean UI replaces accumulated layout layers rather than overriding them', () => {
  const html = read('index.html');
  const app = read('app.js');
  const entry = read('ui-v2.css');
  assert.match(html, /href="design-system\.css\?v=0\.29\.1"/);
  assert.match(html, /href="ui-v2\.css\?v=0\.29\.1"/);
  assert.match(entry, /mission-validation\.css/);
  assert.match(entry, /game-log-intake\.css/);
  assert.match(entry, /ocr-intake\.css/);
  assert.match(entry, /location-context\.css/);
  assert.match(entry, /location-context-adapters\.css/);
  assert.match(entry, /fleet-loadouts\.css/);
  assert.match(entry, /design-system-legibility\.css/);
  assert.match(entry, /starmap-v2\.css/);
  assert.match(entry, /operational-ui-v025\.css/);
  assert.match(entry, /operational-ui-legibility\.css/);
  assert.match(entry, /operations-readable-short-desktop-v0291\.css/);
  assert.doesNotMatch(html, /styles\.css|workspace-consolidation\.css|ui-rebuild\.css|drake-mfd\.css|mfd-layout-v2\.css/);
  assert.doesNotMatch(app, /workspace-shell\.js|ui-rebuild\.js|mfd-layout-v2\.js|ux-shell\.js/);
});

test('Operations uses one primary display, one route index and native auxiliary tools', () => {
  const html = read('index.html');
  const ui = read('ui-v2-operations.js');
  const css = cleanCss();
  assert.match(html, /current-operation-panel/);
  assert.match(html, /route-sequence-panel/);
  ['moves', 'cargo', 'adjust', 'route'].forEach((tool) => assert.match(html, new RegExp(`data-ops-tool="${tool}"`)));
  assert.doesNotMatch(html, /id="load-operations"|data-view="cargo"/);
  assert.match(ui, /renderMoves/);
  assert.match(ui, /renderCargo/);
  assert.match(ui, /renderAdjust/);
  assert.match(ui, /renderRoute/);
  assert.match(ui, /locationContext\.placementPriority/);
  assert.match(css, /operations-tools \{ grid-column: 1 \/ -1/);
  assert.match(css, /ops-live-navigation/);
  assert.match(css, /ops-action-bar/);
});

test('close and expand controls operate on the native panel only', () => {
  const ui = read('ui-v2-operations.js');
  const accessibility = read('ui-v2-accessibility.js');
  const css = cleanCss();
  assert.match(ui, /function closeTool/);
  assert.match(ui, /toolPanel\.hidden = true/);
  assert.match(ui, /toolPanel\.classList\.remove\('is-expanded'\)/);
  assert.match(ui, /event\.key === 'Escape'/);
  assert.match(accessibility, /toolPanel\.setAttribute\('role', expanded \? 'dialog' : 'region'\)/);
  assert.match(accessibility, /lastToolTrigger/);
  assert.match(css, /tool-panel\.is-expanded \{ position: fixed/);
  assert.doesNotMatch(css, /has-utility-panel/);
});

test('navigation continues using the canonical SVG icon family', () => {
  const html = read('index.html');
  const icons = read('mfd-icons.js');
  const pages = read('product-pages.js');
  const shell = read('product-shell.js');
  assert.ok(html.indexOf('src="mfd-icons.js"') < html.indexOf('src="product-pages.js"'));
  assert.match(icons, /<svg class=/);
  ['operations', 'missions', 'planner', 'starmap', 'fleet', 'development'].forEach((name) => assert.match(pages, new RegExp(`icon: '${name}'`)));
  assert.match(shell, /SCCompanionMfdIcons/);
});

test('v0.25 keeps assisted intake and integrates live route execution', () => {
  const roadmap = require('../roadmap.js');
  const app = read('app.js');
  const map = read('operational-ui-v025.js');
  const locations = read('locations.js');
  assert.equal(roadmap.currentVersion, '0.25');
  assert.equal(roadmap.releases.find((release) => release.version === '0.22').status, 'done');
  assert.equal(roadmap.releases.find((release) => release.version === '0.23').status, 'done');
  assert.equal(roadmap.releases.find((release) => release.version === '0.24').status, 'done');
  assert.equal(roadmap.releases.find((release) => release.version === '0.25').status, 'current');
  assert.match(roadmap.releases.find((release) => release.version === '0.25').title, /Operational hauling cockpit/i);
  assert.match(app, /fleet-estimate-adapter\.js/);
  assert.match(app, /fleet-loadouts-view\.js/);
  assert.match(app, /game-log-intake-view\.js/);
  assert.match(app, /ocr-intake-view\.js/);
  assert.match(app, /route-session-planner\.js/);
  assert.match(app, /operational-ui-v025\.js/);
  assert.match(map, /ops-live-map/);
  assert.match(map, /gatewayNodes/);
  assert.match(map, /data-ops-action="missions"/);
  assert.match(locations, /validateCatalog/);
  assert.match(locations, /getCoverageSummary/);
});
