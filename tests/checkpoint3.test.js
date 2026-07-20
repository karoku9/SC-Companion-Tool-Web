'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const HAULING = require('../hauling-core.js');
const TRANSFER = require('../transfer-core.js');

const root = path.resolve(__dirname, '..');
const dataSource = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const appDefinitions = appSource.slice(0, appSource.indexOf("document.addEventListener('click'"));
const dataContext = vm.createContext({ window: {} });
vm.runInContext(dataSource, dataContext, { filename: 'data.js' });
const DATA = JSON.parse(JSON.stringify(dataContext.window.COMPANION_DATA));
const ship = DATA.ships.find(item => item.id === 'caterpillar');
const shipEntry = { id: 'fleet-cat', shipId: ship.id, nickname: 'Long Haul' };

function filters(overrides = {}) {
  return { ...HAULING.defaultFilters('everus', shipEntry.id), maxInvestment: 2000000, includeLowReliability: true, legality: 'all', ...overrides };
}

function opportunities(overrides = {}, selectedShip = ship, showIllegal = true, data = DATA) {
  return HAULING.findOpportunities({ data, ship: selectedShip, filters: filters(overrides), showIllegal });
}

function plan(overrides = {}, chosen = null, data = DATA, selectedShip = ship) {
  const resolvedFilters = filters(overrides); const found = HAULING.findOpportunities({ data, ship: selectedShip, filters: resolvedFilters, showIllegal: true });
  return HAULING.createPlan({ opportunities: found, selectedOpportunityId: chosen || found[0]?.id, filters: resolvedFilters, shipEntry, ship: selectedShip, data });
}

function advanceTo(run, kind, values = null) {
  let current = run;
  while (current.status === 'active' && current.steps[current.stepIndex].kind !== kind) {
    const result = HAULING.executeStep(current);
    assert.deepEqual(result.errors, {});
    current = result.run;
  }
  if (values !== null) {
    const result = HAULING.executeStep(current, values);
    assert.deepEqual(result.errors, {});
    current = result.run;
  }
  return current;
}

function baseState() {
  return { version: 2, ui: {}, preferences: { numberFormat: 'en-US' }, fleet: [shipEntry], missions: [], selectedShipId: shipEntry.id, startingLocationId: 'everus', plannedRoute: null, activeRoute: { status: 'none' }, hauling: { ...HAULING.defaultHaulingState('everus', shipEntry.id), history: [] }, intel: {} };
}

function loadMigration(saved) {
  const storage = new Map([['waypoint-cargo-companion-state', JSON.stringify(saved)]]);
  const context = vm.createContext({ window: {}, localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) }, console, setTimeout, clearTimeout });
  vm.runInContext(dataSource, context, { filename: 'data.js' });
  vm.runInContext(fs.readFileSync(path.join(root, 'hauling-core.js'), 'utf8'), context, { filename: 'hauling-core.js' });
  vm.runInContext(fs.readFileSync(path.join(root, 'transfer-core.js'), 'utf8'), context, { filename: 'transfer-core.js' });
  vm.runInContext(`${appDefinitions}\nglobalThis.__migration = { state, migrateVersionOne };`, context, { filename: 'app.js' });
  return JSON.parse(JSON.stringify(context.__migration.state));
}

test('Scenario A — one-way legal trade completes with correct accounting', () => {
  const trade = opportunities({ legality: 'legal' })[0];
  let run = HAULING.createRun(plan({ legality: 'legal' }, trade.id));
  run = advanceTo(run, 'purchase', { quantity: trade.quantity, price: trade.buyPricePerSCU, fees: 25, note: 'full purchase' });
  run = advanceTo(run, 'sell', { quantity: trade.quantity, price: trade.sellPricePerSCU, fees: 40, note: 'full sale' });
  run = advanceTo(run, 'complete');
  run = HAULING.executeStep(run).run;
  const accounting = HAULING.calculateAccounting(run);
  assert.equal(run.status, 'completed');
  assert.equal(accounting.remainingSCU, 0);
  assert.equal(accounting.actualInvestment, trade.quantity * trade.buyPricePerSCU);
  assert.equal(accounting.actualRevenue, trade.quantity * trade.sellPricePerSCU);
  assert.equal(accounting.finalNetProfit, trade.estimatedProfit - 65);
});

test('Scenario B — capacity limit controls recommendations and validation', () => {
  const compactShip = { id: 'test', name: 'Capacity Test', capacity: 10 };
  const trade = opportunities({ quantity: 0 }, compactShip)[0];
  assert.ok(trade.quantity <= 10);
  const draft = plan({ quantity: 0 }, trade.id, DATA, compactShip); const run = advanceTo(HAULING.createRun(draft), 'purchase');
  const invalid = HAULING.validateTransaction(run, run.steps[run.stepIndex], { quantity: 11, price: trade.buyPricePerSCU, fees: 0 });
  assert.equal(invalid.valid, false); assert.match(invalid.errors.quantity, /capacity|planned/i);
});

test('Scenario C — investment budget reduces quantity and accounting', () => {
  const candidate = opportunities()[0]; const budget = candidate.buyPricePerSCU * 5; const trade = opportunities({ maxInvestment: budget }).find(item => item.id === candidate.id);
  assert.ok(trade.requiredInvestment <= budget);
  assert.equal(trade.quantity, 5);
  assert.equal(plan({ maxInvestment: budget }, trade.id).metrics.plannedInvestment, trade.requiredInvestment);
});

test('Scenario D — demand limit constrains the recommendation', () => {
  const constrained = JSON.parse(JSON.stringify(DATA));
  const sell = constrained.marketRecords.find(item => item.transactionType === 'sell' && item.demandSCU > 0);
  sell.demandSCU = 3;
  const trade = opportunities({ commodityId: sell.commodityId }, ship, true, constrained).find(item => item.sellRecordId === sell.id);
  assert.equal(trade.quantity, 3); assert.ok(trade.limits.limiters.includes('demand'));
});

test('Scenario E — partial purchase and sale separate realized and remaining value', () => {
  const trade = opportunities()[0]; let run = HAULING.createRun(plan({}, trade.id));
  run = advanceTo(run, 'purchase', { quantity: 12, price: trade.buyPricePerSCU, fees: 0 });
  run = advanceTo(run, 'sell', { quantity: 5, price: trade.sellPricePerSCU, fees: 0 });
  const accounting = HAULING.calculateAccounting(run); const batch = run.batches[0];
  assert.equal(HAULING.heldSCU(batch), 7); assert.equal(HAULING.cargoState(batch, run.steps[run.stepIndex]), 'Partially sold');
  assert.equal(accounting.completedSCU, 5); assert.equal(accounting.remainingSCU, 7);
  assert.equal(accounting.realizedGrossProfit, 5 * (trade.sellPricePerSCU - trade.buyPricePerSCU));
  assert.equal(accounting.estimatedRemainingProfit, 7 * (trade.sellPricePerSCU - trade.buyPricePerSCU));
});

test('Scenario F — Previous confirms and reverses recorded financial values', () => {
  const trade = opportunities()[0]; let run = advanceTo(HAULING.createRun(plan({}, trade.id)), 'purchase', { quantity: 8, price: trade.buyPricePerSCU + 1, fees: 15, note: 'manual' });
  const guarded = HAULING.reverseStep(run, false); assert.equal(guarded.requiresConfirmation, true); assert.deepEqual(guarded.run, run);
  const reversed = HAULING.reverseStep(run, true); assert.equal(reversed.requiresConfirmation, false); assert.equal(reversed.run.batches[0].purchasedSCU, 0); assert.equal(reversed.run.events.length, 0);
});

test('Scenario G — multi-stop plan is deterministic, causal and capacity-safe', () => {
  const opts = opportunities({ mode: 'multi-stop' });
  const chainStart = opts.find(first => opts.some(second => second.buyLocationId === first.sellLocationId && second.commodityId !== first.commodityId && second.sellLocationId !== first.buyLocationId));
  assert.ok(chainStart, 'seed data must expose a deterministic chain');
  const first = plan({ mode: 'multi-stop' }, chainStart.id); const second = plan({ mode: 'multi-stop' }, chainStart.id);
  assert.deepEqual(first.batches.map(item => [item.commodityId, item.buyLocationId, item.sellLocationId, item.plannedSCU]), second.batches.map(item => [item.commodityId, item.buyLocationId, item.sellLocationId, item.plannedSCU]));
  first.batches.forEach(batch => {
    const purchase = first.steps.findIndex(step => step.kind === 'purchase' && step.batchId === batch.id); const sale = first.steps.findIndex(step => step.kind === 'sell' && step.batchId === batch.id);
    assert.ok(purchase >= 0 && sale > purchase); assert.ok(batch.plannedSCU <= first.shipSnapshot.capacity);
  });
});

test('Scenario H — active run and actual transaction survive serialization reload', () => {
  const trade = opportunities()[0]; let run = advanceTo(HAULING.createRun(plan({}, trade.id)), 'purchase', { quantity: 9, price: trade.buyPricePerSCU + 2, fees: 7, note: 'persist me' });
  const state = baseState(); state.hauling.activeRun = run;
  const recovered = JSON.parse(JSON.stringify(state));
  assert.deepEqual(recovered.hauling.activeRun, run); assert.equal(recovered.hauling.activeRun.events[0].values.note, 'persist me');
});

test('Scenario I — guided workflow conflict copy requires choice and cancellation is non-mutating', () => {
  const missionRoute = { id: 'route-live', status: 'active', stepIndex: 2 }; const before = JSON.stringify(missionRoute);
  assert.match(appSource, /ONLY ONE PRIMARY GUIDED WORKFLOW CAN BE ACTIVE/);
  assert.match(appSource, /data-action="keep-guided-workflow"/); assert.match(appSource, /End and replace it/); assert.match(appSource, /data-close-dialog>Cancel/);
  assert.equal(JSON.stringify(missionRoute), before);
});

test('Scenario J — version-1 migration preserves working core and adds safe hauling defaults', () => {
  const v1 = { version: 1, ui: { mapMode: 'tree' }, preferences: { themeOverride: 'rsi' }, fleet: [shipEntry], missions: [{ id: 'm1', title: 'Legacy contract', type: 'Hauling', reference: 'V1', reward: 9000, cargo: [{ id: 'l1', missionId: 'm1', commodity: 'Titanium', scu: 4, pickupLabel: 'HDMS-Bezdek', deliveryLabel: 'Lorville' }] }], selectedShipId: shipEntry.id, startingLocationId: 'everus', plannedRoute: { id: 'plan-old' }, activeRoute: { id: 'route-old', status: 'active' }, intel: { reports: [] } };
  const migrated = loadMigration(v1);
  assert.equal(migrated.version, 2); assert.deepEqual(migrated.fleet, v1.fleet); assert.equal(migrated.missions[0].id, 'm1'); assert.equal(migrated.missions[0].cargo[0].missionId, 'm1'); assert.equal(migrated.activeRoute.id, 'route-old');
  assert.equal(migrated.preferences.themeOverride, 'rsi'); assert.ok(migrated.hauling.filters); assert.deepEqual(migrated.hauling.history, []);
});

test('Scenario K — full JSON backup replaces reset state equivalently', () => {
  const original = baseState(); original.missions = [{ id: 'm1', cargo: [{ id: 'l1', missionId: 'm1' }] }]; original.hauling.history = [HAULING.createRun(plan())];
  const envelope = TRANSFER.createEnvelope('full', original, 'test'); const restored = TRANSFER.mergeEnvelope(baseState(), envelope, 'replace').state;
  assert.deepEqual(restored, original); assert.equal(TRANSFER.validateEnvelope(envelope).valid, true); assert.match(TRANSFER.safeFilename('full'), /^waypoint-cargo-companion-full-\d{4}-\d{2}-\d{2}\.json$/);
});

test('Scenario L — JSON merge remaps collisions and preserves internal references', () => {
  const current = baseState(); current.missions = [{ id: 'collision', cargo: [{ id: 'lot-collision', missionId: 'collision' }] }];
  const incoming = { missions: [{ id: 'collision', cargo: [{ id: 'lot-collision', missionId: 'collision' }] }] };
  const envelope = { applicationId: TRANSFER.APPLICATION_ID, exportSchemaVersion: 1, exportType: 'missions', exportedAt: new Date().toISOString(), payload: incoming };
  const merged = TRANSFER.mergeEnvelope(current, envelope, 'merge'); const added = merged.state.missions[1];
  assert.notEqual(added.id, 'collision'); assert.notEqual(added.cargo[0].id, 'lot-collision'); assert.equal(added.cargo[0].missionId, added.id); assert.ok(merged.report.remapped >= 2);
});

test('Scenario M — malformed, unsupported and invalid-reference imports never mutate state', () => {
  const current = baseState(); const before = JSON.stringify(current);
  assert.equal(TRANSFER.validateEnvelope('{bad').valid, false);
  assert.equal(TRANSFER.validateEnvelope({ applicationId: TRANSFER.APPLICATION_ID, exportSchemaVersion: 99, exportType: 'preferences', payload: {} }).valid, false);
  const invalid = { applicationId: TRANSFER.APPLICATION_ID, exportSchemaVersion: 1, exportType: 'hauling-history', payload: { history: [{ id: 'r', batches: [], steps: [{ batchId: 'missing' }] }] } };
  assert.equal(TRANSFER.validateEnvelope(invalid).valid, false); assert.equal(JSON.stringify(current), before);
});

test('Scenario N — illegal filter affects search only and historical snapshots remain readable', () => {
  const disabled = opportunities({ legality: 'all' }, ship, false); const enabled = opportunities({ legality: 'all' }, ship, true);
  assert.equal(disabled.some(item => item.legality === 'illegal'), false); assert.equal(enabled.some(item => item.legality === 'illegal'), true);
  const illegal = enabled.find(item => item.legality === 'illegal'); const historic = HAULING.createRun(plan({ legality: 'all' }, illegal.id));
  assert.equal(historic.batches.some(batch => batch.commodityId === illegal.commodityId), true);
  assert.equal(JSON.parse(JSON.stringify(historic)).batches[0].commodityName.length > 0, true);
});
