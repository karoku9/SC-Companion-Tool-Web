'use strict';

(function initializeOperationalCockpit(root) {
  let initialized = false;

  function initialize() {
    if (initialized) return true;
    const store = root.SCCompanionSession;
    const corrections = root.SCCompanionRouteCorrections;
    const progressModel = root.SCCompanionRouteProgress;
    const sessionPlanner = root.SCCompanionRouteSessionPlanner;
    const missionModel = root.SCCompanionMissions;
    const locations = root.SCCompanionLocations;
    const mapData = root.SCCompanionStarmapData;
    const navigation = root.SCCompanionNavigationEstimates;
    const shipCatalog = root.SCCompanionShipCatalog;
    const icons = root.SCCompanionMfdIcons;
    const routePage = document.querySelector('.operations-page');
    const grid = routePage?.querySelector('.operations-grid');
    const currentPanel = routePage?.querySelector('.current-operation-panel');
    const sequencePanel = routePage?.querySelector('.route-sequence-panel');
    const tools = routePage?.querySelector('.operations-tools');
    const topbarStatus = document.querySelector('.topbar-status');
    if (!store || !corrections || !progressModel || !sessionPlanner || !missionModel || !locations || !mapData || !navigation || !shipCatalog || !routePage || !grid || !currentPanel || !sequencePanel || !tools || !topbarStatus) return false;
    initialized = true;

    const icon = (name, className = 'ops-icon') => icons?.render?.(name, className) ?? '';
    const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

    function hideLegacyNavigation() {
      document.querySelectorAll('.nav-group[data-nav-group="plan"], .nav-group[data-nav-group="manage"]').forEach((group) => group.remove());
      const mobile = document.querySelector('#mobile-page-select');
      [...(mobile?.options ?? [])].forEach((option) => {
        if (['route-planner', 'map', 'hangar', 'roadmap'].includes(option.value)) option.remove();
      });
    }

    hideLegacyNavigation();

    const quickShip = document.createElement('label');
    quickShip.className = 'quick-ship-control';
    quickShip.innerHTML = `${icon('ship')}<span><small>ACTIVE SHIP</small><select id="quick-ship-select" aria-label="Active ship model"></select></span>`;
    topbarStatus.insertBefore(quickShip, topbarStatus.firstChild);
    const quickShipSelect = quickShip.querySelector('select');

    const sessionBar = document.createElement('section');
    sessionBar.className = 'ops-session-bar';
    sessionBar.innerHTML = `
      <header><span>${icon('clock')}<b>Play sessions</b></span><small id="ops-session-summary">No play plan</small></header>
      <div id="ops-session-tabs" class="ops-session-tabs"></div>`;
    grid.insertBefore(sessionBar, currentPanel);

    const liveNavigation = document.createElement('section');
    liveNavigation.className = 'mfd-panel ops-live-navigation';
    liveNavigation.innerHTML = `
      <header class="ops-live-nav-header">
        <div><small>NAV / NEXT LEG</small><strong id="ops-next-leg-title">No active route</strong></div>
        <span id="ops-next-leg-eta">—</span>
      </header>
      <div class="ops-next-leg-strip" id="ops-next-leg-strip"></div>
      <svg id="ops-live-map" class="ops-live-map" viewBox="0 0 1000 420" role="img" aria-label="Live hauling route map"></svg>
      <footer class="ops-map-legend"><span class="is-complete">Completed</span><span class="is-current">Current</span><span class="is-next">Next</span><span class="is-future">Future</span><span class="is-gateway">Gateway</span></footer>`;
    grid.insertBefore(liveNavigation, tools);

    const actionBar = document.createElement('nav');
    actionBar.className = 'ops-action-bar';
    actionBar.setAttribute('aria-label', 'Operation editing tools');
    actionBar.innerHTML = `
      <button type="button" data-ops-action="add">${icon('plus')}<span><strong>Add missions</strong><small>Paste more contracts</small></span></button>
      <button type="button" data-ops-action="edit">${icon('edit')}<span><strong>Edit missions</strong><small>Review parsed contracts</small></span></button>
      <button type="button" data-ops-action="missions">${icon('missions')}<span><strong>Mission list</strong><small>Remove or inspect</small></span></button>
      <button type="button" data-ops-action="order">${icon('route')}<span><strong>Route order</strong><small>Dependency-safe override</small></span></button>
      <button type="button" data-ops-action="cargo">${icon('cargo')}<span><strong>Cargo</strong><small>Keep current cargo tools</small></span></button>`;
    tools.insertBefore(actionBar, tools.firstChild);
    tools.querySelector('.tool-keys')?.setAttribute('hidden', '');

    const editor = document.createElement('section');
    editor.className = 'mfd-panel ops-editor-drawer';
    editor.hidden = true;
    editor.innerHTML = `
      <header class="mfd-header"><div><small>LIVE SESSION EDITOR</small><strong id="ops-editor-title">Missions</strong></div><button type="button" class="icon-button" id="ops-editor-close" aria-label="Close editor">${icon('close')}</button></header>
      <div id="ops-editor-body" class="ops-editor-body"></div>
      <p id="ops-editor-message" class="ops-editor-message" aria-live="polite"></p>`;
    tools.insertBefore(editor, tools.querySelector('#ops-tool-panel'));
    const editorTitle = editor.querySelector('#ops-editor-title');
    const editorBody = editor.querySelector('#ops-editor-body');
    const editorMessage = editor.querySelector('#ops-editor-message');

    function populateShipSelect() {
      const state = store.getState();
      quickShipSelect.replaceChildren(...shipCatalog.models.map((model) => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = `${model.manufacturer} ${model.model} · ${model.capacityScu} SCU`;
        return option;
      }));
      if (shipCatalog.getModel(state.selectedShipModelId)) quickShipSelect.value = state.selectedShipModelId;
    }

    function ensureShip(modelId) {
      const state = store.getState();
      let ship = (state.hangarShips ?? []).find((entry) => entry.modelId === modelId);
      let hangarShips = state.hangarShips ?? [];
      if (!ship) {
        ship = shipCatalog.createHangarShip({ id: `quick-${modelId}`, modelId, quantumDrive: 'Stock', quantumTimeFactor: 1 });
        hangarShips = [...hangarShips, ship];
      }
      store.patch({ hangarShips, selectedShipId: ship.id, selectedShipModelId: modelId });
      return ship;
    }

    function activeRouteState(state) {
      const route = corrections.deriveRoute(state.route, state.routeCorrections);
      const progress = progressModel.derive(route, state.completedStopIds, state.currentStopIndex);
      return { route, progress };
    }

    function missionToText(mission) {
      const lines = [mission.title || 'Mission'];
      if (mission.contractor) lines.push(`contractor ${mission.contractor}`);
      if (Number(mission.rewardAuec) > 0) lines.push(`paga ${Number(mission.rewardAuec).toLocaleString('en-US')} aUEC`);
      (mission.cargoLots ?? []).forEach((lot) => {
        const locationsText = (lot.pickupLocations ?? [{ label: lot.pickupLocationLabel }]).map((location) => location.label).join(' + ');
        const total = lot.sharedPickupTotal ? ' totale' : '';
        lines.push(`${lot.pickupType ?? 'collect'} ${locationsText} ${lot.scu}scu ${lot.commodity}${total}`);
        lines.push(`deliver ${lot.deliveryLocationLabel} ${lot.scu}scu ${lot.commodity}`);
      });
      (mission.objectives ?? []).forEach((objective) => lines.push(`${objective.type} ${objective.locationLabel} ${objective.label}`));
      return lines.join('\n');
    }

    function missionsToText(missions) {
      return missions.map(missionToText).join('\n\n');
    }

    function rebuildPlan(missions, overrides = {}) {
      const state = store.getState();
      if (!missions.length) {
        store.patch({ missions: [], missionText: '', routePlan: null, route: null, currentStopIndex: 0, completedStopIds: [], routeCorrections: null });
        return;
      }
      const startLocationId = overrides.startLocationId ?? state.routeStartLocationId;
      if (!startLocationId) throw new Error('Set the current location in Missions before rebuilding the route.');
      const ship = ensureShip(overrides.modelId ?? state.selectedShipModelId);
      const routePlan = sessionPlanner.plan(missions, missionModel, {
        startLocationId,
        selectedShipId: ship.id,
        targetMinutes: Number(overrides.targetMinutes ?? state.sessionTargetMinutes ?? 60),
        mode: overrides.mode ?? state.routeMode ?? 'sessions'
      });
      const index = Math.min(Number(state.activeRouteSessionIndex ?? 0), routePlan.sessions.length - 1);
      const session = routePlan.sessions[Math.max(0, index)];
      store.patch({
        missions,
        missionText: missionsToText(missions),
        routePlan,
        activeRouteSessionIndex: session.index,
        route: session.route,
        currentStopIndex: 0,
        completedStopIds: [],
        routeCorrections: null,
        cargoCorrections: {}
      });
    }

    function openMissions(mode) {
      document.querySelector('[data-view-target="missions"]')?.click();
      root.dispatchEvent(new CustomEvent(mode === 'add' ? 'sc:add-current-missions' : 'sc:edit-current-missions'));
    }

    function activateSession(index) {
      const state = store.getState();
      const session = state.routePlan?.sessions?.[index];
      if (!session) return;
      store.patch({
        activeRouteSessionIndex: index,
        route: session.route,
        currentStopIndex: 0,
        completedStopIds: [],
        routeCorrections: null,
        cargoCorrections: {}
      });
    }

    function routeGatewayForStop(route, stop) {
      return (route.gatewaySegments ?? []).filter((segment) => String(segment.stopId) === String(stop?.id));
    }

    function routeLeg(previousStop, nextStop, state) {
      if (!nextStop) return null;
      if (!previousStop) {
        const startId = state.routeStartLocationId ?? state.route?.optimization?.startLocationId;
        if (!startId) return null;
        return navigation.estimateLeg(startId, nextStop.locationId, { quantumTimeFactor: 1 });
      }
      return navigation.estimateLeg(previousStop.locationId, nextStop.locationId, { quantumTimeFactor: 1 });
    }

    function renderSessionBar(state) {
      const tabs = sessionBar.querySelector('#ops-session-tabs');
      const summary = sessionBar.querySelector('#ops-session-summary');
      tabs.replaceChildren();
      const sessions = state.routePlan?.sessions ?? [];
      if (!sessions.length) {
        summary.textContent = 'Generate missions to create time-boxed sessions';
        tabs.innerHTML = '<span class="ops-session-empty">No sessions</span>';
        return;
      }
      summary.textContent = `${sessions.length} session${sessions.length === 1 ? '' : 's'} · target ${state.sessionTargetMinutes ?? 60} min`;
      sessions.forEach((session, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.sessionIndex = String(index);
        button.className = Number(state.activeRouteSessionIndex ?? 0) === index ? 'is-active' : '';
        button.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><b>${session.missionCount} mission${session.missionCount === 1 ? '' : 's'}</b><small>${Math.round(session.estimate.minMinutes)}–${Math.round(session.estimate.maxMinutes)} min · ${session.estimate.peakOnboardScu} SCU peak</small>`;
        tabs.append(button);
      });
    }

    function pointType(stop) {
      const hasPickup = stop.operations.some((operation) => operation.type !== 'delivery');
      const hasDelivery = stop.operations.some((operation) => operation.type === 'delivery');
      return hasPickup && hasDelivery ? 'mixed' : hasPickup ? 'pickup' : 'delivery';
    }

    function routeMapPoints(route, progress) {
      const stops = route?.stops ?? [];
      if (!stops.length) return [];
      const anchors = stops.map((stop) => mapData.getLocationAnchor(stop.locationId));
      const systems = [...new Set(anchors.map((anchor) => anchor?.systemId ?? 'unknown'))];
      const systemIndex = new Map(systems.map((systemId, index) => [systemId, index]));
      const counts = new Map();
      return stops.map((stop, index) => {
        const anchor = anchors[index];
        const localIndex = counts.get(anchor?.systemId ?? 'unknown') ?? 0;
        counts.set(anchor?.systemId ?? 'unknown', localIndex + 1);
        const systemSlot = systemIndex.get(anchor?.systemId ?? 'unknown') ?? 0;
        const x = systems.length === 1
          ? 90 + (index / Math.max(1, stops.length - 1)) * 820
          : 100 + (systemSlot / Math.max(1, systems.length - 1)) * 800 + ((localIndex % 3) - 1) * 52;
        const position = anchor?.position ?? [0, 0, 0];
        const y = 210 + Math.max(-135, Math.min(135, Number(position[2] ?? 0) * 2.2)) + ((localIndex % 2) ? 24 : -18);
        const completed = progress.completedSet.has(String(stop.id));
        const current = String(progress.currentStop?.id) === String(stop.id);
        const activeIndex = progress.currentStop ? stops.findIndex((item) => String(item.id) === String(progress.currentStop.id)) : stops.length;
        return { stop, anchor, index, x, y, completed, current, next: index === activeIndex + 1, type: pointType(stop) };
      });
    }

    function mapNode(point) {
      const status = point.completed ? 'complete' : point.current ? 'current' : point.next ? 'next' : 'future';
      const compact = point.stop.locationLabel.length > 24 ? `${point.stop.locationLabel.slice(0, 22)}…` : point.stop.locationLabel;
      return `<g class="ops-map-node is-${status} is-${point.type}" transform="translate(${point.x} ${point.y})" data-stop-id="${escapeHtml(point.stop.id)}">
        <circle r="${point.current ? 15 : 11}"></circle>
        <text class="ops-map-index" text-anchor="middle" y="4">${point.index + 1}</text>
        <text class="ops-map-label" text-anchor="middle" y="${point.y > 315 ? -22 : 30}">${escapeHtml(compact)}</text>
      </g>`;
    }

    function gatewayNodes(route, points) {
      return (route.gatewaySegments ?? []).flatMap((segment) => {
        const destination = points.find((point) => String(point.stop.id) === String(segment.stopId));
        if (!destination || destination.index === 0) return [];
        const source = points[destination.index - 1];
        if (!source) return [];
        const firstX = source.x + (destination.x - source.x) * 0.38;
        const secondX = source.x + (destination.x - source.x) * 0.62;
        const firstY = source.y + (destination.y - source.y) * 0.38;
        const secondY = source.y + (destination.y - source.y) * 0.62;
        return [
          `<g class="ops-map-gateway" transform="translate(${firstX} ${firstY})"><rect x="-8" y="-8" width="16" height="16" transform="rotate(45)"></rect><text y="-17" text-anchor="middle">${escapeHtml(segment.fromGateway)}</text></g>`,
          `<g class="ops-map-gateway" transform="translate(${secondX} ${secondY})"><rect x="-8" y="-8" width="16" height="16" transform="rotate(45)"></rect><text y="25" text-anchor="middle">${escapeHtml(segment.toGateway)}</text></g>`
        ];
      }).join('');
    }

    function renderLiveMap(state, route, progress) {
      const svg = liveNavigation.querySelector('#ops-live-map');
      const title = liveNavigation.querySelector('#ops-next-leg-title');
      const eta = liveNavigation.querySelector('#ops-next-leg-eta');
      const strip = liveNavigation.querySelector('#ops-next-leg-strip');
      const points = routeMapPoints(route, progress);
      if (!points.length) {
        title.textContent = 'No active route';
        eta.textContent = '—';
        strip.innerHTML = '<span class="ops-nav-empty">Build a play session from Missions.</span>';
        svg.innerHTML = '<text x="500" y="210" text-anchor="middle" class="ops-map-empty">NO ACTIVE ROUTE</text>';
        return;
      }

      const activeIndex = progress.currentStop ? route.stops.findIndex((stop) => String(stop.id) === String(progress.currentStop.id)) : route.stops.length;
      const current = progress.currentStop ?? route.stops.at(-1);
      const next = progress.complete ? null : route.stops[activeIndex + 1] ?? null;
      const previous = activeIndex > 0 ? route.stops[activeIndex - 1] : null;
      const target = next ?? current;
      const from = next ? current : previous;
      const leg = routeLeg(from, target, state);
      const gateways = routeGatewayForStop(route, target);
      title.textContent = next ? `${current.locationLabel} → ${next.locationLabel}` : progress.complete ? 'Session complete' : `${state.routeStartLocationLabel ?? 'Start'} → ${current.locationLabel}`;
      eta.textContent = leg ? `${leg.minMinutes}–${leg.maxMinutes} min` : 'Start stop';
      strip.innerHTML = `
        <span class="ops-nav-chip">${icon('navigation')}<b>${escapeHtml(leg?.distanceLabel ?? 'Session start')}</b></span>
        ${gateways.map((gateway) => `<span class="ops-nav-chip is-gateway">${icon('gateway')}<b>${escapeHtml(gateway.fromGateway)}</b><i>→</i><b>${escapeHtml(gateway.toGateway)}</b></span>`).join('')}
        <span class="ops-nav-chip">${icon('pin')}<b>${escapeHtml(target?.locationLabel ?? 'No destination')}</b></span>`;

      const systemBands = [...new Set(points.map((point) => point.anchor?.systemId ?? 'unknown'))].map((systemId, index, systems) => {
        const system = mapData.getSystem(systemId);
        const x = systems.length === 1 ? 500 : 100 + (index / Math.max(1, systems.length - 1)) * 800;
        return `<g class="ops-map-system"><circle cx="${x}" cy="210" r="150"></circle><text x="${x}" y="44" text-anchor="middle">${escapeHtml(system?.name ?? systemId)}</text></g>`;
      }).join('');
      const lines = points.slice(1).map((point, index) => {
        const previousPoint = points[index];
        const active = point.current || point.next;
        return `<line class="ops-map-leg${active ? ' is-active' : ''}${point.completed ? ' is-complete' : ''}" x1="${previousPoint.x}" y1="${previousPoint.y}" x2="${point.x}" y2="${point.y}"></line>`;
      }).join('');
      svg.innerHTML = `<defs><pattern id="ops-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none"></path></pattern><filter id="ops-glow"><feGaussianBlur stdDeviation="3" result="blur"></feGaussianBlur><feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter></defs><rect width="1000" height="420" class="ops-map-grid"></rect>${systemBands}${lines}${gatewayNodes(route, points)}${points.map(mapNode).join('')}`;
    }

    function decorateIntel() {
      const iconById = {
        travel: 'navigation', approach: 'pin', risk: 'shield', hangars: 'hangar',
        'landing-services': 'fuel', food: 'food', medical: 'medical'
      };
      document.querySelectorAll('.current-stop-intel-card').forEach((card) => {
        if (card.querySelector('.intel-icon')) return;
        const iconName = iconById[card.dataset.intel] ?? 'operations';
        const wrapper = document.createElement('span');
        wrapper.className = 'intel-icon';
        wrapper.innerHTML = icon(iconName);
        card.prepend(wrapper);
        const detail = card.querySelector(':scope > span:not(.intel-icon)');
        if (detail) {
          card.title = detail.textContent.trim();
          card.setAttribute('aria-label', `${card.querySelector('small')?.textContent ?? ''}: ${card.querySelector('strong')?.textContent ?? ''}. ${detail.textContent}`);
        }
      });
    }

    function renderMissionManager(state) {
      editorTitle.textContent = 'Active missions';
      editorBody.innerHTML = '<div class="ops-manager-list"></div>';
      const list = editorBody.querySelector('.ops-manager-list');
      if (!state.missions?.length) {
        list.innerHTML = '<div class="tool-empty">No missions in this session.</div>';
        return;
      }
      state.missions.forEach((mission, index) => {
        const cargoScu = (mission.cargoLots ?? []).reduce((sum, lot) => sum + Number(lot.scu ?? 0), 0);
        const article = document.createElement('article');
        article.className = 'ops-manager-mission';
        article.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><div><strong>${escapeHtml(mission.title)}</strong><small>${cargoScu} SCU · ${mission.rewardAuec ? `${Number(mission.rewardAuec).toLocaleString('en-US')} aUEC` : 'No payout'}</small></div><button type="button" data-edit-mission="${escapeHtml(mission.id)}" aria-label="Edit ${escapeHtml(mission.title)}">${icon('edit')}</button><button type="button" data-remove-mission="${escapeHtml(mission.id)}" aria-label="Remove ${escapeHtml(mission.title)}">${icon('trash')}</button>`;
        list.append(article);
      });
    }

    function renderOrderManager(state) {
      editorTitle.textContent = 'Route order';
      const { route, progress } = activeRouteState(state);
      editorBody.innerHTML = '<div class="ops-order-list"></div>';
      const list = editorBody.querySelector('.ops-order-list');
      (route?.allStops ?? []).forEach((stop, index, allStops) => {
        const complete = progress.completedSet.has(String(stop.id));
        const row = document.createElement('article');
        row.className = `ops-order-row${complete ? ' is-complete' : ''}`;
        row.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><div><strong>${escapeHtml(stop.locationLabel)}</strong><small>${stop.operations.length} operation${stop.operations.length === 1 ? '' : 's'}${complete ? ' · completed' : ''}</small></div><button type="button" data-move-stop="${escapeHtml(stop.id)}" data-delta="-1" ${index === 0 || complete ? 'disabled' : ''} aria-label="Move up">${icon('chevronUp')}</button><button type="button" data-move-stop="${escapeHtml(stop.id)}" data-delta="1" ${index === allStops.length - 1 || complete ? 'disabled' : ''} aria-label="Move down">${icon('chevronDown')}</button>`;
        list.append(row);
      });
    }

    function openEditor(kind) {
      editor.hidden = false;
      editor.dataset.mode = kind;
      editorMessage.textContent = '';
      const state = store.getState();
      if (kind === 'missions') renderMissionManager(state);
      else renderOrderManager(state);
      editor.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function render(state) {
      renderSessionBar(state);
      if (state.route?.stops?.length) {
        const { route, progress } = activeRouteState(state);
        renderLiveMap(state, route, progress);
      } else renderLiveMap(state, null, { completedSet: new Set(), currentStop: null, complete: false });
      requestAnimationFrame(decorateIntel);
      if (!editor.hidden) {
        if (editor.dataset.mode === 'missions') renderMissionManager(state);
        else renderOrderManager(state);
      }
      populateShipSelect();
    }

    sessionBar.addEventListener('click', (event) => {
      const button = event.target.closest('[data-session-index]');
      if (button) activateSession(Number(button.dataset.sessionIndex));
    });

    actionBar.addEventListener('click', (event) => {
      const action = event.target.closest('[data-ops-action]')?.dataset.opsAction;
      if (action === 'add') openMissions('add');
      if (action === 'edit') openMissions('edit');
      if (action === 'missions') openEditor('missions');
      if (action === 'order') openEditor('order');
      if (action === 'cargo') tools.querySelector('[data-ops-tool="cargo"]')?.click();
    });

    editor.querySelector('#ops-editor-close').addEventListener('click', () => { editor.hidden = true; });
    editorBody.addEventListener('click', (event) => {
      const remove = event.target.closest('[data-remove-mission]');
      if (remove) {
        const state = store.getState();
        const missions = (state.missions ?? []).filter((mission) => String(mission.id) !== String(remove.dataset.removeMission));
        try {
          rebuildPlan(missions);
          editorMessage.textContent = 'Mission removed and sessions rebuilt.';
          editorMessage.dataset.state = 'ready';
        } catch (error) {
          editorMessage.textContent = error.message;
          editorMessage.dataset.state = 'error';
        }
        return;
      }
      if (event.target.closest('[data-edit-mission]')) {
        openMissions('edit');
        return;
      }
      const move = event.target.closest('[data-move-stop]');
      if (move) {
        const state = store.getState();
        try {
          const next = corrections.changeOrder(state.route, state.routeCorrections, move.dataset.moveStop, Number(move.dataset.delta), state.completedStopIds ?? []);
          store.patch({ routeCorrections: next });
          editorMessage.textContent = 'Route order updated.';
          editorMessage.dataset.state = 'ready';
        } catch (error) {
          editorMessage.textContent = error.message;
          editorMessage.dataset.state = 'error';
        }
      }
    });

    quickShipSelect.addEventListener('change', () => {
      try {
        const state = store.getState();
        ensureShip(quickShipSelect.value);
        if (state.missions?.length && state.routeStartLocationId) rebuildPlan(state.missions, { modelId: quickShipSelect.value });
      } catch (error) {
        quickShip.title = error.message;
      }
    });

    root.addEventListener('sc:session-change', (event) => render(event.detail));
    root.addEventListener('hashchange', hideLegacyNavigation);
    populateShipSelect();
    render(store.getState());
    return true;
  }

  const observer = new MutationObserver(() => {
    if (initialize()) observer.disconnect();
  });
  if (!initialize()) observer.observe(document.documentElement, { childList: true, subtree: true });
}(typeof globalThis !== 'undefined' ? globalThis : window));