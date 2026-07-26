'use strict';

(function exposeIntegratedContractLocations(root) {
  const model = root.SCCompanionLocations
    ?? (typeof require !== 'undefined' ? require('./location-field-registry.js') : null);
  if (!model) throw new Error('Integrated location registry is unavailable.');
  root.SCCompanionLocations = model;
  if (typeof module !== 'undefined' && module.exports) module.exports = model;
}(typeof globalThis !== 'undefined' ? globalThis : window));