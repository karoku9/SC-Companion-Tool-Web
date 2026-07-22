'use strict';

(function exposeSessionStore(root) {
  const KEY = 'sc-companion-session-v1';
  const sampleMissionText = `Mission X
collect teasa 2scu etam
deliver area18 2scu etam

Mission Y
collect area18 1scu neon
collect teasa 2scu etam
deliver baijini 2scu etam 1scu neon`;

  function initialState() {
    return {
      missionText: sampleMissionText,
      missions: [],
      route: null,
      currentStopIndex: 0,
      completedStopIds: null,
      routeCorrections: null,
      cargoCorrections: {},
      selectedShipId: 'corsair-main',
      selectedShipModelId: 'drake-corsair',
      hangarShips: [{
        id: 'corsair-main',
        modelId: 'drake-corsair',
        nickname: '',
        cargoCapacityScu: 72,
        quantumDrive: 'Stock',
        quantumTimeFactor: 1,
        notes: ''
      }]
    };
  }

  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY));
      return stored && typeof stored === 'object' ? { ...initialState(), ...stored } : initialState();
    } catch {
      return initialState();
    }
  }

  let state = load();

  function getState() { return state; }

  function replace(nextState) {
    state = { ...initialState(), ...nextState };
    localStorage.setItem(KEY, JSON.stringify(state));
    root.dispatchEvent(new CustomEvent('sc:session-change', { detail: state }));
    return state;
  }

  function patch(changes) { return replace({ ...state, ...changes }); }

  function reset() {
    localStorage.removeItem(KEY);
    return replace(initialState());
  }

  const api = Object.freeze({ getState, patch, replace, reset, sampleMissionText });
  root.SCCompanionSession = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));