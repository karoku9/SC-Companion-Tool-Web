'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('the application exposes five user workspaces in workflow order', () => {
  const ui = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app-shell.js'), 'utf8');
  const order = ['contracts', 'plan', 'live', 'fleet', 'intel'].map((id) => ui.indexOf(`id: '${id}'`));
  order.forEach((index) => assert.ok(index >= 0));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.doesNotMatch(ui, /id: 'roadmap'|id: 'development'/);
});
