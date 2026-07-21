'use strict';

(function bootstrapCargoView() {
  let initialized = false;

  function initialize() {
    if (initialized) return true;
    const store = window.SCCompanionSession;
    const catalog = window.SCCompanionShipCatalog;
    const planner = window.SCCompanionCargoPlanner;
    const cargoState = window.SCCompanionCargoState;
    const cargoLayout = window.SCCompanionCargoLayout;
    if (!store || !catalog || !planner || !cargoState || !cargoLayout) return false;

    const grid = document.querySelector('#cargo-grid');
    const shipName = document.querySelector('#cargo-ship-name');
    const usage = document.querySelector('#cargo-usage');
    const legend = document.querySelector('#cargo-legend');
    if (!grid || !shipName || !usage || !legend) return false;
    initialized = true;

    function riskResolver(locationId, label) {
      const value = `${locationId} ${label}`.toLowerCase();
      if (value.includes('pyro') || value.includes('outpost')) return 3;
      if (value.includes('station')) return 1;
      return 0;
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

      cell.classList.add('is-loaded', 'is-onboard', missionClasses.get(assignment.missionId));
      cell.textContent = assignment.commodity.slice(0, 2).toUpperCase();
      cell.title = `${assignment.missionTitle}: ${assignment.scuShare} SCU ${assignment.commodity}; loaded at ${assignment.originLocationLabel}; deliver to ${assignment.deliveryLocationLabel}`;
      return cell;
    }

    function renderZones(model, allAssignments, onboardKeys, missionClasses) {
      grid.replaceChildren();
      const zones = cargoLayout.getZones(model);
      const onboardBySlot = new Map(
        allAssignments
          .filter((assignment) => onboardKeys.has(assignment.cargoKey))
          .map((assignment) => [assignment.planSlotIndex, assignment])
      );
      let globalSlot = 0;

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
            cells.append(createCargoCell(onboardBySlot.get(globalSlot) ?? null, missionClasses));
            globalSlot += 1;
            zoneSlot += 1;
          }
          row.append(levelLabel, cells);
          levels.append(row);
        }

        const note = document.createElement('div');
        note.className = 'cargo-zone-note';
        note.textContent = model.layout.geometryStatus === 'concept'
          ? 'Concept geometry — only cargo already onboard is shown.'
          : 'Verified geometry — only cargo already onboard is shown.';

        article.append(header, levels, note);
        grid.append(article);
      });
    }

    function renderLegend(plan, lifecycle, missionClasses) {
      legend.replaceChildren();
      const onboardKeys = new Set(lifecycle.onboardLots.map((lot) => lot.key));
      const sectors = new Map();
      plan.assignments
        .filter((assignment) => onboardKeys.has(assignment.cargoKey))
        .forEach((assignment) => {
          if (!sectors.has(assignment.cargoKey)) sectors.set(assignment.cargoKey, assignment);
        });

      if (!sectors.size) {
        const empty = document.createElement('p');
        empty.className = 'field-help';
        empty.textContent = lifecycle.complete
          ? 'Cargo hold empty — all planned mission cargo was delivered.'
          : 'Cargo hold currently empty. Complete a pickup stop to load its cargo.';
        legend.append(empty);
        return;
      }

      [...sectors.values()].forEach((sector) => {
        const item = document.createElement('article');
        item.className = `cargo-legend-item ${missionClasses.get(sector.missionId)}`;
        const title = document.createElement('strong');
        title.textContent = `${sector.missionTitle} · ${sector.commodity}`;
        const route = document.createElement('span');
        route.textContent = `${sector.originLocationLabel} → ${sector.deliveryLocationLabel}`;
        const position = cargoLayout.locateSlot(plan.shipModel, sector.planSlotIndex);
        const priority = document.createElement('small');
        priority.textContent = position
          ? `ONBOARD · ${position.zoneLabel} / Layer ${position.layer + 1}`
          : 'ONBOARD';
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
        usage.textContent = `${model.capacityScu} SCU · cargo hold empty`;
        legend.replaceChildren();
        renderZones(model, [], new Set(), new Map());
        return;
      }

      try {
        const plan = planner.planCargo(state.route, model, riskResolver);
        const lifecycle = cargoState.deriveCargoState(state.route, state.currentStopIndex);
        const missionClasses = buildMissionClasses(plan.assignments);
        const onboardKeys = new Set(lifecycle.onboardLots.map((lot) => lot.key));
        usage.textContent = `${lifecycle.totals.onboardScu} / ${plan.capacityScu} SCU onboard · ${lifecycle.totals.deliveredScu} SCU delivered`;
        renderZones(model, plan.assignments, onboardKeys, missionClasses);
        renderLegend(plan, lifecycle, missionClasses);
      } catch (error) {
        usage.textContent = error.message;
        legend.replaceChildren();
        renderZones(model, [], new Set(), new Map());
      }
    }

    window.addEventListener('sc:session-change', (event) => render(event.detail));
    render(store.getState());
    return true;
  }

  if (!initialize()) {
    window.addEventListener('sc:cargo-runtime-ready', initialize, { once: true });
  }
}());
