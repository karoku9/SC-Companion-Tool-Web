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

  function fallbackZones(model) {
    return [{
      id: 'main-zone',
      label: 'Main cargo zone',
      access: (model.layout.accessPoints ?? ['rear']).join(' / '),
      capacityScu: model.capacityScu,
      layers: Math.max(1, Math.ceil(model.capacityScu / 16)),
      columns: Math.min(8, model.capacityScu),
      separable: false
    }];
  }

  function modelZones(model) {
    const zones = model.layout.zones ?? [];
    const zoneCapacity = zones.reduce((total, zone) => total + zone.capacityScu, 0);
    return zones.length && zoneCapacity === model.capacityScu ? zones : fallbackZones(model);
  }

  function buildMissionClasses(assignments) {
    const classes = new Map();
    assignments.forEach((assignment) => {
      if (!classes.has(assignment.missionId)) {
        classes.set(assignment.missionId, `mission-tone-${classes.size % 6}`);
      }
    });
    return classes;
  }

  function createCargoCell(assignment, missionClasses) {
    const cell = document.createElement('div');
    cell.className = 'cargo-cell';
    if (!assignment) return cell;

    cell.classList.add('is-loaded', missionClasses.get(assignment.missionId));
    cell.textContent = assignment.commodity.slice(0, 2).toUpperCase();
    cell.title = `${assignment.missionTitle}: ${assignment.scuShare} SCU ${assignment.commodity}; ${assignment.originLocationLabel} → ${assignment.deliveryLocationLabel}`;
    return cell;
  }

  function renderZones(model, assignments, missionClasses) {
    grid.replaceChildren();
    const zones = modelZones(model);
    let assignmentIndex = 0;

    zones.forEach((zone) => {
      const article = document.createElement('article');
      article.className = 'cargo-zone';

      const header = document.createElement('header');
      header.className = 'cargo-zone-header';
      const title = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = zone.label;
      const access = document.createElement('span');
      access.textContent = `${zone.access} · ${zone.capacityScu} SCU`;
      title.append(strong, access);
      const status = document.createElement('em');
      status.textContent = zone.separable ? 'SEPARATE ZONE' : 'SHARED ZONE';
      header.append(title, status);

      const levels = document.createElement('div');
      levels.className = 'cargo-levels';
      const layerCount = Math.max(1, zone.layers);
      const columns = Math.max(1, zone.columns);
      let zoneSlot = 0;

      for (let layer = 0; layer < layerCount; layer += 1) {
        const row = document.createElement('div');
        row.className = 'cargo-level';
        const levelLabel = document.createElement('span');
        levelLabel.className = 'cargo-level-label';
        levelLabel.textContent = `LAYER ${layer + 1}`;
        const cells = document.createElement('div');
        cells.className = 'cargo-level-cells';
        cells.style.setProperty('--zone-columns', String(columns));

        for (let column = 0; column < columns; column += 1) {
          if (zoneSlot >= zone.capacityScu) break;
          cells.append(createCargoCell(assignments[assignmentIndex] ?? null, missionClasses));
          assignmentIndex += 1;
          zoneSlot += 1;
        }
        row.append(levelLabel, cells);
        levels.append(row);
      }

      const note = document.createElement('div');
      note.className = 'cargo-zone-note';
      note.textContent = model.layout.geometryStatus === 'concept'
        ? 'Concept geometry — zones and vertical layers can change without touching mission data.'
        : 'Verified cargo geometry.';

      article.append(header, levels, note);
      grid.append(article);
    });
  }

  function renderLegend(plan, missionClasses) {
    legend.replaceChildren();
    const sectors = new Map();
    plan.assignments.forEach((assignment) => {
      if (!sectors.has(assignment.sectorId)) sectors.set(assignment.sectorId, assignment);
    });

    [...sectors.values()].forEach((sector) => {
      const item = document.createElement('article');
      item.className = `cargo-legend-item ${missionClasses.get(sector.missionId)}`;
      const title = document.createElement('strong');
      title.textContent = sector.missionTitle;
      const route = document.createElement('span');
      route.textContent = `${sector.commodity}: ${sector.originLocationLabel} → ${sector.deliveryLocationLabel}`;
      const priority = document.createElement('small');
      priority.textContent = sector.pickupRisk >= 2
        ? 'Rapid-access priority at pickup'
        : `Delivery stop ${sector.deliveryStopIndex + 1}`;
      item.append(title, route, priority);
      legend.append(item);
    });
  }

  function render(state) {
    const baseModel = catalog.getModel(state.selectedShipModelId) ?? catalog.models[0];
    const activeShip = (state.hangarShips ?? []).find((ship) => ship.id === state.selectedShipId);
    const model = { ...baseModel, capacityScu: activeShip?.cargoCapacityScu ?? baseModel.capacityScu };
    shipName.textContent = activeShip?.nickname || `${model.manufacturer} ${model.model}`;

    if (!state.route?.stops?.length) {
      usage.textContent = `${model.capacityScu} SCU · empty zone blueprint`;
      legend.replaceChildren();
      renderZones(model, [], new Map());
      return;
    }

    try {
      const plan = planner.planCargo(state.route, model, riskResolver);
      const missionClasses = buildMissionClasses(plan.assignments);
      usage.textContent = `${plan.usedScu} / ${plan.capacityScu} SCU planned`;
      renderZones(model, plan.assignments, missionClasses);
      renderLegend(plan, missionClasses);
    } catch (error) {
      usage.textContent = error.message;
      legend.replaceChildren();
      renderZones(model, [], new Map());
    }
  }

  window.addEventListener('sc:session-change', (event) => render(event.detail));
  render(store.getState());
}());
