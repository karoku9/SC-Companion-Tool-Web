'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('the document identifies the rebuild rather than a numbered patch layer', () => {
  const html = read('index.html');
  assert.match(html, /name="sc-companion-ui" content="rebuild"/);
  assert.match(html, /ui\/app\.css/);
  assert.match(html, /app\.js\?v=/);
});

test('the active runtime does not load any replaced Operations generation', () => {
  const app = read('app.js');
  assert.match(app, /ui\/app-shell\.js/);
  assert.doesNotMatch(app, /operations-rebuild-v040|operations-v040|operational-ui-v025|operations-flow-v028|operations-design-v027/);
});
