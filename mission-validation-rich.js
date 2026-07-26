'use strict';

(function exposeIntegratedMissionValidation(root) {
  const model = root.SCCompanionMissionValidation
    ?? (typeof require !== 'undefined' ? require('./mission-validation.js') : null);
  if (!model) throw new Error('Integrated mission validation is unavailable.');
  root.SCCompanionMissionValidation = model;
  if (typeof module !== 'undefined' && module.exports) module.exports = model;
}(typeof globalThis !== 'undefined' ? globalThis : window));