'use strict';

(function synchronizeMissionControls(root) {
  function sync(state = root.SCCompanionSession?.getState?.()) {
    if (!state) return;
    const ship = document.querySelector('#mission-ship-select');
    const mode = document.querySelector('#mission-route-mode');
    const target = document.querySelector('#mission-session-target');

    if (ship && root.SCCompanionShipCatalog?.getModel(state.selectedShipModelId)) {
      ship.value = state.selectedShipModelId;
    }
    if (mode && state.routeMode) mode.value = state.routeMode === 'fastest' ? 'fastest' : 'sessions';
    if (target && Number.isFinite(Number(state.sessionTargetMinutes))) target.value = String(state.sessionTargetMinutes);
  }

  root.addEventListener('sc:session-change', (event) => sync(event.detail));
  root.addEventListener('hashchange', () => root.requestAnimationFrame(() => sync()));
  root.addEventListener('sc:dynamic-pages-ready', () => sync());
  sync();
}(typeof globalThis !== 'undefined' ? globalThis : window));
