'use strict';

(function initializeHangarView() {
  const store = window.SCCompanionSession;
  const catalog = window.SCCompanionShipCatalog;
  const form = document.querySelector('#hangar-form');
  if (!store || !catalog || !form) return;

  const modelSelect = document.querySelector('#hangar-model');
  const list = document.querySelector('#hangar-list');
  catalog.models.forEach((model) => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = `${model.manufacturer} ${model.model} — ${model.capacityScu} SCU`;
    modelSelect.append(option);
  });

  function render(state) {
    list.replaceChildren();
    (state.hangarShips ?? []).forEach((ship) => {
      const model = catalog.getModel(ship.modelId);
      const card = document.createElement('article');
      card.className = `hangar-card ${ship.id === state.selectedShipId ? 'is-selected' : ''}`;
      const displayName = ship.nickname || `${model.manufacturer} ${model.model}`;
      card.innerHTML = `<div><p class="eyebrow">${ship.id === state.selectedShipId ? 'ACTIVE SHIP' : 'HANGAR SHIP'}</p><h3>${displayName}</h3><span>${model.manufacturer} ${model.model} · ${ship.cargoCapacityScu} SCU</span></div><dl><div><dt>QUANTUM DRIVE</dt><dd>${ship.quantumDrive}</dd></div><div><dt>TIME FACTOR</dt><dd>× ${ship.quantumTimeFactor}</dd></div></dl>`;
      const use = document.createElement('button');
      use.type = 'button';
      use.className = 'secondary-button';
      use.textContent = ship.id === state.selectedShipId ? 'SELECTED' : 'USE THIS SHIP';
      use.disabled = ship.id === state.selectedShipId;
      use.addEventListener('click', () => store.patch({ selectedShipId: ship.id, selectedShipModelId: ship.modelId }));
      card.append(use);
      list.append(card);
    });
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
      store.patch({
        hangarShips: [...(state.hangarShips ?? []), ship],
        selectedShipId: ship.id,
        selectedShipModelId: ship.modelId
      });
      form.reset();
      document.querySelector('#hangar-factor').value = '1';
      document.querySelector('#hangar-quantum').value = 'Stock';
    } catch (error) {
      window.alert(error.message);
    }
  });

  window.addEventListener('sc:session-change', (event) => render(event.detail));
  render(store.getState());
}());
