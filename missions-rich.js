'use strict';

(function exposeIntegratedMissionModel(root) {
  const model = root.SCCompanionMissions
    ?? (typeof require !== 'undefined' ? require('./missions.js') : null);
  if (!model) throw new Error('Integrated mission model is unavailable.');
  root.SCCompanionMissions = model;

  if (typeof document !== 'undefined') {
    let summaryQueued = false;
    function updateAccessibleSummary() {
      summaryQueued = false;
      const reviewRoot = document.querySelector('#focused-review-single');
      const card = reviewRoot?.querySelector('[data-focused-mission]');
      if (!reviewRoot || !card) return;
      const value = [...card.querySelectorAll('input, select')]
        .map((control) => String(control.value ?? '').trim())
        .filter(Boolean)
        .join(' · ');
      let summary = reviewRoot.querySelector('.focused-review-accessible-summary');
      if (!summary) {
        summary = document.createElement('span');
        summary.className = 'sr-only focused-review-accessible-summary';
        summary.setAttribute('aria-live', 'polite');
        reviewRoot.prepend(summary);
      }
      if (summary.textContent !== value) summary.textContent = value;
    }
    function scheduleAccessibleSummary() {
      if (summaryQueued) return;
      summaryQueued = true;
      queueMicrotask(updateAccessibleSummary);
    }
    document.addEventListener('input', (event) => {
      if (event.target.closest?.('#focused-review-single')) scheduleAccessibleSummary();
    });
    new MutationObserver(scheduleAccessibleSummary).observe(document.documentElement, { childList: true, subtree: true });

    import('./focused-route-optimizer.js');
    import('./missions-source-provenance.js');
    import('./shared-pickup-display.js');
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = model;
}(typeof globalThis !== 'undefined' ? globalThis : window));