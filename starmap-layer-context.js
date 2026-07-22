'use strict';

(function synchronizeStarmapLayerContext() {
  const page = document.querySelector('#map');
  const data = window.SCCompanionStarmapData;
  const systemPicker = page?.querySelector('.starmap-system-picker');
  const systemSelect = page?.querySelector('#starmap-system-select');
  const openSystem = page?.querySelector('#starmap-open-system');
  const title = page?.querySelector('#starmap-selection-title');
  const detail = page?.querySelector('#starmap-selection-detail');
  if (!page || !data || !systemPicker || !systemSelect || !openSystem || !title || !detail) return;

  function syncSelectedSystemCopy() {
    if (systemPicker.hidden) return;
    const system = data.getSystem(systemSelect.value);
    if (!system || title.textContent.trim() !== system.name) return;
    detail.textContent = `${system.security}. ${system.availability}. Bodies and route stops are shown on this layer.`;
  }

  openSystem.addEventListener('click', () => requestAnimationFrame(syncSelectedSystemCopy));
  systemSelect.addEventListener('change', () => requestAnimationFrame(syncSelectedSystemCopy));
  window.addEventListener('sc:session-change', () => requestAnimationFrame(syncSelectedSystemCopy));
}());
