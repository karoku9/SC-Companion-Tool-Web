'use strict';

(function initializeCargoGuidanceV0292(root) {
  const icons = root.SCCompanionMfdIcons;
  let scheduled = false;

  function icon(name) {
    return icons?.render?.(name, 'mfd-icon') ?? '';
  }

  function update() {
    const guidance = document.querySelector('.operations-page.operations-v028 .ops-v028-cargo-guidance');
    if (!guidance || guidance.dataset.guidanceVersion === '0.29.2') return;
    guidance.dataset.guidanceVersion = '0.29.2';
    const spans = [...guidance.querySelectorAll(':scope > span')];
    if (spans[1]) spans[1].innerHTML = `${icon('check')} Left / right zones first`;
    if (spans[2]) spans[2].innerHTML = `${icon('check')} Earlier drops stay nearer the ramp`;
    const note = guidance.querySelector(':scope > small');
    if (note) note.textContent = 'Compact destination blocks · front/rear depth is secondary';
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  }

  root.addEventListener('sc:session-change', schedule);
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  schedule();
}(typeof globalThis !== 'undefined' ? globalThis : window));
