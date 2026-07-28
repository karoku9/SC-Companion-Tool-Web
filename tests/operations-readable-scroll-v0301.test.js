'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('Operations prioritizes 100% zoom readability over one-screen compression', () => {
  const css = read('operations-readable-scroll-v0301.css');
  const loader = read('operations-readable-scroll-v0301.js');
  const app = read('app.js');
  const index = read('index.html');

  assert.doesNotThrow(() => new Function(loader));
  assert.match(loader, /operations-readable-scroll-v0301\.css\?v=0\.30\.1/);
  assert.match(app, /cargo-manual-grid-fit-v030\.js'[\s\S]*operations-readable-scroll-v0301\.js'[\s\S]*ship-selector-sync\.js'/);
  assert.match(index, /app\.js\?v=0\.30\.1/);

  assert.match(css, /overflow-y:\s*auto/);
  assert.match(css, /grid-template-areas:\s*\n\s*"command"\s*\n\s*"primary"\s*\n\s*"timeline"\s*\n\s*"cargo"\s*\n\s*"tools"/);
  assert.match(css, /ops-v027-primary-grid[\s\S]*min-height:\s*540px/);
  assert.match(css, /ops-v027-timeline-panel[\s\S]*min-height:\s*300px/);
  assert.match(css, /ops-v028-cargo-panel[\s\S]*min-height:\s*390px/);
  assert.match(css, /ops-v028-stop-card[\s\S]*min-width:\s*248px/);
  assert.doesNotMatch(css, /documentHeight\s*<=\s*viewportHeight/);
});
