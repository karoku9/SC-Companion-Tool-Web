'use strict';

(function initializeCleanInterface() {
  const store = window.SCCompanionSession;
  const catalog = window.SCCompanionShipCatalog;
  const zoneModel = window.SCCompanionCargoZones;
  const planner = window.SCCompanionCargoPlanner;
  const cargoState = window.SCCompanionCargoState;
  const cargoLayout = window.SCCompanionCargoLayout;
  const routeCorrections = window.SCCompanionRouteCorrections;
  const routeProgress = window.SCCompanionRouteProgress;
  const locationContext = window.SCCompanionLocationContext;
  if (!store || !catalog || !zoneModel || !planner || !cargoState || !cargoLayout || !routeCorrections || !routeProgress || !locationContext) return;

  const toolPanel = document.querySelector('#ops-tool-panel');
  const toolBody = document.querySelector('#ops-tool-body');
  const toolTitle = document.querySelector('#ops-tool-title');
  const toolClose = document.querySelector('#ops-tool-close');
  const toolExpand = document.querySelector('#ops-tool-expand');
  const toolButtons = [...document.querySelectorAll('[data-ops-tool]')];
  const globalStatus = document.querySelector('#global-route-status');
  const movePreview = document.querySelector('#workspace-move-preview');
  const cargoPreview = document.querySelector('#workspace-cargo-preview');
  const missionCount = document.querySelector('#mission-summary-count');
  let activeTool = null;
  let lastMessage = '';

  const toolLabels = Object.freeze({ moves: 'Current moves', cargo: 'Cargo manifest', adjust: 'Cargo corrections', route: 'Route controls' });

  function placementPriority(locationId) {
    return locationContext.placementPriority(locationId);
  }

  function activeShip(state) {
    return (state.hangarShips ?? []).find((ship) => ship.id === state.selectedShipId) ?? null;
  }

  function activeModel(state) {
    const ship = activeShip(state);
    const base = catalog.getModel(ship?.modelId ?? state.selectedShipModelId) ?? catalog.models[0];
    const resolved = zoneModel.resolveModel(base, ship, state.cargoZoneOverrides);
    return { ship, model: Object.freeze({ ...resolved, offGridAllowanceScu: Math.max(0, Number(state.routePlannerSettings?.offGridAllowanceScu ?? 0)) }) };
  }

  function derive(state) {
    if (!state.route?.stops?.length) {
      const { ship, model } = activeModel(state);
      return { state, ship, model, route: null, progress: null, lifecycle: cargoState.deriveCargoState(null), plan: null, assignments: new Map(), planError: '', locationIntel: null };
    }
    const route = routeCorrections.deriveRoute(state.route, state.routeCorrections);
    const progress = routeProgress.derive(route, state.completedStopIds, state.currentStopIndex);
    const lifecycle = cargoState.deriveCargoState(route, progress.completedStopIds, state.cargoCorrections);
    const { ship, model } = activeModel(state);
    let plan = null;
    let planError = '';
    try { plan = planner.planCargo(route, model, placementPriority); } catch (error) { planError = error.message; }
    const assignments = new Map();
    plan?.assignments.forEach((assignment) => { if (!assignments.has(assignment.cargoKey)) assignments.set(assignment.cargoKey, assignment); });
    const current = progress.currentStop;
    const locationIntel = current ? locationContext.buildContext(current.locationId, {
      onboardScu: lifecycle.totals.onboardScu,
      label: current.locationLabel
    }) : null;
    return { state, ship, model, route, progress, lifecycle, plan, assignments, planError, locationIntel };
  }

  function positionText(context, lot) {
    const assignment = context.assignments.get(lot?.key);
    if (!assignment) return 'Position pending';
    if (assignment.offGrid) return 'Off-grid staging';
    const position = cargoLayout.locateSlot(context.model, assignment.planSlotIndex);
    return position ? `${position.zoneLabel} · Layer ${position.layer + 1}` : 'Position pending';
  }

  function summaryStrip(lifecycle) {
    return `<div class="tool-summary-strip">
      <article><small>Pending</small><strong>${lifecycle.totals.pendingScu}</strong><span>SCU</span></article>
      <article><small>Onboard</small><strong>${lifecycle.totals.onboardScu}</strong><span>SCU</span></article>
      <article><small>Delivered</small><strong>${lifecycle.totals.deliveredScu}</strong><span>SCU</span></article>
      <article><small>Lost</small><strong>${lifecycle.totals.lostScu}</strong><span>SCU</span></article>
    </div>`;
  }

  function contextBanner(context) {
    const intel = context.locationIntel;
    if (!intel) return '';
    const reason = intel.exposure.reasons[0] ?? 'No derived cargo guidance is available.';
    return `<section class="location-context-inline is-${intel.exposure.level}" data-location-context="${intel.locationId}">
      <strong>${intel.exposure.label}</strong>
      <span>${intel.label} · ${intel.confidence.label} · ${intel.freshness.label}</span>
      <small>${reason}</small>
    </section>`;
  }

  function renderMoves(context) {
    if (!context.route) return '<div class="tool-empty">Generate a session to create pickup and drop-off instructions.</div>';
    const moves = context.lifecycle.currentMoves;
    const moveRows = moves.length ? moves.map((move) => {
      const lot = move.lot;
      const action = move.action === 'unload' ? 'DROP OFF' : 'PICK UP';
      const detail = move.action === 'unload'
        ? `From ${lot?.originLocationLabel ?? move.operation.originLocationLabel ?? 'origin'}`
        : `To ${lot?.deliveryLocationLabel ?? move.operation.destinationLocationLabel ?? 'destination'}`;
      return `<article class="move-item is-${move.action}">
        <strong class="action-code">${action}</strong>
        <b>${lot?.scu ?? move.operation.scu} SCU ${lot?.commodity ?? move.operation.commodity}</b>
        <span>${detail}</span>
        <small>${positionText(context, lot)} · ${lot?.missionTitle ?? move.operation.missionTitle}</small>
      </article>`;
    }).join('') : '<div class="tool-empty">No cargo movement at the current stop.</div>';

    const onboardRows = context.lifecycle.onboardLots.length ? context.lifecycle.onboardLots.map((lot) => `
      <article class="manifest-item">
        <b>${lot.scu} SCU ${lot.commodity}</b>
        <span>To ${lot.deliveryLocationLabel}</span>
        <small>${positionText(context, lot)} · ${lot.missionTitle}</small>
        <em>${lot.corrected ? 'Corrected' : 'Onboard'}</em>
      </article>`).join('') : '<div class="tool-empty">The mission hold is currently clear.</div>';

    return `${summaryStrip(context.lifecycle)}${contextBanner(context)}
      <div class="tool-section-title"><strong>Current stop queue</strong><small>${moves.length} move${moves.length === 1 ? '' : 's'}</small></div>
      <div class="move-table">${moveRows}</div>
      <div class="tool-section-title"><strong>Onboard now</strong><small>${context.lifecycle.totals.onboardScu} SCU</small></div>
      <div class="manifest-table">${onboardRows}</div>`;
  }

  function zoneUsage(context) {
    const zones = cargoLayout.getZones(context.model);
    const usage = new Map(zones.map((zone) => [zone.id, 0]));
    let offGrid = 0;
    const onboardKeys = new Set(context.lifecycle.onboardLots.map((lot) => lot.key));
    context.plan?.assignments.forEach((assignment) => {
      if (!onboardKeys.has(assignment.cargoKey)) return;
      if (assignment.offGrid) { offGrid += assignment.scuShare ?? 1; return; }
      const position = cargoLayout.locateSlot(context.model, assignment.planSlotIndex);
      if (position) usage.set(position.zoneId, (usage.get(position.zoneId) ?? 0) + (assignment.scuShare ?? 1));
    });
    return { zones, usage, offGrid };
  }

  function renderCargo(context) {
    if (!context.route) return '<div class="tool-empty">Generate a session to create a cargo manifest.</div>';
    const manifest = context.lifecycle.onboardLots.length ? context.lifecycle.onboardLots.map((lot) => `
      <article class="manifest-item">
        <b>${lot.scu} SCU ${lot.commodity}</b>
        <span>${lot.originLocationLabel} → ${lot.deliveryLocationLabel}</span>
        <small>${positionText(context, lot)} · ${lot.missionTitle}</small>
        <em>${lot.status}</em>
      </article>`).join('') : '<div class="tool-empty">No mission cargo is onboard.</div>';
    const { zones, usage, offGrid } = zoneUsage(context);
    const bars = zones.map((zone) => {
      const used = usage.get(zone.id) ?? 0;
      const percent = Math.min(100, zone.capacityScu ? used / zone.capacityScu * 100 : 0);
      return `<div class="zone-bar"><label title="${zone.access}">${zone.label}</label><i style="--zone-fill:${percent}%"></i><strong>${used}/${zone.capacityScu}</strong></div>`;
    }).join('');
    return `${summaryStrip(context.lifecycle)}${contextBanner(context)}
      ${context.planError ? `<p class="route-tool-message">${context.planError}</p>` : ''}
      <div class="tool-section-title"><strong>Onboard manifest</strong><small>${context.lifecycle.onboardLots.length} cargo lot${context.lifecycle.onboardLots.length === 1 ? '' : 's'}</small></div>
      <div class="manifest-table">${manifest}</div>
      <div class="tool-section-title"><strong>Hold distribution</strong><small>${context.model.capacityScu} SCU physical grid${offGrid ? ` · ${offGrid} off-grid` : ''}</small></div>
      <div class="zone-bars">${bars}</div>`;
  }

  function renderAdjust(context) {
    if (!context.route) return '<div class="tool-empty">Generate a session before correcting cargo.</div>';
    const rows = context.lifecycle.lots.map((lot) => {
      const allowed = cargoState.allowedStatuses(lot);
      const requested = lot.correction?.requestedStatus ?? 'auto';
      return `<article class="correction-row" data-cargo-key="${lot.key}">
        <label><b>${lot.commodity} · ${lot.missionTitle}</b><small>${lot.originLocationLabel} → ${lot.deliveryLocationLabel} · planned ${lot.plannedScu} SCU</small></label>
        <label><span class="sr-only">Actual SCU</span><input type="number" min="0" max="${lot.plannedScu}" step="1" value="${lot.scu}" data-correction-scu></label>
        <label><span class="sr-only">Cargo status</span><select data-correction-status>${allowed.map((status) => `<option value="${status}"${status === requested ? ' selected' : ''}>${status.toUpperCase()}</option>`).join('')}</select></label>
        <button type="button" data-correction-apply>Apply</button>
      </article>`;
    }).join('');
    return `${summaryStrip(context.lifecycle)}${contextBanner(context)}
      <div class="tool-section-title"><strong>Actual cargo state</strong><button type="button" class="button button--secondary" data-reset-corrections>Reset all</button></div>
      <div class="correction-list">${rows || '<div class="tool-empty">No cargo lots in this session.</div>'}</div>
      <p class="route-tool-message" data-tool-message>${lastMessage}</p>`;
  }

  function routeOperationSummary(stop) {
    const pickup = stop.operations.filter((operation) => operation.type !== 'delivery' && operation.lotId).reduce((sum, operation) => sum + Number(operation.scu ?? 0), 0);
    const drop = stop.operations.filter((operation) => operation.type === 'delivery' && operation.lotId).reduce((sum, operation) => sum + Number(operation.scu ?? 0), 0);
    return [drop ? `Drop ${drop} SCU` : '', pickup ? `Pick up ${pickup} SCU` : ''].filter(Boolean).join(' · ') || `${stop.operations.length} objective${stop.operations.length === 1 ? '' : 's'}`;
  }

  function renderRoute(context) {
    if (!context.route) return '<div class="tool-empty">Generate a session to edit the future route.</div>';
    const completed = context.progress.completedSet;
    const rows = (context.route.allStops ?? context.route.stops).map((stop, index) => {
      const isComplete = completed.has(String(stop.id));
      const source = locationContext.buildContext(stop.locationId, { onboardScu: 0, label: stop.locationLabel });
      return `<article class="route-tool-row${isComplete ? ' is-complete' : ''}" data-stop-id="${stop.id}">
        <span>${String(index + 1).padStart(2, '0')}</span>
        <div><strong>${stop.locationLabel}</strong><small>${routeOperationSummary(stop)}${stop.skipped ? ' · Skipped' : ''}${stop.mandatory ? ' · Mandatory' : ''}</small><small>${source.confidence.label} · ${source.freshness.label}</small></div>
        <button type="button" data-route-action="up" title="Move up"${isComplete ? ' disabled' : ''}>↑</button>
        <button type="button" data-route-action="down" title="Move down"${isComplete ? ' disabled' : ''}>↓</button>
        <button type="button" data-route-action="skip" title="${stop.skipped ? 'Reopen stop' : 'Skip stop'}"${isComplete ? ' disabled' : ''}>${stop.skipped ? 'Open' : 'Skip'}</button>
        <button type="button" data-route-action="mandatory" title="Toggle mandatory">${stop.mandatory ? 'Unlock' : 'Lock'}</button>
      </article>`;
    }).join('');
    return `${contextBanner(context)}<div class="tool-section-title"><strong>Future stop controls</strong><button type="button" class="button button--secondary" data-reset-route>Reset route</button></div>
      <div class="route-tool-list">${rows}</div>
      <p class="route-tool-message" data-tool-message>${lastMessage}</p>`;
  }

  function renderActiveTool(state = store.getState()) {
    if (!activeTool || !toolBody) return;
    const context = derive(state);
    const renderers = { moves: renderMoves, cargo: renderCargo, adjust: renderAdjust, route: renderRoute };
    toolBody.innerHTML = renderers[activeTool]?.(context) ?? '<div class="tool-empty">Unknown auxiliary display.</div>';
  }

  function openTool(toolId) {
    if (!toolPanel || !toolLabels[toolId]) return;
    activeTool = toolId;
    lastMessage = '';
    toolPanel.hidden = false;
    toolTitle.textContent = toolLabels[toolId];
    toolButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.opsTool === toolId)));
    renderActiveTool();
  }

  function closeTool() {
    activeTool = null;
    if (toolPanel) { toolPanel.hidden = true; toolPanel.classList.remove('is-expanded'); }
    toolExpand?.setAttribute('aria-pressed', 'false');
    toolButtons.forEach((button) => button.setAttribute('aria-pressed', 'false'));
    document.body.classList.remove('tool-panel-expanded');
  }

  toolButtons.forEach((button) => button.addEventListener('click', () => {
    const target = button.dataset.opsTool;
    if (!toolPanel.hidden && activeTool === target) closeTool(); else openTool(target);
  }));
  toolClose?.addEventListener('click', closeTool);
  toolExpand?.addEventListener('click', () => {
    const expanded = toolPanel.classList.toggle('is-expanded');
    toolExpand.setAttribute('aria-pressed', String(expanded));
    document.body.classList.toggle('tool-panel-expanded', expanded);
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !toolPanel?.hidden) closeTool();
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
    const keyMap = { F1: 'moves', F2: 'cargo', F3: 'adjust', F4: 'route' };
    if (keyMap[event.key]) { event.preventDefault(); openTool(keyMap[event.key]); }
  });

  toolBody?.addEventListener('click', (event) => {
    const state = store.getState();
    const context = derive(state);
    const correctionApply = event.target.closest('[data-correction-apply]');
    if (correctionApply) {
      const row = correctionApply.closest('[data-cargo-key]');
      const key = row?.dataset.cargoKey;
      try {
        const correction = { actualScu: row.querySelector('[data-correction-scu]').value, status: row.querySelector('[data-correction-status]').value };
        cargoState.validateCorrection(context.route, context.progress.completedStopIds, key, correction);
        const next = { ...(state.cargoCorrections ?? {}) };
        const lot = context.lifecycle.lots.find((item) => item.key === key);
        if (Number(correction.actualScu) === lot.plannedScu && correction.status === 'auto') delete next[key]; else next[key] = correction;
        lastMessage = 'Cargo correction saved.';
        store.patch({ cargoCorrections: next });
      } catch (error) { lastMessage = error.message; renderActiveTool(); }
      return;
    }
    if (event.target.closest('[data-reset-corrections]')) { lastMessage = 'Cargo corrections reset.'; store.patch({ cargoCorrections: {} }); return; }
    if (event.target.closest('[data-reset-route]')) { lastMessage = 'Generated route restored.'; store.patch({ routeCorrections: routeCorrections.reset(state.route) }); return; }

    const routeAction = event.target.closest('[data-route-action]');
    if (routeAction) {
      const row = routeAction.closest('[data-stop-id]');
      const stopId = row?.dataset.stopId;
      const stop = context.route.allStops.find((item) => String(item.id) === String(stopId));
      try {
        let next;
        switch (routeAction.dataset.routeAction) {
          case 'up': next = routeCorrections.changeOrder(state.route, state.routeCorrections, stopId, -1, context.progress.completedStopIds); break;
          case 'down': next = routeCorrections.changeOrder(state.route, state.routeCorrections, stopId, 1, context.progress.completedStopIds); break;
          case 'skip': next = routeCorrections.setSkipped(state.route, state.routeCorrections, stopId, !stop.skipped, context.progress.completedStopIds); break;
          case 'mandatory': next = routeCorrections.setMandatory(state.route, state.routeCorrections, stopId, !stop.mandatory); break;
          default: return;
        }
        lastMessage = 'Route updated.';
        store.patch({ routeCorrections: next });
      } catch (error) { lastMessage = error.message; renderActiveTool(); }
    }
  });

  function updateGlobalStatus(state) {
    const context = derive(state);
    if (missionCount) missionCount.textContent = String(state.route?.missions?.length ?? 0);
    if (!context.route) {
      globalStatus?.querySelector('strong')?.replaceChildren(document.createTextNode('No active route'));
      globalStatus?.querySelector('small')?.replaceChildren(document.createTextNode('Generate missions to begin'));
      if (movePreview) movePreview.textContent = 'No active moves';
      if (cargoPreview) cargoPreview.textContent = '0 SCU onboard';
      return;
    }
    const current = context.progress.currentStop;
    const title = context.progress.complete ? 'Session complete' : `${context.progress.completedStopIds.length}/${context.route.stops.length} stops`;
    const exposure = context.locationIntel?.exposure;
    const detail = context.progress.complete ? 'All active stops completed' : [current?.locationLabel ?? 'Route ready', exposure?.label].filter(Boolean).join(' · ');
    if (globalStatus) { globalStatus.querySelector('strong').textContent = title; globalStatus.querySelector('small').textContent = detail; }
    const load = context.lifecycle.currentMoves.filter((move) => move.action === 'load').reduce((sum, move) => sum + Number(move.lot?.scu ?? move.operation.scu ?? 0), 0);
    const unload = context.lifecycle.currentMoves.filter((move) => move.action === 'unload').reduce((sum, move) => sum + Number(move.lot?.scu ?? move.operation.scu ?? 0), 0);
    if (movePreview) movePreview.textContent = context.progress.complete ? 'Route complete' : [unload ? `Drop ${unload} SCU` : '', load ? `Pick up ${load} SCU` : ''].filter(Boolean).join(' · ') || 'No cargo moves';
    if (cargoPreview) cargoPreview.textContent = `${context.lifecycle.totals.onboardScu} SCU onboard`;
  }

  window.addEventListener('sc:session-change', (event) => { updateGlobalStatus(event.detail); renderActiveTool(event.detail); });
  updateGlobalStatus(store.getState());

  window.addEventListener('sc:open-internal-panel', (event) => {
    const detail = event.detail ?? {};
    if (detail.parentView === 'route') {
      const map = { moves: 'moves', cargo: 'cargo', corrections: 'adjust', 'route-tools': 'route', companion: 'moves' };
      openTool(map[detail.panel] ?? 'moves');
      return;
    }
    if (detail.parentView === 'route-planner' && detail.panel === 'locations') { document.querySelector('.contextual-location-intel')?.setAttribute('open', ''); return; }
    if (detail.parentView === 'roadmap' && (detail.panel === 'changelog' || detail.panel === 'ui-kit')) document.querySelector(`[data-development-tab="${detail.panel}"]`)?.click();
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-view-target]') && !event.target.closest('[data-ops-tool]')) closeTool();
  });
}());
