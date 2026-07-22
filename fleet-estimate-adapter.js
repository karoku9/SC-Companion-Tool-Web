'use strict';

(function installFleetEstimateAdapter(root) {
  const engine = root.SCCompanionRoutePlannerEngine;
  const loadouts = root.SCCompanionFleetLoadouts;
  const store = root.SCCompanionSession;
  if (!engine || !loadouts || !store || engine.loadoutAware) return;

  function enrichedContext(context = {}) {
    const performance = loadouts.activePerformance(store.getState());
    if (!performance) return context;
    return {
      ...context,
      quantumTimeFactor: performance.quantumTimeFactor,
      handlingTimeFactor: performance.handlingTimeFactor,
      physicalCapacityScu: performance.operationalCargoCapacityScu,
      fuelEfficiencyFactor: performance.fuelEfficiencyFactor,
      activeLoadoutPerformance: performance
    };
  }

  function adjustedHandling(handling, factor) {
    const normalized = Math.max(0.25, Math.min(4, Number(factor) || 1));
    return Object.freeze({
      minMinutes: Math.max(1, Math.ceil(handling.minMinutes * normalized)),
      maxMinutes: Math.max(2, Math.ceil(handling.maxMinutes * normalized)),
      source: `${handling.source} · active loadout handling factor ×${normalized.toFixed(2)}`
    });
  }

  function adjustResult(result, context) {
    const factor = Number(context.handlingTimeFactor ?? 1);
    if (!result?.legs?.length || Math.abs(factor - 1) < 0.0001) return result;
    let totalMin = result.totalMin;
    let totalMax = result.totalMax;
    let exposureScuMinutes = result.exposureScuMinutes;
    const legs = result.legs.map((leg) => {
      const handling = adjustedHandling(leg.handling, factor);
      totalMin += handling.minMinutes - leg.handling.minMinutes;
      totalMax += handling.maxMinutes - leg.handling.maxMinutes;
      const oldMidpoint = (leg.handling.minMinutes + leg.handling.maxMinutes) / 2;
      const newMidpoint = (handling.minMinutes + handling.maxMinutes) / 2;
      exposureScuMinutes += ((leg.onboardBeforeScu + leg.onboardAfterScu) / 2) * (newMidpoint - oldMidpoint);
      return Object.freeze({
        ...leg,
        handling,
        minMinutes: leg.travel.minMinutes + leg.arrival.minMinutes + handling.minMinutes,
        maxMinutes: leg.travel.maxMinutes + leg.arrival.maxMinutes + handling.maxMinutes
      });
    });
    return Object.freeze({
      ...result,
      legs: Object.freeze(legs),
      totalMin,
      totalMax,
      midpoint: (totalMin + totalMax) / 2,
      exposureScuMinutes: Math.max(0, Math.round(exposureScuMinutes)),
      handlingTimeFactor: factor,
      activeLoadoutPerformance: context.activeLoadoutPerformance ?? null
    });
  }

  function evaluateOrder(stops, context = {}) {
    const enriched = enrichedContext(context);
    return adjustResult(engine.evaluateOrder(stops, enriched), enriched);
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

  function chooseFastest(evaluated, context) {
    const pureFastest = [...evaluated].sort(fastestSort)[0] ?? null;
    if (!pureFastest || !context.cargoSafetyEnabled) return { result: pureFastest, safetyAdjusted: false };
    const margin = Math.max(0, Number(context.safetyMarginMinutes ?? 15));
    const eligible = evaluated.filter((candidate) => candidate.midpoint <= pureFastest.midpoint + margin);
    const result = [...eligible].sort((left, right) => (
      left.missionCompletionScore - right.missionCompletionScore
      || left.exposureScuMinutes - right.exposureScuMinutes
      || left.midpoint - right.midpoint
      || resultSignature(left).localeCompare(resultSignature(right))
    ))[0] ?? pureFastest;
    return { result, safetyAdjusted: resultSignature(result) !== resultSignature(pureFastest) };
  }

  function chooseMinOnboard(evaluated) {
    return [...evaluated].sort((left, right) => (
      left.peakOnboardScu - right.peakOnboardScu
      || left.exposureScuMinutes - right.exposureScuMinutes
      || left.missionCompletionScore - right.missionCompletionScore
      || left.midpoint - right.midpoint
      || resultSignature(left).localeCompare(resultSignature(right))
    ))[0] ?? null;
  }

  function compare(route, progress, context = {}) {
    if (!route?.stops?.length) return engine.compare(route, progress, enrichedContext(context));
    const enriched = enrichedContext(context);
    const completed = progress?.completedSet ?? new Set();
    const lockedStops = (route.allStops ?? route.stops).filter((stop) => completed.has(String(stop.id)));
    const futureStops = route.stops.filter((stop) => !completed.has(String(stop.id)));
    const orders = engine.enumerateOrders(route, futureStops);
    const evaluated = orders.map((order) => evaluateOrder(order, enriched));
    const feasible = evaluated.filter((candidate) => candidate.capacityFeasible);
    const fastest = chooseFastest(feasible, enriched);
    const minOnboard = chooseMinOnboard(feasible);
    const selected = [
      fastest.result ? { id: 'fastest', result: fastest.result, safetyAdjusted: fastest.safetyAdjusted } : null,
      minOnboard ? { id: 'min-onboard', result: minOnboard, safetyAdjusted: false } : null
    ].filter(Boolean);
    const seen = new Set();
    const profiles = selected.map((profile) => {
      const duplicate = seen.has(resultSignature(profile.result));
      seen.add(resultSignature(profile.result));
      return Object.freeze({ ...profile, duplicate });
    });
    return Object.freeze({
      profiles: Object.freeze(profiles),
      candidateCount: orders.length,
      feasibleCandidateCount: feasible.length,
      capacityRejectedCount: evaluated.length - feasible.length,
      minimumRequiredCapacityScu: evaluated.length ? Math.min(...evaluated.map((candidate) => candidate.peakOnboardScu)) : 0,
      lockedStops: Object.freeze(lockedStops),
      activeLoadoutPerformance: enriched.activeLoadoutPerformance ?? null
    });
  }

  const api = Object.freeze({
    ...engine,
    loadoutAware: true,
    enrichedContext,
    handlingEstimate(stop, context = {}) {
      const enriched = enrichedContext(context);
      return adjustedHandling(engine.handlingEstimate(stop), enriched.handlingTimeFactor);
    },
    travelEstimate(fromStop, toStop, context = {}) {
      return engine.travelEstimate(fromStop, toStop, enrichedContext(context));
    },
    evaluateOrder,
    compare
  });

  root.SCCompanionRoutePlannerEngine = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
