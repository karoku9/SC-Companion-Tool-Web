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
    intelTab: 'locations',
    intelQuery: 'Lorville',
    intelLocationId: 'stanton-hurston-lorville-teasa',
    drawer: null,
    editorMode: 'move',
    editorGroup: null,
    editorSource: null,
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
      <div class="app-shell">
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

  function configureMarkup() {
    const state = store.getState();
    const routeMode = state.routeMode === 'fastest' ? 'fastest' : 'sessions';
    return `<div class="configure-layout">
      <section class="panel">
        <div class="panel-heading"><strong>Route constraints</strong><span class="tag tag-ready">${ui.report?.missions.length ?? 0} missions verified</span></div>
        <div class="panel-body configure-grid">
          <div>
            <div class="form-row">
              <label>Current location<select id="route-start">${locationOptions(state.routeStartLocationId || 'stanton-hurston-lorville-teasa')}</select></label>
              <label>Active ship<select id="route-ship">${shipOptions(state.selectedShipId)}</select></label>
            </div>
            <p class="eyebrow" style="margin:20px 0 8px">Planning method</p>
            <div class="mode-picker">
              <button class="mode-option" type="button" data-route-mode="fastest" aria-pressed="${routeMode === 'fastest'}"><strong>Fastest full route</strong><span>Keep every mission in one optimized run.</span></button>
              <button class="mode-option" type="button" data-route-mode="sessions" aria-pressed="${routeMode === 'sessions'}"><strong>Time-boxed sessions</strong><span>Group complete missions into playable blocks.</span></button>
            </div>
            <label id="duration-field" style="margin-top:14px" ${routeMode === 'fastest' ? 'hidden' : ''}>Maximum travel time per session
              <input id="route-duration" type="number" min="5" max="600" step="5" value="${safeNumber(state.sessionTargetMinutes, 60)}">
            </label>
          </div>
          <aside>
            <p class="eyebrow">Verified manifest</p>
            <ul class="verified-list">${(ui.report?.missions ?? []).map((mission) => `<li><span>${escapeHtml(mission.title)}</span><strong>${formatScu(mission.cargoLots.reduce((sum, lot) => sum + lot.scu, 0))}</strong></li>`).join('')}</ul>
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
      <div class="plan-detail">
        <section class="panel"><div class="panel-heading"><strong>Ordered route · ${escapeHtml(selected.title)}</strong><span class="tag">${selected.route.stops.length} stops</span></div><div class="panel-body"><ol class="route-order">
          ${selected.route.stops.map((stop, index) => `<li><b>${String(index + 1).padStart(2, '0')}</b><span><strong>${escapeHtml(stop.locationLabel)}</strong><br><small class="muted">${stop.operations.map((op) => `${operationVerb(op.type)} ${op.scu} SCU ${op.commodity}`).join(' · ')}</small></span><span class="tag ${stop.operations.some((op) => op.type === 'delivery') ? 'tag-ready' : 'tag-active'}">${stop.operations.some((op) => op.type === 'delivery') ? 'Delivery' : 'Pickup'}</span></li>`).join('')}
        </ol></div></section>
        <aside class="panel"><div class="panel-heading"><strong>Included contracts</strong><span class="tag">${selected.missionCount}</span></div><div class="panel-body"><ul class="verified-list">${selected.missionTitles.map((title) => `<li><span>${escapeHtml(title)}</span><span class="success">Ready</span></li>`).join('')}</ul><button class="button button-primary" style="width:100%;margin-top:16px" type="button" data-start-session="${ui.selectedSession}">Start ${escapeHtml(selected.title)} →</button></div></aside>
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
    return `<div class="cargo-grid${editor ? ' cargo-editor-grid' : ''}" style="--grid-columns:${geometry.columns};--grid-rows:${geometry.rows}">
      ${sorted.map((cell) => {
        const key = String(cell.groupKey ?? '');
        const group = groups.find((item) => String(item.key) === key);
        const current = currentKeys.has(key);
        const reserved = Boolean(cell.reserved);
        const empty = Boolean(cell.manualEmpty || cell.empty);
        const coordinate = cell.coordinate ?? cell.label ?? cell.id;
        return `<button type="button" class="cargo-cell${key ? ' is-filled' : ''}${current ? ' is-current' : ''}${reserved ? ' is-reserved' : ''}${empty ? ' is-empty' : ''}" data-cargo-cell="${escapeHtml(cell.id)}" data-group="${escapeHtml(key)}" data-layers="${cell.usedLayers ? `${cell.usedLayers}×` : ''}" ${editor && key ? 'draggable="true"' : ''} style="--group-color:${groupColor.get(key) ?? '#8f948e'}" title="${escapeHtml(group?.label ?? (reserved ? 'Reserved cell' : empty ? 'Keep empty' : 'Free cell'))}">${escapeHtml(String(coordinate).replace(':', '·'))}</button>`;
      }).join('')}
    </div>
    <div class="ramp-marker">RAMP / ACCESS · ROW A</div>
    ${groups.length ? `<div class="cargo-legend">${groups.map((group, index) => `<span class="legend-item"><i class="legend-swatch" style="--group-color:${GROUP_COLORS[index % GROUP_COLORS.length]}"></i>${escapeHtml(group.label ?? group.key)} · ${formatScu(group.scu ?? group.totalScu)}</span>`).join('')}</div>` : ''}`;
  }

  function livePage() {
    const state = store.getState();
    if (!state.route) return `<main class="workspace live-workspace">${workspaceHeader('Execution workspace', 'Live Ops', 'Action-first guidance for the active hauling session.')}
      <section class="empty-state"><div class="empty-symbol">▶</div><h2>No active session</h2><p>${state.missions?.length ? 'Your contracts are ready. Build or select a plan to begin operations.' : 'Acquire contracts, verify the cargo flow, and choose a session to begin.'}</p><button class="button button-primary" type="button" data-nav="${state.missions?.length ? 'plan' : 'contracts'}">${state.missions?.length ? 'Open Plan' : 'Add Contracts'}</button></section></main>`;
    const prog = progress(state);
    if (prog?.complete) return `<main class="workspace live-workspace">${workspaceHeader('Execution workspace', 'Session complete', 'All operational steps in this session are complete.')}
      <section class="empty-state"><div class="empty-symbol success">✓</div><h2>Cargo delivered</h2><p>${state.route.missions?.length ?? state.missions.length} missions complete · ${formatScu(state.route.totalCargoScu)} planned cargo handled.</p><button class="button button-primary" type="button" data-nav="plan">Return to Plan</button></section></main>`;
    const step = prog.currentStep;
    const next = prog.nextStep;
    const isAction = step?.kind === 'action';
    const cargo = cargoSnapshot(state);
    const layout = planCargoGrid(state);
    const capacity = selectedShip(state).cargoCapacityScu;
    const onboard = cargo?.totals?.onboardScu ?? layout?.usedScu ?? 0;
    const free = Math.max(0, capacity - onboard);
    const moves = stepMoves(step);
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
            ${moves.length ? `<div class="move-list">${moves.map((op) => `<article class="cargo-move"><span class="tag ${op.type === 'delivery' ? 'tag-ready' : 'tag-active'}">${operationVerb(op.type)}</span><span><strong>${escapeHtml(op.commodity)}</strong><small>${escapeHtml(op.missionTitle)}${op.pickupLocationLabel ? ` · from ${escapeHtml(op.pickupLocationLabel)}` : ''}</small></span><strong>${formatScu(op.scu)}</strong></article>`).join('')}</div>` : `<p class="muted" style="margin-top:22px">${escapeHtml(step.from?.label ? `Depart ${step.from.label} and follow the navigation target.` : 'Follow the in-game navigation target to continue.')}</p>`}
          </div>
          <div class="next-preview"><span class="eyebrow">Next meaningful step</span><br><b>${escapeHtml(next ? `${kindLabel(next.kind)} · ${stepDestination(next)}` : 'Complete session')}</b></div>
        </section>
        <section class="panel cargo-panel">
          <div class="panel-heading"><strong>${escapeHtml(selectedModel(state).manufacturer)} ${escapeHtml(selectedModel(state).model)} · Cargo hold</strong><div><button class="button" type="button" data-action="toggle-grouping">${state.cargoLayoutGroupingMode === 'mission' ? 'By mission' : 'By destination'}</button> <button class="button" type="button" data-open-drawer="cargo">Edit grid</button></div></div>
          <div class="cargo-metrics"><div><strong>${formatScu(onboard)}</strong><span>Onboard</span></div><div><strong>${formatScu(free)}</strong><span>Free</span></div><div><strong>${formatScu(layout?.reservedScu ?? 0)}</strong><span>Reserved</span></div></div>
          <div class="cargo-hold">${layout?.error ? `<p class="danger">Layout impossible: ${escapeHtml(layout.error)}</p>` : cargoGridMarkup(layout, step)}</div>
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
    return `<div class="drawer-backdrop" data-close-drawer></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Route and missions"><header class="drawer-header"><div><span class="eyebrow">Session management</span><h2>Route & missions</h2></div><button class="button icon-button" type="button" data-close-drawer aria-label="Close">×</button></header><div class="drawer-body">
      <p class="editor-note">The active order preserves pickup-before-delivery dependencies and capacity constraints.</p>
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
    const routeMode = document.querySelector('[data-route-mode][aria-pressed="true"]')?.dataset.routeMode ?? 'sessions';
    const sessionTargetMinutes = Math.max(5, safeNumber(document.querySelector('#route-duration')?.value, 60));
    try {
      const plan = sessionPlanner.plan(ui.report.missions, missionModel, {
        startLocationId, selectedShipId, mode: routeMode, targetMinutes: sessionTargetMinutes
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
        routeMode,
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

  function startSession(index) {
    const state = store.getState();
    const session = routePlan(state)?.sessions[index];
    if (!session) return;
    store.patch({
      route: session.route,
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
    if (target.dataset.selectSession !== undefined) { ui.selectedSession = Number(target.dataset.selectSession); render(); return; }
    if (target.dataset.sessionRow !== undefined) { ui.selectedSession = Number(target.dataset.sessionRow); render(); return; }
    if (target.dataset.startSession !== undefined) return startSession(Number(target.dataset.startSession));
    if (target.dataset.routeMode) {
      document.querySelectorAll('[data-route-mode]').forEach((button) => button.setAttribute('aria-pressed', String(button === target)));
      document.querySelector('#duration-field')?.toggleAttribute('hidden', target.dataset.routeMode === 'fastest');
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
      case 'choose-ocr': document.querySelector('#ocr-file')?.click(); break;
      case 'choose-log': document.querySelector('#log-file')?.click(); break;
      case 'add-mission':
        ui.reviewDrafts.push({ title: `Mission ${ui.reviewDrafts.length + 1}`, contractor: '', rewardAuec: '', objectives: [{ action: 'collect', location: '', cargo: '' }, { action: 'deliver', location: '', cargo: '' }] });
        ui.selectedMission = ui.reviewDrafts.length - 1; refreshReportFromDrafts(); render(); break;
      case 'remove-mission':
        ui.reviewDrafts.splice(ui.selectedMission, 1); ui.selectedMission = Math.max(0, ui.selectedMission - 1); refreshReportFromDrafts(); render(); break;
      case 'add-objective':
        ui.reviewDrafts[ui.selectedMission]?.objectives.push({ action: 'collect', location: '', cargo: '' }); refreshReportFromDrafts(); render(); break;
      case 'previous-step': completeStep('previous'); break;
      case 'complete-step': completeStep('complete'); break;
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
    state: ui
  });
}(window));
