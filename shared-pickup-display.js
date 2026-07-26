'use strict';

(function clarifySharedPickups(root) {
  if (typeof document === 'undefined') return;

  function activeContext() {
    const store = root.SCCompanionSession;
    const corrections = root.SCCompanionRouteCorrections;
    const progressModel = root.SCCompanionRouteProgress;
    const state = store?.getState?.();
    if (!state?.route || !corrections || !progressModel) return null;
    const route = corrections.deriveRoute(state.route, state.routeCorrections);
    const progress = progressModel.derive(route, state.completedStopIds, state.currentStopIndex);
    return { state, route, progress };
  }

  function sharedLabel(operation) {
    const count = Number(operation.pickupLocationCount ?? operation.pickupLocations?.length ?? 1);
    const sequence = Number(operation.pickupSequence ?? 1);
    return {
      primary: `${operation.scu} SCU TOTAL ${operation.commodity}`,
      detail: `Shared pickup ${sequence}/${count} · split across ${operation.originLocationLabel}`
    };
  }

  function updateCurrentStop() {
    const context = activeContext();
    const stop = context?.progress?.currentStop;
    if (!stop) return;
    const rows = [...document.querySelectorAll('#current-stop-operations .operation-row')];
    stop.operations.forEach((operation, index) => {
      if (!operation.sharedPickupTotal || operation.type === 'delivery') return;
      const row = rows[index];
      if (!row) return;
      const label = sharedLabel(operation);
      const primary = row.querySelector('.operation-primary strong');
      const detail = row.querySelector('.operation-context');
      if (primary) primary.textContent = label.primary;
      if (detail) detail.textContent = label.detail;
      row.dataset.sharedPickup = 'true';
    });
  }

  function updateRouteIndex() {
    const context = activeContext();
    const stops = context?.route?.allStops ?? context?.route?.stops ?? [];
    const rows = [...document.querySelectorAll('#route-stop-list > li')];
    stops.forEach((stop, index) => {
      const shared = stop.operations.filter((operation) => operation.sharedPickupTotal && operation.type !== 'delivery');
      if (!shared.length) return;
      const row = rows[index];
      const summary = row?.querySelector('div > small');
      if (!summary) return;
      const totals = [...new Map(shared.map((operation) => [operation.lotId, operation])).values()];
      summary.textContent = totals.map((operation) => {
        const count = Number(operation.pickupLocationCount ?? operation.pickupLocations?.length ?? 1);
        const sequence = Number(operation.pickupSequence ?? 1);
        return `Shared pickup ${sequence}/${count} · ${operation.scu} SCU ${operation.commodity} total`;
      }).join(' · ');
    });
  }

  function updateMoveQueue() {
    const context = activeContext();
    const stop = context?.progress?.currentStop;
    if (!stop) return;
    const operations = stop.operations.filter((operation) => operation.lotId);
    const rows = [...document.querySelectorAll('#load-move-queue .move-row, #ops-tool-body .move-item')];
    operations.forEach((operation, index) => {
      if (!operation.sharedPickupTotal || operation.type === 'delivery') return;
      const row = rows[index];
      if (!row) return;
      const label = sharedLabel(operation);
      const primary = row.querySelector('b, strong');
      const detail = row.querySelector('span:not(.move-action-icon)');
      if (primary) primary.textContent = label.primary;
      if (detail) detail.textContent = label.detail;
      row.dataset.sharedPickup = 'true';
    });
  }

  function update() {
    updateCurrentStop();
    updateRouteIndex();
    updateMoveQueue();
  }

  root.addEventListener('sc:session-change', () => queueMicrotask(update));
  root.addEventListener('sc:route-runtime-ready', () => queueMicrotask(update));
  new MutationObserver(() => queueMicrotask(update)).observe(document.body, { childList: true, subtree: true });
  queueMicrotask(update);
}(typeof globalThis !== 'undefined' ? globalThis : window));