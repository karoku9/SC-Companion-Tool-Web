'use strict';

(function initializeInterfaceRebuild() {
  const frame = document.querySelector('.product-frame');
  const sidebar = document.querySelector('.product-sidebar');
  const navigation = document.querySelector('#product-navigation');
  const registry = window.SCCompanionPages;
  if (!frame || !sidebar || !navigation || !registry) return;

  const STORAGE_KEY = 'sc-companion-ui-v011';

  function readPreferences() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
    } catch {
      return {};
    }
  }

  function writePreferences(changes) {
    const next = { ...readPreferences(), ...changes };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  const toggle = document.querySelector('#sidebar-toggle');
  const initialCollapsed = Boolean(readPreferences().sidebarCollapsed);
  frame.classList.toggle('is-sidebar-collapsed', initialCollapsed);
  toggle?.setAttribute('aria-pressed', String(initialCollapsed));

  toggle?.addEventListener('click', () => {
    const collapsed = frame.classList.toggle('is-sidebar-collapsed');
    toggle.setAttribute('aria-pressed', String(collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Expand navigation' : 'Collapse navigation');
    writePreferences({ sidebarCollapsed: collapsed });
  });

  const bottomNav = document.createElement('nav');
  bottomNav.className = 'mobile-bottom-nav';
  bottomNav.setAttribute('aria-label', 'Primary mobile navigation');
  bottomNav.innerHTML = registry.pages.map((page) => `
    <button type="button" data-view-target="${page.id}" aria-selected="false">
      <strong>${page.icon ?? page.label.slice(0, 2).toUpperCase()}</strong>
      <small>${page.label}</small>
    </button>`).join('');
  document.body.append(bottomNav);

  function currentView() {
    return registry.resolveView(location.hash.slice(1) || registry.defaultPageId);
  }

  function syncSelection() {
    const selected = currentView();
    document.documentElement.dataset.activeView = selected;
    bottomNav.querySelectorAll('[data-view-target]').forEach((button) => {
      button.setAttribute('aria-selected', String(button.dataset.viewTarget === selected));
    });
  }

  bottomNav.addEventListener('click', (event) => {
    const button = event.target.closest('[data-view-target]');
    if (!button) return;
    navigation.querySelector(`[data-view-target="${button.dataset.viewTarget}"]`)?.click();
  });

  const buttonLabels = new Map([
    ['COMPLETE STOP — NEXT', 'Complete stop and continue'],
    ['COMPLETE — NEXT', 'Complete and continue'],
    ['PREVIOUS', 'Previous stop'],
    ['EXPAND', 'Full screen'],
    ['RESTORE', 'Restore'],
    ['CLOSE', 'Close'],
    ['APPLY ROUTE', 'Apply route'],
    ['ROUTE ALREADY ACTIVE', 'Route already active'],
    ['SAVE SHIP', 'Save ship'],
    ['SAVE ZONES', 'Save zones'],
    ['RESET SHIP DEFAULT', 'Reset ship default'],
    ['ADD ZONE', 'Add zone'],
    ['GENERATE SESSION', 'Generate session'],
    ['RESET', 'Reset'],
    ['FIND', 'Find'],
    ['APPLY', 'Apply'],
    ['REMOVE', 'Remove'],
    ['ROADMAP', 'Roadmap'],
    ['CHANGELOG', 'Changelog']
  ]);

  function normalizeButtonLabels(root = document) {
    root.querySelectorAll('button').forEach((button) => {
      if (button.children.length) return;
      const current = button.textContent.trim();
      const replacement = buttonLabels.get(current);
      if (replacement) button.textContent = replacement;
    });
  }

  const observer = new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      normalizeButtonLabels(node);
    }));
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('hashchange', syncSelection);
  window.addEventListener('sc:dynamic-pages-ready', () => {
    normalizeButtonLabels();
    syncSelection();
    document.documentElement.dataset.uiReady = 'true';
  }, { once: true });

  normalizeButtonLabels();
  syncSelection();
}());
