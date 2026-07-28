'use strict';

(function normalizeReviewedMissionLocations(root) {
  function exactLocation(value, model) {
    const normalized = model.normalizeSearchTerm(value);
    const matches = model.searchOperationalLocations(value, { limit: 20 });
    return matches.find((location) => [
      location.name,
      location.navigationTarget,
      model.formatOperationalLabel(location),
      ...(location.aliases ?? [])
    ].filter(Boolean).some((candidate) => model.normalizeSearchTerm(candidate) === normalized))
      ?? (matches.length === 1 ? matches[0] : null);
  }

  function normalizePart(value, model) {
    const location = exactLocation(value.trim(), model);
    return location?.navigationTarget ?? location?.name ?? value.trim();
  }

  function normalizeReviewInputs() {
    const model = root.SCCompanionLocations;
    if (!model) return;
    document.querySelectorAll('.missions-page [data-review-mission] [data-field="location"]').forEach((input) => {
      const parts = String(input.value ?? '').split('+').map((part) => part.trim()).filter(Boolean);
      if (!parts.length) return;
      input.value = parts.map((part) => normalizePart(part, model)).join(' + ');
    });
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('#focused-review-generate, #focused-review-validate')) return;
    normalizeReviewInputs();
  }, true);
}(typeof globalThis !== 'undefined' ? globalThis : window));
