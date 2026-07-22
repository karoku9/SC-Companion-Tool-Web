'use strict';

(function synchronizeStarmapLayerContext() {
  let installed = false;

  function install() {
    if (installed) return true;
    const page = document.querySelector('#map');
    const data = window.SCCompanionStarmapData;
    const originalPanel = page?.querySelector('#starmap-context-panel');
    const systemPicker = page?.querySelector('.starmap-system-picker');
    const systemSelect = page?.querySelector('#starmap-system-select');
    const openSystem = page?.querySelector('#starmap-open-system');
    const title = page?.querySelector('#starmap-selection-title');
    const detail = page?.querySelector('#starmap-selection-detail');
    const contextToggle = page?.querySelector('#starmap-context-toggle');
    if (!page || !data || !originalPanel || !systemPicker || !systemSelect || !openSystem || !title || !detail || !contextToggle) return false;

    const dialog = document.createElement('dialog');
    dialog.id = originalPanel.id;
    dialog.className = originalPanel.className;
    dialog.setAttribute('aria-label', originalPanel.getAttribute('aria-label') ?? 'Selected map object');
    while (originalPanel.firstChild) dialog.append(originalPanel.firstChild);
    originalPanel.replaceWith(dialog);

    const mobileQuery = window.matchMedia('(max-width: 900px)');

    function syncSelectedSystemCopy() {
      if (systemPicker.hidden) return;
      const system = data.getSystem(systemSelect.value);
      if (!system || title.textContent.trim() !== system.name) return;
      detail.textContent = `${system.security}. ${system.availability}. Bodies and route stops are shown on this layer.`;
    }

    function closeMobileDialog() {
      page.classList.remove('is-context-open');
      contextToggle.setAttribute('aria-expanded', 'false');
      if (dialog.open) dialog.close();
    }

    function syncDialogMode() {
      if (mobileQuery.matches) {
        dialog.classList.add('is-mobile-dialog');
        const shouldOpen = page.classList.contains('is-context-open');
        if (shouldOpen && !dialog.open) dialog.showModal();
        if (!shouldOpen && dialog.open) dialog.close();
      } else {
        dialog.classList.remove('is-mobile-dialog');
        if (!dialog.open) dialog.setAttribute('open', '');
      }
    }

    openSystem.addEventListener('click', () => requestAnimationFrame(syncSelectedSystemCopy));
    systemSelect.addEventListener('change', () => requestAnimationFrame(syncSelectedSystemCopy));
    window.addEventListener('sc:session-change', () => requestAnimationFrame(syncSelectedSystemCopy));

    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeMobileDialog();
    });
    dialog.addEventListener('click', (event) => {
      if (!mobileQuery.matches || event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      const outside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
      if (outside) closeMobileDialog();
    });

    new MutationObserver(syncDialogMode).observe(page, { attributes: true, attributeFilter: ['class'] });
    mobileQuery.addEventListener?.('change', syncDialogMode);
    syncDialogMode();
    installed = true;
    return true;
  }

  if (!install()) {
    document.addEventListener('DOMContentLoaded', install, { once: true });
    window.addEventListener('load', install, { once: true });
  }
}());
