'use strict';

(function prepareWorkspaceConsolidation() {
  function initialize() {
    const route = document.querySelector('#route');
    const routeLayout = route?.querySelector('.route-layout');
    const loadOperations = document.querySelector('#load-operations');
    const cargo = document.querySelector('#cargo');
    const corrections = loadOperations?.querySelector('.correction-panel');
    const routeCorrections = route?.querySelector('.route-correction-panel');
    const icons = window.SCCompanionMfdIcons;
    if (!route || !routeLayout || !loadOperations || !cargo) return;

    const icon = (name) => icons?.render(name, 'mfd-icon') ?? '';
    const routeHeading = route.querySelector('.section-heading');
    if (routeHeading) {
      const eyebrow = routeHeading.querySelector('.eyebrow');
      const heading = routeHeading.querySelector('h2');
      if (eyebrow) eyebrow.textContent = 'Flight deck / live session';
      if (heading) heading.textContent = 'Current operation';
    }
    const fleetHeading = document.querySelector('#hangar .section-heading h2');
    if (fleetHeading) fleetHeading.textContent = 'Ships and configuration';

    function internalize(section) {
      section.removeAttribute('data-view');
      section.hidden = false;
      section.classList.remove('app-view', 'section-block');
      section.classList.add('workspace-tool-content');
    }

    const workspace = document.createElement('div');
    workspace.className = 'operations-mfd-frame';
    const mainColumn = document.createElement('div');
    mainColumn.className = 'operations-main-column';
    routeLayout.before(workspace);
    mainColumn.append(routeLayout);
    workspace.append(mainColumn);

    const tools = document.createElement('section');
    tools.className = 'operations-workspace-tools';
    tools.innerHTML = `
      <div class="operations-command-strip" aria-label="Operational tools">
        <button type="button" data-open-workspace-panel="moves" aria-pressed="false">${icon('moves')}<span><small>Moves</small><strong id="workspace-move-preview">No active cargo moves</strong></span></button>
        <button type="button" data-open-workspace-panel="cargo" aria-pressed="false">${icon('cargo')}<span><small>Cargo</small><strong id="workspace-cargo-preview">0 SCU onboard</strong></span></button>
        <button type="button" data-open-workspace-panel="corrections" aria-pressed="false">${icon('corrections')}<span><small>Adjust</small><strong>Actual cargo state</strong></span></button>
        <button type="button" data-open-workspace-panel="route-tools" aria-pressed="false">${icon('route')}<span><small>Route</small><strong>Skip, lock, reorder</strong></span></button>
      </div>
      <div class="workspace-drawer-backdrop" hidden></div>
      <aside class="workspace-drawer" aria-label="Operational tools" hidden>
        <header class="workspace-drawer-header">
          <div class="workspace-drawer-identity"><span class="workspace-drawer-icon">${icon('moves')}</span><div><small>Auxiliary display</small><h2 id="workspace-drawer-title">Moves</h2></div></div>
          <div class="workspace-drawer-actions"><button type="button" id="workspace-drawer-expand" aria-pressed="false">${icon('expand')}<span>Full screen</span></button><button type="button" id="workspace-drawer-close">${icon('close')}<span>Close</span></button></div>
        </header>
        <nav class="workspace-drawer-tabs" aria-label="Operational tool panels">
          <button type="button" data-workspace-tab="moves">${icon('moves')}<span>Moves</span></button>
          <button type="button" data-workspace-tab="cargo">${icon('cargo')}<span>Cargo</span></button>
          <button type="button" data-workspace-tab="corrections">${icon('corrections')}<span>Corrections</span></button>
          <button type="button" data-workspace-tab="route-tools">${icon('route')}<span>Route</span></button>
        </nav>
        <div class="workspace-drawer-body">
          <div data-workspace-pane="moves"></div>
          <div data-workspace-pane="cargo" hidden></div>
          <div data-workspace-pane="corrections" hidden></div>
          <div data-workspace-pane="route-tools" hidden></div>
        </div>
      </aside>`;

    const commandStrip = tools.querySelector('.operations-command-strip');
    mainColumn.append(commandStrip);
    workspace.append(tools);

    const drawer = tools.querySelector('.workspace-drawer');
    const backdrop = tools.querySelector('.workspace-drawer-backdrop');
    const title = tools.querySelector('#workspace-drawer-title');
    const drawerIcon = tools.querySelector('.workspace-drawer-icon');
    const expand = tools.querySelector('#workspace-drawer-expand');
    const close = tools.querySelector('#workspace-drawer-close');
    const pane = (id) => tools.querySelector(`[data-workspace-pane="${id}"]`);
    const dockedMedia = window.matchMedia('(min-width: 1260px)');

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

    const labels = {
      moves: { title: 'Move queue', icon: 'moves' },
      cargo: { title: 'Cargo hold', icon: 'cargo' },
      corrections: { title: 'Cargo corrections', icon: 'corrections' },
      'route-tools': { title: 'Route tools', icon: 'route' }
    };

    function updateBodyLock() {
      const shouldLock = !drawer.hidden && (!dockedMedia.matches || drawer.classList.contains('is-expanded'));
      document.body.classList.toggle('workspace-drawer-open', shouldLock);
    }

    function openPanel(panelId = 'moves') {
      const resolved = pane(panelId) ? panelId : 'moves';
      const descriptor = labels[resolved];
      drawer.hidden = false;
      backdrop.hidden = false;
      workspace.classList.add('has-utility-panel');
      tools.classList.add('is-open');
      title.textContent = descriptor.title;
      drawerIcon.innerHTML = icon(descriptor.icon);
      tools.querySelectorAll('[data-workspace-pane]').forEach((element) => { element.hidden = element.dataset.workspacePane !== resolved; });
      tools.querySelectorAll('[data-workspace-tab]').forEach((button) => button.setAttribute('aria-selected', String(button.dataset.workspaceTab === resolved)));
      commandStrip.querySelectorAll('[data-open-workspace-panel]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.openWorkspacePanel === resolved)));
      updateBodyLock();
    }

    function closePanel() {
      drawer.hidden = true;
      backdrop.hidden = true;
      workspace.classList.remove('has-utility-panel');
      tools.classList.remove('is-open');
      drawer.classList.remove('is-expanded');
      expand.setAttribute('aria-pressed', 'false');
      expand.querySelector('span').textContent = 'Full screen';
      commandStrip.querySelectorAll('[data-open-workspace-panel]').forEach((button) => button.setAttribute('aria-pressed', 'false'));
      updateBodyLock();
    }

    commandStrip.addEventListener('click', (event) => {
      const opener = event.target.closest('[data-open-workspace-panel]');
      if (!opener) return;
      const alreadyOpen = !drawer.hidden && opener.getAttribute('aria-pressed') === 'true' && dockedMedia.matches;
      if (alreadyOpen) closePanel(); else openPanel(opener.dataset.openWorkspacePanel);
    });
    tools.querySelector('.workspace-drawer-tabs').addEventListener('click', (event) => {
      const tab = event.target.closest('[data-workspace-tab]');
      if (tab) openPanel(tab.dataset.workspaceTab);
    });
    backdrop.addEventListener('click', closePanel);
    close.addEventListener('click', closePanel);
    expand.addEventListener('click', () => {
      const expanded = drawer.classList.toggle('is-expanded');
      expand.setAttribute('aria-pressed', String(expanded));
      expand.querySelector('span').textContent = expanded ? 'Restore' : 'Full screen';
      updateBodyLock();
    });
    window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !drawer.hidden) closePanel(); });
    if (typeof dockedMedia.addEventListener === 'function') dockedMedia.addEventListener('change', updateBodyLock);
    else dockedMedia.addListener(updateBodyLock);
    window.addEventListener('sc:open-internal-panel', (event) => {
      if (event.detail?.parentView === 'route') openPanel(event.detail.panel === 'companion' ? 'moves' : event.detail.panel);
    });

    const movePreview = commandStrip.querySelector('#workspace-move-preview');
    const cargoPreview = commandStrip.querySelector('#workspace-cargo-preview');
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
      locationDetails.innerHTML = `<summary>${icon('starmap')}<span><small>Location intel</small><strong>Services and arrival context</strong></span><em>Expand</em></summary><div class="contextual-tool-body"></div>`;
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
      if (roadmapTitle) roadmapTitle.textContent = 'Release path to v1.0';
      if (help) help.textContent = 'Versions progress from left to right. Each card contains only the changes delivered by that release.';
      internalize(changelog);
      changelog.querySelector('.section-heading')?.remove();
      const tabs = document.createElement('nav');
      tabs.className = 'development-tabs';
      tabs.innerHTML = '<button type="button" data-development-tab="roadmap" aria-selected="true">Roadmap</button><button type="button" data-development-tab="changelog" aria-selected="false">Changelog</button>';
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
      requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('sc:open-internal-panel', { detail: {
        pageId: initialPage.id,
        panel: initialPage.panel,
        parentView: initialPage.parentView
      } })));
    }
  }

  window.addEventListener('sc:dynamic-pages-ready', initialize, { once: true });
}());