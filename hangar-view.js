'use strict';

(function initializeHangarView() {
  const store = window.SCCompanionSession;
  const catalog = window.SCCompanionShipCatalog;
  const zoneModel = window.SCCompanionCargoZones;
  if (!store || !catalog || !zoneModel) return;

  const form = document.querySelector('#hangar-form');
  const modelSelect = document.querySelector('#hangar-model');
  const list = document.querySelector('#hangar-list');
  const fleetCount = document.querySelector('#fleet-count');
  const selectedName = document.querySelector('#fleet-selected-name');
  const selectedCapacity = document.querySelector('#fleet-selected-capacity');
  const manufacturer = document.querySelector('#fleet-manufacturer');
  const gridCapacity = document.querySelector('#fleet-grid-capacity');
  const quantumDrive = document.querySelector('#fleet-quantum-drive');
  const quantumFactor = document.querySelector('#fleet-quantum-factor');
  const hologram = document.querySelector('#ship-hologram');
  const zoneForm = document.querySelector('#fleet-zone-form');
  const zoneSchematic = document.querySelector('#fleet-zone-schematic');
  const zoneTotal = document.querySelector('#fleet-zone-total');
  if (!form || !modelSelect || !list || !zoneForm || !zoneSchematic) return;

  if (!modelSelect.options.length) {
    catalog.models.forEach((model) => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = `${model.manufacturer} ${model.model} — ${model.capacityScu} SCU`;
      modelSelect.append(option);
    });
  }

  function selectedShip(state) {
    return (state.hangarShips ?? []).find((ship) => ship.id === state.selectedShipId)
      ?? state.hangarShips?.[0]
      ?? null;
  }

  function shipVisual(modelId) {
    if (modelId === 'drake-cutlass-black') {
      return `<svg viewBox="0 0 800 320" role="img" aria-label="Drake Cutlass Black schematic">
        <g class="ship-fill"><path d="M400 35 468 92 620 112 730 172 613 198 512 186 470 260 330 260 288 186 187 198 70 172 180 112 332 92Z"/></g>
        <g class="ship-line">
          <path d="M400 35 468 92 620 112 730 172 613 198 512 186 470 260 330 260 288 186 187 198 70 172 180 112 332 92Z"/>
          <path d="M400 35V278M332 92 400 126 468 92M288 186 400 152 512 186M330 260 400 226 470 260"/>
          <path d="M115 166h112M573 166h112M356 116h88v90h-88z"/>
          <circle cx="400" cy="166" r="112"/><circle cx="400" cy="166" r="86"/>
        </g>
      </svg>`;
    }
    return `<svg viewBox="0 0 900 360" role="img" aria-label="Drake Corsair schematic">
      <g class="ship-fill"><path d="M450 22 510 74 720 92 855 156 746 190 574 180 530 316 450 338 370 316 326 180 154 190 45 156 180 92 390 74Z"/></g>
      <g class="ship-line">
        <path d="M450 22 510 74 720 92 855 156 746 190 574 180 530 316 450 338 370 316 326 180 154 190 45 156 180 92 390 74Z"/>
        <path d="M450 22V338M390 74 450 112 510 74M326 180 450 142 574 180M370 316 450 270 530 316"/>
        <path d="M92 151h235M573 151h235M407 102h86v145h-86zM389 247h122"/>
        <path d="M180 92 252 170 154 190M720 92 648 170 746 190"/>
        <circle cx="450" cy="168" r="136"/><circle cx="450" cy="168" r="106"/><circle cx="450" cy="168" r="76"/>
      </g>
    </svg>`;
  }

  function displayName(ship, model) {
    return ship?.nickname || `${model.manufacturer} ${model.model}`;
  }

  function zoneRow(zone, index) {
    return `<div class="zone-form-row" data-zone-index="${index}">
      <label>Label<input data-zone-field="label" value="${zone.label.replace(/"/g, '&quot;')}"></label>
      <label>Access<input data-zone-field="access" value="${zone.access.replace(/"/g, '&quot;')}"></label>
      <label>SCU<input data-zone-field="capacityScu" type="number" min="1" step="1" value="${zone.capacityScu}"></label>
      <label>Layers<input data-zone-field="layers" type="number" min="1" step="1" value="${zone.layers}"></label>
      <label>Columns<input data-zone-field="columns" type="number" min="1" step="1" value="${zone.columns}"></label>
      <button type="button" data-zone-remove>Remove</button>
      <input data-zone-field="id" type="hidden" value="${zone.id}">
      <input data-zone-field="separable" type="hidden" value="${zone.separable !== false}">
    </div>`;
  }

  function renderZones(state, ship, baseModel) {
    const model = zoneModel.resolveModel(baseModel, ship, state.cargoZoneOverrides);
    const zones = model.layout.zones;
    zoneTotal.textContent = `${zones.reduce((sum, zone) => sum + zone.capacityScu, 0)} / ${model.capacityScu} SCU`;
    zoneSchematic.innerHTML = zones.map((zone) => {
      const percentage = Math.max(5, zone.capacityScu / model.capacityScu * 100);
      return `<article style="--zone-percent:${percentage}%"><div><strong>${zone.label}</strong><small>${zone.access}</small></div><b>${zone.capacityScu} SCU</b><i></i></article>`;
    }).join('');
    zoneForm.innerHTML = `${zones.map(zoneRow).join('')}
      <p class="zone-error" data-zone-error></p>
      <div class="zone-form-actions">
        <button type="button" class="button button--secondary" data-zone-add>Add zone</button>
        <button type="button" class="button button--secondary" data-zone-reset>Reset defaults</button>
        <button type="submit" class="button button--primary">Save zones</button>
      </div>`;
  }

  function render(state) {
    const ships = state.hangarShips ?? [];
    const ship = selectedShip(state);
    const baseModel = catalog.getModel(ship?.modelId ?? state.selectedShipModelId) ?? catalog.models[0];
    if (fleetCount) fleetCount.textContent = String(ships.length);

    list.replaceChildren();
    ships.forEach((item) => {
      const model = catalog.getModel(item.modelId);
      const card = document.createElement('article');
      card.className = `hangar-card${item.id === ship?.id ? ' is-selected' : ''}`;
      card.innerHTML = `<div><p>${item.id === ship?.id ? 'Active ship' : 'Hangar ship'}</p><h3>${displayName(item, model)}</h3><span>${model.manufacturer} ${model.model} · ${item.cargoCapacityScu} SCU</span></div><dl><div><dt>Drive</dt><dd>${item.quantumDrive}</dd></div><div><dt>Factor</dt><dd>× ${item.quantumTimeFactor}</dd></div></dl>`;
      const use = document.createElement('button');
      use.type = 'button';
      use.textContent = item.id === ship?.id ? 'Selected' : 'Select ship';
      use.disabled = item.id === ship?.id;
      use.addEventListener('click', () => store.patch({ selectedShipId: item.id, selectedShipModelId: item.modelId }));
      card.append(use);
      list.append(card);
    });

    const resolvedName = ship ? displayName(ship, baseModel) : `${baseModel.manufacturer} ${baseModel.model}`;
    selectedName.textContent = resolvedName;
    selectedCapacity.textContent = `${ship?.cargoCapacityScu ?? baseModel.capacityScu} SCU`;
    manufacturer.textContent = baseModel.manufacturer;
    gridCapacity.textContent = `${ship?.cargoCapacityScu ?? baseModel.capacityScu} SCU`;
    quantumDrive.textContent = ship?.quantumDrive ?? 'Stock';
    quantumFactor.textContent = `× ${ship?.quantumTimeFactor ?? 1}`;
    hologram.innerHTML = shipVisual(baseModel.id);
    renderZones(state, ship, baseModel);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const ship = catalog.createHangarShip({
        id: `ship-${Date.now()}`,
        modelId: modelSelect.value,
        nickname: document.querySelector('#hangar-nickname').value,
        quantumDrive: document.querySelector('#hangar-quantum').value,
        quantumTimeFactor: document.querySelector('#hangar-factor').value,
        notes: document.querySelector('#hangar-notes').value
      });
      const state = store.getState();
      store.patch({ hangarShips: [...(state.hangarShips ?? []), ship], selectedShipId: ship.id, selectedShipModelId: ship.modelId });
      form.reset();
      document.querySelector('#hangar-factor').value = '1';
      document.querySelector('#hangar-quantum').value = 'Stock';
    } catch (error) {
      window.alert(error.message);
    }
  });

  zoneForm.addEventListener('click', (event) => {
    const state = store.getState();
    const ship = selectedShip(state);
    const baseModel = catalog.getModel(ship?.modelId ?? state.selectedShipModelId) ?? catalog.models[0];
    if (event.target.closest('[data-zone-remove]')) {
      event.target.closest('.zone-form-row')?.remove();
      return;
    }
    if (event.target.closest('[data-zone-add]')) {
      const rows = [...zoneForm.querySelectorAll('.zone-form-row')];
      if (rows.length >= 8) return;
      const holder = document.createElement('div');
      const index = rows.length;
      holder.innerHTML = zoneRow({ id: `zone-${index + 1}`, label: `Zone ${String.fromCharCode(65 + index)}`, access: 'Shared access', capacityScu: 1, layers: 1, columns: 1, separable: true }, index);
      zoneForm.querySelector('[data-zone-error]').before(holder.firstElementChild);
      return;
    }
    if (event.target.closest('[data-zone-reset]')) {
      const next = { ...(state.cargoZoneOverrides ?? {}) };
      if (ship?.id) delete next[ship.id];
      store.patch({ cargoZoneOverrides: next });
      renderZones(store.getState(), ship, baseModel);
    }
  });

  zoneForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const state = store.getState();
    const ship = selectedShip(state);
    const baseModel = catalog.getModel(ship?.modelId ?? state.selectedShipModelId) ?? catalog.models[0];
    const error = zoneForm.querySelector('[data-zone-error]');
    try {
      const zones = [...zoneForm.querySelectorAll('.zone-form-row')].map((row, index) => {
        const value = (field) => row.querySelector(`[data-zone-field="${field}"]`)?.value;
        return {
          id: value('id') || `zone-${index + 1}`,
          label: value('label'),
          access: value('access'),
          capacityScu: value('capacityScu'),
          layers: value('layers'),
          columns: value('columns'),
          separable: value('separable') !== 'false'
        };
      });
      const capacity = ship?.cargoCapacityScu ?? baseModel.capacityScu;
      const normalized = zoneModel.normalizeZones(zones, capacity);
      const next = { ...(state.cargoZoneOverrides ?? {}), [ship.id]: { zones: normalized } };
      error.textContent = '';
      store.patch({ cargoZoneOverrides: next });
    } catch (caught) {
      error.textContent = caught.message;
    }
  });

  window.addEventListener('sc:session-change', (event) => render(event.detail));
  render(store.getState());
}());
