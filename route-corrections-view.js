'use strict';

(function initializeRouteCorrectionsView() {
  const store = window.SCCompanionSession;
  const model = window.SCCompanionRouteCorrections;
  const progressModel = window.SCCompanionRouteProgress;
  const routeSection = document.querySelector('#route');
  if (!store || !model || !progressModel || !routeSection) return;

  const panel = document.createElement('section');
  panel.className = 'route-correction-panel';
  panel.innerHTML = `
    <div class="route-correction-heading">
      <div><p class="eyebrow">ROUTE CORRECTIONS</p><h3>Adjust future stops safely</h3></div>
      <div class="route-correction-meta"><span id="route-correction-count">NO CHANGES</span><button type="button" class="secondary-button" id="route-correction-reset">RESET ROUTE</button></div>
    </div>
    <p class="field-help">Completed stops are locked. Future stops can move, skip or become mandatory only while pickup → delivery dependencies remain valid.</p>
    <div class="route-correction-message" id="route-correction-message" aria-live="polite"></div>
    <div class="route-correction-list" id="route-correction-list"></div>`;
  routeSection.append(panel);

  const list = panel.querySelector('#route-correction-list');
  const message = panel.querySelector('#route-correction-message');
  const count = panel.querySelector('#route-correction-count');
  const reset = panel.querySelector('#route-correction-reset');

  function currentContext(state) {
    const route = model.deriveRoute(state.route, state.routeCorrections);
    const progress = progressModel.derive(route, state.completedStopIds, state.currentStopIndex);
    return { route, progress };
  }

  function toast(tone, title, text) {
    window.dispatchEvent(new CustomEvent('sc:toast', { detail: { tone, title, message: text } }));
  }

  function apply(transform, successMessage = 'Future route updated.') {
    const state = store.getState();
    if (!state.route) return;
    try {
      const { route, progress } = currentContext(state);
      const next = transform(state, route, progress);
      message.textContent = successMessage;
      message.className = 'route-correction-message is-success';
      store.patch({ routeCorrections: next, completedStopIds: progress.completedStopIds, currentStopIndex: progress.completedStopIds.length });
      toast('success', 'Route updated', successMessage);
    } catch (error) {
      message.textContent = error.message;
      message.className = 'route-correction-message is-error';
      toast('error', 'Route unchanged', error.message);
    }
  }

  function actionButton(label, title, disabled, onClick, className = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.title = title;
    button.disabled = disabled;
    if (className) button.className = className;
    button.addEventListener('click', onClick);
    return button;
  }

  function renderRow(stop, state, route, progress, index) {
    const completed = progress.completedSet.has(String(stop.id));
    const row = document.createElement('article');
    row.className = `route-correction-row${stop.skipped ? ' is-skipped' : ''}${completed ? ' is-complete' : ''}`;

    const identity = document.createElement('div');
    identity.className = 'route-correction-identity';
    const stateLabel = completed ? 'COMPLETED' : stop.skipped ? 'SKIPPED' : progress.currentStop?.id === stop.id ? 'CURRENT' : 'PLANNED';
    identity.innerHTML = `<strong>${String(index + 1).padStart(2, '0')} · ${stop.locationLabel}</strong><span>${stop.operations.length} operations</span><small>${stateLabel}${stop.mandatory ? ' · MANDATORY' : ''}</small>`;

    const controls = document.createElement('div');
    controls.className = 'route-correction-actions';
    const previousStop = route.allStops[index - 1];
    const nextStop = route.allStops[index + 1];
    const moveLocked = completed;
    controls.append(
      actionButton('↑', 'Move earlier', moveLocked || !previousStop || progress.completedSet.has(String(previousStop.id)), () => apply((currentState, effective, currentProgress) => model.changeOrder(currentState.route, currentState.routeCorrections, stop.id, -1, currentProgress.completedStopIds), `${stop.locationLabel} moved earlier.`)),
      actionButton('↓', 'Move later', moveLocked || !nextStop || progress.completedSet.has(String(nextStop.id)), () => apply((currentState, effective, currentProgress) => model.changeOrder(currentState.route, currentState.routeCorrections, stop.id, 1, currentProgress.completedStopIds), `${stop.locationLabel} moved later.`)),
      actionButton(stop.skipped ? 'REOPEN' : 'SKIP', stop.skipped ? 'Return stop to the active route' : 'Temporarily remove stop from active route', completed || (!stop.skipped && stop.mandatory), () => apply((currentState, effective, currentProgress) => model.setSkipped(currentState.route, currentState.routeCorrections, stop.id, !stop.skipped, currentProgress.completedStopIds), `${stop.locationLabel} ${stop.skipped ? 'reopened' : 'skipped'}.`), stop.skipped ? 'is-reopen' : ''),
      actionButton(stop.mandatory ? 'UNLOCK' : 'MANDATORY', stop.mandatory ? 'Allow this stop to be skipped' : 'Prevent accidental skipping', completed, () => apply((currentState) => model.setMandatory(currentState.route, currentState.routeCorrections, stop.id, !stop.mandatory), `${stop.locationLabel} ${stop.mandatory ? 'unlocked' : 'marked mandatory'}.`))
    );
    row.append(identity, controls);
    return row;
  }

  function render(state) {
    list.replaceChildren();
    if (!state.route?.stops?.length) {
      count.textContent = 'NO ACTIVE SESSION';
      reset.disabled = true;
      list.innerHTML = '<div class="empty-inline-state">Generate a route to enable corrections.</div>';
      return;
    }
    const { route, progress } = currentContext(state);
    count.textContent = `${route.correctionCount} CHANGE${route.correctionCount === 1 ? '' : 'S'}`;
    reset.disabled = !route.correctionCount;
    route.allStops.forEach((stop, index) => list.append(renderRow(stop, state, route, progress, index)));
  }

  reset.addEventListener('click', () => apply((state) => model.reset(state.route), 'Generated route restored.'));
  window.addEventListener('sc:session-change', (event) => render(event.detail));
  render(store.getState());
}());
