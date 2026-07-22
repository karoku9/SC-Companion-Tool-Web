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
      missionSourceText: sampleMissionText,
      missionText: sampleMissionText,
      missionValidation: null,
      missions: [],
      route: null,
      currentStopIndex: 0,
      completedStopIds: null,
      routeCorrections: null,
      cargoCorrections: {},
      cargoZoneOverrides: {},
      routePlannerSettings: {
        protectCargo: false,
        safetyMarginMinutes: 15,
        offGridAllowanceScu: 0
      },
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

  function normalizeValidation(value) {
    if (!value || typeof value !== 'object') return null;
    return {
      ...value,
      sourceText: String(value.sourceText ?? ''),
      reviewedText: String(value.reviewedText ?? ''),
      confirmedCustomLocations: { ...(value.confirmedCustomLocations ?? {}) },
      summary: value.summary && typeof value.summary === 'object' ? { ...value.summary } : null,
      issues: Array.isArray(value.issues) ? value.issues.map((item) => ({ ...item })) : []
    };
  }

  function normalize(nextState) {
    const defaults = initialState();
    return {
      ...defaults,
      ...nextState,
      missionSourceText: String(nextState?.missionSourceText ?? nextState?.missionValidation?.sourceText ?? nextState?.missionText ?? defaults.missionSourceText),
      missionText: String(nextState?.missionText ?? defaults.missionText),
      missionValidation: normalizeValidation(nextState?.missionValidation),
      cargoCorrections: { ...defaults.cargoCorrections, ...(nextState?.cargoCorrections ?? {}) },
      cargoZoneOverrides: { ...defaults.cargoZoneOverrides, ...(nextState?.cargoZoneOverrides ?? {}) },
      routePlannerSettings: { ...defaults.routePlannerSettings, ...(nextState?.routePlannerSettings ?? {}) }
    };
  }

  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY));
      return stored && typeof stored === 'object' ? normalize(stored) : initialState();
    } catch {
      return initialState();
    }
  }

  let state = load();

  function getState() { return state; }

  function replace(nextState) {
    state = normalize(nextState);
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
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
