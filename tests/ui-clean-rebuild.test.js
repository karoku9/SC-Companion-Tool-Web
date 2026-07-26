'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('clean shell and v0.25 operational scripts remain valid JavaScript', () => {
  [
    'app.js', 'ui-v2.js', 'ui-v2-operations.js', 'ui-v2-shell.js', 'ui-v2-accessibility.js',
    'product-shell.js', 'ocr-intake.js', 'ocr-intake-view.js', 'focused-route-optimizer.js',
    'route-session-planner.js', 'missions-focus-workflow.js', 'mission-location-picker.js',
    'operational-ui-v025.js', 'operations-exposure-intel.js', 'ship-selector-sync.js',
    'missions-operations-bridge.js'
  ].forEach((file) => {
    assert.doesNotThrow(() => new Function(read(file)), `${file} contains invalid JavaScript`);
  });
});

test('the application uses one design system and one clean layout entry', () => {
  const html = read('index.html');
  const entry = read('ui-v2.css');
  assert.match(html, /href="design-system\.css"/);
  assert.match(html, /href="ui-v2\.css"/);
  assert.match(entry, /mission-validation\.css/);
  assert.match(entry, /game-log-intake\.css/);
  assert.match(entry, /ocr-intake\.css/);
  assert.match(entry, /location-context\.css/);
  assert.match(entry, /fleet-loadouts\.css/);
  assert.match(entry, /design-system-legibility\.css/);
  assert.match(entry, /starmap-v2\.css/);
  assert.match(entry, /operational-ui-v025\.css/);
  assert.match(entry, /operational-ui-legibility\.css/);
  ['styles.css', 'sections.css', 'planner.css', 'starmap.css', 'product-shell.css', 'workspace-consolidation.css', 'ui-rebuild.css', 'drake-mfd.css', 'mfd-layout-v2.css'].forEach((legacy) => {
    assert.doesNotMatch(html, new RegExp(`href="${legacy.replace('.', '\\.')}"`));
  });
  assert.doesNotMatch(read('app.js'), /workspace-shell\.js|ui-rebuild\.js|mfd-layout-v2\.js|ux-shell\.js/);
});

test('Operations keeps cargo internals while the public workflow uses the new action bar', () => {
  const html = read('index.html');
  const ui = read('ui-v2-operations.js');
  const css = read('ui-v2-operations.css');
  const operational = read('operational-ui-v025.js');
  ['moves', 'cargo', 'adjust', 'route'].forEach((tool) => assert.match(html, new RegExp(`data-ops-tool="${tool}"`)));
  assert.doesNotMatch(html, /id="load-operations"|data-view="cargo"/);
  assert.match(ui, /renderMoves/);
  assert.match(ui, /renderCargo/);
  assert.match(ui, /renderAdjust/);
  assert.match(ui, /renderRoute/);
  assert.doesNotMatch(ui, /append\(loadOperations\)|append\(cargo\)/);
  assert.match(css, /operations-tools \{ grid-column: 1 \/ -1/);
  assert.match(css, /tool-panel\.is-expanded \{ position: fixed/);
  assert.match(operational, /data-ops-action="add"/);
  assert.match(operational, /data-ops-action="edit"/);
  assert.match(operational, /data-ops-action="missions"/);
  assert.match(operational, /data-ops-action="order"/);
  assert.match(operational, /data-ops-action="cargo"/);
  assert.match(operational, /setAttribute\('hidden'/);
});

test('assisted inputs enter visual mission review without route replacement', () => {
  const app = read('app.js');
  const gameLog = read('game-log-intake-view.js');
  const ocr = read('ocr-intake-view.js');
  const validator = read('mission-validation.js');
  const focused = read('missions-focus-workflow.js');
  assert.match(app, /game-log-intake\.js/);
  assert.match(app, /game-log-intake-correlation\.js/);
  assert.match(app, /game-log-intake-view\.js/);
  assert.match(app, /ocr-intake\.js/);
  assert.match(app, /ocr-intake-view\.js/);
  assert.match(gameLog, /showOpenFilePicker/);
  assert.match(gameLog, /Load extracted draft into review/);
  assert.match(gameLog, /form\.requestSubmit\(\)/);
  assert.match(gameLog, /never replaces the active route automatically/);
  assert.match(ocr, /Load OCR draft into review/);
  assert.match(ocr, /form\.requestSubmit\(\)/);
  assert.match(ocr, /Nothing is sent to route generation until the draft passes the normal mission review/);
  assert.match(validator, /inspectMissionText/);
  assert.match(validator, /confirmedCustomLocations/);
  assert.match(focused, /mission-review-grid/);
  assert.match(focused, /cargo-chip/);
  assert.match(focused, /location-state/);
});

test('v0.25 operational hauling cockpit is current', () => {
  const roadmap = require('../roadmap.js');
  assert.equal(roadmap.currentVersion, '0.25');
  assert.equal(roadmap.releases.find((release) => release.version === '0.22').status, 'done');
  assert.equal(roadmap.releases.find((release) => release.version === '0.23').status, 'done');
  assert.equal(roadmap.releases.find((release) => release.version === '0.24').status, 'done');
  assert.equal(roadmap.releases.find((release) => release.version === '0.25').status, 'current');
  assert.match(roadmap.releases.find((release) => release.version === '0.25').title, /Operational hauling cockpit/i);
});