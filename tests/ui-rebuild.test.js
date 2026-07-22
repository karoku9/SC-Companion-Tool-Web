'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('interface and MFD scripts remain valid JavaScript', () => {
  ['ui-rebuild.js', 'mfd-icons.js', 'product-shell.js', 'workspace-shell.js', 'load-operations-view.js'].forEach((file) => {
    assert.doesNotThrow(() => new Function(read(file)), `${file} contains invalid JavaScript`);
  });
});

test('Drake MFD layer replaces stock card language with angular technical hierarchy', () => {
  const css = read('drake-mfd.css');
  assert.match(css, /--mfd-mono:/);
  assert.match(css, /--accent: #e4922f/);
  assert.match(css, /clip-path: polygon/);
  assert.match(css, /\.current-stop-card[\s\S]*box-shadow: inset 3px 0 0 var\(--accent\)/);
  assert.match(css, /\.operations-command-strip[\s\S]*grid-template-columns: repeat\(4/);
  assert.match(css, /\.mfd-tool-heading/);
});

test('wide desktop tools dock beside Operations instead of covering it', () => {
  const css = read('drake-mfd.css');
  const workspace = read('workspace-shell.js');
  assert.match(css, /@media \(min-width: 1260px\)/);
  assert.match(css, /\.operations-mfd-frame\.has-utility-panel[\s\S]*grid-template-columns:/);
  assert.match(css, /\.workspace-drawer[\s\S]*position: sticky/);
  assert.match(workspace, /operations-mfd-frame/);
  assert.match(workspace, /has-utility-panel/);
  assert.match(workspace, /dockedMedia/);
});

test('Moves contains support information but never duplicates the primary operation hero', () => {
  const view = read('load-operations-view.js');
  assert.match(view, /Move queue/);
  assert.match(view, /Onboard now/);
  assert.match(view, /Cargo totals/);
  assert.doesNotMatch(view, /load-stop-title/);
  assert.doesNotMatch(view, /load-previous/);
  assert.doesNotMatch(view, /load-next/);
  assert.doesNotMatch(view, /CURRENT DESTINATION/);
});

test('navigation uses original SVG symbols instead of letter abbreviations', () => {
  const html = read('index.html');
  const icons = read('mfd-icons.js');
  const pages = read('product-pages.js');
  const shell = read('product-shell.js');
  assert.match(html, /src="mfd-icons\.js"/);
  assert.ok(html.indexOf('src="mfd-icons.js"') < html.indexOf('src="product-pages.js"'));
  assert.match(icons, /<svg class=/);
  ['operations', 'missions', 'planner', 'starmap', 'fleet', 'development'].forEach((name) => {
    assert.match(pages, new RegExp(`icon: '${name}'`));
  });
  assert.match(shell, /SCCompanionMfdIcons/);
  assert.doesNotMatch(pages, /icon: 'OP'/);
});

test('Drake MFD is registered as v0.12 and Mission Validation follows it', () => {
  const app = read('app.js');
  const changelog = read('CHANGELOG.md');
  assert.match(app, /ui-rebuild\.css', 'drake-mfd\.css/);
  assert.match(changelog, /## \[0\.12\.0\]/);
  assert.match(changelog, /Mission Validation moved to v0\.13/);
});