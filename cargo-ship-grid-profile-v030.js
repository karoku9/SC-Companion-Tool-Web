'use strict';

(function installShipCargoGridProfiles(root) {
  const base = root.SCCompanionAutoCargoLayout;
  if (!base || base.shipGridProfiles) return;

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }

  function geometryFor(model) {
    if (!model?.snapGrid) return base.geometryFor(model);
    return freeze({
      rows: Math.max(1, Number(model.snapGrid.rows ?? 1)),
      columns: Math.max(1, Number(model.snapGrid.columns ?? 1)),
      layers: Math.max(1, Number(model.snapGrid.layers ?? 1)),
      accessEdges: [...(model.snapGrid.accessEdges ?? model.layout?.accessPoints ?? ['rear'])],
      orientation: String(model.snapGrid.orientation ?? 'Primary access at row A'),
      status: String(model.snapGrid.status ?? 'configured-snap-grid')
    });
  }

  function accessDistance(row, column, geometry) {
    const distances = (geometry.accessEdges ?? ['rear']).map((edge) => {
      if (edge === 'rear' || edge === 'ventral-lift' || edge === 'external') return row;
      if (edge === 'front') return geometry.rows - 1 - row;
      if (edge === 'left' || edge === 'side') return column;
      if (edge === 'right') return geometry.columns - 1 - column;
      return row;
    });
    return Math.min(...distances);
  }

  function createSlots(model) {
    const geometry = geometryFor(model);
    const capacity = Math.max(0, Number(model?.capacityScu ?? 0));
    const slots = [];
    for (let layer = 0; layer < geometry.layers; layer += 1) {
      for (let row = 0; row < geometry.rows; row += 1) {
        for (let column = 0; column < geometry.columns; column += 1) {
          if (slots.length >= capacity) break;
          slots.push({
            id: `${row}:${column}:${layer}`,
            floorId: `${row}:${column}`,
            row,
            column,
            layer,
            coordinate: `${String.fromCharCode(65 + row)}${column + 1}`,
            accessDistance: accessDistance(row, column, geometry)
          });
        }
      }
    }
    return freeze({ geometry, slots });
  }

  const api = freeze({
    ...base,
    geometryFor,
    createSlots,
    shipGridProfiles: true
  });
  root.SCCompanionAutoCargoLayout = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
