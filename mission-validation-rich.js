'use strict';

(function exposeIntegratedMissionValidation(root) {
  const base = root.SCCompanionMissionValidation
    ?? (typeof require !== 'undefined' ? require('./mission-validation.js') : null);
  if (!base) throw new Error('Integrated mission validation is unavailable.');

  function inspectMissionText(value, locationModel, options) {
    const report = base.inspectMissionText(value, locationModel, options);
    const entries = report.entries.map((entry) => {
      if (entry.kind !== 'title') return entry;
      const mission = report.missions[entry.missionIndex];
      return Object.freeze({
        ...entry,
        contractor: mission?.contractor ?? '',
        rewardAuec: mission?.rewardAuec ?? null
      });
    });
    return Object.freeze({ ...report, entries: Object.freeze(entries) });
  }

  const model = Object.freeze({ ...base, inspectMissionText });
  root.SCCompanionMissionValidation = model;
  if (typeof module !== 'undefined' && module.exports) module.exports = model;
}(typeof globalThis !== 'undefined' ? globalThis : window));