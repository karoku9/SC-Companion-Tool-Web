'use strict';

(function initializeReadableShortDesktopOperations(root) {
  const icons = root.SCCompanionMfdIcons;
  let scheduled = false;

  function icon(name) {
    return icons?.render?.(name, 'ops-v0291-summary-icon') ?? '';
  }

  function summarizeCurrentOperations() {
    const list = document.querySelector('.operations-page.operations-v028 .ops-v028-operation-list');
    if (!list) return;

    const rows = [...list.querySelectorAll('.ops-v028-operation-row')];
    if (!rows.length) return;

    const entries = rows.map((row) => {
      const label = row.querySelector('b')?.textContent?.trim() ?? '';
      const match = label.match(/^(\d+(?:\.\d+)?)\s*SCU\s*(.*)$/i);
      return {
        scu: Number(match?.[1] ?? 0),
        commodity: String(match?.[2] ?? label).trim()
      };
    });

    const totalScu = entries.reduce((total, entry) => total + entry.scu, 0);
    const commodities = [...new Set(entries.map((entry) => entry.commodity).filter(Boolean))];
    const commodityLabel = commodities.length > 3
      ? `${commodities.slice(0, 3).join(' · ')} · +${commodities.length - 3}`
      : commodities.join(' · ');

    let summary = list.previousElementSibling;
    if (!summary?.classList.contains('ops-v0291-operation-compact')) {
      summary = document.createElement('div');
      summary.className = 'ops-v0291-operation-compact';
      list.before(summary);
    }

    summary.innerHTML = `
      <span aria-hidden="true">${icon('cargo')}</span>
      <div>
        <strong>${totalScu} SCU · ${rows.length} cargo line${rows.length === 1 ? '' : 's'}</strong>
        <small>${commodityLabel}</small>
      </div>`;
    summary.title = rows.map((row) => row.textContent.trim().replace(/\s+/g, ' ')).join('\n');
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      summarizeCurrentOperations();
    });
  }

  root.addEventListener('sc:session-change', schedule);
  root.addEventListener('hashchange', schedule);

  new MutationObserver((mutations) => {
    if (mutations.some((mutation) => [...mutation.addedNodes].some((node) => node.nodeType === Node.ELEMENT_NODE))) schedule();
  }).observe(document.documentElement, { childList: true, subtree: true });

  schedule();
}(typeof globalThis !== 'undefined' ? globalThis : window));
