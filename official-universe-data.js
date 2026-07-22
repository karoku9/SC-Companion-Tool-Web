'use strict';

(function exposeOfficialUniverseData(root) {
  const snapshot = Object.freeze({
    gameVersion: 'Alpha 4.9.x',
    verifiedAt: '2026-07-22',
    publisher: 'Cloud Imperium Games / Roberts Space Industries',
    liveData: false,
    note: 'Official RSI web sources verified on 2026-07-22. This static snapshot is not live shard telemetry.'
  });

  const sources = Object.freeze({
    livePatch: Object.freeze({
      id: 'rsi-alpha-4-9',
      label: 'RSI Patch Notes — Star Citizen Alpha 4.9',
      url: 'https://robertsspaceindustries.com/en/patch-notes',
      kind: 'official-live-version'
    }),
    quantumGuide: Object.freeze({
      id: 'rsi-quantum-guide',
      label: 'RSI Knowledge Base — How to Quantum Travel',
      url: 'https://support.robertsspaceindustries.com/hc/en-us/articles/360019449994-How-to-Quantum-Travel',
      kind: 'official-gameplay-guide'
    }),
    stanton: Object.freeze({
      id: 'rsi-stanton',
      label: 'RSI Galactic Guide — Stanton System',
      url: 'https://robertsspaceindustries.com/en/comm-link/spectrum-dispatch/13141-Galactic-Guide-Stanton-System',
      kind: 'official-universe-reference'
    }),
    pyro: Object.freeze({
      id: 'rsi-pyro',
      label: 'RSI Galactapedia — Pyro System',
      url: 'https://robertsspaceindustries.com/galactapedia/article/0ODxJM917N-pyro-system',
      kind: 'official-universe-reference'
    }),
    nyx: Object.freeze({
      id: 'rsi-nyx',
      label: 'RSI Galactapedia — Nyx System',
      url: 'https://robertsspaceindustries.com/galactapedia/article/0jGxP6kpG3-nyx-system',
      kind: 'official-universe-reference'
    }),
    nyxLive: Object.freeze({
      id: 'rsi-alpha-4-4-nyx',
      label: 'RSI Patch Notes — Alpha 4.4.0 Nyx and jump points',
      url: 'https://robertsspaceindustries.com/en/comm-link/Patch-Notes/20899-Star-Citizen-Alpha-440',
      kind: 'official-release-notes'
    }),
    checkmate: Object.freeze({
      id: 'rsi-checkmate',
      label: 'RSI Galactapedia — Checkmate Station',
      url: 'https://robertsspaceindustries.com/galactapedia/article/RPDeA41EZX-checkmate-station',
      kind: 'official-location-reference'
    }),
    ruin: Object.freeze({
      id: 'rsi-ruin',
      label: 'RSI Galactapedia — Terminus / Ruin Station',
      url: 'https://robertsspaceindustries.com/galactapedia/article/RAXv9kpk5m-terminus-pyro-vi',
      kind: 'official-location-reference'
    }),
    orbituary: Object.freeze({
      id: 'rsi-orbituary',
      label: 'RSI Alpha 4.6 Patch Notes — Checkmate, Orbituary and Ruin stations',
      url: 'https://robertsspaceindustries.com/comm-link/Patch-Notes/20969-Star-Citizen-Alpha-46',
      kind: 'official-release-notes'
    }),
    levski: Object.freeze({
      id: 'rsi-levski',
      label: 'RSI Galactapedia — Levski',
      url: 'https://robertsspaceindustries.com/galactapedia/article/0dXQqBMAOp-levski',
      kind: 'official-location-reference'
    })
  });

  const jumpLinks = Object.freeze([
    Object.freeze({ id: 'stanton-pyro', from: 'stanton', to: 'pyro', currentStatus: 'active', sourceIds: Object.freeze(['rsi-pyro', 'rsi-alpha-4-4-nyx']) }),
    Object.freeze({ id: 'pyro-nyx', from: 'pyro', to: 'nyx', currentStatus: 'active', sourceIds: Object.freeze(['rsi-pyro', 'rsi-alpha-4-4-nyx']) }),
    Object.freeze({ id: 'stanton-nyx', from: 'stanton', to: 'nyx', currentStatus: 'active-placeholder', sourceIds: Object.freeze(['rsi-alpha-4-4-nyx']), note: 'CIG documents the current Stanton–Nyx connection as a placeholder.' })
  ]);

  const estimationBoundary = Object.freeze({
    distanceUnit: 'Gm',
    distanceMeaning: 'Estimated normal-space quantum distance. Jump tunnels are counted separately and are not converted into kilometres.',
    quantumMinutesPerGm: 0.09,
    quantumFixedMinutes: 2,
    quantumRangeFactor: Object.freeze([0.82, 1.24]),
    jumpMinutes: Object.freeze([7, 12]),
    intermediateGatewayTransferGm: 42,
    sourceKind: 'project-derived-from-official-topology'
  });

  function getSource(id) {
    return Object.values(sources).find((source) => source.id === id) ?? null;
  }

  const api = Object.freeze({ snapshot, sources, jumpLinks, estimationBoundary, getSource });
  root.SCCompanionOfficialUniverseData = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
