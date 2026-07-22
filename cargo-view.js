'use strict';

(function bootstrapCargoView() {
  let initialized = false;

  function initialize() {
    if (initialized) return true;
    const store = window.SCCompanionSession;
    const catalog = window.SCCompanionShipCatalog;
    const zoneModel = window.SCCompanionCargoZones;
    const planner = window.SCCompanionCargoPlanner;
    const cargoState = window.SCCompanionCargoState;
    const cargoLayout = window.SCCompanionCargoLayout;
    const routeCorrections = window.SCCompanionRouteCorrections;
    const routeProgress = window.SCCompanionRouteProgress;
    if (!store || !catalog || !zoneModel || !planner || !cargoState || !cargoLayout || !routeCorrections || !routeProgress) return false;

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

    function activeModel(state) {
      const activeShip = (state.hangarShips ?? []).find((ship) => ship.id === state.selectedShipId) ?? null;
      const base = catalog.getModel(activeShip?.modelId ?? state.selectedShipModelId) ?? catalog.models[0];
      const resolved = zoneModel.resolveModel(base, activeShip, state.cargoZoneOverrides);
      return {
        model: {
          ...resolved,
          offGridAllowanceScu: Math.max(0, Number(state.routePlannerSettings?.offGridAllowanceScu ?? 0))
        },
        activeShip
      };
    }

    function buildMissionClasses(assignments) {
      const classes = new Map();
      assignments.forEach((assignment) => {
        if (!classes.has(assignment.missionId)) classes.set(assignment.missionId, `mission-tone-${classes.size % 6}`);
      });
      return classes;
    }

    function visibleAssignmentKeys(lifecycle) {
      return {
        limits: new Map(lifecycle.onboardLots.map((lot) => [lot.key, Math.ceil(lot.scu)])),
        seen: new Map()
      };
    }

    function assignmentIsVisible(assignment, visibility) {
      const limit = visibility.limits.get(assignment.cargoKey) ?? 0;
      const count = visibility.seen.get(assignment.cargoKey) ?? 0;
      visibility.seen.set(assignment.cargoKey, count + 1);
      return count < limit;
    }

    function createCargoCell(assignment, missionClasses) {
      const cell = document.createElement('div');
      cell.className = 'cargo-cell';
      if (!assignment) return cell;
      cell.classList.add('is-loaded', 'is-onboard', missionClasses.get(assignment.missionId));
      cell.textContent = assignment.commodity.slice(0, 2).toUpperCase();
      cell.title = `${assignment.scuShare} SCU ${assignment.commodity}; ${assignment.originLocationLabel} → ${assignment.deliveryLocationLabel}; ${assignment.missionTitle}`;
      return cell;
    }

    function renderZones(model, allAssignments, lifecycle, missionClasses) {
      grid.replaceChildren();
      const zones = cargoLayout.getZones(model);
      const visibility = visibleAssignmentKeys(lifecycle);
      const onboardBySlot = new Map();
      allAssignments.filter((assignment) => !assignment.offGrid).forEach((assignment) => {
        if (assignmentIsVisible(assignment, visibility)) onboardBySlot.set(assignment.planSlotIndex, assignment);
      });
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
        status.textContent = zone.separable ? 'SEPARATE' : 'SHARED';
        header.append(title, status);

        const levels = document.createElement('div');
        levels.className = 'cargo-levels';
        let zoneSlot = 0;
        for (let layer = 0; layer < Math.max(1, zone.layers) && zoneSlot < zone.capacityScu; layer += 1) {
          const row = document.createElement('div');
          row.className = 'cargo-level';
          const levelLabel = document.createElement('span');
          levelLabel.className = 'cargo-level-label';
          levelLabel.textContent = `LAYER ${layer + 1}`;
          const cells = document.createElement('div');
          cells.className = 'cargo-level-cells';
          cells.style.setProperty('--zone-columns', String(Math.max(1, zone.columns)));
          for (let column = 0; column < Math.max(1, zone.columns) && zoneSlot < zone.capacityScu; column += 1) {
            cells.append(createCargoCell(onboardBySlot.get(globalSlot) ?? null, missionClasses));
            globalSlot += 1;
            zoneSlot += 1;
          }
          row.append(levelLabel, cells);
          levels.append(row);
        }
        const note = document.createElement('div');
        note.className = 'cargo-zone-note';
        note.textContent = `${model.layout.geometryStatus === 'concept' ? 'Concept geometry' : 'Verified geometry'} · logical separator`;
        article.append(header, levels, note);
        grid.append(article);
      });
    }

    function renderLegend(plan, lifecycle, missionClasses) {
      legend.replaceChildren();
      if (!lifecycle.onboardLots.length) {
        const empty = document.createElement('p');
        empty.className = 'field-help';
        empty.textContent = lifecycle.complete ? 'No cargo remains assigned to the active route.' : 'Cargo hold currently empty.';
        legend.append(empty);
        return;
      }
      lifecycle.onboardLots.forEach((lot) => {
        const sector = plan.assignments.find((assignment) => assignment.cargoKey === lot.key);
        const item = document.createElement('article');
        item.className = `cargo-legend-item ${missionClasses.get(lot.missionId)}`;
        const title = document.createElement('strong');
        title.textContent = `${lot.scu} SCU ${lot.commodity}`;
        const route = document.createElement('span');
        route.textContent = `Deliver to ${lot.deliveryLocationLabel}`;
        const position = sector && !sector.offGrid ? cargoLayout.locateSlot(plan.shipModel, sector.planSlotIndex) : null;
        const priority = document.createElement('small');
        const placement = sector?.offGrid ? 'OFF-GRID STAGING' : position ? `${position.zoneLabel} / Layer ${position.layer + 1}` : 'ONBOARD';
        priority.textContent = `${placement} · ${lot.missionTitle}${lot.corrected ? ` · corrected from ${lot.plannedScu} SCU` : ''}`;
        item.append(title, route, priority);
        legend.append(item);
      });
    }

    function render(state) {
      const { model, activeShip } = activeModel(state);
      shipName.textContent = activeShip?.nickname || `${model.manufacturer} ${model.model}`;
      if (!state.route?.stops?.length) {
        usage.textContent = `${model.capacityScu} SCU physical grid · cargo hold empty`;
        legend.replaceChildren();
        renderZones(model, [], { onboardLots: [] }, new Map());
        return;
      }
      try {
        const route = routeCorrections.deriveRoute(state.route, state.routeCorrections);
        const progress = routeProgress.derive(route, state.completedStopIds, state.currentStopIndex);
        const plan = planner.planCargo(route, model, riskResolver);
        const lifecycle = cargoState.deriveCargoState(route, progress.completedStopIds, state.cargoCorrections);
        const missionClasses = buildMissionClasses(plan.assignments);
        const capacityText = plan.offGridAllowanceScu ? `${plan.capacityScu} grid + ${plan.offGridAllowanceScu} off-grid` : `${plan.capacityScu} grid`;
        usage.textContent = `${lifecycle.totals.onboardScu} SCU onboard · peak ${plan.peakPlannedScu} · ${capacityText}`;
        renderZones(model, plan.assignments, lifecycle, missionClasses);
        renderLegend(plan, lifecycle, missionClasses);
      } catch (error) {
        usage.textContent = error.message;
        legend.replaceChildren();
        renderZones(model, [], { onboardLots: [] }, new Map());
      }
    }

    window.addEventListener('sc:session-change', (event) => render(event.detail));
    render(store.getState());
    return true;
  }

  if (!initialize()) window.addEventListener('sc:cargo-runtime-ready', initialize, { once: true });
}());
