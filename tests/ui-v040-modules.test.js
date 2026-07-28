'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('Operations 0.40 support modules contain valid script syntax', () => {
  [
    'operations-rebuild-v040.js',
    'operations-v040-manual-grid-bridge.js',
    'missions-review-location-normalizer-v040.js',
    'missions-session-sync-v040.js',
    'cargo-grid-geometry-compat-v040.js'
  ].forEach((name) => assert.doesNotThrow(() => new Function(read(name)), `${name} contains invalid JavaScript`));
});

test('the module loader and document use the final 0.40 cache generation', () => {
  const loader = read('operations-rebuild-v040-loader.js');
  const html = read('index.html');

  assert.match(loader, /operations-rebuild-v040\.css\?v=0\.40\.0/);
  assert.match(loader, /operations-rebuild-v040\.js\?v=0\.40\.0/);
  assert.match(loader, /cargo-grid-geometry-compat-v040\.js\?v=0\.40\.0/);
  assert.match(html, /name="sc-companion-ui" content="0\.40\.0"/);
  assert.match(html, /app\.js\?v=0\.40\.0/);
});

test('the rebuilt runtime does not load the retired Operations patch chain', () => {
  const app = read('app.js');
  assert.match(app, /operations-rebuild-v040-loader\.js/);
  assert.doesNotMatch(app, /operational-ui-v025\.js|operational-polish-v026\.js|operations-design-v027\.js|operations-flow-v028\.js|operations-readable-short-desktop-v0291\.js|operations-cargo-guidance-v0292\.js|operations-readable-scroll-v0301\.js|operations-cargo-primary-v0302\.js|operations-adaptive-fit-v0303\.js|operations-balanced-cockpit-v0304\.js/);
});
