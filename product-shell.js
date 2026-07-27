'use strict';

(function initializeProductShell() {
  const registry = window.SCCompanionPages;
  const icons = window.SCCompanionMfdIcons;
  if (!registry) return;

  document.documentElement.dataset.theme = 'industrial';

  const navigation = document.querySelector('#product-navigation');
  const mobileSelect = document.querySelector('#mobile-page-select');
  const futureRoot = document.querySelector('#future-pages-root');
  const pageEyebrow = document.querySelector('#shell-page-eyebrow');
  const pageTitle = document.querySelector('#shell-page-title');
  const navFooter = document.querySelector('.nav-footer');
  const icon = (name) => icons?.render(name, 'mfd-icon') ?? name.slice(0, 2).toUpperCase();

  function renderBrandIdentity() {
    const emblem = document.querySelector('.brand-emblem span');
    const brand = document.querySelector('.brand-text');
    const legal = document.querySelector('.app-footer');
    if (emblem) emblem.textContent = 'SC';
    if (brand) {
      const owner = brand.querySelector('small');
      const product = brand.querySelector('strong');
      const qualifier = brand.querySelector('em');
      if (owner) owner.textContent = 'SC Companion';
      if (product) product.textContent = 'Hauling Ops';
      if (qualifier) qualifier.textContent = 'Local companion';
    }
    if (legal) legal.textContent = 'Unofficial community tool. Star Citizen and related marks belong to Cloud Imperium Games.';
  }

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
    if (!futureRoot || document.querySelector('#route-planner')) return;
    futureRoot.insertAdjacentHTML('beforeend', '<section class="app-view page-view route-planner-page" data-view="route-planner" id="route-planner" hidden></section>');
  }

  function renderReleaseFooter() {
    if (!navFooter) return;
    const build = navFooter.querySelector('span');
    const privacy = navFooter.querySelector('small');
    if (build) build.textContent = 'BUILD 0.27.0';
    if (privacy) privacy.textContent = 'Private session · local review and routing';
  }

  function setContext(requestedId) {
    const viewId = registry.resolveView(requestedId);
    const page = registry.getPage(viewId) ?? registry.getPage(registry.defaultPageId);
    if (!page) return;
    if (pageEyebrow) pageEyebrow.textContent = page.eyebrow;
    if (pageTitle) pageTitle.textContent = page.title;
    if (mobileSelect) mobileSelect.value = page.id;
    document.documentElement.dataset.activeView = page.id;
    document.title = `${page.label} · SC Companion`;
  }

  function openTarget(targetId) {
    const page = registry.getPage(targetId);
    const viewId = registry.resolveView(targetId);
    navigation?.querySelector(`[data-view-target="${viewId}"]`)?.click();
    if (page?.parentView) {
      window.dispatchEvent(new CustomEvent('sc:open-internal-panel', { detail: { pageId: targetId, panel: page.panel, parentView: page.parentView } }));
    }
  }

  renderBrandIdentity();
  renderNavigation();
  renderMobileOptions();
  renderDynamicHosts();
  renderReleaseFooter();

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
