'use strict';

(() => {
  const MAP_MODE_KEY = 'sc-companion-map-presentation';
  const FILTER_KEY = 'sc-companion-map-filters';
  const filterDefaults = { planet: true, moon: true, station: true, location: true, gateway: true };

  function getSavedMapMode() {
    try { return localStorage.getItem(MAP_MODE_KEY) || 'orbital'; } catch { return 'orbital'; }
  }

  function getSavedFilters() {
    try { return { ...filterDefaults, ...JSON.parse(localStorage.getItem(FILTER_KEY) || '{}') }; }
    catch { return { ...filterDefaults }; }
  }

  let mapPresentation = getSavedMapMode();
  let labelFilters = getSavedFilters();
  let selectedTreeLocation = state.start || 'Lorville';

  function installTechnicalShell() {
    const topbar = $('.topbar');
    if (topbar && !$('.build-tag', topbar)) {
      const tag = document.createElement('div');
      tag.className = 'build-tag';
      tag.innerHTML = '<span>SCCT</span><b>OPS CONSOLE</b><small>BUILD 0.4</small>';
      topbar.insertBefore(tag, $('.primary-nav', topbar));
    }

    const mapActions = $('.map-topbar-actions');
    if (mapActions && !$('#mapPresentationSwitch')) {
      const switcher = document.createElement('div');
      switcher.className = 'map-presentation-switch';
      switcher.id = 'mapPresentationSwitch';
      switcher.setAttribute('aria-label', 'Map presentation');
      switcher.innerHTML = `
        <button type="button" data-map-presentation="orbital">Orbital map</button>
        <button type="button" data-map-presentation="tree">Entity tree</button>`;
      mapActions.insertBefore(switcher, mapActions.firstChild);
    }

    const stage = $('#mapStage');
    if (stage && !$('#entityTreePanel')) {
      const panel = document.createElement('div');
      panel.className = 'entity-tree-panel';
      panel.id = 'entityTreePanel';
      panel.innerHTML = '<div class="entity-tree-layout"><div class="entity-tree-browser" id="entityTreeBrowser"></div><aside class="entity-tree-inspector" id="entityTreeInspector"></aside></div>';
      stage.append(panel);
    }

    const workspace = $('#mapWorkspace');
    if (workspace && !$('#mapLabelFilters')) {
      const filters = document.createElement('div');
      filters.className = 'map-label-filters';
      filters.id = 'mapLabelFilters';
      filters.innerHTML = `
        <span>Label visibility</span>
        ${[
          ['planet', 'Planet'], ['moon', 'Moon'], ['station', 'Station'],
          ['location', 'Location'], ['gateway', 'Gateway']
        ].map(([key, label]) => `<button type="button" data-label-filter="${key}">${label}</button>`).join('')}
        <button type="button" class="filter-all" data-filter-all>All</button>`;
      const drawer = $('#contextDrawer');
      workspace.insertBefore(filters, drawer);
    }

    if (!$('#cargoOpsBar')) {
      const opsBar = document.createElement('div');
      opsBar.className = 'cargo-ops-bar';
      opsBar.id = 'cargoOpsBar';
      opsBar.innerHTML = `
        <div class="ops-route-state"><i></i><span id="opsRouteState">NO ACTIVE ROUTE</span></div>
        <nav aria-label="Planner sections">
          <button type="button" data-ops-action="setup">Setup</button>
          <button type="button" data-ops-action="missions">Missions</button>
          <button type="button" data-ops-action="map">Map</button>
          <button type="button" data-ops-action="route">Route</button>
          <button type="button" data-ops-action="active">Active</button>
        </nav>
        <div class="ops-summary"><span id="opsCargoSummary">0 SCU</span><b id="opsStopSummary">0 STOPS</b></div>`;
      document.body.append(opsBar);
    }

    bindShellEvents();
    renderEntityTree();
    applyMapPresentation();
    applyLabelFilters();
    updateOpsBar();
  }

  function bindShellEvents() {
    $$('#mapPresentationSwitch [data-map-presentation]').forEach(button => {
      button.addEventListener('click', () => {
        mapPresentation = button.dataset.mapPresentation;
        try { localStorage.setItem(MAP_MODE_KEY, mapPresentation); } catch {}
        applyMapPresentation();
      });
    });

    $$('#mapLabelFilters [data-label-filter]').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.dataset.labelFilter;
        labelFilters[key] = !labelFilters[key];
        try { localStorage.setItem(FILTER_KEY, JSON.stringify(labelFilters)); } catch {}
        applyLabelFilters();
      });
    });

    $('[data-filter-all]')?.addEventListener('click', () => {
      const allEnabled = Object.values(labelFilters).every(Boolean);
      Object.keys(labelFilters).forEach(key => { labelFilters[key] = !allEnabled; });
      try { localStorage.setItem(FILTER_KEY, JSON.stringify(labelFilters)); } catch {}
      applyLabelFilters();
    });

    $$('#cargoOpsBar [data-ops-action]').forEach(button => {
      button.addEventListener('click', () => {
        const action = button.dataset.opsAction;
        if (action === 'active') return switchView('active');
        switchView('planner');
        const target = {
          setup: '#setupPanel', missions: '.missions-section', map: '#mapWorkspace', route: '#routePanel'
        }[action];
        const node = $(target);
        if (node) node.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      });
    });
  }

  function bodyGroups() {
    const bodies = ['Hurston', 'ArcCorp', 'Crusader', 'microTech'];
    return bodies.map(body => {
      const direct = locations.filter(location => location.parent === body);
      const moonNames = (maps[body] || []).filter(node => node.type === 'Moon').map(node => node.name);
      const moons = moonNames.map(moon => ({ moon, locations: locations.filter(location => location.parent === moon) }));
      return { body, direct, moons };
    });
  }

  function entityIcon(type) {
    if (/Gateway/i.test(type)) return '◇';
    if (/Station/i.test(type)) return '▣';
    if (/Landing/i.test(type)) return '▰';
    if (/Outpost|Facility|Research|Scrapyard/i.test(type)) return '□';
    return '●';
  }

  function treeLocationRow(location, depth = 2) {
    return `<button class="tree-location-row" type="button" data-tree-location="${esc(location.name)}" style="--tree-depth:${depth}">
      <i>${entityIcon(location.type)}</i><span><strong>${esc(location.name)}</strong><small>${esc(location.type)}</small></span>
    </button>`;
  }

  function renderEntityTree() {
    const browser = $('#entityTreeBrowser');
    if (!browser) return;
    const gatewaysList = locations.filter(location => /Gateway/i.test(location.type));
    browser.innerHTML = `
      <div class="tree-toolbar"><div><span class="eyebrow">System entity tree</span><strong>STANTON</strong></div><span>${locations.length} known entities</span></div>
      <div class="tree-root">
        <details open class="tree-system"><summary><i>H</i><span><strong>Stanton</strong><small>System · UEE corporate jurisdiction</small></span><b>OPEN</b></summary>
          <div class="tree-branch">
            <div class="tree-static-row" style="--tree-depth:1"><i>✦</i><span><strong>Stanton</strong><small>G-type main sequence star</small></span></div>
            ${bodyGroups().map(group => `
              <details open class="tree-body"><summary style="--tree-depth:1"><i>●</i><span><strong>${esc(group.body)}</strong><small>Primary planetary body</small></span><b>${group.direct.length + group.moons.reduce((sum, moon) => sum + moon.locations.length, 0)}</b></summary>
                <div class="tree-branch">
                  ${group.direct.map(location => treeLocationRow(location, 2)).join('')}
                  ${group.moons.map(moon => `<details class="tree-moon"><summary style="--tree-depth:2"><i>○</i><span><strong>${esc(moon.moon)}</strong><small>Moon</small></span><b>${moon.locations.length}</b></summary><div class="tree-branch">${moon.locations.map(location => treeLocationRow(location, 3)).join('')}</div></details>`).join('')}
                </div>
              </details>`).join('')}
            <details open class="tree-body"><summary style="--tree-depth:1"><i>◇</i><span><strong>Gateways</strong><small>Inter-system infrastructure</small></span><b>${gatewaysList.length}</b></summary><div class="tree-branch">${gatewaysList.map(location => treeLocationRow(location, 2)).join('')}</div></details>
          </div>
        </details>
      </div>`;

    $$('.tree-location-row', browser).forEach(button => {
      button.addEventListener('click', () => {
        selectedTreeLocation = button.dataset.treeLocation;
        $$('.tree-location-row', browser).forEach(item => item.classList.toggle('is-selected', item === button));
        renderTreeInspector();
      });
    });
    const selected = $(`.tree-location-row[data-tree-location="${CSS.escape(selectedTreeLocation)}"]`, browser) || $('.tree-location-row', browser);
    selected?.classList.add('is-selected');
    renderTreeInspector();
  }

  function serviceProfile(location) {
    const noService = /Brio/i.test(location.name);
    const fullService = /Station|Landing Zone|Outpost|Facility|Research/i.test(location.type) && !noService;
    const danger = /Grim|Brio/i.test(location.name) ? 'HIGH' : /Outpost|Scrapyard/i.test(location.type) ? 'MEDIUM' : 'LOW';
    const traffic = /Station|Landing Zone/i.test(location.type) ? 'HIGH' : 'LOW';
    return { refuel: fullService, repair: fullService, danger, traffic };
  }

  function renderTreeInspector() {
    const root = $('#entityTreeInspector');
    if (!root) return;
    const location = findLocation(selectedTreeLocation) || locations[0];
    const profile = serviceProfile(location);
    root.innerHTML = `
      <div class="tree-inspector-header"><span class="eyebrow">Entity profile</span><h3>${esc(location.name)}</h3><p>${esc(location.system)} / ${esc(location.parent)} / ${esc(location.type)}</p></div>
      <div class="tree-inspector-grid">
        <div><span>Refuel</span><strong class="${profile.refuel ? 'positive' : 'negative'}">${profile.refuel ? 'YES' : 'NO'}</strong></div>
        <div><span>Repair</span><strong class="${profile.repair ? 'positive' : 'negative'}">${profile.repair ? 'YES' : 'NO'}</strong></div>
        <div><span>Traffic</span><strong>${profile.traffic}</strong></div>
        <div><span>Risk</span><strong>${profile.danger}</strong></div>
      </div>
      <div class="tree-inspector-copy"><span>Operational note</span><p>${/Gateway/i.test(location.type) ? 'Inter-system gateway station. Confirm the destination jump point and fuel reserve before departure.' : /Landing Zone/i.test(location.type) ? 'Atmospheric landing zone. Allow additional time for approach, hangar assignment and local transit.' : /Station/i.test(location.type) ? 'Orbital facility with a comparatively short approach and standard landing services.' : 'Surface location. The in-game route may add orbital-marker hops to reach the correct side of the planetary body.'}</p></div>
      <div class="tree-inspector-actions"><button type="button" class="secondary-button" id="treeUseStart">Set as start</button><button type="button" class="primary-button" id="treeFocusMap">Show on map</button></div>`;
    $('#treeUseStart', root)?.addEventListener('click', () => {
      state.start = location.name;
      if (el.start) el.start.value = location.name;
      rememberLocation(location.name);
      markDirty();
      toast(`${location.name} set as starting location.`);
    });
    $('#treeFocusMap', root)?.addEventListener('click', () => {
      mapPresentation = 'orbital';
      applyMapPresentation();
      const parent = ['Hurston', 'Crusader', 'ArcCorp', 'microTech'].includes(location.parent)
        ? location.parent
        : locations.find(item => item.name === location.parent)?.parent;
      if (parent && maps[parent]) focusMap(parent);
    });
  }

  function applyMapPresentation() {
    const workspace = $('#mapWorkspace');
    if (!workspace) return;
    workspace.dataset.presentation = mapPresentation;
    $$('#mapPresentationSwitch [data-map-presentation]').forEach(button => button.classList.toggle('is-active', button.dataset.mapPresentation === mapPresentation));
    const stage = $('#mapStage');
    stage?.classList.toggle('show-entity-tree', mapPresentation === 'tree');
    $('#mapLabelFilters')?.classList.toggle('is-disabled', mapPresentation === 'tree');
    if (mapPresentation === 'tree') renderEntityTree();
  }

  function applyLabelFilters() {
    const workspace = $('#mapWorkspace');
    if (!workspace) return;
    Object.entries(labelFilters).forEach(([key, enabled]) => workspace.classList.toggle(`hide-label-${key}`, !enabled));
    $$('#mapLabelFilters [data-label-filter]').forEach(button => button.classList.toggle('is-active', labelFilters[button.dataset.labelFilter]));
    const all = Object.values(labelFilters).every(Boolean);
    $('[data-filter-all]')?.classList.toggle('is-active', all);
  }

  function updateOpsBar() {
    const route = state.route?.length ? state.route : buildRoute();
    const activeText = state.active && route.length
      ? `ACTIVE · STOP ${Math.min((state.activeStopIndex || 0) + 1, route.length)} / ${route.length}`
      : state.calculated ? 'ROUTE READY' : 'NO ACTIVE ROUTE';
    const routeState = $('#opsRouteState');
    if (routeState) routeState.textContent = activeText;
    const cargo = $('#opsCargoSummary');
    if (cargo) cargo.textContent = `${totalScu()} / ${shipData().scu} SCU`;
    const stops = $('#opsStopSummary');
    if (stops) stops.textContent = `${Math.max(0, route.length - 1)} STOPS`;
    $('#cargoOpsBar')?.classList.toggle('has-active-route', Boolean(state.active));
  }

  const baseRenderMap = window.renderMap;
  window.renderMap = function renderCargoMap() {
    baseRenderMap();
    applyLabelFilters();
    updateOpsBar();
  };

  const baseRenderMissions = window.renderMissions;
  window.renderMissions = function renderCargoMissions() {
    baseRenderMissions();
    updateOpsBar();
  };

  const baseRenderActiveRoute = window.renderActiveRoute;
  window.renderActiveRoute = function renderCargoActiveRoute() {
    baseRenderActiveRoute();
    updateOpsBar();
  };

  const baseSwitchView = window.switchView;
  window.switchView = function switchCargoView(name) {
    baseSwitchView(name);
    document.body.dataset.currentView = name;
    $$('#cargoOpsBar [data-ops-action]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.opsAction === (name === 'active' ? 'active' : 'map'));
    });
    updateOpsBar();
  };

  installTechnicalShell();
})();
