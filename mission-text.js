'use strict';

(function exposeMissionText(root) {
  function validator() {
    return root.SCCompanionMissionValidation
      ?? (typeof require !== 'undefined' ? require('./mission-validation.js') : null);
  }

  function tokenizeCargo(value) {
    return validator()?.tokenizeCargoDetailed(value)?.items.map((item) => ({ scu: item.scu, commodity: item.commodity })) ?? [];
  }

  function preserveLegacyTitle(mission, sourceText) {
    const titleLine = Number(mission.source?.titleLine);
    const rawTitle = titleLine > 0 ? String(sourceText).split(/\r?\n/)[titleLine - 1]?.trim() : '';
    const symbolicMission = /^mission\s+(?!\d+\b)[^:]+$/i.test(rawTitle);
    return symbolicMission ? { ...mission, title: rawTitle } : mission;
  }

  function parseMissionText(text, locationModel) {
    const api = validator();
    if (!api) throw new Error('Mission validation runtime is unavailable');
    const report = api.inspectMissionText(text, locationModel);
    if (report.blockingIssues.length) throw new Error(report.blockingIssues[0].message);
    return {
      missions: report.missions.map((mission) => preserveLegacyTitle(mission, text)),
      warnings: report.warnings.map((warning) => warning.message),
      report
    };
  }

  const api = Object.freeze({ parseMissionText, tokenizeCargo });
  root.SCCompanionMissionText = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
