'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('interface rebuild scripts remain valid JavaScript', () => {
  assert.doesNotThrow(() => new Function(read('ui-rebuild.js')));
  assert.doesNotThrow(() => new Function(read('product-shell.js')));
  assert.doesNotThrow(() => new Function(read('workspace-shell.js')));
});

test('global design system defines hierarchy instead of boxed parity', () => {
  const css = read('ui-rebuild.css');
  assert.match(css, /--surface-hover:/);
  assert.match(css, /--radius-lg:/);
  assert.match(css, /\.current-stop-card[\s\S]*box-shadow: inset 4px 0 0 var\(--accent\)/);
  assert.match(css, /\.route-stop-list li[\s\S]*border: 0/);
  assert.match(css, /\.page-status \{ display: none; \}/);
  assert.match(css, /\.operations-command-strip[\s\S]*border-radius: 12px/);
});

test('desktop and mobile use purpose-built navigation', () => {
  const html = read('index.html');
  const css = read('ui-rebuild.css');
  const js = read('ui-rebuild.js');
  const shell = read('product-shell.js');
  assert.match(html, /id="sidebar-toggle"/);
  assert.match(html, /class="brand-mark"/);
  assert.match(shell, /class="nav-glyph"/);
  assert.match(shell, /class="nav-copy"/);
  assert.match(css, /\.product-frame\.is-sidebar-collapsed/);
  assert.match(css, /\.mobile-bottom-nav/);
  assert.match(js, /sidebarCollapsed/);
  assert.match(js, /Primary mobile navigation/);
});

test('operational copy and controls use calmer sentence case', () => {
  const html = read('index.html');
  const workspace = read('workspace-shell.js');
  assert.match(html, />Complete stop and continue</);
  assert.match(html, />Generate session</);
  assert.match(workspace, />Next moves</);
  assert.match(workspace, />Full screen</);
  assert.match(workspace, />Roadmap</);
  assert.doesNotMatch(workspace, />NEXT MOVES</);
  assert.doesNotMatch(workspace, />EXPAND</);
});

test('the rebuilt interface is registered as v0.11', () => {
  const app = read('app.js');
  const changelog = read('CHANGELOG.md');
  assert.match(app, /ui-rebuild\.css/);
  assert.match(app, /ui-rebuild\.js/);
  assert.match(changelog, /## \[0\.11\.0\]/);
  assert.match(changelog, /Mission Validation moved to v0\.12/);
});
