'use strict';

(function exposeCargoLayout(root) {
  function fallbackZones(model) {
    return [Object.freeze({
      id: 'main-zone',
      label: 'Main cargo zone',
      access: (model.layout?.accessPoints ?? ['rear']).join(' / '),
      capacityScu: model.capacityScu,
      layers: Math.max(1, Math.ceil(model.capacityScu / 16)),
      columns: Math.max(1, Math.min(8, model.capacityScu)),
      separable: false
    })];
  }

  function getZones(model) {
    const zones = model.layout?.zones ?? [];
    const total = zones.reduce((sum, zone) => sum + Number(zone.capacityScu ?? 0), 0);
    return zones.length && total === model.capacityScu ? zones : fallbackZones(model);
  }

  function locateSlot(model, slotIndex) {
    const numericIndex = Math.trunc(Number(slotIndex));
    if (!Number.isFinite(numericIndex) || numericIndex < 0 || numericIndex >= model.capacityScu) return null;

    let offset = 0;
    for (const zone of getZones(model)) {
      if (numericIndex < offset + zone.capacityScu) {
        const localIndex = numericIndex - offset;
        const columns = Math.max(1, Number(zone.columns ?? zone.capacityScu));
        return Object.freeze({
          zoneId: zone.id,
          zoneLabel: zone.label,
          access: zone.access,
          separable: Boolean(zone.separable),
          localIndex,
          layer: Math.floor(localIndex / columns),
          column: localIndex % columns
        });
      }
      offset += zone.capacityScu;
    }
    return null;
  }

  const api = Object.freeze({ fallbackZones, getZones, locateSlot });
  root.SCCompanionCargoLayout = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
