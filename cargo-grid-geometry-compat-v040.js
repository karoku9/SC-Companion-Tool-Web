'use strict';

(function installCargoGridGeometryCompatibility(root) {
  const base = root.SCCompanionAutoCargoLayout;
  if (!base || base.geometryCompatibilityV040) return;

  function withGeometryCompatibility(layout) {
    if (!layout?.geometry) return layout;
    const layers = Math.max(1, Number(layout.geometry.layersPerCell ?? layout.geometry.layers ?? 1));
    const modelLabel = String(layout.modelLabel ?? 'Active ship').trim();
    const capacity = Math.max(0, Number(layout.capacityScu ?? 0));
    const gridLabel = String(layout.geometry.status ?? '').startsWith('configured-corsair')
      ? 'official grid'
      : 'configured grid';
    const label = String(layout.geometry.label ?? '').trim()
      || `${modelLabel} · ${capacity} SCU ${gridLabel}`;

    if (Number(layout.geometry.layersPerCell) === layers && layout.geometry.label === label) return layout;
    return Object.freeze({
      ...layout,
      geometry: Object.freeze({
        ...layout.geometry,
        layersPerCell: layers,
        label
      })
    });
  }

  const api = Object.freeze({
    ...base,
    plan(...args) {
      return withGeometryCompatibility(base.plan(...args));
    },
    getLastLayout() {
      return withGeometryCompatibility(base.getLastLayout());
    },
    geometryCompatibilityV040: true
  });

  root.SCCompanionAutoCargoLayout = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
