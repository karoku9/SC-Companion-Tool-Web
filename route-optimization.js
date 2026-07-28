'use strict';

(function exposeRouteOptimization(root) {
  const WEIGHT_KEYS = Object.freeze([
    'travelTime',
    'missionCompletion',
    'gatewayJumps',
    'stopCount',
    'riskExposure',
    'trafficExposure',
    'cargoTurnover'
  ]);

  const BALANCED_WEIGHTS = Object.freeze({
    travelTime: 70,
    missionCompletion: 60,
    gatewayJumps: 65,
    stopCount: 45,
    riskExposure: 50,
    trafficExposure: 25,
    cargoTurnover: 55
  });

  const STRATEGIES = Object.freeze([
    { id: 'balanced', label: 'Balanced', icon: '◎', description: 'Balances time, jumps, completion, exposure and cargo turnover.', priorities: ['Time', 'Jumps', 'Turnover'] },
    { id: 'fastest', label: 'Fastest', icon: '↯', description: 'Minimizes estimated travel time.', priorities: ['Travel time'] },
    { id: 'complete-missions', label: 'Complete missions', icon: '✓', description: 'Closes whole missions earlier and keeps fewer missions open.', priorities: ['Completion step', 'Open missions'] },
    { id: 'fewest-jumps', label: 'Fewest jumps', icon: '◇', description: 'Minimizes gateway crossings before travel time.', priorities: ['Gateway jumps', 'Travel time'] },
    { id: 'fewest-stops', label: 'Fewest stops', icon: '⌁', description: 'Groups compatible operations at the same locations.', priorities: ['Stops', 'Jumps'] },
    { id: 'safer-route', label: 'Safer route', icon: '△', description: 'Reduces reviewed location risk and cargo exposure.', priorities: ['Risk', 'Cargo exposure'] },
    { id: 'low-traffic', label: 'Low traffic', icon: '≋', description: 'Prefers lower reviewed traffic when coverage is sufficient.', priorities: ['Traffic', 'Travel time'], experimental: true },
    { id: 'cargo-turnover', label: 'Cargo turnover', icon: '⇅', description: 'Delivers earlier to reduce onboard SCU over time.', priorities: ['SCU-time', 'Peak cargo'] },
    { id: 'custom', label: 'Custom', icon: '⌘', description: 'Uses your normalized operational priorities.', priorities: ['Custom weights'] }
  ]);

  const RISK_SCORES = Object.freeze({ low: 15, guarded: 30, elevated: 55, high: 80, extreme: 100, unknown: 50 });
  const TRAFFIC_SCORES = Object.freeze({ low: 20, light: 25, normal: 50, high: 80, volatile: 70, unknown: 55 });

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clampWeight(value) {
    return Math.max(0, Math.min(100, Math.round(number(value))));
  }

  function normalizeWeights(weights = BALANCED_WEIGHTS) {
    const raw = Object.fromEntries(WEIGHT_KEYS.map((key) => [key, clampWeight(weights?.[key] ?? BALANCED_WEIGHTS[key])]));
    if (!Object.values(raw).some((value) => value > 0)) return normalizeWeights(BALANCED_WEIGHTS);
    const total = Object.values(raw).reduce((sum, value) => sum + value, 0);
    return Object.freeze({
      raw: Object.freeze(raw),
      normalized: Object.freeze(Object.fromEntries(WEIGHT_KEYS.map((key) => [key, raw[key] / total])))
    });
  }

  function cargoKey(operation) {
    return `${operation.missionId}::${operation.lotId}`;
  }

  function quantityFor(operation, context) {
    const source = context.cargoLotsByKey;
    const lot = source instanceof Map ? source.get(cargoKey(operation)) : source?.[cargoKey(operation)];
    return Math.max(0, number(lot?.scu ?? operation.scu));
  }

  function locationSignals(stop, context) {
    const profile = context.locationProfiles?.getProfile?.(stop.locationId) ?? null;
    const riskLevel = profile?.risk?.level ?? 'unknown';
    const trafficLevel = profile?.traffic?.level ?? 'unknown';
    const trafficKnown = Boolean(profile?.traffic && trafficLevel !== 'unknown');
    const riskKnown = Boolean(profile?.risk && riskLevel !== 'unknown');
    return {
      risk: RISK_SCORES[riskLevel] ?? RISK_SCORES.unknown,
      traffic: TRAFFIC_SCORES[trafficLevel] ?? TRAFFIC_SCORES.unknown,
      riskKnown,
      trafficKnown
    };
  }

  function completionMetrics(stops, context) {
    const deliveryTotals = new Map();
    const delivered = new Map();
    const picked = new Set();
    const completed = new Set();
    let open = new Set();
    let simultaneousPeak = 0;
    let firstMissionCompletedAtStep = null;
    const completionSteps = [];

    stops.forEach((stop) => stop.operations.forEach((operation) => {
      if (operation.type === 'delivery' && operation.missionId) {
        deliveryTotals.set(operation.missionId, (deliveryTotals.get(operation.missionId) ?? 0) + 1);
      }
    }));

    stops.forEach((stop, index) => {
      stop.operations.filter((operation) => operation.type !== 'delivery').forEach((operation) => {
        if (!operation.missionId) return;
        picked.add(operation.missionId);
        open.add(operation.missionId);
      });
      stop.operations.filter((operation) => operation.type === 'delivery').forEach((operation) => {
        if (!operation.missionId) return;
        const count = (delivered.get(operation.missionId) ?? 0) + 1;
        delivered.set(operation.missionId, count);
        if (count >= (deliveryTotals.get(operation.missionId) ?? Infinity)) {
          completed.add(operation.missionId);
          open.delete(operation.missionId);
          completionSteps.push(index + 1);
          if (firstMissionCompletedAtStep === null) firstMissionCompletedAtStep = index + 1;
        }
      });
      simultaneousPeak = Math.max(simultaneousPeak, open.size);
    });

    return {
      completedMissionCount: completed.size,
      firstMissionCompletedAtStep,
      averageMissionCompletionStep: completionSteps.length
        ? completionSteps.reduce((sum, value) => sum + value, 0) / completionSteps.length
        : stops.length + 1,
      simultaneouslyOpenMissions: simultaneousPeak,
      missionCompletionCost: completionSteps.reduce((sum, value) => sum + value, 0) + simultaneousPeak
    };
  }

  function metricsFor(result, context = {}) {
    const completion = completionMetrics(result.stops, context);
    const travelLegs = (result.legs ?? []).filter((leg) => leg?.travel);
    const totalTravelMinutes = Math.max(0, travelLegs.length
      ? travelLegs.reduce((sum, leg) => sum + (number(leg.travel.minMinutes) + number(leg.travel.maxMinutes, leg.travel.minMinutes)) / 2, 0)
      : number(result.midpoint));
    const elapsedMinutes = Math.max(1, number(result.midpoint, totalTravelMinutes));
    const averageOnboardScu = elapsedMinutes > 0
      ? number(result.exposureScuMinutes) / elapsedMinutes
      : 0;
    let riskExposureScore = 0;
    let trafficExposureScore = 0;
    let riskKnown = 0;
    let trafficKnown = 0;

    result.stops.forEach((stop, index) => {
      const signal = locationSignals(stop, context);
      const onboard = number(result.legs?.[index]?.onboardBeforeScu);
      const exposureFactor = 1 + onboard / Math.max(1, number(result.effectiveCapacityScu, 100));
      riskExposureScore += signal.risk * exposureFactor;
      trafficExposureScore += signal.traffic * exposureFactor;
      if (signal.riskKnown) riskKnown += 1;
      if (signal.trafficKnown) trafficKnown += 1;
    });

    const locationCount = result.stops.length;
    return Object.freeze({
      totalTravelMinutes: Math.round(totalTravelMinutes),
      totalDistance: number(result.totalDistanceGm, null),
      gatewayJumpCount: number(result.totalJumpCount),
      stopCount: locationCount,
      ...completion,
      riskExposureScore: Math.round(riskExposureScore),
      trafficExposureScore: Math.round(trafficExposureScore),
      averageOnboardScu: Math.round(averageOnboardScu * 10) / 10,
      cargoScuTime: number(result.exposureScuMinutes),
      peakOnboardScu: number(result.peakOnboardScu),
      riskCoverage: locationCount ? riskKnown / locationCount : 0,
      trafficCoverage: locationCount ? trafficKnown / locationCount : 0,
      coveredTrafficLocations: trafficKnown,
      routeLocationCount: locationCount
    });
  }

  function signature(candidate) {
    return candidate.result.stops.map((stop) => String(stop.id)).join('|');
  }

  function distinct(candidates) {
    const seen = new Set();
    return candidates.filter((candidate) => {
      const key = signature(candidate);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function compareNumbers(...values) {
    for (const value of values) if (value) return value;
    return 0;
  }

  function lexicographicSort(strategyId) {
    return (left, right) => {
      const a = left.metrics;
      const b = right.metrics;
      if (strategyId === 'fewest-jumps') return compareNumbers(
        a.gatewayJumpCount - b.gatewayJumpCount,
        a.totalTravelMinutes - b.totalTravelMinutes,
        a.stopCount - b.stopCount
      );
      if (strategyId === 'complete-missions') return compareNumbers(
        (a.firstMissionCompletedAtStep ?? Infinity) - (b.firstMissionCompletedAtStep ?? Infinity),
        a.averageMissionCompletionStep - b.averageMissionCompletionStep,
        a.simultaneouslyOpenMissions - b.simultaneouslyOpenMissions,
        a.totalTravelMinutes - b.totalTravelMinutes
      );
      if (strategyId === 'fewest-stops') return compareNumbers(
        a.stopCount - b.stopCount,
        a.gatewayJumpCount - b.gatewayJumpCount,
        a.totalTravelMinutes - b.totalTravelMinutes
      );
      if (strategyId === 'fastest') return compareNumbers(
        a.totalTravelMinutes - b.totalTravelMinutes,
        a.gatewayJumpCount - b.gatewayJumpCount,
        a.cargoScuTime - b.cargoScuTime
      );
      if (strategyId === 'safer-route') return compareNumbers(
        a.riskExposureScore - b.riskExposureScore,
        a.cargoScuTime - b.cargoScuTime,
        a.totalTravelMinutes - b.totalTravelMinutes
      );
      if (strategyId === 'low-traffic') return compareNumbers(
        a.trafficExposureScore - b.trafficExposureScore,
        a.totalTravelMinutes - b.totalTravelMinutes
      );
      if (strategyId === 'cargo-turnover') return compareNumbers(
        a.cargoScuTime - b.cargoScuTime,
        a.averageOnboardScu - b.averageOnboardScu,
        a.peakOnboardScu - b.peakOnboardScu,
        a.totalTravelMinutes - b.totalTravelMinutes
      );
      return 0;
    };
  }

  function ranges(candidates) {
    const keys = {
      travelTime: 'totalTravelMinutes',
      missionCompletion: 'missionCompletionCost',
      gatewayJumps: 'gatewayJumpCount',
      stopCount: 'stopCount',
      riskExposure: 'riskExposureScore',
      trafficExposure: 'trafficExposureScore',
      cargoTurnover: 'cargoScuTime'
    };
    return Object.fromEntries(Object.entries(keys).map(([weightKey, metricKey]) => {
      const values = candidates.map((candidate) => number(candidate.metrics[metricKey]));
      return [weightKey, { metricKey, min: Math.min(...values), max: Math.max(...values) }];
    }));
  }

  function weightedScore(candidate, weights, candidateRanges) {
    return WEIGHT_KEYS.reduce((sum, key) => {
      const range = candidateRanges[key];
      const span = range.max - range.min;
      const normalized = span ? (number(candidate.metrics[range.metricKey]) - range.min) / span : 0;
      return sum + normalized * weights.normalized[key];
    }, 0);
  }

  function strategyAvailability(strategyId, candidates) {
    const coverage = candidates[0]?.metrics?.trafficCoverage ?? 0;
    if (strategyId === 'low-traffic' && coverage < 0.6) {
      return Object.freeze({
        available: false,
        experimental: true,
        reason: `Insufficient traffic coverage: ${candidates[0]?.metrics?.coveredTrafficLocations ?? 0} of ${candidates[0]?.metrics?.routeLocationCount ?? 0} route locations.`
      });
    }
    return Object.freeze({ available: true, experimental: strategyId === 'low-traffic', reason: null });
  }

  function rationaleFor(strategyId, recommended, alternatives) {
    const metrics = recommended.metrics;
    const fastest = [...alternatives].sort(lexicographicSort('fastest'))[0];
    if (strategyId === 'complete-missions') return `Selected because it completes the first mission at step ${metrics.firstMissionCompletedAtStep ?? '—'} and limits simultaneous open missions to ${metrics.simultaneouslyOpenMissions}.`;
    if (strategyId === 'fewest-jumps') return `Selected to use ${metrics.gatewayJumpCount} gateway transit${metrics.gatewayJumpCount === 1 ? '' : 's'} before optimizing travel time.`;
    if (strategyId === 'fewest-stops') return `Selected to consolidate compatible work into ${metrics.stopCount} operational stops.`;
    if (strategyId === 'safer-route') return `Selected for the lowest reviewed risk exposure score (${metrics.riskExposureScore}) among valid candidates.`;
    if (strategyId === 'low-traffic') return `Selected using traffic data for ${metrics.coveredTrafficLocations} of ${metrics.routeLocationCount} route locations.`;
    if (strategyId === 'cargo-turnover') return `Selected to reduce cargo exposure to ${Math.round(metrics.cargoScuTime)} SCU-minutes and peak load to ${metrics.peakOnboardScu} SCU.`;
    if (strategyId === 'fastest') return `Selected for the shortest estimated travel time (${metrics.totalTravelMinutes} minutes).`;
    const delta = fastest ? metrics.totalTravelMinutes - fastest.metrics.totalTravelMinutes : 0;
    return delta > 0
      ? `Selected as the balanced route, trading ${delta} additional minute${delta === 1 ? '' : 's'} for completion, jump and cargo-turnover gains.`
      : 'Selected as the balanced route with no estimated time penalty against the fastest valid candidate.';
  }

  function optimize(route, context, engine, options = {}) {
    const strategyId = STRATEGIES.some((item) => item.id === options.strategy) ? options.strategy : 'balanced';
    const orders = engine.enumerateOrders(route, route.stops, options.limit ?? 720);
    const evaluated = distinct(orders.map((order) => {
      const result = engine.evaluateOrder(order, context);
      return { result, metrics: metricsFor(result, context) };
    }).filter((candidate) => candidate.result.capacityFeasible));
    if (!evaluated.length) return Object.freeze({ recommended: null, candidates: Object.freeze([]), availability: strategyAvailability(strategyId, []) });

    const availability = strategyAvailability(strategyId, evaluated);
    const effectiveStrategy = availability.available ? strategyId : 'balanced';
    const normalizedWeights = normalizeWeights(options.weights);
    const candidateRanges = ranges(evaluated);
    let ordered;
    if (['balanced', 'custom'].includes(effectiveStrategy)) {
      ordered = [...evaluated].map((candidate) => ({
        ...candidate,
        score: weightedScore(candidate, effectiveStrategy === 'custom' ? normalizedWeights : normalizeWeights(BALANCED_WEIGHTS), candidateRanges)
      })).sort((left, right) => left.score - right.score || lexicographicSort('fastest')(left, right));
    } else {
      ordered = [...evaluated].sort(lexicographicSort(effectiveStrategy));
    }

    const recommended = ordered[0];
    const fastest = [...evaluated].sort(lexicographicSort('fastest'))[0];
    const jumpVaries = new Set(evaluated.map((candidate) => candidate.metrics.gatewayJumpCount)).size > 1;
    const secondaryStrategy = effectiveStrategy === 'fewest-jumps' || !jumpVaries ? 'safer-route' : 'fewest-jumps';
    const secondary = [...evaluated].sort(lexicographicSort(secondaryStrategy))[0];
    const selected = distinct([recommended, fastest, secondary, ...ordered]).slice(0, 3);
    const decorated = selected.map((candidate, index) => Object.freeze({
      ...candidate,
      id: index === 0 ? 'recommended' : index === 1 ? 'fastest-alternative' : `${secondaryStrategy}-alternative`,
      label: index === 0 ? 'Recommended' : index === 1 ? 'Fastest alternative' : `${STRATEGIES.find((item) => item.id === secondaryStrategy)?.label ?? 'Alternative'} alternative`,
      rationale: index === 0 ? rationaleFor(effectiveStrategy, recommended, evaluated) : rationaleFor(index === 1 ? 'fastest' : secondaryStrategy, candidate, evaluated)
    }));

    return Object.freeze({
      requestedStrategy: strategyId,
      effectiveStrategy,
      availability,
      weights: normalizedWeights,
      candidateCount: evaluated.length,
      recommended: decorated[0],
      candidates: Object.freeze(decorated)
    });
  }

  const api = Object.freeze({
    WEIGHT_KEYS,
    BALANCED_WEIGHTS,
    STRATEGIES,
    normalizeWeights,
    metricsFor,
    strategyAvailability,
    lexicographicSort,
    optimize
  });
  root.SCCompanionRouteOptimization = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
