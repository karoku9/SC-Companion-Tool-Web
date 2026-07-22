'use strict';

(function initializeRoutePlannerView() {
  const store = window.SCCompanionSession;
  const corrections = window.SCCompanionRouteCorrections;
  const progressModel = window.SCCompanionRouteProgress;
  const engine = window.SCCompanionRoutePlannerEngine;
  const catalog = window.SCCompanionShipCatalog;
  const root = document.querySelector('#route-planner');
  if (!store || !corrections || !progressModel || !engine || !root) return;

  root.classList.remove('blueprint-page');
  root.innerHTML = `
    <header class="section-heading planner-live-heading">
      <div><p class="eyebrow">ROUTE PLANNER</p><h2>Compare valid route profiles</h2><p class="section-subtitle">Transparent estimates for future stops only. Completed stops stay locked.</p></div>
      <span class="page-status is-live">LIVE</span>
    </header>
    <div class="planner-live-shell">
      <section class="planner-profile-panel">
        <div class="planner-context-bar">
          <div><span>ACTIVE SESSION</span><strong id="planner-session-label">No route generated</strong></div>
          <div><span>VALID CANDIDATES</span><strong id="planner-candidate-count">0</strong></div>
          <div><span>ESTIMATE BASIS</span><strong>SCHEMATIC · INDICATIVE</strong></div>
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
          <strong>HOW THIS IS CALCULATED</strong>
          <span>Travel uses schematic Starmap positions and your ship quantum-time factor. Arrival and handling remain explicit heuristic ranges, not claimed live game telemetry.</span>
        </div>
        <div class="planner-action-bar">
          <div><span id="planner-apply-note">Review the proposed order before applying it.</span><small>RESET ROUTE remains available in Active Route.</small></div>
          <button type="button" class="secondary-button" data-shell-link="route">OPEN ACTIVE ROUTE</button>
          <button type="button" class="accent-button" id="planner-apply">APPLY ROUTE</button>
        </div>
      </section>
    </div>`;

  const elements = {
    sessionLabel: root.querySelector('#planner-session-label'),
    candidateCount: root.querySelector('#planner-candidate-count'),
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
    fastest: { title: 'Fastest practical', short: 'FASTEST', description: 'Minimizes the midpoint of travel, arrival and cargo-handling ranges.' },
    'fewest-quantum': { title: 'Fewest quantum legs', short: 'LOW TRANSITIONS', description: 'Minimizes inter-body quantum legs, then uses estimated time as the tie-breaker.' }
  };

  let selectedProfileId = 'fastest';
  let latestModel = null;
  let latestState = null;

  function activeShip(state) {
    return (state.hangarShips ?? []).find((ship) => ship.id === state.selectedShipId) ?? null;
  }

  function shipLabel(state) {
    const ship = activeShip(state);
    const model = catalog?.getModel(ship?.modelId ?? state.selectedShipModelId);
    return ship?.nickname || (model ? `${model.manufacturer} ${model.model}` : 'Selected ship');
  }

  function showEmpty(title, message, target, buttonLabel) {
    elements.empty.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = title;
    const detail = document.createElement('span');
    detail.textContent = message;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.shellLink = target;
    button.textContent = buttonLabel;
    elements.empty.append(heading, detail, button);
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
    card.innerHTML = `
      <div class="planner-profile-title"><span>${meta.short}</span>${profile.id === 'fastest' ? '<em>RECOMMENDED</em>' : ''}</div>
      <strong>${meta.title}</strong>
      <p>${meta.description}</p>
      <div class="planner-profile-metrics"><span>TIME<b>${formatRange(result.totalMin, result.totalMax)}</b></span><span>QUANTUM<b>${result.quantumLegs}</b></span><span>STOPS<b>${result.stopCount}</b></span></div>
      <small>${current ? 'CURRENT ORDER' : deltaText(result, baseline)}${profile.duplicate ? ' · SAME ORDER AS FASTEST' : ''}</small>`;
    card.addEventListener('click', () => {
      selectedProfileId = profile.id;
      render(latestState);
    });
    return card;
  }

  function operationSummary(stop) {
    const load = stop.operations.filter((operation) => operation.type !== 'delivery');
    const unload = stop.operations.filter((operation) => operation.type === 'delivery');
    const parts = [];
    if (load.length) parts.push(`Load ${load.reduce((sum, operation) => sum + Number(operation.scu ?? 0), 0)} SCU`);
    if (unload.length) parts.push(`Unload ${unload.reduce((sum, operation) => sum + Number(operation.scu ?? 0), 0)} SCU`);
    return parts.join(' · ') || `${stop.operations.length} operation${stop.operations.length === 1 ? '' : 's'}`;
  }

  function renderDetails(profile, baseline, currentIds) {
    const meta = labels[profile.id];
    const result = profile.result;
    const proposedIds = result.stops.map((stop) => String(stop.id));
    const current = sameOrder(proposedIds, currentIds);
    elements.detailKicker.textContent = meta.short;
    elements.detailTitle.textContent = meta.title;
    elements.detailDescription.textContent = meta.description;
    elements.detailTotal.textContent = formatRange(result.totalMin, result.totalMax);
    elements.detailDelta.textContent = deltaText(result, baseline);
    elements.routeList.replaceChildren();

    result.legs.forEach((leg, index) => {
      const item = document.createElement('li');
      item.className = 'planner-route-stop';
      item.innerHTML = `
        <div class="planner-stop-index"><span>${String(index + 1).padStart(2, '0')}</span><i></i></div>
        <div class="planner-stop-main"><strong>${leg.stop.locationLabel}</strong><span>${operationSummary(leg.stop)}</span><div class="planner-breakdown"><small>TRAVEL <b>${leg.travel.minMinutes}–${leg.travel.maxMinutes}m</b></small><small>ARRIVAL <b>${leg.arrival.minMinutes}–${leg.arrival.maxMinutes}m</b></small><small>HANDLING <b>${leg.handling.minMinutes}–${leg.handling.maxMinutes}m</b></small></div></div>
        <div class="planner-stop-total"><span>STOP TOTAL</span><strong>${leg.minMinutes}–${leg.maxMinutes}m</strong><small>${leg.travel.transitionKind.toUpperCase()}</small></div>`;
      item.title = `Travel: ${leg.travel.source}. Arrival: ${leg.arrival.source}. Handling: ${leg.handling.source}.`;
      elements.routeList.append(item);
    });

    elements.apply.disabled = current || !result.stops.length;
    elements.apply.textContent = current ? 'ROUTE ALREADY ACTIVE' : `APPLY ${meta.short}`;
    elements.applyNote.textContent = current ? 'This profile matches the active future route.' : `This changes only the ${result.stopCount} remaining stop${result.stopCount === 1 ? '' : 's'}.`;
  }

  function buildContext(state, route, progress) {
    const ship = activeShip(state);
    const completedStops = (route.allStops ?? route.stops).filter((stop) => progress.completedSet.has(String(stop.id)));
    return {
      locations: window.SCCompanionLocations,
      locationProfiles: window.SCCompanionLocationProfiles,
      arrivalEstimates: window.SCCompanionArrivalEstimates,
      starmap: window.SCCompanionStarmapData,
      quantumTimeFactor: ship?.quantumTimeFactor ?? 1,
      startStop: completedStops.at(-1) ?? null
    };
  }

  function render(state) {
    latestState = state;
    elements.profiles.replaceChildren();
    if (!state.route?.stops?.length) {
      latestModel = null;
      elements.sessionLabel.textContent = 'No route generated';
      elements.candidateCount.textContent = '0';
      showEmpty('Generate a mission route first', 'The planner will compare dependency-safe orders for the remaining stops.', 'missions', 'OPEN MISSION BUILDER');
      return;
    }

    const route = corrections.deriveRoute(state.route, state.routeCorrections);
    const progress = progressModel.derive(route, state.completedStopIds, state.currentStopIndex);
    elements.sessionLabel.textContent = `${progress.completedCount}/${route.stops.length} complete · ${shipLabel(state)}`;

    if (progress.complete) {
      latestModel = null;
      elements.candidateCount.textContent = '0';
      showEmpty('Session route complete', 'Use PREVIOUS in Active Route to reopen the last completed stop before replanning.', 'route', 'OPEN ACTIVE ROUTE');
      return;
    }

    const context = buildContext(state, route, progress);
    const model = engine.compare(route, progress, context);
    latestModel = { route, progress, model, context };
    const baseline = engine.evaluateOrder(route.stops.filter((stop) => !progress.completedSet.has(String(stop.id))), context);
    const currentIds = currentOrder(route, progress);

    elements.candidateCount.textContent = String(model.candidateCount);
    elements.empty.hidden = true;
    elements.profiles.hidden = false;
    elements.detail.hidden = false;

    if (!model.profiles.some((profile) => profile.id === selectedProfileId)) selectedProfileId = model.profiles[0]?.id ?? 'fastest';
    model.profiles.forEach((profile) => elements.profiles.append(profileCard(profile, baseline, currentIds)));

    const futureCard = document.createElement('article');
    futureCard.className = 'planner-profile-card is-future';
    futureCard.innerHTML = '<div class="planner-profile-title"><span>LOW RISK</span><em>NEXT</em></div><strong>Risk-aware route</strong><p>Will use sourced location risk and community reports only when confidence is visible.</p><div class="planner-profile-metrics"><span>STATUS<b>PLANNED</b></span></div><small>NO HIDDEN RISK SCORE</small>';
    elements.profiles.append(futureCard);

    const selected = model.profiles.find((profile) => profile.id === selectedProfileId) ?? model.profiles[0];
    if (selected) renderDetails(selected, baseline, currentIds);
  }

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
      window.dispatchEvent(new CustomEvent('sc:toast', { detail: { tone: 'success', title: 'Route applied', message: `${labels[selectedProfileId].title} is now the active future route.` } }));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('sc:toast', { detail: { tone: 'error', title: 'Route not applied', message: error.message } }));
    }
  });

  window.addEventListener('sc:session-change', (event) => render(event.detail));
  render(store.getState());
}());
