'use strict';

(function bridgeManualGridEditor(root) {
  const page = document.querySelector('.operations-page.ops40-page');
  const panel = page?.querySelector('.ops40-cargo-panel');
  const header = panel?.querySelector('.ops40-panel-header');
  const grouping = panel?.querySelector('.ops40-cargo-tools label');
  const grid = panel?.querySelector('.ops40-cargo-grid');
  if (!page || !panel || !header || !grouping || !grid) return;

  page.classList.add('operations-v028');
  panel.classList.add('ops-v028-cargo-panel');
  header.classList.add('ops-v028-panel-header');
  grouping.classList.add('ops-v028-grouping');
  grid.classList.add('ops-v028-cargo-grid');

  root.addEventListener('sc:open-cargo-grid-editor', () => {
    const trigger = page.querySelector('.ops-v030-edit-grid');
    if (trigger) trigger.click();
  });
}(typeof globalThis !== 'undefined' ? globalThis : window));
