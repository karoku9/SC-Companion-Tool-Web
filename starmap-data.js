'use strict';

(function exposeStarmapData(root) {
  const systems = Object.freeze([
    Object.freeze({
      id: 'stanton',
      name: 'Stanton',
      position: Object.freeze([-72, 8, -18]),
      classification: 'Corporate system',
      security: 'UEE / corporate jurisdiction',
      availability: 'Playable',
      sourceKind: 'official-current',
      sourceIds: Object.freeze(['rsi-stanton', 'rsi-alpha-4-9']),
      navigationRadiusGm: 130,
      bodies: Object.freeze([
        Object.freeze({ id: 'stanton-star', name: 'Stanton', type: 'star', radius: 0, distanceRadiusGm: 0, angle: 0, size: 13 }),
        Object.freeze({ id: 'hurston', name: 'Hurston', type: 'planet', radius: 32, distanceRadiusGm: 32, angle: -24, size: 6 }),
        Object.freeze({ id: 'crusader', name: 'Crusader', type: 'gas-giant', radius: 54, distanceRadiusGm: 54, angle: 56, size: 9 }),
        Object.freeze({ id: 'arccorp', name: 'ArcCorp', type: 'planet', radius: 76, distanceRadiusGm: 76, angle: 151, size: 6 }),
        Object.freeze({ id: 'microtech', name: 'microTech', type: 'planet', radius: 103, distanceRadiusGm: 103, angle: 248, size: 7 })
      ])
    }),
    Object.freeze({
      id: 'pyro',
      name: 'Pyro',
      position: Object.freeze([8, -12, 18]),
      classification: 'Unclaimed flare-star system',
      security: 'High outlaw activity',
      availability: 'Playable',
      sourceKind: 'official-current',
      sourceIds: Object.freeze(['rsi-pyro', 'rsi-alpha-4-9']),
      navigationRadiusGm: 150,
      bodies: Object.freeze([
        Object.freeze({ id: 'pyro-star', name: 'Pyro', type: 'flare-star', radius: 0, distanceRadiusGm: 0, angle: 0, size: 15 }),
        Object.freeze({ id: 'pyro-i', name: 'Pyro I', type: 'planet', radius: 24, distanceRadiusGm: 24, angle: 18, size: 4 }),
        Object.freeze({ id: 'monox', name: 'Monox', type: 'planet', radius: 40, distanceRadiusGm: 40, angle: 88, size: 5 }),
        Object.freeze({ id: 'bloom', name: 'Bloom', type: 'planet', radius: 58, distanceRadiusGm: 58, angle: 154, size: 5 }),
        Object.freeze({ id: 'pyro-iv', name: 'Pyro IV', type: 'planet', radius: 76, distanceRadiusGm: 76, angle: 214, size: 4 }),
        Object.freeze({ id: 'pyro-v', name: 'Pyro V', type: 'gas-giant', radius: 96, distanceRadiusGm: 96, angle: 272, size: 10 }),
        Object.freeze({ id: 'terminus', name: 'Terminus', type: 'planet', radius: 122, distanceRadiusGm: 122, angle: 329, size: 6 })
      ])
    }),
    Object.freeze({
      id: 'nyx',
      name: 'Nyx',
      position: Object.freeze([80, 18, -6]),
      classification: 'Unclaimed frontier system',
      security: 'People’s Alliance influence; frontier risk',
      availability: 'Playable',
      sourceKind: 'official-current',
      sourceIds: Object.freeze(['rsi-nyx', 'rsi-alpha-4-4-nyx', 'rsi-alpha-4-9']),
      navigationRadiusGm: 130,
      bodies: Object.freeze([
        Object.freeze({ id: 'nyx-star', name: 'Nyx', type: 'star', radius: 0, distanceRadiusGm: 0, angle: 0, size: 14 }),
        Object.freeze({ id: 'nyx-i', name: 'Nyx I', type: 'planet', radius: 32, distanceRadiusGm: 32, angle: 34, size: 5 }),
        Object.freeze({ id: 'nyx-ii', name: 'Nyx II', type: 'planet', radius: 57, distanceRadiusGm: 57, angle: 143, size: 5 }),
        Object.freeze({ id: 'nyx-iii', name: 'Nyx III', type: 'ice-giant', radius: 84, distanceRadiusGm: 84, angle: 261, size: 8 }),
        Object.freeze({ id: 'glaciem-ring', name: 'Glaciem Ring', type: 'asteroid-belt', radius: 111, distanceRadiusGm: 111, angle: 0, size: 0 }),
        Object.freeze({ id: 'delamar', name: 'Delamar / Levski', type: 'asteroid-settlement', radius: 111, distanceRadiusGm: 111, angle: 204, size: 5 })
      ])
    })
  ]);

  const connections = Object.freeze([
    Object.freeze({ id: 'stanton-pyro', from: 'stanton', to: 'pyro', status: 'active', label: 'Stanton ↔ Pyro', sourceIds: Object.freeze(['rsi-pyro', 'rsi-alpha-4-4-nyx']) }),
    Object.freeze({ id: 'pyro-nyx', from: 'pyro', to: 'nyx', status: 'active', label: 'Pyro ↔ Nyx', sourceIds: Object.freeze(['rsi-pyro', 'rsi-alpha-4-4-nyx']) }),
    Object.freeze({ id: 'stanton-nyx', from: 'stanton', to: 'nyx', status: 'active-placeholder', label: 'Stanton ↔ Nyx', sourceIds: Object.freeze(['rsi-alpha-4-4-nyx']), note: 'Current in-game connection is documented by CIG as a placeholder.' })
  ]);

  const locationAnchors = Object.freeze({
    'stanton-hurston-lorville-teasa': Object.freeze({ systemId: 'stanton', bodyId: 'hurston', offset: Object.freeze([0, 0, 8]), distanceOffsetGm: Object.freeze([0, 0, 0.08]), label: 'Teasa Spaceport · Lorville', sourceIds: Object.freeze(['rsi-stanton']) }),
    'stanton-arccorp-area18-riker': Object.freeze({ systemId: 'stanton', bodyId: 'arccorp', offset: Object.freeze([0, 0, 8]), distanceOffsetGm: Object.freeze([0, 0, 0.08]), label: 'Riker Memorial Spaceport · Area18', sourceIds: Object.freeze(['rsi-stanton']) }),
    'stanton-arccorp-baijini': Object.freeze({ systemId: 'stanton', bodyId: 'arccorp', offset: Object.freeze([5, 2, 12]), distanceOffsetGm: Object.freeze([0.08, 0.03, 0.12]), label: 'Baijini Point · ArcCorp', sourceIds: Object.freeze(['rsi-stanton']) }),
    'pyro-monox-checkmate': Object.freeze({ systemId: 'pyro', bodyId: 'monox', offset: Object.freeze([5, 2, 11]), distanceOffsetGm: Object.freeze([0.1, 0.04, 0.15]), label: 'Checkmate Station · Pyro', sourceIds: Object.freeze(['rsi-checkmate']) }),
    'pyro-bloom-orbituary': Object.freeze({ systemId: 'pyro', bodyId: 'bloom', offset: Object.freeze([-5, 2, 12]), distanceOffsetGm: Object.freeze([-0.1, 0.04, 0.18]), label: 'Orbituary · Pyro', sourceIds: Object.freeze(['rsi-orbituary', 'rsi-pyro']) }),
    'pyro-terminus-ruin': Object.freeze({ systemId: 'pyro', bodyId: 'terminus', offset: Object.freeze([5, -2, 12]), distanceOffsetGm: Object.freeze([0.1, -0.04, 0.18]), label: 'Ruin Station · Pyro', sourceIds: Object.freeze(['rsi-ruin']) }),
    'nyx-delamar-levski': Object.freeze({ systemId: 'nyx', bodyId: 'delamar', offset: Object.freeze([0, 0, 8]), distanceOffsetGm: Object.freeze([0, 0, 0.1]), label: 'Levski · Nyx', sourceIds: Object.freeze(['rsi-levski', 'rsi-alpha-4-4-nyx']) })
  });

  const bySystemId = new Map(systems.map((system) => [system.id, system]));

  function getSystem(id) {
    return bySystemId.get(id) ?? null;
  }

  function polarPosition(radius, angleDegrees) {
    if (!radius) return [0, 0, 0];
    const angle = angleDegrees * Math.PI / 180;
    return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
  }

  function bodyPosition(body) {
    return body ? polarPosition(body.radius, body.angle) : [0, 0, 0];
  }

  function bodyDistancePosition(body) {
    return body ? polarPosition(body.distanceRadiusGm ?? body.radius, body.angle) : [0, 0, 0];
  }

  function getBody(systemId, bodyId) {
    return getSystem(systemId)?.bodies.find((body) => body.id === bodyId) ?? null;
  }

  function getLocationAnchor(locationId) {
    const anchor = locationAnchors[locationId];
    if (!anchor) return null;
    const body = getBody(anchor.systemId, anchor.bodyId);
    if (!body) return null;
    const base = bodyPosition(body);
    const distanceBase = bodyDistancePosition(body);
    return Object.freeze({
      ...anchor,
      position: Object.freeze(base.map((value, index) => value + anchor.offset[index])),
      distancePositionGm: Object.freeze(distanceBase.map((value, index) => value + anchor.distanceOffsetGm[index]))
    });
  }

  const api = Object.freeze({ systems, connections, locationAnchors, getSystem, getBody, bodyPosition, bodyDistancePosition, getLocationAnchor });
  root.SCCompanionStarmapData = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
