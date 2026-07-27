'use strict';

(function installRouteLocalityHotfix(root) {
  const planner = root.SCCompanionRoutePlanner;
  const engine = root.SCCompanionRoutePlannerEngine;
  if (!planner?.focusedOptimization || !engine || planner.localityOptimization) return;

  const originalBuildRoute = planner.buildRoute.bind(planner);

  function cargoKey(operation) {
    return `${operation.missionId}::${operation.lotId}`;
  }

  function quantityFor(operation, context) {
    const key = cargoKey(operation);
    const lot = context.cargoLotsByKey instanceof Map
      ? context.cargoLotsByKey.get(key)
      : context.cargoLotsByKey?.[key];
    return Math.max(0, Number(lot?.scu ?? operation.scu ?? 0));
  }

  function applyCargo(stop, onboard, context) {
    const next = new Map(onboard);
    (stop.operations ?? [])
      .filter((operation) => operation.type === 'delivery' && operation.lotId)
      .forEach((operation) => next.delete(cargoKey(operation)));
    (stop.operations ?? [])
      .filter((operation) => operation.type !== 'delivery' && operation.lotId)
      .forEach((operation) => next.set(cargoKey(operation), quantityFor(operation, context)));
    return next;
  }

  function onboardScu(onboard) {
    return [...onboard.values()].reduce((sum, amount) => sum + Number(amount ?? 0), 0);
  }

  function stopCargoTotals(stop, context) {
    return (stop.operations ?? []).reduce((totals, operation) => {
      const scu = operation.lotId ? quantityFor(operation, context) : 0;
      if (operation.type === 'delivery') totals.delivery += scu;
      else totals.pickup += scu;
      return totals;
    }, { pickup: 0, delivery: 0 });
  }

  function locationAnchor(stop, context) {
    const location = stop?.locationId ? context.locations?.getLocation?.(stop.locationId) : null;
    return location?.anchor ?? context.starmap?.getLocationAnchor?.(stop?.locationId) ?? null;
  }

  function systemId(stop, context) {
    return context.locations?.getSystemForLocation?.(stop?.locationId)?.id
      ?? locationAnchor(stop, context)?.systemId
      ?? null;
  }

  function clusterId(stop, context) {
    const anchor = locationAnchor(stop, context);
    const system = systemId(stop, context);
    if (!system) return null;
    return anchor?.bodyId ? `${system}:${anchor.bodyId}` : system;
  }

  function localityMetrics(stops, context) {
    const sequence = [context.startStop, ...(stops ?? [])]
      .map((stop) => clusterId(stop, context))
      .filter(Boolean);
    const seen = new Set();
    let previous = null;
    let switches = 0;
    let revisits = 0;
    sequence.forEach((cluster) => {
      if (cluster !== previous) {
        if (previous !== null) switches += 1;
        if (seen.has(cluster)) revisits += 1;
        seen.add(cluster);
        previous = cluster;
      }
    });
    return Object.freeze({ switches, revisits });
  }

  function dependencyMap(route) {
    const operationStop = new Map();
    (route.allStops ?? route.stops ?? []).forEach((stop) => {
      (stop.operations ?? []).forEach((operation) => operationStop.set(String(operation.id), String(stop.id)));
    });
    return new Map((route.stops ?? []).map((stop) => [
      String(stop.id),
      new Set((stop.operations ?? [])
        .flatMap((operation) => operation.dependsOn ?? [])
        .map((dependencyId) => operationStop.get(String(dependencyId)))
        .filter((dependencyId) => dependencyId && dependencyId !== String(stop.id)))
    ]));
  }

  function localityStickyOrder(route, context) {
    const remaining = new Map((route.stops ?? []).map((stop) => [String(stop.id), stop]));
    const dependencies = dependencyMap(route);
    const completed = new Set();
    const order = [];
    const capacity = Math.max(0, Number(context.physicalCapacityScu ?? Infinity))
      + Math.max(0, Number(context.offGridAllowanceScu ?? 0));
    let onboard = new Map((context.initialOnboardLots ?? []).map((lot) => [
      String(lot.key ?? `${lot.missionId}::${lot.lotId}`),
      Number(lot.scu ?? 0)
    ]));
    let currentStop = context.startStop ?? null;

    while (remaining.size) {
      const available = [...remaining.values()].filter((stop) => [...(dependencies.get(String(stop.id)) ?? [])]
        .every((dependencyId) => completed.has(String(dependencyId))));
      if (!available.length) return null;

      const evaluated = available.map((stop) => {
        const nextOnboard = applyCargo(stop, onboard, context);
        const afterScu = onboardScu(nextOnboard);
        const travel = engine.travelEstimate(currentStop, stop, context);
        return {
          stop,
          nextOnboard,
          afterScu,
          totals: stopCargoTotals(stop, context),
          cluster: clusterId(stop, context),
          system: systemId(stop, context),
          travel,
          feasible: afterScu <= capacity
        };
      }).filter((candidate) => candidate.feasible);
      if (!evaluated.length) return null;

      const currentCluster = clusterId(currentStop, context);
      const currentSystem = systemId(currentStop, context);
      const sameCluster = currentCluster ? evaluated.filter((candidate) => candidate.cluster === currentCluster) : [];
      const sameSystem = currentSystem ? evaluated.filter((candidate) => candidate.system === currentSystem) : [];
      const pool = sameCluster.length ? sameCluster : sameSystem.length ? sameSystem : evaluated;

      pool.sort((left, right) => {
        const score = (candidate) => {
          const midpoint = (Number(candidate.travel?.minMinutes ?? 0) + Number(candidate.travel?.maxMinutes ?? 0)) / 2;
          const pressure = Number.isFinite(capacity) && capacity > 0 ? candidate.afterScu / capacity * 120 : 0;
          const deliveryReward = candidate.totals.delivery * -18;
          const pickupPenalty = candidate.totals.pickup * 2;
          const originalOrder = Number(candidate.stop.orderIndex ?? candidate.stop.baseIndex ?? 0) * 0.05;
          return midpoint + pressure + deliveryReward + pickupPenalty + originalOrder;
        };
        return score(left) - score(right)
          || Number(left.stop.orderIndex ?? left.stop.baseIndex ?? 0) - Number(right.stop.orderIndex ?? right.stop.baseIndex ?? 0)
          || String(left.stop.id).localeCompare(String(right.stop.id));
      });

      const selected = pool[0];
      order.push(selected.stop);
      remaining.delete(String(selected.stop.id));
      completed.add(String(selected.stop.id));
      onboard = selected.nextOnboard;
      currentStop = selected.stop;
    }

    return order;
  }

  function signature(stops) {
    return (stops ?? []).map((stop) => String(stop.id)).join('|');
  }

  function fastestSort(left, right) {
    return left.midpoint - right.midpoint
      || left.missionCompletionScore - right.missionCompletionScore
      || left.exposureScuMinutes - right.exposureScuMinutes
      || signature(left.stops).localeCompare(signature(right.stops));
  }

  function gatewaySegments(estimate) {
    const systems = new Map((root.SCCompanionStarmapData?.systems ?? []).map((system) => [system.id, system]));
    const segments = [];
    (estimate.legs ?? []).forEach((leg, legIndex) => {
      const path = leg.travel?.pathSystems ?? [];
      for (let index = 1; index < path.length; index += 1) {
        const fromSystemId = path[index - 1];
        const toSystemId = path[index];
        const fromName = systems.get(fromSystemId)?.name ?? fromSystemId;
        const toName = systems.get(toSystemId)?.name ?? toSystemId;
        segments.push(Object.freeze({
          legIndex,
          stopId: String(leg.stop.id),
          connectionId: leg.travel.pathConnections?.[index - 1] ?? `${fromSystemId}-${toSystemId}`,
          fromSystemId,
          toSystemId,
          fromGateway: `${toName} Gateway`,
          toGateway: `${fromName} Gateway`,
          label: `${toName} Gateway → ${fromName} Gateway`
        }));
      }
    });
    return Object.freeze(segments);
  }

  function reindex(stops) {
    return Object.freeze((stops ?? []).map((stop, index) => Object.freeze({
      ...stop,
      id: `stop-${index}-${stop.locationId}`,
      index,
      baseIndex: index,
      orderIndex: index
    })));
  }

  function improveLocality(route, options = {}) {
    if (!route?.stops?.length || route.stops.length < 3) return route;
    const context = planner.comparisonContext(route, options);
    const enumerated = engine.enumerateOrders(route, route.stops);
    const sticky = localityStickyOrder(route, context);
    const orders = sticky ? [...enumerated, sticky] : enumerated;
    const bySignature = new Map();
    orders.forEach((order) => {
      const result = engine.evaluateOrder(order, context);
      if (result.capacityFeasible) bySignature.set(signature(result.stops), result);
    });
    const feasible = [...bySignature.values()];
    if (!feasible.length) return route;

    const minimumJumps = Math.min(...feasible.map((candidate) => Number(candidate.totalJumpCount ?? 0)));
    const jumpEfficient = feasible.filter((candidate) => Number(candidate.totalJumpCount ?? 0) === minimumJumps);
    const measured = jumpEfficient.map((candidate) => ({
      candidate,
      locality: localityMetrics(candidate.stops, context)
    }));
    const minimumRevisits = Math.min(...measured.map((item) => item.locality.revisits));
    const noBacktracking = measured.filter((item) => item.locality.revisits === minimumRevisits);
    const minimumSwitches = Math.min(...noBacktracking.map((item) => item.locality.switches));
    const localityEfficient = noBacktracking
      .filter((item) => item.locality.switches === minimumSwitches)
      .map((item) => item.candidate);
    const selected = [...localityEfficient].sort(fastestSort)[0];
    if (!selected) return route;

    const currentMetrics = localityMetrics(route.stops, context);
    const selectedMetrics = localityMetrics(selected.stops, context);
    if (signature(selected.stops) === signature(route.stops)) {
      return Object.freeze({
        ...route,
        optimization: Object.freeze({
          ...(route.optimization ?? {}),
          localityRevisitCount: selectedMetrics.revisits,
          localitySwitchCount: selectedMetrics.switches,
          localityAdjusted: false
        })
      });
    }

    const stops = reindex(selected.stops);
    const finalContext = planner.comparisonContext({ ...route, stops, allStops: stops }, options);
    const estimate = engine.evaluateOrder(stops, finalContext);
    return Object.freeze({
      ...route,
      stops,
      allStops: stops,
      estimate,
      gatewaySegments: gatewaySegments(estimate),
      optimization: Object.freeze({
        ...(route.optimization ?? {}),
        strategy: 'phase-safe-locality-fastest',
        totalMinMinutes: estimate.totalMin,
        totalMaxMinutes: estimate.totalMax,
        midpointMinutes: estimate.midpoint,
        totalJumpCount: estimate.totalJumpCount,
        localityAdjusted: true,
        localityRevisitCountBefore: currentMetrics.revisits,
        localityRevisitCount: selectedMetrics.revisits,
        localitySwitchCountBefore: currentMetrics.switches,
        localitySwitchCount: selectedMetrics.switches,
        localityStickyCandidateAdded: Boolean(sticky)
      })
    });
  }

  function buildRoute(missions, missionModel, options = {}) {
    return improveLocality(originalBuildRoute(missions, missionModel, options), options);
  }

  const api = Object.freeze({
    ...planner,
    buildRoute,
    improveLocality,
    localityMetrics,
    localityStickyOrder,
    localityOptimization: true
  });
  root.SCCompanionRoutePlanner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
