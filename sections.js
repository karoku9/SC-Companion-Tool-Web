'use strict';

(function initializeSections() {
  const registry = window.SCCompanionPages;
  const defaultPageId = registry?.defaultPageId ?? 'route';

  function views() { return [...document.querySelectorAll('[data-view]')]; }
  function buttons() { return [...document.querySelectorAll('[data-view-target]')]; }

  function show(requestedId, updateHash = true) {
    const selectedId = registry?.resolveView(requestedId) ?? requestedId ?? defaultPageId;
    const currentViews = views();
    const validIds = new Set(currentViews.map((view) => view.dataset.view));
    const resolvedId = validIds.has(selectedId) ? selectedId : defaultPageId;
    currentViews.forEach((view) => { view.hidden = view.dataset.view !== resolvedId; });
    buttons().forEach((button) => button.setAttribute('aria-selected', String(button.dataset.viewTarget === resolvedId)));
    if (updateHash) history.replaceState(null, '', `#${resolvedId}`);
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-view-target]');
    if (button) show(button.dataset.viewTarget);
  });

  window.addEventListener('hashchange', () => show(location.hash.slice(1), false));
  window.addEventListener('sc:dynamic-pages-ready', () => show(location.hash.slice(1) || defaultPageId, false));
  show(location.hash.slice(1) || defaultPageId, false);
}());
