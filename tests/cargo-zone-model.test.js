'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const zones = require('../cargo-zone-model.js');
const catalog = require('../ship-catalog.js');

test('custom cargo zones must exactly fill the physical ship grid', () => {
  const normalized = zones.normalizeZones([
    { id: 'rear', label: 'Rear', access: 'Ramp', capacityScu: 32, layers: 4, columns: 8, separable: true },
    { id: 'front', label: 'Front', access: 'Through rear', capacityScu: 40, layers: 5, columns: 8, separable: true }
  ], 72);
  assert.equal(normalized.reduce((sum, zone) => sum + zone.capacityScu, 0), 72);
  assert.equal(normalized[0].id, 'rear');
  assert.throws(() => zones.normalizeZones([
    { id: 'rear', label: 'Rear', access: 'Ramp', capacityScu: 30, layers: 4, columns: 8 }
  ], 72), /requires exactly 72 SCU/);
});

test('cargo zone identifiers remain unique and fields remain usable', () => {
  assert.throws(() => zones.normalizeZones([
    { id: 'same', label: 'Rear', access: 'Ramp', capacityScu: 36, layers: 3, columns: 8 },
    { id: 'same', label: 'Front', access: 'Rear', capacityScu: 36, layers: 3, columns: 8 }
  ], 72), /identifiers must be unique/);
  assert.throws(() => zones.normalizeZones([
    { id: 'rear', label: '', access: 'Ramp', capacityScu: 72, layers: 3, columns: 8 }
  ], 72), /label is required/);
});

test('saved zones apply only to the selected ship instance', () => {
  const base = catalog.getModel('drake-corsair');
  const ship = { id: 'corsair-main', modelId: base.id, cargoCapacityScu: 72 };
  const custom = [{ id: 'single', label: 'Single bay', access: 'Rear ramp', capacityScu: 72, layers: 6, columns: 12, separable: false }];
  const resolved = zones.resolveModel(base, ship, { 'corsair-main': { zones: custom } });
  const untouched = zones.resolveModel(base, { ...ship, id: 'corsair-two' }, { 'corsair-main': { zones: custom } });
  assert.equal(resolved.layout.zones.length, 1);
  assert.equal(resolved.layout.zones[0].label, 'Single bay');
  assert.equal(untouched.layout.zones.length, 3);
});

test('default zone generation preserves arbitrary ship capacity', () => {
  const generated = zones.createEvenZones(46, 3);
  assert.equal(generated.length, 3);
  assert.equal(generated.reduce((sum, zone) => sum + zone.capacityScu, 0), 46);
  assert.ok(generated.every((zone) => zone.layers >= 1 && zone.columns >= 1));
});
