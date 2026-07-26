'use strict';

(function exposeFocusedReviewSummary() {
  if (typeof document === 'undefined') return;
  let queued = false;
  let updating = false;

  function update() {
    queued = false;
    if (updating) return;
    const root = document.querySelector('#focused-review-single');
    const card = root?.querySelector('[data-focused-mission]');
    if (!root || !card) return;
    const values = [...card.querySelectorAll('input, select')]
      .map((control) => String(control.value ?? '').trim())
      .filter(Boolean)
      .join(' · ');
    let summary = root.querySelector('.focused-review-accessible-summary');
    if (!summary) {
      updating = true;
      summary = document.createElement('span');
      summary.className = 'sr-only focused-review-accessible-summary';
      summary.setAttribute('aria-live', 'polite');
      root.prepend(summary);
      updating = false;
    }
    if (summary.textContent !== values) summary.textContent = values;
  }

  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(update);
  }

  document.addEventListener('input', (event) => {
    if (event.target.closest?.('#focused-review-single')) schedule();
  });
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  schedule();
}());