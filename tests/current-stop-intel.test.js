'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

test('Operations renders practical destination intel inside the current stop panel', () => {
  const view = read('route-view.js');
  const css = read('ui-v2-operations.css');

  assert.match(view, /current-stop-intel/);
  assert.match(view, /TRAVEL ETA/);
  assert.match(view, /FINAL APPROACH/);
  assert.match(view, /SECURITY \/ RISK/);
  assert.match(view, /HANGAR \/ PAD/);
  assert.match(view, /FUEL \/ REPAIR/);
  assert.match(view, /FOOD \/ DRINK/);
  assert.match(view, /MEDICAL/);
  assert.match(view, /estimateLeg\(inboundFrom, current/);
  assert.match(view, /estimateArrival\(preset, traffic\)/);
  assert.match(view, /context\.risk\.armistice/);
  assert.match(view, /context\.risk\.commArray/);
  assert.match(view, /service\(context, 'hangars'\)/);
  assert.match(view, /service\(context, 'landing-services'\)/);
  assert.match(css, /\.current-stop-intel-grid/);
  assert.match(css, /data-state="extreme"/);
});

test('Current stop intel supports stations, landing zones and surface facilities', () => {
  const view = read('route-view.js');
  assert.match(view, /asteroid-station/);
  assert.match(view, /landing-zone/);
  assert.match(view, /distribution-center/);
  assert.match(view, /outpost/);
  assert.match(view, /Static reviewed facility and security guidance/);
});