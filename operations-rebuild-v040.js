'use strict';

(function initializeOperationsRebuildV040(root) {
  let mounted = false;

  function install() {
    if (mounted) return true;

    const store = root.SCCompanionSession;
    const corrections = root.SCCompanionRouteCorrections;
    const operationalSteps = root.SCCompanionOperationalSteps;
    const cargoState = root.SCCompanionCargoState;
    const autoCargo = root.SCCompanionAutoCargoLayout;
    const shipCatalog = root.SCCompanionShipCatalog;
    const cargoZones = root.SCCompanionCargoZones;
    const sessionPlanner = root.SCCompanionRouteSessionPlanner;
    const missionModel = root.SCCompanionMissions;
    const icons = root.SCCompanionMfdIcons;
    const locations = root.SCCompanionLocations;
    const page = document.querySelector('.operations-page');

    if (!store || !corrections || !operationalSteps || !cargoState || !autoCargo || !shipCatalog || !cargoZones || !sessionPlanner || !missionModel || !icons || !locations || !page) return false;
    mounted = true;

    const icon = (name, className = 'ops40-icon') => icons.render(name, className);
    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    function hideLegacyNavigation() {
      document.querySelectorAll('.nav-group[data-nav-group="plan"], .nav-group[data-nav-group="manage"]').forEach((group) => group.remove());
      const mobile = document.querySelector('#mobile-page-select');
      [...(mobile?.options ?? [])].forEach((option) => {
        if (['route-planner', 'map', 'hangar', 'roadmap'].includes(option.value)) option.remove();
      });
    }

    hideLegacyNavigation();
    page.classList.add('ops40-page');
    page.innerHTML = `
      <div class="ops40-shell">
        <header class="ops40-topbar">
          <section class="ops40-session-summary">
            <small>ACTIVE HAULING SESSION</small>
            <strong id="ops40-session-title">No active session</strong>
            <span id="ops40-session-subtitle">Generate missions to begin</span>
          </section>
          <section class="ops40-top-metric is-current">
            <span>${icon('navigation')}</span><div><small>NOW</small><strong id="ops40-now">—</strong></div>
          </section>
          <section class="ops40-top-metric">
            <span>${icon('route')}</span><div><small>NEXT</small><strong id="ops40-next">—</strong></div>
          </section>
          <section class="ops40-top-metric">
            <span>${icon('cargo')}</span><div><small>ONBOARD</small><strong id="ops40-onboard">0 / 0 SCU</strong></div>
          </section>
          <label class="ops40-ship-control">
            <span>${icon('ship')}</span><div><small>ACTIVE SHIP</small><select id="ops40-ship-select" aria-label="Active ship"></select></div>
          </label>
        </header>

        <section class="ops40-session-strip" aria-label="Play sessions">
          <div class="ops40-session-strip-title"><span>${icon('clock')}</span><b>PLAY SESSIONS</b><small id="ops40-session-target">No plan</small></div>
          <div id="ops40-session-tabs" class="ops40-session-tabs"></div>
        </section>

        <main class="ops40-main">
          <section class="ops40-panel ops40-cargo-panel" aria-label="Cargo layout">
            <header class="ops40-panel-header">
              <div><small>CARGO / PHYSICAL HOLD</small><strong id="ops40-cargo-title">Projected hold</strong></div>
              <div class="ops40-cargo-tools">
                <button type="button" id="ops40-edit-grid">EDIT GRID</button>
                <label><span>GROUP</span><select id="ops40-cargo-mode" aria-label="Cargo grouping"><option value="destination">Destination</option><option value="mission">Mission</option></select></label>
              </div>
            </header>
            <div class="ops40-cargo-workspace">
              <div class="ops40-grid-stage">
                <div id="ops40-cargo-grid" class="ops40-cargo-grid"></div>
                <div id="ops40-ramp-label" class="ops40-ramp-label">ACCESS / RAMP</div>
              </div>
              <div id="ops40-cargo-manifest" class="ops40-cargo-manifest"></div>
            </div>
          </section>

          <aside class="ops40-panel ops40-step-panel" aria-label="Current operational step">
            <header class="ops40-panel-header">
              <div><small>OPS / CURRENT STEP</small><strong id="ops40-step-state">STANDBY</strong></div>
              <span id="ops40-step-index">0 / 0</span>
            </header>
            <div class="ops40-step-body">
              <h2 id="ops40-step-title">Generate a session first</h2>
              <p id="ops40-step-subtitle">No active operational route.</p>
              <div id="ops40-step-primary" class="ops40-step-primary"></div>
              <div id="ops40-step-operations" class="ops40-step-operations"></div>
              <section id="ops40-after" class="ops40-after"></section>
              <section id="ops40-upcoming" class="ops40-upcoming"></section>
            </div>
            <footer class="ops40-step-controls">
              <button type="button" id="ops40-previous">PREVIOUS</button>
              <button type="button" id="ops40-complete">CONTINUE</button>
            </footer>
          </aside>
        </main>

        <section class="ops40-panel ops40-timeline-panel" aria-label="Session timeline">
          <header class="ops40-timeline-header">
            <div><small>ROUTE / SESSION TIMELINE</small><strong id="ops40-timeline-title">No active route</strong></div>
            <span id="ops40-route-progress">0 / 0</span>
          </header>
          <div id="ops40-timeline" class="ops40-timeline"></div>
        </section>

        <nav class="ops40-dock" aria-label="Operation controls">
          <button type="button" data-ops40-action="add">${icon('plus')}<span>ADD MISSIONS</span></button>
          <button type="button" data-ops40-action="edit">${icon('edit')}<span>EDIT MISSIONS</span></button>
          <button type="button" data-ops40-action="missions">${icon('missions')}<span>MISSION LIST</span></button>
          <button type="button" data-ops40-action="order">${icon('route')}<span>ROUTE ORDER</span></button>
          <button type="button" data-ops40-action="cargo">${icon('cargo')}<span>CARGO GRID</span></button>
        </nav>
      </div>

      <section id="ops40-drawer" class="ops40-drawer" hidden>
        <header><div><small>SESSION MANAGEMENT</small><strong id="ops40-drawer-title">Missions</strong></div><button type="button" id="ops40-drawer-close">${icon('close')}</button></header>
        <div id="ops40-drawer-body"></div>
        <p id="ops40-drawer-message" aria-live="polite"></p>
      </section>`;

    const ui = {
      sessionTitle: page.querySelector('#ops40-session-title'),
      sessionSubtitle: page.querySelector('#ops40-session-subtitle'),
      now: page.querySelector('#ops40-now'),
      next: page.querySelector('#ops40-next'),
      onboard: page.querySelector('#ops40-onboard'),
      ship: page.querySelector('#ops40-ship-select'),
      sessionTarget: page.querySelector('#ops40-session-target'),
      sessionTabs: page.querySelector('#ops40-session-tabs'),
      cargoTitle: page.querySelector('#ops40-cargo-title'),
      cargoMode: page.querySelector('#ops40-cargo-mode'),
      cargoGrid: page.querySelector('#ops40-cargo-grid'),
      cargoManifest: page.querySelector('#ops40-cargo-manifest'),
      rampLabel: page.querySelector('#ops40-ramp-label'),
      stepState: page.querySelector('#ops40-step-state'),
      stepIndex: page.querySelector('#ops40-step-index'),
      stepTitle: page.querySelector('#ops40-step-title'),
      stepSubtitle: page.querySelector('#ops40-step-subtitle'),
      stepPrimary: page.querySelector('#ops40-step-primary'),
      stepOperations: page.querySelector('#ops40-step-operations'),
      after: page.querySelector('#ops40-after'),
      upcoming: page.querySelector('#ops40-upcoming'),
      previous: page.querySelector('#ops40-previous'),
      complete: page.querySelector('#ops40-complete'),
      timelineTitle: page.querySelector('#ops40-timeline-title'),
      routeProgress: page.querySelector('#ops40-route-progress'),
      timeline: page.querySelector('#ops40-timeline'),
      drawer: page.querySelector('#ops40-drawer'),
      drawerTitle: page.querySelector('#ops40-drawer-title'),
      drawerBody: page.querySelector('#ops40-drawer-body'),
      drawerMessage: page.querySelector('#ops40-drawer-message')
    };

    function activeRoute(state) {
      return state.route ? corrections.deriveRoute(state.route, state.routeCorrections) : null;
    }

    function activeModel(state) {
      const ship = (state.hangarShips ?? []).find((item) => item.id === state.selectedShipId) ?? null;
      const base = shipCatalog.getModel(ship?.modelId ?? state.selectedShipModelId) ?? shipCatalog.models[0];
      return cargoZones.resolveModel(base, ship, state.cargoZoneOverrides);
    }

    function operationSummary(stop) {
      const totals = operationalSteps.stopTotals(stop);
      return [
        totals.delivery ? `Drop ${totals.delivery} SCU` : '',
        totals.pickup ? `Pick up ${totals.pickup} SCU` : ''
      ].filter(Boolean).join(' · ') || `${stop?.operations?.length ?? 0} objectives`;
    }

    function stopCargoProjection(route, model) {
      const projection = new Map();
      const completed = [];
      let before = 0;
      route.stops.forEach((stop) => {
        completed.push(String(stop.id));
        const derived = cargoState.deriveCargoState(route, completed, {});
        const after = derived.totals.onboardScu;
        const totals = operationalSteps.stopTotals(stop);
        projection.set(String(stop.id), {
          before,
          after,
          delta: after - before,
          pickup: totals.pickup,
          delivery: totals.delivery,
          free: Math.max(0, Number(model.capacityScu ?? 0) - after)
        });
        before = after;
      });
      return projection;
    }

    function populateShipSelect(state) {
      const current = ui.ship.value;
      ui.ship.replaceChildren(...shipCatalog.models.map((model) => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = `${model.manufacturer} ${model.model} · ${model.capacityScu} SCU`;
        return option;
      }));
      const selected = shipCatalog.getModel(state.selectedShipModelId)?.id ?? current ?? shipCatalog.models[0]?.id;
      if (selected) ui.ship.value = selected;
    }

    function ensureShip(modelId) {
      const state = store.getState();
      let ship = (state.hangarShips ?? []).find((entry) => entry.modelId === modelId);
      let hangarShips = state.hangarShips ?? [];
      if (!ship) {
        ship = shipCatalog.createHangarShip({ id: `quick-${modelId}`, modelId, quantumDrive: 'Stock', quantumTimeFactor: 1 });
        hangarShips = [...hangarShips, ship];
      }
      store.patch({ hangarShips, selectedShipId: ship.id, selectedShipModelId: modelId });
      return ship;
    }

    function missionToText(mission) {
      const lines = [mission.title || 'Mission'];
      if (mission.contractor) lines.push(`contractor ${mission.contractor}`);
      if (Number(mission.rewardAuec) > 0) lines.push(`paga ${Number(mission.rewardAuec).toLocaleString('en-US')} aUEC`);
      (mission.cargoLots ?? []).forEach((lot) => {
        const pickups = (lot.pickupLocations ?? [{ label: lot.pickupLocationLabel }]).map((location) => location.label).join(' + ');
        lines.push(`${lot.pickupType ?? 'collect'} ${pickups} ${lot.scu}scu ${lot.commodity}${lot.sharedPickupTotal ? ' totale' : ''}`);
        lines.push(`deliver ${lot.deliveryLocationLabel} ${lot.scu}scu ${lot.commodity}`);
      });
      (mission.objectives ?? []).forEach((objective) => lines.push(`${objective.type} ${objective.locationLabel} ${objective.label}`));
      return lines.join('\n');
    }

    function rebuildPlan(missions, overrides = {}) {
      const state = store.getState();
      if (!missions.length) {
        store.patch({ missions: [], missionText: '', routePlan: null, route: null, currentStopIndex: 0, completedStopIds: [], completedOperationalStepIds: [], routeCorrections: null });
        return;
      }
      const startLocationId = overrides.startLocationId ?? state.routeStartLocationId;
      if (!startLocationId) throw new Error('Set the current location in Missions before rebuilding the route.');
      const ship = ensureShip(overrides.modelId ?? state.selectedShipModelId);
      const routePlan = sessionPlanner.plan(missions, missionModel, {
        startLocationId,
        selectedShipId: ship.id,
        targetMinutes: Number(overrides.targetMinutes ?? state.sessionTargetMinutes ?? 60),
        mode: overrides.mode ?? state.routeMode ?? 'sessions'
      });
      const index = Math.min(Number(state.activeRouteSessionIndex ?? 0), routePlan.sessions.length - 1);
      const session = routePlan.sessions[Math.max(0, index)];
      store.patch({
        missions,
        missionText: missions.map(missionToText).join('\n\n'),
        routePlan,
        activeRouteSessionIndex: session.index,
        route: session.route,
        currentStopIndex: 0,
        completedStopIds: [],
        operationalRouteKey: '',
        completedOperationalStepIds: [],
        routeCorrections: null,
        cargoCorrections: {}
      });
    }

    function activateSession(index) {
      const state = store.getState();
      const session = state.routePlan?.sessions?.[index];
      if (!session) return;
      store.patch({
        activeRouteSessionIndex: index,
        route: session.route,
        currentStopIndex: 0,
        completedStopIds: [],
        operationalRouteKey: '',
        completedOperationalStepIds: [],
        routeCorrections: null,
        cargoCorrections: {}
      });
    }

    function renderTop(state, route, flow, model, routeCargo) {
      const sessions = state.routePlan?.sessions ?? [];
      const activeIndex = Math.min(Number(state.activeRouteSessionIndex ?? 0), Math.max(0, sessions.length - 1));
      const activeSession = sessions[activeIndex] ?? null;
      ui.sessionTitle.textContent = sessions.length
        ? `Session ${activeIndex + 1} of ${sessions.length}`
        : 'No active session';
      ui.sessionSubtitle.textContent = activeSession
        ? `${activeSession.missionCount} mission${activeSession.missionCount === 1 ? '' : 's'} · ${Math.round(activeSession.estimate.minMinutes)}–${Math.round(activeSession.estimate.maxMinutes)} min`
        : 'Generate missions to begin';
      ui.now.textContent = flow.currentStep?.title ?? (flow.complete ? 'Session complete' : '—');
      ui.next.textContent = flow.nextStep?.title ?? (flow.complete ? 'No remaining steps' : '—');
      ui.onboard.textContent = `${routeCargo.totals.onboardScu} / ${model.capacityScu} SCU`;
      ui.sessionTarget.textContent = sessions.length ? `${sessions.length} session${sessions.length === 1 ? '' : 's'} · max ${state.sessionTargetMinutes ?? 60} min travel` : 'No plan';

      ui.sessionTabs.replaceChildren();
      if (!sessions.length) {
        ui.sessionTabs.innerHTML = '<span class="ops40-empty-inline">No generated sessions</span>';
      } else {
        sessions.forEach((session, index) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.ops40Session = String(index);
          button.className = index === activeIndex ? 'is-active' : '';
          button.innerHTML = `<b>${String(index + 1).padStart(2, '0')}</b><span>${session.missionCount} missions</span><small>${Math.round(session.estimate.minMinutes)}–${Math.round(session.estimate.maxMinutes)} min · ${session.estimate.peakOnboardScu} SCU</small>`;
          ui.sessionTabs.append(button);
        });
      }
    }

    function cargoSnapshotIndex(route, flow, state) {
      if (!route) return -1;
      if (flow.currentStep?.kind === 'action') return Number(flow.currentStep.stopIndex);
      const completed = new Set((state.completedStopIds ?? []).map(String));
      let last = -1;
      route.stops.forEach((stop, index) => { if (completed.has(String(stop.id))) last = index; });
      return last;
    }

    function renderCargo(state, route, flow, model) {
      ui.cargoMode.value = state.cargoLayoutGroupingMode === 'mission' ? 'mission' : 'destination';
      if (!route) {
        ui.cargoTitle.textContent = 'No active cargo projection';
        ui.cargoGrid.innerHTML = '<div class="ops40-empty">Generate a session to display the hold.</div>';
        ui.cargoManifest.innerHTML = '';
        return;
      }

      try {
        const layout = autoCargo.plan(route, model, {
          snapshotStopIndex: cargoSnapshotIndex(route, flow, state),
          mode: ui.cargoMode.value,
          corrections: state.cargoCorrections
        });
        ui.cargoTitle.textContent = `${layout.usedScu} / ${layout.usableCapacityScu ?? layout.capacityScu} SCU · ${layout.freeScu} free`;
        ui.cargoGrid.style.setProperty('--ops40-columns', layout.geometry.columns);
        ui.cargoGrid.style.setProperty('--ops40-rows', layout.geometry.rows);
        ui.rampLabel.textContent = String(layout.geometry.orientation ?? 'Primary access at row A').toUpperCase();
        ui.cargoGrid.innerHTML = layout.floorCells.map((cell) => {
          const group = layout.groups.find((item) => String(item.key) === String(cell.groupKey));
          const classes = [
            'ops40-cargo-cell',
            group ? `is-group-${group.colorIndex}` : '',
            cell.reserved ? 'is-reserved' : '',
            cell.forcedEmpty || cell.buffer ? 'is-buffer' : '',
            cell.manual ? 'is-manual' : ''
          ].filter(Boolean).join(' ');
          const title = cell.reserved
            ? `${cell.coordinate} · reserved`
            : group
              ? `${cell.coordinate} · ${cell.usedLayers}/${cell.capacityLayers} SCU · ${group.label}`
              : `${cell.coordinate} · empty`;
          return `<div class="${classes}" title="${escapeHtml(title)}"><small>${escapeHtml(cell.coordinate)}</small><strong>${cell.usedLayers || ''}</strong><span>${cell.reserved ? 'RES' : cell.forcedEmpty ? 'CLEAR' : ''}</span></div>`;
        }).join('');
        ui.cargoManifest.innerHTML = layout.groups.length
          ? layout.groups.map((group) => `<article class="is-group-${group.colorIndex}"><span></span><div><strong>${escapeHtml(group.label)}</strong><small>${group.scu} SCU · unload #${group.unloadOrder}</small></div></article>`).join('')
            + `<footer><strong>${layout.usedScu} SCU</strong><small>${layout.freeScu} SCU free</small></footer>`
          : '<div class="ops40-empty-inline">No mission cargo projected onboard.</div>';
      } catch (error) {
        ui.cargoTitle.textContent = 'Cargo layout unavailable';
        ui.cargoGrid.innerHTML = `<div class="ops40-empty">${escapeHtml(error.message)}</div>`;
        ui.cargoManifest.innerHTML = '';
      }
    }

    function renderStep(state, route, flow, model, routeCargo) {
      const step = flow.currentStep;
      ui.stepIndex.textContent = `${Math.min(flow.currentIndex + 1, flow.totalSteps)} / ${flow.totalSteps}`;
      ui.previous.disabled = flow.currentIndex <= 0;
      ui.complete.disabled = !step;
      ui.stepOperations.innerHTML = '';
      ui.after.innerHTML = '';
      ui.upcoming.innerHTML = '';

      if (!step) {
        ui.stepState.textContent = flow.complete ? 'COMPLETE' : 'STANDBY';
        ui.stepTitle.textContent = flow.complete ? 'Session complete' : 'Generate a session first';
        ui.stepSubtitle.textContent = flow.complete ? 'All operational steps are complete.' : 'No active operational route.';
        ui.stepPrimary.innerHTML = flow.complete ? `<div class="ops40-complete-state">${icon('check')}<strong>All stops completed</strong></div>` : '';
        ui.complete.textContent = 'CONTINUE';
        return;
      }

      ui.stepState.textContent = step.kind === 'action' ? (step.totals.delivery && step.totals.pickup ? 'MIXED STOP' : step.totals.delivery ? 'DROP-OFF' : 'PICKUP') : step.kind === 'jump' ? 'JUMP' : 'TRAVEL';
      ui.stepTitle.textContent = step.title;
      ui.stepSubtitle.textContent = step.kind === 'action'
        ? `${step.location.shortLabel} · ${step.systemName}`
        : `${step.from.shortLabel} → ${step.to.shortLabel}`;

      if (step.kind === 'action') {
        const stop = route.stops.find((item) => String(item.id) === String(step.stopId));
        const projected = Math.max(0, routeCargo.totals.onboardScu - Number(step.totals.delivery ?? 0) + Number(step.totals.pickup ?? 0));
        ui.stepPrimary.innerHTML = `<div class="ops40-action-totals">
          ${step.totals.delivery ? `<span class="is-delivery">${icon('unload')}<b>-${step.totals.delivery} SCU</b></span>` : ''}
          ${step.totals.pickup ? `<span class="is-pickup">${icon('load')}<b>+${step.totals.pickup} SCU</b></span>` : ''}
          <span>${icon('cargo')}<b>${projected} / ${model.capacityScu} SCU</b></span>
        </div>`;
        ui.stepOperations.innerHTML = (stop?.operations ?? []).filter((operation) => operation.lotId).map((operation) => `<article class="is-${operation.type}"><span>${icon(operation.type === 'delivery' ? 'unload' : 'load')}</span><div><strong>${Number(operation.scu ?? 0)} SCU · ${escapeHtml(operation.commodity)}</strong><small>${escapeHtml(operation.missionTitle ?? '')}</small></div></article>`).join('');
        ui.complete.textContent = 'COMPLETE STOP';
      } else {
        ui.stepPrimary.innerHTML = `<article class="ops40-travel-card"><span>${icon(step.kind === 'jump' ? 'gateway' : 'navigation')}</span><div><strong>${escapeHtml(step.estimate?.distanceLabel ?? step.to.systemName)}</strong><small>${step.estimate ? `${step.estimate.minMinutes}–${step.estimate.maxMinutes} min` : step.to.systemName}</small></div><b>${routeCargo.totals.onboardScu} SCU</b></article>`;
        ui.complete.textContent = step.kind === 'jump' ? 'JUMP COMPLETE' : step.kind === 'gateway-approach' ? 'REACHED GATEWAY' : 'ARRIVED';
      }

      const next = flow.nextStep;
      if (next) {
        ui.after.innerHTML = `<small>AFTER THIS</small><article><span>${icon(next.kind === 'jump' ? 'gateway' : next.kind === 'action' ? 'operations' : 'navigation')}</span><div><strong>${escapeHtml(next.title)}</strong><small>${escapeHtml(next.kind === 'action' ? next.systemName : `${next.from.shortLabel} → ${next.to.shortLabel}`)}</small></div></article>`;
      }
      const future = flow.steps.slice(flow.currentIndex + 2, flow.currentIndex + 5);
      if (future.length) {
        ui.upcoming.innerHTML = `<small>UPCOMING</small><div>${future.map((item, index) => `<article><b>${String(flow.currentIndex + index + 3).padStart(2, '0')}</b><span>${escapeHtml(item.title)}</span></article>`).join('')}</div>`;
      }
    }

    function renderTimeline(route, flow, model) {
      if (!route?.stops?.length) {
        ui.timelineTitle.textContent = 'No active route';
        ui.routeProgress.textContent = '0 / 0';
        ui.timeline.innerHTML = '<div class="ops40-empty-inline">Generate missions to build the route timeline.</div>';
        return;
      }
      const projection = stopCargoProjection(route, model);
      const actionSteps = new Map(flow.steps.filter((step) => step.kind === 'action').map((step) => [String(step.stopId), step]));
      const activeIndex = Number(store.getState().activeRouteSessionIndex ?? 0);
      ui.timelineTitle.textContent = `Session ${activeIndex + 1}`;
      ui.routeProgress.textContent = `${route.stops.filter((stop) => flow.completedSet.has(`action:${stop.id}`)).length} / ${route.stops.length}`;
      ui.timeline.innerHTML = route.stops.map((stop, index) => {
        const action = actionSteps.get(String(stop.id));
        const complete = action ? flow.completedSet.has(action.id) : false;
        const current = flow.currentStep?.kind === 'action' && String(flow.currentStep.stopId) === String(stop.id);
        const inbound = !complete && !current && String(flow.currentStep?.destinationStopId) === String(stop.id);
        const status = complete ? 'complete' : current ? 'current' : inbound ? 'next' : 'future';
        const cargo = projection.get(String(stop.id));
        const location = locations.getLocation(stop.locationId);
        const system = locations.getSystemForLocation(stop.locationId);
        return `<article class="ops40-stop is-${status}" data-stop-id="${escapeHtml(stop.id)}"><b>${complete ? icon('check') : String(index + 1).padStart(2, '0')}</b><div><strong>${escapeHtml(location?.name ?? stop.locationLabel)}</strong><small>${escapeHtml(system?.name ?? '')}</small><span>${escapeHtml(operationSummary(stop))}</span></div><footer><strong>${cargo?.delta > 0 ? '+' : ''}${cargo?.delta ?? 0} SCU</strong><small>${cargo?.after ?? 0} onboard · ${cargo?.free ?? model.capacityScu} free</small></footer></article>`;
      }).join('');
      requestAnimationFrame(() => ui.timeline.querySelector('.is-current, .is-next')?.scrollIntoView({ inline: 'center', block: 'nearest' }));
    }

    function render(state = store.getState()) {
      const route = activeRoute(state);
      const flow = route ? operationalSteps.derive(route, state) : { steps: [], currentStep: null, nextStep: null, currentIndex: 0, totalSteps: 0, complete: false, completedSet: new Set() };
      const model = activeModel(state);
      const routeCargo = cargoState.deriveCargoState(route, state.completedStopIds ?? [], state.cargoCorrections ?? {});
      populateShipSelect(state);
      renderTop(state, route, flow, model, routeCargo);
      renderCargo(state, route, flow, model);
      renderStep(state, route, flow, model, routeCargo);
      renderTimeline(route, flow, model);
    }

    function openMissions(mode) {
      document.querySelector('[data-view-target="missions"]')?.click();
      root.dispatchEvent(new CustomEvent(mode === 'add' ? 'sc:add-current-missions' : 'sc:edit-current-missions'));
    }

    function openDrawer(kind) {
      const state = store.getState();
      ui.drawer.hidden = false;
      ui.drawer.dataset.mode = kind;
      ui.drawerMessage.textContent = '';
      if (kind === 'missions') {
        ui.drawerTitle.textContent = 'Active missions';
        ui.drawerBody.innerHTML = state.missions?.length
          ? state.missions.map((mission, index) => {
              const cargo = (mission.cargoLots ?? []).reduce((sum, lot) => sum + Number(lot.scu ?? 0), 0);
              return `<article class="ops40-drawer-row"><b>${String(index + 1).padStart(2, '0')}</b><div><strong>${escapeHtml(mission.title)}</strong><small>${cargo} SCU${mission.rewardAuec ? ` · ${Number(mission.rewardAuec).toLocaleString('en-US')} aUEC` : ''}</small></div><button type="button" data-ops40-edit-mission="${escapeHtml(mission.id)}">${icon('edit')}</button><button type="button" data-ops40-remove-mission="${escapeHtml(mission.id)}">${icon('trash')}</button></article>`;
            }).join('')
          : '<div class="ops40-empty">No active missions.</div>';
      } else {
        ui.drawerTitle.textContent = 'Route order';
        const route = activeRoute(state);
        const completed = new Set((state.completedStopIds ?? []).map(String));
        ui.drawerBody.innerHTML = route?.allStops?.length
          ? route.allStops.map((stop, index, stops) => `<article class="ops40-drawer-row${completed.has(String(stop.id)) ? ' is-complete' : ''}"><b>${String(index + 1).padStart(2, '0')}</b><div><strong>${escapeHtml(stop.locationLabel)}</strong><small>${stop.operations.length} operation${stop.operations.length === 1 ? '' : 's'}</small></div><button type="button" data-ops40-move-stop="${escapeHtml(stop.id)}" data-delta="-1" ${index === 0 || completed.has(String(stop.id)) ? 'disabled' : ''}>${icon('chevronUp')}</button><button type="button" data-ops40-move-stop="${escapeHtml(stop.id)}" data-delta="1" ${index === stops.length - 1 || completed.has(String(stop.id)) ? 'disabled' : ''}>${icon('chevronDown')}</button></article>`).join('')
          : '<div class="ops40-empty">No active route.</div>';
      }
    }

    page.addEventListener('click', (event) => {
      const session = event.target.closest('[data-ops40-session]');
      if (session) return activateSession(Number(session.dataset.ops40Session));

      const action = event.target.closest('[data-ops40-action]')?.dataset.ops40Action;
      if (action === 'add') return openMissions('add');
      if (action === 'edit') return openMissions('edit');
      if (action === 'missions') return openDrawer('missions');
      if (action === 'order') return openDrawer('order');
      if (action === 'cargo') return root.dispatchEvent(new Event('sc:open-cargo-grid-editor'));

      const remove = event.target.closest('[data-ops40-remove-mission]');
      if (remove) {
        try {
          const state = store.getState();
          rebuildPlan((state.missions ?? []).filter((mission) => String(mission.id) !== String(remove.dataset.ops40RemoveMission)));
          ui.drawerMessage.textContent = 'Mission removed and route rebuilt.';
          openDrawer('missions');
        } catch (error) {
          ui.drawerMessage.textContent = error.message;
        }
        return;
      }
      if (event.target.closest('[data-ops40-edit-mission]')) return openMissions('edit');

      const move = event.target.closest('[data-ops40-move-stop]');
      if (move) {
        try {
          const state = store.getState();
          const next = corrections.changeOrder(state.route, state.routeCorrections, move.dataset.ops40MoveStop, Number(move.dataset.delta), state.completedStopIds ?? []);
          store.patch({ routeCorrections: next });
          openDrawer('order');
        } catch (error) {
          ui.drawerMessage.textContent = error.message;
        }
      }
    });

    page.querySelector('#ops40-edit-grid').addEventListener('click', () => root.dispatchEvent(new Event('sc:open-cargo-grid-editor')));
    page.querySelector('#ops40-drawer-close').addEventListener('click', () => { ui.drawer.hidden = true; });
    ui.previous.addEventListener('click', () => {
      const state = store.getState();
      const route = activeRoute(state);
      if (route) store.patch(operationalSteps.previous(route, state));
    });
    ui.complete.addEventListener('click', () => {
      const state = store.getState();
      const route = activeRoute(state);
      if (route) store.patch(operationalSteps.completeCurrent(route, state));
    });
    ui.cargoMode.addEventListener('change', () => store.patch({ cargoLayoutGroupingMode: ui.cargoMode.value }));
    ui.ship.addEventListener('change', () => {
      try {
        const state = store.getState();
        ensureShip(ui.ship.value);
        if (state.missions?.length && state.routeStartLocationId) rebuildPlan(state.missions, { modelId: ui.ship.value });
      } catch (error) {
        ui.ship.title = error.message;
      }
    });

    root.addEventListener('sc:session-change', (event) => {
      render(event.detail);
      if (!ui.drawer.hidden) openDrawer(ui.drawer.dataset.mode || 'missions');
    });
    root.addEventListener('hashchange', hideLegacyNavigation);
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !ui.drawer.hidden) ui.drawer.hidden = true;
    });

    render();
    root.dispatchEvent(new Event('sc:operations-v040-ready'));
    return true;
  }

  const observer = new MutationObserver(() => {
    if (install()) observer.disconnect();
  });
  if (!install()) observer.observe(document.documentElement, { childList: true, subtree: true });
}(typeof globalThis !== 'undefined' ? globalThis : window));
