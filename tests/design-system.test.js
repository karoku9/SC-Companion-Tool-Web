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

test('legibility contract defines one readable type scale for every workspace', () => {
  const css = read('design-system-legibility.css');
  assert.match(css, /--ds-type-xs: \.75rem/);
  assert.match(css, /--ds-type-visible-min: \.75rem/);
  assert.match(css, /--ds-type-operational-max: 2\.25rem/);
  assert.match(css, /Secondary provenance stays secondary through colour and weight, not microscopic sizing/);
  assert.match(css, /planner-profile-metrics/);
  assert.match(css, /map-leg-estimate/);
});

test('interaction contract includes focus, mobile target, reduced-motion and forced-colour states', () => {
  const css = read('design-system-legibility.css');
  assert.match(css, /--ds-focus-ring/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /min-height: 44px !important/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /transition-duration: 0s !important/);
  assert.match(css, /forced-colors: active/);
});

test('feature layers reuse design-system roles instead of adding raw visual language', () => {
  const validation = read('mission-validation.css');
  const context = `${read('location-context.css')}\n${read('location-context-adapters.css')}`;
  const fleet = read('fleet-loadouts.css');
  [validation, context, fleet].forEach((css) => {
    assert.match(css, /var\(--ds-/);
    assert.doesNotMatch(css, /#[0-9a-f]{3,8}/i);
  });
  assert.match(validation, /var\(--ds-status-danger\)/);
  assert.match(context, /var\(--ds-status-info\)/);
  assert.match(fleet, /var\(--ds-status-warning\)/);
  assert.match(fleet, /var\(--ds-action-primary/);
});

test('visible UI Kit documents palette, type, buttons, icons and manufacturer contract', () => {
  const view = read('design-system-view.js');
  assert.match(view, /Semantic palette/);
  assert.match(view, /Seven approved sizes/);
  assert.match(view, /Canonical icon family/);
  assert.match(view, /Manufacturer theme contract/);
});

test('design foundation remains loaded before the v0.20 Fleet loadout layer', () => {
  const html = read('index.html');
  const app = read('app.js');
  const entry = read('ui-v2.css');
  assert.ok(html.indexOf('src="design-system.js"') < html.indexOf('src="mfd-icons.js"'));
  assert.ok(html.indexOf('href="design-system.css"') < html.indexOf('href="ui-v2.css"'));
  assert.ok(entry.indexOf('mission-validation.css') < entry.indexOf('location-context.css'));
  assert.ok(entry.indexOf('location-context-adapters.css') < entry.indexOf('fleet-loadouts.css'));
  assert.ok(entry.indexOf('fleet-loadouts.css') < entry.indexOf('design-system-legibility.css'));
  assert.match(app, /official-universe-data\.js/);
  assert.match(app, /navigation-estimates\.js/);
  assert.match(app, /location-context\.js/);
  assert.match(app, /location-context-planner\.js/);
  assert.match(app, /fleet-loadouts\.js/);
  assert.match(app, /fleet-estimate-adapter\.js/);
  assert.match(app, /fleet-loadouts-view\.js/);
  assert.match(app, /ui-v2-accessibility\.js/);
  assert.match(app, /SCCompanionCleanInterfaceReady/);
  assert.equal(roadmap.currentVersion, '0.20');
  assert.equal(roadmap.releases.find((item) => item.version === '0.21').title, 'Session history');
});

test('research rules prohibit page-specific invention', () => {
  const research = read('docs/ui-design-research.md');
  assert.match(research, /Page-specific CSS must not introduce a new raw colour, button style or icon meaning/);
  assert.match(research, /W3C Design Tokens Community Group/);
  assert.match(research, /NASA Human Integration Design Handbook/);
  assert.match(research, /Schaulers/);
  assert.match(research, /SC Hauler Helper/);
});
