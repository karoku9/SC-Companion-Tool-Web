'use strict';

(function exposeIntegratedMissionModel(root) {
  const model = root.SCCompanionMissions
    ?? (typeof require !== 'undefined' ? require('./missions.js') : null);
  if (!model) throw new Error('Integrated mission model is unavailable.');
  root.SCCompanionMissions = model;
  if (typeof module !== 'undefined' && module.exports) module.exports = model;
}(typeof globalThis !== 'undefined' ? globalThis : window));