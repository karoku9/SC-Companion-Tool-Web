'use strict';

(function initializeCargoView() {
  const store = window.SCCompanionSession;
  const catalog = window.SCCompanionShipCatalog;
  const planner = window.SCCompanionCargoPlanner;
  if (!store || !catalog || !planner) return;

  const grid = document.querySelector('#cargo-grid');
  const shipName = document.querySelector('#cargo-ship-name');
  const usage = document.querySelector('#cargo-usage');
  const legend = document.querySelector('#cargo-legend');

  function riskResolver(locationId, label) {
    const value = `${locationId} ${label}`.toLowerCase();
    if (value.includes('pyro') || value.includes('outpost')) return 3;
    if (value.includes('station')) return 1;
    return 0;
  }

  function render(state) {
    grid.replaceChildren();
    legend.replaceChildren();
    const model = catalog.getModel(state.selectedShipModelId) ?? catalog.models[0];
    shipName.textContent = `${model.manufacturer} ${model.model}`;
    grid.style.setProperty('--cargo-columns', model.layout.columns);

    if (!state.route?.stops?.length) {
      usage.textContent = 'Generate a mission session to build the grid.';
      return;
    }

    try {
      const plan = planner.planCargo(state.route, model, riskResolver);
      usage.textContent = `${plan.usedScu} / ${plan.capacityScu} SCU planned`;
      const assignments = new Map(plan.assignments.map((cell) => [cell.id, cell]));
      const validCells = new Set(plan.cells.map((cell) => cell.id));
      const missionClasses = new Map();
      let missionIndex = 0;

      for (let row = 0; row < model.layout.rows; row += 1) {
        for (let column = 0; column < model.layout.columns; column += 1) {
          const id = `${row}:${column}`;
          const cell = document.createElement('div');
          cell.className = 'cargo-cell';
          if (!validCells.has(id)) cell.classList.add('is-unavailable');
          const assignment = assignments.get(id);
          if (assignment) {
            if (!missionClasses.has(assignment.missionId)) {
              missionClasses.set(assignment.missionId, `mission-tone-${missionIndex % 6}`);
              missionIndex += 1;
            }
            cell.classList.add('is-loaded', missionClasses.get(assignment.missionId));
            cell.textContent = assignment.commodity.slice(0, 2).toUpperCase();
            cell.title = `${assignment.missionTitle}: ${assignment.scuShare} SCU ${assignment.commodity}; ${assignment.originLocationLabel} → ${assignment.deliveryLocationLabel}`;
          }
          grid.append(cell);
        }
      }

      const sectors = new Map();
      plan.assignments.forEach((assignment) => {
        if (!sectors.has(assignment.sectorId)) sectors.set(assignment.sectorId, assignment);
      });
      [...sectors.values()].forEach((sector) => {
        const item = document.createElement('article');
        item.className = `cargo-legend-item ${missionClasses.get(sector.missionId)}`;
        item.innerHTML = `<strong>${sector.missionTitle}</strong><span>${sector.commodity}: ${sector.originLocationLabel} → ${sector.deliveryLocationLabel}</span><small>${sector.pickupRisk >= 2 ? 'Rapid-access priority at pickup' : `Delivery stop ${sector.deliveryStopIndex + 1}`}</small>`;
        legend.append(item);
      });
    } catch (error) {
      usage.textContent = error.message;
    }
  }

  window.addEventListener('sc:session-change', (event) => render(event.detail));
  render(store.getState());
}());
