'use strict';

(function initializeOperationsFlowV028(root) {
  let initialized = false;

  function install() {
    if (initialized) return true;
    const store = root.SCCompanionSession;
    const corrections = root.SCCompanionRouteCorrections;
    const routeProgress = root.SCCompanionRouteProgress;
    const cargoState = root.SCCompanionCargoState;
    const operationalSteps = root.SCCompanionOperationalSteps;
    const autoCargo = root.SCCompanionAutoCargoLayout;
    const shipCatalog = root.SCCompanionShipCatalog;
    const cargoZones = root.SCCompanionCargoZones;
    const locations = root.SCCompanionLocations;
    const locationContext = root.SCCompanionLocationContext;
    const icons = root.SCCompanionMfdIcons;

    const page = document.querySelector('.operations-page.operations-v027');
    const grid = page?.querySelector('.operations-grid');
    const commandDeck = page?.querySelector('.ops-v027-command-deck');
    const timelinePanel = page?.querySelector('.ops-v027-timeline-panel');
    const mapPanel = page?.querySelector('.ops-live-navigation');
    const currentPanel = page?.querySelector('.current-operation-panel');
    const tools = page?.querySelector('.operations-tools');
    const completeButton = currentPanel?.querySelector('#complete-stop');
    const previousButton = currentPanel?.querySelector('#previous-stop');
    if (!store || !corrections || !routeProgress || !cargoState || !operationalSteps || !autoCargo || !shipCatalog || !cargoZones || !locations || !locationContext || !icons || !page || !grid || !commandDeck || !timelinePanel || !mapPanel || !currentPanel || !tools || !completeButton || !previousButton) return false;

    initialized = true;
    page.classList.add('operations-v028');
    const icon = (name, className = 'ops-v028-icon') => icons.render(name, className);
    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const cargoPanel = document.createElement('section');
    cargoPanel.className = 'mfd-panel ops-v028-cargo-panel';
    cargoPanel.innerHTML = `
      <header class="ops-v028-panel-header">
        <div><small>AUTO CARGO LAYOUT</small><strong id="ops-v028-cargo-title">Projected hold</strong></div>
        <label class="ops-v028-grouping"><span>GROUP BY</span><select id="ops-v028-cargo-mode" aria-label="Cargo grouping mode"><option value="destination">Destination</option><option value="mission">Mission</option></select></label>
      </header>
      <div id="ops-v028-cargo-body" class="ops-v028-cargo-body"></div>`;
    timelinePanel.insertAdjacentElement('afterend', cargoPanel);
    const cargoMode = cargoPanel.querySelector('#ops-v028-cargo-mode');
    const cargoBody = cargoPanel.querySelector('#ops-v028-cargo-body');

    function activeRoute(state) {
      return state.route ? corrections.deriveRoute(state.route, state.routeCorrections) : null;
    }

    function activeModel(state) {
      const ship = (state.hangarShips ?? []).find((item) => item.id === state.selectedShipId) ?? null;
      const base = shipCatalog.getModel(ship?.modelId ?? state.selectedShipModelId) ?? shipCatalog.models[0];
      return cargoZones.resolveModel(base, ship, state.cargoZoneOverrides);
    }

    function systemName(locationId) {
      return locations.getSystemForLocation(locationId)?.name ?? 'Unknown system';
    }

    function shortLocation(locationId, fallback) {
      const location = locations.getLocation(locationId);
      return location?.name ?? String(fallback ?? locationId ?? 'Unknown').split('·')[0].trim();
    }

    function stopCargoProjection(route, capacityScu) {
      const projection = new Map();
      const completed = [];
      let before = 0;
      route.stops.forEach((stop) => {
        const totals = operationalSteps.stopTotals(stop);
        completed.push(String(stop.id));
        const afterState = cargoState.deriveCargoState(route, completed, {});
        const after = afterState.totals.onboardScu;
        projection.set(String(stop.id), Object.freeze({
          before,
          after,
          pickup: totals.pickup,
          delivery: totals.delivery,
          delta: after - before,
          free: Math.max(0, capacityScu - after)
        }));
        before = after;
      });
      return projection;
    }

    function actionSummary(stop) {
      const totals = operationalSteps.stopTotals(stop);
      return [
        totals.delivery ? `Drop ${totals.delivery} SCU` : '',
        totals.pickup ? `Pick up ${totals.pickup} SCU` : ''
      ].filter(Boolean).join(' · ') || `${stop.operations.length} objective${stop.operations.length === 1 ? '' : 's'}`;
    }

    function renderTimeline(route, flow, model) {
      const host = timelinePanel.querySelector('#ops-v027-timeline');
      const title = timelinePanel.querySelector('#ops-v027-timeline-title');
      const label = timelinePanel.querySelector('#ops-v027-progress');
      if (!route?.stops?.length) {
        title.textContent = 'No active sequence';
        label.textContent = '0 / 0';
        host.innerHTML = `<div class="ops-v027-empty-timeline">${icon('route')}<span>Build a route to display the operational sequence.</span></div>`;
        return;
      }

      const projection = stopCargoProjection(route, model.capacityScu);
      const actionSteps = new Map(flow.steps.filter((step) => step.kind === 'action').map((step) => [String(step.stopId), step]));
      title.textContent = `Session ${Number(store.getState().activeRouteSessionIndex ?? 0) + 1}`;
      label.textContent = `${route.stops.filter((stop) => flow.completedSet.has(`action:${stop.id}`)).length} / ${route.stops.length}`;
      host.innerHTML = route.stops.map((stop, index) => {
        const action = actionSteps.get(String(stop.id));
        const cargo = projection.get(String(stop.id));
        const complete = action ? flow.completedSet.has(action.id) : false;
        const current = flow.currentStep?.kind === 'action' && String(flow.currentStep.stopId) === String(stop.id);
        const inbound = !current && !complete && String(flow.currentStep?.destinationStopId) === String(stop.id);
        const state = complete ? 'complete' : current ? 'current' : inbound ? 'next' : 'future';
        const delta = cargo?.delta ?? 0;
        const deltaLabel = delta > 0 ? `+${delta}` : String(delta);
        return `<article class="ops-v027-route-step ops-v028-stop-card is-${state}" data-v028-stop-id="${escapeHtml(stop.id)}" title="${escapeHtml(stop.locationLabel)}">
          <span class="ops-v027-route-node">${complete ? icon('check') : String(index + 1).padStart(2, '0')}</span>
          <div class="ops-v027-route-copy">
            <strong>${escapeHtml(shortLocation(stop.locationId, stop.locationLabel))}</strong>
            <small class="ops-v028-stop-context">${escapeHtml(locations.getLocation(stop.locationId)?.contextName ?? '')}</small>
            <small class="ops-v028-stop-system">${icon('pin')} ${escapeHtml(systemName(stop.locationId))}</small>
            <small class="ops-v028-stop-action">${escapeHtml(actionSummary(stop))}</small>
            <span class="ops-v028-stop-cargo"><b>${escapeHtml(deltaLabel)} SCU</b><i>→</i><strong>${cargo?.after ?? 0} SCU</strong><em>${cargo?.free ?? model.capacityScu} free</em></span>
          </div>
          <b>${state === 'current' ? 'NOW' : state === 'next' ? 'NEXT' : state === 'complete' ? 'DONE' : `+${Math.max(1, index - route.stops.findIndex((item) => String(item.id) === String(flow.currentStep?.destinationStopId)))}`}</b>
        </article>`;
      }).join('');
    }

    function stepReferenceSequence(flow) {
      const current = flow.currentStep;
      if (!current) return [];
      const refs = [];
      const add = (reference, step, status) => {
        if (!reference?.id) return;
        const existing = refs.find((item) => item.reference.id === reference.id);
        if (existing) {
          if (status === 'current') existing.status = status;
          return;
        }
        refs.push({ reference, step, status });
      };

      if (current.kind === 'action') {
        add(current.location, current, 'current');
      } else {
        add(current.from, current, 'origin');
        add(current.to, current, 'current');
      }

      for (let index = flow.currentIndex + 1; index < flow.steps.length && refs.length < 5; index += 1) {
        const step = flow.steps[index];
        if (step.kind === 'action') {
          add(step.location, step, 'future');
          break;
        }
        add(step.to, step, refs.length === 1 ? 'next' : 'future');
      }
      return refs;
    }

    function renderFocusedMap(flow) {
      const svg = mapPanel.querySelector('#ops-live-map');
      const header = mapPanel.querySelector('.ops-live-nav-header');
      const title = mapPanel.querySelector('#ops-next-leg-title');
      const eta = mapPanel.querySelector('#ops-next-leg-eta');
      const strip = mapPanel.querySelector('#ops-next-leg-strip');
      if (!flow.currentStep) {
        header.querySelector('small').textContent = 'ROUTE / ACTIVE SEGMENT';
        title.textContent = flow.complete ? 'Session complete' : 'No active route';
        eta.textContent = '—';
        strip.innerHTML = '';
        svg.setAttribute('viewBox', '0 0 1000 360');
        svg.innerHTML = `<text x="500" y="180" text-anchor="middle" class="ops-map-empty">${flow.complete ? 'SESSION COMPLETE' : 'NO ACTIVE ROUTE'}</text>`;
        return;
      }

      const current = flow.currentStep;
      header.querySelector('small').textContent = 'ROUTE / ACTIVE SEGMENT';
      title.textContent = 'Focused route';
      eta.textContent = current.estimate ? `${current.estimate.minMinutes}–${current.estimate.maxMinutes} min` : current.kind === 'action' ? 'At location' : '—';
      const currentPath = current.kind === 'action'
        ? `${current.location.shortLabel} · ${current.systemName}`
        : `${current.from.shortLabel} → ${current.to.shortLabel}`;
      strip.innerHTML = `
        <span class="ops-nav-chip">${icon(current.kind === 'jump' ? 'gateway' : 'navigation')}<b>${escapeHtml(currentPath)}</b></span>
        ${current.estimate?.distanceLabel ? `<span class="ops-nav-chip"><b>${escapeHtml(current.estimate.distanceLabel)}</b></span>` : ''}
        ${current.kind === 'jump' ? `<span class="ops-nav-chip is-gateway"><b>${escapeHtml(current.from.systemName)}</b><i>→</i><b>${escapeHtml(current.to.systemName)}</b></span>` : ''}`;

      const refs = stepReferenceSequence(flow);
      svg.setAttribute('viewBox', '0 0 1000 360');
      if (!refs.length) return;
      const positions = refs.map((item, index) => ({
        ...item,
        x: refs.length === 1 ? 500 : 110 + index / Math.max(1, refs.length - 1) * 780,
        y: item.reference.type === 'jump-gateway' ? 185 : 210 + (index % 2 ? -24 : 24)
      }));
      const systems = [];
      positions.forEach((item) => {
        const existing = systems.find((system) => system.id === item.reference.systemId);
        if (existing) existing.end = item.x;
        else systems.push({ id: item.reference.systemId, name: item.reference.systemName, start: item.x, end: item.x });
      });
      const systemMarkup = systems.map((system) => `<g class="ops-v028-map-system"><line x1="${Math.max(35, system.start - 75)}" y1="48" x2="${Math.min(965, system.end + 75)}" y2="48"></line><text x="${(system.start + system.end) / 2}" y="34" text-anchor="middle">${escapeHtml(system.name)}</text></g>`).join('');
      const lines = positions.slice(1).map((item, index) => {
        const previous = positions[index];
        const status = index === 0 && current.kind !== 'action' ? 'current' : index === 0 ? 'next' : 'future';
        return `<line class="ops-map-leg ops-v028-map-leg is-${status}" x1="${previous.x}" y1="${previous.y}" x2="${item.x}" y2="${item.y}"></line>`;
      }).join('');
      const nodes = positions.map((item, index) => {
        const status = item.status === 'origin' ? 'complete' : item.status;
        const gateway = item.reference.type === 'jump-gateway';
        const marker = gateway
          ? `<rect x="-11" y="-11" width="22" height="22" transform="rotate(45)"></rect>`
          : `<circle r="${status === 'current' ? 15 : 11}"></circle>`;
        return `<g class="${gateway ? 'ops-map-gateway ops-v028-map-node' : 'ops-map-node ops-v028-map-node'} is-${status}" transform="translate(${item.x} ${item.y})" data-reference-id="${escapeHtml(item.reference.id)}">${marker}<text class="ops-map-index" text-anchor="middle" y="4">${gateway ? '' : index + 1}</text><text class="ops-map-label" text-anchor="middle" y="${item.y > 200 ? -24 : 31}">${escapeHtml(item.reference.shortLabel)}</text></g>`;
      }).join('');
      svg.innerHTML = `<defs><pattern id="ops-grid-v028" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none"></path></pattern></defs><rect width="1000" height="360" class="ops-map-grid"></rect>${systemMarkup}${lines}${nodes}`;
    }

    function serviceValue(context, id) {
      const service = context.services.find((item) => item.id === id);
      const labels = { available: 'Available', 'local-transfer': 'Available', limited: 'Limited', unregulated: 'Unregulated', 'not-available': 'None', unverified: 'Unverified', 'unavailable-data': 'Unknown' };
      return { value: labels[service?.status] ?? 'Unknown', detail: service?.detail ?? 'No reviewed record.' };
    }

    function renderCurrentPanel(state, route, flow, model) {
      const body = currentPanel.querySelector('.current-operation-body');
      const stateLabel = currentPanel.querySelector('#ops-stop-state');
      const indexLabel = currentPanel.querySelector('#ops-current-index');
      const routeCargo = cargoState.deriveCargoState(route, state.completedStopIds, state.cargoCorrections);
      const step = flow.currentStep;
      indexLabel.textContent = `${String(Math.min(flow.currentIndex + 1, flow.totalSteps)).padStart(2, '0')} / ${String(flow.totalSteps).padStart(2, '0')}`;
      previousButton.disabled = flow.completedCount === 0;

      if (!step) {
        stateLabel.textContent = flow.complete ? 'COMPLETE' : 'STANDBY';
        completeButton.disabled = true;
        completeButton.textContent = 'Session complete';
        body.innerHTML = `<p class="display-label">Current step</p><h2 id="current-stop-name">${flow.complete ? 'Session complete' : 'Generate a session first'}</h2><div id="current-stop-operations" class="operation-list"><div class="tool-empty">No active instruction.</div></div><section id="current-stop-intel" class="current-stop-intel" hidden></section>`;
        return;
      }

      completeButton.disabled = false;
      const next = flow.nextStep;
      const upcoming = flow.steps.slice(flow.currentIndex + 2, flow.currentIndex + 5);
      let title;
      let subtitle;
      let operationsMarkup = '';
      let projectedOnboard = routeCargo.totals.onboardScu;
      let context = null;

      if (step.kind === 'action') {
        const stop = route.stops.find((item) => String(item.id) === String(step.stopId));
        const totals = operationalSteps.stopTotals(stop);
        projectedOnboard = Math.max(0, routeCargo.totals.onboardScu - totals.delivery + totals.pickup);
        const operationKind = totals.delivery && totals.pickup ? 'mixed' : totals.delivery ? 'delivery' : 'pickup';
        title = step.title;
        subtitle = `${step.location.shortLabel} · ${step.systemName}`;
        stateLabel.textContent = totals.delivery ? (totals.pickup ? 'MIXED' : 'DROP-OFF') : 'PICKUP';
        completeButton.textContent = 'Complete stop and continue';
        const chips = [
          totals.delivery ? `<span class="is-delivery">${icon('unload')}<b>-${totals.delivery} SCU</b></span>` : '',
          totals.pickup ? `<span class="is-pickup">${icon('load')}<b>+${totals.pickup} SCU</b></span>` : '',
          `<span>${icon('cargo')}<b>${projectedOnboard} / ${model.capacityScu} SCU</b></span>`
        ].filter(Boolean).join('');
        const rows = (stop.operations ?? []).filter((operation) => operation.lotId).map((operation) => `<article class="ops-v028-operation-row is-${operation.type}"><span>${icon(operation.type === 'delivery' ? 'unload' : 'load')}</span><b>${Number(operation.scu ?? 0)} SCU ${escapeHtml(operation.commodity)}</b><small>${escapeHtml(operation.missionTitle ?? '')}</small></article>`).join('');
        operationsMarkup = `<div class="ops-v027-action-chips ops-v028-current-chips">${chips}</div><div class="ops-v028-operation-list">${rows}</div>`;
        context = locationContext.buildContext(step.location.id, {
          onboardScu: routeCargo.totals.onboardScu,
          onboardAfterScu: projectedOnboard,
          hasDelivery: Boolean(totals.delivery),
          hasPickup: Boolean(totals.pickup),
          operationKind,
          label: step.location.label
        });
      } else {
        title = step.title;
        subtitle = `${step.from.shortLabel} → ${step.to.shortLabel}`;
        stateLabel.textContent = step.kind === 'jump' ? 'JUMP' : 'TRAVEL';
        completeButton.textContent = step.kind === 'jump' ? 'Jump complete — continue' : step.kind === 'gateway-approach' ? 'Reached gateway — continue' : 'Arrived — continue';
        operationsMarkup = `<div class="ops-v028-travel-card"><span>${icon(step.kind === 'jump' ? 'gateway' : 'navigation')}</span><div><strong>${escapeHtml(step.estimate?.distanceLabel ?? step.to.systemName)}</strong><small>${step.estimate ? `${step.estimate.minMinutes}–${step.estimate.maxMinutes} min` : step.to.systemName}</small></div><b>${icon('cargo')} ${routeCargo.totals.onboardScu} SCU</b></div>`;
      }

      const afterMarkup = next ? `<section class="ops-v028-after-step"><small>AFTER THIS</small><div><span>${icon(next.kind === 'jump' ? 'gateway' : next.kind === 'action' ? 'operations' : 'navigation')}</span><strong>${escapeHtml(next.title)}</strong><em>${escapeHtml(next.kind === 'action' ? next.systemName : `${next.from.shortLabel} → ${next.to.shortLabel}`)}</em></div></section>` : '';
      const upcomingMarkup = upcoming.length ? `<section class="ops-v028-upcoming"><small>UPCOMING</small>${upcoming.map((item, offset) => `<div><span>${String(flow.currentIndex + offset + 3).padStart(2, '0')}</span><b>${escapeHtml(item.title)}</b><em>${escapeHtml(item.systemName)}</em></div>`).join('')}</section>` : '';
      const intelMarkup = context ? (() => {
        const hangar = serviceValue(context, 'hangars');
        const fuel = serviceValue(context, 'landing-services');
        const cards = [
          ['pin', context.system?.name ?? step.systemName, 'System'],
          ['shield', context.exposure.label, context.exposure.reasons.join(' ')],
          ['hangar', hangar.value, hangar.detail],
          ['fuel', fuel.value, fuel.detail],
          ['cargo', `${projectedOnboard} SCU`, `${Math.max(0, model.capacityScu - projectedOnboard)} SCU remains free after this stop.`]
        ];
        return `<section id="current-stop-intel" class="current-stop-intel ops-v028-intel"><header><small>LOCATION INTEL</small><strong>${escapeHtml(context.exposure.label)}</strong></header><div class="current-stop-intel-grid">${cards.map(([iconName, value, detail]) => `<article class="current-stop-intel-card" title="${escapeHtml(detail)}"><span class="intel-icon">${icon(iconName)}</span><strong>${escapeHtml(value)}</strong></article>`).join('')}</div></section>`;
      })() : '<section id="current-stop-intel" class="current-stop-intel" hidden></section>';

      body.innerHTML = `<p class="display-label">Current step</p><h2 id="current-stop-name">${escapeHtml(title)}</h2><p class="ops-v028-step-subtitle">${escapeHtml(subtitle)}</p><div id="current-stop-operations" class="operation-list">${operationsMarkup}</div>${afterMarkup}${upcomingMarkup}${intelMarkup}`;
    }

    function renderCommandDeck(state, route, flow, model) {
      const cargo = cargoState.deriveCargoState(route, state.completedStopIds, state.cargoCorrections);
      const current = flow.currentStep;
      const next = flow.nextStep;
      const upcomingJump = [current, next, ...flow.steps.slice(flow.currentIndex + 2)].find((step) => step?.kind === 'jump');
      const currentMetric = commandDeck.querySelector('#ops-v027-current');
      const nextMetric = commandDeck.querySelector('#ops-v027-next');
      const gatewayMetric = commandDeck.querySelector('#ops-v027-gateway');
      const onboardMetric = commandDeck.querySelector('#ops-v027-onboard');
      currentMetric.closest('article').querySelector('small').textContent = 'Current step';
      nextMetric.closest('article').querySelector('small').textContent = 'After this';
      currentMetric.textContent = current?.title ?? (flow.complete ? 'Complete' : '—');
      nextMetric.textContent = next?.title ?? (flow.complete ? 'Session complete' : '—');
      gatewayMetric.textContent = upcomingJump ? `${upcomingJump.from.shortLabel} → ${upcomingJump.to.shortLabel}` : 'None';
      onboardMetric.textContent = `${cargo.totals.onboardScu} / ${model.capacityScu} SCU`;
    }

    function renderCargoLayout(state, route, flow, model) {
      const routeState = routeProgress.derive(route, state.completedStopIds, state.currentStopIndex);
      const snapshotStopIndex = flow.currentStep?.kind === 'action'
        ? Number(flow.currentStep.stopIndex)
        : routeState.currentStopIndex - 1;
      const mode = state.cargoLayoutGroupingMode === 'mission' ? 'mission' : 'destination';
      cargoMode.value = mode;
      let layout;
      try {
        layout = autoCargo.plan(route, model, {
          snapshotStopIndex,
          mode,
          corrections: state.cargoCorrections
        });
      } catch (error) {
        cargoBody.innerHTML = `<div class="tool-empty">${escapeHtml(error.message)}</div>`;
        return;
      }
      cargoPanel.querySelector('#ops-v028-cargo-title').textContent = `After ${flow.currentStep?.kind === 'action' ? 'this stop' : 'current progress'} · ${layout.usedScu} / ${layout.capacityScu} SCU`;
      const cells = layout.floorCells.map((cell) => `<span class="ops-v028-cargo-cell${cell.groupKey ? ` is-group-${cell.colorIndex}` : ''}${cell.buffer ? ' is-buffer' : ''}" title="${escapeHtml(cell.groupKey ? `${cell.coordinate} · ${cell.usedLayers}/${cell.capacityLayers} layers` : `${cell.coordinate} · empty`)}"><small>${cell.coordinate}</small>${cell.usedLayers ? `<b>${cell.usedLayers}</b>` : ''}</span>`).join('');
      const legend = layout.groups.length ? layout.groups.map((group) => `<article><span class="is-group-${group.colorIndex}"></span><div><strong>${escapeHtml(group.label)}</strong><small>${group.scu} SCU · unload #${group.unloadOrder}</small><em>${escapeHtml(group.coordinates.slice(0, 4).join(', '))}${group.coordinates.length > 4 ? '…' : ''}</em></div></article>`).join('') : '<div class="tool-empty">No mission cargo is projected onboard at this point.</div>';
      cargoBody.innerHTML = `<div class="ops-v028-cargo-guidance"><span>${icon('check')} Grouped by ${mode}</span><span>${icon('check')} ${layout.leavesBufferSpace ? `${layout.bufferFloorCells} buffer cells` : 'No spare buffer cells'}</span><span>${icon('check')} Earlier drops stay nearer access</span><small>${escapeHtml(layout.geometry.orientation)} · conceptual placement guide</small></div><div class="ops-v028-cargo-grid-wrap"><div class="ops-v028-cargo-grid" style="--cargo-columns:${layout.geometry.columns};--cargo-rows:${layout.geometry.rows}">${cells}</div><b class="ops-v028-access-edge">ACCESS / RAMP · ROW A</b></div><div class="ops-v028-cargo-legend">${legend}<footer><span>${icon('cargo')} ${layout.usedScu} SCU</span><span>${layout.freeScu} SCU free</span></footer></div>`;
    }

    function render(state = store.getState()) {
      const route = activeRoute(state);
      if (!route?.stops?.length) return;
      const flow = operationalSteps.derive(route, state);
      const model = activeModel(state);
      renderTimeline(route, flow, model);
      renderFocusedMap(flow);
      renderCurrentPanel(state, route, flow, model);
      renderCommandDeck(state, route, flow, model);
      renderCargoLayout(state, route, flow, model);
    }

    completeButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const state = store.getState();
      const route = activeRoute(state);
      if (!route) return;
      store.patch(operationalSteps.completeCurrent(route, state));
    }, true);

    previousButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const state = store.getState();
      const route = activeRoute(state);
      if (!route) return;
      store.patch(operationalSteps.previous(route, state));
    }, true);

    cargoMode.addEventListener('change', () => store.patch({ cargoLayoutGroupingMode: cargoMode.value }));
    page.querySelector('[data-ops-action="cargo"]')?.addEventListener('click', () => requestAnimationFrame(() => cargoPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' })));
    root.addEventListener('sc:session-change', (event) => render(event.detail));
    render();
    return true;
  }

  const observer = new MutationObserver(() => {
    if (install()) observer.disconnect();
  });
  if (!install()) observer.observe(document.documentElement, { childList: true, subtree: true });
}(typeof globalThis !== 'undefined' ? globalThis : window));
