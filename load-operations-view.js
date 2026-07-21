'use strict';

(function initializeLoadOperationsView() {
  const store = window.SCCompanionSession;
  const catalog = window.SCCompanionShipCatalog;
  const planner = window.SCCompanionCargoPlanner;
  const cargoState = window.SCCompanionCargoState;
  const cargoLayout = window.SCCompanionCargoLayout;
  const root = document.querySelector('#load-operations');
  if (!store || !catalog || !planner || !cargoState || !cargoLayout || !root) return;

  root.innerHTML = `
    <header class="section-heading blueprint-heading">
      <div><p class="eyebrow">LIVE CARGO</p><h2>Load and unload instructions</h2></div>
      <span class="page-status is-foundation">FOUNDATION</span>
    </header>
    <div class="blueprint-layout operations-blueprint">
      <article class="blueprint-card is-primary operation-focus">
        <span class="card-kicker" id="load-stop-kicker">NO ACTIVE SESSION</span>
        <h3 id="load-stop-title">Generate a mission route</h3>
        <p id="load-stop-summary">The move queue will show exactly which mission cargo enters or leaves the ship.</p>
        <div class="operation-progress" id="load-operation-progress"></div>
        <div class="operation-buttons">
          <button type="button" id="load-previous" disabled>PREVIOUS</button>
          <button type="button" class="accent-button" id="load-next" disabled>COMPLETE STOP — NEXT</button>
        </div>
      </article>
      <section class="blueprint-panel">
        <div class="panel-title"><span>MOVE QUEUE</span><small id="load-queue-status">WAITING FOR ROUTE</small></div>
        <div id="load-move-queue" class="move-queue"></div>
      </section>
    </div>
    <div class="blueprint-split load-state-split">
      <section class="blueprint-panel">
        <div class="panel-title"><span>ONBOARD NOW</span><small>AFTER COMPLETED STOPS</small></div>
        <div id="load-onboard-list" class="onboard-list"></div>
      </section>
      <section class="blueprint-panel">
        <div class="panel-title"><span>SESSION CARGO</span><small>DETERMINISTIC STATE</small></div>
        <div class="summary-strip cargo-state-summary" id="load-cargo-totals"></div>
      </section>
    </div>`;

  const elements = {
    kicker: root.querySelector('#load-stop-kicker'),
    title: root.querySelector('#load-stop-title'),
    summary: root.querySelector('#load-stop-summary'),
    progress: root.querySelector('#load-operation-progress'),
    previous: root.querySelector('#load-previous'),
    next: root.querySelector('#load-next'),
    queueStatus: root.querySelector('#load-queue-status'),
    queue: root.querySelector('#load-move-queue'),
    onboard: root.querySelector('#load-onboard-list'),
    totals: root.querySelector('#load-cargo-totals')
  };

  function riskResolver(locationId, label) {
    const value = `${locationId} ${label}`.toLowerCase();
    if (value.includes('pyro') || value.includes('outpost')) return 3;
    if (value.includes('station')) return 1;
    return 0;
  }

  function activeModel(state) {
    const base = catalog.getModel(state.selectedShipModelId) ?? catalog.models[0];
    const ship = (state.hangarShips ?? []).find((item) => item.id === state.selectedShipId);
    return { ...base, capacityScu: ship?.cargoCapacityScu ?? base.capacityScu };
  }

  function assignmentMap(plan) {
    const map = new Map();
    plan.assignments.forEach((assignment) => {
      if (!map.has(assignment.cargoKey)) map.set(assignment.cargoKey, assignment);
    });
    return map;
  }

  function positionText(model, assignment) {
    if (!assignment) return 'Position pending';
    const position = cargoLayout.locateSlot(model, assignment.planSlotIndex);
    return position ? `${position.zoneLabel} / Layer ${position.layer + 1}` : 'Position pending';
  }

  function renderMove(move, model, assignments) {
    const row = document.createElement('div');
    row.className = `move-row is-${move.action}`;
    const verb = document.createElement('i');
    verb.textContent = move.action.toUpperCase();
    const content = document.createElement('div');
    const title = document.createElement('b');
    const lot = move.lot;
    title.textContent = lot
      ? `${lot.missionTitle} · ${lot.scu} SCU ${lot.commodity}`
      : `${move.operation.missionTitle} · ${move.operation.scu} SCU ${move.operation.commodity}`;
    const detail = document.createElement('span');
    const assignment = assignments.get(lot?.key);
    if (move.action === 'unload') {
      detail.textContent = `${positionText(model, assignment)} · loaded at ${lot?.originLocationLabel ?? move.operation.originLocationLabel}`;
    } else {
      detail.textContent = `${lot?.originLocationLabel ?? move.operation.locationLabel} → ${lot?.deliveryLocationLabel ?? move.operation.destinationLocationLabel} · ${positionText(model, assignment)}`;
    }
    content.append(title, detail);
    row.append(verb, content);
    return row;
  }

  function renderOnboard(lifecycle, model, assignments) {
    elements.onboard.replaceChildren();
    if (!lifecycle.onboardLots.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-inline-state';
      empty.textContent = lifecycle.complete ? 'Cargo hold empty. Session deliveries complete.' : 'No mission cargo is currently onboard.';
      elements.onboard.append(empty);
      return;
    }

    lifecycle.onboardLots.forEach((lot) => {
      const row = document.createElement('div');
      row.className = 'onboard-row';
      const content = document.createElement('div');
      const title = document.createElement('b');
      title.textContent = `${lot.missionTitle} · ${lot.scu} SCU ${lot.commodity}`;
      const detail = document.createElement('span');
      detail.textContent = `${positionText(model, assignments.get(lot.key))} · deliver to ${lot.deliveryLocationLabel}`;
      content.append(title, detail);
      const status = document.createElement('strong');
      status.textContent = 'ONBOARD';
      row.append(content, status);
      elements.onboard.append(row);
    });
  }

  function renderTotals(lifecycle) {
    elements.totals.innerHTML = `
      <span>Pending<strong>${lifecycle.totals.pendingScu} SCU</strong></span>
      <span>Onboard<strong>${lifecycle.totals.onboardScu} SCU</strong></span>
      <span>Delivered<strong>${lifecycle.totals.deliveredScu} SCU</strong></span>`;
  }

  function render(state) {
    elements.queue.replaceChildren();
    const route = state.route;
    if (!route?.stops?.length) {
      elements.kicker.textContent = 'NO ACTIVE SESSION';
      elements.title.textContent = 'Generate a mission route';
      elements.summary.textContent = 'The move queue will show exactly which mission cargo enters or leaves the ship.';
      elements.progress.textContent = '';
      elements.queueStatus.textContent = 'WAITING FOR ROUTE';
      elements.previous.disabled = true;
      elements.next.disabled = true;
      elements.onboard.innerHTML = '<div class="empty-inline-state">No mission cargo is currently onboard.</div>';
      elements.totals.innerHTML = '<span>Pending<strong>0 SCU</strong></span><span>Onboard<strong>0 SCU</strong></span><span>Delivered<strong>0 SCU</strong></span>';
      return;
    }

    const lifecycle = cargoState.deriveCargoState(route, state.currentStopIndex);
    const model = activeModel(state);
    const plan = planner.planCargo(route, model, riskResolver);
    const assignments = assignmentMap(plan);
    elements.previous.disabled = lifecycle.currentStopIndex <= 0;
    elements.next.disabled = lifecycle.complete;
    elements.progress.textContent = `${Math.min(lifecycle.currentStopIndex + 1, route.stops.length)} / ${route.stops.length} stops`;

    if (lifecycle.complete) {
      elements.kicker.textContent = 'SESSION COMPLETE';
      elements.title.textContent = 'All planned stops completed';
      elements.summary.textContent = 'Use PREVIOUS to review or reverse the last completed stop.';
      elements.queueStatus.textContent = 'NO MOVES REMAINING';
      elements.queue.innerHTML = '<div class="empty-inline-state">No load or unload operations remain.</div>';
    } else {
      elements.kicker.textContent = `CURRENT STOP · ${lifecycle.currentStop.locationLabel.toUpperCase()}`;
      const loadCount = lifecycle.currentMoves.filter((move) => move.action === 'load').length;
      const unloadCount = lifecycle.currentMoves.filter((move) => move.action === 'unload').length;
      elements.title.textContent = `${loadCount ? `Load ${loadCount}` : ''}${loadCount && unloadCount ? ' · ' : ''}${unloadCount ? `Unload ${unloadCount}` : ''}${!loadCount && !unloadCount ? 'Complete stop objectives' : ''}`;
      elements.summary.textContent = 'Completing this stop applies every listed move at once. Mission identity and pickup origin remain attached to every lot.';
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
    store.patch({ currentStopIndex: Math.max(0, (state.currentStopIndex ?? 0) - 1) });
  });

  elements.next.addEventListener('click', () => {
    const state = store.getState();
    if (!state.route) return;
    store.patch({ currentStopIndex: Math.min((state.currentStopIndex ?? 0) + 1, state.route.stops.length) });
  });

  window.addEventListener('sc:session-change', (event) => render(event.detail));
  render(store.getState());
}());
