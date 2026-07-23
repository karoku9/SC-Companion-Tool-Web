'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function createStorage(value) {
  const entries = new Map([['sc-companion-session-v1', JSON.stringify(value)]]);
  return {
    getItem(key) { return entries.get(key) ?? null; },
    setItem(key, nextValue) { entries.set(key, String(nextValue)); },
    removeItem(key) { entries.delete(key); },
    read(key) { return entries.get(key) ?? null; }
  };
}

test('saved free-text route locations rebind to the current operational registry', () => {
  delete require.cache[require.resolve('../locations.js')];
  delete require.cache[require.resolve('../location-field-registry.js')];
  delete require.cache[require.resolve('../session-store.js')];

  global.SCCompanionLocations = require('../locations.js');
  global.SCCompanionLocations = require('../location-field-registry.js');

  const legacyState = {
    missionSourceText: 'legacy route',
    missionText: 'legacy route',
    missions: [{
      id: 'mission-legacy',
      title: 'Legacy route',
      cargoLots: [{
        id: 'lot-1',
        commodity: 'etam',
        scu: 7,
        pickupLocationId: 'custom-checkmate-station-pyro',
        pickupLocationLabel: 'checkmate station pyro',
        deliveryLocationId: 'custom-levski-nyx',
        deliveryLocationLabel: 'levski nyx'
      }],
      objectives: []
    }],
    route: {
      missions: [],
      stops: [{
        id: 'stop-2-custom-levski-nyx',
        locationId: 'custom-levski-nyx',
        locationLabel: 'levski nyx',
        operations: [{
          id: 'delivery-1',
          type: 'delivery',
          locationId: 'custom-levski-nyx',
          locationLabel: 'levski nyx',
          originLocationId: 'custom-checkmate-station-pyro',
          originLocationLabel: 'checkmate station pyro',
          destinationLocationId: 'custom-levski-nyx',
          destinationLocationLabel: 'levski nyx',
          dependsOn: []
        }]
      }, {
        id: 'stop-unknown',
        locationId: 'custom-user-camp',
        locationLabel: 'My user camp',
        operations: []
      }]
    },
    currentStopIndex: 0,
    completedStopIds: []
  };

  const storage = createStorage(legacyState);
  global.localStorage = storage;
  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
  };
  global.dispatchEvent = () => {};

  const store = require('../session-store.js');
  const state = store.getState();
  const levski = state.route.stops[0];

  assert.equal(levski.id, 'stop-2-custom-levski-nyx', 'progress-compatible stop id must remain stable');
  assert.equal(levski.locationId, 'nyx-delamar-levski');
  assert.match(levski.locationLabel, /^Levski/);
  assert.equal(levski.operations[0].originLocationId, 'pyro-monox-checkmate');
  assert.equal(levski.operations[0].destinationLocationId, 'nyx-delamar-levski');
  assert.equal(state.missions[0].cargoLots[0].pickupLocationId, 'pyro-monox-checkmate');
  assert.equal(state.missions[0].cargoLots[0].deliveryLocationId, 'nyx-delamar-levski');
  assert.equal(state.route.stops[1].locationId, 'custom-user-camp', 'truly unknown custom locations must remain custom');

  const persisted = JSON.parse(storage.read('sc-companion-session-v1'));
  assert.equal(persisted.route.stops[0].locationId, 'nyx-delamar-levski', 'migration must persist on load');

  delete global.localStorage;
  delete global.CustomEvent;
  delete global.dispatchEvent;
  delete global.SCCompanionLocations;
});
