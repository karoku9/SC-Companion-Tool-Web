'use strict';

(function exposeCargoZoneModel(root) {
  function positiveInteger(value, field, minimum = 1) {
    const number = Math.trunc(Number(value));
    if (!Number.isFinite(number) || number < minimum) throw new Error(`${field} must be at least ${minimum}`);
    return number;
  }

  function text(value, field) {
    const result = String(value ?? '').trim();
    if (!result) throw new Error(`${field} is required`);
    return result;
  }

  function zoneId(value, index) {
    const source = String(value ?? `zone-${index + 1}`).trim().toLowerCase();
    const normalized = source.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return normalized || `zone-${index + 1}`;
  }

  function normalizeZones(input, capacityScu) {
    const capacity = positiveInteger(capacityScu, 'Cargo capacity');
    if (!Array.isArray(input) || !input.length) throw new Error('At least one cargo zone is required');
    if (input.length > 8) throw new Error('A maximum of eight cargo zones is supported');

    const zones = input.map((zone, index) => Object.freeze({
      id: zoneId(zone.id, index),
      label: text(zone.label, `Zone ${index + 1} label`),
      access: text(zone.access ?? 'Shared access', `Zone ${index + 1} access`),
      capacityScu: positiveInteger(zone.capacityScu, `Zone ${index + 1} capacity`),
      layers: positiveInteger(zone.layers, `Zone ${index + 1} layers`),
      columns: positiveInteger(zone.columns, `Zone ${index + 1} columns`),
      separable: zone.separable !== false
    }));

    const ids = zones.map((zone) => zone.id);
    if (new Set(ids).size !== ids.length) throw new Error('Cargo zone identifiers must be unique');
    const total = zones.reduce((sum, zone) => sum + zone.capacityScu, 0);
    if (total !== capacity) throw new Error(`Zone capacity is ${total} SCU; the ship grid requires exactly ${capacity} SCU`);
    return Object.freeze(zones);
  }

  function createEvenZones(capacityScu, count = 3) {
    const capacity = positiveInteger(capacityScu, 'Cargo capacity');
    const zoneCount = Math.max(1, Math.min(8, positiveInteger(count, 'Zone count')));
    const base = Math.floor(capacity / zoneCount);
    let remainder = capacity % zoneCount;
    return Object.freeze(Array.from({ length: zoneCount }, (_, index) => {
      const zoneCapacity = base + (remainder-- > 0 ? 1 : 0);
      const columns = Math.max(1, Math.min(8, zoneCapacity));
      return Object.freeze({
        id: `zone-${index + 1}`,
        label: `Zone ${String.fromCharCode(65 + index)}`,
        access: index === 0 ? 'Primary access' : `Through Zone ${String.fromCharCode(64 + index)}`,
        capacityScu: zoneCapacity,
        layers: Math.max(1, Math.ceil(zoneCapacity / columns)),
        columns,
        separable: true
      });
    }));
  }

  function defaultZones(baseModel, ship) {
    const capacity = Number(ship?.cargoCapacityScu ?? baseModel?.capacityScu ?? 0);
    const baseZones = baseModel?.layout?.zones ?? [];
    const total = baseZones.reduce((sum, zone) => sum + Number(zone.capacityScu ?? 0), 0);
    if (baseZones.length && total === capacity) return normalizeZones(baseZones, capacity);
    return createEvenZones(capacity, Math.min(3, capacity));
  }

  function resolveModel(baseModel, ship, overrides = {}) {
    if (!baseModel) throw new Error('Ship model is required');
    const capacityScu = Number(ship?.cargoCapacityScu ?? baseModel.capacityScu);
    const saved = ship?.id ? overrides?.[ship.id]?.zones : null;
    let zones;
    try {
      zones = saved ? normalizeZones(saved, capacityScu) : defaultZones(baseModel, ship);
    } catch {
      zones = defaultZones(baseModel, ship);
    }
    return Object.freeze({
      ...baseModel,
      capacityScu,
      layout: Object.freeze({ ...baseModel.layout, zones })
    });
  }

  const api = Object.freeze({ normalizeZones, createEvenZones, defaultZones, resolveModel });
  root.SCCompanionCargoZones = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
