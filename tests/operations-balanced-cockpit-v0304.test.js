'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('Live Ops is action-first and changes proportion for cargo steps', () => {
  const ui = read('ui/app-shell.js');
  const css = read('ui/app.css');
  assert.match(ui, /command-panel/);
  assert.match(ui, /live-grid\$\{isAction \? ' is-cargo-step'/);
  assert.match(ui, /Next meaningful step/);
  assert.match(css, /\.live-grid\.is-cargo-step/);
  assert.match(css, /\.command-main h1/);
  assert.doesNotMatch(ui, /ops40-|operations-rebuild-v040/);
});
