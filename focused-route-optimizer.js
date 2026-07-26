'use strict';

(function installFocusedRouteOptimizer(root) {
  const planner = root.SCCompanionRoutePlanner;
  const engine = root.SCCompanionRoutePlannerEngine;
  if (!planner || !engine || planner.focusedOptimization) return;

  const originalBuildRoute = planner.buildRoute.bind(planner);

  function consolidate(route) {
    const operations = route.stops.flatMap((stop) => stop.operations);
    const locationForOperation = new Map(operations.map((operation) => [operation.id, operation.locationId]));
    const groups = new Map();

    operations.forEach((operation, order) => {
      const locationId = operation.locationId;
      const group = groups.get(locationId) ?? {
        locationId,
        locationLabel: operation.locationLabel ?? locationId,
        firstOrder: order,
        operations: []
      };
      const dependsOn = (operation.dependsOn ?? []).filter((dependencyId) => locationForOperation.get(dependencyId) !== locationId);
      group.operations.push(Object.freeze({ ...operation, dependsOn: Object.freeze(dependsOn) }));
      groups.set(locationId, group);
    });

    const stops = [...groups.values()]
      .sort((left, right) => left.firstOrder - right.firstOrder)
      .map((group, index) => Object.freeze({
        id: `focused-stop-${index}-${group.locationId}`,
        index,
        baseIndex: index,
        orderIndex: index,
        locationId: group.locationId,
        locationLabel: group.locationLabel,
        operations: Object.freeze(group.operations)
      }));

    return Object.freeze({ ...route, stops: Object.freeze(stops), allStops: Object.freeze(stops) });
  }

  function activeShipContext() {
    const state = root.SCCompanionSession?.getState?.() ?? {};
    const ship = (state.hangarShips ?? []).find((item) => item.id === state.selectedShipId) ?? null;
    const model = root.SCCompanionShipCatalog?.getModel?.(ship?.modelId ?? state.selectedShipModelId) ?? null;
    return {
      state,
      ship,
      physicalCapacityScu: Math.max(0, Number(ship?.cargoCapacityScu ?? model?.capacityScu ?? Infinity)),
      offGridAllowanceScu: Math.max(0, Number(state.routePlannerSettings?.offGridAllowanceScu ?? 0)),
      quantumTimeFactor: Math.max(0.1, Number(ship?.quantumTimeFactor ?? 1))
    };
  }

  function comparisonContext(route) {
    const ship = activeShipContext();
    const cargoLotsByKey = new Map(route.missions.flatMap((mission) => mission.cargoLots.map((lot) => [`${mission.id}::${lot.id}`, lot])));
    return {
      locations: root.SCCompanionLocations,
      locationProfiles: root.SCCompanionLocationProfiles,
      arrivalEstimates: root.SCCompanionArrivalEstimates,
      navigationEstimates: root.SCCompanionNavigationEstimates,
      starmap: root.SCCompanionStarmapData,
      cargoLotsByKey,
      physicalCapacityScu: ship.physicalCapacityScu,
      offGridAllowanceScu: ship.offGridAllowanceScu,
      quantumTimeFactor: ship.quantumTimeFactor,
      cargoSafetyEnabled: ship.state.routePlannerSettings?.cargoSafetyEnabled !== false,
      safetyMarginMinutes: Number(ship.state.routePlannerSettings?.safetyMarginMinutes ?? 15),
      startStop: null,
      initialOnboardLots: []
    };
  }

  function indexedRoute(route, orderedStops, optimization) {
    const stops = orderedStops.map((stop, index) => Object.freeze({
      ...stop,
      id: `stop-${index}-${stop.locationId}`,
      index,
      baseIndex: index,
      orderIndex: index
    }));
    return Object.freeze({
      ...route,
      stops: Object.freeze(stops),
      allStops: Object.freeze(stops),
      optimization: Object.freeze(optimization)
    });
  }

  function buildRoute(missions, missionModel) {
    const base = originalBuildRoute(missions, missionModel);
    const consolidated = consolidate(base);
    const context = comparisonContext(consolidated);
    const comparison = engine.compare(consolidated, { completedSet: new Set() }, context);
    const fastest = comparison.profiles.find((profile) => profile.id === 'fastest' && !profile.duplicate)?.result
      ?? comparison.profiles[0]?.result
      ?? null;

    if (fastest?.capacityFeasible) {
      return indexedRoute(consolidated, fastest.stops, {
        strategy: 'consolidated-fastest',
        originalStopCount: base.stops.length,
        consolidatedStopCount: fastest.stops.length,
        candidateCount: comparison.candidateCount,
        physicalCapacityScu: context.physicalCapacityScu,
        peakOnboardScu: fastest.peakOnboardScu,
        capacityFeasible: true
      });
    }

    return indexedRoute(base, base.stops, {
      strategy: 'dependency-safe-fallback',
      originalStopCount: base.stops.length,
      consolidatedStopCount: consolidated.stops.length,
      candidateCount: comparison.candidateCount,
      physicalCapacityScu: context.physicalCapacityScu,
      minimumRequiredCapacityScu: comparison.minimumRequiredCapacityScu,
      capacityFeasible: false
    });
  }

  const api = Object.freeze({ ...planner, buildRoute, focusedOptimization: true, consolidate });
  root.SCCompanionRoutePlanner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));