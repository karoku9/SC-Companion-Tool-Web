'use strict';

(function exposeMissionText(root) {
  function validator() {
    return root.SCCompanionMissionValidation
      ?? (typeof require !== 'undefined' ? require('./mission-validation.js') : null);
  }

  function tokenizeCargo(value) {
    return validator()?.tokenizeCargoDetailed(value)?.items.map((item) => ({ scu: item.scu, commodity: item.commodity })) ?? [];
  }

  function parseMissionText(text, locationModel) {
    const api = validator();
    if (!api) throw new Error('Mission validation runtime is unavailable');
    const report = api.inspectMissionText(text, locationModel);
    if (report.blockingIssues.length) throw new Error(report.blockingIssues[0].message);
    return {
      missions: report.missions,
      warnings: report.warnings.map((warning) => warning.message),
      report
    };
  }

  const api = Object.freeze({ parseMissionText, tokenizeCargo });
  root.SCCompanionMissionText = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
