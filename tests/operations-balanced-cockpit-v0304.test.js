'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('Operations replaces wasted cargo/current height with a useful timeline', () => {
  const css = read('operations-balanced-cockpit-v0304.css');
  const loader = read('operations-balanced-cockpit-v0304.js');
  const app = read('app.js');

  assert.doesNotThrow(() => new Function(loader));
  assert.match(loader, /operations-balanced-cockpit-v0304\.css\?v=0\.30\.4/);
  assert.match(app, /operations-adaptive-fit-v0303\.js'[\s\S]*operations-balanced-cockpit-v0304\.js'[\s\S]*ship-selector-sync\.js'/);

  assert.match(css, /data-ops-density="compact"[\s\S]*--ops-timeline-height:\s*194px/);
  assert.match(css, /grid-template-rows:\s*minmax\(0, 1fr\) var\(--ops-cargo-manifest-height\)/);
  assert.match(css, /grid-template-areas:\s*\n\s*"cargo-grid"\s*\n\s*"cargo-manifest"/);
  assert.match(css, /ops-v028-cargo-legend[\s\S]*display:\s*flex/);
  assert.match(css, /ops-v028-cargo-legend em[\s\S]*display:\s*none/);
  assert.match(css, /ops-v028-upcoming[\s\S]*margin-top:\s*auto/);
  assert.match(css, /ops-v028-stop-card[\s\S]*min-width:\s*210px/);
  assert.match(css, /content:\s*"UI 0\.30\.4"/);
});
