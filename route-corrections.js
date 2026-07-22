'use strict';

(function exposeRouteCorrections(root) {
  function stopId(stop, index) {
    if (stop?.id) return String(stop.id);
    const location = String(stop?.locationId ?? 'unknown').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
    return `stop-${index}-${location}`;
  }

  function normalizeRoute(route) {
    if (!route?.stops?.length) return route;
    const stops = route.stops.map((stop, index) => Object.freeze({ ...stop, id: stopId(stop, index), baseIndex: stop.baseIndex ?? index }));
    return Object.freeze({ ...route, stops: Object.freeze(stops) });
  }

  function normalizeCorrections(route, corrections = null) {
    const normalizedRoute = normalizeRoute(route);
    const validIds = normalizedRoute?.stops?.map((stop) => stop.id) ?? [];
    const validSet = new Set(validIds);
    const suppliedOrder = Array.isArray(corrections?.order) ? corrections.order.map(String) : [];
    const order = [...new Set(suppliedOrder.filter((id) => validSet.has(id)))];
    validIds.forEach((id) => { if (!order.includes(id)) order.push(id); });
    const skipped = [...new Set((corrections?.skipped ?? []).map(String).filter((id) => validSet.has(id)))];
    const mandatory = [...new Set((corrections?.mandatory ?? []).map(String).filter((id) => validSet.has(id)))];
    return Object.freeze({ order: Object.freeze(order), skipped: Object.freeze(skipped), mandatory: Object.freeze(mandatory) });
  }

  function orderedStops(route, corrections = null) {
    const normalizedRoute = normalizeRoute(route);
    const normalized = normalizeCorrections(normalizedRoute, corrections);
    const byId = new Map(normalizedRoute.stops.map((stop) => [stop.id, stop]));
    const skipped = new Set(normalized.skipped);
    const mandatory = new Set(normalized.mandatory);
    return normalized.order.map((id, orderIndex) => Object.freeze({
      ...byId.get(id),
      orderIndex,
      skipped: skipped.has(id),
      mandatory: mandatory.has(id)
    }));
  }

  function dependencyIssues(route, corrections = null) {
    const allStops = orderedStops(route, corrections);
    const activeStops = allStops.filter((stop) => !stop.skipped);
    const activeIds = new Set(activeStops.map((stop) => stop.id));
    const activeIndex = new Map(activeStops.map((stop, index) => [stop.id, index]));
    const operationStop = new Map();
    allStops.forEach((stop) => stop.operations.forEach((operation) => operationStop.set(operation.id, stop.id)));
    const issues = [];

    activeStops.forEach((stop) => {
      stop.operations.forEach((operation) => {
        operation.dependsOn.forEach((dependencyId) => {
          const dependencyStopId = operationStop.get(dependencyId);
          if (!dependencyStopId) {
            issues.push(`Missing dependency ${dependencyId} for ${operation.id}`);
            return;
          }
          if (!activeIds.has(dependencyStopId)) {
            issues.push(`${stop.locationLabel} depends on skipped stop ${allStops.find((item) => item.id === dependencyStopId)?.locationLabel ?? dependencyStopId}`);
            return;
          }
          if (activeIndex.get(dependencyStopId) > activeIndex.get(stop.id)) {
            issues.push(`${stop.locationLabel} must remain after ${allStops.find((item) => item.id === dependencyStopId)?.locationLabel ?? dependencyStopId}`);
          }
        });
      });
    });
    return Object.freeze(issues);
  }

  function assertValid(route, corrections) {
    const issues = dependencyIssues(route, corrections);
    if (issues.length) throw new Error(issues[0]);
    return normalizeCorrections(route, corrections);
  }

  function deriveRoute(route, corrections = null) {
    if (!route?.stops?.length) return route;
    const allStops = orderedStops(route, corrections);
    const stops = allStops.filter((stop) => !stop.skipped);
    return Object.freeze({
      ...route,
      stops: Object.freeze(stops),
      allStops: Object.freeze(allStops),
      correctionIssues: dependencyIssues(route, corrections),
      correctionCount: allStops.filter((stop) => stop.skipped || stop.mandatory || stop.orderIndex !== stop.baseIndex).length
    });
  }

  function changeOrder(route, corrections, stopIdValue, delta, completedStopIds = []) {
    const normalized = normalizeCorrections(route, corrections);
    const completed = new Set(completedStopIds.map(String));
    if (completed.has(stopIdValue)) throw new Error('Completed stops cannot be moved. Use PREVIOUS first.');
    const order = [...normalized.order];
    const index = order.indexOf(stopIdValue);
    const target = index + Math.sign(delta);
    if (index < 0 || target < 0 || target >= order.length) return normalized;
    if (completed.has(order[target])) throw new Error('A future stop cannot move before a completed stop.');
    [order[index], order[target]] = [order[target], order[index]];
    return assertValid(route, { ...normalized, order });
  }

  function setSkipped(route, corrections, stopIdValue, shouldSkip, completedStopIds = []) {
    const normalized = normalizeCorrections(route, corrections);
    const completed = new Set(completedStopIds.map(String));
    if (completed.has(stopIdValue)) throw new Error('Completed stops cannot be skipped. Use PREVIOUS first.');
    if (shouldSkip && normalized.mandatory.includes(stopIdValue)) throw new Error('Mandatory stops cannot be skipped.');
    const skipped = new Set(normalized.skipped);
    if (shouldSkip) skipped.add(stopIdValue); else skipped.delete(stopIdValue);
    return assertValid(route, { ...normalized, skipped: [...skipped] });
  }

  function setMandatory(route, corrections, stopIdValue, shouldBeMandatory) {
    const normalized = normalizeCorrections(route, corrections);
    const mandatory = new Set(normalized.mandatory);
    const skipped = new Set(normalized.skipped);
    if (shouldBeMandatory) {
      mandatory.add(stopIdValue);
      skipped.delete(stopIdValue);
    } else mandatory.delete(stopIdValue);
    return assertValid(route, { ...normalized, mandatory: [...mandatory], skipped: [...skipped] });
  }

  function reset(route) { return normalizeCorrections(route, null); }

  const api = Object.freeze({
    stopId, normalizeRoute, normalizeCorrections, orderedStops, dependencyIssues,
    assertValid, deriveRoute, changeOrder, setSkipped, setMandatory, reset
  });
  root.SCCompanionRouteCorrections = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));