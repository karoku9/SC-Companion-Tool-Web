'use strict';

(function initializeFleetLoadoutsView() {
  const store = window.SCCompanionSession;
  const loadouts = window.SCCompanionFleetLoadouts;
  const catalog = window.SCCompanionShipCatalog;
  const page = document.querySelector('#hangar');
  if (!store || !loadouts || !catalog || !page) return;

  let editingId = null;
  let migrationInProgress = false;

  const panel = document.createElement('section');
  panel.className = 'mfd-panel fleet-loadout-editor';
  panel.id = 'fleet-loadout-editor';
  panel.innerHTML = `
    <header class="mfd-header">
      <div><small>CONFIG / STRUCTURED SYSTEMS</small><strong>Ship loadouts</strong></div>
      <span id="fleet-loadout-status">MIGRATING</span>
    </header>
    <div class="fleet-loadout-layout">
      <aside class="fleet-loadout-browser">
        <div class="fleet-loadout-browser-head"><div><small>SELECTED SHIP</small><strong id="fleet-loadout-ship">—</strong></div><button type="button" class="button button--secondary" id="fleet-loadout-new">New loadout</button></div>
        <div id="fleet-loadout-list" class="fleet-loadout-list"></div>
      </aside>
      <form id="fleet-loadout-form" class="fleet-loadout-form">
        <div class="fleet-loadout-form-head"><div><small>LOADOUT RECORD</small><strong id="fleet-loadout-form-title">New loadout</strong></div><span id="fleet-loadout-active-badge">DRAFT</span></div>
        <label>Loadout name<input id="fleet-loadout-name" required maxlength="80" placeholder="Fast Stanton"></label>
        <div class="fleet-performance-grid">
          <label>Quantum time factor<input id="fleet-loadout-quantum-factor" type="number" min="0.1" max="5" step="0.01" value="1"><small>Lower values reduce the navigation-time estimate.</small></label>
          <label>Handling time factor<input id="fleet-loadout-handling-factor" type="number" min="0.25" max="4" step="0.01" value="1"><small>Applied to load and unload handling estimates.</small></label>
          <label>Fuel efficiency factor<input id="fleet-loadout-fuel-factor" type="number" min="0.1" max="5" step="0.01" value="1"><small>Stored for future fuel calculations; neutral is 1.</small></label>
          <label>Quantum spool seconds<input id="fleet-loadout-spool" type="number" min="0" max="600" step="1" value="0"><small>Visible assumption; not yet added to every leg.</small></label>
          <label>Cargo capacity delta<input id="fleet-loadout-cargo-delta" type="number" min="-1000" max="1000" step="1" value="0"><small>Operational change from modules or reserved grid space.</small></label>
        </div>
        <section class="fleet-components-section">
          <header><div><small>COMPONENT LEDGER</small><strong>Structured components</strong></div><button type="button" class="button button--secondary" id="fleet-component-add">Add component</button></header>
          <div id="fleet-component-list" class="fleet-component-list"></div>
        </section>
        <label>Loadout notes<textarea id="fleet-loadout-notes" rows="3" placeholder="Assumptions, intended route, test results..."></textarea></label>
        <div class="fleet-loadout-assumptions" id="fleet-loadout-assumptions"></div>
        <div class="fleet-loadout-actions"><button type="button" class="button button--secondary" id="fleet-loadout-cancel">Reset editor</button><button type="submit" class="button button--primary">Save and activate</button></div>
      </form>
    </div>`;
  page.append(panel);

  const elements = {
    status: panel.querySelector('#fleet-loadout-status'),
    ship: panel.querySelector('#fleet-loadout-ship'),
    list: panel.querySelector('#fleet-loadout-list'),
    form: panel.querySelector('#fleet-loadout-form'),
    formTitle: panel.querySelector('#fleet-loadout-form-title'),
    badge: panel.querySelector('#fleet-loadout-active-badge'),
    name: panel.querySelector('#fleet-loadout-name'),
    quantumFactor: panel.querySelector('#fleet-loadout-quantum-factor'),
    handlingFactor: panel.querySelector('#fleet-loadout-handling-factor'),
    fuelFactor: panel.querySelector('#fleet-loadout-fuel-factor'),
    spool: panel.querySelector('#fleet-loadout-spool'),
    cargoDelta: panel.querySelector('#fleet-loadout-cargo-delta'),
    components: panel.querySelector('#fleet-component-list'),
    notes: panel.querySelector('#fleet-loadout-notes'),
    assumptions: panel.querySelector('#fleet-loadout-assumptions'),
    newButton: panel.querySelector('#fleet-loadout-new'),
    addComponent: panel.querySelector('#fleet-component-add'),
    cancel: panel.querySelector('#fleet-loadout-cancel')
  };

  function selectedShip(state) {
    return (state.hangarShips ?? []).find((ship) => ship.id === state.selectedShipId) ?? state.hangarShips?.[0] ?? null;
  }

  function shipName(ship) {
    const model = catalog.getModel(ship?.modelId);
    return ship?.nickname || (model ? `${model.manufacturer} ${model.model}` : 'Selected ship');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  function optionMarkup(selected) {
    return loadouts.SLOT_DEFINITIONS.map((slot) => `<option value="${slot.id}"${slot.id === selected ? ' selected' : ''}>${slot.label}</option>`).join('');
  }

  function sourceOptions(selected) {
    const labels = { official: 'Official source', community: 'Community record', user: 'User supplied', legacy: 'Legacy migration', unknown: 'Unknown' };
    return loadouts.SOURCE_KINDS.map((kind) => `<option value="${kind}"${kind === selected ? ' selected' : ''}>${labels[kind]}</option>`).join('');
  }

  function componentCard(component = {}, index = elements.components.children.length) {
    const article = document.createElement('details');
    article.className = 'fleet-component-card';
    article.open = index === 0;
    article.dataset.componentId = component.id || `component-${Date.now()}-${index}`;
    article.innerHTML = `
      <summary><span>${escapeHtml(component.name || 'New component')}</span><small>${loadouts.SLOT_DEFINITIONS.find((slot) => slot.id === component.slot)?.label || 'Utility module'}</small></summary>
      <div class="fleet-component-fields">
        <label>Slot<select data-component-field="slot">${optionMarkup(component.slot || 'utility')}</select></label>
        <label>Component name<input data-component-field="name" value="${escapeAttribute(component.name)}" required></label>
        <label>Manufacturer<input data-component-field="manufacturer" value="${escapeAttribute(component.manufacturer)}"></label>
        <label>Size / class<input data-component-field="size" value="${escapeAttribute(component.size)}" placeholder="S2 / Military A"></label>
        <label>Source type<select data-component-field="source-kind">${sourceOptions(component.source?.kind || 'user')}</select></label>
        <label>Source authority<input data-component-field="source-authority" value="${escapeAttribute(component.source?.authority)}" placeholder="User supplied"></label>
        <label class="fleet-component-wide">Reference<input data-component-field="source-reference" value="${escapeAttribute(component.source?.reference)}" placeholder="URL, document, or note"></label>
        <label class="fleet-component-wide">Notes<input data-component-field="notes" value="${escapeAttribute(component.notes)}"></label>
      </div>
      <button type="button" class="button button--secondary fleet-component-remove">Remove component</button>`;
    article.querySelector('[data-component-field="name"]').addEventListener('input', (event) => { article.querySelector('summary span').textContent = event.target.value || 'New component'; });
    article.querySelector('[data-component-field="slot"]').addEventListener('change', (event) => { article.querySelector('summary small').textContent = loadouts.SLOT_DEFINITIONS.find((slot) => slot.id === event.target.value)?.label || 'Utility module'; });
    article.querySelector('.fleet-component-remove').addEventListener('click', () => article.remove());
    return article;
  }

  function currentEditorLoadout(state, ship) {
    const shipLoadouts = loadouts.loadoutsForShip(state, ship.id);
    return shipLoadouts.find((loadout) => loadout.id === editingId) ?? null;
  }

  function renderEditor(state, ship, loadout) {
    const activeId = state.activeLoadoutByShip?.[ship.id];
    const performance = loadout ? loadouts.derivePerformance(ship, loadout) : null;
    elements.formTitle.textContent = loadout ? `Edit ${loadout.name}` : 'New loadout';
    elements.badge.textContent = loadout?.id === activeId ? 'ACTIVE' : loadout ? 'SAVED' : 'DRAFT';
    elements.name.value = loadout?.name ?? '';
    elements.quantumFactor.value = String(loadout?.performanceOverrides?.quantumTimeFactor ?? performance?.quantumTimeFactor ?? 1);
    elements.handlingFactor.value = String(loadout?.performanceOverrides?.handlingTimeFactor ?? performance?.handlingTimeFactor ?? 1);
    elements.fuelFactor.value = String(loadout?.performanceOverrides?.fuelEfficiencyFactor ?? performance?.fuelEfficiencyFactor ?? 1);
    elements.spool.value = String(loadout?.performanceOverrides?.quantumSpoolSeconds ?? performance?.quantumSpoolSeconds ?? 0);
    elements.cargoDelta.value = String(loadout?.performanceOverrides?.cargoCapacityDeltaScu ?? performance?.cargoCapacityDeltaScu ?? 0);
    elements.notes.value = loadout?.notes ?? '';
    elements.components.replaceChildren();
    (loadout?.components?.length ? loadout.components : [{ slot: 'quantum-drive', name: 'Stock', source: { kind: 'user', authority: 'User supplied' } }])
      .forEach((component, index) => elements.components.append(componentCard(component, index)));
    const unknowns = performance?.unknowns ?? ['New loadout: values remain user assumptions until saved with source records.'];
    elements.assumptions.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = 'ESTIMATION BOUNDARY';
    const detail = document.createElement('span');
    detail.textContent = unknowns.length ? unknowns.join(' ') : 'All active estimate inputs have an explicit component source.';
    elements.assumptions.append(heading, detail);
  }

  function updateSelectedShipStats(state, ship, active) {
    const performance = loadouts.derivePerformance(ship, active);
    document.querySelector('#fleet-quantum-drive').textContent = performance.quantumDriveName;
    document.querySelector('#fleet-quantum-factor').textContent = `× ${performance.quantumTimeFactor.toFixed(2)}`;
    document.querySelector('#fleet-selected-capacity').textContent = `${performance.operationalCargoCapacityScu} SCU`;
    document.querySelector('#fleet-grid-capacity').textContent = performance.cargoCapacityDeltaScu
      ? `${performance.baseCargoCapacityScu} ${performance.cargoCapacityDeltaScu > 0 ? '+' : '−'} ${Math.abs(performance.cargoCapacityDeltaScu)} = ${performance.operationalCargoCapacityScu} SCU`
      : `${performance.operationalCargoCapacityScu} SCU`;
  }

  function render(state) {
    if (!migrationInProgress && loadouts.needsMigration(state)) {
      migrationInProgress = true;
      store.replace(loadouts.migrateState(state));
      migrationInProgress = false;
      return;
    }
    const ship = selectedShip(state);
    if (!ship) {
      elements.status.textContent = 'NO SHIP';
      elements.ship.textContent = 'Add a ship first';
      elements.list.replaceChildren();
      elements.form.hidden = true;
      return;
    }
    elements.form.hidden = false;
    const shipLoadouts = loadouts.loadoutsForShip(state, ship.id);
    const active = loadouts.activeLoadout(state, ship.id);
    if (!editingId || !shipLoadouts.some((loadout) => loadout.id === editingId)) editingId = active?.id ?? null;
    elements.status.textContent = `${shipLoadouts.length} LOADOUT${shipLoadouts.length === 1 ? '' : 'S'}`;
    elements.ship.textContent = shipName(ship);
    elements.list.replaceChildren();
    shipLoadouts.forEach((loadout) => {
      const performance = loadouts.derivePerformance(ship, loadout);
      const card = document.createElement('article');
      card.className = `fleet-loadout-card${loadout.id === active?.id ? ' is-active' : ''}`;
      const sourceKinds = [...new Set(loadout.components.map((component) => component.source.kind))];
      card.innerHTML = `
        <div><small>${loadout.id === active?.id ? 'ACTIVE LOADOUT' : 'SAVED LOADOUT'}</small><strong>${escapeHtml(loadout.name)}</strong><span>${escapeHtml(performance.quantumDriveName)} · ${performance.operationalCargoCapacityScu} SCU</span></div>
        <dl><div><dt>Quantum</dt><dd>×${performance.quantumTimeFactor.toFixed(2)}</dd></div><div><dt>Handling</dt><dd>×${performance.handlingTimeFactor.toFixed(2)}</dd></div><div><dt>Sources</dt><dd>${escapeHtml(sourceKinds.join(', ') || 'unknown')}</dd></div></dl>
        <div class="fleet-loadout-card-actions"><button type="button" data-loadout-edit>Edit</button><button type="button" data-loadout-activate ${loadout.id === active?.id ? 'disabled' : ''}>${loadout.id === active?.id ? 'Active' : 'Activate'}</button><button type="button" data-loadout-delete ${shipLoadouts.length <= 1 ? 'disabled' : ''}>Delete</button></div>`;
      card.querySelector('[data-loadout-edit]').addEventListener('click', () => { editingId = loadout.id; render(store.getState()); panel.scrollIntoView({ block: 'start', behavior: 'auto' }); });
      card.querySelector('[data-loadout-activate]').addEventListener('click', () => store.replace(loadouts.activateLoadoutState(store.getState(), ship.id, loadout.id)));
      card.querySelector('[data-loadout-delete]').addEventListener('click', () => {
        try { store.replace(loadouts.deleteLoadoutState(store.getState(), ship.id, loadout.id)); editingId = null; }
        catch (error) { window.dispatchEvent(new CustomEvent('sc:toast', { detail: { tone: 'error', title: 'Loadout not deleted', message: error.message } })); }
      });
      elements.list.append(card);
    });
    updateSelectedShipStats(state, ship, active);
    renderEditor(state, ship, currentEditorLoadout(state, ship));
  }

  function field(row, name) {
    return row.querySelector(`[data-component-field="${name}"]`)?.value ?? '';
  }

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const state = store.getState();
    const ship = selectedShip(state);
    if (!ship) return;
    const components = [...elements.components.querySelectorAll('.fleet-component-card')].map((row, index) => ({
      id: row.dataset.componentId || `component-${index + 1}`,
      slot: field(row, 'slot'),
      name: field(row, 'name'),
      manufacturer: field(row, 'manufacturer'),
      size: field(row, 'size'),
      source: {
        kind: field(row, 'source-kind'),
        authority: field(row, 'source-authority'),
        reference: field(row, 'source-reference')
      },
      notes: field(row, 'notes')
    }));
    const id = editingId || `${ship.id}-loadout-${Date.now()}`;
    try {
      const next = loadouts.saveLoadoutState(state, ship.id, {
        id,
        name: elements.name.value,
        components,
        performanceOverrides: {
          quantumTimeFactor: elements.quantumFactor.value,
          handlingTimeFactor: elements.handlingFactor.value,
          fuelEfficiencyFactor: elements.fuelFactor.value,
          quantumSpoolSeconds: elements.spool.value,
          cargoCapacityDeltaScu: elements.cargoDelta.value
        },
        notes: elements.notes.value
      });
      editingId = id;
      store.replace(next);
      window.dispatchEvent(new CustomEvent('sc:toast', { detail: { tone: 'success', title: 'Loadout active', message: `${elements.name.value} now drives ship estimates.` } }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('sc:toast', { detail: { tone: 'error', title: 'Loadout not saved', message: error.message } }));
    }
  });

  elements.newButton.addEventListener('click', () => { editingId = null; renderEditor(store.getState(), selectedShip(store.getState()), null); });
  elements.cancel.addEventListener('click', () => { editingId = loadouts.activeLoadout(store.getState(), selectedShip(store.getState())?.id)?.id ?? null; render(store.getState()); });
  elements.addComponent.addEventListener('click', () => elements.components.append(componentCard({ slot: 'utility', source: { kind: 'user', authority: 'User supplied' } })));
  window.addEventListener('sc:session-change', (event) => render(event.detail));
  render(store.getState());
}());
