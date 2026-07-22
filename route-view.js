'use strict';

(function initializeRouteView() {
  const store = window.SCCompanionSession;
  const planner = window.SCCompanionRoutePlanner;
  const locations = window.SCCompanionLocations;
  const routeCorrections = window.SCCompanionRouteCorrections;
  const routeProgress = window.SCCompanionRouteProgress;
  if (!store || !planner || !routeCorrections || !routeProgress) return;

  const stopName = document.querySelector('#current-stop-name');
  const operations = document.querySelector('#current-stop-operations');
  const stopList = document.querySelector('#route-stop-list');
  const complete = document.querySelector('#complete-stop');
  const phoneStop = document.querySelector('#phone-stop');
  const phoneDestination = document.querySelector('#phone-destination');
  const phoneAction = document.querySelector('#phone-action');

  let previous = document.querySelector('#previous-stop');
  if (!previous && complete) {
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
    const item = document.createElement('div');
    item.className = `operation-row is-${operation.type}`;
    const verb = document.createElement('strong');
    verb.textContent = operation.type === 'delivery' ? 'UNLOAD' : 'LOAD';
    const detail = document.createElement('span');
    detail.textContent = planner.operationInstruction(operation);
    item.append(verb, detail);
    return item;
  }

  function routeState(state) {
    const route = routeCorrections.deriveRoute(state.route, state.routeCorrections);
    const progress = routeProgress.derive(route, state.completedStopIds, state.currentStopIndex);
    return { route, progress };
  }

  function render(state) {
    const baseRoute = state.route;
    stopList.replaceChildren();
    operations.replaceChildren();

    if (!baseRoute?.stops?.length) {
      stopName.textContent = 'Generate a session first';
      complete.disabled = true;
      previous.disabled = true;
      phoneStop.textContent = 'No active route';
      phoneDestination.textContent = '—';
      phoneAction.textContent = 'Generate a session';
      return;
    }

    const { route, progress } = routeState(state);
    route.allStops.forEach((stop, index) => {
      const item = document.createElement('li');
      const isComplete = progress.completedSet.has(String(stop.id));
      item.className = [isComplete ? 'is-complete' : '', progress.currentStop?.id === stop.id ? 'is-current' : '', stop.skipped ? 'is-skipped' : ''].filter(Boolean).join(' ');
      const flags = [stop.skipped ? 'SKIPPED' : '', stop.mandatory ? 'MANDATORY' : ''].filter(Boolean).join(' · ');
      item.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><div><strong>${stop.locationLabel}</strong><small>${stop.operations.length} operations${flags ? ` · ${flags}` : ''}</small></div>`;
      stopList.append(item);
    });

    previous.disabled = !progress.completedStopIds.length;
    if (progress.complete) {
      stopName.textContent = route.allStops.some((stop) => stop.skipped) ? 'ACTIVE ROUTE COMPLETE' : 'SESSION COMPLETE';
      complete.disabled = true;
      phoneStop.textContent = 'Active route complete';
      phoneDestination.textContent = '—';
      phoneAction.textContent = route.allStops.some((stop) => stop.skipped) ? 'Skipped stops remain available' : 'All stops completed';
      return;
    }

    const current = progress.currentStop;
    stopName.textContent = current.locationLabel;
    current.operations.forEach((operation) => operations.append(renderOperation(operation)));
    complete.disabled = false;
    phoneStop.textContent = current.locationLabel;
    phoneDestination.textContent = `IN GAME: ${destinationText(current.locationId, current.locationLabel).toUpperCase()}`;
    phoneAction.textContent = current.operations[0] ? planner.operationInstruction(current.operations[0]) : 'Complete stop';
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
}());