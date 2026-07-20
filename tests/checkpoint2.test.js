'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const dataSource = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const definitions = appSource.slice(0, appSource.indexOf("document.addEventListener('click'"));

function loadCore(savedValue = null) {
  const storage = new Map();
  if (savedValue !== null) storage.set('waypoint-cargo-companion-state', savedValue);
  const context = vm.createContext({
    window: {},
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    },
    console,
    setTimeout,
    clearTimeout
  });
  vm.runInContext(dataSource, context, { filename: 'data.js' });
  vm.runInContext(`${definitions}\nglobalThis.__core = { state, normalizeMission, generateRoute, statusDerived, persistedState };`, context, { filename: 'app.js' });
  return context.__core;
}

function mission(id, reference, lots) {
  return { id, title: `Mission ${reference}`, type: 'Hauling', reference, reward: 1000, notes: '', cargo: lots.map((lot, index) => ({ id: `${id}-lot-${index}`, missionId: id, commodity: lot.commodity, scu: lot.scu, pickupLabel: lot.pickup, deliveryLabel: lot.delivery, note: '' })) };
}

test('Scenario A: one lot generates pickup before delivery', () => {
  const core = loadCore();
  const route = core.generateRoute([mission('a', 'A-01', [{ commodity: 'Titanium', scu: 8, pickup: 'HDMS-Bezdek', delivery: 'Lorville' }])].map(core.normalizeMission), 'everus');
  const pickup = route.steps.findIndex(step => step.kind === 'pickup');
  const delivery = route.steps.findIndex(step => step.kind === 'delivery');
  assert.ok(pickup >= 0 && delivery > pickup);
  assert.equal(route.steps.filter(step => step.kind === 'pickup').length, 1);
  assert.equal(route.steps.filter(step => step.kind === 'delivery').length, 1);
});

test('Scenario B: identical commodities keep separate mission and lot identity', () => {
  const core = loadCore();
  const missions = [
    mission('b1', 'B-01', [{ commodity: 'Titanium', scu: 8, pickup: 'HDMS-Bezdek', delivery: 'Lorville' }]),
    mission('b2', 'B-02', [{ commodity: 'Titanium', scu: 4, pickup: 'HDMS-Bezdek', delivery: 'Lorville' }])
  ].map(core.normalizeMission);
  const route = core.generateRoute(missions, 'everus');
  const pickups = route.steps.filter(step => step.kind === 'pickup');
  const deliveries = route.steps.filter(step => step.kind === 'delivery');
  assert.deepEqual(new Set(pickups.map(step => step.missionId)).size, 2);
  assert.deepEqual(new Set(pickups.map(step => step.lotId)).size, 2);
  assert.deepEqual(new Set(deliveries.map(step => step.lotId)).size, 2);
});

test('Scenario C: multi-location route groups actions and never travels to the same location', () => {
  const core = loadCore();
  const missions = [
    mission('c1', 'C-01', [{ commodity: 'Titanium', scu: 8, pickup: 'HDMS-Bezdek', delivery: 'Lorville' }]),
    mission('c2', 'C-02', [{ commodity: 'Agricium', scu: 4, pickup: 'HDMS-Bezdek', delivery: 'Lorville' }, { commodity: 'Medical Supplies', scu: 2, pickup: 'Port Tressler', delivery: 'Area18' }])
  ].map(core.normalizeMission);
  const route = core.generateRoute(missions, 'everus');
  assert.equal(route.steps.some(step => step.kind === 'travel' && step.location === step.nextLocation), false);
  missions.flatMap(item => item.cargo).forEach(lot => {
    assert.ok(route.steps.findIndex(step => step.kind === 'pickup' && step.lotId === lot.id) < route.steps.findIndex(step => step.kind === 'delivery' && step.lotId === lot.id));
  });
  const bezdekPickups = route.steps.filter(step => step.kind === 'pickup' && step.location === 'HDMS-Bezdek');
  assert.equal(bezdekPickups.length, 2);
  assert.equal(route.steps.indexOf(bezdekPickups[1]) - route.steps.indexOf(bezdekPickups[0]), 1);
});

test('Scenario E: derived cargo status reverses with the step index', () => {
  const core = loadCore();
  const route = core.generateRoute([mission('e', 'E-01', [{ commodity: 'Titanium', scu: 8, pickup: 'HDMS-Bezdek', delivery: 'Lorville' }])].map(core.normalizeMission), 'everus');
  const lotId = route.lotIds[0];
  const pickup = route.steps.findIndex(step => step.kind === 'pickup');
  const delivery = route.steps.findIndex(step => step.kind === 'delivery');
  core.state.activeRoute = { ...route, status: 'active', stepIndex: pickup, manualCorrections: {} };
  assert.equal(core.statusDerived(lotId), 'Ready to load');
  core.state.activeRoute.stepIndex = pickup + 1;
  assert.equal(core.statusDerived(lotId), 'On board');
  core.state.activeRoute.stepIndex = delivery;
  assert.equal(core.statusDerived(lotId), 'Ready to deliver');
  core.state.activeRoute.stepIndex = delivery + 1;
  assert.equal(core.statusDerived(lotId), 'Delivered');
  core.state.activeRoute.stepIndex = pickup;
  assert.equal(core.statusDerived(lotId), 'Ready to load');
});

test('Scenario H: malformed persisted data falls back to safe defaults', () => {
  const core = loadCore('{malformed json');
  assert.equal(core.state.version, 1);
  assert.equal(core.state.ui.storageRecovery, true);
  assert.ok(core.state.fleet.length > 0);
  assert.ok(core.state.missions.length > 0);
  assert.ok(core.state.plannedRoute.steps.length > 0);
});
