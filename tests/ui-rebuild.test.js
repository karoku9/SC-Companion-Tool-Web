'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function cleanCss() {
  return ['design-system-legibility.css', 'mission-validation.css', 'location-context.css', 'location-context-adapters.css', 'ui-v2-shell.css', 'ui-v2-operations.css', 'ui-v2-workspaces.css', 'ui-v2-responsive.css'].map(read).join('\n');
}

test('clean interface scripts remain valid JavaScript', () => {
  ['app.js', 'ui-v2.js', 'ui-v2-operations.js', 'ui-v2-shell.js', 'ui-v2-accessibility.js', 'mfd-icons.js', 'product-shell.js', 'mission-validation.js', 'mission-view.js', 'location-context.js', 'location-context-planner.js', 'location-intel-view.js', 'route-view.js', 'hangar-view.js', 'starmap-view.js'].forEach((file) => {
    assert.doesNotThrow(() => new Function(read(file)), `${file} contains invalid JavaScript`);
  });
});

test('clean UI replaces accumulated layout layers rather than overriding them', () => {
  const html = read('index.html');
  const app = read('app.js');
  const entry = read('ui-v2.css');
  assert.match(html, /href="design-system\.css"/);
  assert.match(html, /href="ui-v2\.css"/);
  assert.match(entry, /mission-validation\.css/);
  assert.match(entry, /location-context\.css/);
  assert.match(entry, /location-context-adapters\.css/);
  assert.match(entry, /design-system-legibility\.css/);
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

test('Location Context follows Mission Validation', () => {
  const roadmap = require('../roadmap.js');
  assert.equal(roadmap.currentVersion, '0.19');
  assert.equal(roadmap.releases.find((release) => release.version === '0.18').status, 'done');
  assert.match(roadmap.releases.find((release) => release.version === '0.19').title, /Location context/i);
  assert.match(roadmap.releases.find((release) => release.version === '0.20').title, /Fleet loadouts/i);
});
