'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('clean shell and Operations 0.40 scripts remain valid JavaScript', () => {
  ['app.js', 'ui-v2.js', 'ui-v2-operations.js', 'ui-v2-shell.js', 'ui-v2-accessibility.js', 'product-shell.js', 'ocr-intake.js', 'ocr-intake-view.js', 'operations-rebuild-v040.js', 'operations-v040-manual-grid-bridge.js'].forEach((file) => {
    assert.doesNotThrow(() => new Function(read(file)), `${file} contains invalid JavaScript`);
  });
});

test('the application has one clean Operations runtime entry', () => {
  const html = read('index.html');
  const app = read('app.js');
  const entry = read('ui-v2.css');
  const loader = read('operations-rebuild-v040-loader.js');

  assert.match(html, /href="design-system\.css\?v=0\.29\.2"/);
  assert.match(html, /href="ui-v2\.css\?v=0\.29\.2"/);
  assert.match(entry, /mission-validation\.css/);
  assert.match(entry, /game-log-intake\.css/);
  assert.match(entry, /ocr-intake\.css/);
  assert.match(entry, /location-context\.css/);
  assert.match(entry, /fleet-loadouts\.css/);
  assert.match(entry, /design-system-legibility\.css/);
  assert.match(entry, /starmap-v2\.css/);

  assert.match(app, /operations-rebuild-v040-loader\.js/);
  assert.doesNotMatch(app, /operational-ui-v025\.js|operational-polish-v026\.js|operations-design-v027\.js|operations-flow-v028\.js|operations-readable-short-desktop-v0291\.js|operations-cargo-guidance-v0292\.js|operations-readable-scroll-v0301\.js|operations-cargo-primary-v0302\.js|operations-adaptive-fit-v0303\.js|operations-balanced-cockpit-v0304\.js/);
  assert.match(loader, /operations-rebuild-v040\.css/);
  assert.match(loader, /operations-rebuild-v040\.js/);

  ['styles.css', 'sections.css', 'planner.css', 'starmap.css', 'product-shell.css', 'workspace-consolidation.css', 'ui-rebuild.css', 'drake-mfd.css', 'mfd-layout-v2.css'].forEach((legacy) => {
    assert.doesNotMatch(html, new RegExp(`href="${legacy.replace('.', '\\.')}"`));
  });
});

test('Operations 0.40 owns its complete visual hierarchy', () => {
  const ui = read('operations-rebuild-v040.js');
  const css = read('operations-rebuild-v040.css');

  assert.match(ui, /ops40-topbar/);
  assert.match(ui, /ops40-session-strip/);
  assert.match(ui, /ops40-cargo-panel/);
  assert.match(ui, /ops40-step-panel/);
  assert.match(ui, /ops40-timeline-panel/);
  assert.match(ui, /ops40-dock/);
  assert.doesNotMatch(ui, /ops-live-map|ops-live-navigation/);

  assert.match(css, /grid-template-rows:\s*var\(--ops40-top\) var\(--ops40-sessions\) minmax\(0, 1fr\) var\(--ops40-timeline\) var\(--ops40-dock\)/);
  assert.match(css, /ops40-main[\s\S]*grid-template-columns/);
  assert.match(css, /ops40-cargo-grid[\s\S]*repeat\(var\(--ops40-columns/);
  assert.match(css, /ops40-timeline[\s\S]*overflow-x:\s*auto/);
});

test('OCR runtime adapter accepts named and default Tesseract.js exports', () => {
  const app = read('app.js');
  const adapter = read('tesseract-runtime-adapter-v0293.js');
  assert.match(app, /installOcrRuntimeImportMap/);
  assert.match(app, /tesseract-runtime-adapter-v0293\.js/);
  assert.match(adapter, /namespace\?\.createWorker/);
  assert.match(adapter, /defaultApi\?\.createWorker/);
  assert.match(adapter, /sc-companion-upstream=0\.29\.3/);
  assert.match(adapter, /Tesseract\.js createWorker export is unavailable/);
});

test('assisted inputs still enter the normal mission review', () => {
  const app = read('app.js');
  const gameLog = read('game-log-intake-view.js');
  const ocr = read('ocr-intake-view.js');
  const validator = read('mission-validation.js');
  assert.match(app, /game-log-intake\.js/);
  assert.match(app, /game-log-intake-correlation\.js/);
  assert.match(app, /game-log-intake-view\.js/);
  assert.match(app, /ocr-intake\.js/);
  assert.match(app, /ocr-intake-view\.js/);
  assert.match(gameLog, /showOpenFilePicker/);
  assert.match(gameLog, /Load extracted draft into review/);
  assert.match(gameLog, /form\.requestSubmit\(\)/);
  assert.match(ocr, /Load OCR draft into review/);
  assert.match(ocr, /form\.requestSubmit\(\)/);
  assert.match(validator, /inspectMissionText/);
  assert.match(validator, /confirmedCustomLocations/);
});

test('the product roadmap remains independent from the Operations UI generation', () => {
  const roadmap = require('../roadmap.js');
  assert.equal(roadmap.currentVersion, '0.25');
  assert.equal(roadmap.releases.find((release) => release.version === '0.25').status, 'current');
});
