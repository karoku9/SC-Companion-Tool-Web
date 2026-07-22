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
  const icons = window.SCCompanionMfdIcons;
  const root = document.querySelector('#load-operations');
  if (!store || !catalog || !zoneModel || !planner || !cargoState || !cargoLayout || !routeCorrections || !routeProgress || !root) return;

  const icon = (name) => icons?.render(name, 'mfd-icon') ?? '';
  root.innerHTML = `
    <section class="mfd-tool-section move-queue-section">
      <header class="mfd-tool-heading"><div>${icon('moves')}<span><small>Current stop</small><h3>Move queue</h3></span></div><strong id="load-queue-status">Waiting for route</strong></header>
      <div id="load-move-queue" class="move-queue"></div>
    </section>
    <section class="mfd-tool-section onboard-section">
      <header class="mfd-tool-heading"><div>${icon('cargo')}<span><small>Manifest</small><h3>Onboard now</h3></span></div><strong>Active cargo only</strong></header>
      <div id="load-onboard-list" class="onboard-list"></div>
    </section>
    <section class="mfd-tool-section session-cargo-section">
      <header class="mfd-tool-heading"><div>${icon('cargo')}<span><small>Session state</small><h3>Cargo totals</h3></span></div><strong id="load-capacity-note">Physical grid</strong></header>
      <div class="summary-strip cargo-state-summary" id="load-cargo-totals"></div>
    </section>`;

  const elements = {
    queueStatus: root.querySelector('#load-queue-status'),
    queue: root.querySelector('#load-move-queue'),
    onboard: root.querySelector('#load-onboard-list'),
    totals: root.querySelector('#load-cargo-totals'),
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
    if (assignment.offGrid) return 'Off-grid staging';
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
      : `${lot?.deliveryLocationLabel ?? move.operation.destinationLocationLabel} · ${positionText(model, assignment)}`;
    row.innerHTML = `<span class="move-action-icon">${icon(move.action === 'unload' ? 'unload' : 'load')}</span><div class="move-primary"><small>${move.action}</small><b>${quantity} SCU ${commodity}</b><span>${detail}</span><em>${lot?.missionTitle ?? move.operation.missionTitle}</em></div>`;
    return row;
  }

  function renderOnboard(lifecycle, model, assignments) {
    elements.onboard.replaceChildren();
    if (!lifecycle.onboardLots.length) {
      elements.onboard.innerHTML = `<div class="empty-inline-state">${lifecycle.complete ? 'No cargo remains onboard for the active route.' : 'Cargo hold clear for this session.'}</div>`;
      return;
    }
    lifecycle.onboardLots.forEach((lot) => {
      const row = document.createElement('article');
      row.className = 'onboard-row';
      const assignment = assignments.get(lot.key);
      row.innerHTML = `<span class="onboard-icon">${icon('cargo')}</span><div><b>${lot.scu} SCU ${lot.commodity}</b><span>Deliver to ${lot.deliveryLocationLabel}</span><small>${positionText(model, assignment)} · ${lot.missionTitle}</small></div><strong>${assignment?.offGrid ? 'Off-grid' : lot.corrected ? 'Corrected' : 'Onboard'}</strong>`;
      elements.onboard.append(row);
    });
  }

  function renderTotals(lifecycle) {
    elements.totals.innerHTML = `<span><small>Pending</small><strong>${lifecycle.totals.pendingScu}</strong><em>SCU</em></span><span><small>Onboard</small><strong>${lifecycle.totals.onboardScu}</strong><em>SCU</em></span><span><small>Delivered</small><strong>${lifecycle.totals.deliveredScu}</strong><em>SCU</em></span><span><small>Lost</small><strong>${lifecycle.totals.lostScu}</strong><em>SCU</em></span>`;
  }

  function context(state) {
    const route = routeCorrections.deriveRoute(state.route, state.routeCorrections);
    const progress = routeProgress.derive(route, state.completedStopIds, state.currentStopIndex);
    return { route, progress };
  }

  function render(state) {
    elements.queue.replaceChildren();
    if (!state.route?.stops?.length) {
      elements.queueStatus.textContent = 'Waiting for route';
      elements.capacityNote.textContent = 'Physical grid';
      elements.queue.innerHTML = '<div class="empty-inline-state">Generate a session to build the move queue.</div>';
      elements.onboard.innerHTML = '<div class="empty-inline-state">Cargo hold clear for this session.</div>';
      elements.totals.innerHTML = '<span><small>Pending</small><strong>0</strong><em>SCU</em></span><span><small>Onboard</small><strong>0</strong><em>SCU</em></span><span><small>Delivered</small><strong>0</strong><em>SCU</em></span><span><small>Lost</small><strong>0</strong><em>SCU</em></span>';
      return;
    }

    const { route, progress } = context(state);
    const lifecycle = cargoState.deriveCargoState(route, progress.completedStopIds, state.cargoCorrections);
    const model = activeModel(state);
    const plan = planner.planCargo(route, model, riskResolver);
    const assignments = assignmentMap(plan);
    elements.capacityNote.textContent = plan.offGridAllowanceScu ? `${plan.capacityScu} grid + ${plan.offGridAllowanceScu} off-grid` : `${plan.capacityScu} SCU grid`;

    if (progress.complete) {
      elements.queueStatus.textContent = 'Route complete';
      elements.queue.innerHTML = '<div class="empty-inline-state">No load or unload operations remain.</div>';
    } else {
      elements.queueStatus.textContent = `${lifecycle.currentMoves.length} move${lifecycle.currentMoves.length === 1 ? '' : 's'}`;
      lifecycle.currentMoves.forEach((move) => elements.queue.append(renderMove(move, model, assignments)));
      if (!lifecycle.currentMoves.length) elements.queue.innerHTML = '<div class="empty-inline-state">No cargo movement at this stop.</div>';
    }

    renderOnboard(lifecycle, model, assignments);
    renderTotals(lifecycle);
  }

  window.addEventListener('sc:session-change', (event) => render(event.detail));
  render(store.getState());
}());