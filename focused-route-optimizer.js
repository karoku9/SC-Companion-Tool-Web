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
      locationContext: root.SCCompanionLocationContext,
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
      initialOnboardLots: options.initialOnboardLots ?? []
    };
  }

  function resultSignature(result) {
    return result.stops.map((stop) => String(stop.id)).join('|');
  }

  function fastestSort(left, right) {
    return left.midpoint - right.midpoint
      || left.missionCompletionScore - right.missionCompletionScore
      || left.exposureScuMinutes - right.exposureScuMinutes
      || resultSignature(left).localeCompare(resultSignature(right));
  }

  function cargoKey(operation) {
    return `${operation.missionId}::${operation.lotId}`;
  }

  function quantityFor(operation, context) {
    const lot = context.cargoLotsByKey instanceof Map
      ? context.cargoLotsByKey.get(cargoKey(operation))
      : context.cargoLotsByKey?.[cargoKey(operation)];
    return Math.max(0, Number(lot?.scu ?? operation.scu ?? 0));
  }

  function onboardScu(onboard) {
    return [...onboard.values()].reduce((sum, amount) => sum + Number(amount ?? 0), 0);
  }

  function applyStopCargo(stop, onboard, context) {
    const next = new Map(onboard);
    stop.operations
      .filter((operation) => operation.type === 'delivery' && operation.lotId)
      .forEach((operation) => next.delete(cargoKey(operation)));
    stop.operations
      .filter((operation) => operation.type !== 'delivery' && operation.lotId)
      .forEach((operation) => next.set(cargoKey(operation), quantityFor(operation, context)));
    return next;
  }

  function stopCargoTotals(stop, context) {
    return stop.operations.reduce((totals, operation) => {
      const scu = operation.lotId ? quantityFor(operation, context) : 0;
      if (operation.type === 'delivery') totals.delivery += scu;
      else totals.pickup += scu;
      return totals;
    }, { pickup: 0, delivery: 0 });
  }

  function stopSystemId(stop, context) {
    return context.locations?.getSystemForLocation(stop?.locationId)?.id ?? null;
  }

  function dependencyMap(route) {
    const operationStop = new Map();
    (route.allStops ?? route.stops ?? []).forEach((stop) => {
      stop.operations.forEach((operation) => operationStop.set(String(operation.id), String(stop.id)));
    });
    return new Map((route.stops ?? []).map((stop) => [
      String(stop.id),
      new Set(stop.operations
        .flatMap((operation) => operation.dependsOn ?? [])
        .map((dependencyId) => operationStop.get(String(dependencyId)))
        .filter((dependencyId) => dependencyId && dependencyId !== String(stop.id)))
    ]));
  }

  function systemStickyOrder(route, context) {
    const remaining = new Map(route.stops.map((stop) => [String(stop.id), stop]));
    const dependencies = dependencyMap(route);
    const completed = new Set();
    const order = [];
    const effectiveCapacity = Math.max(0, Number(context.physicalCapacityScu ?? Infinity))
      + Math.max(0, Number(context.offGridAllowanceScu ?? 0));
    let onboard = new Map((context.initialOnboardLots ?? []).map((lot) => [
      String(lot.key ?? `${lot.missionId}::${lot.lotId}`),
      Number(lot.scu ?? 0)
    ]));
    let currentStop = context.startStop ?? null;
    let currentSystem = stopSystemId(currentStop, context);

    while (remaining.size) {
      const available = [...remaining.values()].filter((stop) => [...(dependencies.get(String(stop.id)) ?? [])]
        .every((dependencyId) => completed.has(String(dependencyId))));
      if (!available.length) return null;

      const evaluated = available.map((stop) => {
        const nextOnboard = applyStopCargo(stop, onboard, context);
        const afterScu = onboardScu(nextOnboard);
        const totals = stopCargoTotals(stop, context);
        const systemId = stopSystemId(stop, context);
        const travel = engine.travelEstimate(currentStop, stop, context);
        const completedWithCandidate = new Set([...completed, String(stop.id)]);
        const unlockCount = [...remaining.values()].filter((candidate) => String(candidate.id) !== String(stop.id)
          && stopSystemId(candidate, context) === systemId
          && [...(dependencies.get(String(candidate.id)) ?? [])].every((dependencyId) => completedWithCandidate.has(String(dependencyId)))).length;
        return {
          stop,
          nextOnboard,
          afterScu,
          totals,
          systemId,
          travel,
          unlockCount,
          feasible: afterScu <= effectiveCapacity
        };
      });

      const feasible = evaluated.filter((candidate) => candidate.feasible);
      if (!feasible.length) return null;
      const sameSystem = currentSystem ? feasible.filter((candidate) => candidate.systemId === currentSystem) : [];
      const pool = sameSystem.length ? sameSystem : feasible;
      pool.sort((left, right) => {
        const score = (candidate) => {
          const travelMidpoint = (Number(candidate.travel?.minMinutes ?? 0) + Number(candidate.travel?.maxMinutes ?? 0)) / 2;
          const capacityPressure = Number.isFinite(effectiveCapacity) && effectiveCapacity > 0
            ? candidate.afterScu / effectiveCapacity * 150
            : 0;
          const systemSwitch = currentSystem && candidate.systemId !== currentSystem ? 100000 : 0;
          const jumpPenalty = Number(candidate.travel?.jumpCount ?? 0) * 50000;
          const deliveryReward = candidate.totals.delivery * -22;
          const pickupPenalty = candidate.totals.pickup * 2.5;
          const unlockReward = candidate.unlockCount * -45;
          const originalOrder = Number(candidate.stop.orderIndex ?? candidate.stop.baseIndex ?? 0) * 0.05;
          return systemSwitch + jumpPenalty + capacityPressure + deliveryReward + pickupPenalty + unlockReward + travelMidpoint + originalOrder;
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
      currentSystem = selected.systemId;
    }

    return order;
  }

  function chooseGatewayEfficient(route, context) {
    const enumeratedOrders = engine.enumerateOrders(route, route.stops);
    const candidateOrders = [...enumeratedOrders];
    const stickyOrder = systemStickyOrder(route, context);
    if (stickyOrder) candidateOrders.push(stickyOrder);

    const evaluatedBySignature = new Map();
    candidateOrders.forEach((order) => {
      const result = engine.evaluateOrder(order, context);
      evaluatedBySignature.set(resultSignature(result), result);
    });
    const evaluated = [...evaluatedBySignature.values()];
    const feasible = evaluated.filter((candidate) => candidate.capacityFeasible);
    const minimumRequiredCapacityScu = evaluated.length
      ? Math.min(...evaluated.map((candidate) => candidate.peakOnboardScu))
      : 0;
    if (!feasible.length) {
      return Object.freeze({
        result: null,
        candidateCount: evaluated.length,
        enumeratedCandidateCount: enumeratedOrders.length,
        feasibleCandidateCount: 0,
        capacityRejectedCount: evaluated.length,
        minimumRequiredCapacityScu,
        minimumJumpCount: null,
        safetyAdjusted: false,
        systemStickyCandidateAdded: Boolean(stickyOrder),
        systemStickySelected: false
      });
    }

    const minimumJumpCount = Math.min(...feasible.map((candidate) => candidate.totalJumpCount));
    const gatewayEfficient = feasible.filter((candidate) => candidate.totalJumpCount === minimumJumpCount);
    const pureFastest = [...gatewayEfficient].sort(fastestSort)[0];
    let result = pureFastest;
    if (context.cargoSafetyEnabled) {
      const margin = Math.max(0, Number(context.safetyMarginMinutes ?? 15));
      const eligible = gatewayEfficient.filter((candidate) => candidate.midpoint <= pureFastest.midpoint + margin);
      result = [...eligible].sort((left, right) => (
        left.missionCompletionScore - right.missionCompletionScore
        || left.exposureScuMinutes - right.exposureScuMinutes
        || left.midpoint - right.midpoint
        || resultSignature(left).localeCompare(resultSignature(right))
      ))[0] ?? pureFastest;
    }
    const stickySignature = stickyOrder ? resultSignature(engine.evaluateOrder(stickyOrder, context)) : null;

    return Object.freeze({
      result,
      candidateCount: evaluated.length,
      enumeratedCandidateCount: enumeratedOrders.length,
      feasibleCandidateCount: feasible.length,
      capacityRejectedCount: evaluated.length - feasible.length,
      minimumRequiredCapacityScu,
      minimumJumpCount,
      safetyAdjusted: resultSignature(result) !== resultSignature(pureFastest),
      systemStickyCandidateAdded: Boolean(stickyOrder),
      systemStickySelected: Boolean(stickySignature && resultSignature(result) === stickySignature)
    });
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
        midpointMinutes: estimate.midpoint,
        totalJumpCount: estimate.totalJumpCount
      })
    });
  }

  function buildRoute(missions, missionModel, options = {}) {
    return buildRouteCandidates(missions, missionModel, options)[0];
  }

  function buildRouteCandidates(missions, missionModel, options = {}) {
    const original = originalBuildRoute(missions, missionModel);
    const base = root.SCCompanionRouteOptimization ? consolidate(original) : original;
    const context = comparisonContext(base, options);
    const optimizer = root.SCCompanionRouteOptimization;
    if (optimizer) {
      const comparison = optimizer.optimize(base, context, engine, {
        strategy: options.routeStrategy ?? options.strategy ?? 'balanced',
        weights: options.routeStrategyWeights ?? options.weights
      });
      if (comparison.recommended) {
        return Object.freeze(comparison.candidates.map((candidate) => {
          const phaseSafeStops = mergeAdjacentStops(candidate.result.stops);
          return indexedRoute(base, phaseSafeStops, {
            strategy: comparison.effectiveStrategy,
            requestedStrategy: comparison.requestedStrategy,
            candidateId: candidate.id,
            candidateLabel: candidate.label,
            rationale: candidate.rationale,
            metrics: candidate.metrics,
            weights: comparison.weights.raw,
            availability: comparison.availability,
            candidateCount: comparison.candidateCount,
            originalStopCount: base.stops.length,
            consolidatedStopCount: phaseSafeStops.length,
            physicalCapacityScu: context.physicalCapacityScu,
            peakOnboardScu: candidate.metrics.peakOnboardScu,
            capacityFeasible: true,
            repeatedLocationsAllowed: true
          }, comparisonContext({ ...base, stops: phaseSafeStops, allStops: phaseSafeStops }, options));
        }));
      }
    }

    const comparison = chooseGatewayEfficient(base, context);
    const fastest = comparison.result;

    if (fastest?.capacityFeasible) {
      const phaseSafeStops = mergeAdjacentStops(fastest.stops);
      return Object.freeze([indexedRoute(base, phaseSafeStops, {
        strategy: 'phase-safe-fastest',
        originalStopCount: base.stops.length,
        consolidatedStopCount: phaseSafeStops.length,
        candidateCount: comparison.candidateCount,
        enumeratedCandidateCount: comparison.enumeratedCandidateCount,
        feasibleCandidateCount: comparison.feasibleCandidateCount,
        physicalCapacityScu: context.physicalCapacityScu,
        peakOnboardScu: fastest.peakOnboardScu,
        capacityFeasible: true,
        repeatedLocationsAllowed: true,
        minimumJumpCount: comparison.minimumJumpCount,
        gatewayEfficient: true,
        systemStickyCandidateAdded: comparison.systemStickyCandidateAdded,
        systemStickySelected: comparison.systemStickySelected,
        safetyAdjusted: comparison.safetyAdjusted
      }, comparisonContext({ ...base, stops: phaseSafeStops, allStops: phaseSafeStops }, options))]);
    }

    const fallbackStops = mergeAdjacentStops(base.stops);
    const fallbackRoute = { ...base, stops: fallbackStops, allStops: fallbackStops };
    const fallbackContext = comparisonContext(fallbackRoute, options);
    return Object.freeze([indexedRoute(fallbackRoute, fallbackStops, {
      strategy: 'phase-safe-dependency-fallback',
      originalStopCount: base.stops.length,
      consolidatedStopCount: fallbackStops.length,
      candidateCount: comparison.candidateCount,
      enumeratedCandidateCount: comparison.enumeratedCandidateCount,
      physicalCapacityScu: context.physicalCapacityScu,
      minimumRequiredCapacityScu: comparison.minimumRequiredCapacityScu,
      capacityFeasible: false,
      repeatedLocationsAllowed: true,
      minimumJumpCount: comparison.minimumJumpCount,
      gatewayEfficient: true,
      systemStickyCandidateAdded: comparison.systemStickyCandidateAdded,
      systemStickySelected: false
    }, fallbackContext)]);
  }

  function replanRemaining(route, completedStopIds = [], options = {}) {
    const completed = new Set(completedStopIds.map(String));
    const lockedStops = route.stops.filter((stop) => completed.has(String(stop.id)));
    const futureStops = route.stops.filter((stop) => !completed.has(String(stop.id)));
    if (futureStops.length < 2 || !root.SCCompanionRouteOptimization) {
      return Object.freeze({ route, completedStopIds: Object.freeze([...completedStopIds]), changed: false });
    }
    const futureRoute = { ...route, stops: Object.freeze(futureStops), allStops: Object.freeze(futureStops) };
    const startLocationId = lockedStops.at(-1)?.locationId ?? options.startLocationId ?? route.optimization?.startLocationId;
    const context = comparisonContext(futureRoute, { ...options, startLocationId });
    const comparison = root.SCCompanionRouteOptimization.optimize(futureRoute, context, engine, {
      strategy: options.routeStrategy ?? options.strategy ?? 'balanced',
      weights: options.routeStrategyWeights ?? options.weights
    });
    if (!comparison.recommended) {
      return Object.freeze({ route, completedStopIds: Object.freeze([...completedStopIds]), changed: false });
    }
    const future = comparison.recommended.result.stops;
    const combined = [...lockedStops, ...future];
    const rebuilt = indexedRoute(route, combined, {
      ...route.optimization,
      strategy: comparison.effectiveStrategy,
      requestedStrategy: comparison.requestedStrategy,
      candidateId: 'recommended',
      candidateLabel: 'Recommended',
      rationale: comparison.recommended.rationale,
      metrics: comparison.recommended.metrics,
      weights: comparison.weights.raw,
      availability: comparison.availability,
      replanLockedStopCount: lockedStops.length
    }, comparisonContext({ ...route, stops: combined, allStops: combined }, options));
    const nextCompletedIds = rebuilt.stops.slice(0, lockedStops.length).map((stop) => stop.id);
    const oldFuture = futureStops.map((stop) => stop.locationId).join('|');
    const newFuture = future.map((stop) => stop.locationId).join('|');
    return Object.freeze({
      route: rebuilt,
      completedStopIds: Object.freeze(nextCompletedIds),
      changed: oldFuture !== newFuture,
      previousOrder: Object.freeze(futureStops.map((stop) => stop.locationLabel)),
      nextOrder: Object.freeze(future.map((stop) => stop.locationLabel))
    });
  }

  const api = Object.freeze({
    ...planner,
    buildRoute,
    buildRouteCandidates,
    replanRemaining,
    focusedOptimization: true,
    consolidate,
    mergeAdjacentStops,
    comparisonContext,
    chooseGatewayEfficient,
    systemStickyOrder
  });
  root.SCCompanionRoutePlanner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
