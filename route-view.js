'use strict';

(function bootstrapRouteView() {
  let initialized = false;

  function initialize() {
    if (initialized) return true;
    const store = window.SCCompanionSession;
    const locations = window.SCCompanionLocations;
    const routeCorrections = window.SCCompanionRouteCorrections;
    const routeProgress = window.SCCompanionRouteProgress;
    if (!store || !routeCorrections || !routeProgress) return false;

    const stopName = document.querySelector('#current-stop-name');
    const operations = document.querySelector('#current-stop-operations');
    const stopList = document.querySelector('#route-stop-list');
    const complete = document.querySelector('#complete-stop');
    const previous = document.querySelector('#previous-stop');
    const stateLabel = document.querySelector('#ops-stop-state');
    const currentIndex = document.querySelector('#ops-current-index');
    const progressLabel = document.querySelector('#route-progress-label');
    if (!stopName || !operations || !stopList || !complete || !previous) return false;
    initialized = true;

    function destinationText(locationId, fallback) {
      const location = locations?.getLocation(locationId);
      return location?.navigationTarget ?? fallback;
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
      if (unload) parts.push(`Drop ${unload} SCU`);
      if (load) parts.push(`Pick up ${load} SCU`);
      return parts.join(' · ') || `${stop.operations.length} objective${stop.operations.length === 1 ? '' : 's'}`;
    }

    function routeState(state) {
      const route = routeCorrections.deriveRoute(state.route, state.routeCorrections);
      const progress = routeProgress.derive(route, state.completedStopIds, state.currentStopIndex);
      return { route, progress };
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
        item.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><div><strong>${stop.locationLabel}</strong><small>${operationSummary(stop)}${flags ? ` · ${flags}` : ''}</small></div>`;
        stopList.append(item);
      });

      previous.disabled = !progress.completedStopIds.length;
      if (progress.complete) {
        stopName.textContent = route.allStops?.some((stop) => stop.skipped) ? 'Active route complete' : 'Session complete';
        stateLabel.textContent = 'COMPLETE';
        complete.disabled = true;
        operations.innerHTML = '<div class="tool-empty">No cargo actions remain on the active route.</div>';
        return;
      }

      const current = progress.currentStop;
      stopName.textContent = current.locationLabel;
      stateLabel.textContent = current.operations.some((operation) => operation.type === 'delivery') ? 'DROP-OFF' : 'PICKUP';
      current.operations.forEach((operation) => operations.append(renderOperation(operation)));
      if (!current.operations.length) operations.innerHTML = '<div class="tool-empty">No cargo movement at this stop.</div>';
      complete.disabled = false;
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
    render(store.getState());
    return true;
  }

  if (!initialize()) window.addEventListener('sc:route-runtime-ready', initialize, { once: true });
}());
