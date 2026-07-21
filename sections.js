'use strict';

(function initializeSections() {
  const buttons = [...document.querySelectorAll('[data-view-target]')];
  const views = [...document.querySelectorAll('[data-view]')];
  if (!buttons.length || !views.length) return;

  const validIds = new Set(views.map((view) => view.dataset.view));
  const defaultPageId = window.SCCompanionPages?.defaultPageId ?? 'overview';

  function show(viewId, updateHash = true) {
    const selectedId = validIds.has(viewId) ? viewId : defaultPageId;
    views.forEach((view) => { view.hidden = view.dataset.view !== selectedId; });
    buttons.forEach((button) => {
      const selected = button.dataset.viewTarget === selectedId;
      button.setAttribute('aria-selected', String(selected));
    });
    if (updateHash) history.replaceState(null, '', `#${selectedId}`);
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => show(button.dataset.viewTarget));
  });

  window.addEventListener('hashchange', () => show(location.hash.slice(1), false));
  show(location.hash.slice(1) || defaultPageId, false);
}());
