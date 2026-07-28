'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('the document exposes one application root and one coherent stylesheet', () => {
  const html = read('index.html');
  assert.match(html, /id="app"/);
  assert.match(html, /href="ui\/app\.css/);
  assert.equal((html.match(/rel="stylesheet"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /ui-v2|operations-rebuild|product-shell/);
});

test('the application exposes the approved five-workspace information architecture', () => {
  const ui = read('ui/app-shell.js');
  ['contracts', 'plan', 'live', 'fleet', 'intel'].forEach((id) => assert.match(ui, new RegExp(`id: '${id}'`)));
  assert.match(ui, /Contracts → Plan → Live Ops → Fleet → Intel/);
  assert.doesNotMatch(ui, /Development.*primary-nav|Changelog.*primary-nav/);
});

test('the shell consumes models through a single feature controller', () => {
  const app = read('app.js');
  const ui = read('ui/app-shell.js');
  ['route-session-planner.js', 'route-operational-steps-v028.js', 'cargo-auto-layout-v0292.js', 'cargo-manual-layout-v030.js', 'fleet-loadouts.js'].forEach((file) => assert.match(app, new RegExp(file.replaceAll('.', '\\.'))));
  assert.match(app, /ui\/app-shell\.js/);
  assert.match(ui, /SCCompanionSession/);
  assert.match(ui, /SCCompanionMissionValidation/);
  assert.match(ui, /SCCompanionAutoCargoLayout/);
});
