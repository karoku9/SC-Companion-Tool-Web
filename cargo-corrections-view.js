'use strict';

(function initializeCargoCorrectionsView() {
  const store = window.SCCompanionSession;
  const cargoState = window.SCCompanionCargoState;
  const root = document.querySelector('#load-operations');
  if (!store || !cargoState || !root) return;

  const section = document.createElement('section');
  section.className = 'blueprint-panel correction-panel';
  section.innerHTML = `
    <div class="panel-title"><span>MANUAL CORRECTIONS</span><small id="correction-status">NO OVERRIDES</small></div>
    <p class="correction-help">Keep the planned lot, but override its actual SCU or operational state. Invalid route states are rejected.</p>
    <div id="correction-list" class="correction-list"></div>`;
  root.append(section);

  const list = section.querySelector('#correction-list');
  const status = section.querySelector('#correction-status');

  function saveCorrection(key, actualScu, requestedStatus) {
    const state = store.getState();
    cargoState.validateCorrection(state.route, state.currentStopIndex, key, { actualScu, status: requestedStatus });
    const next = { ...(state.cargoCorrections ?? {}) };
    const lifecycle = cargoState.deriveCargoState(state.route, state.currentStopIndex, state.cargoCorrections);
    const lot = lifecycle.lots.find((item) => item.key === key);
    const isDefault = Number(actualScu) === lot.plannedScu && requestedStatus === 'auto';
    if (isDefault) delete next[key];
    else next[key] = { actualScu: Number(actualScu), status: requestedStatus };
    store.patch({ cargoCorrections: next });
  }

  function resetCorrection(key) {
    const state = store.getState();
    const next = { ...(state.cargoCorrections ?? {}) };
    delete next[key];
    store.patch({ cargoCorrections: next });
  }

  function renderRow(lot, state) {
    const row = document.createElement('article');
    row.className = `correction-row${lot.corrected ? ' is-corrected' : ''}`;
    const correction = state.cargoCorrections?.[lot.key] ?? {};
    const allowed = cargoState.allowedStatuses(lot, lot.correction ? lot.correction.currentStopIndex : state.currentStopIndex);

    const identity = document.createElement('div');
    identity.className = 'correction-identity';
    identity.innerHTML = `<strong>${lot.missionTitle} · ${lot.commodity}</strong><span>${lot.originLocationLabel} → ${lot.deliveryLocationLabel}</span><small>PLANNED ${lot.plannedScu} SCU · AUTO ${lot.automaticStatus.toUpperCase()}</small>`;

    const quantity = document.createElement('label');
    quantity.innerHTML = '<span>ACTUAL SCU</span>';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = String(lot.plannedScu);
    input.step = '0.01';
    input.value = String(correction.actualScu ?? lot.scu);
    quantity.append(input);

    const stateField = document.createElement('label');
    stateField.innerHTML = '<span>STATE</span>';
    const select = document.createElement('select');
    cargoState.CORRECTION_STATUSES.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value.toUpperCase();
      option.disabled = !allowed.includes(value);
      option.selected = (correction.status ?? 'auto') === value;
      select.append(option);
    });
    stateField.append(select);

    const actions = document.createElement('div');
    actions.className = 'correction-actions';
    const apply = document.createElement('button');
    apply.type = 'button';
    apply.textContent = 'APPLY';
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'secondary-button';
    reset.textContent = 'RESET';
    reset.disabled = !state.cargoCorrections?.[lot.key];
    const message = document.createElement('small');
    message.className = 'correction-message';

    apply.addEventListener('click', () => {
      try {
        saveCorrection(lot.key, input.value, select.value);
      } catch (error) {
        message.textContent = error.message;
        message.classList.add('is-error');
      }
    });
    reset.addEventListener('click', () => resetCorrection(lot.key));
    actions.append(apply, reset, message);
    row.append(identity, quantity, stateField, actions);
    return row;
  }

  function render(state) {
    list.replaceChildren();
    if (!state.route?.stops?.length) {
      status.textContent = 'NO ACTIVE SESSION';
      list.innerHTML = '<div class="empty-inline-state">Generate a route to enable corrections.</div>';
      return;
    }
    const lifecycle = cargoState.deriveCargoState(state.route, state.currentStopIndex, state.cargoCorrections);
    status.textContent = `${lifecycle.correctionCount} OVERRIDE${lifecycle.correctionCount === 1 ? '' : 'S'}`;
    lifecycle.lots.forEach((lot) => list.append(renderRow(lot, state)));
    if (lifecycle.correctionIssues.length) {
      const warning = document.createElement('div');
      warning.className = 'correction-warning';
      warning.textContent = `${lifecycle.correctionIssues.length} correction(s) are suspended at this route position.`;
      list.prepend(warning);
    }
  }

  window.addEventListener('sc:session-change', (event) => render(event.detail));
  render(store.getState());
}());
