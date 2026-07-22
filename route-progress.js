'use strict';

(function exposeRouteProgress(root) {
  function stopIds(route) { return route?.stops?.map((stop) => String(stop.id)) ?? []; }

  function normalizeCompleted(route, completedStopIds = null, legacyIndex = 0) {
    const valid = stopIds(route);
    const validSet = new Set(valid);
    if (Array.isArray(completedStopIds)) {
      return Object.freeze([...new Set(completedStopIds.map(String).filter((id) => validSet.has(id)))]);
    }
    const count = Math.min(Math.max(Math.trunc(Number(legacyIndex) || 0), 0), valid.length);
    return Object.freeze(valid.slice(0, count));
  }

  function derive(route, completedStopIds = null, legacyIndex = 0) {
    const completed = normalizeCompleted(route, completedStopIds, legacyIndex);
    const completedSet = new Set(completed);
    const currentStop = route?.stops?.find((stop) => !completedSet.has(String(stop.id))) ?? null;
    const currentStopIndex = currentStop ? route.stops.findIndex((stop) => String(stop.id) === String(currentStop.id)) : (route?.stops?.length ?? 0);
    return Object.freeze({
      completedStopIds: completed,
      completedSet,
      currentStop,
      currentStopIndex,
      complete: Boolean(route?.stops?.length) && !currentStop,
      completedCount: completed.length,
      totalStops: route?.stops?.length ?? 0
    });
  }

  function completeCurrent(route, completedStopIds = null, legacyIndex = 0) {
    const progress = derive(route, completedStopIds, legacyIndex);
    if (!progress.currentStop) return progress.completedStopIds;
    return Object.freeze([...progress.completedStopIds, String(progress.currentStop.id)]);
  }

  function previous(route, completedStopIds = null, legacyIndex = 0) {
    const completed = [...normalizeCompleted(route, completedStopIds, legacyIndex)];
    completed.pop();
    return Object.freeze(completed);
  }

  const api = Object.freeze({ stopIds, normalizeCompleted, derive, completeCurrent, previous });
  root.SCCompanionRouteProgress = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));