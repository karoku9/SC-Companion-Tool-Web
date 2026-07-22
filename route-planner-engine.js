'use strict';

(function exposeRoutePlannerEngine(root) {
  const PROFILE_IDS = Object.freeze(['fastest', 'fewest-quantum']);

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
    return [...new Set(stop.operations.flatMap((operation) => operation.dependsOn.map((id) => operationStop.get(id))).filter(Boolean))];
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
      const available = [...remaining].filter((id) => [...(dependencies.get(id) ?? [])].every((dependency) => completed.has(dependency)));
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
    const preset = context.arrivalEstimates?.presets?.[kind] ? kind : context.arrivalEstimates?.presets?.['orbital-station'] ? 'orbital-station' : null;
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
    if (!fromStop) return { minMinutes: 0, maxMinutes: 0, quantumLeg: 0, transitionKind: 'start', source: 'session start' };
    if (fromStop.locationId === toStop.locationId) return { minMinutes: 0, maxMinutes: 1, quantumLeg: 0, transitionKind: 'same-location', source: 'same operational location' };

    const fromAnchor = context.starmap?.getLocationAnchor(fromStop.locationId);
    const toAnchor = context.starmap?.getLocationAnchor(toStop.locationId);
    const factor = Number(context.quantumTimeFactor ?? 1);

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
        transitionKind: sameBody ? 'local' : sameSystem ? 'quantum' : 'jump',
        source: `${units.toFixed(1)} schematic route units · quantum factor ${factor.toFixed(2)}`
      };
    }

    return {
      minMinutes: Math.max(4, Math.round(8 * factor)),
      maxMinutes: Math.max(8, Math.round(15 * factor)),
      quantumLeg: 1,
      transitionKind: 'unmapped',
      source: 'unmapped-location fallback estimate'
    };
  }

  function evaluateOrder(stops, context) {
    const legs = [];
    let totalMin = 0;
    let totalMax = 0;
    let quantumLegs = 0;

    stops.forEach((stop, index) => {
      const travel = travelEstimate(index ? stops[index - 1] : context.startStop ?? null, stop, context);
      const arrival = arrivalEstimate(stop, context);
      const handling = handlingEstimate(stop);
      const minMinutes = travel.minMinutes + arrival.minMinutes + handling.minMinutes;
      const maxMinutes = travel.maxMinutes + arrival.maxMinutes + handling.maxMinutes;
      totalMin += minMinutes;
      totalMax += maxMinutes;
      quantumLegs += travel.quantumLeg;
      legs.push(Object.freeze({ stop, travel, arrival, handling, minMinutes, maxMinutes }));
    });

    return Object.freeze({
      stops: Object.freeze(stops),
      legs: Object.freeze(legs),
      totalMin,
      totalMax,
      midpoint: (totalMin + totalMax) / 2,
      quantumLegs,
      stopCount: stops.length
    });
  }

  function signature(result) {
    return result.stops.map((stop) => String(stop.id)).join('|');
  }

  function chooseProfile(profileId, evaluated) {
    const sorted = [...evaluated].sort((left, right) => {
      if (profileId === 'fewest-quantum') {
        return left.quantumLegs - right.quantumLegs || left.midpoint - right.midpoint || signature(left).localeCompare(signature(right));
      }
      return left.midpoint - right.midpoint || left.quantumLegs - right.quantumLegs || signature(left).localeCompare(signature(right));
    });
    return sorted[0] ?? null;
  }

  function compare(route, progress, context = {}) {
    if (!route?.stops?.length) return Object.freeze({ profiles: Object.freeze([]), candidateCount: 0, lockedStops: Object.freeze([]) });
    const completed = progress?.completedSet ?? new Set();
    const lockedStops = (route.allStops ?? route.stops).filter((stop) => completed.has(String(stop.id)));
    const futureStops = route.stops.filter((stop) => !completed.has(String(stop.id)));
    const orders = enumerateOrders(route, futureStops);
    const evaluated = orders.map((order) => evaluateOrder(order, context));
    const seen = new Set();
    const profiles = PROFILE_IDS.map((profileId) => {
      const result = chooseProfile(profileId, evaluated);
      if (!result) return null;
      const duplicate = seen.has(signature(result));
      seen.add(signature(result));
      return Object.freeze({ id: profileId, result, duplicate });
    }).filter(Boolean);
    return Object.freeze({ profiles: Object.freeze(profiles), candidateCount: orders.length, lockedStops: Object.freeze(lockedStops) });
  }

  const api = Object.freeze({ PROFILE_IDS, enumerateOrders, travelEstimate, arrivalEstimate, handlingEstimate, evaluateOrder, compare });
  root.SCCompanionRoutePlannerEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
