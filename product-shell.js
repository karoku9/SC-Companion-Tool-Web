'use strict';

(function initializeProductShell() {
  const registry = window.SCCompanionPages;
  const icons = window.SCCompanionMfdIcons;
  if (!registry) return;

  const navigation = document.querySelector('#product-navigation');
  const mobileSelect = document.querySelector('#mobile-page-select');
  const futureRoot = document.querySelector('#future-pages-root');
  const pageEyebrow = document.querySelector('#shell-page-eyebrow');
  const pageTitle = document.querySelector('#shell-page-title');
  const icon = (name) => icons?.render(name, 'mfd-icon') ?? name.slice(0, 2).toUpperCase();

  function renderNavigation() {
    if (!navigation) return;
    navigation.innerHTML = registry.groups.map((group) => `
      <section class="nav-group" data-nav-group="${group.id}">
        <h2>${group.label}</h2>
        ${group.pages.map((page) => `
          <button type="button" data-view-target="${page.id}" aria-selected="false" title="${page.label}: ${page.hint ?? page.title}">
            <span class="nav-glyph" aria-hidden="true">${icon(page.icon ?? page.id)}</span>
            <span class="nav-copy"><strong>${page.label}</strong><small>${page.hint ?? page.title}</small></span>
          </button>`).join('')}
      </section>`).join('');
  }

  function renderMobileOptions() {
    if (!mobileSelect) return;
    mobileSelect.innerHTML = registry.groups.map((group) => `<optgroup label="${group.label}">${group.pages.map((page) => `<option value="${page.id}">${page.label}</option>`).join('')}</optgroup>`).join('');
  }

  function renderDynamicHosts() {
    if (!futureRoot) return;
    if (!document.querySelector('#route-planner')) {
      futureRoot.insertAdjacentHTML('beforeend', '<section class="app-view section-block" data-view="route-planner" id="route-planner" hidden></section>');
    }
    if (!document.querySelector('#load-operations')) {
      futureRoot.insertAdjacentHTML('beforeend', '<section class="app-view section-block internal-workspace-source" data-view="load-operations" id="load-operations" hidden></section>');
    }
  }

  function setContext(requestedId) {
    const viewId = registry.resolveView(requestedId);
    const page = registry.getPage(viewId) ?? registry.getPage(registry.defaultPageId);
    if (!page) return;
    if (pageEyebrow) pageEyebrow.textContent = page.eyebrow;
    if (pageTitle) pageTitle.textContent = page.title;
    if (mobileSelect) mobileSelect.value = page.id;
    document.documentElement.dataset.activeView = page.id;
    document.title = `${page.label} · SC Companion Tool`;
  }

  function openTarget(targetId) {
    const page = registry.getPage(targetId);
    const viewId = registry.resolveView(targetId);
    navigation?.querySelector(`[data-view-target="${viewId}"]`)?.click();
    if (page?.parentView) {
      window.dispatchEvent(new CustomEvent('sc:open-internal-panel', { detail: { pageId: targetId, panel: page.panel, parentView: page.parentView } }));
    }
  }

  renderNavigation();
  renderMobileOptions();
  renderDynamicHosts();

  navigation?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-view-target]');
    if (button) setContext(button.dataset.viewTarget);
  });
  mobileSelect?.addEventListener('change', () => openTarget(mobileSelect.value));
  document.addEventListener('click', (event) => {
    const shortcut = event.target.closest('[data-shell-link]');
    if (shortcut) openTarget(shortcut.dataset.shellLink);
  });
  window.addEventListener('hashchange', () => setContext(location.hash.slice(1) || registry.defaultPageId));
  setContext(location.hash.slice(1) || registry.defaultPageId);
}());