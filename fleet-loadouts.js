'use strict';

(function exposeFleetLoadouts(root) {
  const SOURCE_KINDS = Object.freeze(['official', 'community', 'user', 'legacy', 'unknown']);
  const SLOT_DEFINITIONS = Object.freeze([
    Object.freeze({ id: 'quantum-drive', label: 'Quantum drive', category: 'propulsion', maxItems: 1 }),
    Object.freeze({ id: 'power-plant', label: 'Power plant', category: 'systems', maxItems: 2 }),
    Object.freeze({ id: 'cooler', label: 'Cooler', category: 'systems', maxItems: 2 }),
    Object.freeze({ id: 'shield-generator', label: 'Shield generator', category: 'defence', maxItems: 2 }),
    Object.freeze({ id: 'weapon', label: 'Weapon', category: 'offence', maxItems: 16 }),
    Object.freeze({ id: 'utility', label: 'Utility module', category: 'utility', maxItems: 8 }),
    Object.freeze({ id: 'cargo-module', label: 'Cargo module', category: 'cargo', maxItems: 8 })
  ]);

  const slotIds = new Set(SLOT_DEFINITIONS.map((slot) => slot.id));

  function text(value, fallback = '') {
    const normalized = String(value ?? '').trim();
    return normalized || fallback;
  }

  function number(value, fallback, minimum = -Infinity, maximum = Infinity) {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) return fallback;
    return Math.min(maximum, Math.max(minimum, normalized));
  }

  function normalizeSource(source = {}, fallbackKind = 'unknown') {
    const kind = SOURCE_KINDS.includes(source.kind) ? source.kind : fallbackKind;
    return Object.freeze({
      kind,
      authority: text(source.authority, kind === 'user' ? 'User supplied' : kind === 'legacy' ? 'Legacy ship record' : 'Unavailable'),
      reference: text(source.reference),
      verifiedAt: text(source.verifiedAt),
      note: text(source.note)
    });
  }

  function normalizePerformance(performance = {}) {
    const result = {};
    if (performance.quantumTimeFactor !== undefined && performance.quantumTimeFactor !== '') result.quantumTimeFactor = number(performance.quantumTimeFactor, 1, 0.1, 5);
    if (performance.quantumSpoolSeconds !== undefined && performance.quantumSpoolSeconds !== '') result.quantumSpoolSeconds = number(performance.quantumSpoolSeconds, 0, 0, 600);
    if (performance.fuelEfficiencyFactor !== undefined && performance.fuelEfficiencyFactor !== '') result.fuelEfficiencyFactor = number(performance.fuelEfficiencyFactor, 1, 0.1, 5);
    if (performance.handlingTimeFactor !== undefined && performance.handlingTimeFactor !== '') result.handlingTimeFactor = number(performance.handlingTimeFactor, 1, 0.25, 4);
    if (performance.cargoCapacityDeltaScu !== undefined && performance.cargoCapacityDeltaScu !== '') result.cargoCapacityDeltaScu = number(performance.cargoCapacityDeltaScu, 0, -1000, 1000);
    return Object.freeze(result);
  }

  function normalizeComponent(input = {}, index = 0) {
    const slot = slotIds.has(input.slot) ? input.slot : 'utility';
    return Object.freeze({
      id: text(input.id, `component-${index + 1}`),
      slot,
      name: text(input.name, 'Unnamed component'),
      manufacturer: text(input.manufacturer),
      size: text(input.size),
      grade: text(input.grade),
      className: text(input.className),
      performance: normalizePerformance(input.performance),
      source: normalizeSource(input.source, 'unknown'),
      notes: text(input.notes)
    });
  }

  function normalizeLoadout(input = {}, shipId) {
    const resolvedShipId = text(shipId ?? input.shipId);
    if (!resolvedShipId) throw new Error('Loadout ship ID is required');
    const components = Array.isArray(input.components) ? input.components.map(normalizeComponent) : [];
    return Object.freeze({
      id: text(input.id, `${resolvedShipId}-loadout-${Date.now()}`),
      shipId: resolvedShipId,
      name: text(input.name, 'Unnamed loadout'),
      components: Object.freeze(components),
      performanceOverrides: normalizePerformance(input.performanceOverrides),
      notes: text(input.notes),
      updatedAt: text(input.updatedAt, new Date().toISOString())
    });
  }

  function legacyLoadout(ship) {
    return normalizeLoadout({
      id: `${ship.id}-legacy`,
      shipId: ship.id,
      name: 'Imported configuration',
      components: [{
        id: `${ship.id}-legacy-quantum`,
        slot: 'quantum-drive',
        name: text(ship.quantumDrive, 'Stock'),
        performance: { quantumTimeFactor: number(ship.quantumTimeFactor, 1, 0.1, 5) },
        source: { kind: 'legacy', authority: 'Legacy ship record', note: 'Migrated from the pre-v0.20 free-text quantum fields.' }
      }],
      performanceOverrides: {
        quantumTimeFactor: number(ship.quantumTimeFactor, 1, 0.1, 5),
        handlingTimeFactor: number(ship.handlingTimeFactor, 1, 0.25, 4),
        fuelEfficiencyFactor: number(ship.fuelEfficiencyFactor, 1, 0.1, 5),
        cargoCapacityDeltaScu: number(ship.cargoCapacityScu, 0) - number(ship.baseCargoCapacityScu ?? ship.cargoCapacityScu, 0)
      },
      notes: text(ship.notes)
    }, ship.id);
  }

  function derivePerformance(ship, loadout) {
    const components = loadout?.components ?? [];
    const quantum = components.find((component) => component.slot === 'quantum-drive') ?? null;
    const componentValues = components.map((component) => component.performance ?? {});
    const override = loadout?.performanceOverrides ?? {};
    const cargoDelta = componentValues.reduce((sum, current) => sum + number(current.cargoCapacityDeltaScu, 0), 0) + number(override.cargoCapacityDeltaScu, 0);
    const baseCargoCapacityScu = number(ship?.baseCargoCapacityScu ?? ship?.cargoCapacityScu, 0, 0);
    const quantumTimeFactor = number(override.quantumTimeFactor ?? quantum?.performance?.quantumTimeFactor ?? ship?.quantumTimeFactor, 1, 0.1, 5);
    const handlingTimeFactor = number(override.handlingTimeFactor ?? componentValues.find((item) => item.handlingTimeFactor !== undefined)?.handlingTimeFactor ?? ship?.handlingTimeFactor, 1, 0.25, 4);
    const fuelEfficiencyFactor = number(override.fuelEfficiencyFactor ?? quantum?.performance?.fuelEfficiencyFactor ?? ship?.fuelEfficiencyFactor, 1, 0.1, 5);
    const quantumSpoolSeconds = number(override.quantumSpoolSeconds ?? quantum?.performance?.quantumSpoolSeconds, 0, 0, 600);
    const sources = components.map((component) => component.source);
    const unknowns = [];
    if (!quantum) unknowns.push('No structured quantum drive is assigned.');
    if (quantum && quantum.source.kind === 'unknown') unknowns.push('Quantum-drive provenance is unknown.');
    if (components.some((component) => component.source.kind === 'unknown')) unknowns.push('One or more component provenance records are unknown.');
    if (!Object.keys(override).length && components.every((component) => !Object.keys(component.performance ?? {}).length)) unknowns.push('No structured performance inputs are available; neutral factors are used.');
    return Object.freeze({
      loadoutId: loadout?.id ?? null,
      loadoutName: loadout?.name ?? 'Legacy configuration',
      quantumDriveName: quantum?.name ?? text(ship?.quantumDrive, 'Stock'),
      quantumTimeFactor,
      quantumSpoolSeconds,
      fuelEfficiencyFactor,
      handlingTimeFactor,
      baseCargoCapacityScu,
      cargoCapacityDeltaScu: cargoDelta,
      operationalCargoCapacityScu: Math.max(0, baseCargoCapacityScu + cargoDelta),
      sources: Object.freeze(sources),
      unknowns: Object.freeze(unknowns)
    });
  }

  function loadoutsForShip(state, shipId) {
    const raw = state?.fleetLoadouts?.[shipId];
    return Array.isArray(raw) ? raw.map((loadout) => normalizeLoadout(loadout, shipId)) : [];
  }

  function activeLoadout(state, shipId) {
    const loadouts = loadoutsForShip(state, shipId);
    const activeId = state?.activeLoadoutByShip?.[shipId];
    return loadouts.find((loadout) => loadout.id === activeId) ?? loadouts[0] ?? null;
  }

  function activePerformance(state, shipId = state?.selectedShipId) {
    const ship = (state?.hangarShips ?? []).find((item) => item.id === shipId) ?? null;
    if (!ship) return null;
    return derivePerformance(ship, activeLoadout(state, shipId) ?? legacyLoadout(ship));
  }

  function syncCompatibilityShip(ship, loadout) {
    const performance = derivePerformance(ship, loadout);
    return {
      ...ship,
      baseCargoCapacityScu: number(ship.baseCargoCapacityScu ?? ship.cargoCapacityScu, 0, 0),
      cargoCapacityScu: performance.operationalCargoCapacityScu,
      quantumDrive: performance.quantumDriveName,
      quantumTimeFactor: performance.quantumTimeFactor,
      handlingTimeFactor: performance.handlingTimeFactor,
      fuelEfficiencyFactor: performance.fuelEfficiencyFactor,
      activeLoadoutId: loadout.id
    };
  }

  function migrateState(state = {}) {
    const ships = Array.isArray(state.hangarShips) ? state.hangarShips : [];
    const fleetLoadouts = { ...(state.fleetLoadouts ?? {}) };
    const activeLoadoutByShip = { ...(state.activeLoadoutByShip ?? {}) };
    ships.forEach((ship) => {
      const existing = loadoutsForShip({ ...state, fleetLoadouts }, ship.id);
      const loadouts = existing.length ? existing : [legacyLoadout(ship)];
      fleetLoadouts[ship.id] = loadouts;
      if (!loadouts.some((loadout) => loadout.id === activeLoadoutByShip[ship.id])) activeLoadoutByShip[ship.id] = loadouts[0].id;
    });
    const hangarShips = ships.map((ship) => {
      const loadout = fleetLoadouts[ship.id].find((item) => item.id === activeLoadoutByShip[ship.id]) ?? fleetLoadouts[ship.id][0];
      return syncCompatibilityShip(ship, loadout);
    });
    return { ...state, hangarShips, fleetLoadouts, activeLoadoutByShip };
  }

  function needsMigration(state = {}) {
    const ships = Array.isArray(state.hangarShips) ? state.hangarShips : [];
    return ships.some((ship) => {
      const loadouts = state.fleetLoadouts?.[ship.id];
      const activeId = state.activeLoadoutByShip?.[ship.id];
      return !Array.isArray(loadouts) || !loadouts.length || !loadouts.some((loadout) => loadout.id === activeId) || ship.activeLoadoutId !== activeId;
    });
  }

  function saveLoadoutState(state, shipId, input, options = {}) {
    const migrated = migrateState(state);
    const loadout = normalizeLoadout(input, shipId);
    const current = migrated.fleetLoadouts[shipId] ?? [];
    const nextList = current.some((item) => item.id === loadout.id) ? current.map((item) => item.id === loadout.id ? loadout : item) : [...current, loadout];
    const activeId = options.activate === false ? migrated.activeLoadoutByShip[shipId] : loadout.id;
    return migrateState({ ...migrated, fleetLoadouts: { ...migrated.fleetLoadouts, [shipId]: nextList }, activeLoadoutByShip: { ...migrated.activeLoadoutByShip, [shipId]: activeId } });
  }

  function activateLoadoutState(state, shipId, loadoutId) {
    const migrated = migrateState(state);
    const loadout = (migrated.fleetLoadouts[shipId] ?? []).find((item) => item.id === loadoutId);
    if (!loadout) throw new Error('Unknown loadout');
    return migrateState({ ...migrated, activeLoadoutByShip: { ...migrated.activeLoadoutByShip, [shipId]: loadoutId } });
  }

  function deleteLoadoutState(state, shipId, loadoutId) {
    const migrated = migrateState(state);
    const current = migrated.fleetLoadouts[shipId] ?? [];
    if (current.length <= 1) throw new Error('A ship must keep at least one loadout');
    const next = current.filter((loadout) => loadout.id !== loadoutId);
    if (next.length === current.length) throw new Error('Unknown loadout');
    const active = migrated.activeLoadoutByShip[shipId] === loadoutId ? next[0].id : migrated.activeLoadoutByShip[shipId];
    return migrateState({ ...migrated, fleetLoadouts: { ...migrated.fleetLoadouts, [shipId]: next }, activeLoadoutByShip: { ...migrated.activeLoadoutByShip, [shipId]: active } });
  }

  const api = Object.freeze({ SOURCE_KINDS, SLOT_DEFINITIONS, normalizeSource, normalizeComponent, normalizeLoadout, legacyLoadout, derivePerformance, loadoutsForShip, activeLoadout, activePerformance, migrateState, needsMigration, saveLoadoutState, activateLoadoutState, deleteLoadoutState });
  root.SCCompanionFleetLoadouts = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
