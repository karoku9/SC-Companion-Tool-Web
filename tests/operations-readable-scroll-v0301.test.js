'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('Operations fits supported desktop viewports while cargo remains primary', () => {
  const cargoLoader = read('operations-cargo-primary-v0302.js');
  const adaptiveCss = read('operations-adaptive-fit-v0303.css');
  const adaptiveReadableCss = read('operations-adaptive-fit-v0303-readable.css');
  const adaptiveCleanupCss = read('operations-adaptive-fit-v0303-cleanup.css');
  const adaptiveLoader = read('operations-adaptive-fit-v0303.js');
  const app = read('app.js');
  const index = read('index.html');

  assert.doesNotThrow(() => new Function(cargoLoader));
  assert.doesNotThrow(() => new Function(adaptiveLoader));
  assert.match(cargoLoader, /primary\.insertBefore\(cargoPanel, currentPanel\)/);
  assert.match(cargoLoader, /mapPanel\.remove\(\)/);
  assert.match(adaptiveLoader, /appendStyle\('operations-adaptive-fit-v0303\.css'/);
  assert.match(adaptiveLoader, /appendStyle\('operations-adaptive-fit-v0303-readable\.css'/);
  assert.match(adaptiveLoader, /appendStyle\('operations-adaptive-fit-v0303-cleanup\.css'/);
  assert.match(adaptiveLoader, /if \(width < 1280 \|\| height < 680\) return 'flow'/);
  assert.match(adaptiveLoader, /if \(width < 1450 \|\| height < 760\) return 'tight'/);
  assert.match(adaptiveLoader, /if \(height < 860\) return 'compact'/);
  assert.match(app, /operations-cargo-primary-v0302\.js'[\s\S]*operations-adaptive-fit-v0303\.js'[\s\S]*ship-selector-sync\.js'/);
  assert.match(index, /app\.js\?v=0\.30\.2/);

  assert.match(adaptiveCss, /grid-template-rows:\s*\n\s*var\(--ops-command-height\)\s*\n\s*minmax\(0, 1fr\)\s*\n\s*var\(--ops-timeline-height\)\s*\n\s*var\(--ops-tools-height\)/);
  assert.match(adaptiveCss, /height:\s*100dvh/);
  assert.match(adaptiveCss, /overflow:\s*hidden/);
  assert.match(adaptiveCss, /ops-v0302-primary-cargo[\s\S]*height:\s*100%/);
  assert.match(adaptiveCss, /current-operation-panel[\s\S]*grid-template-rows:\s*var\(--ops-panel-header-height\) minmax\(0, 1fr\) var\(--ops-controls-height\)/);
  assert.match(adaptiveCss, /ops-v027-timeline-panel[\s\S]*height:\s*var\(--ops-timeline-height\)/);
  assert.match(adaptiveCss, /data-ops-density="flow"/);
  assert.match(adaptiveReadableCss, /font-size:\s*11\.5px/);
  assert.match(adaptiveCleanupCss, /current-stop-intel[\s\S]*display:\s*none/);
});
