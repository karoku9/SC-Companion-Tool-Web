'use strict';

(function exposeRouteSessionPlanner(root) {
  const DEFAULT_TARGET_MINUTES = 60;
  const MAX_SESSION_FACTOR = 1.2;

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function estimateOf(route) {
    const estimate = route?.estimate ?? {};
    const minMinutes = number(estimate.totalMin, 0);
    const maxMinutes = number(estimate.totalMax, minMinutes);
    return Object.freeze({
      minMinutes,
      maxMinutes,
      midpointMinutes: number(estimate.midpoint, (minMinutes + maxMinutes) / 2),
      peakOnboardScu: number(estimate.peakOnboardScu, route?.optimization?.peakOnboardScu ?? 0),
      capacityFeasible: route?.optimization?.capacityFeasible !== false && estimate.capacityFeasible !== false,
      jumpCount: number(estimate.totalJumpCount, 0)
    });
  }

  function missionScu(mission) {
    return (mission.cargoLots ?? []).reduce((sum, lot) => sum + number(lot.scu), 0);
  }

  function missionReward(mission) {
    return Math.max(0, number(mission.rewardAuec, 0));
  }

  function startLabel(locationId) {
    const locations = root.SCCompanionLocations;
    const location = locations?.getLocation?.(locationId);
    return location ? locations.formatOperationalLabel(location) : String(locationId ?? 'Unknown start');
  }

  function buildCandidate(missions, missionModel, startLocationId, options = {}) {
    try {
      const route = root.SCCompanionRoutePlanner.buildRoute(missions, missionModel, {
        startLocationId,
        selectedShipId: options.selectedShipId
      });
      return Object.freeze({ route, estimate: estimateOf(route) });
    } catch (error) {
      return Object.freeze({ route: null, estimate: null, error });
    }
  }

  function candidateScore(candidate, targetMinutes, missionCount) {
    if (!candidate?.route || !candidate.estimate?.capacityFeasible) return Infinity;
    const midpoint = candidate.estimate.midpointMinutes;
    const overTarget = Math.max(0, midpoint - targetMinutes);
    const distance = Math.abs(targetMinutes - midpoint);
    const cargoPenalty = candidate.estimate.peakOnboardScu * 0.08;
    const jumpPenalty = candidate.estimate.jumpCount * 1.5;
    return distance + overTarget * 4 + cargoPenalty + jumpPenalty - missionCount * 4;
  }

  function pickSeed(remaining, missionModel, startLocationId, targetMinutes, options) {
    const candidates = remaining.map((mission) => ({
      missions: [mission],
      candidate: buildCandidate([mission], missionModel, startLocationId, options)
    })).filter((item) => item.candidate.route && item.candidate.estimate?.capacityFeasible);
    if (!candidates.length) return null;

    const underTarget = candidates.filter((item) => item.candidate.estimate.midpointMinutes <= targetMinutes * MAX_SESSION_FACTOR);
    const pool = underTarget.length ? underTarget : candidates;
    return [...pool].sort((left, right) => {
      if (!underTarget.length) return left.candidate.estimate.midpointMinutes - right.candidate.estimate.midpointMinutes;
      return candidateScore(left.candidate, targetMinutes, 1) - candidateScore(right.candidate, targetMinutes, 1);
    })[0];
  }

  function fillSession(seed, remaining, missionModel, startLocationId, targetMinutes, options) {
    let selected = [...seed.missions];
    let current = seed.candidate;
    let keepTrying = true;

    while (keepTrying) {
      keepTrying = false;
      const selectedIds = new Set(selected.map((mission) => mission.id));
      const additions = remaining.filter((mission) => !selectedIds.has(mission.id)).map((mission) => {
        const missions = [...selected, mission];
        return { mission, missions, candidate: buildCandidate(missions, missionModel, startLocationId, options) };
      }).filter((item) => {
        if (!item.candidate.route || !item.candidate.estimate?.capacityFeasible) return false;
        const midpointLimit = targetMinutes * (current.estimate.midpointMinutes < targetMinutes * 0.45 ? 1.35 : MAX_SESSION_FACTOR);
        return item.candidate.estimate.midpointMinutes <= midpointLimit
          && item.candidate.estimate.maxMinutes <= targetMinutes * 1.65;
      });

      if (!additions.length) break;
      const best = additions.sort((left, right) => (
        candidateScore(left.candidate, targetMinutes, left.missions.length)
        - candidateScore(right.candidate, targetMinutes, right.missions.length)
      ))[0];
      const currentDistance = Math.abs(targetMinutes - current.estimate.midpointMinutes);
      const nextDistance = Math.abs(targetMinutes - best.candidate.estimate.midpointMinutes);
      if (nextDistance <= currentDistance || current.estimate.midpointMinutes < targetMinutes * 0.7) {
        selected = best.missions;
        current = best.candidate;
        keepTrying = true;
      }
    }

    return Object.freeze({ missions: Object.freeze(selected), candidate: current });
  }

  function describeSession(index, missions, route, startLocationId, targetMinutes) {
    const estimate = estimateOf(route);
    const lastStop = route.stops.at(-1) ?? null;
    const rewardAuec = missions.reduce((sum, mission) => sum + missionReward(mission), 0);
    const totalCargoScu = missions.reduce((sum, mission) => sum + missionScu(mission), 0);
    return Object.freeze({
      id: `session-${index + 1}`,
      index,
      title: `Session ${index + 1}`,
      targetMinutes,
      startLocationId,
      startLocationLabel: startLabel(startLocationId),
      endLocationId: lastStop?.locationId ?? startLocationId,
      endLocationLabel: lastStop?.locationLabel ?? startLabel(startLocationId),
      missionIds: Object.freeze(missions.map((mission) => mission.id)),
      missionTitles: Object.freeze(missions.map((mission) => mission.title)),
      missionCount: missions.length,
      rewardAuec,
      totalCargoScu,
      estimate,
      route,
      overTarget: estimate.midpointMinutes > targetMinutes * MAX_SESSION_FACTOR,
      gatewaySegments: route.gatewaySegments ?? Object.freeze([])
    });
  }

  function plan(missions, missionModel, options = {}) {
    const targetMinutes = Math.max(20, number(options.targetMinutes, DEFAULT_TARGET_MINUTES));
    const mode = options.mode === 'fastest' ? 'fastest' : 'sessions';
    const startLocationId = String(options.startLocationId ?? '').trim();
    if (!startLocationId) throw new Error('Select your current location before building a route.');
    if (!Array.isArray(missions) || !missions.length) throw new Error('At least one mission is required.');

    const fullCandidate = buildCandidate(missions, missionModel, startLocationId, options);
    if (!fullCandidate.route) throw fullCandidate.error ?? new Error('Unable to build the full route.');

    if (mode === 'fastest') {
      const session = describeSession(0, missions, fullCandidate.route, startLocationId, targetMinutes);
      return Object.freeze({
        mode,
        targetMinutes,
        startLocationId,
        startLocationLabel: startLabel(startLocationId),
        sessions: Object.freeze([session]),
        fullRoute: fullCandidate.route,
        totalMissionCount: missions.length,
        totalCargoScu: missions.reduce((sum, mission) => sum + missionScu(mission), 0),
        rewardAuec: missions.reduce((sum, mission) => sum + missionReward(mission), 0)
      });
    }

    let remaining = [...missions];
    let sessionStartId = startLocationId;
    const sessions = [];
    while (remaining.length) {
      const seed = pickSeed(remaining, missionModel, sessionStartId, targetMinutes, options);
      if (!seed) throw new Error(`No capacity-feasible route can be built from ${startLabel(sessionStartId)}.`);
      const filled = fillSession(seed, remaining, missionModel, sessionStartId, targetMinutes, options);
      const session = describeSession(sessions.length, filled.missions, filled.candidate.route, sessionStartId, targetMinutes);
      sessions.push(session);
      const selectedIds = new Set(filled.missions.map((mission) => mission.id));
      remaining = remaining.filter((mission) => !selectedIds.has(mission.id));
      sessionStartId = session.endLocationId;
    }

    return Object.freeze({
      mode,
      targetMinutes,
      startLocationId,
      startLocationLabel: startLabel(startLocationId),
      sessions: Object.freeze(sessions),
      fullRoute: fullCandidate.route,
      totalMissionCount: missions.length,
      totalCargoScu: missions.reduce((sum, mission) => sum + missionScu(mission), 0),
      rewardAuec: missions.reduce((sum, mission) => sum + missionReward(mission), 0)
    });
  }

  const api = Object.freeze({ plan, estimateOf, DEFAULT_TARGET_MINUTES });
  root.SCCompanionRouteSessionPlanner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));