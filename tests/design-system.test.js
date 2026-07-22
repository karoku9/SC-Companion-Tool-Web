'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const system = require('../design-system.js');
const icons = require('../mfd-icons.js');
const roadmap = require('../roadmap.js');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('design system has primitive, semantic, component and manufacturer layers', () => {
  assert.ok(system.primitive.color.amber300);
  assert.ok(system.primitive.space[6]);
  assert.ok(system.semanticRoles.includes('surface.canvas'));
  assert.ok(system.semanticRoles.includes('cargo.pickup'));
  assert.deepEqual(system.components.button.variants, ['primary', 'secondary', 'ghost', 'danger', 'function', 'icon']);
  assert.equal(system.themes.drake.manufacturer, 'Drake Interplanetary');
  assert.match(system.themes.drake.sourceNote, /not an official CIG palette/i);
});

test('canonical icon family uses one documented grid and stroke', () => {
  assert.equal(icons.meta.grid, 24);
  assert.equal(icons.meta.strokeWidth, 1.7);
  assert.deepEqual(icons.meta.sizes, [16, 20, 24]);
  ['load', 'unload', 'cargo', 'route', 'close', 'warning'].forEach((name) => assert.ok(icons.paths[name]));
});

test('design system CSS exposes semantic roles and canonical components', () => {
  const css = read('design-system.css');
  ['--ds-surface-canvas', '--ds-content-primary', '--ds-action-primary', '--ds-cargo-pickup', '--ds-cargo-dropoff'].forEach((token) => assert.match(css, new RegExp(token)));
  ['primary', 'secondary', 'ghost', 'danger', 'function', 'icon'].forEach((variant) => assert.match(css, new RegExp(`ds-button--${variant}`)));
  assert.match(css, /ds-panel--primary-display/);
  assert.match(css, /ds-status--warning/);
  assert.match(css, /ds-input:focus/);
});

test('visible UI Kit documents palette, type, buttons, icons and manufacturer contract', () => {
  const view = read('design-system-view.js');
  assert.match(view, /Semantic palette/);
  assert.match(view, /Seven approved sizes/);
  assert.match(view, /Canonical icon family/);
  assert.match(view, /Manufacturer theme contract/);
  assert.match(view, /data-development-tab = 'ui-kit'/);
});

test('design foundation loads before page runtimes and is current v0.14', () => {
  const html = read('index.html');
  const app = read('app.js');
  assert.ok(html.indexOf('src="design-system.js"') < html.indexOf('src="mfd-icons.js"'));
  assert.match(app, /design-system\.css/);
  assert.match(app, /design-system-view\.js/);
  assert.equal(roadmap.currentVersion, '0.14');
  assert.equal(roadmap.releases.find((item) => item.version === '0.15').title, 'Operations components');
});

test('research rules prohibit page-specific invention', () => {
  const research = read('docs/ui-design-research.md');
  assert.match(research, /Page-specific CSS must not introduce a new raw colour, button style or icon meaning/);
  assert.match(research, /W3C Design Tokens Community Group/);
  assert.match(research, /NASA Human Integration Design Handbook/);
  assert.match(research, /Schaulers/);
  assert.match(research, /SC Hauler Helper/);
});
