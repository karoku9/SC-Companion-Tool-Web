'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

let state = {
  selectedShipId: 'corsair-main',
  cargoManualLayouts: {}
};

global.SCCompanionSession = {
  getState() { return state; },
  patch(changes) { state = { ...state, ...changes }; return state; }
};

const geometry = Object.freeze({ rows: 2, columns: 2, layers: 3, orientation: 'Rear ramp at row A' });
const groups = Object.freeze([
  Object.freeze({ key: 'destination:one', label: 'One', scu: 3, colorIndex: 0, unloadOrder: 1, coordinates: ['A1'] }),
  Object.freeze({ key: 'destination:two', label: 'Two', scu: 3, colorIndex: 1, unloadOrder: 2, coordinates: ['B1'] })
]);
const floorCells = Object.freeze([
  Object.freeze({ id: '0:0', row: 0, column: 0, coordinate: 'A1', groupKey: 'destination:one', colorIndex: 0, usedLayers: 3, capacityLayers: 3, empty: false, buffer: false }),
  Object.freeze({ id: '0:1', row: 0, column: 1, coordinate: 'A2', groupKey: null, colorIndex: null, usedLayers: 0, capacityLayers: 3, empty: true, buffer: false }),
  Object.freeze({ id: '1:0', row: 1, column: 0, coordinate: 'B1', groupKey: 'destination:two', colorIndex: 1, usedLayers: 3, capacityLayers: 3, empty: false, buffer: false }),
  Object.freeze({ id: '1:1', row: 1, column: 1, coordinate: 'B2', groupKey: null, colorIndex: null, usedLayers: 0, capacityLayers: 3, empty: true, buffer: false })
]);

const automatic = Object.freeze({
  mode: 'destination',
  modelId: 'drake-corsair',
  modelLabel: 'Drake Corsair',
  capacityScu: 12,
  usedScu: 6,
  freeScu: 6,
  geometry,
  assignments: Object.freeze([]),
  floorCells,
  groups,
  basis: 'automatic'
});

global.SCCompanionAutoCargoLayout = {
  plan() { return automatic; },
  version: '0.29.2'
};

const manual = require('../cargo-manual-layout-v030.js');
const model = { id: 'drake-corsair', model: 'Corsair', capacityScu: 12 };

test('manual mode moves a complete floor stack to an exact coordinate', () => {
  let layout = manual.plan({}, model, {});
  manual.setEnabled(model, true);
  manual.moveCell(model, '0:0', '0:1', layout);
  layout = manual.plan({}, model, {});

  const source = layout.floorCells.find((cell) => cell.id === '0:0');
  const target = layout.floorCells.find((cell) => cell.id === '0:1');
  assert.equal(source.forcedEmpty, true);
  assert.equal(source.groupKey, null);
  assert.equal(target.groupKey, 'destination:one');
  assert.equal(target.usedLayers, 3);
  assert.equal(target.manual, true);
});

test('reserved physical cells reduce usable official grid capacity', () => {
  manual.toggleReserved(model, '1:1');
  const layout = manual.plan({}, model, {});
  const reserved = layout.floorCells.find((cell) => cell.id === '1:1');
  assert.equal(reserved.reserved, true);
  assert.equal(layout.reservedScu, 3);
  assert.equal(layout.usableCapacityScu, 9);
  assert.equal(layout.freeScu, 3);
});

test('reset restores automatic placement and removes physical reservations', () => {
  manual.reset(model);
  const layout = manual.plan({}, model, {});
  assert.equal(layout.manual.active, false);
  assert.equal(layout.reservedScu, 0);
  assert.equal(layout.floorCells.find((cell) => cell.id === '0:0').groupKey, 'destination:one');
  assert.equal(layout.floorCells.find((cell) => cell.id === '1:1').reserved, undefined);
});
