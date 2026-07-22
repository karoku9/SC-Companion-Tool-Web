'use strict';

(function bootstrapMissionView() {
  let initialized = false;

  function initialize() {
    if (initialized) return true;
    const store = window.SCCompanionSession;
    const validator = window.SCCompanionMissionValidation;
    const missionModel = window.SCCompanionMissions;
    const routePlanner = window.SCCompanionRoutePlanner;
    const locationModel = window.SCCompanionLocations;
    const form = document.querySelector('#mission-form');
    if (!store || !validator || !missionModel || !routePlanner || !locationModel || !form) return false;
    initialized = true;

    const text = document.querySelector('#mission-text');
    const message = document.querySelector('#mission-message');
    const cards = document.querySelector('#mission-cards');
    const outputTitle = document.querySelector('#mission-preview-title');
    const outputCount = document.querySelector('#mission-summary-count');
    const grid = document.querySelector('.missions-grid');
    const outputPanel = form.nextElementSibling;
    const submit = form.querySelector('button[type="submit"]');
    const reset = document.querySelector('#reset-session');

    submit.textContent = 'Review contracts';
    outputPanel.classList.remove('mission-preview');
    outputPanel.classList.add('mission-output');
    outputPanel.querySelector('.mfd-header small').textContent = 'OUTPUT / GENERATED SESSION';

    const validationPanel = document.createElement('section');
    validationPanel.className = 'mfd-panel mission-validation-panel';
    validationPanel.id = 'mission-validation-panel';
    validationPanel.setAttribute('aria-labelledby', 'mission-validation-title');
    validationPanel.innerHTML = `
      <header class="mfd-header">
        <div><small>REVIEW / FIELD CONFIDENCE</small><strong id="mission-validation-title">Not reviewed</strong></div>
        <span id="mission-validation-confidence">—</span>
      </header>
      <div class="mission-validation-summary" id="mission-validation-summary"></div>
      <div class="mission-validation-issues" id="mission-validation-issues" aria-live="polite"></div>
      <div class="mission-review-list" id="mission-review-list"></div>
      <footer class="mission-validation-actions">
        <div>
          <button type="button" class="button button--secondary" id="mission-apply-review">Apply review edits</button>
          <button type="button" class="button button--secondary" id="mission-restore-source">Restore original source</button>
        </div>
        <button type="button" class="button button--primary" id="mission-generate-validated" disabled>Generate validated session</button>
      </footer>`;
    grid.insertBefore(validationPanel, outputPanel);

    const validationTitle = validationPanel.querySelector('#mission-validation-title');
    const validationConfidence = validationPanel.querySelector('#mission-validation-confidence');
    const validationSummary = validationPanel.querySelector('#mission-validation-summary');
    const issueList = validationPanel.querySelector('#mission-validation-issues');
    const reviewList = validationPanel.querySelector('#mission-review-list');
    const applyReviewButton = validationPanel.querySelector('#mission-apply-review');
    const restoreSourceButton = validationPanel.querySelector('#mission-restore-source');
    const generateButton = validationPanel.querySelector('#mission-generate-validated');

    const locationList = document.createElement('datalist');
    locationList.id = 'mission-location-options';
    locationModel.locations.filter((location) => location.operational).forEach((location) => {
      const option = document.createElement('option');
      option.value = location.navigationTarget ?? location.name;
      option.label = locationModel.formatOperationalLabel(location);
      locationList.append(option);
    });
    validationPanel.append(locationList);

    let latestReport = null;
    let sourceText = '';
    let confirmedCustomLocations = {};
    let reviewIsStale = true;

    function confidenceLabel(report) {
      if (report.status === 'blocked') return 'Blocked';
      if (report.status === 'review') return 'Ready with warnings';
      return 'Ready';
    }

    function renderMissions(missions) {
      cards.replaceChildren();
      outputTitle.textContent = missions.length
        ? `${missions.length} mission${missions.length === 1 ? '' : 's'} generated`
        : 'No generated session';
      outputCount.textContent = String(missions.length);
      missions.forEach((mission) => {
        const card = document.createElement('article');
        card.className = 'mission-card';
        const heading = document.createElement('h4');
        heading.textContent = mission.title;
        const confidence = document.createElement('span');
        confidence.className = 'mission-card-confidence';
        confidence.textContent = Number.isFinite(mission.confidence) ? `${mission.confidence}% confidence` : 'Legacy session';
        const list = document.createElement('ul');
        mission.cargoLots.forEach((lot) => {
          const item = document.createElement('li');
          const primary = document.createElement('strong');
          primary.textContent = `${lot.scu} SCU ${lot.commodity}`;
          const path = document.createElement('span');
          path.textContent = `${lot.pickupLocationLabel} → ${lot.deliveryLocationLabel}`;
          const provenance = document.createElement('small');
          provenance.textContent = lot.source?.pickupLine && lot.source?.deliveryLine
            ? `Source lines ${lot.source.pickupLine} → ${lot.source.deliveryLine}`
            : 'Source provenance unavailable';
          item.append(primary, path, provenance);
          list.append(item);
        });
        card.append(heading, confidence, list);
        cards.append(card);
      });
    }

    function metric(label, value, tone = '') {
      const item = document.createElement('div');
      if (tone) item.className = `is-${tone}`;
      const key = document.createElement('span');
      key.textContent = label;
      const number = document.createElement('strong');
      number.textContent = String(value);
      item.append(key, number);
      return item;
    }

    function renderIssues(report) {
      issueList.replaceChildren();
      if (!report.issues.length) {
        const empty = document.createElement('div');
        empty.className = 'validation-empty';
        empty.textContent = 'All required fields resolve without warnings.';
        issueList.append(empty);
        return;
      }
      report.issues.forEach((item) => {
        const row = document.createElement('article');
        row.className = `validation-issue is-${item.severity}`;
        const code = document.createElement('span');
        code.textContent = item.line ? `LINE ${item.line}` : item.severity.toUpperCase();
        const detail = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = item.code.replace(/-/g, ' ');
        const body = document.createElement('p');
        body.textContent = item.message;
        detail.append(title, body);
        row.append(code, detail);
        issueList.append(row);
      });
    }

    function fieldStatus(entry) {
      if (entry.location.status === 'exact') return { label: 'Verified', tone: 'ready' };
      if (entry.location.status === 'probable') return { label: 'Probable', tone: 'warning' };
      if (entry.location.status === 'custom-confirmed') return { label: 'Custom confirmed', tone: 'warning' };
      if (entry.location.status === 'ambiguous') return { label: 'Select location', tone: 'danger' };
      return { label: 'Unverified', tone: 'danger' };
    }

    function buildActionRow(entry) {
      const row = document.createElement('div');
      row.className = 'mission-review-row';
      row.dataset.entryKey = entry.key;

      const line = document.createElement('span');
      line.className = 'mission-review-line';
      line.textContent = `L${entry.line}`;

      const actionLabel = document.createElement('label');
      actionLabel.textContent = 'Action';
      const action = document.createElement('select');
      action.dataset.reviewAction = 'true';
      validator.ACTIONS.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        option.selected = value === entry.action;
        action.append(option);
      });
      actionLabel.append(action);

      const locationLabel = document.createElement('label');
      locationLabel.textContent = 'Location';
      const location = document.createElement('input');
      location.dataset.reviewLocation = 'true';
      location.setAttribute('list', locationList.id);
      location.value = entry.rawLocation;
      locationLabel.append(location);

      const cargoLabel = document.createElement('label');
      cargoLabel.textContent = 'Cargo';
      const cargo = document.createElement('input');
      cargo.dataset.reviewCargo = 'true';
      cargo.value = entry.cargoText;
      cargo.placeholder = '2scu etam 1scu neon';
      cargoLabel.append(cargo);

      const statusInfo = fieldStatus(entry);
      const status = document.createElement('span');
      status.className = `mission-field-status is-${statusInfo.tone}`;
      status.textContent = statusInfo.label;

      row.append(line, actionLabel, locationLabel, cargoLabel, status);

      if (entry.location.candidates.length) {
        const suggestions = document.createElement('div');
        suggestions.className = 'mission-location-suggestions';
        const heading = document.createElement('span');
        heading.textContent = 'Suggestions';
        suggestions.append(heading);
        entry.location.candidates.forEach((candidate) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'mission-suggestion';
          button.dataset.suggestion = candidate.navigationTarget;
          button.textContent = candidate.label;
          button.addEventListener('click', () => {
            location.value = candidate.navigationTarget;
            applyReview();
          });
          suggestions.append(button);
        });
        row.append(suggestions);
      }

      if (entry.location.status === 'unknown' || entry.location.status === 'custom-confirmed') {
        const confirmation = document.createElement('label');
        confirmation.className = 'mission-custom-confirmation';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.confirmCustom = 'true';
        checkbox.checked = entry.location.status === 'custom-confirmed';
        const copy = document.createElement('span');
        copy.textContent = 'Keep as custom location. Navigation distance and verified location context will be unavailable.';
        confirmation.append(checkbox, copy);
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) confirmedCustomLocations[entry.key] = location.value;
          else delete confirmedCustomLocations[entry.key];
          applyReview();
        });
        row.append(confirmation);
      }

      [action, location, cargo].forEach((control) => control.addEventListener('input', markReviewEditsPending));
      return row;
    }

    function renderReview(report) {
      reviewList.replaceChildren();
      const titleEntries = report.entries.filter((entry) => entry.kind === 'title');
      titleEntries.forEach((titleEntry) => {
        const mission = document.createElement('article');
        mission.className = 'mission-review-card';
        mission.dataset.missionKey = titleEntry.key;
        const header = document.createElement('header');
        const line = document.createElement('span');
        line.textContent = `MISSION ${titleEntry.missionIndex + 1} · LINE ${titleEntry.line}`;
        const title = document.createElement('input');
        title.dataset.reviewTitle = 'true';
        title.value = titleEntry.title;
        title.setAttribute('aria-label', `Mission ${titleEntry.missionIndex + 1} title`);
        title.addEventListener('input', markReviewEditsPending);
        header.append(line, title);
        mission.append(header);
        report.entries
          .filter((entry) => entry.kind === 'action' && entry.missionKey === titleEntry.key)
          .forEach((entry) => mission.append(buildActionRow(entry)));
        reviewList.append(mission);
      });

      const orphanEntries = report.entries.filter((entry) => entry.kind === 'action' && entry.missionIndex < 0);
      orphanEntries.forEach((entry) => {
        const orphan = document.createElement('article');
        orphan.className = 'mission-review-card is-blocked';
        const header = document.createElement('header');
        header.innerHTML = `<span>ORPHAN OBJECTIVE · LINE ${entry.line}</span><strong>Add a mission title in the source text.</strong>`;
        orphan.append(header, buildActionRow(entry));
        reviewList.prepend(orphan);
      });
    }

    function renderValidation(report) {
      latestReport = report;
      reviewIsStale = false;
      validationPanel.dataset.status = report.status;
      validationTitle.textContent = confidenceLabel(report);
      validationConfidence.textContent = `${report.confidence}%`;
      validationSummary.replaceChildren(
        metric('Missions', report.summary.missionCount),
        metric('Cargo lots', report.summary.cargoLotCount),
        metric('Blockers', report.summary.blockerCount, report.summary.blockerCount ? 'danger' : 'ready'),
        metric('Warnings', report.summary.warningCount, report.summary.warningCount ? 'warning' : 'ready')
      );
      renderIssues(report);
      renderReview(report);
      generateButton.disabled = !report.ready;
      generateButton.textContent = report.ready
        ? report.warnings.length ? 'Generate with reviewed warnings' : 'Generate validated session'
        : 'Resolve blockers before generating';
      applyReviewButton.disabled = false;
      restoreSourceButton.disabled = !sourceText || text.value === sourceText;
    }

    function collectReviewMissions() {
      return [...reviewList.querySelectorAll('.mission-review-card[data-mission-key]')].map((mission) => ({
        title: mission.querySelector('[data-review-title]')?.value ?? '',
        objectives: [...mission.querySelectorAll('.mission-review-row')].map((row) => ({
          action: row.querySelector('[data-review-action]')?.value ?? '',
          location: row.querySelector('[data-review-location]')?.value ?? '',
          cargo: row.querySelector('[data-review-cargo]')?.value ?? ''
        }))
      }));
    }

    function inspect(value) {
      return validator.inspectMissionText(value, locationModel, { confirmedCustomLocations });
    }

    function reviewSource({ preserveSource = false } = {}) {
      if (!preserveSource || !sourceText) sourceText = text.value;
      confirmedCustomLocations = preserveSource ? confirmedCustomLocations : {};
      const report = inspect(text.value);
      renderValidation(report);
      message.className = report.blockingIssues.length ? 'form-message is-error' : report.warnings.length ? 'form-message is-warning' : 'form-message is-success';
      message.textContent = report.blockingIssues.length
        ? `${report.blockingIssues.length} blocking issue${report.blockingIssues.length === 1 ? '' : 's'} must be resolved.`
        : report.warnings.length
          ? `Review complete with ${report.warnings.length} warning${report.warnings.length === 1 ? '' : 's'}.`
          : 'Review complete. All required fields are verified.';
    }

    function applyReview() {
      const reviewedText = validator.serializeReview(collectReviewMissions());
      if (!reviewedText.trim()) {
        message.className = 'form-message is-error';
        message.textContent = 'No reviewable missions remain.';
        return;
      }
      text.value = reviewedText;
      const report = inspect(reviewedText);
      renderValidation(report);
      message.className = report.blockingIssues.length ? 'form-message is-error' : report.warnings.length ? 'form-message is-warning' : 'form-message is-success';
      message.textContent = report.blockingIssues.length
        ? 'Edits applied. Resolve the remaining blockers.'
        : 'Edits applied and revalidated.';
    }

    function markReviewEditsPending() {
      if (reviewIsStale) return;
      reviewIsStale = true;
      validationPanel.dataset.status = 'stale';
      validationTitle.textContent = 'Edits pending';
      validationConfidence.textContent = '—';
      generateButton.disabled = true;
      generateButton.textContent = 'Apply edits before generating';
    }

    function markSourceChanged() {
      if (latestReport && text.value === latestReport.originalText) return;
      reviewIsStale = true;
      latestReport = null;
      sourceText = text.value;
      confirmedCustomLocations = {};
      validationPanel.dataset.status = 'stale';
      validationTitle.textContent = 'Source changed';
      validationConfidence.textContent = '—';
      validationSummary.replaceChildren();
      issueList.innerHTML = '<div class="validation-empty">Review the updated source before generating.</div>';
      reviewList.replaceChildren();
      generateButton.disabled = true;
      generateButton.textContent = 'Review source before generating';
      restoreSourceButton.disabled = true;
    }

    function generateValidatedSession() {
      if (!latestReport || reviewIsStale || !latestReport.ready || text.value !== latestReport.originalText) {
        message.className = 'form-message is-error';
        message.textContent = 'Review the current mission text and resolve every blocker before generating.';
        return;
      }
      try {
        const route = routePlanner.buildRoute(latestReport.missions, missionModel);
        const validationSnapshot = {
          ...validator.snapshot(latestReport, sourceText, text.value),
          confirmedCustomLocations: { ...confirmedCustomLocations }
        };
        store.patch({
          missionSourceText: sourceText,
          missionText: text.value,
          missionValidation: validationSnapshot,
          missions: latestReport.missions,
          route,
          currentStopIndex: 0,
          completedStopIds: [],
          routeCorrections: null,
          cargoCorrections: {}
        });
        renderMissions(latestReport.missions);
        message.className = 'form-message is-success';
        message.textContent = `${route.stops.length} stops generated from a ${latestReport.confidence}% confidence review. Original source and line provenance were retained.`;
      } catch (error) {
        message.className = 'form-message is-error';
        message.textContent = error.message;
      }
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      reviewSource();
    });
    text.addEventListener('input', markSourceChanged);
    applyReviewButton.addEventListener('click', applyReview);
    restoreSourceButton.addEventListener('click', () => {
      if (!sourceText) return;
      text.value = sourceText;
      confirmedCustomLocations = {};
      reviewSource({ preserveSource: true });
    });
    generateButton.addEventListener('click', generateValidatedSession);

    reset.addEventListener('click', () => {
      const state = store.reset();
      text.value = state.missionText;
      sourceText = state.missionText;
      confirmedCustomLocations = {};
      latestReport = null;
      renderMissions([]);
      reviewSource({ preserveSource: true });
      message.className = 'form-message';
      message.textContent = 'Local session reset. Review the sample contracts before generating.';
    });

    const state = store.getState();
    text.value = state.missionText;
    sourceText = state.missionSourceText ?? state.missionValidation?.sourceText ?? state.missionText;
    confirmedCustomLocations = { ...(state.missionValidation?.confirmedCustomLocations ?? {}) };
    renderMissions(state.missions ?? []);
    reviewSource({ preserveSource: true });
    return true;
  }

  if (!initialize()) {
    import('./mission-validation.js')
      .then(initialize)
      .catch((error) => console.error('Mission validation runtime failed to load.', error));
  }
}());
