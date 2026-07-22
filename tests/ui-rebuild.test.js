'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('interface and MFD scripts remain valid JavaScript', () => {
  ['ui-rebuild.js', 'mfd-icons.js', 'product-shell.js', 'workspace-shell.js', 'load-operations-view.js', 'mfd-layout-v2.js'].forEach((file) => {
    assert.doesNotThrow(() => new Function(read(file)), `${file} contains invalid JavaScript`);
  });
});

test('MFD v2 uses screen proportions instead of oversized web cards', () => {
  const css = read('mfd-layout-v2.css');
  assert.match(css, /--mfd-screen:/);
  assert.match(css, /font-size: clamp\(1\.65rem, 3\.3vw, 2\.65rem\)/);
  assert.match(css, /height: calc\(100dvh - 48px\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) 228px/);
  assert.match(css, /OPS \/ CURRENT STOP/);
  assert.match(css, /ROUTE INDEX \/ ACTIVE SEQUENCE/);
  assert.match(css, /operations-command-strip strong \{ display: none; \}/);
});

test('wide desktop tools stay in flow and narrow screens use the overlay fallback', () => {
  const css = read('mfd-layout-v2.css');
  const workspace = read('workspace-shell.js');
  assert.match(css, /@media \(min-width: 1120px\)/);
  assert.match(css, /operations-mfd-frame\.has-utility-panel[\s\S]*grid-template-columns:/);
  assert.match(css, /workspace-drawer[\s\S]*position: relative/);
  assert.match(css, /@media \(max-width: 1119px\)[\s\S]*workspace-drawer[\s\S]*position: fixed/);
  assert.match(workspace, /operations-mfd-frame/);
  assert.match(workspace, /has-utility-panel/);
});

test('close command has a defensive capture handler and hard resets all panel state', () => {
  const js = read('mfd-layout-v2.js');
  assert.match(js, /forceCloseUtilityPanel/);
  assert.match(js, /#workspace-drawer-close/);
  assert.match(js, /stopImmediatePropagation/);
  assert.match(js, /drawer\.hidden = true/);
  assert.match(js, /workspace-drawer-open/);
  assert.match(js, /hashchange/);
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

test('MFD layout rebuild is registered as v0.13 and Mission Validation follows it', () => {
  const app = read('app.js');
  const changelog = read('CHANGELOG.md');
  assert.match(app, /drake-mfd\.css', 'mfd-layout-v2\.css/);
  assert.match(app, /mfd-layout-v2\.js/);
  assert.match(changelog, /## \[0\.13\.0\]/);
  assert.match(changelog, /Mission Validation moved to v0\.14/);
});
