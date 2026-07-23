'use strict';

(function bootstrapRouteView() {
  let initialized = false;

  function initialize() {
    if (initialized) return true;
    const store = window.SCCompanionSession;
    const routeCorrections = window.SCCompanionRouteCorrections;
    const routeProgress = window.SCCompanionRouteProgress;
    const navigation = window.SCCompanionNavigationEstimates;
    const arrival = window.SCCompanionArrivalEstimates;
    const locationContext = window.SCCompanionLocationContext;
    if (!store || !routeCorrections || !routeProgress || !navigation || !arrival || !locationContext) return false;

    const stopName = document.querySelector('#current-stop-name');
    const operations = document.querySelector('#current-stop-operations');
    const stopList = document.querySelector('#route-stop-list');
    const complete = document.querySelector('#complete-stop');
    const previous = document.querySelector('#previous-stop');
    const stateLabel = document.querySelector('#ops-stop-state');
    const currentIndex = document.querySelector('#ops-current-index');
    const progressLabel = document.querySelector('#route-progress-label');
    if (!stopName || !operations || !stopList || !complete || !previous) return false;

    let currentStopIntel = document.querySelector('#current-stop-intel');
    if (!currentStopIntel) {
      currentStopIntel = document.createElement('section');
      currentStopIntel.id = 'current-stop-intel';
      currentStopIntel.className = 'current-stop-intel';
      currentStopIntel.setAttribute('aria-label', 'Current destination operational information');
      operations.insertAdjacentElement('afterend', currentStopIntel);
    }

    initialized = true;

    function escapeHtml(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function operationAction(operation) {
      if (operation.type === 'delivery') return 'DROP OFF';
      if (operation.type === 'collect') return 'COLLECT';
      return 'PICK UP';
    }

    function renderOperation(operation) {
      const item = document.createElement('article');
      item.className = `operation-row is-${operation.type}`;
      const action = operationAction(operation);
      if (!operation.lotId) {
        item.innerHTML = `
          <div class="operation-primary"><span>${action}</span><strong>${operation.label ?? 'Complete objective'}</strong></div>
          <div class="operation-context">Operational objective</div>
          <small class="operation-mission">${operation.missionTitle ?? 'Mission objective'}</small>`;
        return item;
      }

      const origin = operation.pickupLocationLabel ?? operation.originLocationLabel ?? operation.originLocationId ?? 'Unknown origin';
      const destination = operation.destinationLocationLabel ?? operation.deliveryLocationLabel ?? 'Unknown destination';
      const context = operation.type === 'delivery'
        ? `From ${origin}`
        : `To ${destination}`;
      item.innerHTML = `
        <div class="operation-primary"><span>${action}</span><strong>${operation.scu} SCU ${operation.commodity}</strong></div>
        <div class="operation-context">${context}</div>
        <small class="operation-mission">${operation.missionTitle ?? 'Mission cargo'}</small>`;
      return item;
    }

    function operationSummary(stop) {
      const load = stop.operations
        .filter((operation) => operation.type !== 'delivery' && operation.lotId)
        .reduce((sum, operation) => sum + Number(operation.scu ?? 0), 0);
      const unload = stop.operations
        .filter((operation) => operation.type === 'delivery' && operation.lotId)
        .reduce((sum, operation) => sum + Number(operation.scu ?? 0), 0);
      const parts = [];
      if (unload) parts.push(`Drop off ${unload} SCU`);
      if (load) parts.push(`Pick up ${load} SCU`);
      return parts.join(' · ') || `${stop.operations.length} objective${stop.operations.length === 1 ? '' : 's'}`;
    }

    function routeState(state) {
      const route = routeCorrections.deriveRoute(state.route, state.routeCorrections);
      const progress = routeProgress.derive(route, state.completedStopIds, state.currentStopIndex);
      return { route, progress };
    }

    function activeQuantumFactor(state) {
      const ship = (state.hangarShips ?? []).find((item) => item.id === state.selectedShipId);
      return Number(ship?.quantumTimeFactor ?? 1);
    }

    function legEstimate(previousStop, stop, state) {
      if (!previousStop || previousStop.skipped || stop.skipped) return null;
      return navigation.estimateLeg(previousStop.locationId, stop.locationId, {
        quantumTimeFactor: activeQuantumFactor(state)
      });
    }

    function legSummary(previousStop, stop, state) {
      const estimate = legEstimate(previousStop, stop, state);
      if (!previousStop || previousStop.skipped || stop.skipped) return '';
      if (!estimate) return 'Navigation estimate unavailable';
      const jumps = estimate.jumpCount ? ` · ${estimate.jumpCount} jump${estimate.jumpCount === 1 ? '' : 's'}` : '';
      return `${estimate.distanceLabel} · ${estimate.minMinutes}–${estimate.maxMinutes} min${jumps}`;
    }

    function sourceSummary(stop) {
      const context = locationContext.buildContext(stop.locationId, { onboardScu: 0, label: stop.locationLabel });
      const system = context.system?.name ?? 'System unavailable';
      return `${system} · ${context.confidence.label} · ${context.freshness.label}`;
    }

    function statusLabel(status) {
      const labels = {
        available: 'Available',
        'local-transfer': 'Local transfer',
        limited: 'Limited',
        unregulated: 'Unregulated',
        'not-available': 'Not available',
        unverified: 'Unverified',
        'unavailable-data': 'No reviewed data'
      };
      return labels[status] ?? String(status ?? 'unknown').replace(/-/g, ' ');
    }

    function arrivalPreset(location) {
      if (!location) return null;
      if (['orbital-station', 'lagrange-station', 'jump-gateway', 'asteroid-station'].includes(location.type)) return 'orbital-station';
      if (['spaceport', 'landing-zone'].includes(location.type)) return 'landing-zone';
      if (['outpost', 'distribution-center'].includes(location.type)) return 'outpost';
      return null;
    }

    function service(context, id) {
      return context.services.find((item) => item.id === id) ?? {
        status: 'unavailable-data',
        detail: 'No reviewed service record is available for this destination.'
      };
    }

    function intelCard(id, label, value, detail, state = 'neutral') {
      return `<article class="current-stop-intel-card" data-intel="${escapeHtml(id)}" data-state="${escapeHtml(state)}" title="${escapeHtml(detail)}">
        <small>${escapeHtml(label)}</small>
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(detail)}</span>
      </article>`;
    }

    function renderCurrentStopIntel(current, inboundFrom, state) {
      const context = locationContext.buildContext(current.locationId, { onboardScu: 0, label: current.locationLabel });
      const travel = inboundFrom ? legEstimate(inboundFrom, current, state) : null;
      const preset = arrivalPreset(context.location);
      const traffic = context.profile?.traffic?.level === 'volatile' ? 'high' : (context.profile?.traffic?.level ?? 'normal');
      const approach = preset ? arrival.estimateArrival(preset, traffic) : null;
      const hangars = service(context, 'hangars');
      const fuel = service(context, 'landing-services');
      const food = service(context, 'food');
      const medical = service(context, 'medical');
      const travelValue = inboundFrom
        ? (travel ? `${travel.minMinutes}–${travel.maxMinutes} min` : 'Unavailable')
        : 'Start point';
      const travelDetail = inboundFrom
        ? (travel ? `${travel.distanceLabel}${travel.jumpCount ? ` · ${travel.jumpCount} jump${travel.jumpCount === 1 ? '' : 's'}` : ''}` : `No route estimate from ${inboundFrom.locationLabel}.`)
        : 'No inbound leg precedes this stop.';
      const approachValue = approach ? `${approach.minMinutes}–${approach.maxMinutes} min` : 'Unavailable';
      const approachDetail = approach
        ? `Indicative final approach, landing and access time · ${String(traffic).toUpperCase()} traffic model.`
        : `No reviewed arrival model for ${context.location?.type?.replace(/-/g, ' ') ?? 'this location type'}.`;
      const riskDetail = `${context.risk.jurisdiction} · Protection: ${context.risk.armistice} · Comms: ${context.risk.commArray}`;

      currentStopIntel.hidden = false;
      currentStopIntel.dataset.risk = context.risk.level;
      currentStopIntel.innerHTML = `
        <header class="current-stop-intel-header">
          <div><small>ARRIVAL / LOCATION INTEL</small><strong>Before you land</strong></div>
          <span>${escapeHtml(context.confidence.label)} · ${escapeHtml(context.freshness.label)}</span>
        </header>
        <div class="current-stop-intel-grid">
          ${intelCard('travel', 'TRAVEL ETA', travelValue, travelDetail, travel ? 'derived' : 'unavailable-data')}
          ${intelCard('approach', 'FINAL APPROACH', approachValue, approachDetail, approach ? 'derived' : 'unavailable-data')}
          ${intelCard('risk', 'SECURITY / RISK', context.risk.label, riskDetail, context.risk.level)}
          ${intelCard('hangars', 'HANGAR / PAD', statusLabel(hangars.status), hangars.detail, hangars.status)}
          ${intelCard('landing-services', 'FUEL / REPAIR', statusLabel(fuel.status), fuel.detail, fuel.status)}
          ${intelCard('food', 'FOOD / DRINK', statusLabel(food.status), food.detail, food.status)}
          ${intelCard('medical', 'MEDICAL', statusLabel(medical.status), medical.detail, medical.status)}
        </div>
        <p class="current-stop-intel-boundary">Static reviewed facility and security guidance; travel and approach times are derived estimates, not live shard telemetry.</p>`;
    }

    function render(state) {
      stopList.replaceChildren();
      operations.replaceChildren();

      if (!state.route?.stops?.length) {
        stopName.textContent = 'Generate a session first';
        stateLabel.textContent = 'STANDBY';
        currentIndex.textContent = '00 / 00';
        progressLabel.textContent = '0 / 0';
        complete.disabled = true;
        previous.disabled = true;
        operations.innerHTML = '<div class="tool-empty">No live hauling instructions.</div>';
        currentStopIntel.hidden = true;
        currentStopIntel.replaceChildren();
        return;
      }

      const { route, progress } = routeState(state);
      const allStops = route.allStops ?? route.stops;
      const activeIndex = progress.currentStop ? allStops.findIndex((stop) => String(stop.id) === String(progress.currentStop.id)) : allStops.length;
      const completedCount = progress.completedStopIds.length;
      currentIndex.textContent = `${String(Math.min(activeIndex + 1, allStops.length)).padStart(2, '0')} / ${String(allStops.length).padStart(2, '0')}`;
      progressLabel.textContent = `${completedCount} / ${route.stops.length}`;

      allStops.forEach((stop, index) => {
        const item = document.createElement('li');
        const isComplete = progress.completedSet.has(String(stop.id));
        const isCurrent = progress.currentStop?.id === stop.id;
        item.className = [isComplete ? 'is-complete' : '', isCurrent ? 'is-current' : '', stop.skipped ? 'is-skipped' : ''].filter(Boolean).join(' ');
        if (isCurrent) item.setAttribute('aria-current', 'step');
        const flags = [stop.skipped ? 'Skipped' : '', stop.mandatory ? 'Mandatory' : ''].filter(Boolean).join(' · ');
        const leg = legSummary(index ? allStops[index - 1] : null, stop, state);
        item.innerHTML = `
          <span>${String(index + 1).padStart(2, '0')}</span>
          <div>
            <strong>${stop.locationLabel}</strong>
            <small>${operationSummary(stop)}${flags ? ` · ${flags}` : ''}</small>
            ${leg ? `<small class="route-leg-estimate">${leg}</small>` : ''}
            <small class="route-source-context">${sourceSummary(stop)}</small>
          </div>`;
        stopList.append(item);
      });

      previous.disabled = !progress.completedStopIds.length;
      if (progress.complete) {
        stopName.textContent = route.allStops?.some((stop) => stop.skipped) ? 'Active route complete' : 'Session complete';
        stateLabel.textContent = 'COMPLETE';
        complete.disabled = true;
        operations.innerHTML = '<div class="tool-empty">No cargo actions remain on the active route.</div>';
        currentStopIntel.hidden = true;
        currentStopIntel.replaceChildren();
        return;
      }

      const current = progress.currentStop;
      const activeRouteIndex = route.stops.findIndex((stop) => String(stop.id) === String(current.id));
      const inboundFrom = activeRouteIndex > 0 ? route.stops[activeRouteIndex - 1] : null;
      stopName.textContent = current.locationLabel;
      stateLabel.textContent = current.operations.some((operation) => operation.type === 'delivery') ? 'DROP-OFF' : 'PICKUP';
      current.operations.forEach((operation) => operations.append(renderOperation(operation)));
      if (!current.operations.length) operations.innerHTML = '<div class="tool-empty">No cargo movement at this stop.</div>';
      renderCurrentStopIntel(current, inboundFrom, state);
      complete.disabled = false;
      window.dispatchEvent(new CustomEvent('sc:current-stop-location', { detail: { locationId: current.locationId } }));
    }

    previous.addEventListener('click', () => {
      const state = store.getState();
      if (!state.route) return;
      const route = routeCorrections.deriveRoute(state.route, state.routeCorrections);
      const completedStopIds = routeProgress.previous(route, state.completedStopIds, state.currentStopIndex);
      store.patch({ completedStopIds, currentStopIndex: completedStopIds.length });
    });

    complete.addEventListener('click', () => {
      const state = store.getState();
      if (!state.route) return;
      const route = routeCorrections.deriveRoute(state.route, state.routeCorrections);
      const completedStopIds = routeProgress.completeCurrent(route, state.completedStopIds, state.currentStopIndex);
      store.patch({ completedStopIds, currentStopIndex: completedStopIds.length });
    });

    window.addEventListener('sc:session-change', (event) => render(event.detail));
    window.addEventListener('sc:navigation-runtime-ready', () => render(store.getState()));
    window.addEventListener('sc:location-context-ready', () => render(store.getState()));
    render(store.getState());
    return true;
  }

  if (!initialize()) window.addEventListener('sc:route-runtime-ready', initialize, { once: true });
}());