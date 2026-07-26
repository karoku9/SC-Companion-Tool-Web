'use strict';

(function initializeMissionWorkflowV026() {
  let initialized = false;

  function initialize() {
    if (initialized) return true;

    const page = document.querySelector('.missions-page');
    const grid = page?.querySelector('.missions-grid');
    const form = page?.querySelector('#mission-form');
    const validation = page?.querySelector('#mission-validation-panel');
    const output = page?.querySelector('.mission-output, .mission-preview');
    const gameLog = page?.querySelector('#game-log-intake');
    const ocr = page?.querySelector('#ocr-intake');
    const text = page?.querySelector('#mission-text');
    const message = page?.querySelector('#mission-message');
    const store = window.SCCompanionSession;
    const validator = window.SCCompanionMissionValidation;
    const missionModel = window.SCCompanionMissions;
    const locationModel = window.SCCompanionLocations;
    const sessionPlanner = window.SCCompanionRouteSessionPlanner;
    const shipCatalog = window.SCCompanionShipCatalog;
    const icons = window.SCCompanionMfdIcons;

    if (!page || !grid || !form || !validation || !output || !gameLog || !ocr || !text || !message
      || !store || !validator || !missionModel || !locationModel || !sessionPlanner || !shipCatalog) return false;

    initialized = true;

    let sourceText = text.value;
    let report = null;
    let reviewDrafts = [];
    let routePlan = null;

    const icon = (name, className = 'mission-icon') => icons?.render?.(name, className) ?? '';
    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    page.querySelector('.page-header h2').textContent = 'Mission intake';
    page.querySelector('.page-header p').textContent = 'Paste the contracts first. Then verify the parsed run sheet and set the route constraints.';
    page.querySelector('.page-header .status-tag')?.remove();

    const steps = document.createElement('nav');
    steps.className = 'mission-steps';
    steps.setAttribute('aria-label', 'Mission intake progress');
    steps.innerHTML = `
      <button type="button" data-stage="input" aria-current="step"><span>1</span><strong>Missions</strong></button>
      <button type="button" data-stage="review" disabled><span>2</span><strong>Run sheet</strong></button>
      <button type="button" data-stage="route" disabled><span>3</span><strong>Sessions</strong></button>`;

    const stage = document.createElement('div');
    stage.className = 'mission-stage';
    grid.replaceChildren(steps, stage);
    stage.append(form, validation, output);

    form.querySelector(':scope > .mfd-header')?.remove();
    const formActions = form.querySelector('.form-actions');
    const submit = form.querySelector('button[type="submit"]');
    const reset = form.querySelector('#reset-session');
    submit.textContent = 'Read missions';

    const inputTools = document.createElement('div');
    inputTools.className = 'mission-input-tools';
    inputTools.innerHTML = `
      <button type="button" class="mission-input-choice is-active" data-input="text">${icon('missions')}<span><strong>Text</strong><small>Paste or type contracts</small></span></button>
      <button type="button" class="mission-input-choice" data-input="screenshot">${icon('starmap')}<span><strong>Screenshot</strong><small>Paste a captured contract</small></span></button>`;
    form.insertBefore(inputTools, text);

    const experimental = document.createElement('details');
    experimental.className = 'mission-experimental';
    experimental.innerHTML = `<summary><strong>${icon('development')}Experimental Game.log import</strong><span>Optional assisted intake</span></summary>`;
    experimental.append(gameLog);
    form.append(experimental);
    form.insertBefore(ocr, experimental);

    const state = store.getState();
    const context = document.createElement('section');
    context.className = 'mission-route-context mission-route-context-v026';
    context.innerHTML = `
      <header><div>${icon('route')}<span><small>ROUTE SETTINGS</small><strong>Set these after checking the missions</strong></span></div><em>Before build</em></header>
      <div class="mission-context-grid">
        <label class="mission-context-location"><span>${icon('operations')}Current location</span><input id="mission-start-location" list="mission-start-location-list" autocomplete="off" placeholder="Where are you now?"><input id="mission-start-location-id" type="hidden"><datalist id="mission-start-location-list"></datalist><small id="mission-start-location-status">Required only when you build the route.</small></label>
        <label><span>${icon('ship')}Ship</span><select id="mission-ship-select"></select><small>Model and cargo capacity only.</small></label>
        <label><span>${icon('planner')}Route mode</span><select id="mission-route-mode"><option value="sessions">Time-boxed sessions</option><option value="fastest">Fastest full route</option></select><small>Sessions always keep a mission whole.</small></label>
        <label id="mission-session-target-label"><span>${icon('clock')}Maximum travel time</span><div class="mission-minute-input"><input id="mission-session-target" type="number" min="5" max="600" step="1" value="60" inputmode="numeric"><b>MIN</b></div><small>Exact budget for travel only. Loading and unloading are excluded.</small></label>
      </div>`;

    validation.innerHTML = `
      <header class="mission-review-heading">
        <div><small>PARSED CONTRACTS</small><strong>Run sheet</strong></div>
        <span id="focused-review-count">0 missions</span>
      </header>
      <div class="mission-review-alerts" id="focused-review-alerts"></div>
      <div class="mission-review-grid" id="focused-review-grid"></div>
      <footer class="mission-review-controls">
        <button type="button" class="button button--secondary" id="focused-review-add">${icon('plus')}Add mission</button>
        <button type="button" class="button button--secondary" id="focused-review-validate">${icon('check')}Validate changes</button>
        <button type="button" class="button button--primary" id="focused-review-generate">${icon('route')}Build sessions</button>
      </footer>`;
    validation.querySelector('.mission-review-heading').after(context);

    output.innerHTML = `
      <header class="mission-route-heading"><div><small>PLAY PLAN</small><strong id="focused-route-title">No route generated</strong></div></header>
      <div class="mission-route-summary" id="focused-route-summary"></div>
      <footer class="mission-route-actions">
        <button type="button" class="button button--secondary" data-route-edit>${icon('missions')}Edit run sheet</button>
        <button type="button" class="button button--primary" id="focused-route-open">${icon('operations')}Start selected session</button>
      </footer>`;

    const startInput = context.querySelector('#mission-start-location');
    const startIdInput = context.querySelector('#mission-start-location-id');
    const startStatus = context.querySelector('#mission-start-location-status');
    const locationList = context.querySelector('#mission-start-location-list');
    const shipSelect = context.querySelector('#mission-ship-select');
    const routeMode = context.querySelector('#mission-route-mode');
    const sessionTarget = context.querySelector('#mission-session-target');
    const sessionTargetLabel = context.querySelector('#mission-session-target-label');
    const reviewCount = validation.querySelector('#focused-review-count');
    const reviewAlerts = validation.querySelector('#focused-review-alerts');
    const reviewGrid = validation.querySelector('#focused-review-grid');
    const addMission = validation.querySelector('#focused-review-add');
    const validate = validation.querySelector('#focused-review-validate');
    const generate = validation.querySelector('#focused-review-generate');
    const routeTitle = output.querySelector('#focused-route-title');
    const routeSummary = output.querySelector('#focused-route-summary');
    const openRoute = output.querySelector('#focused-route-open');

    function operationalLabel(location) {
      return locationModel.formatOperationalLabel(location);
    }

    function populateLocations() {
      const locations = locationModel.locations
        .filter((location) => location.operational)
        .sort((left, right) => operationalLabel(left).localeCompare(operationalLabel(right)));
      locationList.replaceChildren(...locations.map((location) => {
        const option = document.createElement('option');
        option.value = operationalLabel(location);
        option.label = location.navigationTarget ?? location.name;
        return option;
      }));
    }

    function populateShips(selectedModelId = store.getState().selectedShipModelId) {
      shipSelect.replaceChildren(...shipCatalog.models.map((model) => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = `${model.manufacturer} ${model.model} · ${model.capacityScu} SCU`;
        return option;
      }));
      if (shipCatalog.getModel(selectedModelId)) shipSelect.value = selectedModelId;
    }

    function ensureSelectedShip() {
      const modelId = shipSelect.value;
      const current = store.getState();
      let ship = (current.hangarShips ?? []).find((item) => item.modelId === modelId);
      let hangarShips = current.hangarShips ?? [];
      if (!ship) {
        ship = shipCatalog.createHangarShip({ id: `quick-${modelId}`, modelId, quantumDrive: 'Stock', quantumTimeFactor: 1 });
        hangarShips = [...hangarShips, ship];
      }
      store.patch({ hangarShips, selectedShipId: ship.id, selectedShipModelId: modelId });
      return ship;
    }

    function locationCandidates(query) {
      const normalized = locationModel.normalizeSearchTerm(query);
      const matches = locationModel.searchOperationalLocations(query, { limit: 12 });
      const exact = matches.filter((location) => [
        location.name,
        location.navigationTarget,
        operationalLabel(location),
        ...(location.aliases ?? [])
      ].filter(Boolean).map(locationModel.normalizeSearchTerm).includes(normalized));
      return exact.length ? exact : matches;
    }

    function resolveStartLocation(showMessage = true) {
      const query = startInput.value.trim();
      if (!query) {
        startIdInput.value = '';
        if (showMessage) startStatus.textContent = 'Choose the current location before building the route.';
        startStatus.dataset.state = 'error';
        return null;
      }
      const candidates = locationCandidates(query);
      const location = candidates.length === 1 ? candidates[0] : null;
      if (!location) {
        startIdInput.value = '';
        if (showMessage) startStatus.textContent = candidates.length ? 'Choose the exact database location.' : 'Location not recognized.';
        startStatus.dataset.state = 'error';
        return null;
      }
      startIdInput.value = location.id;
      startInput.value = operationalLabel(location);
      startStatus.textContent = operationalLabel(location);
      startStatus.dataset.state = 'ready';
      return location;
    }

    function setInputMode(mode) {
      const screenshot = mode === 'screenshot';
      inputTools.querySelectorAll('[data-input]').forEach((button) => button.classList.toggle('is-active', button.dataset.input === mode));
      text.hidden = screenshot;
      ocr.hidden = !screenshot;
      formActions.hidden = screenshot;
      form.querySelector('.field-help').hidden = screenshot;
      message.hidden = screenshot;
      if (screenshot) ocr.querySelector('#ocr-paste-clipboard, #ocr-choose')?.focus({ preventScroll: true });
      else text.focus({ preventScroll: true });
    }

    function setStage(name) {
      page.dataset.intakeStage = name;
      form.hidden = name !== 'input';
      validation.hidden = name !== 'review';
      output.hidden = name !== 'route';
      steps.querySelectorAll('[data-stage]').forEach((button) => button.setAttribute('aria-current', button.dataset.stage === name ? 'step' : 'false'));
      if (name === 'review') renderReviewGrid();
      if (name === 'route') renderRoute();
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    function draftsFromReport(nextReport) {
      return nextReport.entries.filter((entry) => entry.kind === 'title').map((titleEntry) => {
        const parsedMission = nextReport.missions[titleEntry.missionIndex] ?? null;
        return {
          title: titleEntry.title,
          contractor: parsedMission?.contractor ?? titleEntry.contractor ?? '',
          rewardAuec: parsedMission?.rewardAuec ?? titleEntry.rewardAuec ?? '',
          objectives: nextReport.entries
            .filter((entry) => entry.kind === 'action' && entry.missionKey === titleEntry.key)
            .map((entry) => ({ action: entry.action, location: entry.rawLocation, cargo: entry.cargoText }))
        };
      });
    }

    function serializeDrafts() {
      return reviewDrafts.map((mission, index) => {
        const lines = [mission.title.trim() || `Mission ${index + 1}`];
        if (mission.contractor.trim()) lines.push(`contractor ${mission.contractor.trim()}`);
        const reward = Number(String(mission.rewardAuec).replace(/[^\d.]/g, ''));
        if (reward > 0) lines.push(`paga ${reward.toLocaleString('en-US')} aUEC`);
        mission.objectives.forEach((objective) => lines.push(`${objective.action} ${objective.location} ${objective.cargo}`.trim()));
        return lines.join('\n');
      }).join('\n\n');
    }

    function cargoPairs(value) {
      const pairs = [];
      const pattern = /(\d+(?:\.\d+)?)\s*scu\s+(.+?)(?=(?:\s+\d+(?:\.\d+)?\s*scu\b)|$)/gi;
      let match;
      while ((match = pattern.exec(String(value ?? '')))) {
        const commodity = match[2].replace(/\b(?:totale|total)\b/gi, '').trim();
        if (commodity) pairs.push({ quantity: Number(match[1]), commodity });
      }
      return pairs;
    }

    function resolveObjectiveLocations(value) {
      const parts = String(value ?? '').split('+').map((part) => part.trim()).filter(Boolean);
      if (!parts.length) return { state: 'error', title: 'Missing location', canonicalLabel: 'Missing location', locations: [] };
      const resolved = parts.map((part) => ({ part, matches: locationCandidates(part) }));
      if (resolved.every((item) => item.matches.length === 1)) {
        const locations = resolved.map((item) => item.matches[0]);
        return {
          state: 'ready',
          title: 'Matched to the location database',
          canonicalLabel: locations.map(operationalLabel).join(' + '),
          locations
        };
      }
      if (resolved.some((item) => item.matches.length === 0)) return { state: 'error', title: 'Unknown location', canonicalLabel: parts.join(' + '), locations: [] };
      return { state: 'warning', title: 'Ambiguous location', canonicalLabel: parts.join(' + '), locations: [] };
    }

    function applyReviewGrid() {
      reviewDrafts = [...reviewGrid.querySelectorAll('[data-review-mission]')].map((card) => ({
        title: card.querySelector('[data-field="title"]')?.value ?? '',
        contractor: card.querySelector('[data-field="contractor"]')?.value ?? '',
        rewardAuec: card.querySelector('[data-field="reward"]')?.value ?? '',
        objectives: [...card.querySelectorAll('[data-objective]')].map((row) => ({
          action: row.querySelector('[data-field="action"]')?.value ?? 'collect',
          location: row.querySelector('[data-field="location"]')?.value ?? '',
          cargo: row.querySelector('[data-field="cargo"]')?.value ?? ''
        }))
      }));
    }

    function missionIssues(index) {
      const mission = reviewDrafts[index];
      return report?.issues.filter((item) => item.entryKey?.startsWith(`mission-${index}`) || item.message?.includes(mission?.title)) ?? [];
    }

    function renderCargoChips(cargo) {
      const pairs = cargoPairs(cargo);
      if (!pairs.length) return '<span class="cargo-chip is-empty">No cargo parsed</span>';
      return pairs.map((pair) => `<span class="cargo-chip"><b>${escapeHtml(pair.quantity)}×</b><span>${escapeHtml(pair.commodity)}</span></span>`).join('');
    }

    function updateGenerateState() {
      const start = resolveStartLocation(false);
      generate.disabled = !report?.ready || !start;
      generate.textContent = routeMode.value === 'sessions' ? 'Build sessions' : 'Build fastest route';
    }

    function renderReviewGrid() {
      reviewGrid.replaceChildren();
      reviewAlerts.replaceChildren();
      reviewCount.textContent = `${reviewDrafts.length} mission${reviewDrafts.length === 1 ? '' : 's'}`;

      if (!reviewDrafts.length) {
        reviewGrid.innerHTML = '<div class="tool-empty">No mission detected.</div>';
        generate.disabled = true;
        return;
      }

      reviewDrafts.forEach((draft, missionIndex) => {
        const issues = missionIssues(missionIndex);
        const locationStates = draft.objectives.map((objective) => resolveObjectiveLocations(objective.location));
        locationStates.forEach((locationState, objectiveIndex) => {
          if (locationState.state === 'ready') draft.objectives[objectiveIndex].location = locationState.canonicalLabel;
        });
        const allLocationsReady = locationStates.length > 0 && locationStates.every((item) => item.state === 'ready');
        const hasBlockingIssue = issues.some((item) => item.severity === 'error');
        const payout = Number(String(draft.rewardAuec).replace(/[^\d.]/g, ''));

        const card = document.createElement('article');
        card.className = 'mission-review-card-v26';
        card.dataset.reviewMission = String(missionIndex);
        card.innerHTML = `
          <header class="mission-review-card-header-v26">
            <span class="mission-index">${String(missionIndex + 1).padStart(2, '0')}</span>
            <div class="mission-card-identity"><strong>${escapeHtml(draft.title || `Mission ${missionIndex + 1}`)}</strong><small>${escapeHtml(draft.contractor || 'Unknown contractor')}</small></div>
            <span class="mission-payout-pill">${payout > 0 ? `${payout.toLocaleString('en-US')} aUEC` : 'No payout'}</span>
            <span class="mission-location-flag is-${allLocationsReady && !hasBlockingIssue ? 'ready' : 'warning'}" title="${allLocationsReady ? 'All locations matched' : 'Check mission data'}" aria-label="${allLocationsReady ? 'All locations matched' : 'Check mission data'}">${icon(allLocationsReady ? 'check' : 'warning')}</span>
            <button type="button" class="mission-edit" data-edit-mission="${missionIndex}" aria-label="Edit mission" aria-pressed="false">${icon('edit')}</button>
            <button type="button" class="mission-remove" data-remove-mission="${missionIndex}" aria-label="Remove mission">${icon('trash')}</button>
          </header>
          <div class="mission-review-objectives"></div>
          <div class="mission-card-editor" hidden>
            <label><span>Mission name</span><input data-field="title" value="${escapeHtml(draft.title)}"></label>
            <label><span>Contractor</span><input data-field="contractor" value="${escapeHtml(draft.contractor)}" placeholder="Optional"></label>
            <label><span>Payout aUEC</span><input data-field="reward" inputmode="numeric" value="${escapeHtml(draft.rewardAuec)}" placeholder="0"></label>
          </div>`;

        const objectives = card.querySelector('.mission-review-objectives');
        draft.objectives.forEach((objective, objectiveIndex) => {
          const locationState = locationStates[objectiveIndex];
          const row = document.createElement('div');
          row.className = `mission-objective-row-v26 is-${objective.action}`;
          row.dataset.objective = String(objectiveIndex);
          row.innerHTML = `
            <select data-field="action" aria-label="Action"><option value="collect">COLLECT</option><option value="pickup">PICKUP</option><option value="deliver">DELIVER</option></select>
            <div class="mission-location-summary">
              <span class="mission-location-name">${escapeHtml(locationState.canonicalLabel)}</span>
              <span class="location-state-v26 is-${locationState.state}" title="${escapeHtml(locationState.title)}" aria-label="${escapeHtml(locationState.title)}">${icon(locationState.state === 'ready' ? 'check' : 'warning')}</span>
              <input class="mission-location-edit" data-field="location" aria-label="Location" value="${escapeHtml(draft.objectives[objectiveIndex].location)}">
            </div>
            <div class="mission-cargo-summary">
              <div class="mission-cargo-chips">${renderCargoChips(objective.cargo)}</div>
              <input class="mission-cargo-edit" data-field="cargo" aria-label="Cargo" value="${escapeHtml(objective.cargo)}">
            </div>`;
          row.querySelector('[data-field="action"]').value = objective.action;
          objectives.append(row);
        });
        reviewGrid.append(card);
      });

      const errors = report?.issues.filter((item) => item.severity === 'error') ?? [];
      if (errors.length) reviewAlerts.innerHTML = `<p class="is-error">${errors.length} blocking issue${errors.length === 1 ? '' : 's'} remain.</p>`;
      else reviewAlerts.innerHTML = '<p class="is-ready">All parsed missions are ready. Set the route options below, then build.</p>';
      updateGenerateState();
    }

    function analyze(source = text.value) {
      sourceText = source;
      report = validator.inspectMissionText(source, locationModel);
      text.value = source;
      reviewDrafts = draftsFromReport(report);
      routePlan = null;
      steps.querySelector('[data-stage="review"]').disabled = reviewDrafts.length === 0;
      steps.querySelector('[data-stage="route"]').disabled = true;
      setStage('review');
    }

    function validateChanges() {
      applyReviewGrid();
      const source = serializeDrafts();
      report = validator.inspectMissionText(source, locationModel);
      text.value = source;
      reviewDrafts = draftsFromReport(report);
      renderReviewGrid();
    }

    function formatTravel(estimate) {
      const minutes = Math.max(0, Math.round(estimate?.travelMinutes ?? estimate?.budgetMinutes ?? estimate?.maxMinutes ?? 0));
      return `~${minutes} min travel`;
    }

    function activateSession(index) {
      const session = routePlan?.sessions[index];
      if (!session) return;
      store.patch({
        route: session.route,
        activeRouteSessionIndex: index,
        currentStopIndex: 0,
        completedStopIds: [],
        routeCorrections: null,
        cargoCorrections: {}
      });
      routeSummary.querySelectorAll('[data-session]').forEach((card) => card.classList.toggle('is-selected', Number(card.dataset.session) === index));
      openRoute.dataset.sessionIndex = String(index);
      openRoute.textContent = `${index === 0 ? 'Start' : 'Open'} session ${index + 1}`;
    }

    function gatewayMarkup(session) {
      const unique = [...new Map((session.gatewaySegments ?? []).map((segment) => [segment.label, segment])).values()];
      if (!unique.length) return '';
      return `<div class="session-gateways">${unique.map((segment) => `<span>${icon('gateway')}<b>${escapeHtml(segment.fromGateway)}</b><i>→</i><b>${escapeHtml(segment.toGateway)}</b></span>`).join('')}</div>`;
    }

    function renderRoute() {
      routeSummary.replaceChildren();
      if (!routePlan) {
        routeTitle.textContent = 'No route generated';
        return;
      }
      routeTitle.textContent = routePlan.mode === 'sessions'
        ? `${routePlan.sessions.length} play session${routePlan.sessions.length === 1 ? '' : 's'} ready`
        : 'Fastest full route ready';

      const overview = document.createElement('div');
      overview.className = 'mission-route-overview';
      overview.innerHTML = `
        <strong>${routePlan.totalMissionCount} missions</strong>
        <span>${routePlan.totalCargoScu} SCU total</span>
        <span>${routePlan.rewardAuec ? `${routePlan.rewardAuec.toLocaleString('en-US')} aUEC` : 'Reward not provided'}</span>
        <span>Start: ${escapeHtml(routePlan.startLocationLabel)}</span>
        <span>Timing: travel only</span>`;

      const sessions = document.createElement('div');
      sessions.className = 'mission-session-grid';
      routePlan.sessions.forEach((session) => {
        const card = document.createElement('article');
        card.className = `mission-session-card${session.index === 0 ? ' is-selected' : ''}${session.overTarget ? ' is-over-target' : ''}`;
        card.dataset.session = String(session.index);
        card.innerHTML = `
          <header><span>${icon('clock')}<b>${escapeHtml(session.title)}</b></span><strong>${formatTravel(session.estimate)}</strong></header>
          <div class="session-route-line"><span>${escapeHtml(session.startLocationLabel)}</span><i>→</i><span>${escapeHtml(session.endLocationLabel)}</span></div>
          <div class="session-stats"><span>${session.missionCount} mission${session.missionCount === 1 ? '' : 's'}</span><span>${session.totalCargoScu} SCU</span><span>Peak ${session.estimate.peakOnboardScu} SCU</span></div>
          ${gatewayMarkup(session)}
          <ul>${session.missionTitles.map((title) => `<li>${icon('check')}<span>${escapeHtml(title)}</span></li>`).join('')}</ul>
          ${session.overTarget ? `<p class="session-warning">This single complete mission needs about ${session.estimate.travelMinutes} minutes of travel, above your ${session.targetMinutes}-minute limit. It was not split.</p>` : ''}
          <button type="button" class="button button--secondary" data-activate-session="${session.index}">Select session</button>`;
        sessions.append(card);
      });
      routeSummary.append(overview, sessions);
      const selected = Number(store.getState().activeRouteSessionIndex ?? 0);
      activateSession(selected < routePlan.sessions.length ? selected : 0);
    }

    function generatePlan() {
      validateChanges();
      const start = resolveStartLocation();
      if (!report?.ready || !start) return;
      try {
        const ship = ensureSelectedShip();
        const exactTarget = Math.max(5, Math.min(600, Math.round(Number(sessionTarget.value) || 60)));
        sessionTarget.value = String(exactTarget);
        routePlan = sessionPlanner.plan(report.missions, missionModel, {
          startLocationId: start.id,
          targetMinutes: exactTarget,
          mode: routeMode.value,
          selectedShipId: ship.id
        });
        const firstSession = routePlan.sessions[0];
        store.patch({
          missionSourceText: sourceText,
          missionText: text.value,
          missionValidation: validator.snapshot(report, sourceText, text.value),
          missions: report.missions,
          routeStartLocationId: start.id,
          routeStartLocationLabel: operationalLabel(start),
          routeMode: routeMode.value,
          sessionTargetMinutes: exactTarget,
          routePlan,
          activeRouteSessionIndex: 0,
          route: firstSession.route,
          currentStopIndex: 0,
          completedStopIds: [],
          routeCorrections: null,
          cargoCorrections: {}
        });
        steps.querySelector('[data-stage="route"]').disabled = false;
        setStage('route');
      } catch (error) {
        reviewAlerts.innerHTML = `<p class="is-error">${escapeHtml(error.message)}</p>`;
      }
    }

    populateLocations();
    populateShips();
    routeMode.value = state.routeMode === 'fastest' ? 'fastest' : 'sessions';
    sessionTarget.value = String(state.sessionTargetMinutes ?? 60);
    if (state.routeStartLocationId) {
      const saved = locationModel.getLocation(state.routeStartLocationId);
      if (saved) {
        startInput.value = operationalLabel(saved);
        resolveStartLocation(false);
      }
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      analyze(text.value);
    }, true);

    reset?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      text.value = '';
      sourceText = '';
      report = null;
      reviewDrafts = [];
      routePlan = null;
      setInputMode('text');
      setStage('input');
    }, true);

    inputTools.addEventListener('click', (event) => {
      const button = event.target.closest('[data-input]');
      if (button) setInputMode(button.dataset.input);
    });

    steps.addEventListener('click', (event) => {
      const button = event.target.closest('[data-stage]');
      if (button && !button.disabled) setStage(button.dataset.stage);
    });

    startInput.addEventListener('change', () => { resolveStartLocation(); updateGenerateState(); });
    startInput.addEventListener('input', () => {
      startIdInput.value = '';
      startStatus.textContent = 'Choose a database location.';
      startStatus.dataset.state = 'neutral';
      updateGenerateState();
    });

    routeMode.addEventListener('change', () => {
      sessionTargetLabel.hidden = routeMode.value === 'fastest';
      updateGenerateState();
    });
    sessionTarget.addEventListener('input', updateGenerateState);
    shipSelect.addEventListener('change', ensureSelectedShip);

    addMission.addEventListener('click', () => {
      applyReviewGrid();
      reviewDrafts.push({
        title: `Mission ${reviewDrafts.length + 1}`,
        contractor: '',
        rewardAuec: '',
        objectives: [
          { action: 'collect', location: '', cargo: '' },
          { action: 'deliver', location: '', cargo: '' }
        ]
      });
      renderReviewGrid();
      reviewGrid.querySelector('[data-review-mission]:last-child [data-edit-mission]')?.click();
    });

    reviewGrid.addEventListener('click', (event) => {
      const editButton = event.target.closest('[data-edit-mission]');
      if (editButton) {
        const card = editButton.closest('[data-review-mission]');
        const editing = !card.classList.contains('is-editing');
        card.classList.toggle('is-editing', editing);
        card.querySelector('.mission-card-editor').hidden = !editing;
        editButton.setAttribute('aria-pressed', String(editing));
        return;
      }

      const removeButton = event.target.closest('[data-remove-mission]');
      if (!removeButton) return;
      applyReviewGrid();
      reviewDrafts.splice(Number(removeButton.dataset.removeMission), 1);
      report = validator.inspectMissionText(serializeDrafts(), locationModel);
      renderReviewGrid();
    });

    validate.addEventListener('click', validateChanges);
    generate.addEventListener('click', generatePlan);
    routeSummary.addEventListener('click', (event) => {
      const button = event.target.closest('[data-activate-session]');
      if (button) activateSession(Number(button.dataset.activateSession));
    });
    output.querySelector('[data-route-edit]').addEventListener('click', () => setStage('review'));
    openRoute.addEventListener('click', () => {
      activateSession(Number(openRoute.dataset.sessionIndex ?? 0));
      document.querySelector('[data-view-target="route"]')?.click();
    });
    form.addEventListener('click', (event) => {
      if (event.target.closest('#ocr-use-draft')) setTimeout(() => analyze(text.value), 20);
      if (event.target.closest('#game-log-use-draft')) setTimeout(() => analyze(text.value), 20);
    });

    sessionTargetLabel.hidden = routeMode.value === 'fastest';
    setInputMode('text');
    setStage('input');
    return true;
  }

  const observer = new MutationObserver(() => {
    if (initialize()) observer.disconnect();
  });
  if (!initialize()) observer.observe(document.documentElement, { childList: true, subtree: true });
}());
