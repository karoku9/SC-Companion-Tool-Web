'use strict';

(function exposeNavigationEstimates(root) {
  const official = root.SCCompanionOfficialUniverseData;
  const map = root.SCCompanionStarmapData;
  if (!official || !map) return;

  const bySystem = new Map(map.systems.map((system) => [system.id, system]));
  const byConnection = new Map(map.connections.map((connection) => [connection.id, connection]));

  function round(value, digits = 1) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }

  function vectorDistance(left, right) {
    if (!left || !right) return null;
    return Math.hypot(
      left[0] - right[0],
      left[1] - right[1],
      left[2] - right[2]
    );
  }

  function radialDistance(position) {
    return position ? Math.hypot(position[0], position[1], position[2]) : 0;
  }

  function neighbours(systemId) {
    return map.connections.flatMap((connection) => {
      if (connection.from === systemId) return [{ systemId: connection.to, connection }];
      if (connection.to === systemId) return [{ systemId: connection.from, connection }];
      return [];
    });
  }

  function connectionWeight(connection) {
    return connection.status === 'active-placeholder' || connection.status === 'placeholder' ? 1.15 : 1;
  }

  function findSystemPath(fromSystemId, toSystemId) {
    if (!fromSystemId || !toSystemId) return null;
    if (fromSystemId === toSystemId) return Object.freeze({ systems: Object.freeze([fromSystemId]), connections: Object.freeze([]) });

    const open = [{ systemId: fromSystemId, cost: 0, systems: [fromSystemId], connections: [] }];
    const best = new Map([[fromSystemId, 0]]);
    while (open.length) {
      open.sort((left, right) => left.cost - right.cost);
      const current = open.shift();
      if (current.systemId === toSystemId) {
        return Object.freeze({ systems: Object.freeze(current.systems), connections: Object.freeze(current.connections) });
      }
      neighbours(current.systemId).forEach(({ systemId, connection }) => {
        const cost = current.cost + connectionWeight(connection);
        if (cost >= (best.get(systemId) ?? Infinity)) return;
        best.set(systemId, cost);
        open.push({
          systemId,
          cost,
          systems: [...current.systems, systemId],
          connections: [...current.connections, connection]
        });
      });
    }
    return null;
  }

  function gatewayDistance(anchor, system) {
    const radius = Number(system?.navigationRadiusGm ?? 130);
    const locationRadius = radialDistance(anchor.distancePositionGm);
    return Math.max(6, radius - Math.min(radius, locationRadius));
  }

  function quantumRange(distanceGm, quantumTimeFactor = 1) {
    const boundary = official.estimationBoundary;
    const factor = Math.max(0.1, Number(quantumTimeFactor) || 1);
    const midpoint = (boundary.quantumFixedMinutes + distanceGm * boundary.quantumMinutesPerGm) * factor;
    return {
      minMinutes: Math.max(1, Math.round(midpoint * boundary.quantumRangeFactor[0])),
      maxMinutes: Math.max(2, Math.round(midpoint * boundary.quantumRangeFactor[1]))
    };
  }

  function formatDistance(distanceGm, jumpCount = 0) {
    if (!Number.isFinite(distanceGm)) return jumpCount ? `${jumpCount} jump${jumpCount === 1 ? '' : 's'} · local distance unavailable` : 'Distance unavailable';
    const local = distanceGm < 1
      ? `~${Math.round(distanceGm * 1_000_000).toLocaleString('en-US')} km`
      : `~${round(distanceGm, distanceGm >= 100 ? 0 : 1)} Gm`;
    return jumpCount ? `${local} local quantum + ${jumpCount} jump${jumpCount === 1 ? '' : 's'}` : local;
  }

  function sameSystemEstimate(fromAnchor, toAnchor, quantumTimeFactor) {
    const sameBody = fromAnchor.bodyId === toAnchor.bodyId;
    const distanceGm = Math.max(sameBody ? 0.08 : 0.5, vectorDistance(fromAnchor.distancePositionGm, toAnchor.distancePositionGm) ?? 0);
    if (sameBody) {
      return Object.freeze({
        minMinutes: 2,
        maxMinutes: 5,
        quantumLeg: 0,
        jumpCount: 0,
        transitionKind: 'local',
        distanceGm: round(distanceGm, 2),
        distanceLabel: formatDistance(distanceGm),
        source: 'Official body/location mapping · project-derived local approach range',
        dataStatus: official.estimationBoundary.sourceKind,
        pathSystems: Object.freeze([fromAnchor.systemId]),
        pathConnections: Object.freeze([])
      });
    }
    const range = quantumRange(distanceGm, quantumTimeFactor);
    return Object.freeze({
      ...range,
      quantumLeg: 1,
      jumpCount: 0,
      transitionKind: 'quantum',
      distanceGm: round(distanceGm),
      distanceLabel: formatDistance(distanceGm),
      source: 'Official system/body mapping · project-derived normal-space distance',
      dataStatus: official.estimationBoundary.sourceKind,
      pathSystems: Object.freeze([fromAnchor.systemId]),
      pathConnections: Object.freeze([])
    });
  }

  function interstellarEstimate(fromAnchor, toAnchor, quantumTimeFactor) {
    const path = findSystemPath(fromAnchor.systemId, toAnchor.systemId);
    if (!path) return null;

    const fromSystem = bySystem.get(fromAnchor.systemId);
    const toSystem = bySystem.get(toAnchor.systemId);
    let distanceGm = gatewayDistance(fromAnchor, fromSystem) + gatewayDistance(toAnchor, toSystem);
    if (path.systems.length > 2) distanceGm += official.estimationBoundary.intermediateGatewayTransferGm * (path.systems.length - 2);

    const quantum = quantumRange(distanceGm, quantumTimeFactor);
    const jumps = path.connections.length;
    const jumpMin = jumps * official.estimationBoundary.jumpMinutes[0];
    const jumpMax = jumps * official.estimationBoundary.jumpMinutes[1];
    const placeholder = path.connections.some((connection) => connection.status === 'active-placeholder' || connection.status === 'placeholder');

    return Object.freeze({
      minMinutes: quantum.minMinutes + jumpMin,
      maxMinutes: quantum.maxMinutes + jumpMax,
      quantumLeg: 1,
      jumpCount: jumps,
      transitionKind: placeholder ? 'jump-placeholder' : 'jump',
      distanceGm: round(distanceGm),
      distanceLabel: formatDistance(distanceGm, jumps),
      source: `Official jump topology (${path.systems.join(' → ')}) · project-derived local quantum and jump-time range`,
      dataStatus: official.estimationBoundary.sourceKind,
      pathSystems: path.systems,
      pathConnections: Object.freeze(path.connections.map((connection) => connection.id)),
      placeholderConnection: placeholder
    });
  }

  function estimateLeg(fromLocationId, toLocationId, options = {}) {
    if (!fromLocationId || !toLocationId) return null;
    if (fromLocationId === toLocationId) {
      return Object.freeze({
        minMinutes: 0,
        maxMinutes: 1,
        quantumLeg: 0,
        jumpCount: 0,
        transitionKind: 'same-location',
        distanceGm: 0,
        distanceLabel: 'Same location',
        source: 'Same operational location',
        dataStatus: 'exact-route-identity',
        pathSystems: Object.freeze([]),
        pathConnections: Object.freeze([])
      });
    }

    const fromAnchor = map.getLocationAnchor(fromLocationId);
    const toAnchor = map.getLocationAnchor(toLocationId);
    if (!fromAnchor || !toAnchor) return null;
    const factor = Math.max(0.1, Number(options.quantumTimeFactor ?? 1));
    if (fromAnchor.systemId === toAnchor.systemId) return sameSystemEstimate(fromAnchor, toAnchor, factor);
    return interstellarEstimate(fromAnchor, toAnchor, factor);
  }

  function summarizeRoute(stops, options = {}) {
    let distanceGm = 0;
    let jumpCount = 0;
    let minMinutes = 0;
    let maxMinutes = 0;
    const legs = [];
    for (let index = 1; index < stops.length; index += 1) {
      const estimate = estimateLeg(stops[index - 1].locationId, stops[index].locationId, options);
      if (!estimate) continue;
      distanceGm += Number(estimate.distanceGm ?? 0);
      jumpCount += Number(estimate.jumpCount ?? 0);
      minMinutes += estimate.minMinutes;
      maxMinutes += estimate.maxMinutes;
      legs.push(estimate);
    }
    return Object.freeze({
      distanceGm: round(distanceGm),
      distanceLabel: formatDistance(distanceGm, jumpCount),
      jumpCount,
      minMinutes,
      maxMinutes,
      legs: Object.freeze(legs)
    });
  }

  const api = Object.freeze({ findSystemPath, estimateLeg, summarizeRoute, formatDistance });
  root.SCCompanionNavigationEstimates = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
