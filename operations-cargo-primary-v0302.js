'use strict';

(function installPrimaryCargoOperations(root) {
  let installed = false;

  function install() {
    if (installed) return true;

    const page = document.querySelector('.operations-page.operations-v028');
    const primary = page?.querySelector('.ops-v027-primary-grid');
    const mapPanel = primary?.querySelector('.ops-live-navigation');
    const currentPanel = primary?.querySelector('.current-operation-panel');
    const cargoPanel = page?.querySelector('.ops-v028-cargo-panel');
    if (!page || !primary || !mapPanel || !currentPanel || !cargoPanel) return false;

    installed = true;
    page.classList.add('operations-cargo-primary-v0302');
    cargoPanel.classList.add('ops-v0302-primary-cargo');
    cargoPanel.setAttribute('aria-label', 'Primary cargo layout');

    primary.insertBefore(cargoPanel, currentPanel);
    mapPanel.remove();

    if (!document.querySelector('[data-operations-cargo-primary-style]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = new URL('./operations-cargo-primary-v0302.css?v=0.30.2', document.baseURI).href;
      link.dataset.operationsCargoPrimaryStyle = '0.30.2';
      document.head.append(link);
    }

    root.dispatchEvent(new CustomEvent('sc:operations-cargo-primary-ready'));
    return true;
  }

  const observer = new MutationObserver(() => {
    if (install()) observer.disconnect();
  });

  if (!install()) observer.observe(document.documentElement, { childList: true, subtree: true });
}(typeof globalThis !== 'undefined' ? globalThis : window));
