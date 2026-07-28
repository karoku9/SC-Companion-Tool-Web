'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('clean interface scripts remain valid JavaScript', () => {
  ['app.js', 'ui-v2.js', 'ui-v2-operations.js', 'ui-v2-shell.js', 'ui-v2-accessibility.js', 'mfd-icons.js', 'product-shell.js', 'mission-validation.js', 'mission-view.js', 'game-log-intake.js', 'game-log-intake-correlation.js', 'game-log-intake-view.js', 'ocr-intake.js', 'ocr-intake-view.js', 'location-context.js', 'location-context-planner.js', 'location-intel-view.js', 'fleet-loadouts.js', 'fleet-estimate-adapter.js', 'fleet-loadouts-view.js', 'route-view.js', 'hangar-view.js', 'starmap-view.js', 'focused-route-optimizer.js', 'route-session-planner.js', 'missions-focus-workflow.js', 'operations-rebuild-v040.js', 'operations-v040-manual-grid-bridge.js', 'cargo-auto-layout-v0292.js'].forEach((file) => {
    assert.doesNotThrow(() => new Function(read(file)), `${file} contains invalid JavaScript`);
  });
});

test('Operations uses a single replacement runtime rather than accumulated UI layers', () => {
  const app = read('app.js');
  const loader = read('operations-rebuild-v040-loader.js');
  const ui = read('operations-rebuild-v040.js');
  const css = read('operations-rebuild-v040.css');

  assert.match(app, /operations-rebuild-v040-loader\.js/);
  assert.doesNotMatch(app, /operational-ui-v025\.js|operational-polish-v026\.js|operations-exposure-intel\.js|operations-design-v027\.js|operations-flow-v028\.js|operations-readable-short-desktop-v0291\.js|operations-cargo-guidance-v0292\.js|operations-readable-scroll-v0301\.js|operations-cargo-primary-v0302\.js|operations-adaptive-fit-v0303\.js|operations-balanced-cockpit-v0304\.js|ship-selector-sync\.js/);
  assert.match(loader, /operations-rebuild-v040\.css/);
  assert.match(loader, /operations-rebuild-v040\.js/);
  assert.match(ui, /page\.innerHTML =/);
  assert.match(ui, /root\.dispatchEvent\(new Event\('sc:operations-v040-ready'\)\)/);
  assert.match(css, /Operations UI 0\.40/);
});

test('the rebuilt cockpit has cargo, current step, timeline and direct controls', () => {
  const ui = read('operations-rebuild-v040.js');
  const css = read('operations-rebuild-v040.css');

  ['ops40-cargo-panel', 'ops40-step-panel', 'ops40-timeline-panel', 'ops40-dock'].forEach((className) => assert.match(ui, new RegExp(className)));
  ['add', 'edit', 'missions', 'order', 'cargo'].forEach((action) => assert.match(ui, new RegExp(`data-ops40-action="${action}"`)));
  assert.match(ui, /operationalSteps\.completeCurrent/);
  assert.match(ui, /operationalSteps\.previous/);
  assert.match(ui, /autoCargo\.plan/);
  assert.match(ui, /corrections\.changeOrder/);
  assert.match(ui, /sessionPlanner\.plan/);
  assert.doesNotMatch(ui, /ops-live-map|renderFocusedMap|gatewayNodes/);

  assert.match(css, /ops40-main[\s\S]*grid-template-columns/);
  assert.match(css, /ops40-cargo-panel[\s\S]*grid-template-rows/);
  assert.match(css, /ops40-step-panel[\s\S]*grid-template-rows/);
  assert.match(css, /ops40-timeline-panel[\s\S]*grid-template-rows/);
  assert.match(css, /@media \(max-width: 1279px\), \(max-height: 679px\)/);
});

test('manual cargo editing is preserved through a narrow compatibility bridge', () => {
  const app = read('app.js');
  const loader = read('operations-rebuild-v040-loader.js');
  const bridge = read('operations-v040-manual-grid-bridge.js');
  const ui = read('operations-rebuild-v040.js');

  assert.match(app, /cargo-manual-grid-view-v0301\.js/);
  assert.match(app, /cargo-manual-grid-fit-v030\.js/);
  assert.match(loader, /operations-v040-manual-grid-bridge\.js/);
  assert.match(bridge, /ops-v028-cargo-panel/);
  assert.match(bridge, /sc:open-cargo-grid-editor/);
  assert.match(ui, /id="ops40-edit-grid"/);
  assert.match(ui, /sc:open-cargo-grid-editor/);
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

test('assisted intake and route execution models remain connected', () => {
  const roadmap = require('../roadmap.js');
  const app = read('app.js');
  const ui = read('operations-rebuild-v040.js');
  const locations = read('locations.js');

  assert.equal(roadmap.currentVersion, '0.25');
  assert.match(app, /fleet-estimate-adapter\.js/);
  assert.match(app, /fleet-loadouts-view\.js/);
  assert.match(app, /game-log-intake-view\.js/);
  assert.match(app, /ocr-intake-view\.js/);
  assert.match(app, /route-session-planner\.js/);
  assert.match(app, /route-operational-steps-v028\.js/);
  assert.match(app, /cargo-auto-layout-v0292\.js/);
  assert.match(ui, /renderStep/);
  assert.match(ui, /renderCargo/);
  assert.match(ui, /renderTimeline/);
  assert.match(locations, /validateCatalog/);
  assert.match(locations, /getCoverageSummary/);
});
