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

  function canonicalReference(location) {
    const registry = root.SCCompanionLocations;
    return {
      id: location.id,
      label: registry.formatOperationalLabel(location)
    };
  }

  function candidateValues(location) {
    const registry = root.SCCompanionLocations;
    return [
      location.id,
      location.name,
      location.navigationTarget,
      registry.formatOperationalLabel(location),
      ...(location.aliases ?? [])
    ].filter(Boolean).map(registry.normalizeSearchTerm);
  }

  function resolveLocationReference(id, label) {
    const registry = root.SCCompanionLocations;
    const original = {
      id: String(id ?? ''),
      label: String(label ?? id ?? '')
    };
    if (!registry?.getLocation || !registry?.searchOperationalLocations) return original;

    const direct = original.id ? registry.getLocation(original.id) : null;
    if (direct?.operational) return canonicalReference(direct);

    const legacyIdQuery = original.id
      .replace(/^custom-/, '')
      .replace(/-/g, ' ')
      .trim();
    const queries = [...new Set([original.label, legacyIdQuery].map((value) => String(value ?? '').trim()).filter(Boolean))];

    for (const query of queries) {
      const matches = registry.searchOperationalLocations(query, { limit: 8 });
      if (!matches.length) continue;
      const normalizedQuery = registry.normalizeSearchTerm(query);
      const exact = matches.filter((location) => candidateValues(location).includes(normalizedQuery));
      if (exact.length === 1) return canonicalReference(exact[0]);
      if (matches.length === 1) return canonicalReference(matches[0]);
    }
    return original;
  }

  function rebindReferenceFields(value, idField, labelField) {
    if (!value || typeof value !== 'object' || !(idField in value)) return value;
    const reference = resolveLocationReference(value[idField], value[labelField]);
    return { ...value, [idField]: reference.id, [labelField]: reference.label };
  }

  function rebindOperation(operation) {
    let rebound = { ...operation };
    [
      ['locationId', 'locationLabel'],
      ['originLocationId', 'originLocationLabel'],
      ['destinationLocationId', 'destinationLocationLabel'],
      ['pickupLocationId', 'pickupLocationLabel'],
      ['deliveryLocationId', 'deliveryLocationLabel']
    ].forEach(([idField, labelField]) => {
      rebound = rebindReferenceFields(rebound, idField, labelField);
    });
    return rebound;
  }

  function rebindMission(mission) {
    if (!mission || typeof mission !== 'object') return mission;
    return {
      ...mission,
      cargoLots: Array.isArray(mission.cargoLots)
        ? mission.cargoLots.map((lot) => {
          let rebound = { ...lot };
          rebound = rebindReferenceFields(rebound, 'pickupLocationId', 'pickupLocationLabel');
          rebound = rebindReferenceFields(rebound, 'deliveryLocationId', 'deliveryLocationLabel');
          return rebound;
        })
        : mission.cargoLots,
      objectives: Array.isArray(mission.objectives)
        ? mission.objectives.map((objective) => rebindReferenceFields(objective, 'locationId', 'locationLabel'))
        : mission.objectives
    };
  }

  function rebindStop(stop) {
    if (!stop || typeof stop !== 'object') return stop;
    const rebound = rebindReferenceFields(stop, 'locationId', 'locationLabel');
    return {
      ...rebound,
      operations: Array.isArray(stop.operations) ? stop.operations.map(rebindOperation) : stop.operations
    };
  }

  function rebindRoute(route) {
    if (!route || typeof route !== 'object') return route;
    return {
      ...route,
      missions: Array.isArray(route.missions) ? route.missions.map(rebindMission) : route.missions,
      stops: Array.isArray(route.stops) ? route.stops.map(rebindStop) : route.stops,
      allStops: Array.isArray(route.allStops) ? route.allStops.map(rebindStop) : route.allStops
    };
  }

  function migrateKnownLocations(nextState) {
    if (!nextState || typeof nextState !== 'object') return nextState;
    return {
      ...nextState,
      missions: Array.isArray(nextState.missions) ? nextState.missions.map(rebindMission) : nextState.missions,
      route: rebindRoute(nextState.route)
    };
  }

  function normalize(nextState) {
    const defaults = initialState();
    const migrated = migrateKnownLocations(nextState ?? {});
    return {
      ...defaults,
      ...migrated,
      missionSourceText: String(migrated?.missionSourceText ?? migrated?.missionValidation?.sourceText ?? migrated?.missionText ?? defaults.missionSourceText),
      missionText: String(migrated?.missionText ?? defaults.missionText),
      missionValidation: normalizeValidation(migrated?.missionValidation),
      cargoCorrections: { ...defaults.cargoCorrections, ...(migrated?.cargoCorrections ?? {}) },
      cargoZoneOverrides: { ...defaults.cargoZoneOverrides, ...(migrated?.cargoZoneOverrides ?? {}) },
      routePlannerSettings: { ...defaults.routePlannerSettings, ...(migrated?.routePlannerSettings ?? {}) }
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
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage can be unavailable */ }

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

  const api = Object.freeze({ getState, patch, replace, reset, sampleMissionText, migrateKnownLocations, resolveLocationReference });
  root.SCCompanionSession = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));