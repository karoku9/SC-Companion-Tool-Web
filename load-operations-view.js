'use strict';

(function initializeLoadOperationsView() {
  const store = window.SCCompanionSession;
  const catalog = window.SCCompanionShipCatalog;
  const zoneModel = window.SCCompanionCargoZones;
  const planner = window.SCCompanionCargoPlanner;
  const cargoState = window.SCCompanionCargoState;
  const cargoLayout = window.SCCompanionCargoLayout;
  const routeCorrections = window.SCCompanionRouteCorrections;
  const routeProgress = window.SCCompanionRouteProgress;
  const root = document.querySelector('#load-operations');
  if (!store || !catalog || !zoneModel || !planner || !cargoState || !cargoLayout || !routeCorrections || !routeProgress || !root) return;

  root.innerHTML = `
    <header class="section-heading internal-section-heading"><div><p class="eyebrow">LIVE CARGO</p><h2>Moves at this stop</h2></div></header>
    <div class="blueprint-layout operations-blueprint">
      <article class="blueprint-card is-primary operation-focus">
        <span class="card-kicker" id="load-stop-kicker">NO ACTIVE SESSION</span>
        <h3 id="load-stop-title">Generate a mission route</h3>
        <p id="load-stop-summary">The move queue will show exactly what enters or leaves the ship.</p>
        <div class="operation-progress" id="load-operation-progress"></div>
        <div class="operation-buttons"><button type="button" id="load-previous" disabled>PREVIOUS</button><button type="button" class="accent-button" id="load-next" disabled>COMPLETE STOP — NEXT</button></div>
      </article>
      <section class="blueprint-panel"><div class="panel-title"><span>MOVE QUEUE</span><small id="load-queue-status">WAITING FOR ROUTE</small></div><div id="load-move-queue" class="move-queue"></div></section>
    </div>
    <div class="blueprint-split load-state-split">
      <section class="blueprint-panel"><div class="panel-title"><span>ONBOARD NOW</span><small>ACTIVE CARGO ONLY</small></div><div id="load-onboard-list" class="onboard-list"></div></section>
      <section class="blueprint-panel"><div class="panel-title"><span>SESSION CARGO</span><small id="load-capacity-note">PHYSICAL GRID</small></div><div class="summary-strip cargo-state-summary" id="load-cargo-totals"></div></section>
    </div>`;

  const elements = {
    kicker: root.querySelector('#load-stop-kicker'), title: root.querySelector('#load-stop-title'),
    summary: root.querySelector('#load-stop-summary'), progress: root.querySelector('#load-operation-progress'),
    previous: root.querySelector('#load-previous'), next: root.querySelector('#load-next'),
    queueStatus: root.querySelector('#load-queue-status'), queue: root.querySelector('#load-move-queue'),
    onboard: root.querySelector('#load-onboard-list'), totals: root.querySelector('#load-cargo-totals'),
    capacityNote: root.querySelector('#load-capacity-note')
  };

  function riskResolver(locationId, label) {
    const value = `${locationId} ${label}`.toLowerCase();
    if (value.includes('pyro') || value.includes('outpost')) return 3;
    if (value.includes('station')) return 1;
    return 0;
  }

  function activeModel(state) {
    const ship = (state.hangarShips ?? []).find((item) => item.id === state.selectedShipId) ?? null;
    const base = catalog.getModel(ship?.modelId ?? state.selectedShipModelId) ?? catalog.models[0];
    const resolved = zoneModel.resolveModel(base, ship, state.cargoZoneOverrides);
    return { ...resolved, offGridAllowanceScu: Math.max(0, Number(state.routePlannerSettings?.offGridAllowanceScu ?? 0)) };
  }

  function assignmentMap(plan) {
    const map = new Map();
    plan.assignments.forEach((assignment) => { if (!map.has(assignment.cargoKey)) map.set(assignment.cargoKey, assignment); });
    return map;
  }

  function positionText(model, assignment) {
    if (!assignment) return 'Position pending';
    if (assignment.offGrid) return 'OFF-GRID STAGING';
    const position = cargoLayout.locateSlot(model, assignment.planSlotIndex);
    return position ? `${position.zoneLabel} / Layer ${position.layer + 1}` : 'Position pending';
  }

  function renderMove(move, model, assignments) {
    const row = document.createElement('article');
    row.className = `move-row is-${move.action}`;
    const lot = move.lot;
    const assignment = assignments.get(lot?.key);
    const quantity = lot?.scu ?? move.operation.scu;
    const commodity = lot?.commodity ?? move.operation.commodity;
    const detail = move.action === 'unload'
      ? `${positionText(model, assignment)} · loaded at ${lot?.originLocationLabel ?? move.operation.originLocationLabel}`
      : `${lot?.originLocationLabel ?? move.operation.locationLabel} → ${lot?.deliveryLocationLabel ?? move.operation.destinationLocationLabel} · ${positionText(model, assignment)}`;
    row.innerHTML = `<i>${move.action.toUpperCase()}</i><div class="move-primary"><b>${quantity} SCU ${commodity}</b><span>${detail}</span><small>${lot?.missionTitle ?? move.operation.missionTitle}</small></div>`;
    return row;
  }

  function renderOnboard(lifecycle, model, assignments) {
    elements.onboard.replaceChildren();
    if (!lifecycle.onboardLots.length) {
      elements.onboard.innerHTML = `<div class="empty-inline-state">${lifecycle.complete ? 'No cargo remains onboard for the active route.' : 'No mission cargo is currently onboard.'}</div>`;
      return;
    }
    lifecycle.onboardLots.forEach((lot) => {
      const row = document.createElement('article');
      row.className = 'onboard-row';
      const assignment = assignments.get(lot.key);
      row.innerHTML = `<div><b>${lot.scu} SCU ${lot.commodity}</b><span>Deliver to ${lot.deliveryLocationLabel} · ${positionText(model, assignment)}</span><small>${lot.missionTitle}</small></div><strong>${assignment?.offGrid ? 'OFF-GRID' : lot.corrected ? 'CORRECTED' : 'ONBOARD'}</strong>`;
      elements.onboard.append(row);
    });
  }

  function renderTotals(lifecycle) {
    elements.totals.innerHTML = `<span>Pending<strong>${lifecycle.totals.pendingScu} SCU</strong></span><span>Onboard<strong>${lifecycle.totals.onboardScu} SCU</strong></span><span>Delivered<strong>${lifecycle.totals.deliveredScu} SCU</strong></span><span>Lost<strong>${lifecycle.totals.lostScu} SCU</strong></span>`;
  }

  function context(state) {
    const route = routeCorrections.deriveRoute(state.route, state.routeCorrections);
    const progress = routeProgress.derive(route, state.completedStopIds, state.currentStopIndex);
    return { route, progress };
  }

  function render(state) {
    elements.queue.replaceChildren();
    if (!state.route?.stops?.length) {
      elements.kicker.textContent = 'NO ACTIVE SESSION';
      elements.title.textContent = 'Generate a mission route';
      elements.summary.textContent = 'The move queue will show exactly what enters or leaves the ship.';
      elements.progress.textContent = '';
      elements.queueStatus.textContent = 'WAITING FOR ROUTE';
      elements.capacityNote.textContent = 'PHYSICAL GRID';
      elements.previous.disabled = true;
      elements.next.disabled = true;
      elements.onboard.innerHTML = '<div class="empty-inline-state">No mission cargo is currently onboard.</div>';
      elements.totals.innerHTML = '<span>Pending<strong>0 SCU</strong></span><span>Onboard<strong>0 SCU</strong></span><span>Delivered<strong>0 SCU</strong></span><span>Lost<strong>0 SCU</strong></span>';
      return;
    }

    const { route, progress } = context(state);
    const lifecycle = cargoState.deriveCargoState(route, progress.completedStopIds, state.cargoCorrections);
    const model = activeModel(state);
    const plan = planner.planCargo(route, model, riskResolver);
    const assignments = assignmentMap(plan);
    elements.previous.disabled = !progress.completedStopIds.length;
    elements.next.disabled = progress.complete;
    elements.progress.textContent = `${progress.completedCount} completed · ${progress.totalStops} active stops`;
    elements.capacityNote.textContent = plan.offGridAllowanceScu ? `${plan.capacityScu} GRID + ${plan.offGridAllowanceScu} OFF-GRID` : `${plan.capacityScu} SCU GRID`;

    if (progress.complete) {
      elements.kicker.textContent = 'ACTIVE ROUTE COMPLETE';
      elements.title.textContent = route.allStops.some((stop) => stop.skipped) ? 'Skipped stops remain available' : 'All planned stops completed';
      elements.summary.textContent = 'Use PREVIOUS to reopen the last completed stop or Route Corrections to restore a skipped stop.';
      elements.queueStatus.textContent = 'NO MOVES REMAINING';
      elements.queue.innerHTML = '<div class="empty-inline-state">No load or unload operations remain on the active route.</div>';
    } else {
      elements.kicker.textContent = 'CURRENT DESTINATION';
      elements.title.textContent = lifecycle.currentStop.locationLabel;
      const loadScu = lifecycle.currentMoves.filter((move) => move.action === 'load').reduce((sum, move) => sum + Number(move.lot?.scu ?? move.operation.scu ?? 0), 0);
      const unloadScu = lifecycle.currentMoves.filter((move) => move.action === 'unload').reduce((sum, move) => sum + Number(move.lot?.scu ?? move.operation.scu ?? 0), 0);
      elements.summary.textContent = [unloadScu ? `Unload ${unloadScu} SCU` : '', loadScu ? `Load ${loadScu} SCU` : ''].filter(Boolean).join(' · ') || 'Complete the non-cargo objectives at this stop.';
      elements.queueStatus.textContent = `${lifecycle.currentMoves.length} MOVE${lifecycle.currentMoves.length === 1 ? '' : 'S'}`;
      lifecycle.currentMoves.forEach((move) => elements.queue.append(renderMove(move, model, assignments)));
      if (!lifecycle.currentMoves.length) elements.queue.innerHTML = '<div class="empty-inline-state">No cargo movement at this stop.</div>';
    }

    renderOnboard(lifecycle, model, assignments);
    renderTotals(lifecycle);
  }

  elements.previous.addEventListener('click', () => {
    const state = store.getState();
    if (!state.route) return;
    const { route } = context(state);
    const completedStopIds = routeProgress.previous(route, state.completedStopIds, state.currentStopIndex);
    store.patch({ completedStopIds, currentStopIndex: completedStopIds.length });
  });

  elements.next.addEventListener('click', () => {
    const state = store.getState();
    if (!state.route) return;
    const { route } = context(state);
    const completedStopIds = routeProgress.completeCurrent(route, state.completedStopIds, state.currentStopIndex);
    store.patch({ completedStopIds, currentStopIndex: completedStopIds.length });
  });

  window.addEventListener('sc:session-change', (event) => render(event.detail));
  render(store.getState());
}());
