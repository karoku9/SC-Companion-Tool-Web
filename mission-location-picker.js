'use strict';

(function installMissionLocationPicker(root) {
  function initialize() {
    const input = document.querySelector('#mission-start-location');
    const list = document.querySelector('#mission-start-location-list');
    const form = document.querySelector('#mission-form');
    const model = root.SCCompanionLocations;
    if (!input || !list || !form || !model || input.dataset.locationPickerEnhanced === 'true') return false;

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

    const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(input, 'value', {
      configurable: true,
      get() { return nativeValue.get.call(this); },
      set(nextValue) {
        const location = locationsByLabel.get(normalize(nextValue));
        nativeValue.set.call(this, location ? location.navigationTarget ?? location.name : nextValue);
      }
    });

    function normalizeSelection() {
      const option = [...list.options].find((candidate) => normalize(candidate.value) === normalize(input.value));
      const location = option?.dataset.locationId ? model.getLocation(option.dataset.locationId) : null;
      if (location) input.value = location.navigationTarget ?? location.name;
    }

    input.addEventListener('change', normalizeSelection, true);
    form.addEventListener('click', (event) => {
      if (event.target.closest('button[type="submit"]')) normalizeSelection();
    }, true);

    input.dataset.locationPickerEnhanced = 'true';
    return true;
  }

  const observer = new MutationObserver(() => {
    if (initialize()) observer.disconnect();
  });
  if (!initialize()) observer.observe(document.documentElement, { childList: true, subtree: true });
}(typeof globalThis !== 'undefined' ? globalThis : window));