'use strict';

(function prepareWorkspaceConsolidation() {
  function initialize() {
    const route = document.querySelector('#route');
    const loadOperations = document.querySelector('#load-operations');
    const cargo = document.querySelector('#cargo');
    const corrections = loadOperations?.querySelector('.correction-panel');
    const routeCorrections = route?.querySelector('.route-correction-panel');
    if (!route || !loadOperations || !cargo) return;

    const routeHeading = route.querySelector('.section-heading');
    if (routeHeading) {
      const eyebrow = routeHeading.querySelector('.eyebrow');
      const heading = routeHeading.querySelector('h2');
      if (eyebrow) eyebrow.textContent = 'LIVE OPERATIONS';
      if (heading) heading.textContent = 'Navigate, move cargo, continue';
    }
    const sidebarFooter = document.querySelector('.sidebar-footer');
    if (sidebarFooter) sidebarFooter.textContent = 'Six focused workspaces. Secondary tools open only where they are needed.';
    const fleetHeading = document.querySelector('#hangar .section-heading h2');
    if (fleetHeading) fleetHeading.textContent = 'Ships and cargo configuration';

    function internalize(section) {
      section.removeAttribute('data-view');
      section.hidden = false;
      section.classList.remove('app-view', 'section-block');
      section.classList.add('workspace-tool-content');
    }

    const shell = document.createElement('section');
    shell.className = 'operations-workspace-tools';
    shell.innerHTML = `
      <div class="operations-command-strip">
        <button type="button" data-open-workspace-panel="moves"><span>NEXT MOVES</span><strong id="workspace-move-preview">No active cargo moves</strong><small>Load and unload queue</small></button>
        <button type="button" data-open-workspace-panel="cargo"><span>CARGO NOW</span><strong id="workspace-cargo-preview">0 SCU onboard</strong><small>Hold, zones and editor</small></button>
        <button type="button" data-open-workspace-panel="corrections"><span>ADJUST</span><strong>Corrections</strong><small>Actual SCU and cargo state</small></button>
        <button type="button" data-open-workspace-panel="route-tools"><span>ROUTE</span><strong>Route tools</strong><small>Skip, lock and reorder</small></button>
      </div>
      <div class="workspace-drawer-backdrop" hidden></div>
      <aside class="workspace-drawer" aria-label="Operational tools" hidden>
        <header class="workspace-drawer-header">
          <div><span>OPERATIONAL TOOL</span><h2 id="workspace-drawer-title">Moves</h2></div>
          <div><button type="button" id="workspace-drawer-expand" aria-pressed="false">EXPAND</button><button type="button" id="workspace-drawer-close">CLOSE</button></div>
        </header>
        <nav class="workspace-drawer-tabs" aria-label="Operational tool panels">
          <button type="button" data-workspace-tab="moves">MOVES</button>
          <button type="button" data-workspace-tab="cargo">CARGO</button>
          <button type="button" data-workspace-tab="corrections">CORRECTIONS</button>
          <button type="button" data-workspace-tab="route-tools">ROUTE</button>
        </nav>
        <div class="workspace-drawer-body">
          <div data-workspace-pane="moves"></div>
          <div data-workspace-pane="cargo" hidden></div>
          <div data-workspace-pane="corrections" hidden></div>
          <div data-workspace-pane="route-tools" hidden></div>
        </div>
      </aside>`;
    route.append(shell);

    const drawer = shell.querySelector('.workspace-drawer');
    const backdrop = shell.querySelector('.workspace-drawer-backdrop');
    const title = shell.querySelector('#workspace-drawer-title');
    const expand = shell.querySelector('#workspace-drawer-expand');
    const close = shell.querySelector('#workspace-drawer-close');
    const pane = (id) => shell.querySelector(`[data-workspace-pane="${id}"]`);

    internalize(loadOperations);
    internalize(cargo);
    pane('moves').append(loadOperations);
    pane('cargo').append(cargo);

    if (corrections) {
      corrections.remove();
      pane('corrections').append(corrections);
    } else {
      pane('corrections').innerHTML = '<div class="empty-inline-state">Cargo corrections are unavailable.</div>';
    }

    if (routeCorrections) {
      routeCorrections.remove();
      pane('route-tools').append(routeCorrections);
    } else {
      pane('route-tools').innerHTML = '<div class="empty-inline-state">Route correction tools are unavailable.</div>';
    }

    const labels = { moves: 'Load and unload', cargo: 'Cargo hold', corrections: 'Cargo corrections', 'route-tools': 'Route tools' };

    function openPanel(panelId = 'moves') {
      const resolved = pane(panelId) ? panelId : 'moves';
      drawer.hidden = false;
      backdrop.hidden = false;
      title.textContent = labels[resolved];
      shell.querySelectorAll('[data-workspace-pane]').forEach((element) => { element.hidden = element.dataset.workspacePane !== resolved; });
      shell.querySelectorAll('[data-workspace-tab]').forEach((button) => button.setAttribute('aria-selected', String(button.dataset.workspaceTab === resolved)));
      document.body.classList.add('workspace-drawer-open');
    }

    function closePanel() {
      drawer.hidden = true;
      backdrop.hidden = true;
      drawer.classList.remove('is-expanded');
      expand.setAttribute('aria-pressed', 'false');
      expand.textContent = 'EXPAND';
      document.body.classList.remove('workspace-drawer-open');
    }

    shell.addEventListener('click', (event) => {
      const opener = event.target.closest('[data-open-workspace-panel]');
      if (opener) openPanel(opener.dataset.openWorkspacePanel);
      const tab = event.target.closest('[data-workspace-tab]');
      if (tab) openPanel(tab.dataset.workspaceTab);
    });
    backdrop.addEventListener('click', closePanel);
    close.addEventListener('click', closePanel);
    expand.addEventListener('click', () => {
      const expanded = drawer.classList.toggle('is-expanded');
      expand.setAttribute('aria-pressed', String(expanded));
      expand.textContent = expanded ? 'RESTORE' : 'EXPAND';
    });
    window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !drawer.hidden) closePanel(); });
    window.addEventListener('sc:open-internal-panel', (event) => {
      if (event.detail?.parentView === 'route') openPanel(event.detail.panel === 'companion' ? 'moves' : event.detail.panel);
    });

    const movePreview = shell.querySelector('#workspace-move-preview');
    const cargoPreview = shell.querySelector('#workspace-cargo-preview');
    function updatePreview(state) {
      if (!state.route?.stops?.length || !window.SCCompanionRouteCorrections || !window.SCCompanionRouteProgress || !window.SCCompanionCargoState) {
        movePreview.textContent = 'No active cargo moves';
        cargoPreview.textContent = '0 SCU onboard';
        return;
      }
      const effective = window.SCCompanionRouteCorrections.deriveRoute(state.route, state.routeCorrections);
      const progress = window.SCCompanionRouteProgress.derive(effective, state.completedStopIds, state.currentStopIndex);
      const lifecycle = window.SCCompanionCargoState.deriveCargoState(effective, progress.completedStopIds, state.cargoCorrections);
      const load = lifecycle.currentMoves.filter((move) => move.action === 'load').reduce((sum, move) => sum + Number(move.lot?.scu ?? move.operation.scu ?? 0), 0);
      const unload = lifecycle.currentMoves.filter((move) => move.action === 'unload').reduce((sum, move) => sum + Number(move.lot?.scu ?? move.operation.scu ?? 0), 0);
      movePreview.textContent = progress.complete ? 'Route complete' : [unload ? `Unload ${unload} SCU` : '', load ? `Load ${load} SCU` : ''].filter(Boolean).join(' · ') || 'No cargo moves';
      cargoPreview.textContent = `${lifecycle.totals.onboardScu} SCU onboard`;
    }
    window.addEventListener('sc:session-change', (event) => updatePreview(event.detail));
    updatePreview(window.SCCompanionSession.getState());

    const planner = document.querySelector('#route-planner');
    const locations = document.querySelector('#locations');
    let locationDetails = null;
    if (planner && locations) {
      internalize(locations);
      locationDetails = document.createElement('details');
      locationDetails.className = 'contextual-tool locations-context-tool';
      locationDetails.innerHTML = '<summary><span>LOCATION INTEL</span><strong>Search services and arrival context</strong><em>EXPAND</em></summary><div class="contextual-tool-body"></div>';
      locationDetails.querySelector('.contextual-tool-body').append(locations);
      planner.append(locationDetails);
      window.addEventListener('sc:open-internal-panel', (event) => { if (event.detail?.panel === 'locations') locationDetails.open = true; });
    }

    const roadmap = document.querySelector('#roadmap');
    const changelog = document.querySelector('#changelog');
    let changelogTab = null;
    if (roadmap && changelog) {
      const roadmapTitle = roadmap.querySelector('#roadmap-title');
      const help = roadmap.querySelector('.roadmap-help');
      if (roadmapTitle) roadmapTitle.textContent = 'Release path from v0.1 to v1.0';
      if (help) help.textContent = 'Versions progress from left to right. Each card contains only the changes delivered by that release.';
      internalize(changelog);
      changelog.querySelector('.section-heading')?.remove();
      const tabs = document.createElement('nav');
      tabs.className = 'development-tabs';
      tabs.innerHTML = '<button type="button" data-development-tab="roadmap" aria-selected="true">ROADMAP</button><button type="button" data-development-tab="changelog" aria-selected="false">CHANGELOG</button>';
      changelogTab = tabs.querySelector('[data-development-tab="changelog"]');
      const roadmapPane = document.createElement('div');
      roadmapPane.dataset.developmentPane = 'roadmap';
      const changelogPane = document.createElement('div');
      changelogPane.dataset.developmentPane = 'changelog';
      changelogPane.hidden = true;
      [...roadmap.children].filter((child) => !child.classList.contains('section-heading')).forEach((child) => roadmapPane.append(child));
      changelogPane.append(...changelog.childNodes);
      roadmap.querySelector('.section-heading')?.after(tabs, roadmapPane, changelogPane);
      changelog.remove();
      tabs.addEventListener('click', (event) => {
        const button = event.target.closest('[data-development-tab]');
        if (!button) return;
        const selected = button.dataset.developmentTab;
        tabs.querySelectorAll('button').forEach((item) => item.setAttribute('aria-selected', String(item === button)));
        roadmapPane.hidden = selected !== 'roadmap';
        changelogPane.hidden = selected !== 'changelog';
      });
      window.addEventListener('sc:open-internal-panel', (event) => { if (event.detail?.panel === 'changelog') changelogTab?.click(); });
    }

    const companion = document.querySelector('#companion');
    if (companion) {
      companion.removeAttribute('data-view');
      companion.hidden = true;
    }

    const initialPage = window.SCCompanionPages?.getPage(location.hash.slice(1));
    if (initialPage?.parentView) {
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('sc:open-internal-panel', { detail: {
          pageId: initialPage.id,
          panel: initialPage.panel,
          parentView: initialPage.parentView
        } }));
      });
    }
  }

  window.addEventListener('sc:dynamic-pages-ready', initialize, { once: true });
}());
