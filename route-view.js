'use strict';

(function initializeRouteView() {
  const store = window.SCCompanionSession;
  const planner = window.SCCompanionRoutePlanner;
  const locations = window.SCCompanionLocations;
  if (!store || !planner) return;

  const stopName = document.querySelector('#current-stop-name');
  const operations = document.querySelector('#current-stop-operations');
  const stopList = document.querySelector('#route-stop-list');
  const complete = document.querySelector('#complete-stop');
  const phoneStop = document.querySelector('#phone-stop');
  const phoneDestination = document.querySelector('#phone-destination');
  const phoneAction = document.querySelector('#phone-action');

  function destinationText(locationId, fallback) {
    const location = locations?.getLocation(locationId);
    return location?.navigationTarget ?? fallback;
  }

  function renderOperation(operation) {
    const item = document.createElement('div');
    item.className = `operation-row is-${operation.type}`;
    const verb = document.createElement('strong');
    verb.textContent = operation.type.toUpperCase();
    const detail = document.createElement('span');
    detail.textContent = planner.operationInstruction(operation);
    item.append(verb, detail);
    return item;
  }

  function render(state) {
    const route = state.route;
    const currentIndex = state.currentStopIndex ?? 0;
    stopList.replaceChildren();
    operations.replaceChildren();

    if (!route?.stops?.length) {
      stopName.textContent = 'Generate a session first';
      complete.disabled = true;
      phoneStop.textContent = 'No active route';
      phoneDestination.textContent = '—';
      phoneAction.textContent = 'Generate a session';
      return;
    }

    route.stops.forEach((stop, index) => {
      const item = document.createElement('li');
      item.className = index < currentIndex ? 'is-complete' : index === currentIndex ? 'is-current' : '';
      item.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><div><strong>${stop.locationLabel}</strong><small>${stop.operations.length} operations</small></div>`;
      stopList.append(item);
    });

    if (currentIndex >= route.stops.length) {
      stopName.textContent = 'SESSION COMPLETE';
      complete.disabled = true;
      phoneStop.textContent = 'Session complete';
      phoneDestination.textContent = '—';
      phoneAction.textContent = 'All stops completed';
      return;
    }

    const current = route.stops[currentIndex];
    stopName.textContent = current.locationLabel;
    current.operations.forEach((operation) => operations.append(renderOperation(operation)));
    complete.disabled = false;
    phoneStop.textContent = current.locationLabel;
    phoneDestination.textContent = `IN GAME: ${destinationText(current.locationId, current.locationLabel).toUpperCase()}`;
    phoneAction.textContent = planner.operationInstruction(current.operations[0]);
  }

  complete.addEventListener('click', () => {
    const state = store.getState();
    if (!state.route) return;
    store.patch({ currentStopIndex: Math.min((state.currentStopIndex ?? 0) + 1, state.route.stops.length) });
  });

  window.addEventListener('sc:session-change', (event) => render(event.detail));
  render(store.getState());
}());
