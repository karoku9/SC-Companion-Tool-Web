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

  function mergeAdjacentStops(stops) {
    const groups = [];
    (stops ?? []).forEach((stop) => {
      const previous = groups.at(-1);
      if (previous && previous.locationId === stop.locationId) {
        previous.operations.push(...stop.operations);
        return;
      }
      groups.push({
        locationId: stop.locationId,
        locationLabel: stop.locationLabel,
        operations: [...stop.operations]
      });
    });

    return Object.freeze(groups.map((group, index) => {
      const internalOperationIds = new Set(group.operations.map((operation) => String(operation.id)));
      const operations = group.operations.map((operation) => Object.freeze({
        ...operation,
        dependsOn: Object.freeze((operation.dependsOn ?? []).filter((dependencyId) => !internalOperationIds.has(String(dependencyId))))
      }));
      return Object.freeze({
        id: `phase-stop-${index}-${group.locationId}`,
        index,
        baseIndex: index,
        orderIndex: index,
        locationId: group.locationId,
        locationLabel: group.locationLabel,
        operations: Object.freeze(operations)
      });
    }));
  }

  function activeShipContext(options = {}) {
    const state = root.SCCompanionSession?.getState?.() ?? {};
    const selectedShipId = options.selectedShipId ?? state.selectedShipId;
    const ship = (state.hangarShips ?? []).find((item) => item.id === selectedShipId) ?? null;
    const model = root.SCCompanionShipCatalog?.getModel?.(ship?.modelId ?? state.selectedShipModelId) ?? null;
    return {
      state,
      ship,
      physicalCapacityScu: Math.max(0, Number(ship?.cargoCapacityScu ?? model?.capacityScu ?? Infinity)),
      offGridAllowanceScu: Math.max(0, Number(state.routePlannerSettings?.offGridAllowanceScu ?? 0)),
      quantumTimeFactor: Math.max(0.1, Number(ship?.quantumTimeFactor ?? 1))
    };
  }

  function comparisonContext(route, options = {}) {
    const ship = activeShipContext(options);
    const locations = root.SCCompanionLocations;
    const startLocationId = String(options.startLocationId ?? ship.state.routeStartLocationId ?? '').trim() || null;
    const startLocation = startLocationId ? locations?.getLocation?.(startLocationId) : null;
    const cargoLotsByKey = new Map(route.missions.flatMap((mission) => mission.cargoLots.map((lot) => [`${mission.id}::${lot.id}`, lot])));
    return {
      locations,
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
      startStop: startLocation ? Object.freeze({
        id: `route-start-${startLocation.id}`,
        locationId: startLocation.id,
        locationLabel: locations.formatOperationalLabel(startLocation),
        operations: Object.freeze([])
      }) : null,
      initialOnboardLots: []
    };
  }

  function gatewaySegments(estimate) {
    const systems = new Map((root.SCCompanionStarmapData?.systems ?? []).map((system) => [system.id, system]));
    const segments = [];
    estimate.legs.forEach((leg, legIndex) => {
      const path = leg.travel?.pathSystems ?? [];
      if (path.length < 2) return;
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

  function indexedRoute(route, orderedStops, optimization, context) {
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
        ...optimization,
        startLocationId: context.startStop?.locationId ?? null,
        startLocationLabel: context.startStop?.locationLabel ?? null,
        totalMinMinutes: estimate.totalMin,
        totalMaxMinutes: estimate.totalMax,
        midpointMinutes: estimate.midpoint
      })
    });
  }

  function buildRoute(missions, missionModel, options = {}) {
    const base = originalBuildRoute(missions, missionModel);
    const context = comparisonContext(base, options);
    const comparison = engine.compare(base, { completedSet: new Set() }, context);
    const fastest = comparison.profiles.find((profile) => profile.id === 'fastest' && !profile.duplicate)?.result
      ?? comparison.profiles[0]?.result
      ?? null;

    if (fastest?.capacityFeasible) {
      const phaseSafeStops = mergeAdjacentStops(fastest.stops);
      return indexedRoute(base, phaseSafeStops, {
        strategy: 'phase-safe-fastest',
        originalStopCount: base.stops.length,
        consolidatedStopCount: phaseSafeStops.length,
        candidateCount: comparison.candidateCount,
        physicalCapacityScu: context.physicalCapacityScu,
        peakOnboardScu: fastest.peakOnboardScu,
        capacityFeasible: true,
        repeatedLocationsAllowed: true
      }, comparisonContext({ ...base, stops: phaseSafeStops, allStops: phaseSafeStops }, options));
    }

    const fallbackStops = mergeAdjacentStops(base.stops);
    const fallbackRoute = { ...base, stops: fallbackStops, allStops: fallbackStops };
    const fallbackContext = comparisonContext(fallbackRoute, options);
    return indexedRoute(fallbackRoute, fallbackStops, {
      strategy: 'phase-safe-dependency-fallback',
      originalStopCount: base.stops.length,
      consolidatedStopCount: fallbackStops.length,
      candidateCount: comparison.candidateCount,
      physicalCapacityScu: context.physicalCapacityScu,
      minimumRequiredCapacityScu: comparison.minimumRequiredCapacityScu,
      capacityFeasible: false,
      repeatedLocationsAllowed: true
    }, fallbackContext);
  }

  const api = Object.freeze({ ...planner, buildRoute, focusedOptimization: true, consolidate, mergeAdjacentStops, comparisonContext });
  root.SCCompanionRoutePlanner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
