'use strict';

(function installCargoGridGeometryCompatibility(root) {
  const base = root.SCCompanionAutoCargoLayout;
  if (!base || base.geometryCompatibilityV040) return;

  function withLayerAlias(layout) {
    if (!layout?.geometry || Number.isFinite(Number(layout.geometry.layersPerCell))) return layout;
    const layers = Math.max(1, Number(layout.geometry.layers ?? 1));
    return Object.freeze({
      ...layout,
      geometry: Object.freeze({
        ...layout.geometry,
        layersPerCell: layers
      })
    });
  }

  const api = Object.freeze({
    ...base,
    plan(...args) {
      return withLayerAlias(base.plan(...args));
    },
    getLastLayout() {
      return withLayerAlias(base.getLastLayout());
    },
    geometryCompatibilityV040: true
  });

  root.SCCompanionAutoCargoLayout = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
