'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const dataSource = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
const haulingSource = fs.readFileSync(path.join(root, 'hauling-core.js'), 'utf8');
const transferSource = fs.readFileSync(path.join(root, 'transfer-core.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styleSource = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
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
  vm.runInContext(haulingSource, context, { filename: 'hauling-core.js' });
  vm.runInContext(transferSource, context, { filename: 'transfer-core.js' });
  vm.runInContext(`${definitions}\nglobalThis.__core = { state, normalizeMission, generateRoute, statusDerived, persistedState, fleetShipLabel, routeStartContext, plannerChangeNotice };`, context, { filename: 'app.js' });
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
  assert.equal(core.state.version, 2);
  assert.equal(core.state.ui.storageRecovery, true);
  assert.ok(core.state.fleet.length > 0);
  assert.ok(core.state.missions.length > 0);
  assert.ok(core.state.plannedRoute.steps.length > 0);
});

test('Checkpoint 2.1: active route snapshot survives all Planner source changes', () => {
  const core = loadCore();
  const snapshot = JSON.stringify(core.state.activeRoute);
  const unchanged = action => { action(); assert.equal(JSON.stringify(core.state.activeRoute), snapshot); };

  unchanged(() => { core.state.missions[0] = { ...core.state.missions[0], title: 'Edited source mission' }; core.state.plannedRoute = null; });
  unchanged(() => { core.state.missions = core.state.missions.slice(1); core.state.plannedRoute = null; });
  unchanged(() => { const source = core.state.missions[0]; core.state.missions.push({ ...JSON.parse(JSON.stringify(source)), id: 'duplicate-mission' }); core.state.plannedRoute = null; });
  unchanged(() => { core.state.selectedShipId = core.state.fleet[1].id; core.state.plannedRoute = null; });
  unchanged(() => { core.state.startingLocationId = 'port-tressler'; core.state.plannedRoute = null; });
  unchanged(() => { core.state.plannedRoute = core.generateRoute(core.state.missions, core.state.startingLocationId); });

  assert.equal(core.state.activeRoute.shipSnapshot.label, 'Long Haul — Drake Caterpillar');
  assert.equal(core.state.activeRoute.startingLocationSnapshot.name, 'Everus Harbor');
  assert.equal(core.plannerChangeNotice(), 'The current active route will remain unchanged. Recalculate to apply Planner changes.');
});

test('Checkpoint 2.1: legacy active routes gain ship and origin metadata without route mutation', () => {
  const seed = loadCore();
  const saved = JSON.parse(JSON.stringify(seed.persistedState(seed.state)));
  const originalSteps = JSON.stringify(saved.activeRoute.steps);
  const originalManifest = JSON.stringify(saved.activeRoute.manifest);
  delete saved.activeRoute.shipSnapshot;
  delete saved.activeRoute.startingLocationSnapshot;
  const migrated = loadCore(JSON.stringify(saved));
  assert.equal(migrated.state.activeRoute.shipSnapshot.label, 'Long Haul — Drake Caterpillar');
  assert.equal(migrated.state.activeRoute.startingLocationSnapshot.name, 'Everus Harbor');
  assert.equal(JSON.stringify(migrated.state.activeRoute.steps), originalSteps);
  assert.equal(JSON.stringify(migrated.state.activeRoute.manifest), originalManifest);
});

test('Checkpoint 2.1: starting any new route detects and describes active-route replacement', () => {
  const core = loadCore();
  assert.equal(core.routeStartContext().replacingActive, true);
  assert.match(appSource, /This will end and replace the current active route\./);
  core.state.missions[0].cargo[0].scu = 9999;
  assert.ok(core.routeStartContext().overBy > 0);
  assert.match(appSource, /actionLabel: 'Start overloaded route'/);
});

test('Checkpoint 2.1: ship labels retain nickname and model everywhere', () => {
  const core = loadCore();
  const entry = core.state.fleet[0];
  assert.equal(core.fleetShipLabel(entry), 'Long Haul — Drake Caterpillar');
  assert.equal(core.fleetShipLabel({ shipId: 'taurus', nickname: '' }), 'RSI Constellation Taurus');
  assert.doesNotMatch(appSource, /markupSafe\(entry\.nickname \|\| ship\.name\)/);
});

test('Checkpoint 2.1: dialog and sidebar copy are unambiguous', () => {
  assert.match(htmlSource, />Cancel<\/button>/);
  assert.doesNotMatch(htmlSource, />Keep it<\/button>/);
  assert.match(htmlSource, /<strong>Local application<\/strong><small>No live telemetry<\/small>/);
});

test('Checkpoint 2.1: map and Entity Tree expose distinct static route states', () => {
  ['is-completed', 'is-current', 'is-remaining'].forEach(stateClass => assert.match(appSource, new RegExp(stateClass)));
  assert.match(styleSource, /path\.is-completed[^}]*opacity:\.3/);
  assert.match(styleSource, /path\.is-current[^}]*stroke-width:1\.35/);
  assert.match(styleSource, /path\.is-remaining[^}]*accent-secondary/);
  assert.match(styleSource, /button\.is-completed[^}]*opacity:\.58/);
  assert.match(styleSource, /button\.is-current[^}]*accent-emissive/);
  assert.match(styleSource, /button\.is-remaining small[^}]*accent-secondary/);
  assert.doesNotMatch(styleSource, /(?:route-line-svg|map-node|tree-children)[^}]*animation:/);
});
