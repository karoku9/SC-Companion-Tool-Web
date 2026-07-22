'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) { return fs.readFileSync(path.join(__dirname, '..', file), 'utf8'); }
function cleanCss() { return ['design-system-legibility.css', 'ui-v2-shell.css', 'ui-v2-operations.css', 'ui-v2-workspaces.css', 'ui-v2-responsive.css'].map(read).join('\n'); }

test('clean interface scripts remain valid JavaScript', () => {
  ['app.js', 'ui-v2.js', 'ui-v2-operations.js', 'ui-v2-shell.js', 'mfd-icons.js', 'product-shell.js', 'route-view.js', 'hangar-view.js', 'starmap-view.js'].forEach((file) => assert.doesNotThrow(() => new Function(read(file)), `${file} contains invalid JavaScript`));
});

test('clean UI replaces accumulated layout layers rather than overriding them', () => {
  const html = read('index.html');
  const app = read('app.js');
  const entry = read('ui-v2.css');
  assert.match(html, /href="design-system\.css"/);
  assert.match(html, /href="ui-v2\.css"/);
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
  ['renderMoves', 'renderCargo', 'renderAdjust', 'renderRoute'].forEach((name) => assert.match(ui, new RegExp(name)));
  assert.match(css, /operations-tools \{ grid-column: 1 \/ -1/);
});

test('close and expand controls operate on the native panel only', () => {
  const ui = read('ui-v2-operations.js');
  const css = cleanCss();
  assert.match(ui, /function closeTool/);
  assert.match(ui, /toolPanel\.hidden = true/);
  assert.match(ui, /toolPanel\.classList\.remove\('is-expanded'\)/);
  assert.match(ui, /event\.key === 'Escape'/);
  assert.match(css, /tool-panel\.is-expanded \{ position: fixed/);
});

test('visual hardening defines focus and reduced-motion contracts', () => {
  const css = read('design-system-legibility.css');
  assert.match(css, /:focus-visible/);
  assert.match(css, /--ds-focus-width/);
  assert.match(css, /prefers-reduced-motion: reduce/);
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

test('visual hardening follows interstellar navigation', () => {
  const roadmap = require('../roadmap.js');
  assert.equal(roadmap.currentVersion, '0.17');
  assert.equal(roadmap.releases.find((release) => release.version === '0.16').status, 'done');
  assert.equal(roadmap.releases.find((release) => release.version === '0.17').status, 'current');
  assert.equal(roadmap.releases.find((release) => release.version === '0.18').status, 'next');
});
