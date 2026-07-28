'use strict';

(function exposeRouteSessionPlannerV026(root) {
  const DEFAULT_TARGET_MINUTES = 60;
  const MIN_TARGET_MINUTES = 5;

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function travelEstimateOf(route) {
    const source = route?.estimate ?? {};
    const legs = Array.isArray(source.legs) ? source.legs : [];
    const travelMinMinutes = legs.length
      ? legs.reduce((sum, leg) => sum + number(leg?.travel?.minMinutes, 0), 0)
      : number(source.totalMin, 0);
    const travelMaxMinutes = legs.length
      ? legs.reduce((sum, leg) => sum + number(leg?.travel?.maxMinutes, leg?.travel?.minMinutes ?? 0), 0)
      : number(source.totalMax, travelMinMinutes);
    const travelMinutes = Math.max(0, Math.ceil(travelMaxMinutes));

    return Object.freeze({
      minMinutes: travelMinMinutes,
      maxMinutes: travelMaxMinutes,
      midpointMinutes: travelMinutes,
      travelMinMinutes,
      travelMaxMinutes,
      travelMinutes,
      budgetMinutes: travelMinutes,
      basis: 'travel-only',
      peakOnboardScu: number(source.peakOnboardScu, route?.optimization?.peakOnboardScu ?? 0),
      capacityFeasible: route?.optimization?.capacityFeasible !== false && source.capacityFeasible !== false,
      jumpCount: number(source.totalJumpCount, 0),
      stopCount: number(source.stopCount, route?.stops?.length ?? 0)
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
      const planner = root.SCCompanionRoutePlanner;
      const routeOptions = {
        startLocationId,
        selectedShipId: options.selectedShipId,
        routeStrategy: options.routeStrategy,
        routeStrategyWeights: options.routeStrategyWeights
      };
      const routes = planner.buildRouteCandidates
        ? planner.buildRouteCandidates(missions, missionModel, routeOptions)
        : [planner.buildRoute(missions, missionModel, routeOptions)];
      const route = routes[0];
      return Object.freeze({
        route,
        routes: Object.freeze(routes),
        estimate: travelEstimateOf(route)
      });
    } catch (error) {
      return Object.freeze({ route: null, estimate: null, error });
    }
  }

  function candidateScore(candidate, targetMinutes, missionCount) {
    if (!candidate?.route || !candidate.estimate?.capacityFeasible) return Infinity;
    const travelMinutes = candidate.estimate.travelMinutes;
    const unusedBudget = Math.max(0, targetMinutes - travelMinutes);
    const overTarget = Math.max(0, travelMinutes - targetMinutes);
    const cargoPenalty = candidate.estimate.peakOnboardScu * 0.02;
    const jumpPenalty = candidate.estimate.jumpCount * 0.25;
    return unusedBudget + overTarget * 100 + cargoPenalty + jumpPenalty - missionCount * 2;
  }

  function pickSeed(remaining, missionModel, startLocationId, targetMinutes, options) {
    const candidates = remaining.map((mission) => ({
      missions: [mission],
      candidate: buildCandidate([mission], missionModel, startLocationId, options)
    })).filter((item) => item.candidate.route && item.candidate.estimate?.capacityFeasible);
    if (!candidates.length) return null;

    const withinBudget = candidates.filter((item) => item.candidate.estimate.travelMinutes <= targetMinutes);
    const pool = withinBudget.length ? withinBudget : candidates;
    return [...pool].sort((left, right) => {
      if (!withinBudget.length) {
        return left.candidate.estimate.travelMinutes - right.candidate.estimate.travelMinutes;
      }
      return candidateScore(left.candidate, targetMinutes, 1) - candidateScore(right.candidate, targetMinutes, 1);
    })[0];
  }

  function fillSession(seed, remaining, missionModel, startLocationId, targetMinutes, options) {
    let selected = [...seed.missions];
    let current = seed.candidate;

    while (current.estimate.travelMinutes <= targetMinutes) {
      const selectedIds = new Set(selected.map((mission) => mission.id));
      const additions = remaining
        .filter((mission) => !selectedIds.has(mission.id))
        .map((mission) => {
          const missions = [...selected, mission];
          return { mission, missions, candidate: buildCandidate(missions, missionModel, startLocationId, options) };
        })
        .filter((item) => item.candidate.route
          && item.candidate.estimate?.capacityFeasible
          && item.candidate.estimate.travelMinutes <= targetMinutes);

      if (!additions.length) break;
      const best = additions.sort((left, right) => (
        candidateScore(left.candidate, targetMinutes, left.missions.length)
        - candidateScore(right.candidate, targetMinutes, right.missions.length)
      ))[0];
      selected = best.missions;
      current = best.candidate;
    }

    return Object.freeze({ missions: Object.freeze(selected), candidate: current });
  }

  function describeSession(index, missions, route, startLocationId, targetMinutes, routes = [route]) {
    const estimate = travelEstimateOf(route);
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
      routeCandidates: Object.freeze(routes.map((candidateRoute, candidateIndex) => Object.freeze({
        id: candidateRoute.optimization?.candidateId ?? (candidateIndex ? `alternative-${candidateIndex}` : 'recommended'),
        label: candidateRoute.optimization?.candidateLabel ?? (candidateIndex ? `Alternative ${candidateIndex}` : 'Recommended'),
        rationale: candidateRoute.optimization?.rationale ?? '',
        metrics: candidateRoute.optimization?.metrics ?? null,
        route: candidateRoute
      }))),
      selectedRouteCandidateId: routes[0]?.optimization?.candidateId ?? 'recommended',
      overTarget: estimate.travelMinutes > targetMinutes,
      gatewaySegments: route.gatewaySegments ?? Object.freeze([])
    });
  }

  function plan(missions, missionModel, options = {}) {
    const targetMinutes = Math.max(MIN_TARGET_MINUTES, Math.round(number(options.targetMinutes, DEFAULT_TARGET_MINUTES)));
    const legacyMode = options.mode;
    const playMode = options.playMode === 'full' || legacyMode === 'fastest' ? 'full' : 'sessions';
    const mode = options.playMode ? playMode : legacyMode === 'fastest' ? 'fastest' : 'sessions';
    const routeStrategy = String(options.routeStrategy ?? (legacyMode === 'fastest' ? 'fastest' : 'balanced'));
    const startLocationId = String(options.startLocationId ?? '').trim();
    if (!startLocationId) throw new Error('Select your current location before building a route.');
    if (!Array.isArray(missions) || !missions.length) throw new Error('At least one mission is required.');

    const fullCandidate = buildCandidate(missions, missionModel, startLocationId, options);
    if (!fullCandidate.route) throw fullCandidate.error ?? new Error('Unable to build the full route.');

    if (playMode === 'full') {
      const session = describeSession(0, missions, fullCandidate.route, startLocationId, targetMinutes, fullCandidate.routes);
      return Object.freeze({
        mode,
        playMode,
        routeStrategy,
        routeStrategyWeights: options.routeStrategyWeights ?? null,
        targetMinutes,
        estimateBasis: 'travel-only',
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
      const session = describeSession(sessions.length, filled.missions, filled.candidate.route, sessionStartId, targetMinutes, filled.candidate.routes);
      sessions.push(session);
      const selectedIds = new Set(filled.missions.map((mission) => mission.id));
      remaining = remaining.filter((mission) => !selectedIds.has(mission.id));
      sessionStartId = session.endLocationId;
    }

    return Object.freeze({
      mode,
      playMode,
      routeStrategy,
      routeStrategyWeights: options.routeStrategyWeights ?? null,
      targetMinutes,
      estimateBasis: 'travel-only',
      startLocationId,
      startLocationLabel: startLabel(startLocationId),
      sessions: Object.freeze(sessions),
      fullRoute: fullCandidate.route,
      totalMissionCount: missions.length,
      totalCargoScu: missions.reduce((sum, mission) => sum + missionScu(mission), 0),
      rewardAuec: missions.reduce((sum, mission) => sum + missionReward(mission), 0)
    });
  }

  const api = Object.freeze({ plan, estimateOf: travelEstimateOf, DEFAULT_TARGET_MINUTES, MIN_TARGET_MINUTES });
  root.SCCompanionRouteSessionPlanner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
