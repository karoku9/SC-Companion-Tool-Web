'use strict';

(function initializeFocusedMissionWorkflow() {
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
    const routePlanner = window.SCCompanionRoutePlanner;
    const validator = window.SCCompanionMissionValidation;
    const missionModel = window.SCCompanionMissions;
    const locationModel = window.SCCompanionLocations;
    if (!page || !grid || !form || !validation || !output || !gameLog || !ocr || !text || !message || !store || !routePlanner || !validator || !missionModel || !locationModel) return false;
    initialized = true;

    let sourceText = text.value;
    let report = null;
    let reviewDrafts = [];
    let activeMission = 0;
    let generatedRoute = null;

    page.querySelector('.page-header h2').textContent = 'Mission intake';
    page.querySelector('.page-header p').textContent = 'Paste contracts or paste a screenshot, verify one mission at a time, then build the route.';
    page.querySelector('.page-header .status-tag')?.remove();

    const steps = document.createElement('nav');
    steps.className = 'mission-steps';
    steps.setAttribute('aria-label', 'Mission intake progress');
    steps.innerHTML = `
      <button type="button" data-stage="input" aria-current="step"><span>1</span><strong>Input</strong></button>
      <button type="button" data-stage="review" disabled><span>2</span><strong>Review</strong></button>
      <button type="button" data-stage="route" disabled><span>3</span><strong>Route</strong></button>`;

    const stage = document.createElement('div');
    stage.className = 'mission-stage';
    grid.replaceChildren(steps, stage);
    stage.append(form, validation, output);

    const formHeader = form.querySelector(':scope > .mfd-header');
    if (formHeader) formHeader.remove();
    const formActions = form.querySelector('.form-actions');
    const submit = form.querySelector('button[type="submit"]');
    const reset = form.querySelector('#reset-session');
    submit.textContent = 'Analyze missions';

    const inputTools = document.createElement('div');
    inputTools.className = 'mission-input-tools';
    inputTools.innerHTML = `
      <button type="button" class="mission-input-choice is-active" data-input="text"><strong>Text</strong><small>Paste or type contracts</small></button>
      <button type="button" class="mission-input-choice" data-input="screenshot"><strong>Screenshot</strong><small>Win+Shift+S, then Ctrl+V</small></button>`;
    form.insertBefore(inputTools, text);

    const experimental = document.createElement('details');
    experimental.className = 'mission-experimental';
    experimental.innerHTML = '<summary><strong>Experimental Game.log import</strong><span>Optional · may not contain useful hauling data</span></summary>';
    experimental.append(gameLog);
    form.append(experimental);
    form.insertBefore(ocr, experimental);

    validation.innerHTML = `
      <header class="mission-review-heading">
        <div><small>REVIEW</small><strong id="focused-review-title">Mission</strong></div>
        <span id="focused-review-count">0 / 0</span>
      </header>
      <div class="mission-review-alerts" id="focused-review-alerts"></div>
      <div class="mission-review-single" id="focused-review-single"></div>
      <footer class="mission-review-controls">
        <button type="button" class="button button--secondary" id="focused-review-prev">Previous</button>
        <button type="button" class="button button--secondary" id="focused-review-validate">Validate changes</button>
        <button type="button" class="button button--secondary" id="focused-review-next">Next</button>
        <button type="button" class="button button--primary" id="focused-review-generate">Generate route</button>
      </footer>`;

    output.innerHTML = `
      <header class="mission-route-heading"><div><small>ROUTE</small><strong id="focused-route-title">No route generated</strong></div></header>
      <div class="mission-route-summary" id="focused-route-summary"></div>
      <footer class="mission-route-actions">
        <button type="button" class="button button--secondary" data-route-edit>Edit missions</button>
        <button type="button" class="button button--primary" data-shell-link="route">Open Operations</button>
      </footer>`;

    const reviewTitle = validation.querySelector('#focused-review-title');
    const reviewCount = validation.querySelector('#focused-review-count');
    const reviewAlerts = validation.querySelector('#focused-review-alerts');
    const reviewSingle = validation.querySelector('#focused-review-single');
    const prev = validation.querySelector('#focused-review-prev');
    const next = validation.querySelector('#focused-review-next');
    const validate = validation.querySelector('#focused-review-validate');
    const generate = validation.querySelector('#focused-review-generate');
    const routeTitle = output.querySelector('#focused-route-title');
    const routeSummary = output.querySelector('#focused-route-summary');

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
      if (name === 'review') renderActiveMission();
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
          objectives: nextReport.entries.filter((entry) => entry.kind === 'action' && entry.missionKey === titleEntry.key).map((entry) => ({
            action: entry.action,
            location: entry.rawLocation,
            cargo: entry.cargoText
          }))
        };
      });
    }

    function serializeDrafts() {
      return reviewDrafts.map((mission) => {
        const lines = [mission.title.trim()];
        if (mission.contractor.trim()) lines.push(`contractor ${mission.contractor.trim()}`);
        const reward = Number(String(mission.rewardAuec).replace(/[^\d.]/g, ''));
        if (reward > 0) lines.push(`paga ${reward.toLocaleString('en-US')} aUEC`);
        mission.objectives.forEach((objective) => lines.push(`${objective.action} ${objective.location} ${objective.cargo}`.trim()));
        return lines.join('\n');
      }).join('\n\n');
    }

    function analyze(source = text.value, preserveDrafts = false) {
      sourceText = source;
      report = validator.inspectMissionText(source, locationModel);
      text.value = source;
      if (!preserveDrafts) reviewDrafts = draftsFromReport(report);
      activeMission = Math.min(activeMission, Math.max(0, reviewDrafts.length - 1));
      steps.querySelector('[data-stage="review"]').disabled = reviewDrafts.length === 0;
      steps.querySelector('[data-stage="route"]').disabled = true;
      generatedRoute = null;
      setStage('review');
    }

    function applyVisibleMission() {
      const card = reviewSingle.querySelector('[data-focused-mission]');
      const draft = reviewDrafts[activeMission];
      if (!card || !draft) return;
      draft.title = card.querySelector('[data-field="title"]')?.value ?? draft.title;
      draft.contractor = card.querySelector('[data-field="contractor"]')?.value ?? draft.contractor;
      draft.rewardAuec = card.querySelector('[data-field="reward"]')?.value ?? draft.rewardAuec;
      draft.objectives = [...card.querySelectorAll('[data-objective]')].map((row) => ({
        action: row.querySelector('[data-field="action"]')?.value ?? '',
        location: row.querySelector('[data-field="location"]')?.value ?? '',
        cargo: row.querySelector('[data-field="cargo"]')?.value ?? ''
      }));
    }

    function missionIssues(index) {
      const missionKey = `mission-${index}`;
      return report?.issues.filter((item) => item.entryKey?.startsWith(missionKey) || item.message?.includes(reviewDrafts[index]?.title)) ?? [];
    }

    function renderActiveMission() {
      const draft = reviewDrafts[activeMission];
      reviewSingle.replaceChildren();
      reviewAlerts.replaceChildren();
      if (!draft) {
        reviewTitle.textContent = 'No mission detected';
        reviewCount.textContent = '0 / 0';
        generate.disabled = true;
        return;
      }
      reviewTitle.textContent = draft.title || `Mission ${activeMission + 1}`;
      reviewCount.textContent = `${activeMission + 1} / ${reviewDrafts.length}`;
      const issues = missionIssues(activeMission);
      issues.forEach((item) => {
        const alert = document.createElement('p');
        alert.className = `is-${item.severity}`;
        alert.textContent = item.message;
        reviewAlerts.append(alert);
      });
      if (!issues.length) reviewAlerts.innerHTML = '<p class="is-ready">This mission is ready.</p>';

      const card = document.createElement('article');
      card.dataset.focusedMission = 'true';
      card.innerHTML = `
        <div class="mission-meta-fields">
          <label>Mission name<input data-field="title" value="${escapeHtml(draft.title)}"></label>
          <label>Contractor<input data-field="contractor" value="${escapeHtml(draft.contractor)}" placeholder="Optional"></label>
          <label>Reward aUEC<input data-field="reward" inputmode="numeric" value="${escapeHtml(draft.rewardAuec)}" placeholder="Optional"></label>
        </div>
        <div class="mission-objective-lines"></div>`;
      const lines = card.querySelector('.mission-objective-lines');
      draft.objectives.forEach((objective, index) => {
        const row = document.createElement('div');
        row.dataset.objective = String(index);
        row.innerHTML = `
          <select data-field="action" aria-label="Action"><option value="collect">COLLECT</option><option value="pickup">PICKUP</option><option value="deliver">DELIVER</option></select>
          <input data-field="location" aria-label="Location" value="${escapeHtml(objective.location)}">
          <input data-field="cargo" aria-label="Cargo" value="${escapeHtml(objective.cargo)}">`;
        row.querySelector('[data-field="action"]').value = objective.action;
        lines.append(row);
      });
      reviewSingle.append(card);
      prev.disabled = activeMission === 0;
      next.disabled = activeMission >= reviewDrafts.length - 1;
      generate.disabled = !report?.ready;
      generate.textContent = report?.ready ? 'Generate route' : 'Resolve errors first';
    }

    function validateChanges() {
      applyVisibleMission();
      const source = serializeDrafts();
      report = validator.inspectMissionText(source, locationModel);
      text.value = source;
      reviewDrafts = draftsFromReport(report);
      activeMission = Math.min(activeMission, Math.max(0, reviewDrafts.length - 1));
      renderActiveMission();
    }

    function generateRoute() {
      validateChanges();
      if (!report?.ready) return;
      try {
        generatedRoute = routePlanner.buildRoute(report.missions, missionModel);
        store.patch({
          missionSourceText: sourceText,
          missionText: text.value,
          missionValidation: validator.snapshot(report, sourceText, text.value),
          missions: report.missions,
          route: generatedRoute,
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

    function renderRoute() {
      routeSummary.replaceChildren();
      if (!generatedRoute) {
        routeTitle.textContent = 'No route generated';
        return;
      }
      const parsedMissions = report.missions;
      const reward = parsedMissions.reduce((sum, mission) => sum + Number(mission.rewardAuec ?? 0), 0);
      routeTitle.textContent = `${generatedRoute.stops.length} stops ready`;
      const overview = document.createElement('div');
      overview.className = 'mission-route-overview';
      overview.innerHTML = `<strong>${parsedMissions.length} missions</strong><span>${generatedRoute.totalCargoScu} SCU total</span><span>${reward ? `${reward.toLocaleString('en-US')} aUEC` : 'Reward not provided'}</span>`;
      const list = document.createElement('ol');
      generatedRoute.stops.forEach((stop) => {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${escapeHtml(stop.locationLabel)}</strong><span>${stop.operations.length} operation${stop.operations.length === 1 ? '' : 's'}</span>`;
        list.append(item);
      });
      routeSummary.append(overview, list);
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
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
      generatedRoute = null;
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
    prev.addEventListener('click', () => { applyVisibleMission(); activeMission -= 1; renderActiveMission(); });
    next.addEventListener('click', () => { applyVisibleMission(); activeMission += 1; renderActiveMission(); });
    validate.addEventListener('click', validateChanges);
    generate.addEventListener('click', generateRoute);
    output.querySelector('[data-route-edit]').addEventListener('click', () => setStage('review'));
    form.addEventListener('click', (event) => {
      if (event.target.closest('#ocr-use-draft')) setTimeout(() => analyze(text.value), 20);
      if (event.target.closest('#game-log-use-draft')) setTimeout(() => analyze(text.value), 20);
    });

    setInputMode('text');
    setStage('input');
    return true;
  }

  const observer = new MutationObserver(() => {
    if (initialize()) observer.disconnect();
  });
  if (!initialize()) observer.observe(document.documentElement, { childList: true, subtree: true });
}());