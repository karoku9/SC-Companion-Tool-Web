'use strict';

(function initializeCleanShell() {
  const sidebarToggle = document.querySelector('#sidebar-toggle');
  const roadmap = window.SCCompanionRoadmap;

  const buildLabel = document.querySelector('.nav-footer span');
  if (buildLabel && roadmap?.currentVersion) buildLabel.textContent = `BUILD ${roadmap.currentVersion}`;
  const localMapButton = document.querySelector('[data-map-mode="stanton"]');
  if (localMapButton) {
    localMapButton.dataset.mapMode = 'local';
    localMapButton.textContent = 'Local system';
  }

  sidebarToggle?.addEventListener('click', () => {
    const collapsed = document.documentElement.classList.toggle('nav-collapsed');
    sidebarToggle.setAttribute('aria-pressed', String(collapsed));
    localStorage.setItem('sc-companion-nav-collapsed', String(collapsed));
  });
  if (localStorage.getItem('sc-companion-nav-collapsed') === 'true') {
    document.documentElement.classList.add('nav-collapsed');
    sidebarToggle?.setAttribute('aria-pressed', 'true');
  }

  function installContextualContent() {
    const plannerRoot = document.querySelector('#route-planner');
    const locations = document.querySelector('#locations');
    if (plannerRoot && locations && !plannerRoot.querySelector('.contextual-location-intel')) {
      const details = document.createElement('details');
      details.className = 'contextual-location-intel';
      details.innerHTML = '<summary>Location intel and arrival context</summary><div class="contextual-location-intel-body"></div>';
      locations.hidden = false;
      details.querySelector('.contextual-location-intel-body').append(locations);
      plannerRoot.append(details);
    }

    const changelog = document.querySelector('#changelog');
    const changelogHost = document.querySelector('#development-changelog');
    if (changelog && changelogHost && !changelogHost.contains(changelog)) {
      changelog.removeAttribute('data-view');
      changelog.hidden = false;
      changelogHost.append(changelog);
    }

    const uiKit = document.querySelector('#design-system-showcase');
    const uiKitHost = document.querySelector('#development-ui-kit');
    if (uiKit && uiKitHost && !uiKitHost.contains(uiKit)) {
      uiKit.hidden = false;
      uiKitHost.append(uiKit);
    }

    const tabs = document.querySelector('.development-tabs');
    if (tabs && !tabs.dataset.bound) {
      tabs.dataset.bound = 'true';
      tabs.addEventListener('click', (event) => {
        const button = event.target.closest('[data-development-tab]');
        if (!button) return;
        const selected = button.dataset.developmentTab;
        tabs.querySelectorAll('[data-development-tab]').forEach((item) => item.setAttribute('aria-selected', String(item === button)));
        document.querySelectorAll('[data-development-pane]').forEach((pane) => { pane.hidden = pane.dataset.developmentPane !== selected; });
      });
    }
  }

  window.addEventListener('sc:dynamic-pages-ready', () => requestAnimationFrame(installContextualContent), { once: true });
}());
