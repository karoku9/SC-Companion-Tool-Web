'use strict';

(function installRouteLocalityOptimizer(root) {
  const planner = root.SCCompanionRoutePlanner;
  const engine = root.SCCompanionRoutePlannerEngine;
  if (!planner || !engine || planner.localityOptimization) return;

  const originalBuildRoute = planner.buildRoute.bind(planner);

  function anchorFor(stop, context) {
    return context.starmap?.getLocationAnchor?.(stop?.locationId) ?? null;
  }

  function systemFor(stop, context) {
    return context.locations?.getSystemForLocation?.(stop?.locationId)?.id
      ?? anchorFor(stop, context)?.systemId
      ?? null;
  }

  function bodyFor(stop, context) {
    const anchor = anchorFor(stop, context);
    return anchor?.bodyId ? `${anchor.systemId ?? systemFor(stop, context)}::${anchor.bodyId}` : null;
  }

  function dependencyMap(route) {
    const operationStop = new Map();
    (route.stops ?? []).forEach((stop) => stop.operations.forEach((operation) => operationStop.set(String(operation.id), String(stop.id))));
    return new Map((route.stops ?? []).map((stop) => [
      String(stop.id),
      new Set(stop.operations
        .flatMap((operation) => operation.dependsOn ?? [])
        .map((operationId) => operationStop.get(String(operationId)))
        .filter((stopId) => stopId && stopId !== String(stop.id)))
    ]));
  }

  function localityOrder(route, context) {
    const dependencies = dependencyMap(route);
    const remaining = new Map(route.stops.map((stop) => [String(stop.id), stop]));
    const completed = new Set();
    const ordered = [];
    let current = context.startStop ?? null;

    while (remaining.size) {
      const available = [...remaining.values()].filter((stop) => [...(dependencies.get(String(stop.id)) ?? [])]
        .every((dependencyId) => completed.has(String(dependencyId))));
      if (!available.length) return null;

      const currentBody = bodyFor(current, context);
      const currentSystem = systemFor(current, context);
      const sameBody = currentBody ? available.filter((stop) => bodyFor(stop, context) === currentBody) : [];
      const sameSystem = currentSystem ? available.filter((stop) => systemFor(stop, context) === currentSystem) : [];
      const pool = sameBody.length ? sameBody : sameSystem.length ? sameSystem : available;

      pool.sort((left, right) => {
        const leftTravel = engine.travelEstimate(current, left, context);
        const rightTravel = engine.travelEstimate(current, right, context);
        const midpoint = (travel) => (Number(travel?.minMinutes ?? 0) + Number(travel?.maxMinutes ?? 0)) / 2;
        const leftDeliver = left.operations.reduce((sum, operation) => sum + (operation.type === 'delivery' ? Number(operation.scu ?? 0) : 0), 0);
        const rightDeliver = right.operations.reduce((sum, operation) => sum + (operation.type === 'delivery' ? Number(operation.scu ?? 0) : 0), 0);
        return midpoint(leftTravel) - midpoint(rightTravel)
          || rightDeliver - leftDeliver
          || Number(left.orderIndex ?? left.baseIndex ?? 0) - Number(right.orderIndex ?? right.baseIndex ?? 0)
          || String(left.id).localeCompare(String(right.id));
      });

      const selected = pool[0];
      ordered.push(selected);
      remaining.delete(String(selected.id));
      completed.add(String(selected.id));
      current = selected;
    }

    return ordered;
  }

  function bodyRevisitCount(stops, context) {
    const completedBodies = new Set();
    let previous = bodyFor(context.startStop, context);
    if (previous) completedBodies.add(previous);
    let revisits = 0;
    stops.forEach((stop) => {
      const body = bodyFor(stop, context);
      if (body && body !== previous && completedBodies.has(body)) revisits += 1;
      if (body) completedBodies.add(body);
      previous = body;
    });
    return revisits;
  }

  function gatewaySegments(estimate) {
    const systems = new Map((root.SCCompanionStarmapData?.systems ?? []).map((system) => [system.id, system]));
    const segments = [];
    estimate.legs.forEach((leg, legIndex) => {
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

  function reindex(route, orderedStops, context) {
    const stops = orderedStops.map((stop, index) => Object.freeze({
      ...stop,
      id: `stop-${index}-${stop.locationId}`,
      index,
      baseIndex: index,
      orderIndex: index
    }));
    const estimate = engine.evaluateOrder(stops, context);
    return Object.freeze({
      ...route,
      stops: Object.freeze(stops),
      allStops: Object.freeze(stops),
      estimate,
      gatewaySegments: gatewaySegments(estimate),
      optimization: Object.freeze({
        ...route.optimization,
        strategy: 'body-locality-fastest',
        localityOptimized: true,
        bodyRevisitCount: bodyRevisitCount(stops, context),
        totalMinMinutes: estimate.totalMin,
        totalMaxMinutes: estimate.totalMax,
        midpointMinutes: estimate.midpoint,
        totalJumpCount: estimate.totalJumpCount,
        peakOnboardScu: estimate.peakOnboardScu,
        capacityFeasible: estimate.capacityFeasible
      })
    });
  }

  function buildRoute(missions, missionModel, options = {}) {
    const route = originalBuildRoute(missions, missionModel, options);
    const context = planner.comparisonContext?.(route, options);
    if (!context || route.stops.length < 3) return route;

    const ordered = localityOrder(route, context);
    if (!ordered) return route;
    const originalEvaluation = engine.evaluateOrder(route.stops, context);
    const candidateEvaluation = engine.evaluateOrder(ordered, context);
    if (!candidateEvaluation.capacityFeasible) return route;

    const originalRevisits = bodyRevisitCount(route.stops, context);
    const candidateRevisits = bodyRevisitCount(ordered, context);
    const extraMinutes = candidateEvaluation.midpoint - originalEvaluation.midpoint;
    const worthwhile = candidateRevisits < originalRevisits && extraMinutes <= 20;
    if (!worthwhile) return route;

    return reindex(route, ordered, context);
  }

  const api = Object.freeze({
    ...planner,
    buildRoute,
    localityOptimization: true,
    localityOrder,
    bodyRevisitCount
  });

  root.SCCompanionRoutePlanner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
