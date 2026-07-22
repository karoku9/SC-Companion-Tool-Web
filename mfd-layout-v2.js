'use strict';

(function initializeMfdLayoutV2() {
  function forceCloseUtilityPanel() {
    const drawer = document.querySelector('.workspace-drawer');
    const backdrop = document.querySelector('.workspace-drawer-backdrop');
    const tools = document.querySelector('.operations-workspace-tools');
    const workspace = document.querySelector('.operations-mfd-frame');
    if (!drawer) return;

    drawer.hidden = true;
    drawer.setAttribute('aria-hidden', 'true');
    drawer.classList.remove('is-expanded');
    if (backdrop) backdrop.hidden = true;
    tools?.classList.remove('is-open');
    workspace?.classList.remove('has-utility-panel');
    document.body.classList.remove('workspace-drawer-open');
    document.querySelectorAll('[data-open-workspace-panel]').forEach((button) => button.setAttribute('aria-pressed', 'false'));
    const expand = document.querySelector('#workspace-drawer-expand');
    expand?.setAttribute('aria-pressed', 'false');
    const expandLabel = expand?.querySelector('span');
    if (expandLabel) expandLabel.textContent = 'Full screen';
  }

  function enhanceOperations() {
    const route = document.querySelector('#route');
    const routeList = document.querySelector('#route-stop-list');
    const currentCard = route?.querySelector('.current-stop-card');
    if (!route || !routeList || !currentCard) return;

    route.classList.add('is-mfd-operations');
    currentCard.setAttribute('aria-label', 'Current operation display');
    routeList.setAttribute('aria-label', 'Active route sequence');

    const close = document.querySelector('#workspace-drawer-close');
    if (close) close.setAttribute('aria-label', 'Close auxiliary display');
    const expand = document.querySelector('#workspace-drawer-expand');
    if (expand) expand.setAttribute('aria-label', 'Toggle full-screen auxiliary display');
  }

  /* Capture the close command before nested SVG or legacy handlers can interfere. */
  document.addEventListener('click', (event) => {
    const close = event.target.closest('#workspace-drawer-close');
    if (!close) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    forceCloseUtilityPanel();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !document.querySelector('.workspace-drawer')?.hidden) forceCloseUtilityPanel();
  }, true);

  window.addEventListener('hashchange', forceCloseUtilityPanel);
  window.addEventListener('sc:dynamic-pages-ready', enhanceOperations, { once: true });

  if (document.documentElement.dataset.uiReady === 'true') enhanceOperations();
}());
