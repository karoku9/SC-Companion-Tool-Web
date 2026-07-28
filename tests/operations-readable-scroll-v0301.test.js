'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('Operations keeps readable scrolling while cargo replaces the route map', () => {
  const readableCss = read('operations-readable-scroll-v0301.css');
  const readableLoader = read('operations-readable-scroll-v0301.js');
  const cargoCss = read('operations-cargo-primary-v0302.css');
  const cargoLoader = read('operations-cargo-primary-v0302.js');
  const app = read('app.js');
  const index = read('index.html');

  assert.doesNotThrow(() => new Function(readableLoader));
  assert.doesNotThrow(() => new Function(cargoLoader));
  assert.match(readableLoader, /operations-readable-scroll-v0301\.css\?v=0\.30\.1/);
  assert.match(cargoLoader, /operations-cargo-primary-v0302\.css\?v=0\.30\.2/);
  assert.match(cargoLoader, /primary\.insertBefore\(cargoPanel, currentPanel\)/);
  assert.match(cargoLoader, /mapPanel\.remove\(\)/);
  assert.match(app, /operations-readable-scroll-v0301\.js'[\s\S]*operations-cargo-primary-v0302\.js'[\s\S]*ship-selector-sync\.js'/);
  assert.match(index, /app\.js\?v=0\.30\.2/);

  assert.match(readableCss, /overflow-y:\s*auto/);
  assert.match(cargoCss, /grid-template-areas:\s*\n\s*"command"\s*\n\s*"primary"\s*\n\s*"timeline"\s*\n\s*"tools"/);
  assert.match(cargoCss, /ops-v0302-primary-cargo[\s\S]*min-height:\s*540px/);
  assert.match(cargoCss, /ops-v028-cargo-grid[\s\S]*min-height:\s*356px/);
  assert.match(readableCss, /ops-v027-timeline-panel[\s\S]*min-height:\s*300px/);
  assert.match(readableCss, /ops-v028-stop-card[\s\S]*min-width:\s*248px/);
  assert.doesNotMatch(cargoCss, /ops-live-navigation/);
});
