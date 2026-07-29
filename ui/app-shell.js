'use strict';

(function initializeProductShell(root) {
  const store = root.SCCompanionSession;
  const locations = root.SCCompanionLocations;
  const validator = root.SCCompanionMissionValidation;
  const missionModel = root.SCCompanionMissions;
  const sessionPlanner = root.SCCompanionRouteSessionPlanner;
  const ships = root.SCCompanionShipCatalog;
  const operational = root.SCCompanionOperationalSteps;
  const cargoStateModel = root.SCCompanionCargoState;
  const cargoLayout = root.SCCompanionAutoCargoLayout;
  const locationContext = root.SCCompanionLocationContext;
  const routeOptimization = root.SCCompanionRouteOptimization;
  const routePlanner = root.SCCompanionRoutePlanner;
  const app = document.querySelector('#app');
  if (!store || !locations || !validator || !missionModel || !sessionPlanner || !ships || !operational || !app) {
    const missing = [
      ['session', store], ['locations', locations], ['validation', validator], ['missions', missionModel],
      ['session planner', sessionPlanner], ['ship catalog', ships], ['operational steps', operational], ['app root', app]
    ].filter(([, value]) => !value).map(([name]) => name);
    throw new Error(`Required application models are unavailable: ${missing.join(', ')}.`);
  }

  const NAV = Object.freeze([
    { id: 'contracts', label: 'Contracts', index: '01' },
    { id: 'plan', label: 'Plan', index: '02' },
    { id: 'live', label: 'Live Ops', index: '03' },
    { id: 'fleet', label: 'Fleet', index: '04' },
    { id: 'intel', label: 'Intel', index: '05' }
  ]);
  const GROUP_COLORS = ['#d6a64b', '#68aeb7', '#7dae79', '#b88978', '#a391c4', '#c6ba91'];
  const ui = {
    page: location.hash.slice(1) && NAV.some((item) => item.id === location.hash.slice(1)) ? location.hash.slice(1) : 'live',
    contractStage: 'acquire',
    contractSource: 'text',
    report: null,
    reviewDrafts: [],
    selectedMission: 0,
    selectedSession: Number(store.getState().activeRouteSessionIndex ?? 0),
    selectedCandidateId: store.getState().selectedRouteCandidateId ?? 'recommended',
    showMoreStrategies: false,
    intelTab: 'locations',
    intelQuery: 'Lorville',
    intelLocationId: 'stanton-hurston-lorville-teasa',
    drawer: null,
    editorMode: 'move',
    editorGroup: null,
    editorSource: null,
    expandedStepActionsId: null,
    toastTimer: null
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[character]));
  }

  function safeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function formatScu(value) { return `${Math.max(0, safeNumber(value)).toLocaleString('en-US')} SCU`; }
  function formatMinutes(value) { return `~${Math.max(0, Math.round(safeNumber(value)))} min`; }
  function operationVerb(type) { return type === 'delivery' ? 'Unload' : 'Load'; }
  function kindLabel(kind) {
    return ({ action: 'Cargo operation', travel: 'Travel', 'gateway-approach': 'Gateway approach', jump: 'Jump transit' })[kind] ?? String(kind ?? 'Operation');
  }

  function selectedShip(state = store.getState()) {
    return (state.hangarShips ?? []).find((ship) => ship.id === state.selectedShipId)
      ?? (state.hangarShips ?? [])[0]
      ?? ships.createHangarShip({ id: 'corsair-main', modelId: 'drake-corsair' });
  }

  function selectedModel(state = store.getState()) {
    const ship = selectedShip(state);
    return ships.getModel(ship.modelId) ?? ships.models[0];
  }

  function routePlan(state = store.getState()) {
    return state.routePlan?.sessions?.length ? state.routePlan : null;
  }

  function activeSession(state = store.getState()) {
    const plan = routePlan(state);
    if (!plan) return null;
    return plan.sessions[Number(state.activeRouteSessionIndex ?? 0)] ?? plan.sessions[0] ?? null;
  }

  function progress(state = store.getState()) {
    return state.route ? operational.derive(state.route, state) : null;
  }

  function cargoSnapshot(state = store.getState()) {
    if (!state.route || !cargoStateModel?.deriveCargoState) return null;
    try { return cargoStateModel.deriveCargoState(state.route, state.completedStopIds, state.currentStopIndex, state.cargoCorrections); }
    catch { return null; }
  }

  function planCargoGrid(state = store.getState()) {
    if (!state.route || !cargoLayout?.plan) return null;
    try {
      const current = progress(state)?.currentStep;
      const pickupPreview = current?.kind === 'action'
        && current.operations?.some((operation) => operation.type !== 'delivery');
      const snapshotStopIndex = pickupPreview
        ? safeNumber(state.currentStopIndex, 0)
        : safeNumber(state.currentStopIndex, 0) - 1;
      return cargoLayout.plan(state.route, selectedModel(state), {
        snapshotStopIndex,
        mode: state.cargoLayoutGroupingMode === 'mission' ? 'mission' : 'destination',
        corrections: state.cargoCorrections ?? {}
      });
    } catch (error) {
      return { error: error.message, floorCells: [], groups: [], usedScu: 0, freeScu: selectedShip(state).cargoCapacityScu };
    }
  }

  function navigate(page) {
    if (!NAV.some((item) => item.id === page)) return;
    ui.page = page;
    history.replaceState(null, '', `#${page}`);
    render();
    root.scrollTo({ top: 0, behavior: 'instant' });
  }

  function toast(message, tone = 'success') {
    document.querySelector('.toast')?.remove();
    const node = document.createElement('div');
    node.className = `toast${tone === 'error' ? ' is-error' : ''}`;
    node.textContent = message;
    document.body.append(node);
    clearTimeout(ui.toastTimer);
    ui.toastTimer = setTimeout(() => node.remove(), 3200);
  }

  function shellMarkup(content) {
    const state = store.getState();
    const current = progress(state);
    const liveViewport = ui.page === 'live' && Boolean(state.route) && !current?.complete;
    const currentNav = NAV.find((item) => item.id === ui.page);
    const missionCount = state.missions?.length ?? 0;
    const counts = {
      contracts: missionCount || '',
      plan: routePlan(state)?.sessions?.length || '',
      live: current?.totalSteps || '',
      fleet: state.hangarShips?.length || '',
      intel: ''
    };
    return `
      <div class="app-shell${liveViewport ? ' is-live-active' : ''}">
        <aside class="side-rail">
          <div class="brand">
            <img src="companion-mark.svg" alt="">
            <div><small>Cargo operations system</small><strong>SC Companion</strong></div>
          </div>
          <nav class="primary-nav" aria-label="Primary">
            ${NAV.map((item) => `
              <button class="nav-button" type="button" data-nav="${item.id}" ${ui.page === item.id ? 'aria-current="page"' : ''}>
                <span class="nav-index">${item.index}</span><span class="nav-label">${item.label}</span><span class="nav-count">${counts[item.id]}</span>
              </button>`).join('')}
          </nav>
          <div class="rail-footer">LOCAL SESSION STORAGE<br>BUILD UI/UX REBUILD<br>UNOFFICIAL FAN TOOL</div>
        </aside>
        <div class="app-stage">
          <header class="topbar">
            <div class="topbar-title">
              <span class="eyebrow">${currentNav?.index ?? '00'}</span>
              <strong>${currentNav?.label ?? 'SC Companion'}</strong>
              <span class="workflow-trail">Contracts → Plan → Live Ops → Fleet → Intel</span>
            </div>
            <div class="session-status">
              <i class="status-dot${state.route ? ' is-active' : ''}"></i>
              <span>${state.route ? `${activeSession(state)?.title ?? 'Active route'} · ${selectedModel(state).model}` : 'No active session'}</span>
            </div>
          </header>
          ${content}
        </div>
      </div>`;
  }

  function workspaceHeader(eyebrow, title, description, actions = '') {
    return `<header class="workspace-header">
      <div><span class="eyebrow">${escapeHtml(eyebrow)}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>
      ${actions ? `<div class="header-actions">${actions}</div>` : ''}
    </header>`;
  }

  function contractStepper() {
    const stages = [
      ['acquire', '01 / Acquire', 'Add source'],
      ['resolve', '02 / Resolve', 'Review missions'],
      ['configure', '03 / Configure', 'Set route']
    ];
    return `<nav class="workflow-stepper" aria-label="Contract workflow">
      ${stages.map(([id, label, helper]) => `<button type="button" class="workflow-step" data-contract-stage="${id}" ${ui.contractStage === id ? 'aria-current="step"' : ''} ${id !== 'acquire' && !ui.report ? 'disabled' : ''}><b>${label}</b><span>${helper}</span></button>`).join('')}
    </nav>`;
  }

  function acquireMarkup() {
    const state = store.getState();
    const sourceTabs = [
      ['text', 'Manual text'],
      ['ocr', 'Screenshot / OCR'],
      ['log', 'Game.log · Experimental']
    ];
    let source;
    if (ui.contractSource === 'ocr') {
      source = `<div class="drop-zone">
        <img class="file-preview hidden" id="ocr-preview" alt="Contract screenshot preview">
        <div id="ocr-empty"><span class="eyebrow">PNG / JPG / WEBP</span><strong>Add contract screenshots</strong><p class="muted">Select one or more captures, then review the recognized text before importing.</p></div>
        <input class="hidden" id="ocr-file" type="file" accept="image/*" multiple>
        <button class="button" type="button" data-action="choose-ocr">Choose screenshots</button>
      </div>
      <p class="editor-note" id="ocr-status" role="status">No screenshot selected.</p>
      <label style="margin-top:12px">Recognized draft<textarea id="assisted-text" rows="7" placeholder="OCR output appears here for review. You can correct it before continuing."></textarea></label>`;
    } else if (ui.contractSource === 'log') {
      source = `<div class="drop-zone">
        <span class="tag">Experimental local import</span>
        <strong>Read Game.log</strong>
        <p class="muted">The file is processed locally. Only supported hauling contract events become a draft.</p>
        <input class="hidden" id="log-file" type="file" accept=".log,.txt,text/plain">
        <button class="button" type="button" data-action="choose-log">Choose Game.log</button>
      </div>
      <label style="margin-top:12px">Imported draft<textarea id="assisted-text" rows="7" placeholder="Supported Game.log events appear here."></textarea></label>`;
    } else {
      source = `<label>Contract text<textarea class="contract-text" id="contract-text" spellcheck="false">${escapeHtml(state.missionText || store.sampleMissionText)}</textarea></label>`;
    }
    return `
      <div class="source-switcher" role="tablist" aria-label="Contract source">
        ${sourceTabs.map(([id, label]) => `<button class="source-tab" type="button" role="tab" data-contract-source="${id}" aria-selected="${ui.contractSource === id}">${label}</button>`).join('')}
      </div>
      <div class="acquire-layout">
        <section class="panel"><div class="panel-heading"><strong>${sourceTabs.find(([id]) => id === ui.contractSource)?.[1]}</strong><span class="tag">${ui.contractSource === 'log' ? 'Experimental' : 'Local only'}</span></div><div class="panel-body">${source}</div></section>
        <aside class="panel"><div class="panel-heading"><strong>Input guide</strong><span class="eyebrow">Format</span></div><div class="panel-body">
          <div class="acquire-guide"><p><strong>One contract at a time</strong></p><p class="muted">Start with a mission title, then list every pickup and delivery.</p><code>Mission title<br>collect teasa 8scu etam<br>deliver area18 8scu etam</code></div>
          <p class="muted" style="margin-top:16px">Ambiguous locations are not guessed. They are flagged in the next stage and must be corrected before planning.</p>
        </div></aside>
      </div>
      <div class="contract-footer"><div class="inline-message" id="contract-message">Your existing session remains unchanged until a plan is built.</div><button class="button button-primary" type="button" data-action="review-contracts">Review contracts →</button></div>`;
  }

  function draftsFromReport(report) {
    return (report?.missions ?? []).map((mission) => ({
      title: mission.title,
      contractor: mission.contractor ?? '',
      rewardAuec: mission.rewardAuec ?? '',
      objectives: (mission.cargoLots ?? []).flatMap((lot) => [
        { action: 'collect', location: lot.pickupLocationLabel ?? lot.pickupLocationId, cargo: `${lot.scu}scu ${lot.commodity}` },
        { action: 'deliver', location: lot.deliveryLocationLabel ?? lot.deliveryLocationId, cargo: `${lot.scu}scu ${lot.commodity}` }
      ])
    }));
  }

  function serializeDrafts() {
    return validator.serializeReview(ui.reviewDrafts);
  }

  function refreshReportFromDrafts() {
    const source = serializeDrafts();
    ui.report = validator.inspectMissionText(source, locations);
    return ui.report;
  }

  function issueMarkup(report) {
    if (!report?.issues?.length) return '<p class="success">All mission objectives are valid and route-ready.</p>';
    return `<ul class="issue-list">${report.issues.map((issue) => `<li><strong>${escapeHtml(issue.severity.toUpperCase())}</strong> · ${escapeHtml(issue.message)}</li>`).join('')}</ul>`;
  }

  function resolveMarkup() {
    const report = ui.report;
    const readyCount = report?.ready ? report.missions.length : Math.max(0, (report?.summary?.missionCount ?? 0) - (report?.summary?.blockerCount ?? 0));
    const selected = ui.reviewDrafts[ui.selectedMission] ?? ui.reviewDrafts[0];
    return `
      <div class="review-summary">
        <div><strong>${report?.summary?.missionCount ?? 0}</strong><span>Missions found</span></div>
        <div><strong class="success">${readyCount}</strong><span>Ready</span></div>
        <div><strong class="${report?.summary?.blockerCount ? 'danger' : ''}">${report?.summary?.blockerCount ?? 0}</strong><span>Need attention</span></div>
      </div>
      <div class="review-layout">
        <aside class="panel">
          <div class="panel-heading"><strong>Mission index</strong><button class="button icon-button" type="button" data-action="add-mission" aria-label="Add mission">+</button></div>
          <div class="mission-index">${ui.reviewDrafts.map((mission, index) => `
            <button type="button" class="mission-index-button${index === ui.selectedMission ? ' is-selected' : ''}" data-select-mission="${index}">
              <strong>${escapeHtml(mission.title || `Mission ${index + 1}`)}</strong><span>${mission.objectives.length} objectives · ${index === ui.selectedMission ? 'Editing' : 'Review'}</span>
            </button>`).join('') || '<p class="muted" style="padding:12px">No missions found.</p>'}
          </div>
        </aside>
        <section class="panel">
          <div class="panel-heading"><strong>${escapeHtml(selected?.title || 'Mission editor')}</strong><span class="tag ${report?.ready ? 'tag-ready' : 'tag-blocked'}">${report?.ready ? 'Verified' : 'Review required'}</span></div>
          <div class="panel-body">
            ${issueMarkup(report)}
            ${selected ? `<div class="form-row">
              <label>Mission title<input data-mission-field="title" value="${escapeHtml(selected.title)}"></label>
              <label>Contractor<input data-mission-field="contractor" value="${escapeHtml(selected.contractor)}" placeholder="Optional"></label>
            </div>
            <div class="mission-editor-grid" style="margin-top:12px">
              ${selected.objectives.map((objective, index) => `<div class="objective-row" data-objective-index="${index}">
                <label>Action<select data-objective-field="action"><option value="collect" ${objective.action !== 'deliver' ? 'selected' : ''}>Pickup</option><option value="deliver" ${objective.action === 'deliver' ? 'selected' : ''}>Delivery</option></select></label>
                <label>Location<input data-objective-field="location" value="${escapeHtml(objective.location)}"></label>
                <label>Commodity & quantity<input data-objective-field="cargo" value="${escapeHtml(objective.cargo)}"></label>
                <button type="button" class="button icon-button button-danger" data-remove-objective="${index}" aria-label="Remove objective">×</button>
              </div>`).join('')}
            </div>
            <div class="header-actions" style="margin-top:12px"><button class="button" type="button" data-action="add-objective">+ Objective</button><button class="button button-danger" type="button" data-action="remove-mission">Remove mission</button></div>` : ''}
          </div>
        </section>
      </div>
      <div class="contract-footer"><button class="button" type="button" data-contract-stage="acquire">← Input</button><button class="button button-primary" type="button" data-action="configure-route" ${report?.ready ? '' : 'disabled'}>Configure route →</button></div>`;
  }

  function locationOptions(selectedId) {
    const options = locations.locations.filter((item) => item.operational).sort((a, b) => locations.formatOperationalLabel(a).localeCompare(locations.formatOperationalLabel(b)));
    return options.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === selectedId ? 'selected' : ''}>${escapeHtml(locations.formatOperationalLabel(item))}</option>`).join('');
  }

  function shipOptions(selectedId) {
    return (store.getState().hangarShips ?? []).map((ship) => {
      const model = ships.getModel(ship.modelId);
      return `<option value="${escapeHtml(ship.id)}" ${ship.id === selectedId ? 'selected' : ''}>${escapeHtml(ship.nickname || `${model?.manufacturer ?? ''} ${model?.model ?? ship.modelId}`)} · ${formatScu(ship.cargoCapacityScu)}</option>`;
    }).join('');
  }

  function strategyCoverage(missions) {
    const ids = [...new Set((missions ?? []).flatMap((mission) => (mission.cargoLots ?? [])
      .flatMap((lot) => [lot.pickupLocationId, lot.deliveryLocationId]).filter(Boolean)))];
    const covered = ids.filter((id) => {
      const profile = root.SCCompanionLocationProfiles?.getProfile?.(id);
      return profile?.traffic?.level && profile.traffic.level !== 'unknown';
    }).length;
    return { covered, total: ids.length, ratio: ids.length ? covered / ids.length : 0 };
  }

  function strategyCards(selectedId, coverage) {
    const definitions = routeOptimization?.STRATEGIES ?? [];
    const primaryIds = new Set(['balanced', 'fastest', 'complete-missions', 'fewest-jumps']);
    const visible = definitions.filter((strategy) => primaryIds.has(strategy.id) || ui.showMoreStrategies);
    return visible.map((strategy) => {
      const disabled = strategy.id === 'low-traffic' && coverage.ratio < 0.6;
      const reason = disabled ? `Insufficient traffic coverage (${coverage.covered}/${coverage.total}).` : '';
      return `<button class="strategy-option" type="button" data-route-strategy="${escapeHtml(strategy.id)}" aria-pressed="${strategy.id === selectedId}" ${disabled ? 'disabled' : ''} title="${escapeHtml(reason)}">
        <span class="strategy-icon" aria-hidden="true">${escapeHtml(strategy.icon)}</span>
        <span><strong>${escapeHtml(strategy.label)}</strong><small>${escapeHtml(strategy.description)}</small><em>${escapeHtml(strategy.priorities.join(' · '))}</em></span>
        ${strategy.experimental ? '<i class="tag">Experimental</i>' : ''}
      </button>`;
    }).join('');
  }

  function customWeightsMarkup(weights) {
    const labels = {
      travelTime: ['Travel time', 'Prefer shorter estimated travel.'],
      missionCompletion: ['Mission completion', 'Close whole missions earlier.'],
      gatewayJumps: ['Gateway jumps', 'Avoid inter-system crossings.'],
      stopCount: ['Stop count', 'Group compatible operations.'],
      riskExposure: ['Risk exposure', 'Reduce reviewed security risk.'],
      trafficExposure: ['Traffic exposure', 'Avoid known busy locations.'],
      cargoTurnover: ['Cargo turnover', 'Reduce SCU carried over time.']
    };
    return `<div class="custom-strategy">
      <div class="custom-strategy-head"><div><p class="eyebrow">Custom priorities</p><p>Weights are normalized internally and saved automatically.</p></div><button class="button" type="button" data-action="reset-strategy-weights">Reset to Balanced</button></div>
      <div class="weight-grid">${Object.entries(labels).map(([key, [label, detail]]) => `<label class="weight-control"><span><strong>${label}</strong><small>${detail}</small></span><output>${safeNumber(weights[key])}</output><input type="range" min="0" max="100" step="5" value="${safeNumber(weights[key])}" data-strategy-weight="${key}"></label>`).join('')}</div>
    </div>`;
  }

  function configureMarkup() {
    const state = store.getState();
    const playMode = state.routePlayMode === 'full' ? 'full' : 'sessions';
    const strategy = state.routeStrategy ?? 'balanced';
    const coverage = strategyCoverage(ui.report?.missions ?? state.missions);
    return `<div class="configure-layout">
      <section class="panel">
        <div class="panel-heading"><strong>Route constraints</strong><span class="tag tag-ready">${ui.report?.missions.length ?? 0} missions verified</span></div>
        <div class="panel-body configure-grid">
          <div>
            <div class="form-row">
              <label>Current location<select id="route-start">${locationOptions(state.routeStartLocationId || 'stanton-hurston-lorville-teasa')}</select></label>
              <label>Active ship<select id="route-ship">${shipOptions(state.selectedShipId)}</select></label>
            </div>
            <p class="eyebrow" style="margin:20px 0 8px">Play mode</p>
            <div class="mode-picker">
              <button class="mode-option" type="button" data-play-mode="full" aria-pressed="${playMode === 'full'}"><strong>Full operation</strong><span>Keep every selected mission in one run.</span></button>
              <button class="mode-option" type="button" data-play-mode="sessions" aria-pressed="${playMode === 'sessions'}"><strong>Time-boxed sessions</strong><span>Group complete missions into playable blocks.</span></button>
            </div>
            <label id="duration-field" style="margin-top:14px" ${playMode === 'full' ? 'hidden' : ''}>Maximum travel minutes per session
              <input id="route-duration" type="number" min="5" max="600" step="5" value="${safeNumber(state.sessionTargetMinutes, 60)}">
            </label>
            <div class="route-preference">
              <div class="preference-heading"><div><p class="eyebrow">Route preference</p><p>Choose what the optimizer should prioritize independently from play mode.</p></div><button class="button" type="button" data-action="toggle-more-strategies">${ui.showMoreStrategies ? 'Fewer strategies' : 'More strategies'}</button></div>
              <div class="strategy-grid">${strategyCards(strategy, coverage)}</div>
              ${strategy === 'custom' ? customWeightsMarkup(state.routeStrategyWeights) : ''}
              <p class="coverage-note">${coverage.covered === coverage.total && coverage.total ? `Traffic data available for all ${coverage.total} route locations.` : `Traffic data available for ${coverage.covered} of ${coverage.total} route locations.`}${coverage.ratio < 0.6 ? ' Low-traffic optimization unavailable: insufficient traffic coverage.' : ''}</p>
            </div>
          </div>
          <aside>
            <p class="eyebrow">Verified manifest</p>
            <ul class="verified-list">${(ui.report?.missions ?? []).map((mission) => `<li><span>${escapeHtml(mission.title)}</span><strong>${formatScu(mission.cargoLots.reduce((sum, lot) => sum + lot.scu, 0))}</strong></li>`).join('')}</ul>
            <div class="plan-readiness"><p class="eyebrow">Plan input</p><dl><div><dt>Play mode</dt><dd>${playMode === 'full' ? 'Full operation' : 'Time-boxed sessions'}</dd></div><div><dt>Strategy</dt><dd>${escapeHtml(routeOptimization?.STRATEGIES?.find((item) => item.id === strategy)?.label ?? strategy)}</dd></div><div><dt>Ship</dt><dd>${escapeHtml(selectedModel(state).model)}</dd></div><div><dt>Capacity</dt><dd>${formatScu(selectedShip(state).cargoCapacityScu)}</dd></div></dl></div>
          </aside>
        </div>
      </section>
      <div class="contract-footer"><button class="button" type="button" data-contract-stage="resolve">← Review</button><button class="button button-primary" type="button" data-action="build-plan">Build plan →</button></div>
    </div>`;
  }

  function contractsPage() {
    const stageContent = ui.contractStage === 'resolve' ? resolveMarkup() : ui.contractStage === 'configure' ? configureMarkup() : acquireMarkup();
    return `<main class="workspace">
      ${workspaceHeader('Contract acquisition', 'Contracts', 'Bring work into the tool, resolve uncertainty, then hand verified missions to planning.')}
      ${contractStepper()}
      ${stageContent}
    </main>`;
  }

  function planPage() {
    const state = store.getState();
    const plan = routePlan(state);
    if (!plan) return `<main class="workspace">${workspaceHeader('Session planning', 'Plan', 'Compare complete, capacity-safe hauling sessions before committing to play.')}
      <section class="empty-state"><div class="empty-symbol">Ⅱ</div><h2>No plan built</h2><p>Review your contracts and configure a route to generate comparable sessions.</p><button class="button button-primary" type="button" data-nav="contracts">Open Contracts</button></section></main>`;
    ui.selectedSession = Math.min(ui.selectedSession, plan.sessions.length - 1);
    const selected = plan.sessions[ui.selectedSession] ?? plan.sessions[0];
    const routeCandidates = selected.routeCandidates?.length ? selected.routeCandidates : [{
      id: 'recommended',
      label: 'Recommended',
      rationale: selected.route.optimization?.rationale ?? '',
      metrics: selected.route.optimization?.metrics ?? null,
      route: selected.route
    }];
    const selectedCandidate = routeCandidates.find((candidate) => candidate.id === ui.selectedCandidateId) ?? routeCandidates[0];
    const selectedRoute = selectedCandidate.route;
    const score = selectedCandidate.metrics ?? selectedRoute.optimization?.metrics ?? {};
    const capacity = selectedShip(state).cargoCapacityScu;
    return `<main class="workspace">
      ${workspaceHeader('Session planning', 'Choose a run', `${plan.totalMissionCount} missions · ${formatScu(plan.totalCargoScu)} · travel estimates exclude loading time.`,
        '<button class="button" type="button" data-nav="contracts">Edit constraints</button>')}
      <div class="session-table-wrap"><table class="session-table">
        <thead><tr><th>Session</th><th>Travel</th><th>Route</th><th>Missions</th><th>Operations</th><th>Peak cargo</th><th></th></tr></thead>
        <tbody>${plan.sessions.map((session, index) => {
          const pickupCount = session.route.stops.flatMap((stop) => stop.operations).filter((op) => op.type !== 'delivery').length;
          const deliveryCount = session.route.stops.flatMap((stop) => stop.operations).filter((op) => op.type === 'delivery').length;
          const peak = session.estimate.peakOnboardScu;
          return `<tr data-session-row="${index}" class="${index === ui.selectedSession ? 'is-selected' : ''}">
            <td><strong>${escapeHtml(session.title)}</strong><br><span class="eyebrow">${state.route && index === Number(state.activeRouteSessionIndex ?? -1) ? 'Active' : index === ui.selectedSession ? 'Selected' : 'Available'}</span></td>
            <td><strong>${formatMinutes(session.estimate.travelMinutes)}</strong><br><span class="muted">${session.estimate.jumpCount} gateways</span></td>
            <td>${escapeHtml(session.startLocationLabel)}<br><span class="nav-info">→ ${escapeHtml(session.endLocationLabel)}</span></td>
            <td>${session.missionCount}</td><td>${pickupCount} pickup / ${deliveryCount} delivery</td>
            <td><strong>${formatScu(peak)} / ${capacity}</strong><div class="capacity-bar"><i style="width:${Math.min(100, peak / capacity * 100)}%"></i></div></td>
            <td><button class="button" type="button" data-select-session="${index}">Inspect</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
      <section class="candidate-comparison">
        <div class="candidate-heading"><div><p class="eyebrow">Route variants</p><h2>Compare valid candidates</h2></div><span class="tag">${escapeHtml(routeOptimization?.STRATEGIES?.find((item) => item.id === plan.routeStrategy)?.label ?? plan.routeStrategy ?? 'Balanced')}</span></div>
        ${routeCandidates.length === 1 ? '<p class="inline-message">Only one valid route satisfies cargo capacity and pickup/delivery constraints.</p>' : `<div class="candidate-grid">${routeCandidates.map((candidate) => {
          const metrics = candidate.metrics ?? {};
          return `<button class="candidate-card" type="button" data-select-candidate="${escapeHtml(candidate.id)}" aria-pressed="${candidate.id === selectedCandidate.id}">
            <span class="eyebrow">${escapeHtml(candidate.label)}</span><strong>${formatMinutes(metrics.totalTravelMinutes ?? candidate.route.estimate?.midpoint)}</strong>
            <span>${safeNumber(metrics.gatewayJumpCount)} jumps · ${safeNumber(metrics.stopCount, candidate.route.stops.length)} stops</span>
            <small>${escapeHtml(candidate.rationale)}</small>
          </button>`;
        }).join('')}</div>`}
      </section>
      <section class="route-scorecard">
        <div class="panel-heading"><strong>Route scorecard</strong><span class="tag">${escapeHtml(selectedCandidate.label)}</span></div>
        <div class="scorecard-grid">
          <div><span>Travel</span><strong>${formatMinutes(score.totalTravelMinutes ?? selectedRoute.estimate?.midpoint)}</strong></div>
          <div><span>Gateway jumps</span><strong>${safeNumber(score.gatewayJumpCount)}</strong></div>
          <div><span>Stops</span><strong>${safeNumber(score.stopCount, selectedRoute.stops.length)}</strong></div>
          <div><span>First complete</span><strong>${score.firstMissionCompletedAtStep ? `Step ${score.firstMissionCompletedAtStep}` : '—'}</strong></div>
          <div><span>Peak onboard</span><strong>${formatScu(score.peakOnboardScu)}</strong></div>
          <div><span>Average onboard</span><strong>${formatScu(score.averageOnboardScu)}</strong></div>
          <div><span>Risk score</span><strong>${safeNumber(score.riskExposureScore)}</strong></div>
          <div><span>Traffic coverage</span><strong>${safeNumber(score.coveredTrafficLocations)} / ${safeNumber(score.routeLocationCount)}</strong></div>
        </div>
      </section>
      <div class="plan-detail">
        <section class="panel"><div class="panel-heading"><strong>Ordered route · ${escapeHtml(selected.title)}</strong><span class="tag">${selectedRoute.stops.length} stops</span></div><div class="panel-body"><ol class="route-order">
          ${selectedRoute.stops.map((stop, index) => `<li><b>${String(index + 1).padStart(2, '0')}</b><span><strong>${escapeHtml(stop.locationLabel)}</strong><br><small class="muted">${stop.operations.map((op) => `${operationVerb(op.type)} ${op.scu} SCU ${op.commodity}`).join(' · ')}</small></span><span class="tag ${stop.operations.some((op) => op.type === 'delivery') ? 'tag-ready' : 'tag-active'}">${stop.operations.some((op) => op.type === 'delivery') ? 'Delivery' : 'Pickup'}</span></li>`).join('')}
        </ol></div></section>
        <aside class="panel"><div class="panel-heading"><strong>Included contracts</strong><span class="tag">${selected.missionCount}</span></div><div class="panel-body"><ul class="verified-list">${selected.missionTitles.map((title) => `<li><span>${escapeHtml(title)}</span><span class="success">Ready</span></li>`).join('')}</ul><button class="button button-primary" style="width:100%;margin-top:16px" type="button" data-start-session="${ui.selectedSession}" data-candidate-id="${escapeHtml(selectedCandidate.id)}">Start ${escapeHtml(selected.title)} · ${escapeHtml(selectedCandidate.label)} →</button></div></aside>
      </div>
    </main>`;
  }

  function stepDestination(step) {
    return step?.location?.label ?? step?.to?.label ?? step?.shortTitle ?? step?.title ?? 'Route operation';
  }

  function stepNavTarget(step) {
    const reference = step?.location ?? step?.to;
    return reference?.navigationTarget ?? reference?.shortLabel ?? stepDestination(step);
  }

  function commandButtonLabel(step) {
    if (!step) return 'Session complete';
    if (step.kind === 'action') {
      const hasDelivery = step.operations?.some((op) => op.type === 'delivery');
      const hasPickup = step.operations?.some((op) => op.type !== 'delivery');
      if (hasDelivery && !hasPickup) return 'Complete delivery';
      if (hasPickup && !hasDelivery) return 'Complete pickup';
      return 'Complete cargo operation';
    }
    if (step.kind === 'jump') return 'Continue jump';
    if (step.kind === 'gateway-approach') return 'Mark gateway reached';
    return 'Mark arrived';
  }

  function stepMoves(step) {
    return step?.kind === 'action' ? (step.operations ?? []) : [];
  }

  function getCargoCellOccupancy(cell, capacity = 3) {
    return Math.min(
      Math.max(0, Math.round(safeNumber(cell?.usedLayers))),
      Math.max(1, safeNumber(cell?.capacityLayers, capacity))
    );
  }

  function renderScuUnits(usedScu, capacity = 3) {
    const used = Math.min(Math.max(0, usedScu), capacity);
    return `<span class="scu-units" aria-hidden="true">${Array.from({ length: capacity }, (_, index) => (
      `<i class="scu-unit${index < used ? ' is-used' : ''}"></i>`
    )).join('')}</span>`;
  }

  const STATUS_ICONS = Object.freeze({
    danger: '<path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 8v5m0 3.5v.5"/>',
    hangar: '<path d="M3 20V8l9-5 9 5v12"/><path d="M7 20v-8h10v8M9 15h6"/>',
    fuel: '<path d="M5 21V4h10v17M5 9h10M8 6h4"/><path d="M15 7h2l2 3v7a2 2 0 0 0 2 2V9"/>',
    repair: '<path d="m14.5 6.5 3-3a5 5 0 0 1-6 6L5 16l3 3 6.5-6.5a5 5 0 0 1 6-6l-3 3-3-3Z"/>',
    food: '<path d="M7 3v7m-3-7v5a3 3 0 0 0 6 0V3M7 11v10M16 3v18M16 3c3 2 4 5 4 8h-4"/>',
    medical: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/>',
    cargo: '<path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/>',
    security: '<path d="M12 3 4.5 6v5c0 5 3 8 7.5 10 4.5-2 7.5-5 7.5-10V6L12 3Z"/><path d="m9 12 2 2 4-5"/>',
    unknown: '<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.8 2c-1 .7-1.6 1.1-1.6 2.5M12 17h.01"/>'
  });

  function statusIcon(name) {
    return `<svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${STATUS_ICONS[name] ?? STATUS_ICONS.unknown}</svg>`;
  }

  function normalizeServiceStatus(status) {
    if (status === 'available') return 'available';
    if (['limited', 'local-transfer', 'unregulated'].includes(status)) return 'limited';
    if (status === 'not-available') return 'unavailable';
    return 'unknown';
  }

  function getRelevantLocationForStep(step, route, state) {
    const reference = step?.kind === 'action' ? step.location : step?.to;
    const fallbackId = route?.stops?.at(-1)?.locationId ?? state?.routeStartLocationId ?? null;
    const id = reference?.id ?? (!step ? fallbackId : null);
    if (!id) return null;
    return locations.getLocation(id) ?? {
      id,
      name: reference?.shortLabel ?? reference?.label ?? String(id)
    };
  }

  function getLocationServiceStatus(locationId, onboardScu = 0) {
    if (!locationId || !locationContext) return null;
    const context = locationContext.buildContext(locationId, { onboardScu });
    const services = new Map((context.services ?? []).map((service) => [service.id, service]));
    const service = (sourceId, label, icon, id = sourceId) => {
      const record = services.get(sourceId);
      return {
        id,
        label,
        icon,
        status: normalizeServiceStatus(record?.status),
        detail: record?.detail ?? `${label} availability unknown`
      };
    };
    const cargoRank = { available: 4, limited: 3, unavailable: 2, unknown: 1 };
    const cargoRecord = [services.get('cargo-center'), services.get('commodity-trade')]
      .filter(Boolean)
      .map((record) => ({ ...record, normalized: normalizeServiceStatus(record.status) }))
      .sort((left, right) => cargoRank[right.normalized] - cargoRank[left.normalized])[0];
    const risk = context.risk ?? {
      level: 'unknown',
      label: 'Risk unknown',
      armistice: 'Unknown',
      jurisdiction: 'Unknown'
    };
    const securityKnown = risk.armistice && String(risk.armistice).toLowerCase() !== 'unknown';
    const securityStatus = !securityKnown
      ? 'unknown'
      : ['low', 'guarded'].includes(risk.level) ? 'available' : 'limited';
    return {
      locationId,
      label: context.label,
      risk: {
        id: 'risk',
        label: `${String(risk.level ?? 'unknown').toUpperCase()} RISK`,
        icon: 'danger',
        status: risk.level ?? 'unknown',
        detail: `${risk.label ?? 'Risk unknown'}. ${risk.jurisdiction ?? 'Jurisdiction unknown'}.`
      },
      services: [
        service('hangars', 'Hangar / pad', 'hangar'),
        service('landing-services', 'Refuel', 'fuel', 'refuel'),
        service('landing-services', 'Repair', 'repair', 'repair'),
        service('food', 'Food', 'food'),
        service('medical', 'Medical', 'medical'),
        {
          id: 'cargo-services',
          label: 'Cargo',
          icon: 'cargo',
          status: cargoRecord?.normalized ?? 'unknown',
          detail: cargoRecord?.detail ?? 'Cargo service availability unknown'
        },
        {
          id: 'security',
          label: 'Security',
          icon: 'security',
          status: securityStatus,
          detail: securityKnown
            ? `${risk.armistice}. ${risk.jurisdiction ?? ''}`.trim()
            : 'Armistice and security status unknown'
        }
      ]
    };
  }

  function renderLocationStatusStrip(status) {
    if (!status) return '';
    const riskTone = ['high', 'extreme'].includes(status.risk.status)
      ? 'danger'
      : ['elevated', 'guarded'].includes(status.risk.status)
        ? 'limited'
        : status.risk.status === 'unknown' ? 'unknown' : 'available';
    const item = (entry, tone = entry.status) => {
      const accessible = `${entry.label}: ${tone}. ${entry.detail}`;
      return `<span class="location-status-item is-${escapeHtml(tone)}" tabindex="0" role="img" data-service="${escapeHtml(entry.id)}" data-status="${escapeHtml(tone)}" data-tooltip="${escapeHtml(accessible)}" aria-label="${escapeHtml(accessible)}">${statusIcon(entry.icon)}<span>${escapeHtml(entry.label)}</span><i class="status-mark" aria-hidden="true"></i></span>`;
    };
    return `<div class="location-status-strip" role="group" data-location-id="${escapeHtml(status.locationId)}" aria-label="Location services for ${escapeHtml(status.label)}">${item(status.risk, riskTone)}${status.services.map((entry) => item(entry)).join('')}</div>`;
  }

  function cargoGridMarkup(layout, currentStep, editor = false) {
    const model = selectedModel();
    const geometry = layout?.geometry ?? model.snapGrid ?? { rows: 6, columns: 4 };
    const cells = layout?.floorCells?.length ? layout.floorCells : Array.from({ length: geometry.rows * geometry.columns }, (_, index) => ({
      id: `${Math.floor(index / geometry.columns)}:${index % geometry.columns}`,
      row: Math.floor(index / geometry.columns),
      column: index % geometry.columns,
      groupKey: null,
      usedLayers: 0
    }));
    const groups = layout?.groups ?? [];
    const groupColor = new Map(groups.map((group, index) => [String(group.key), GROUP_COLORS[index % GROUP_COLORS.length]]));
    const mode = store.getState().cargoLayoutGroupingMode === 'mission' ? 'mission' : 'destination';
    const currentKeys = new Set(stepMoves(currentStep).map((operation) => (
      mode === 'mission'
        ? `mission:${operation.missionId}`
        : `destination:${operation.destinationLocationId ?? operation.locationId}`
    )));
    const sorted = [...cells].sort((a, b) => b.row - a.row || a.column - b.column);
    const moveTypes = new Set(stepMoves(currentStep).map((operation) => (
      operation.type === 'delivery' ? 'delivery' : 'pickup'
    )));
    const currentMove = moveTypes.size === 1 ? [...moveTypes][0] : moveTypes.size ? 'mixed' : '';
    const foldable = !editor && geometry.rows === 6 && geometry.columns === 4;
    return `${foldable ? '<div class="cargo-bank-labels" aria-hidden="true"><span>AFT / F–D</span><span>RAMP / C–A</span></div>' : ''}
    <div class="cargo-grid${editor ? ' cargo-editor-grid' : ''}${foldable ? ' is-foldable' : ''}${currentMove ? ` is-${currentMove}` : ''}" style="--grid-columns:${geometry.columns};--grid-rows:${geometry.rows}">
      ${sorted.map((cell) => {
        const key = String(cell.groupKey ?? '');
        const group = groups.find((item) => String(item.key) === key);
        const current = currentKeys.has(key);
        const reserved = Boolean(cell.reserved);
        const keepEmpty = Boolean(cell.manualEmpty || cell.forcedEmpty || cell.buffer);
        const manual = Boolean(cell.manual);
        const occupancy = getCargoCellOccupancy(cell, geometry.layers ?? 3);
        const coordinate = cell.coordinate ?? cell.label ?? cell.id;
        const row = safeNumber(cell.row);
        const foldedRow = row >= 3 ? geometry.rows - row : 3 - row;
        const foldedColumn = safeNumber(cell.column) + (row >= 3 ? 1 : 6);
        const stateLabel = reserved
          ? 'Reserved'
          : keepEmpty ? 'Keep empty' : key ? `${occupancy} of 3 SCU occupied` : 'Free';
        const detail = group?.label ? `${group.label}, ${stateLabel}` : stateLabel;
        return `<button type="button" class="cargo-cell${key ? ' is-filled' : ''}${current ? ' is-current' : ''}${reserved ? ' is-reserved' : ''}${keepEmpty ? ' is-keep-empty' : ''}${manual ? ' is-manual' : ''}" data-cargo-cell="${escapeHtml(cell.id)}" data-cargo-coordinate="${escapeHtml(coordinate)}" data-cargo-row="${escapeHtml(String(coordinate).charAt(0))}" data-group="${escapeHtml(key)}" data-occupancy="${occupancy}" aria-label="${escapeHtml(`${coordinate}: ${detail}`)}" ${editor && key ? 'draggable="true"' : ''} style="--group-color:${groupColor.get(key) ?? '#8f948e'};--fold-row:${foldedRow};--fold-column:${foldedColumn}" title="${escapeHtml(detail)}"><span class="cargo-coordinate">${escapeHtml(String(coordinate).replace(':', '·'))}</span>${reserved || keepEmpty ? `<span class="cargo-cell-state">${reserved ? 'Reserved' : 'Keep empty'}</span>` : renderScuUnits(occupancy, geometry.layers ?? 3)}${key ? `<span class="cargo-quantity">${occupancy}/3</span>` : ''}${manual ? '<span class="manual-mark" aria-hidden="true">M</span>' : ''}</button>`;
      }).join('')}
    </div>
    <div class="ramp-marker">RAMP / ACCESS · ROW A</div>
    ${groups.length ? `<div class="cargo-legend">${groups.map((group, index) => `<span class="legend-item"><i class="legend-swatch" style="--group-color:${GROUP_COLORS[index % GROUP_COLORS.length]}"></i>${escapeHtml(group.label ?? group.key)} · ${formatScu(group.scu ?? group.totalScu)}</span>`).join('')}</div>` : ''}`;
  }

  function strategyLabel(state) {
    const id = state.route?.optimization?.strategy ?? state.routeStrategy ?? 'balanced';
    if (id === 'phase-safe-fastest') return 'Fastest';
    if (id === 'phase-safe-dependency-fallback') return 'Balanced';
    return routeOptimization?.STRATEGIES?.find((strategy) => strategy.id === id)?.label ?? id;
  }

  function routeMetricLine(state) {
    const metrics = state.route?.optimization?.metrics ?? {};
    const legacyTravel = (state.route?.estimate?.legs ?? []).reduce((sum, leg) => (
      sum + (safeNumber(leg.travel?.minMinutes) + safeNumber(leg.travel?.maxMinutes, leg.travel?.minMinutes)) / 2
    ), 0);
    const primary = state.route?.optimization?.strategy === 'complete-missions' && metrics.firstMissionCompletedAtStep
      ? `FIRST COMPLETE AT STEP ${metrics.firstMissionCompletedAtStep}`
      : `${safeNumber(metrics.gatewayJumpCount, state.route?.estimate?.totalJumpCount)} JUMPS · ${Math.round(safeNumber(metrics.totalTravelMinutes, legacyTravel || state.route?.estimate?.midpoint))} MIN`;
    return `${strategyLabel(state).toUpperCase()} · ${primary}`;
  }

  function contextDatum(label, value, detail = '') {
    return `<div class="context-datum"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? 'Unknown')}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ''}</div>`;
  }

  function renderStepDetail(type, title, state, content, footer = '') {
    return `<div class="step-detail" data-step-detail="${escapeHtml(type)}">
      <div class="context-heading"><span class="eyebrow">${escapeHtml(title)}</span><strong>${routeMetricLine(state)}</strong></div>
      ${content}
      ${footer}
    </div>`;
  }

  function renderDetailPath(items) {
    return `<div class="step-detail-path">${items.map((item) => contextDatum(item.label, item.value, item.detail)).join('')}</div>`;
  }

  function renderDetailMetrics(items) {
    return `<div class="step-metrics" role="list">${items.map((item) => `<div role="listitem"><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)}</span>${item.detail ? `<small>${escapeHtml(item.detail)}</small>` : ''}</div>`).join('')}</div>`;
  }

  function getVisibleStepActions(actions, limit = 3, expanded = false) {
    return expanded ? [...actions] : actions.slice(0, limit);
  }

  function getCargoActionJourney(operation) {
    return missionModel.getCargoActionJourney?.(operation) ?? {
      kind: operation?.type === 'delivery' ? 'unload' : 'load',
      label: operation?.type === 'delivery' ? 'UNLOAD' : 'LOAD',
      symbol: operation?.type === 'delivery' ? '↓' : '↑',
      origin: operation?.pickupLocationLabel ?? operation?.locationLabel ?? 'ORIGIN UNKNOWN',
      destination: operation?.destinationLocationLabel ?? operation?.deliveryLocationLabel ?? 'DESTINATION UNKNOWN'
    };
  }

  function groupCargoActionsByKind(actions) {
    return {
      unload: actions.filter((operation) => getCargoActionJourney(operation).kind === 'unload'),
      load: actions.filter((operation) => getCargoActionJourney(operation).kind === 'load')
    };
  }

  function cargoCoordinatesByLot(layout) {
    const coordinates = new Map();
    (layout?.groups ?? []).forEach((group) => {
      const assignments = (layout?.assignments ?? [])
        .filter((assignment) => String(assignment.groupKey ?? '') === String(group.key ?? ''))
        .sort((left, right) => safeNumber(left.row) - safeNumber(right.row)
          || safeNumber(left.column) - safeNumber(right.column)
          || safeNumber(left.layer) - safeNumber(right.layer));
      (group.lots ?? []).forEach((lot) => {
        const key = String(lot.key ?? `${lot.missionId}::${lot.lotId}`);
        const lotCoordinates = [...new Set(assignments
          .filter((assignment) => String(assignment.lotKey ?? `${assignment.missionId ?? ''}::${assignment.lotId ?? ''}`) === key)
          .map((assignment) => String(assignment.coordinate ?? assignment.floorId ?? '').replace(':', '·'))
          .filter(Boolean))];
        if (lotCoordinates.length) coordinates.set(key, lotCoordinates);
      });
      if ((group.lots ?? []).length === 1) {
        const lot = group.lots[0];
        const key = String(lot.key ?? `${lot.missionId}::${lot.lotId}`);
        if (!coordinates.has(key)) {
          coordinates.set(key, [...new Set(assignments
            .map((assignment) => String(assignment.coordinate ?? assignment.floorId ?? '').replace(':', '·'))
            .filter(Boolean))]);
        }
      }
    });
    return coordinates;
  }

  function formatCargoCoordinates(coordinates) {
    const rows = new Map();
    [...new Set(coordinates)].forEach((coordinate) => {
      const match = String(coordinate).replace('·', '').match(/^([A-Za-z]+)(\d+)$/);
      if (!match) return;
      const row = match[1].toUpperCase();
      const columns = rows.get(row) ?? [];
      columns.push(Number(match[2]));
      rows.set(row, columns);
    });
    return [...rows.entries()].sort(([left], [right]) => left.localeCompare(right)).flatMap(([row, rawColumns]) => {
      const columns = [...new Set(rawColumns)].sort((left, right) => left - right);
      const ranges = [];
      let start = columns[0];
      let end = start;
      columns.slice(1).forEach((column) => {
        if (column === end + 1) end = column;
        else {
          ranges.push(start === end ? `${row}${start}` : `${row}${start}–${row}${end}`);
          start = column;
          end = column;
        }
      });
      if (start != null) ranges.push(start === end ? `${row}${start}` : `${row}${start}–${row}${end}`);
      return ranges;
    }).join(', ');
  }

  function renderCargoActionItem(operation, coordinateMap) {
    const journey = getCargoActionJourney(operation);
    const coordinates = coordinateMap.get(`${operation.missionId}::${operation.lotId}`) ?? [];
    const cells = formatCargoCoordinates(coordinates);
    const mission = operation.missionTitle ? ` Mission: ${operation.missionTitle}.` : '';
    const accessible = `${journey.label} ${formatScu(operation.scu)} ${operation.commodity}. From ${journey.origin}. To ${journey.destination}.${cells ? ` Cells ${cells}.` : ''}${mission}`;
    return `<li class="cargo-action-item is-${journey.kind}" aria-label="${escapeHtml(accessible)}" title="${escapeHtml(operation.missionTitle ?? '')}">
      <div class="cargo-action-primary"><span class="cargo-action-badge"><i aria-hidden="true">${journey.symbol}</i>${journey.label}</span><strong>${escapeHtml(formatScu(operation.scu))} ${escapeHtml(operation.commodity)}</strong></div>
      <small class="cargo-action-journey"><span><b>FROM</b> ${escapeHtml(journey.origin)}</span><i aria-hidden="true">·</i><span><b>TO</b> ${escapeHtml(journey.destination)}</span></small>
      ${cells ? `<small class="cargo-action-cells"><b>CELLS</b> ${escapeHtml(cells)}</small>` : ''}
    </li>`;
  }

  function renderGroupedCargoActions(actions, layout, options = {}) {
    const groups = groupCargoActionsByKind(actions);
    const mixed = options.mixed ?? Boolean(groups.unload.length && groups.load.length);
    const coordinateMap = cargoCoordinatesByLot(layout);
    return ['unload', 'load'].map((kind) => {
      const operations = groups[kind];
      if (!operations.length) return '';
      const journey = getCargoActionJourney(operations[0]);
      const totalScu = operations.reduce((sum, operation) => sum + safeNumber(operation.scu), 0);
      const label = mixed
        ? kind === 'unload' ? 'UNLOAD FIRST' : 'LOAD AFTER'
        : journey.label;
      return `<section class="cargo-action-group is-${kind}">
        <div class="cargo-action-group-heading"><strong><i aria-hidden="true">${journey.symbol}</i>${label}</strong><span>${operations.length} action${operations.length === 1 ? '' : 's'} · ${formatScu(totalScu)}</span></div>
        <ul>${operations.map((operation) => renderCargoActionItem(operation, coordinateMap)).join('')}</ul>
      </section>`;
    }).join('');
  }

  function cargoActionSummary(actions) {
    const groups = groupCargoActionsByKind(actions);
    return [
      groups.unload.length ? `${groups.unload.length} unload` : '',
      groups.load.length ? `${groups.load.length} load` : ''
    ].filter(Boolean).join(' · ') || 'No cargo action queued';
  }

  function renderExpandableActionList(step, actions, layout, limit = 3) {
    const expanded = ui.expandedStepActionsId === step.id;
    const grouped = groupCargoActionsByKind(actions);
    const ordered = [...grouped.unload, ...grouped.load];
    const visible = getVisibleStepActions(ordered, limit, expanded);
    const remaining = Math.max(0, actions.length - limit);
    const listId = `step-actions-${String(step.id).replace(/[^a-z0-9_-]/gi, '-')}`;
    return `<section class="step-action-list" aria-labelledby="${listId}-label">
      <div class="step-action-heading"><span class="eyebrow" id="${listId}-label">First actions after transit</span><strong>${cargoActionSummary(actions)}</strong></div>
      ${actions.length ? `<div id="${listId}" class="cargo-action-groups">${renderGroupedCargoActions(visible, layout, { mixed: Boolean(grouped.unload.length && grouped.load.length) })}</div>` : '<p class="muted">Continue to the next operational objective.</p>'}
      ${remaining ? `<button class="step-action-toggle" type="button" data-action="toggle-step-actions" data-step-actions-id="${escapeHtml(step.id)}" aria-controls="${listId}" aria-expanded="${expanded}" aria-label="${expanded ? 'Collapse actions after transit' : `Show ${remaining} more actions after transit`}">${expanded ? 'Show fewer actions' : `+${remaining} more action${remaining === 1 ? '' : 's'}`}</button>` : ''}
    </section>`;
  }

  function nextCargoActionStep(step, state) {
    const routeProgress = progress(state);
    const currentIndex = routeProgress?.steps?.findIndex((candidate) => candidate.id === step.id) ?? -1;
    return routeProgress?.steps?.slice(currentIndex + 1).find((candidate) => candidate.kind === 'action') ?? null;
  }

  function estimateDuration(estimate = {}) {
    const minimum = Math.round(safeNumber(estimate.minMinutes));
    const maximum = Math.round(safeNumber(estimate.maxMinutes, minimum));
    return minimum === maximum ? `${maximum} min` : `${minimum}–${maximum} min`;
  }

  function affectedCargoCoordinates(step, layout) {
    const coordinateMap = cargoCoordinatesByLot(layout);
    return [...new Set((step.operations ?? []).flatMap((operation) => (
      coordinateMap.get(`${operation.missionId}::${operation.lotId}`) ?? []
    )))];
  }

  function renderCargoOperationDetails(step, state, layout, capacity) {
    const leg = state.route?.estimate?.legs?.[step.stopIndex] ?? {};
    const before = safeNumber(leg.onboardBeforeScu);
    const after = safeNumber(leg.onboardAfterScu, before + safeNumber(step.totals?.delta));
    const coordinates = affectedCargoCoordinates(step, layout);
    return `<div class="step-detail operation-manifest" data-step-detail="cargo-operation">
      <div class="context-heading"><span class="eyebrow">Operation manifest</span><strong>${formatScu(before)} → ${formatScu(after)} onboard</strong></div>
      <div class="manifest-columns cargo-action-groups">${renderGroupedCargoActions(step.operations ?? [], layout)}</div>
      ${renderDetailMetrics([
        { label: 'Onboard before', value: formatScu(before) },
        { label: 'Onboard after', value: formatScu(after) },
        { label: 'Remaining capacity', value: formatScu(Math.max(0, capacity - after)) },
        { label: 'Affected cells', value: coordinates.length ? coordinates.join(', ') : 'Auto-assigned' }
      ])}
    </div>`;
  }

  function renderTravelDetails(step, state, onboard) {
    const estimate = step.estimate ?? {};
    const rationale = state.route?.optimization?.rationale ?? '';
    const nextAction = nextCargoActionStep(step, state);
    const operations = nextAction?.operations ?? [];
    return renderStepDetail('travel', 'Arrival detail', state, `
      ${renderDetailPath([
        { label: 'Origin', value: step.from?.label },
        { label: 'Destination', value: step.to?.label },
        { label: 'Systems', value: `${step.from?.systemName ?? 'Unknown'} → ${step.to?.systemName ?? 'Unknown'}` }
      ])}
      ${renderDetailMetrics([
        { label: 'Estimated travel', value: estimateDuration(estimate), detail: estimate.distanceLabel },
        { label: 'Gateway count', value: `${safeNumber(estimate.jumpCount)} jumps` },
        { label: 'Cargo at arrival', value: formatScu(onboard) },
        { label: 'Next cargo operation', value: operations.length ? cargoActionSummary(operations) : 'None', detail: nextAction ? stepDestination(nextAction) : 'Continue route' }
      ])}
    `, rationale ? `<p class="optimizer-rationale">${escapeHtml(rationale)}</p>` : '');
  }

  function renderGatewayApproachDetails(step, state, onboard) {
    const crossing = (state.route.gatewaySegments ?? []).find((segment) => segment.connectionId === step.segment?.connectionId) ?? step.segment;
    const missionTitles = state.route.missions?.map((mission) => mission.title).filter(Boolean) ?? [];
    const jumpIndex = Math.max(1, (state.route.gatewaySegments ?? []).findIndex((segment) => segment.connectionId === crossing?.connectionId) + 1);
    const totalJumps = Math.max(1, state.route.gatewaySegments?.length ?? 1);
    return renderStepDetail('gateway-approach', 'Gateway transfer', state, `
      ${renderDetailPath([
        { label: 'Current system', value: step.from?.systemName },
        { label: 'Gateway approached', value: crossing?.fromGateway ?? step.to?.label },
        { label: 'Destination system', value: crossing?.toSystemId ?? step.to?.systemName }
      ])}
      ${renderDetailMetrics([
        { label: 'Jump number', value: `${jumpIndex} / ${totalJumps}` },
        { label: 'Cargo in transfer', value: formatScu(onboard) },
        { label: 'Missions in transfer', value: String(missionTitles.length) },
        { label: 'Gateway pair', value: `${crossing?.fromGateway ?? step.to?.label} → ${crossing?.toGateway ?? 'Next gateway'}` }
      ])}
      <p class="step-mission-line"><span>Transit missions</span><strong title="${escapeHtml(missionTitles.join(' · '))}">${escapeHtml(missionTitles.length ? missionTitles.join(' · ') : 'No mission cargo in transfer')}</strong></p>
    `);
  }

  function renderJumpTransitDetails(step, state, onboard, layout) {
    const metrics = state.route?.optimization?.metrics ?? {};
    const nextAction = nextCargoActionStep(step, state);
    const actions = nextAction?.operations ?? [];
    return renderStepDetail('jump', 'Jump transit', state, `
      ${renderDetailPath([
        { label: 'Leaving system', value: step.from?.systemName },
        { label: 'Reaching system', value: step.to?.systemName },
        { label: 'Gateway pair', value: `${step.from?.shortLabel ?? step.from?.label} → ${step.to?.shortLabel ?? step.to?.label}` }
      ])}
      ${renderDetailMetrics([
        { label: 'Jump count', value: `${safeNumber(metrics.gatewayJumpCount, state.route.gatewaySegments?.length)} jumps` },
        { label: 'Estimated duration', value: estimateDuration(step.estimate) },
        { label: 'Cargo onboard', value: formatScu(onboard) },
        { label: 'Missions in transfer', value: String(state.route.missions?.length ?? 0) }
      ])}
      ${renderExpandableActionList(step, actions, layout)}
    `);
  }

  function renderStepDetails(step, state, layout, capacity, onboard) {
    if (step.kind === 'action') return renderCargoOperationDetails(step, state, layout, capacity);
    if (step.kind === 'gateway-approach') return renderGatewayApproachDetails(step, state, onboard);
    if (step.kind === 'jump') return renderJumpTransitDetails(step, state, onboard, layout);
    return renderTravelDetails(step, state, onboard);
  }

  function routeCompleteSummary(state) {
    const metrics = state.route?.optimization?.metrics ?? {};
    const missions = state.route?.missions ?? state.missions ?? [];
    const delivered = missions.reduce((sum, mission) => sum + (mission.cargoLots ?? []).reduce((lotSum, lot) => lotSum + safeNumber(lot.scu), 0), 0);
    const excluded = Math.max(0, (state.missions?.length ?? 0) - missions.length);
    return `<div class="step-detail completion-summary" data-step-detail="complete"><div class="context-heading"><span class="eyebrow">Operation summary</span><strong>${routeMetricLine(state)}</strong></div><div class="scorecard-grid">
      ${contextDatum('Missions complete', String(missions.length))}
      ${contextDatum('SCU delivered', formatScu(delivered))}
      ${contextDatum('Stops', String(safeNumber(metrics.stopCount, state.route?.stops?.length)))}
      ${contextDatum('Gateway jumps', String(safeNumber(metrics.gatewayJumpCount, state.route?.estimate?.totalJumpCount)))}
      ${contextDatum('Estimated travel', formatMinutes(metrics.totalTravelMinutes ?? state.route?.estimate?.midpoint))}
      ${contextDatum('Route strategy', strategyLabel(state))}
      ${contextDatum('Outside session', excluded ? `${excluded} missions` : 'None')}
    </div></div>`;
  }

  function livePage() {
    const state = store.getState();
    if (!state.route) return `<main class="workspace live-workspace">${workspaceHeader('Execution workspace', 'Live Ops', 'Action-first guidance for the active hauling session.')}
      <section class="empty-state"><div class="empty-symbol">▶</div><h2>No active session</h2><p>${state.missions?.length ? 'Your contracts are ready. Build or select a plan to begin operations.' : 'Acquire contracts, verify the cargo flow, and choose a session to begin.'}</p><button class="button button-primary" type="button" data-nav="${state.missions?.length ? 'plan' : 'contracts'}">${state.missions?.length ? 'Open Plan' : 'Add Contracts'}</button></section></main>`;
    const prog = progress(state);
    if (prog?.complete) {
      const finalLocation = getRelevantLocationForStep(null, state.route, state);
      const finalStatus = finalLocation ? getLocationServiceStatus(finalLocation.id, 0) : null;
      return `<main class="workspace live-workspace">${workspaceHeader('Execution workspace', 'Session complete', 'All operational steps in this session are complete.')}
        <section class="completion-panel"><div class="completion-hero"><div class="empty-symbol success">✓</div><div><h2>Cargo delivered</h2><p>${state.route.missions?.length ?? state.missions.length} missions complete · ${formatScu(state.route.totalCargoScu)} planned cargo handled.</p></div></div>${renderLocationStatusStrip(finalStatus)}${routeCompleteSummary(state)}<button class="button button-primary" type="button" data-nav="plan">Return to Plan</button></section></main>`;
    }
    const step = prog.currentStep;
    const next = prog.nextStep;
    const isAction = step?.kind === 'action';
    const cargo = cargoSnapshot(state);
    const layout = planCargoGrid(state);
    const capacity = selectedShip(state).cargoCapacityScu;
    const onboard = cargo?.totals?.onboardScu ?? layout?.usedScu ?? 0;
    const free = Math.max(0, capacity - onboard);
    const moves = stepMoves(step);
    const relevantLocation = getRelevantLocationForStep(step, state.route, state);
    const locationStatus = relevantLocation ? getLocationServiceStatus(relevantLocation.id, onboard) : null;
    const isNavigationFocus = ['gateway-approach', 'jump'].includes(step?.kind);
    return `<main class="workspace live-workspace">
      <div class="mission-bar">
        <div><small>Active session</small><strong>${escapeHtml(activeSession(state)?.title ?? 'Full route')}</strong></div>
        <div><small>Ship</small><strong>${escapeHtml(selectedShip(state).nickname || selectedModel(state).model)}</strong></div>
        <div><small>Route progress</small><strong>${prog.currentIndex + 1} / ${prog.totalSteps}</strong></div>
        <div><small>Capacity</small><strong class="${free < capacity * .1 ? 'danger' : ''}">${formatScu(onboard)} / ${capacity}</strong></div>
        <div><button class="button icon-button" type="button" data-open-drawer="route" aria-label="Route and mission options">•••</button></div>
      </div>
      <div class="live-grid${isAction ? ' is-cargo-step' : ''}">
        <section class="panel command-panel${isAction ? ' is-action' : ''}">
          <div class="command-main">
            <span class="command-kicker">${escapeHtml(kindLabel(step.kind))} · Step ${prog.currentIndex + 1}</span>
            <h1>${escapeHtml(step.title ?? (isAction ? 'Handle cargo' : `Proceed to ${stepDestination(step)}`))}</h1>
            <p class="nav-target">NAV TARGET · ${escapeHtml(stepNavTarget(step))}</p>
            ${renderLocationStatusStrip(locationStatus)}
            <p class="command-instruction">${escapeHtml(moves.length ? 'Handle the listed cargo at this stop, then confirm the operation.' : step.from?.label ? `Depart ${step.from.label} and follow the navigation target.` : 'Follow the in-game navigation target to continue.')}</p>
            ${renderStepDetails(step, state, layout, capacity, onboard)}
          </div>
          <div class="next-preview"><span class="eyebrow">Next meaningful step</span><b title="${escapeHtml(next ? `${kindLabel(next.kind)} · ${stepDestination(next)}` : 'Complete session')}">${escapeHtml(next ? `${kindLabel(next.kind)} · ${stepDestination(next)}` : 'Complete session')}</b></div>
        </section>
        <section class="panel cargo-panel${!isAction ? ' is-navigation-compact' : ''}${isNavigationFocus ? ' is-navigation-muted' : ''}">
          <div class="panel-heading"><strong>${escapeHtml(selectedModel(state).manufacturer)} ${escapeHtml(selectedModel(state).model)} · Cargo hold</strong><div><button class="button" type="button" data-action="toggle-grouping">${state.cargoLayoutGroupingMode === 'mission' ? 'By mission' : 'By destination'}</button> <button class="button" type="button" data-open-drawer="cargo">Edit grid</button></div></div>
          <div class="cargo-metrics"><div><strong>${formatScu(onboard)}</strong><span>Onboard</span></div><div><strong>${formatScu(free)}</strong><span>Free</span></div><div><strong>${formatScu(layout?.reservedScu ?? 0)}</strong><span>Reserved</span></div></div>
          <details class="cargo-disclosure"${root.matchMedia('(min-width: 821px)').matches ? ' open' : ''}>
            <summary><span>Cargo grid</span><strong>${formatScu(onboard)} onboard · ${formatScu(free)} free</strong></summary>
            <div class="cargo-hold">${layout?.error ? `<p class="danger">Layout impossible: ${escapeHtml(layout.error)}</p>` : cargoGridMarkup(layout, step)}</div>
          </details>
        </section>
      </div>
      <section class="route-rail"><div class="panel-heading"><strong>Route orientation</strong><button class="button" type="button" data-open-drawer="route">Full route</button></div><ol class="route-rail-list">
        ${prog.steps.map((item, index) => `<li class="route-step${index < prog.currentIndex ? ' is-complete' : ''}${index === prog.currentIndex ? ' is-current' : ''}"><span>${String(index + 1).padStart(2, '0')} · ${escapeHtml(kindLabel(item.kind))}</span><strong>${escapeHtml(stepDestination(item))}</strong></li>`).join('')}
      </ol></section>
      <footer class="execution-bar"><button class="button" type="button" data-action="previous-step" ${prog.currentIndex === 0 ? 'disabled' : ''}>Previous</button><button class="button button-primary" type="button" data-action="complete-step">${escapeHtml(commandButtonLabel(step))} →</button></footer>
    </main>`;
  }

  function shipSchematic() {
    return `<svg viewBox="0 0 220 300" aria-label="Planning schematic"><path d="M110 18 160 68 181 180 150 252 110 280 70 252 39 180 60 68Z"/><path d="M60 68 110 96 160 68M55 190h110M82 96v138M138 96v138M70 252h80"/><path d="M92 18h36M93 280h34"/></svg>`;
  }

  function fleetPage() {
    const state = store.getState();
    const ship = selectedShip(state);
    const model = selectedModel(state);
    return `<main class="workspace">
      ${workspaceHeader('Ship operations', 'Fleet', 'Manage saved ships and the operational geometry used by planning.', '<button class="button button-primary" type="button" data-open-drawer="add-ship">+ Add ship</button>')}
      <div class="fleet-layout">
        <aside class="panel"><div class="panel-heading"><strong>Saved ships</strong><span class="tag">${state.hangarShips.length}</span></div><div class="fleet-list">${state.hangarShips.map((item) => {
          const itemModel = ships.getModel(item.modelId);
          return `<button class="ship-row${item.id === ship.id ? ' is-selected' : ''}" type="button" data-select-ship="${escapeHtml(item.id)}"><strong>${escapeHtml(item.nickname || `${itemModel?.manufacturer} ${itemModel?.model}`)}</strong><span>${formatScu(item.cargoCapacityScu)} · ${escapeHtml(item.quantumDrive)}</span></button>`;
        }).join('')}</div></aside>
        <section class="ship-detail">
          <article class="panel"><div class="panel-heading"><strong>Active configuration</strong><span class="tag tag-active">Active ship</span></div><div class="panel-body">
            <span class="eyebrow">${escapeHtml(model.manufacturer)}</span><h2 class="ship-name">${escapeHtml(ship.nickname || model.model)}</h2><p class="muted">${escapeHtml(ship.notes || 'Operational cargo configuration')}</p>
            <div class="ship-stats"><div><strong>${formatScu(ship.cargoCapacityScu)}</strong><span>Capacity</span></div><div><strong>${escapeHtml(ship.quantumDrive)}</strong><span>Quantum drive</span></div><div><strong>${safeNumber(ship.quantumTimeFactor, 1).toFixed(2)}×</strong><span>Travel factor</span></div><div><strong>${model.layout.zones.length}</strong><span>Cargo zones</span></div></div>
            <p class="eyebrow">Operational cargo zones</p><div class="zone-list">${model.layout.zones.map((zone) => `<div class="zone-row"><span><strong>${escapeHtml(zone.label)}</strong><br><small>${escapeHtml(zone.access)}</small></span><strong>${formatScu(zone.capacityScu)}</strong></div>`).join('')}</div>
          </div></article>
          <aside class="panel"><div class="panel-heading"><strong>Planning geometry</strong></div><div class="panel-body"><div class="ship-schematic">${shipSchematic()}</div><p class="editor-note" style="margin-top:12px">Capacity follows the catalog. Zone and grid geometry are tool-defined planning aids, not an official ship blueprint.</p></div></aside>
        </section>
      </div>
    </main>`;
  }

  function intelContext(location) {
    try { return root.SCCompanionLocationContext?.buildContext(location.id) ?? null; }
    catch { return null; }
  }

  function locationResults() {
    const results = locations.searchOperationalLocations(ui.intelQuery || '', { limit: 24 });
    return results.length ? results : locations.locations.filter((item) => item.operational).slice(0, 24);
  }

  function intelLocationsMarkup() {
    const selected = locations.getLocation(ui.intelLocationId) ?? locationResults()[0];
    if (selected) ui.intelLocationId = selected.id;
    const context = selected ? intelContext(selected) : null;
    const path = selected ? locations.formatLocationPath(selected) : 'No hierarchy';
    const services = context?.services ?? [];
    return `<div class="intel-layout">
      <aside class="panel"><div class="panel-heading"><strong>Location registry</strong><span class="tag">${locations.snapshot.coverage.operationalDestinations}</span></div><div class="panel-body">
        <label>Search by name or navigation target<input id="intel-search" type="search" value="${escapeHtml(ui.intelQuery)}" placeholder="Lorville, Checkmate, Stanton Gateway…"></label>
        <div class="search-results">${locationResults().map((item) => `<button type="button" class="location-result${item.id === selected?.id ? ' is-selected' : ''}" data-location-id="${escapeHtml(item.id)}"><strong>${escapeHtml(locations.formatOperationalLabel(item))}</strong><span>In game: ${escapeHtml(item.navigationTarget ?? item.name)}</span></button>`).join('')}</div>
      </div></aside>
      <section class="panel"><article class="intel-hero"><span class="eyebrow">${escapeHtml(selected?.type ?? 'Location')}</span><h2>${escapeHtml(selected ? locations.formatOperationalLabel(selected) : 'No location selected')}</h2><p class="intel-target">NAV TARGET · ${escapeHtml(selected?.navigationTarget ?? selected?.name ?? '—')}</p><p class="muted">${escapeHtml(path)}</p>
        <dl class="intel-facts"><div><dt>System</dt><dd>${escapeHtml(locations.getSystemForLocation(selected?.id)?.name ?? 'Unknown')}</dd></div><div><dt>Risk</dt><dd>${escapeHtml(context?.risk?.level ?? context?.risk ?? 'Unknown')}</dd></div><div><dt>Cargo exposure</dt><dd>${escapeHtml(context?.exposure?.level ?? context?.exposure ?? 'Unknown')}</dd></div><div><dt>Data status</dt><dd>${escapeHtml(selected?.gameVersion ?? locations.snapshot.gameVersion)}</dd></div><div><dt>Approach</dt><dd>${escapeHtml(context?.approach?.label ?? 'Use in-game navigation')}</dd></div><div><dt>Provenance</dt><dd>${escapeHtml((selected?.sourceIds ?? []).join(', ') || 'Registry')}</dd></div></dl>
        <p class="eyebrow" style="margin:20px 0 8px">Available services</p><div class="service-list">${services.length ? services.map((service) => `<span class="tag">${escapeHtml(service.label ?? service)}</span>`).join('') : '<span class="muted">No verified service data available.</span>'}</div>
      </article></section>
    </div>`;
  }

  function intelMapMarkup() {
    const state = store.getState();
    const routeLocations = state.route?.stops?.map((stop) => locations.getLocation(stop.locationId)).filter(Boolean) ?? [];
    const nodes = routeLocations.length ? routeLocations : [
      locations.getLocation('stanton-hurston-lorville-teasa'),
      locations.getLocation('stanton-arccorp-area18-riker'),
      locations.getLocation('stanton-crusader-orison-august-dunlow')
    ].filter(Boolean);
    return `<section class="starmap">
      <div class="map-orbit" style="left:50%;top:50%;width:64%;height:64%"></div><div class="map-orbit" style="left:50%;top:50%;width:35%;height:35%"></div>
      ${nodes.map((item, index) => {
        const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
        const left = 50 + Math.cos(angle) * 30;
        const top = 50 + Math.sin(angle) * 30;
        return `<button type="button" class="map-node${item.id === ui.intelLocationId ? ' is-selected' : ''}" data-location-id="${escapeHtml(item.id)}" style="left:${left}%;top:${top}%">${escapeHtml(item.navigationTarget ?? item.name)}</button>`;
      }).join('')}
      <button type="button" class="map-node" style="left:50%;top:50%">STANTON</button>
    </section>`;
  }

  function intelPage() {
    return `<main class="workspace">
      ${workspaceHeader('Navigation reference', 'Intel', 'Look up verified navigation context or open the separate route starmap.')}
      <div class="intel-tabs"><button class="source-tab" type="button" data-intel-tab="locations" aria-selected="${ui.intelTab === 'locations'}">Location Intel</button><button class="source-tab" type="button" data-intel-tab="map" aria-selected="${ui.intelTab === 'map'}">Starmap</button></div>
      ${ui.intelTab === 'map' ? intelMapMarkup() : intelLocationsMarkup()}
    </main>`;
  }

  function routeDrawerMarkup() {
    const prog = progress();
    const state = store.getState();
    return `<div class="drawer-backdrop" data-close-drawer></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Route and missions"><header class="drawer-header"><div><span class="eyebrow">Session management</span><h2>Route & missions</h2></div><button class="button icon-button" type="button" data-close-drawer aria-label="Close">×</button></header><div class="drawer-body">
      <p class="editor-note">The active order preserves pickup-before-delivery dependencies and capacity constraints.</p>
      <div class="route-tools"><button class="button" type="button" data-action="view-plan">View plan</button><label>Change strategy<select id="replan-strategy">${(routeOptimization?.STRATEGIES ?? []).filter((strategy) => strategy.id !== 'low-traffic' || state.route?.optimization?.availability?.available !== false).map((strategy) => `<option value="${escapeHtml(strategy.id)}" ${strategy.id === state.routeStrategy ? 'selected' : ''}>${escapeHtml(strategy.label)}</option>`).join('')}</select></label><button class="button button-primary" type="button" data-action="replan-route">Replan remaining route</button></div>
      <ol class="route-order">${(prog?.steps ?? []).map((step, index) => `<li><b>${String(index + 1).padStart(2, '0')}</b><span><strong>${escapeHtml(stepDestination(step))}</strong><br><small class="muted">${escapeHtml(kindLabel(step.kind))}</small></span><span class="tag ${index < prog.currentIndex ? 'tag-ready' : index === prog.currentIndex ? 'tag-active' : ''}">${index < prog.currentIndex ? 'Done' : index === prog.currentIndex ? 'Current' : 'Queued'}</span></li>`).join('')}</ol>
      <p class="eyebrow" style="margin:22px 0 8px">Missions in session</p><ul class="verified-list">${(store.getState().route?.missions ?? []).map((mission) => `<li><span>${escapeHtml(mission.title)}</span><strong>${formatScu(mission.cargoLots.reduce((sum, lot) => sum + lot.scu, 0))}</strong></li>`).join('')}</ul>
    </div></aside>`;
  }

  function cargoDrawerMarkup() {
    const layout = planCargoGrid();
    const model = selectedModel();
    return `<div class="drawer-backdrop" data-close-drawer></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Manual cargo editor"><header class="drawer-header"><div><span class="eyebrow">Manual cargo editor</span><h2>${escapeHtml(model.manufacturer)} ${escapeHtml(model.model)} · ${formatScu(model.capacityScu)}</h2></div><button class="button icon-button" type="button" data-close-drawer aria-label="Close">×</button></header><div class="drawer-body">
      <p class="editor-note">${model.snapGrid ? `${model.snapGrid.rows} × ${model.snapGrid.columns} floor cells · ${model.snapGrid.cellCapacityScu} SCU per cell · ${model.snapGrid.rows * model.snapGrid.columns} cells. Rows display ${String.fromCharCode(64 + model.snapGrid.rows)} → A.` : 'This ship has a conceptual planning grid.'}</p>
      <div class="editor-toolbar"><button class="button ${ui.editorMode === 'move' ? 'is-active' : ''}" type="button" data-editor-mode="move">Move cargo</button><button class="button ${ui.editorMode === 'assign' ? 'is-active' : ''}" type="button" data-editor-mode="assign">Assign group</button><button class="button ${ui.editorMode === 'reserve' ? 'is-active' : ''}" type="button" data-editor-mode="reserve">Reserve</button><button class="button ${ui.editorMode === 'empty' ? 'is-active' : ''}" type="button" data-editor-mode="empty">Keep empty</button><button class="button ${ui.editorMode === 'clear' ? 'is-active' : ''}" type="button" data-editor-mode="clear">Clear override</button><button class="button button-danger" type="button" data-action="reset-layout">Reset auto layout</button></div>
      ${ui.editorMode === 'assign' ? `<div class="source-switcher">${(layout?.groups ?? []).map((group, index) => `<button type="button" class="source-tab" data-editor-group="${escapeHtml(group.key)}" aria-selected="${ui.editorGroup === group.key}" style="border-color:${GROUP_COLORS[index % GROUP_COLORS.length]}">${escapeHtml(group.label ?? group.key)}</button>`).join('')}</div>` : ''}
      ${layout?.error ? `<p class="danger">Layout impossible: ${escapeHtml(layout.error)}</p>` : cargoGridMarkup(layout, progress()?.currentStep, true)}
      <p class="editor-note" style="margin-top:14px">Changes persist per ship in the existing local session. This planning geometry is not an official blueprint.</p>
    </div></aside>`;
  }

  function addShipDrawerMarkup() {
    return `<div class="drawer-backdrop" data-close-drawer></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Add ship"><header class="drawer-header"><div><span class="eyebrow">Fleet configuration</span><h2>Add ship</h2></div><button class="button icon-button" type="button" data-close-drawer aria-label="Close">×</button></header><div class="drawer-body"><form id="add-ship-form" class="mission-editor-grid">
      <label>Ship model<select name="modelId">${ships.models.map((model) => `<option value="${escapeHtml(model.id)}">${escapeHtml(model.manufacturer)} ${escapeHtml(model.model)} · ${formatScu(model.capacityScu)}</option>`).join('')}</select></label>
      <label>Nickname<input name="nickname" placeholder="Optional callsign"></label>
      <div class="form-row"><label>Quantum drive<input name="quantumDrive" value="Stock"></label><label>Travel factor<input name="quantumTimeFactor" type="number" min=".1" step=".01" value="1"></label></div>
      <label>Operational notes<textarea name="notes" rows="4"></textarea></label><button class="button button-primary" type="submit">Add and activate ship</button>
    </form></div></aside>`;
  }

  function drawerMarkup() {
    if (ui.drawer === 'route') return routeDrawerMarkup();
    if (ui.drawer === 'cargo') return cargoDrawerMarkup();
    if (ui.drawer === 'add-ship') return addShipDrawerMarkup();
    return '';
  }

  function render() {
    const page = ({ contracts: contractsPage, plan: planPage, live: livePage, fleet: fleetPage, intel: intelPage })[ui.page] ?? livePage;
    app.innerHTML = shellMarkup(page()) + drawerMarkup();
    if (ui.page === 'live') requestAnimationFrame(() => {
      document.querySelector('.route-step.is-current')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
  }

  function reviewContracts() {
    const input = ui.contractSource === 'text' ? document.querySelector('#contract-text') : document.querySelector('#assisted-text');
    const text = String(input?.value ?? '').trim();
    if (!text) {
      const message = document.querySelector('#contract-message');
      if (message) { message.textContent = 'Add contract text before continuing.'; message.className = 'inline-message is-error'; }
      return;
    }
    ui.report = validator.inspectMissionText(text, locations);
    ui.reviewDrafts = draftsFromReport(ui.report);
    if (!ui.reviewDrafts.length) {
      ui.reviewDrafts = [{ title: 'Mission 1', contractor: '', rewardAuec: '', objectives: [{ action: 'collect', location: '', cargo: '' }, { action: 'deliver', location: '', cargo: '' }] }];
    }
    ui.selectedMission = 0;
    ui.contractStage = 'resolve';
    store.patch({ missionSourceText: text, missionText: text });
    render();
  }

  function updateDraftFromField(target) {
    const mission = ui.reviewDrafts[ui.selectedMission];
    if (!mission) return;
    if (target.dataset.missionField) mission[target.dataset.missionField] = target.value;
    const row = target.closest('[data-objective-index]');
    if (row && target.dataset.objectiveField) {
      mission.objectives[Number(row.dataset.objectiveIndex)][target.dataset.objectiveField] = target.value;
    }
    refreshReportFromDrafts();
    const configure = document.querySelector('[data-action="configure-route"]');
    if (configure) configure.disabled = !ui.report.ready;
  }

  function buildPlan() {
    refreshReportFromDrafts();
    if (!ui.report.ready) { ui.contractStage = 'resolve'; render(); return; }
    const startLocationId = document.querySelector('#route-start')?.value;
    const selectedShipId = document.querySelector('#route-ship')?.value;
    const routePlayMode = document.querySelector('[data-play-mode][aria-pressed="true"]')?.dataset.playMode ?? store.getState().routePlayMode ?? 'sessions';
    const routeStrategy = document.querySelector('[data-route-strategy][aria-pressed="true"]')?.dataset.routeStrategy ?? store.getState().routeStrategy ?? 'balanced';
    const routeStrategyWeights = { ...store.getState().routeStrategyWeights };
    const sessionTargetMinutes = Math.max(5, safeNumber(document.querySelector('#route-duration')?.value, 60));
    try {
      const plan = sessionPlanner.plan(ui.report.missions, missionModel, {
        startLocationId,
        selectedShipId,
        playMode: routePlayMode,
        routeStrategy,
        routeStrategyWeights,
        targetMinutes: sessionTargetMinutes
      });
      const start = locations.getLocation(startLocationId);
      const configuredShip = store.getState().hangarShips.find((ship) => ship.id === selectedShipId) ?? selectedShip(store.getState());
      store.patch({
        missionText: serializeDrafts(),
        missionValidation: validator.snapshot(ui.report, store.getState().missionSourceText, serializeDrafts()),
        missions: ui.report.missions,
        routeStartLocationId: startLocationId,
        routeStartLocationLabel: start ? locations.formatOperationalLabel(start) : startLocationId,
        selectedShipId,
        selectedShipModelId: configuredShip.modelId,
        routeMode: routePlayMode === 'full' ? 'fastest' : 'sessions',
        routePlayMode,
        routeStrategy,
        routeStrategyWeights,
        selectedRouteCandidateId: 'recommended',
        routeOptimizationSummary: plan.sessions[0]?.route.optimization ?? null,
        sessionTargetMinutes,
        routePlan: plan,
        activeRouteSessionIndex: 0,
        route: null,
        currentStopIndex: 0,
        completedStopIds: [],
        completedOperationalStepIds: [],
        operationalRouteKey: null,
        routeCorrections: null,
        cargoCorrections: {}
      });
      ui.selectedSession = 0;
      navigate('plan');
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  function startSession(index, candidateId = ui.selectedCandidateId) {
    const state = store.getState();
    const session = routePlan(state)?.sessions[index];
    if (!session) return;
    const candidate = session.routeCandidates?.find((item) => item.id === candidateId) ?? session.routeCandidates?.[0];
    const route = candidate?.route ?? session.route;
    store.patch({
      route,
      selectedRouteCandidateId: candidate?.id ?? 'recommended',
      routeOptimizationSummary: route.optimization ?? null,
      activeRouteSessionIndex: index,
      currentStopIndex: 0,
      completedStopIds: [],
      completedOperationalStepIds: [],
      operationalRouteKey: null,
      routeCorrections: null,
      cargoCorrections: {}
    });
    navigate('live');
  }

  async function handleFile(input, kind) {
    const files = [...(input.files ?? [])];
    const file = files[0];
    if (!file) return;
    if (kind === 'ocr') {
      const preview = document.querySelector('#ocr-preview');
      if (preview) {
        preview.src = URL.createObjectURL(file);
        preview.classList.remove('hidden');
        document.querySelector('#ocr-empty')?.classList.add('hidden');
      }
      const assisted = document.querySelector('#assisted-text');
      const status = document.querySelector('#ocr-status');
      if (assisted) assisted.placeholder = `${file.name} selected. Recognition is starting…`;
      if (status) status.textContent = `Loading the OCR engine for ${files.length} screenshot${files.length === 1 ? '' : 's'}…`;
      try {
        const tesseract = await import('https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.esm.min.js');
        const createWorker = tesseract.createWorker ?? tesseract.default?.createWorker;
        if (!createWorker) throw new Error('OCR engine did not expose a worker.');
        const worker = await createWorker('eng', 1, {
          logger(message) {
            if (!status || message.status !== 'recognizing text') return;
            status.textContent = `Recognizing screenshots · ${Math.round((message.progress ?? 0) * 100)}%`;
          }
        });
        const results = [];
        try {
          for (const screenshot of files) {
            const result = await worker.recognize(screenshot);
            if (result.data?.text?.trim()) results.push(result.data.text.trim());
          }
        } finally {
          await worker.terminate();
        }
        if (assisted) assisted.value = results.join('\n\n');
        if (status) status.textContent = results.length
          ? `Recognition complete. Review and correct the draft before continuing.`
          : 'No text was recognized. Enter or paste the contract text below.';
        toast(`OCR completed for ${files.length} screenshot${files.length === 1 ? '' : 's'}.`);
      } catch (error) {
        if (status) status.textContent = 'OCR is unavailable right now. Paste or type the contract text below to continue.';
        toast(`OCR unavailable: ${error.message}`, 'error');
      }
    } else {
      const text = await file.text();
      const parsed = root.SCCompanionGameLogIntake?.parseLines(text, { sourceName: file.name }) ?? [];
      const draft = root.SCCompanionGameLogIntake?.buildDraft(parsed) ?? null;
      const output = document.querySelector('#assisted-text');
      if (output) output.value = draft?.draftText ?? '';
      toast(`${parsed.length} supported Game.log events inspected.`);
    }
  }

  function completeStep(direction) {
    const state = store.getState();
    if (!state.route) return;
    const changes = direction === 'previous' ? operational.previous(state.route, state) : operational.completeCurrent(state.route, state);
    store.patch(changes);
  }

  function replanActiveRoute() {
    const state = store.getState();
    const strategy = document.querySelector('#replan-strategy')?.value ?? state.routeStrategy;
    if (!state.route || !routePlanner?.replanRemaining) return toast('Replanning is unavailable for this route.', 'error');
    const result = routePlanner.replanRemaining(state.route, state.completedStopIds ?? [], {
      startLocationId: state.routeStartLocationId,
      selectedShipId: state.selectedShipId,
      routeStrategy: strategy,
      routeStrategyWeights: state.routeStrategyWeights
    });
    if (!result.changed) return toast('The remaining valid route is already optimal for this strategy.');
    const before = result.previousOrder.join(' → ');
    const after = result.nextOrder.join(' → ');
    if (!root.confirm(`Replace the remaining route?\n\nCurrent: ${before}\n\nNew: ${after}\n\nCompleted steps, onboard cargo and manual cargo overrides will be preserved.`)) return;
    store.patch({
      route: result.route,
      routeStrategy: strategy,
      routeOptimizationSummary: result.route.optimization,
      completedStopIds: result.completedStopIds,
      currentStopIndex: result.completedStopIds.length,
      completedOperationalStepIds: [],
      operationalRouteKey: null
    });
    ui.drawer = null;
    toast('Remaining route replanned. Completed work and cargo overrides were preserved.');
  }

  function applyEditorCell(cellId) {
    const model = selectedModel();
    const layout = planCargoGrid();
    if (!cargoLayout?.manualGridEditor) return toast('Manual layout is unavailable for this ship.', 'error');
    try {
      if (ui.editorMode === 'reserve') cargoLayout.toggleReserved(model, cellId);
      else if (ui.editorMode === 'empty') cargoLayout.toggleEmpty(model, cellId);
      else if (ui.editorMode === 'clear') cargoLayout.clearCell(model, cellId);
      else if (ui.editorMode === 'assign') {
        if (!ui.editorGroup) return toast('Select a cargo group first.', 'error');
        cargoLayout.assignGroup(model, ui.editorGroup, cellId, layout);
      } else if (ui.editorMode === 'move') {
        if (!ui.editorSource) {
          const source = layout?.floorCells?.find((cell) => String(cell.id) === String(cellId));
          if (!source?.groupKey) return toast('Choose an occupied cell first.', 'error');
          ui.editorSource = cellId;
          toast('Cargo selected. Choose a target cell.');
          return;
        }
        cargoLayout.moveCell(model, ui.editorSource, cellId, layout);
        ui.editorSource = null;
      }
      render();
    } catch (error) {
      ui.editorSource = null;
      toast(error.message, 'error');
    }
  }

  app.addEventListener('click', (event) => {
    const target = event.target.closest('button, [data-action], [data-nav], [data-close-drawer]');
    if (!target) return;
    if (target.dataset.nav) return navigate(target.dataset.nav);
    if (target.dataset.contractSource) { ui.contractSource = target.dataset.contractSource; render(); return; }
    if (target.dataset.contractStage) { ui.contractStage = target.dataset.contractStage; render(); return; }
    if (target.dataset.selectMission !== undefined) { ui.selectedMission = Number(target.dataset.selectMission); render(); return; }
    if (target.dataset.selectSession !== undefined) { ui.selectedSession = Number(target.dataset.selectSession); ui.selectedCandidateId = 'recommended'; render(); return; }
    if (target.dataset.sessionRow !== undefined) { ui.selectedSession = Number(target.dataset.sessionRow); ui.selectedCandidateId = 'recommended'; render(); return; }
    if (target.dataset.selectCandidate) { ui.selectedCandidateId = target.dataset.selectCandidate; render(); return; }
    if (target.dataset.startSession !== undefined) return startSession(Number(target.dataset.startSession), target.dataset.candidateId);
    if (target.dataset.playMode) {
      store.patch({ routePlayMode: target.dataset.playMode, routeMode: target.dataset.playMode === 'full' ? 'fastest' : 'sessions' });
      document.querySelector('#duration-field')?.toggleAttribute('hidden', target.dataset.playMode === 'full');
      return;
    }
    if (target.dataset.routeStrategy) {
      store.patch({ routeStrategy: target.dataset.routeStrategy });
      return;
    }
    if (target.dataset.openDrawer) { ui.drawer = target.dataset.openDrawer; render(); return; }
    if (target.hasAttribute('data-close-drawer')) { ui.drawer = null; ui.editorSource = null; render(); return; }
    if (target.dataset.intelTab) { ui.intelTab = target.dataset.intelTab; render(); return; }
    if (target.dataset.locationId) { ui.intelLocationId = target.dataset.locationId; ui.intelTab = 'locations'; render(); return; }
    if (target.dataset.selectShip) {
      const ship = store.getState().hangarShips.find((item) => item.id === target.dataset.selectShip);
      store.patch({ selectedShipId: ship.id, selectedShipModelId: ship.modelId });
      return;
    }
    if (target.dataset.editorMode) { ui.editorMode = target.dataset.editorMode; ui.editorSource = null; render(); return; }
    if (target.dataset.editorGroup) { ui.editorGroup = target.dataset.editorGroup; render(); return; }
    if (target.dataset.cargoCell && ui.drawer === 'cargo') return applyEditorCell(target.dataset.cargoCell);

    switch (target.dataset.action) {
      case 'review-contracts': reviewContracts(); break;
      case 'configure-route': ui.contractStage = 'configure'; render(); break;
      case 'build-plan': buildPlan(); break;
      case 'view-plan': ui.drawer = null; navigate('plan'); break;
      case 'replan-route': replanActiveRoute(); break;
      case 'toggle-more-strategies': ui.showMoreStrategies = !ui.showMoreStrategies; render(); break;
      case 'reset-strategy-weights': store.patch({ routeStrategyWeights: { ...routeOptimization.BALANCED_WEIGHTS } }); break;
      case 'choose-ocr': document.querySelector('#ocr-file')?.click(); break;
      case 'choose-log': document.querySelector('#log-file')?.click(); break;
      case 'add-mission':
        ui.reviewDrafts.push({ title: `Mission ${ui.reviewDrafts.length + 1}`, contractor: '', rewardAuec: '', objectives: [{ action: 'collect', location: '', cargo: '' }, { action: 'deliver', location: '', cargo: '' }] });
        ui.selectedMission = ui.reviewDrafts.length - 1; refreshReportFromDrafts(); render(); break;
      case 'remove-mission':
        ui.reviewDrafts.splice(ui.selectedMission, 1); ui.selectedMission = Math.max(0, ui.selectedMission - 1); refreshReportFromDrafts(); render(); break;
      case 'add-objective':
        ui.reviewDrafts[ui.selectedMission]?.objectives.push({ action: 'collect', location: '', cargo: '' }); refreshReportFromDrafts(); render(); break;
      case 'previous-step': ui.expandedStepActionsId = null; completeStep('previous'); break;
      case 'complete-step': ui.expandedStepActionsId = null; completeStep('complete'); break;
      case 'toggle-step-actions':
        ui.expandedStepActionsId = ui.expandedStepActionsId === target.dataset.stepActionsId
          ? null
          : target.dataset.stepActionsId;
        render();
        break;
      case 'toggle-grouping':
        store.patch({ cargoLayoutGroupingMode: store.getState().cargoLayoutGroupingMode === 'mission' ? 'destination' : 'mission' }); break;
      case 'reset-layout':
        cargoLayout.reset(selectedModel()); ui.editorSource = null; render(); toast('Automatic layout restored.'); break;
      default:
        if (target.dataset.removeObjective !== undefined) {
          ui.reviewDrafts[ui.selectedMission]?.objectives.splice(Number(target.dataset.removeObjective), 1);
          refreshReportFromDrafts(); render();
        }
    }
  });

  app.addEventListener('input', (event) => {
    if (event.target.matches('[data-mission-field], [data-objective-field]')) updateDraftFromField(event.target);
    if (event.target.id === 'intel-search') {
      ui.intelQuery = event.target.value;
      const container = document.querySelector('.search-results');
      if (container) container.innerHTML = locationResults().map((item) => `<button type="button" class="location-result${item.id === ui.intelLocationId ? ' is-selected' : ''}" data-location-id="${escapeHtml(item.id)}"><strong>${escapeHtml(locations.formatOperationalLabel(item))}</strong><span>In game: ${escapeHtml(item.navigationTarget ?? item.name)}</span></button>`).join('');
    }
    if (event.target.dataset.strategyWeight) {
      const weights = { ...store.getState().routeStrategyWeights, [event.target.dataset.strategyWeight]: safeNumber(event.target.value) };
      if (!Object.values(weights).some((value) => value > 0)) weights[event.target.dataset.strategyWeight] = 5;
      store.patch({ routeStrategyWeights: weights });
    }
  });

  app.addEventListener('change', (event) => {
    if (event.target.id === 'ocr-file') handleFile(event.target, 'ocr');
    if (event.target.id === 'log-file') handleFile(event.target, 'log');
  });

  app.addEventListener('dragstart', (event) => {
    const cell = event.target.closest('.cargo-editor-grid .cargo-cell.is-filled');
    if (!cell || !ui.drawer || ui.editorMode !== 'move') return;
    ui.editorSource = cell.dataset.cargoCell;
    event.dataTransfer?.setData('text/plain', ui.editorSource);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  });

  app.addEventListener('dragover', (event) => {
    if (!ui.editorSource || !event.target.closest('.cargo-editor-grid .cargo-cell')) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  });

  app.addEventListener('drop', (event) => {
    const target = event.target.closest('.cargo-editor-grid .cargo-cell');
    if (!target || !ui.editorSource) return;
    event.preventDefault();
    const sourceId = ui.editorSource;
    ui.editorSource = null;
    try {
      cargoLayout.moveCell(selectedModel(), sourceId, target.dataset.cargoCell, planCargoGrid());
      render();
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  app.addEventListener('submit', (event) => {
    if (event.target.id !== 'add-ship-form') return;
    event.preventDefault();
    const data = new FormData(event.target);
    try {
      const ship = ships.createHangarShip({
        id: `ship-${Date.now()}`,
        modelId: data.get('modelId'),
        nickname: data.get('nickname'),
        quantumDrive: data.get('quantumDrive'),
        quantumTimeFactor: data.get('quantumTimeFactor'),
        notes: data.get('notes')
      });
      store.patch({ hangarShips: [...store.getState().hangarShips, ship], selectedShipId: ship.id, selectedShipModelId: ship.modelId });
      ui.drawer = null;
      toast('Ship added and activated.');
    } catch (error) { toast(error.message, 'error'); }
  });

  root.addEventListener('hashchange', () => {
    const page = location.hash.slice(1);
    if (NAV.some((item) => item.id === page)) { ui.page = page; render(); }
  });
  root.addEventListener('sc:session-change', () => render());
  let compactViewport = root.matchMedia('(max-width: 820px)').matches;
  root.addEventListener('resize', () => {
    const nextCompactViewport = root.matchMedia('(max-width: 820px)').matches;
    if (nextCompactViewport !== compactViewport) {
      compactViewport = nextCompactViewport;
      if (ui.page === 'live') render();
    }
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && ui.drawer) { ui.drawer = null; render(); }
  });

  render();
  root.SCCompanionUI = Object.freeze({
    navigate,
    render,
    inspectContracts(text) {
      ui.report = validator.inspectMissionText(text, locations);
      ui.reviewDrafts = draftsFromReport(ui.report);
      ui.contractStage = 'resolve';
      ui.page = 'contracts';
      render();
      return ui.report;
    },
    setIntelLocation(id) { ui.intelLocationId = id; ui.page = 'intel'; ui.intelTab = 'locations'; render(); },
    openCargoEditor() { ui.page = 'live'; ui.drawer = 'cargo'; render(); },
    getCargoCellOccupancy,
    getRelevantLocationForStep,
    getLocationServiceStatus,
    state: ui
  });
}(window));
