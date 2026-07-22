'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('operation hierarchy keeps action and cargo above route and mission metadata', () => {
  const routeView = read('route-view.js');
  const tools = read('ui-v2-operations.js');
  const css = read('ui-v2-operations.css');

  assert.match(routeView, /operation-primary/);
  assert.match(routeView, /operation-context/);
  assert.match(routeView, /operation-mission/);
  assert.match(routeView, /PICK UP/);
  assert.match(routeView, /DROP OFF/);
  assert.match(tools, /action-code/);
  assert.match(tools, /missionTitle/);
  assert.match(css, /\.operation-primary strong/);
  assert.match(css, /\.operation-context/);
  assert.match(css, /\.operation-mission/);
});
