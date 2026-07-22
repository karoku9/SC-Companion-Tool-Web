'use strict';

(function initializeCargoZoneEditor() {
  const store = window.SCCompanionSession;
  const catalog = window.SCCompanionShipCatalog;
  const zoneModel = window.SCCompanionCargoZones;
  const root = document.querySelector('#cargo');
  if (!store || !catalog || !zoneModel || !root) return;

  const section = document.createElement('section');
  section.className = 'cargo-zone-editor';
  section.innerHTML = `
    <header class="cargo-zone-editor-heading">
      <div><span>SHIP CONFIGURATION</span><h3>Cargo zones</h3><p>Adjust logical separators, access labels and vertical layers without changing the ship's physical SCU capacity.</p></div>
      <div class="cargo-zone-editor-summary"><span>ASSIGNED <strong id="zone-assigned">0 SCU</strong></span><span>REMAINING <strong id="zone-remaining">0 SCU</strong></span></div>
    </header>
    <div class="cargo-zone-editor-list" id="cargo-zone-editor-list"></div>
    <div class="cargo-zone-editor-footer">
      <button type="button" class="secondary-button" id="cargo-zone-add">ADD ZONE</button>
      <span class="cargo-zone-editor-message" id="cargo-zone-message" aria-live="polite"></span>
      <button type="button" class="secondary-button" id="cargo-zone-reset">RESET SHIP DEFAULT</button>
      <button type="button" class="accent-button" id="cargo-zone-save">SAVE ZONES</button>
    </div>`;
  root.append(section);

  const elements = {
    list: section.querySelector('#cargo-zone-editor-list'),
    assigned: section.querySelector('#zone-assigned'),
    remaining: section.querySelector('#zone-remaining'),
    message: section.querySelector('#cargo-zone-message'),
    add: section.querySelector('#cargo-zone-add'),
    reset: section.querySelector('#cargo-zone-reset'),
    save: section.querySelector('#cargo-zone-save')
  };

  let draft = [];
  let activeShipId = null;
  let capacity = 0;
  let dirty = false;

  function activeContext(state) {
    const ship = (state.hangarShips ?? []).find((item) => item.id === state.selectedShipId) ?? null;
    const base = catalog.getModel(ship?.modelId ?? state.selectedShipModelId) ?? catalog.models[0];
    return { ship, base, capacity: Number(ship?.cargoCapacityScu ?? base.capacityScu) };
  }

  function cloneZones(zones) {
    return zones.map((zone) => ({ ...zone }));
  }

  function totalAssigned() {
    return draft.reduce((sum, zone) => sum + Math.max(0, Number(zone.capacityScu) || 0), 0);
  }

  function updateSummary() {
    const assigned = totalAssigned();
    const remaining = capacity - assigned;
    elements.assigned.textContent = `${assigned} SCU`;
    elements.remaining.textContent = `${remaining} SCU`;
    elements.remaining.parentElement.classList.toggle('is-error', remaining !== 0);
    elements.save.disabled = remaining !== 0 || !draft.length;
  }

  function field(label, value, type = 'text', minimum = null) {
    const wrapper = document.createElement('label');
    const caption = document.createElement('span');
    caption.textContent = label;
    const input = document.createElement('input');
    input.type = type;
    input.value = String(value ?? '');
    if (minimum !== null) input.min = String(minimum);
    wrapper.append(caption, input);
    return { wrapper, input };
  }

  function renderRows() {
    elements.list.replaceChildren();
    draft.forEach((zone, index) => {
      const row = document.createElement('article');
      row.className = 'cargo-zone-editor-row';

      const handle = document.createElement('div');
      handle.className = 'cargo-zone-index';
      handle.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><small>ZONE</small>`;

      const labelField = field('LABEL', zone.label);
      const accessField = field('ACCESS', zone.access);
      const capacityField = field('SCU', zone.capacityScu, 'number', 1);
      const layersField = field('LAYERS', zone.layers, 'number', 1);
      const columnsField = field('COLUMNS', zone.columns, 'number', 1);

      const separable = document.createElement('label');
      separable.className = 'cargo-zone-check';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = zone.separable !== false;
      const checkText = document.createElement('span');
      checkText.textContent = 'SEPARATE';
      separable.append(checkbox, checkText);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'cargo-zone-remove';
      remove.textContent = 'REMOVE';
      remove.disabled = draft.length === 1;

      const inputs = [labelField.input, accessField.input, capacityField.input, layersField.input, columnsField.input, checkbox];
      inputs.forEach((input) => input.addEventListener('input', () => {
        zone.label = labelField.input.value;
        zone.access = accessField.input.value;
        zone.capacityScu = Number(capacityField.input.value);
        zone.layers = Number(layersField.input.value);
        zone.columns = Number(columnsField.input.value);
        zone.separable = checkbox.checked;
        dirty = true;
        elements.message.textContent = 'Unsaved zone changes.';
        updateSummary();
      }));

      remove.addEventListener('click', () => {
        draft.splice(index, 1);
        dirty = true;
        elements.message.textContent = 'Unsaved zone changes.';
        renderRows();
      });

      const fields = document.createElement('div');
      fields.className = 'cargo-zone-fields';
      fields.append(labelField.wrapper, accessField.wrapper, capacityField.wrapper, layersField.wrapper, columnsField.wrapper, separable, remove);
      row.append(handle, fields);
      elements.list.append(row);
    });
    updateSummary();
  }

  function loadState(state, force = false) {
    const { ship, base, capacity: nextCapacity } = activeContext(state);
    const shipId = ship?.id ?? 'model-default';
    if (!force && dirty && shipId === activeShipId) return;
    activeShipId = shipId;
    capacity = nextCapacity;
    const saved = ship?.id ? state.cargoZoneOverrides?.[ship.id]?.zones : null;
    draft = cloneZones(saved ?? zoneModel.defaultZones(base, ship));
    dirty = false;
    elements.message.textContent = saved ? 'Custom zones active for this ship.' : 'Using the ship default zones.';
    elements.reset.disabled = !saved;
    renderRows();
  }

  elements.add.addEventListener('click', () => {
    if (draft.length >= 8) {
      elements.message.textContent = 'Maximum eight zones.';
      return;
    }
    draft.push({
      id: `zone-${draft.length + 1}`,
      label: `Zone ${String.fromCharCode(65 + draft.length)}`,
      access: 'Shared access',
      capacityScu: Math.max(1, capacity - totalAssigned()),
      layers: 1,
      columns: 1,
      separable: true
    });
    dirty = true;
    elements.message.textContent = 'Unsaved zone changes.';
    renderRows();
  });

  elements.save.addEventListener('click', () => {
    const state = store.getState();
    const { ship } = activeContext(state);
    if (!ship) return;
    try {
      const zones = zoneModel.normalizeZones(draft, capacity);
      const next = { ...(state.cargoZoneOverrides ?? {}), [ship.id]: { zones } };
      dirty = false;
      store.patch({ cargoZoneOverrides: next });
      elements.message.textContent = 'Cargo zones saved.';
      window.dispatchEvent(new CustomEvent('sc:toast', { detail: { tone: 'success', title: 'Cargo zones saved', message: 'The cargo layout and load positions now use this ship configuration.' } }));
    } catch (error) {
      elements.message.textContent = error.message;
    }
  });

  elements.reset.addEventListener('click', () => {
    const state = store.getState();
    const { ship } = activeContext(state);
    if (!ship) return;
    const next = { ...(state.cargoZoneOverrides ?? {}) };
    delete next[ship.id];
    dirty = false;
    store.patch({ cargoZoneOverrides: next });
    window.dispatchEvent(new CustomEvent('sc:toast', { detail: { tone: 'info', title: 'Cargo zones reset', message: 'The selected ship is using its default logical zones.' } }));
  });

  window.addEventListener('sc:session-change', (event) => loadState(event.detail));
  loadState(store.getState(), true);
}());
