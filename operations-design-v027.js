'use strict';

(function initializeOperationsDesignV027(root) {
  let initialized = false;

  function install() {
    if (initialized) return true;

    const store = root.SCCompanionSession;
    const corrections = root.SCCompanionRouteCorrections;
    const progressModel = root.SCCompanionRouteProgress;
    const cargoState = root.SCCompanionCargoState;
    const locationContext = root.SCCompanionLocationContext;
    const shipCatalog = root.SCCompanionShipCatalog;
    const icons = root.SCCompanionMfdIcons;

    const page = document.querySelector('.operations-page');
    const grid = page?.querySelector('.operations-grid');
    const sessionBar = page?.querySelector('.ops-session-bar');
    const liveNavigation = page?.querySelector('.ops-live-navigation');
    const currentPanel = page?.querySelector('.current-operation-panel');
    const legacySequence = page?.querySelector('.route-sequence-panel');
    const tools = page?.querySelector('.operations-tools');
    const quickShip = document.querySelector('.quick-ship-control');

    if (!store || !corrections || !progressModel || !cargoState || !locationContext || !shipCatalog || !icons || !page || !grid || !sessionBar || !liveNavigation || !currentPanel || !legacySequence || !tools || !quickShip) return false;
    initialized = true;

    const icon = (name, className = 'ops-v027-icon') => icons.render(name, className);
    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    page.classList.add('operations-v027');
    legacySequence.classList.add('ops-v027-legacy-sequence');
    legacySequence.setAttribute('aria-hidden', 'true');
    legacySequence.hidden = true;

    const commandDeck = document.createElement('section');
    commandDeck.className = 'ops-v027-command-deck';
    commandDeck.innerHTML = `
      <header class="ops-v027-command-header">
        <div class="ops-v027-command-title">
          <small>ACTIVE HAULING OPERATION</small>
          <strong id="ops-v027-session-title">No session generated</strong>
        </div>
        <div class="ops-v027-command-metrics" aria-label="Active operation summary">
          <article><span>${icon('pin')}</span><small>Current</small><strong id="ops-v027-current">—</strong></article>
          <article><span>${icon('navigation')}</span><small>Next</small><strong id="ops-v027-next">—</strong></article>
          <article><span>${icon('gateway')}</span><small>Gateway</small><strong id="ops-v027-gateway">None</strong></article>
          <article><span>${icon('clock')}</span><small>Travel budget</small><strong id="ops-v027-budget">—</strong></article>
          <article><span>${icon('cargo')}</span><small>Onboard</small><strong id="ops-v027-onboard">0 SCU</strong></article>
        </div>
        <div class="ops-v027-ship-slot"></div>
      </header>`;

    const primary = document.createElement('div');
    primary.className = 'ops-v027-primary-grid';

    const timeline = document.createElement('section');
    timeline.className = 'ops-v027-timeline-panel';
    timeline.innerHTML = `
      <header class="ops-v027-panel-header">
        <div><small>ROUTE / SESSION TIMELINE</small><strong id="ops-v027-timeline-title">No active sequence</strong></div>
        <span id="ops-v027-progress">0 / 0</span>
      </header>
      <div id="ops-v027-timeline" class="ops-v027-timeline"></div>`;

    const actionSummary = document.createElement('section');
    actionSummary.className = 'ops-v027-action-summary';
    actionSummary.setAttribute('aria-label', 'Current stop action summary');
    currentPanel.querySelector('.current-operation-body')?.insertBefore(actionSummary, currentPanel.querySelector('#current-stop-operations'));

    commandDeck.querySelector('.ops-v027-ship-slot').append(quickShip);
    commandDeck.append(sessionBar);
    primary.append(liveNavigation, currentPanel);
    grid.replaceChildren(commandDeck, primary, timeline, tools, legacySequence);

    function activeRoute(state) {
      const route = state.route ? corrections.deriveRoute(state.route, state.routeCorrections) : null;
      const progress = progressModel.derive(route, state.completedStopIds, state.currentStopIndex);
      const cargo = cargoState.deriveCargoState(route, progress.completedStopIds, state.cargoCorrections);
      return { route, progress, cargo };
    }

    function operationTotals(stop) {
      const operations = stop?.operations ?? [];
      const pickup = operations
        .filter((operation) => operation.type !== 'delivery' && operation.lotId)
        .reduce((sum, operation) => sum + Number(operation.scu ?? 0), 0);
      const delivery = operations
        .filter((operation) => operation.type === 'delivery' && operation.lotId)
        .reduce((sum, operation) => sum + Number(operation.scu ?? 0), 0);
      return { pickup, delivery, objectiveCount: operations.length };
    }

    function currentGateway(route, currentStop, nextStop) {
      if (!route) return null;
      const targets = [nextStop, currentStop].filter(Boolean).map((stop) => String(stop.id));
      return (route.gatewaySegments ?? []).find((segment) => targets.includes(String(segment.stopId))) ?? null;
    }

    function renderActionSummary(route, progress, cargo) {
      const stop = progress.currentStop;
      if (!route || !stop) {
        actionSummary.innerHTML = progress.complete
          ? `<div class="ops-v027-complete-state">${icon('check')}<span><strong>Session complete</strong><small>All active stops have been completed.</small></span></div>`
          : `<div class="ops-v027-empty-state">${icon('missions')}<span><strong>No current actions</strong><small>Generate a session from Missions.</small></span></div>`;
        return;
      }

      const totals = operationTotals(stop);
      const intel = locationContext.buildContext(stop.locationId, {
        onboardScu: cargo.totals.onboardScu,
        label: stop.locationLabel
      });
      const exposure = intel?.exposure ?? { level: 'unknown', label: 'Exposure unknown' };
      const chips = [
        totals.delivery ? `<span class="is-delivery">${icon('unload')}<b>DROP ${totals.delivery} SCU</b></span>` : '',
        totals.pickup ? `<span class="is-pickup">${icon('load')}<b>PICK UP ${totals.pickup} SCU</b></span>` : '',
        `<span>${icon('cargo')}<b>${cargo.totals.onboardScu} SCU ONBOARD</b></span>`,
        `<span class="is-exposure is-${escapeHtml(exposure.level)}">${icon('shield')}<b>${escapeHtml(exposure.label)}</b></span>`
      ].filter(Boolean).join('');
      actionSummary.innerHTML = `<div class="ops-v027-action-chips">${chips}</div>`;
    }

    function renderTimeline(route, progress) {
      const host = timeline.querySelector('#ops-v027-timeline');
      const title = timeline.querySelector('#ops-v027-timeline-title');
      const label = timeline.querySelector('#ops-v027-progress');
      if (!route?.stops?.length) {
        title.textContent = 'No active sequence';
        label.textContent = '0 / 0';
        host.innerHTML = `<div class="ops-v027-empty-timeline">${icon('route')}<span>Build a route to display the operational sequence.</span></div>`;
        return;
      }

      title.textContent = `Session ${Number(store.getState().activeRouteSessionIndex ?? 0) + 1}`;
      label.textContent = `${progress.completedCount} / ${progress.totalStops}`;
      host.innerHTML = route.stops.map((stop, index) => {
        const complete = progress.completedSet.has(String(stop.id));
        const state = complete ? 'complete' : index === progress.currentStopIndex ? 'current' : index === progress.currentStopIndex + 1 ? 'next' : 'future';
        const totals = operationTotals(stop);
        const summary = [
          totals.delivery ? `Drop ${totals.delivery} SCU` : '',
          totals.pickup ? `Pick up ${totals.pickup} SCU` : '',
          !totals.delivery && !totals.pickup ? `${totals.objectiveCount} objective${totals.objectiveCount === 1 ? '' : 's'}` : ''
        ].filter(Boolean).join(' · ');
        const gateways = (route.gatewaySegments ?? []).filter((segment) => String(segment.stopId) === String(stop.id));
        const gatewayMarkup = gateways.map((segment) => `<span class="ops-v027-step-gateway">${icon('gateway')} ${escapeHtml(segment.fromGateway)} → ${escapeHtml(segment.toGateway)}</span>`).join('');
        const stateLabel = state === 'complete' ? 'Done' : state === 'current' ? 'Now' : state === 'next' ? 'Next' : `+${Math.max(1, index - progress.currentStopIndex)}`;
        return `<article class="ops-v027-route-step is-${state}" data-v027-stop-id="${escapeHtml(stop.id)}">
          <span class="ops-v027-route-node">${state === 'complete' ? icon('check') : String(index + 1).padStart(2, '0')}</span>
          <div class="ops-v027-route-copy">
            <strong>${escapeHtml(stop.locationLabel)}</strong>
            <small>${escapeHtml(summary)}</small>
            ${gatewayMarkup}
          </div>
          <b>${stateLabel}</b>
        </article>`;
      }).join('');
    }

    function compactIntel() {
      const intelGrid = currentPanel.querySelector('.current-stop-intel-grid');
      if (!intelGrid) return;
      intelGrid.classList.add('ops-v027-intel-strip');
      intelGrid.querySelectorAll('.current-stop-intel-card').forEach((card) => {
        card.classList.add('ops-v027-intel-item');
        const detail = card.querySelector(':scope > span:not(.intel-icon)');
        if (detail && !card.title) card.title = detail.textContent.trim();
      });
    }

    function render(state = store.getState()) {
      const { route, progress, cargo } = activeRoute(state);
      const current = progress.currentStop;
      const next = route?.stops?.[progress.currentStopIndex + 1] ?? null;
      const sessionCount = state.routePlan?.sessions?.length ?? 0;
      const sessionIndex = Math.min(Number(state.activeRouteSessionIndex ?? 0), Math.max(0, sessionCount - 1));
      const session = state.routePlan?.sessions?.[sessionIndex] ?? null;
      const model = shipCatalog.getModel(state.selectedShipModelId);
      const gateway = currentGateway(route, current, next);

      commandDeck.querySelector('#ops-v027-session-title').textContent = sessionCount
        ? `Session ${sessionIndex + 1} of ${sessionCount} · ${session?.missionCount ?? 0} mission${session?.missionCount === 1 ? '' : 's'}`
        : 'No session generated';
      commandDeck.querySelector('#ops-v027-current').textContent = progress.complete ? 'Complete' : current?.locationLabel ?? state.routeStartLocationLabel ?? '—';
      commandDeck.querySelector('#ops-v027-next').textContent = next?.locationLabel ?? (progress.complete ? 'Session complete' : current?.locationLabel ?? '—');
      commandDeck.querySelector('#ops-v027-gateway').textContent = gateway ? `${gateway.fromGateway} → ${gateway.toGateway}` : 'None';
      commandDeck.querySelector('#ops-v027-budget').textContent = state.routeMode === 'fastest'
        ? 'Fastest route'
        : `${state.sessionTargetMinutes ?? 60} min travel`;
      commandDeck.querySelector('#ops-v027-onboard').textContent = `${cargo.totals.onboardScu} / ${model?.capacityScu ?? '—'} SCU`;

      renderActionSummary(route, progress, cargo);
      renderTimeline(route, progress);
      requestAnimationFrame(compactIntel);
    }

    root.addEventListener('sc:session-change', (event) => render(event.detail));
    const observer = new MutationObserver(() => compactIntel());
    observer.observe(currentPanel, { childList: true, subtree: true });
    render();
    return true;
  }

  const observer = new MutationObserver(() => {
    if (install()) observer.disconnect();
  });
  if (!install()) observer.observe(document.documentElement, { childList: true, subtree: true });
}(typeof globalThis !== 'undefined' ? globalThis : window));
