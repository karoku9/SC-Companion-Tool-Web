'use strict';

(function exposeCargoManualVersion(root) {
  const base = root.SCCompanionAutoCargoLayout;
  if (!base?.manualGridEditor || base.manualGridVersion) return;
  const api = Object.freeze({
    ...base,
    version: '0.29.2',
    manualGridVersion: '0.30.0'
  });
  root.SCCompanionAutoCargoLayout = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
