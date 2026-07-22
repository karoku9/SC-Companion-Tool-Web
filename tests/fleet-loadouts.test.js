'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const loadouts = require('../fleet-loadouts.js');

function state() {
  return {
    selectedShipId: 'corsair-main',
    hangarShips: [{
      id: 'corsair-main', modelId: 'drake-corsair', cargoCapacityScu: 72,
      quantumDrive: 'Stock', quantumTimeFactor: 1, notes: 'Keep this'
    }]
  };
}

test('legacy ship fields migrate into a named structured loadout', () => {
  const migrated = loadouts.migrateState(state());
  const active = loadouts.activeLoadout(migrated, 'corsair-main');
  assert.equal(active.name, 'Imported configuration');
  assert.equal(active.components[0].slot, 'quantum-drive');
  assert.equal(active.components[0].name, 'Stock');
  assert.equal(active.components[0].source.kind, 'legacy');
  assert.equal(migrated.hangarShips[0].notes, 'Keep this');
});

test('named loadouts switch without replacing ship identity', () => {
  const migrated = loadouts.migrateState(state());
  const saved = loadouts.saveLoadoutState(migrated, 'corsair-main', {
    id: 'corsair-fast',
    name: 'Fast Stanton',
    components: [{
      id: 'q-fast', slot: 'quantum-drive', name: 'Custom fast drive',
      performance: { quantumTimeFactor: 0.82, fuelEfficiencyFactor: 1.15 },
      source: { kind: 'user', authority: 'Manual record', note: 'Measured manually' }
    }],
    performanceOverrides: { handlingTimeFactor: 0.9, cargoCapacityDeltaScu: -4 }
  });
  assert.equal(saved.selectedShipId, 'corsair-main');
  assert.equal(saved.activeLoadoutByShip['corsair-main'], 'corsair-fast');
  assert.equal(saved.hangarShips[0].id, 'corsair-main');
  assert.equal(saved.hangarShips[0].quantumTimeFactor, 0.82);
  assert.equal(saved.hangarShips[0].cargoCapacityScu, 68);
});

test('active performance exposes navigation cargo handling and provenance boundaries', () => {
  const saved = loadouts.saveLoadoutState(state(), 'corsair-main', {
    id: 'corsair-haul',
    name: 'Hauling setup',
    components: [{
      slot: 'quantum-drive', name: 'Atlas-like manual entry',
      performance: { quantumTimeFactor: 0.9, quantumSpoolSeconds: 5, fuelEfficiencyFactor: 0.8 },
      source: { kind: 'user', authority: 'Manual entry' }
    }, {
      slot: 'cargo-module', name: 'Temporary cargo rack',
      performance: { cargoCapacityDeltaScu: 6 },
      source: { kind: 'unknown' }
    }],
    performanceOverrides: { handlingTimeFactor: 0.75 }
  });
  const performance = loadouts.activePerformance(saved);
  assert.equal(performance.quantumTimeFactor, 0.9);
  assert.equal(performance.quantumSpoolSeconds, 5);
  assert.equal(performance.fuelEfficiencyFactor, 0.8);
  assert.equal(performance.handlingTimeFactor, 0.75);
  assert.equal(performance.operationalCargoCapacityScu, 78);
  assert.equal(performance.sources.length, 2);
  assert.ok(performance.unknowns.some((item) => item.includes('provenance')));
});

test('deleting an active loadout falls back to the remaining configuration', () => {
  const withSecond = loadouts.saveLoadoutState(state(), 'corsair-main', { id: 'second', name: 'Second' });
  const deleted = loadouts.deleteLoadoutState(withSecond, 'corsair-main', 'second');
  assert.equal(loadouts.loadoutsForShip(deleted, 'corsair-main').length, 1);
  assert.equal(deleted.activeLoadoutByShip['corsair-main'], 'corsair-main-legacy');
});
