'use strict';

(function exposeIntegratedMissionModel(root) {
  const model = root.SCCompanionMissions
    ?? (typeof require !== 'undefined' ? require('./missions.js') : null);
  if (!model) throw new Error('Integrated mission model is unavailable.');
  root.SCCompanionMissions = model;
  if (typeof document !== 'undefined') {
    import('./focused-route-optimizer.js');
    import('./missions-source-provenance.js');
    import('./shared-pickup-display.js');
    import('./missions-review-accessibility.js');
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = model;
}(typeof globalThis !== 'undefined' ? globalThis : window));