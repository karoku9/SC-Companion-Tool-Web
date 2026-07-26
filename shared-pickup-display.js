'use strict';

(function clarifySharedPickups(root) {
  if (typeof document === 'undefined') return;
  let queued = false;

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

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
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
      setText(row.querySelector('.operation-primary strong'), label.primary);
      setText(row.querySelector('.operation-context'), label.detail);
      if (row.dataset.sharedPickup !== 'true') row.dataset.sharedPickup = 'true';
    });
  }

  function updateRouteIndex() {
    const context = activeContext();
    const stops = context?.route?.allStops ?? context?.route?.stops ?? [];
    const rows = [...document.querySelectorAll('#route-stop-list > li')];
    stops.forEach((stop, index) => {
      const shared = stop.operations.filter((operation) => operation.sharedPickupTotal && operation.type !== 'delivery');
      if (!shared.length) return;
      const summary = rows[index]?.querySelector('div > small');
      if (!summary) return;
      const totals = [...new Map(shared.map((operation) => [operation.lotId, operation])).values()];
      const value = totals.map((operation) => {
        const count = Number(operation.pickupLocationCount ?? operation.pickupLocations?.length ?? 1);
        const sequence = Number(operation.pickupSequence ?? 1);
        return `Shared pickup ${sequence}/${count} · ${operation.scu} SCU ${operation.commodity} total`;
      }).join(' · ');
      setText(summary, value);
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
      setText(row.querySelector('b, strong'), label.primary);
      setText(row.querySelector('span:not(.move-action-icon)'), label.detail);
      if (row.dataset.sharedPickup !== 'true') row.dataset.sharedPickup = 'true';
    });
  }

  function update() {
    queued = false;
    updateCurrentStop();
    updateRouteIndex();
    updateMoveQueue();
  }

  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(update);
  }

  root.addEventListener('sc:session-change', schedule);
  root.addEventListener('sc:route-runtime-ready', schedule);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  schedule();
}(typeof globalThis !== 'undefined' ? globalThis : window));