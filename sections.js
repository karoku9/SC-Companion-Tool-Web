'use strict';

(function initializeSections() {
  const defaultPageId = window.SCCompanionPages?.defaultPageId ?? 'overview';

  function views() { return [...document.querySelectorAll('[data-view]')]; }
  function buttons() { return [...document.querySelectorAll('[data-view-target]')]; }

  function show(viewId, updateHash = true) {
    const currentViews = views();
    const validIds = new Set(currentViews.map((view) => view.dataset.view));
    const selectedId = validIds.has(viewId) ? viewId : defaultPageId;
    currentViews.forEach((view) => { view.hidden = view.dataset.view !== selectedId; });
    buttons().forEach((button) => {
      const selected = button.dataset.viewTarget === selectedId;
      button.setAttribute('aria-selected', String(selected));
    });
    if (updateHash) history.replaceState(null, '', `#${selectedId}`);
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-view-target]');
    if (button) show(button.dataset.viewTarget);
  });

  window.addEventListener('hashchange', () => show(location.hash.slice(1), false));
  window.addEventListener('sc:dynamic-pages-ready', () => show(location.hash.slice(1) || defaultPageId, false));
  show(location.hash.slice(1) || defaultPageId, false);
}());