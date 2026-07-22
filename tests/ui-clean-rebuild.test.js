'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function cleanCss() {
  return ['design-system-legibility.css', 'mission-validation.css', 'location-context.css', 'location-context-adapters.css', 'fleet-loadouts.css', 'ui-v2-shell.css', 'ui-v2-operations.css', 'ui-v2-workspaces.css', 'ui-v2-responsive.css'].map(read).join('\n');
}

test('clean UI scripts remain valid JavaScript', () => {
  ['app.js', 'ui-v2.js', 'ui-v2-operations.js', 'ui-v2-shell.js', 'ui-v2-accessibility.js', 'product-shell.js', 'mission-validation.js', 'mission-view.js', 'location-context.js', 'location-context-planner.js', 'location-intel-view.js', 'fleet-loadouts.js', 'fleet-estimate-adapter.js', 'fleet-loadouts-view.js', 'route-view.js', 'hangar-view.js', 'starmap-view.js'].forEach((file) => {
    assert.doesNotThrow(() => new Function(read(file)), `${file} contains invalid JavaScript`);
  });
});

test('the application loads one design system and one page-layout entry', () => {
  const html = read('index.html');
  const entry = read('ui-v2.css');
  assert.match(html, /href="design-system\.css"/);
  assert.match(html, /href="ui-v2\.css"/);
  assert.match(entry, /mission-validation\.css/);
  assert.match(entry, /location-context\.css/);
  assert.match(entry, /location-context-adapters\.css/);
  assert.match(entry, /fleet-loadouts\.css/);
  assert.match(entry, /design-system-legibility\.css/);
  ['styles.css', 'sections.css', 'planner.css', 'starmap.css', 'product-shell.css', 'workspace-consolidation.css', 'ui-rebuild.css', 'drake-mfd.css', 'mfd-layout-v2.css'].forEach((legacy) => {
    assert.doesNotMatch(html, new RegExp(`href="${legacy.replace('.', '\\.')}"`));
  });
  const app = read('app.js');
  assert.doesNotMatch(app, /workspace-shell\.js|ui-rebuild\.js|mfd-layout-v2\.js|ux-shell\.js/);
});

test('Operations uses native auxiliary panels instead of embedding full pages', () => {
  const html = read('index.html');
  const ui = read('ui-v2-operations.js');
  ['moves', 'cargo', 'adjust', 'route'].forEach((tool) => assert.match(html, new RegExp(`data-ops-tool="${tool}"`)));
  assert.doesNotMatch(html, /id="load-operations"/);
  assert.doesNotMatch(html, /data-view="cargo"/);
  assert.match(ui, /renderMoves/);
  assert.match(ui, /renderCargo/);
  assert.match(ui, /renderAdjust/);
  assert.match(ui, /renderRoute/);
  assert.doesNotMatch(ui, /append\(loadOperations\)|append\(cargo\)/);
});

test('auxiliary tools stay below both primary displays and can expand without page squeeze', () => {
  const css = cleanCss();
  assert.match(css, /operations-tools \{ grid-column: 1 \/ -1/);
  assert.match(css, /tool-panel\.is-expanded \{ position: fixed/);
  assert.match(css, /overflow-x: hidden/);
  assert.match(css, /min-width: 0/);
});

test('visual hardening provides deterministic focus and responsive contracts', () => {
  const app = read('app.js');
  const ui = read('ui-v2.js');
  const accessibility = read('ui-v2-accessibility.js');
  const responsive = read('ui-v2-responsive.css');
  assert.match(ui, /SCCompanionCleanInterfaceReady/);
  assert.match(app, /SCCompanionCleanInterfaceReady/);
  assert.match(accessibility, /aria-modal/);
  assert.match(accessibility, /focusableElements/);
  assert.match(accessibility, /ArrowRight/);
  assert.match(responsive, /Cargo zones become stacked editing cards/);
  assert.match(responsive, /product-navigation \.nav-copy \{ display: none/);
});

test('Mission Validation adds a review gate without replacing the clean shell', () => {
  const view = read('mission-view.js');
  const validator = read('mission-validation.js');
  const css = read('mission-validation.css');
  assert.match(view, /Review contracts/);
  assert.match(view, /Generate validated session/);
  assert.match(view, /confirmedCustomLocations/);
  assert.match(validator, /inspectMissionText/);
  assert.match(validator, /unverified-location/);
  assert.match(validator, /unknown-action/);
  assert.match(css, /mission-review-row/);
});

test('Location Context replaces string risk guesses with shared sourced guidance', () => {
  const model = read('location-context.js');
  const operations = read('ui-v2-operations.js');
  const planner = read('location-context-planner.js');
  const view = read('location-intel-view.js');
  assert.match(model, /sourceLedger/);
  assert.match(model, /exposureFor/);
  assert.match(model, /unavailable-data/);
  assert.match(operations, /placementPriority/);
  assert.doesNotMatch(operations, /value\.includes\('pyro'\)|value\.includes\('station'\)/);
  assert.match(planner, /planner-location-context/);
  assert.match(view, /SOURCE LEDGER/);
  assert.match(view, /UNAVAILABLE \/ UNVERIFIED/);
});

test('Fleet and Starmap use dedicated visual components', () => {
  const html = read('index.html');
  const fleet = read('hangar-view.js');
  const loadoutView = read('fleet-loadouts-view.js');
  const map = read('starmap-view.js');
  assert.match(html, /id="ship-hologram"/);
  assert.match(html, /id="fleet-zone-form"/);
  assert.match(fleet, /Drake Corsair schematic/);
  assert.match(fleet, /normalizeZones/);
  assert.match(loadoutView, /fleet-loadout-editor/);
  assert.match(loadoutView, /Structured components/);
  assert.match(html, /<svg id="starmap-canvas"/);
  assert.match(map, /renderRouteMode/);
  assert.match(map, /renderLocalMode/);
  assert.match(map, /renderNetworkMode/);
  assert.doesNotMatch(map, /getContext\('2d'\)|camera\.yaw|pointer\.down/);
});

test('Fleet Loadouts follow delivered Mission Validation and Location Context', () => {
  const roadmap = require('../roadmap.js');
  assert.equal(roadmap.currentVersion, '0.20');
  assert.equal(roadmap.releases.find((release) => release.version === '0.18').status, 'done');
  assert.equal(roadmap.releases.find((release) => release.version === '0.19').status, 'done');
  assert.equal(roadmap.releases.find((release) => release.version === '0.20').title, 'Fleet loadouts');
  assert.equal(roadmap.releases.find((release) => release.version === '0.21').title, 'Session history');
});
