'use strict';

(function installMissionLocationPicker(root) {
  function initialize() {
    const input = document.querySelector('#mission-start-location');
    const list = document.querySelector('#mission-start-location-list');
    const model = root.SCCompanionLocations;
    if (!input || !list || !model || input.dataset.locationPickerEnhanced === 'true') return false;

    const normalize = model.normalizeSearchTerm;
    const locationsByLabel = new Map();
    model.locations.filter((location) => location.operational).forEach((location) => {
      const label = model.formatOperationalLabel(location);
      locationsByLabel.set(normalize(label), location);
    });

    [...list.options].forEach((option) => {
      const location = locationsByLabel.get(normalize(option.value));
      if (location) option.dataset.locationId = location.id;
    });

    input.addEventListener('change', () => {
      const option = [...list.options].find((candidate) => normalize(candidate.value) === normalize(input.value));
      const location = option?.dataset.locationId ? model.getLocation(option.dataset.locationId) : null;
      if (location) input.value = location.navigationTarget ?? location.name;
    }, true);

    input.dataset.locationPickerEnhanced = 'true';
    return true;
  }

  const observer = new MutationObserver(() => {
    if (initialize()) observer.disconnect();
  });
  if (!initialize()) observer.observe(document.documentElement, { childList: true, subtree: true });
}(typeof globalThis !== 'undefined' ? globalThis : window));