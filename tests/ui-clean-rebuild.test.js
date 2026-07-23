'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('clean shell scripts remain valid JavaScript', () => {
  ['app.js', 'ui-v2.js', 'ui-v2-operations.js', 'ui-v2-shell.js', 'ui-v2-accessibility.js', 'product-shell.js'].forEach((file) => {
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
  assert.match(entry, /location-context\.css/);
  assert.match(entry, /fleet-loadouts\.css/);
  assert.match(entry, /design-system-legibility\.css/);
  assert.match(entry, /starmap-v2\.css/);
  ['styles.css', 'sections.css', 'planner.css', 'starmap.css', 'product-shell.css', 'workspace-consolidation.css', 'ui-rebuild.css', 'drake-mfd.css', 'mfd-layout-v2.css'].forEach((legacy) => {
    assert.doesNotMatch(html, new RegExp(`href="${legacy.replace('.', '\\.')}"`));
  });
  assert.doesNotMatch(read('app.js'), /workspace-shell\.js|ui-rebuild\.js|mfd-layout-v2\.js|ux-shell\.js/);
});

test('Operations keeps native auxiliary tools below the primary displays', () => {
  const html = read('index.html');
  const ui = read('ui-v2-operations.js');
  const css = read('ui-v2-operations.css');
  ['moves', 'cargo', 'adjust', 'route'].forEach((tool) => assert.match(html, new RegExp(`data-ops-tool="${tool}"`)));
  assert.doesNotMatch(html, /id="load-operations"|data-view="cargo"/);
  assert.match(ui, /renderMoves/);
  assert.match(ui, /renderCargo/);
  assert.match(ui, /renderAdjust/);
  assert.match(ui, /renderRoute/);
  assert.doesNotMatch(ui, /append\(loadOperations\)|append\(cargo\)/);
  assert.match(css, /operations-tools \{ grid-column: 1 \/ -1/);
  assert.match(css, /tool-panel\.is-expanded \{ position: fixed/);
});

test('Game.log assistance enters the existing mission review without route replacement', () => {
  const app = read('app.js');
  const view = read('game-log-intake-view.js');
  const validator = read('mission-validation.js');
  assert.match(app, /game-log-intake\.js/);
  assert.match(app, /game-log-intake-correlation\.js/);
  assert.match(app, /game-log-intake-view\.js/);
  assert.match(view, /showOpenFilePicker/);
  assert.match(view, /Load extracted draft into review/);
  assert.match(view, /form\.requestSubmit\(\)/);
  assert.match(view, /never replaces the active route automatically/);
  assert.match(validator, /inspectMissionText/);
  assert.match(validator, /confirmedCustomLocations/);
});

test('v0.23 is current after the delivered universe foundation', () => {
  const roadmap = require('../roadmap.js');
  assert.equal(roadmap.currentVersion, '0.23');
  assert.equal(roadmap.releases.find((release) => release.version === '0.22').status, 'done');
  assert.equal(roadmap.releases.find((release) => release.version === '0.23').status, 'current');
  assert.equal(roadmap.releases.find((release) => release.version === '0.24').status, 'next');
});