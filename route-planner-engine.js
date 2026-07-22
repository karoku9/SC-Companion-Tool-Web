'use strict';

(function exposeRoutePlannerEngine(root) {
  const PROFILE_IDS = Object.freeze(['fastest', 'min-onboard']);

  function cargoKey(operation) {
    return `${operation.missionId}::${operation.lotId}`;
  }

  function distance(left, right) {
    if (!left || !right) return null;
    return Math.hypot(
      left.position[0] - right.position[0],
      left.position[1] - right.position[1],
      left.position[2] - right.position[2]
    );
  }

  function stopDependencyIds(route, stop) {
    const operationStop = new Map();
    (route.allStops ?? route.stops ?? []).forEach((item) => {
      item.operations.forEach((operation) => operationStop.set(operation.id, String(item.id)));
    });
    return [...new Set(stop.operations
      .flatMap((operation) => operation.dependsOn.map((id) => operationStop.get(id)))
      .filter(Boolean))];
  }

  function dependencyMap(route, futureStops) {
    const futureIds = new Set(futureStops.map((stop) => String(stop.id)));
    return new Map(futureStops.map((stop) => [
      String(stop.id),
      new Set(stopDependencyIds(route, stop).filter((id) => futureIds.has(String(id))).map(String))
    ]));
  }

  function enumerateOrders(route, futureStops, limit = 720) {
    const dependencies = dependencyMap(route, futureStops);
    const byId = new Map(futureStops.map((stop) => [String(stop.id), stop]));
    const results = [];

    function visit(order, remaining, completed) {
      if (results.length >= limit) return;
      if (!remaining.size) {
        results.push(order.map((id) => byId.get(id)));
        return;
      }
      const available = [...remaining].filter((id) => [...(dependencies.get(id) ?? [])]
        .every((dependency) => completed.has(dependency)));
      available.sort((left, right) => {
        const leftStop = byId.get(left);
        const rightStop = byId.get(right);
        return (leftStop.orderIndex ?? leftStop.baseIndex ?? 0) - (rightStop.orderIndex ?? rightStop.baseIndex ?? 0);
      });
      available.forEach((id) => {
        const nextRemaining = new Set(remaining);
        nextRemaining.delete(id);
        visit([...order, id], nextRemaining, new Set([...completed, id]));
      });
    }

    visit([], new Set(byId.keys()), new Set());
    return results;
  }

  function locationKind(location) {
    if (!location) return 'unknown';
    if (location.type === 'orbital-station') return 'orbital-station';
    if (location.type === 'spaceport') return 'landing-zone';
    return location.type;
  }

  function arrivalEstimate(stop, context) {
    const location = context.locations?.getLocation(stop.locationId);
    const kind = locationKind(location);
    const profile = context.locationProfiles?.getProfile(stop.locationId);
    const traffic = profile?.traffic?.level ?? 'normal';
    const preset = context.arrivalEstimates?.presets?.[kind] ? kind : null;
    if (!preset) return { minMinutes: 3, maxMinutes: 7, source: 'generic arrival heuristic' };
    const estimate = context.arrivalEstimates.estimateArrival(preset, traffic);
    return { minMinutes: estimate.minMinutes, maxMinutes: estimate.maxMinutes, source: `${preset} arrival preset` };
  }

  function handlingEstimate(stop) {
    const scu = stop.operations.reduce((total, operation) => total + Number(operation.scu ?? 0), 0);
    const actionCount = stop.operations.length;
    return {
      minMinutes: Math.max(1, Math.ceil(scu * 0.45 + actionCount * 0.5)),
      maxMinutes: Math.max(2, Math.ceil(scu * 0.9 + actionCount * 1.2)),
      source: `${scu} SCU across ${actionCount} operation${actionCount === 1 ? '' : 's'}`
    };
  }

  function travelEstimate(fromStop, toStop, context) {
    if (!fromStop) {
      return {
        minMinutes: 0, maxMinutes: 0, quantumLeg: 0, jumpCount: 0,
        transitionKind: 'start', distanceGm: 0, distanceLabel: 'Session start', source: 'session start'
      };
    }
    if (fromStop.locationId === toStop.locationId) {
      return {
        minMinutes: 0, maxMinutes: 1, quantumLeg: 0, jumpCount: 0,
        transitionKind: 'same-location', distanceGm: 0, distanceLabel: 'Same location', source: 'same operational location'
      };
    }

    const factor = Number(context.quantumTimeFactor ?? 1);
    const navigation = context.navigationEstimates?.estimateLeg(
      fromStop.locationId,
      toStop.locationId,
      { quantumTimeFactor: factor }
    );
    if (navigation) return navigation;

    const fromAnchor = context.starmap?.getLocationAnchor(fromStop.locationId);
    const toAnchor = context.starmap?.getLocationAnchor(toStop.locationId);
    if (fromAnchor && toAnchor) {
      const sameBody = fromAnchor.systemId === toAnchor.systemId && fromAnchor.bodyId === toAnchor.bodyId;
      const sameSystem = fromAnchor.systemId === toAnchor.systemId;
      const units = distance(fromAnchor, toAnchor) ?? 0;
      const base = sameBody ? 2.5 + units * 0.22 : sameSystem ? 5 + units * 0.14 : 16 + units * 0.1;
      const adjusted = base * factor;
      return {
        minMinutes: Math.max(1, Math.round(adjusted * 0.82)),
        maxMinutes: Math.max(2, Math.round(adjusted * 1.24)),
        quantumLeg: sameBody ? 0 : 1,
        jumpCount: sameSystem ? 0 : 1,
        transitionKind: sameBody ? 'local' : sameSystem ? 'quantum' : 'jump',
        distanceGm: units,
        distanceLabel: `~${units.toFixed(1)} schematic units`,
        source: `${units.toFixed(1)} schematic route units · quantum factor ${factor.toFixed(2)}`
      };
    }

    return {
      minMinutes: Math.max(4, Math.round(8 * factor)),
      maxMinutes: Math.max(8, Math.round(15 * factor)),
      quantumLeg: 1,
      jumpCount: 0,
      transitionKind: 'unmapped',
      distanceGm: null,
      distanceLabel: 'Distance unavailable',
      source: 'unmapped-location fallback estimate'
    };
  }

  function quantityFor(operation, context) {
    const source = context.cargoLotsByKey;
    const lot = source instanceof Map ? source.get(cargoKey(operation)) : source?.[cargoKey(operation)];
    return Number(lot?.scu ?? operation.scu ?? 0);
  }

  function initialOnboard(context) {
    return new Map((context.initialOnboardLots ?? []).map((lot) => [
      String(lot.key ?? `${lot.missionId}::${lot.lotId}`),
      { missionId: lot.missionId, scu: Number(lot.scu ?? 0) }
    ]));
  }

  function sumOnboard(onboard) {
    return [...onboard.values()].reduce((total, lot) => total + lot.scu, 0);
  }

  function missionDeliveryState(stops, context) {
    const state = new Map();
    stops.forEach((stop) => stop.operations
      .filter((operation) => operation.type === 'delivery' && operation.lotId)
      .forEach((operation) => {
        const current = state.get(operation.missionId) ?? { remaining: 0, weightScu: 0 };
        current.remaining += 1;
        current.weightScu += quantityFor(operation, context);
        state.set(operation.missionId, current);
      }));
    return state;
  }

  function evaluateOrder(stops, context = {}) {
    const legs = [];
    const onboard = initialOnboard(context);
    const missionState = missionDeliveryState(stops, context);
    const physicalCapacityScu = Math.max(0, Number(context.physicalCapacityScu ?? context.capacityScu ?? Infinity));
    const offGridAllowanceScu = Math.max(0, Number(context.offGridAllowanceScu ?? 0));
    const effectiveCapacityScu = physicalCapacityScu + offGridAllowanceScu;
    let totalMin = 0;
    let totalMax = 0;
    let totalDistanceGm = 0;
    let totalJumpCount = 0;
    let elapsedMidpoint = 0;
    let quantumLegs = 0;
    let peakOnboardScu = sumOnboard(onboard);
    let exposureScuMinutes = 0;
    let missionCompletionScore = 0;

    stops.forEach((stop, index) => {
      const travel = travelEstimate(index ? stops[index - 1] : context.startStop ?? null, stop, context);
      const arrival = arrivalEstimate(stop, context);
      const handling = handlingEstimate(stop);
      const minMinutes = travel.minMinutes + arrival.minMinutes + handling.minMinutes;
      const maxMinutes = travel.maxMinutes + arrival.maxMinutes + handling.maxMinutes;
      const preHandlingMidpoint = (travel.minMinutes + travel.maxMinutes + arrival.minMinutes + arrival.maxMinutes) / 2;
      const handlingMidpoint = (handling.minMinutes + handling.maxMinutes) / 2;
      const onboardBeforeScu = sumOnboard(onboard);

      exposureScuMinutes += onboardBeforeScu * preHandlingMidpoint;
      elapsedMidpoint += preHandlingMidpoint;

      const deliveredMissions = new Set();
      stop.operations.filter((operation) => operation.type === 'delivery' && operation.lotId).forEach((operation) => {
        onboard.delete(cargoKey(operation));
        const mission = missionState.get(operation.missionId);
        if (mission) {
          mission.remaining -= 1;
          deliveredMissions.add(operation.missionId);
        }
      });

      stop.operations.filter((operation) => operation.type !== 'delivery' && operation.lotId).forEach((operation) => {
        onboard.set(cargoKey(operation), { missionId: operation.missionId, scu: quantityFor(operation, context) });
      });

      const onboardAfterScu = sumOnboard(onboard);
      exposureScuMinutes += ((onboardBeforeScu + onboardAfterScu) / 2) * handlingMidpoint;
      elapsedMidpoint += handlingMidpoint;
      deliveredMissions.forEach((missionId) => {
        const mission = missionState.get(missionId);
        if (mission?.remaining === 0) missionCompletionScore += elapsedMidpoint * Math.max(1, mission.weightScu);
      });

      peakOnboardScu = Math.max(peakOnboardScu, onboardAfterScu);
      totalMin += minMinutes;
      totalMax += maxMinutes;
      totalDistanceGm += Number(travel.distanceGm ?? 0);
      totalJumpCount += Number(travel.jumpCount ?? 0);
      quantumLegs += travel.quantumLeg;
      legs.push(Object.freeze({
        stop, travel, arrival, handling, minMinutes, maxMinutes,
        onboardBeforeScu, onboardAfterScu,
        capacityExceededByScu: Math.max(0, onboardAfterScu - effectiveCapacityScu)
      }));
    });

    return Object.freeze({
      stops: Object.freeze(stops),
      legs: Object.freeze(legs),
      totalMin,
      totalMax,
      totalDistanceGm: Math.round(totalDistanceGm * 10) / 10,
      totalJumpCount,
      midpoint: (totalMin + totalMax) / 2,
      quantumLegs,
      stopCount: stops.length,
      peakOnboardScu,
      exposureScuMinutes: Math.round(exposureScuMinutes),
      missionCompletionScore: Math.round(missionCompletionScore),
      physicalCapacityScu,
      offGridAllowanceScu,
      effectiveCapacityScu,
      capacityFeasible: peakOnboardScu <= effectiveCapacityScu
    });
  }

  function signature(result) {
    return result.stops.map((stop) => String(stop.id)).join('|');
  }

  function fastestSort(left, right) {
    return left.midpoint - right.midpoint
      || left.missionCompletionScore - right.missionCompletionScore
      || left.exposureScuMinutes - right.exposureScuMinutes
      || signature(left).localeCompare(signature(right));
  }

  function chooseFastest(evaluated, context) {
    const pureFastest = [...evaluated].sort(fastestSort)[0] ?? null;
    if (!pureFastest || !context.cargoSafetyEnabled) return { result: pureFastest, safetyAdjusted: false };
    const margin = Math.max(0, Number(context.safetyMarginMinutes ?? 15));
    const eligible = evaluated.filter((candidate) => candidate.midpoint <= pureFastest.midpoint + margin);
    const result = [...eligible].sort((left, right) => (
      left.missionCompletionScore - right.missionCompletionScore
      || left.exposureScuMinutes - right.exposureScuMinutes
      || left.midpoint - right.midpoint
      || signature(left).localeCompare(signature(right))
    ))[0] ?? pureFastest;
    return { result, safetyAdjusted: signature(result) !== signature(pureFastest) };
  }

  function chooseMinOnboard(evaluated) {
    return [...evaluated].sort((left, right) => (
      left.peakOnboardScu - right.peakOnboardScu
      || left.exposureScuMinutes - right.exposureScuMinutes
      || left.missionCompletionScore - right.missionCompletionScore
      || left.midpoint - right.midpoint
      || signature(left).localeCompare(signature(right))
    ))[0] ?? null;
  }

  function compare(route, progress, context = {}) {
    if (!route?.stops?.length) {
      return Object.freeze({
        profiles: Object.freeze([]), candidateCount: 0, feasibleCandidateCount: 0,
        capacityRejectedCount: 0, minimumRequiredCapacityScu: 0, lockedStops: Object.freeze([])
      });
    }
    const completed = progress?.completedSet ?? new Set();
    const lockedStops = (route.allStops ?? route.stops).filter((stop) => completed.has(String(stop.id)));
    const futureStops = route.stops.filter((stop) => !completed.has(String(stop.id)));
    const orders = enumerateOrders(route, futureStops);
    const evaluated = orders.map((order) => evaluateOrder(order, context));
    const feasible = evaluated.filter((candidate) => candidate.capacityFeasible);
    const fastest = chooseFastest(feasible, context);
    const minOnboard = chooseMinOnboard(feasible);
    const selected = [
      fastest.result ? { id: 'fastest', result: fastest.result, safetyAdjusted: fastest.safetyAdjusted } : null,
      minOnboard ? { id: 'min-onboard', result: minOnboard, safetyAdjusted: false } : null
    ].filter(Boolean);
    const seen = new Set();
    const profiles = selected.map((profile) => {
      const duplicate = seen.has(signature(profile.result));
      seen.add(signature(profile.result));
      return Object.freeze({ ...profile, duplicate });
    });
    const minimumRequiredCapacityScu = evaluated.length
      ? Math.min(...evaluated.map((candidate) => candidate.peakOnboardScu))
      : 0;

    return Object.freeze({
      profiles: Object.freeze(profiles),
      candidateCount: orders.length,
      feasibleCandidateCount: feasible.length,
      capacityRejectedCount: evaluated.length - feasible.length,
      minimumRequiredCapacityScu,
      lockedStops: Object.freeze(lockedStops)
    });
  }

  const api = Object.freeze({
    PROFILE_IDS, enumerateOrders, travelEstimate, arrivalEstimate, handlingEstimate,
    evaluateOrder, compare, cargoKey
  });
  root.SCCompanionRoutePlannerEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
