'use strict';

(function initializeRoutePlannerView() {
  const store = window.SCCompanionSession;
  const corrections = window.SCCompanionRouteCorrections;
  const progressModel = window.SCCompanionRouteProgress;
  const engine = window.SCCompanionRoutePlannerEngine;
  const catalog = window.SCCompanionShipCatalog;
  const cargoState = window.SCCompanionCargoState;
  const navigation = window.SCCompanionNavigationEstimates;
  const official = window.SCCompanionOfficialUniverseData;
  const root = document.querySelector('#route-planner');
  if (!store || !corrections || !progressModel || !engine || !cargoState || !navigation || !official || !root) return;

  root.classList.remove('blueprint-page');
  root.innerHTML = `
    <header class="section-heading planner-live-heading">
      <div><p class="eyebrow">ROUTE PLANNER</p><h2>Choose how the remaining cargo moves</h2><p class="section-subtitle">Capacity-safe routes only. Completed stops stay locked and every pickup remains before its delivery.</p></div>
      <span class="page-status is-live">${official.snapshot.gameVersion}</span>
    </header>
    <div class="planner-live-shell">
      <section class="planner-profile-panel">
        <div class="planner-context-bar">
          <div><span>ACTIVE SESSION</span><strong id="planner-session-label">No route generated</strong></div>
          <div><span>VALID ROUTES</span><strong id="planner-candidate-count">0</strong></div>
          <div><span>EFFECTIVE CAPACITY</span><strong id="planner-capacity-label">—</strong></div>
          <div><span>DATA SNAPSHOT</span><strong id="planner-data-label">${official.snapshot.gameVersion} · ${official.snapshot.verifiedAt}</strong></div>
        </div>
        <div class="planner-options">
          <label class="planner-toggle">
            <input type="checkbox" id="planner-protect-cargo">
            <span><strong>Protect cargo</strong><small>Within the allowed delay, finish loaded missions sooner and reduce cargo exposure.</small></span>
          </label>
          <label class="planner-number"><span>SAFETY DELAY LIMIT</span><div><input type="number" id="planner-safety-margin" min="0" max="120" step="1"><b>MIN</b></div></label>
          <label class="planner-number"><span>OFF-GRID ALLOWANCE</span><div><input type="number" id="planner-off-grid" min="0" max="500" step="1"><b>SCU</b></div><small>Manual override for cargo carried outside the verified grid.</small></label>
        </div>
        <div class="planner-empty" id="planner-empty"></div>
        <div class="planner-profile-grid" id="planner-profile-grid" hidden></div>
      </section>
      <section class="planner-detail-panel" id="planner-detail-panel" hidden>
        <div class="planner-detail-heading">
          <div><span id="planner-detail-kicker">SELECTED PROFILE</span><h3 id="planner-detail-title">—</h3><p id="planner-detail-description">—</p></div>
          <div class="planner-total"><span>ESTIMATED TOTAL</span><strong id="planner-detail-total">—</strong><small id="planner-detail-delta">—</small></div>
        </div>
        <ol class="planner-route-list" id="planner-route-list"></ol>
        <div class="planner-method-note">
          <strong>DATA AND CALCULATION BOUNDARY</strong>
          <span>Systems, locations and jump links use official RSI sources verified ${official.snapshot.verifiedAt} for ${official.snapshot.gameVersion}. Normal-space distance and navigation time are project estimates; jump tunnels are counted separately and are never converted into fake kilometres. Arrival, cargo handling and ship quantum factor remain indicative.</span>
        </div>
        <div class="planner-action-bar">
          <div><span id="planner-apply-note">Review the proposed order before applying it.</span><small>Active Route keeps RESET ROUTE available.</small></div>
          <button type="button" class="secondary-button" data-shell-link="route">OPEN ACTIVE ROUTE</button>
          <button type="button" class="accent-button" id="planner-apply">APPLY ROUTE</button>
        </div>
      </section>
    </div>`;

  const elements = {
    sessionLabel: root.querySelector('#planner-session-label'),
    candidateCount: root.querySelector('#planner-candidate-count'),
    capacityLabel: root.querySelector('#planner-capacity-label'),
    protectCargo: root.querySelector('#planner-protect-cargo'),
    safetyMargin: root.querySelector('#planner-safety-margin'),
    offGrid: root.querySelector('#planner-off-grid'),
    empty: root.querySelector('#planner-empty'),
    profiles: root.querySelector('#planner-profile-grid'),
    detail: root.querySelector('#planner-detail-panel'),
    detailKicker: root.querySelector('#planner-detail-kicker'),
    detailTitle: root.querySelector('#planner-detail-title'),
    detailDescription: root.querySelector('#planner-detail-description'),
    detailTotal: root.querySelector('#planner-detail-total'),
    detailDelta: root.querySelector('#planner-detail-delta'),
    routeList: root.querySelector('#planner-route-list'),
    applyNote: root.querySelector('#planner-apply-note'),
    apply: root.querySelector('#planner-apply')
  };

  const labels = {
    fastest: {
      title: 'Fastest practical',
      short: 'FASTEST',
      description: 'Minimizes estimated total time. Protect cargo may spend the configured margin to finish loaded missions sooner.'
    },
    'min-onboard': {
      title: 'Minimize cargo onboard',
      short: 'LOW LOAD',
      description: 'Minimizes peak SCU carried at once, then cargo exposure and total time.'
    }
  };

  let selectedProfileId = 'fastest';
  let latestModel = null;
  let latestState = null;

  function settings(state) {
    return {
      protectCargo: Boolean(state.routePlannerSettings?.protectCargo),
      safetyMarginMinutes: Math.max(0, Number(state.routePlannerSettings?.safetyMarginMinutes ?? 15)),
      offGridAllowanceScu: Math.max(0, Number(state.routePlannerSettings?.offGridAllowanceScu ?? 0))
    };
  }

  function activeShip(state) {
    return (state.hangarShips ?? []).find((ship) => ship.id === state.selectedShipId) ?? null;
  }

  function activeModel(state) {
    const ship = activeShip(state);
    const base = catalog?.getModel(ship?.modelId ?? state.selectedShipModelId);
    return {
      ship,
      model: base,
      physicalCapacityScu: Number(ship?.cargoCapacityScu ?? base?.capacityScu ?? 0)
    };
  }

  function shipLabel(state) {
    const { ship, model } = activeModel(state);
    return ship?.nickname || (model ? `${model.manufacturer} ${model.model}` : 'Selected ship');
  }

  function showEmpty(title, message, target, buttonLabel) {
    elements.empty.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = title;
    const detail = document.createElement('span');
    detail.textContent = message;
    elements.empty.append(heading, detail);
    if (target && buttonLabel) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.shellLink = target;
      button.textContent = buttonLabel;
      elements.empty.append(button);
    }
    elements.empty.hidden = false;
    elements.profiles.hidden = true;
    elements.detail.hidden = true;
  }

  function currentOrder(route, progress) {
    return route.stops.filter((stop) => !progress.completedSet.has(String(stop.id))).map((stop) => String(stop.id));
  }

  function sameOrder(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  function formatRange(minimum, maximum) {
    return `${minimum}–${maximum} MIN`;
  }

  function totalDistance(result) {
    return navigation.formatDistance(result.totalDistanceGm, result.totalJumpCount);
  }

  function deltaText(result, baseline) {
    if (!baseline) return 'No baseline available';
    const difference = Math.round(result.midpoint - baseline.midpoint);
    if (!difference) return 'Same estimated midpoint as current route';
    return `${difference < 0 ? 'Saves' : 'Adds'} about ${Math.abs(difference)} min vs current order`;
  }

  function profileCard(profile, baseline, currentIds) {
    const meta = labels[profile.id];
    const result = profile.result;
    const proposedIds = result.stops.map((stop) => String(stop.id));
    const current = sameOrder(proposedIds, currentIds);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `planner-profile-card${profile.id === selectedProfileId ? ' is-selected' : ''}`;
    card.dataset.profileId = profile.id;
    card.setAttribute('aria-pressed', String(profile.id === selectedProfileId));
    const badges = [
      profile.id === 'fastest' ? 'RECOMMENDED' : '',
      profile.safetyAdjusted ? 'CARGO PROTECTED' : ''
    ].filter(Boolean).map((label) => `<em>${label}</em>`).join('');
    card.innerHTML = `
      <div class="planner-profile-title"><span>${meta.short}</span><div>${badges}</div></div>
      <strong>${meta.title}</strong>
      <p>${meta.description}</p>
      <div class="planner-profile-metrics">
        <span>TIME<b>${formatRange(result.totalMin, result.totalMax)}</b></span>
        <span>DISTANCE<b>${totalDistance(result)}</b></span>
        <span>JUMPS<b>${result.totalJumpCount}</b></span>
        <span>PEAK LOAD<b>${result.peakOnboardScu} SCU</b></span>
      </div>
      <small>${current ? 'CURRENT ORDER' : deltaText(result, baseline)} · Exposure ${result.exposureScuMinutes} SCU·MIN${profile.duplicate ? ' · SAME ORDER AS OTHER PROFILE' : ''}</small>`;
    card.addEventListener('click', () => {
      selectedProfileId = profile.id;
      render(latestState);
    });
    return card;
  }

  function operationSummary(stop) {
    const load = stop.operations.filter((operation) => operation.type !== 'delivery' && operation.lotId);
    const unload = stop.operations.filter((operation) => operation.type === 'delivery' && operation.lotId);
    const parts = [];
    if (unload.length) parts.push(`Drop off ${unload.reduce((sum, operation) => sum + Number(operation.scu ?? 0), 0)} SCU`);
    if (load.length) parts.push(`Pick up ${load.reduce((sum, operation) => sum + Number(operation.scu ?? 0), 0)} SCU`);
    return parts.join(' · ') || `${stop.operations.length} objective${stop.operations.length === 1 ? '' : 's'}`;
  }

  function renderDetails(profile, baseline, currentIds) {
    const meta = labels[profile.id];
    const result = profile.result;
    const proposedIds = result.stops.map((stop) => String(stop.id));
    const current = sameOrder(proposedIds, currentIds);
    elements.detailKicker.textContent = profile.safetyAdjusted ? `${meta.short} · CARGO PROTECTED` : meta.short;
    elements.detailTitle.textContent = meta.title;
    elements.detailDescription.textContent = `${meta.description} ${totalDistance(result)} across ${result.totalJumpCount} jump${result.totalJumpCount === 1 ? '' : 's'}.`;
    elements.detailTotal.textContent = formatRange(result.totalMin, result.totalMax);
    elements.detailDelta.textContent = deltaText(result, baseline);
    elements.routeList.replaceChildren();

    result.legs.forEach((leg, index) => {
      const item = document.createElement('li');
      item.className = 'planner-route-stop';
      const jumpText = leg.travel.jumpCount ? `${leg.travel.jumpCount} jump${leg.travel.jumpCount === 1 ? '' : 's'}` : leg.travel.transitionKind;
      item.innerHTML = `
        <div class="planner-stop-index"><span>${String(index + 1).padStart(2, '0')}</span><i></i></div>
        <div class="planner-stop-main">
          <strong>${leg.stop.locationLabel}</strong>
          <span>${operationSummary(leg.stop)}</span>
          <div class="planner-breakdown">
            <small>DISTANCE <b>${leg.travel.distanceLabel}</b></small>
            <small>NAVIGATION <b>${leg.travel.minMinutes}–${leg.travel.maxMinutes}m</b></small>
            <small>ARRIVAL <b>${leg.arrival.minMinutes}–${leg.arrival.maxMinutes}m</b></small>
            <small>HANDLING <b>${leg.handling.minMinutes}–${leg.handling.maxMinutes}m</b></small>
          </div>
        </div>
        <div class="planner-stop-total">
          <span>AFTER STOP</span>
          <strong>${leg.onboardAfterScu} SCU onboard</strong>
          <small>${leg.minMinutes}–${leg.maxMinutes}m total · ${jumpText.toUpperCase()}</small>
        </div>`;
      item.title = `Navigation: ${leg.travel.source}. Arrival: ${leg.arrival.source}. Handling: ${leg.handling.source}.`;
      elements.routeList.append(item);
    });

    elements.apply.disabled = current || !result.stops.length;
    elements.apply.textContent = current ? 'ROUTE ALREADY ACTIVE' : `APPLY ${meta.short}`;
    elements.applyNote.textContent = current
      ? 'This profile matches the active future route.'
      : `Peak load ${result.peakOnboardScu}/${result.effectiveCapacityScu} SCU · ${totalDistance(result)} · ${result.stopCount} future stops.`;
  }

  function buildContext(state, route, progress) {
    const currentSettings = settings(state);
    const { physicalCapacityScu } = activeModel(state);
    const completedStops = (route.allStops ?? route.stops).filter((stop) => progress.completedSet.has(String(stop.id)));
    const lifecycle = cargoState.deriveCargoState(route, progress.completedStopIds, state.cargoCorrections);
    return {
      locations: window.SCCompanionLocations,
      locationProfiles: window.SCCompanionLocationProfiles,
      arrivalEstimates: window.SCCompanionArrivalEstimates,
      starmap: window.SCCompanionStarmapData,
      navigationEstimates: navigation,
      quantumTimeFactor: activeShip(state)?.quantumTimeFactor ?? 1,
      startStop: completedStops[completedStops.length - 1] ?? null,
      initialOnboardLots: lifecycle.onboardLots,
      cargoLotsByKey: new Map(lifecycle.lots.map((lot) => [lot.key, lot])),
      physicalCapacityScu,
      offGridAllowanceScu: currentSettings.offGridAllowanceScu,
      cargoSafetyEnabled: currentSettings.protectCargo,
      safetyMarginMinutes: currentSettings.safetyMarginMinutes
    };
  }

  function syncControls(state) {
    const current = settings(state);
    elements.protectCargo.checked = current.protectCargo;
    elements.safetyMargin.value = String(current.safetyMarginMinutes);
    elements.safetyMargin.disabled = !current.protectCargo;
    elements.offGrid.value = String(current.offGridAllowanceScu);
  }

  function render(state) {
    latestState = state;
    syncControls(state);
    elements.profiles.replaceChildren();
    if (!state.route?.stops?.length) {
      latestModel = null;
      elements.sessionLabel.textContent = 'No route generated';
      elements.candidateCount.textContent = '0';
      elements.capacityLabel.textContent = '—';
      showEmpty('Generate a mission route first', 'The planner will compare dependency-safe and capacity-safe orders for the remaining stops.', 'missions', 'OPEN MISSION BUILDER');
      return;
    }

    const route = corrections.deriveRoute(state.route, state.routeCorrections);
    const progress = progressModel.derive(route, state.completedStopIds, state.currentStopIndex);
    const currentSettings = settings(state);
    const { physicalCapacityScu } = activeModel(state);
    elements.sessionLabel.textContent = `${progress.completedCount}/${route.stops.length} complete · ${shipLabel(state)}`;
    elements.capacityLabel.textContent = `${physicalCapacityScu} + ${currentSettings.offGridAllowanceScu} off-grid = ${physicalCapacityScu + currentSettings.offGridAllowanceScu} SCU`;

    if (progress.complete) {
      latestModel = null;
      elements.candidateCount.textContent = '0';
      showEmpty('Session route complete', 'Use Previous stop in Active Route to reopen the last completed stop before replanning.', 'route', 'OPEN ACTIVE ROUTE');
      return;
    }

    const context = buildContext(state, route, progress);
    const model = engine.compare(route, progress, context);
    latestModel = { route, progress, model, context };
    const currentStops = route.stops.filter((stop) => !progress.completedSet.has(String(stop.id)));
    const baseline = engine.evaluateOrder(currentStops, context);
    const currentIds = currentOrder(route, progress);

    elements.candidateCount.textContent = `${model.feasibleCandidateCount} / ${model.candidateCount}`;
    if (!model.profiles.length) {
      const missing = Math.max(0, model.minimumRequiredCapacityScu - context.physicalCapacityScu);
      showEmpty(
        'No capacity-safe route',
        `The best valid order still peaks at ${model.minimumRequiredCapacityScu} SCU. Add at least ${missing} SCU of off-grid allowance, reduce actual cargo, or change the mission set.`,
        null,
        null
      );
      return;
    }

    elements.empty.hidden = true;
    elements.profiles.hidden = false;
    elements.detail.hidden = false;
    if (!model.profiles.some((profile) => profile.id === selectedProfileId)) selectedProfileId = model.profiles[0]?.id ?? 'fastest';
    model.profiles.forEach((profile) => elements.profiles.append(profileCard(profile, baseline, currentIds)));
    const selected = model.profiles.find((profile) => profile.id === selectedProfileId) ?? model.profiles[0];
    if (selected) renderDetails(selected, baseline, currentIds);
  }

  function saveSettings(changes) {
    const state = store.getState();
    store.patch({ routePlannerSettings: { ...settings(state), ...changes } });
  }

  elements.protectCargo.addEventListener('change', () => saveSettings({ protectCargo: elements.protectCargo.checked }));
  elements.safetyMargin.addEventListener('change', () => saveSettings({ safetyMarginMinutes: Math.max(0, Number(elements.safetyMargin.value) || 0) }));
  elements.offGrid.addEventListener('change', () => saveSettings({ offGridAllowanceScu: Math.max(0, Number(elements.offGrid.value) || 0) }));

  elements.apply.addEventListener('click', () => {
    if (!latestModel || !latestState) return;
    const selected = latestModel.model.profiles.find((profile) => profile.id === selectedProfileId);
    if (!selected) return;
    try {
      const allStops = latestModel.route.allStops ?? latestModel.route.stops;
      const completed = allStops.filter((stop) => latestModel.progress.completedSet.has(String(stop.id))).map((stop) => String(stop.id));
      const proposed = selected.result.stops.map((stop) => String(stop.id));
      const skipped = allStops.filter((stop) => stop.skipped && !latestModel.progress.completedSet.has(String(stop.id))).map((stop) => String(stop.id));
      const remaining = allStops.map((stop) => String(stop.id)).filter((id) => !completed.includes(id) && !proposed.includes(id) && !skipped.includes(id));
      const next = corrections.assertValid(latestState.route, {
        ...(latestState.routeCorrections ?? {}),
        order: [...completed, ...proposed, ...skipped, ...remaining]
      });
      store.patch({ routeCorrections: next, lastAppliedRouteProfile: selectedProfileId });
      window.dispatchEvent(new CustomEvent('sc:toast', {
        detail: { tone: 'success', title: 'Route applied', message: `${labels[selectedProfileId].title} is now active.` }
      }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('sc:toast', {
        detail: { tone: 'error', title: 'Route not applied', message: error.message }
      }));
    }
  });

  window.addEventListener('sc:session-change', (event) => render(event.detail));
  render(store.getState());
}());
