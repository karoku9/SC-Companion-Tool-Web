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
    const phoneStop = document.querySelector('#phone-stop');
    const phoneDestination = document.querySelector('#phone-destination');
    const phoneAction = document.querySelector('#phone-action');
    if (!stopName || !operations || !stopList || !complete) return false;
    initialized = true;

    let previous = document.querySelector('#previous-stop');
    if (!previous) {
      const controls = document.createElement('div');
      controls.className = 'route-controls';
      previous = document.createElement('button');
      previous.type = 'button';
      previous.id = 'previous-stop';
      previous.className = 'secondary-button';
      previous.textContent = 'PREVIOUS';
      complete.before(controls);
      controls.append(previous, complete);
    }

    function destinationText(locationId, fallback) {
      const location = locations?.getLocation(locationId);
      return location?.navigationTarget ?? fallback;
    }

    function renderOperation(operation) {
      const item = document.createElement('article');
      item.className = `operation-row is-${operation.type}`;
      const action = operation.type === 'delivery' ? 'UNLOAD' : operation.type === 'collect' ? 'COLLECT' : 'LOAD';
      if (!operation.lotId) {
        item.innerHTML = `<div class="operation-primary"><span>${action}</span><strong>${operation.label ?? 'Complete objective'}</strong></div><small>${operation.missionTitle}</small>`;
        return item;
      }
      const origin = operation.pickupLocationLabel ?? operation.originLocationLabel ?? operation.originLocationId;
      const context = operation.type === 'delivery'
        ? `Loaded at ${origin}`
        : `Deliver to ${operation.destinationLocationLabel}`;
      item.innerHTML = `
        <div class="operation-primary"><span>${action}</span><strong>${operation.scu} SCU ${operation.commodity}</strong></div>
        <div class="operation-context">${context}</div>
        <small class="operation-mission">${operation.missionTitle}</small>`;
      return item;
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
        complete.disabled = true;
        previous.disabled = true;
        if (phoneStop) phoneStop.textContent = 'No active route';
        if (phoneDestination) phoneDestination.textContent = '—';
        if (phoneAction) phoneAction.textContent = 'Generate a session';
        return;
      }

      const { route, progress } = routeState(state);
      route.allStops.forEach((stop, index) => {
        const item = document.createElement('li');
        const isComplete = progress.completedSet.has(String(stop.id));
        item.className = [isComplete ? 'is-complete' : '', progress.currentStop?.id === stop.id ? 'is-current' : '', stop.skipped ? 'is-skipped' : ''].filter(Boolean).join(' ');
        const flags = [stop.skipped ? 'SKIPPED' : '', stop.mandatory ? 'MANDATORY' : ''].filter(Boolean).join(' · ');
        item.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><div><strong>${stop.locationLabel}</strong><small>${stop.operations.length} action${stop.operations.length === 1 ? '' : 's'}${flags ? ` · ${flags}` : ''}</small></div>`;
        stopList.append(item);
      });

      previous.disabled = !progress.completedStopIds.length;
      if (progress.complete) {
        stopName.textContent = route.allStops.some((stop) => stop.skipped) ? 'ACTIVE ROUTE COMPLETE' : 'SESSION COMPLETE';
        complete.disabled = true;
        if (phoneStop) phoneStop.textContent = 'Active route complete';
        if (phoneDestination) phoneDestination.textContent = '—';
        if (phoneAction) phoneAction.textContent = route.allStops.some((stop) => stop.skipped) ? 'Skipped stops remain available' : 'All stops completed';
        return;
      }

      const current = progress.currentStop;
      stopName.textContent = current.locationLabel;
      current.operations.forEach((operation) => operations.append(renderOperation(operation)));
      complete.disabled = false;
      if (phoneStop) phoneStop.textContent = current.locationLabel;
      if (phoneDestination) phoneDestination.textContent = `IN GAME: ${destinationText(current.locationId, current.locationLabel).toUpperCase()}`;
      if (phoneAction) {
        const first = current.operations[0];
        phoneAction.textContent = first?.lotId
          ? `${first.type === 'delivery' ? 'Unload' : 'Load'} ${first.scu} SCU ${first.commodity}`
          : first?.label ?? 'Complete stop';
      }
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
