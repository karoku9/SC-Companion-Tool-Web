'use strict';

(function synchronizeShipSelectors(root) {
  const store = root.SCCompanionSession;
  const catalog = root.SCCompanionShipCatalog;
  if (!store || !catalog) return;

  function sync(state = store.getState()) {
    const modelId = catalog.getModel(state.selectedShipModelId)?.id
      ?? catalog.getModel((state.hangarShips ?? []).find((ship) => ship.id === state.selectedShipId)?.modelId)?.id
      ?? catalog.models[0]?.id
      ?? '';
    if (!modelId) return;
    ['#mission-ship-select', '#quick-ship-select'].forEach((selector) => {
      const select = document.querySelector(selector);
      if (select && [...select.options].some((option) => option.value === modelId) && select.value !== modelId) select.value = modelId;
    });
  }

  root.addEventListener('sc:session-change', (event) => sync(event.detail));
  root.addEventListener('hashchange', () => requestAnimationFrame(() => sync()));
  const observer = new MutationObserver(() => sync());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  sync();
}(typeof globalThis !== 'undefined' ? globalThis : window));