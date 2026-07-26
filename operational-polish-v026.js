'use strict';

(function initializeOperationalPolishV026(root) {
  const store = root.SCCompanionSession;
  if (!store) return;

  const locations = root.SCCompanionLocations;
  const icons = root.SCCompanionMfdIcons;

  function normalize(value) {
    return locations?.normalizeSearchTerm?.(value) ?? String(value ?? '').trim().toLowerCase();
  }

  function chooseLocation(query) {
    if (!locations || !String(query ?? '').trim()) return null;
    const cleanQuery = String(query).split('·')[0].trim();
    const target = normalize(cleanQuery);
    const matches = locations.searchOperationalLocations(cleanQuery, { limit: 12 }) ?? [];
    return matches.find((location) => [
      location.navigationTarget,
      location.name,
      locations.formatOperationalLabel(location),
      ...(location.aliases ?? [])
    ].filter(Boolean).some((value) => normalize(String(value).split('·')[0]) === target))
      ?? (matches.length === 1 ? matches[0] : null);
  }

  function setCheckIcon(element) {
    if (!element || element.dataset.iconState === 'check') return;
    const check = icons?.render?.('check', 'mission-icon') ?? '';
    if (check) element.innerHTML = check;
    element.dataset.iconState = 'check';
  }

  function cleanLocationSuggestions() {
    document.querySelectorAll('#mission-start-location-list option').forEach((option) => {
      if (option.hasAttribute('label')) option.removeAttribute('label');
    });
  }

  function normalizeRunSheetLocations() {
    if (!locations) return;
    document.querySelectorAll('.mission-review-card-v26').forEach((card) => {
      let ready = true;
      card.querySelectorAll('[data-objective]').forEach((row) => {
        const input = row.querySelector('[data-field="location"]');
        const display = row.querySelector('.mission-location-name');
        const flag = row.querySelector('.location-state-v26');
        if (!input || !display || !flag) return;

        const parts = String(input.value ?? '').split('+').map((part) => part.trim()).filter(Boolean);
        const resolved = parts.map(chooseLocation);
        if (!parts.length || resolved.some((location) => !location)) {
          ready = false;
          return;
        }

        const inputValue = resolved.map((location) => location.navigationTarget ?? location.name).join(' + ');
        const displayValue = resolved.map((location) => locations.formatOperationalLabel(location)).join(' + ');
        if (input.value !== inputValue) input.value = inputValue;
        if (display.textContent !== displayValue) display.textContent = displayValue;
        if (flag.className !== 'location-state-v26 is-ready') flag.className = 'location-state-v26 is-ready';
        if (flag.title !== 'Matched to the location database') flag.title = 'Matched to the location database';
        if (flag.getAttribute('aria-label') !== flag.title) flag.setAttribute('aria-label', flag.title);
        setCheckIcon(flag);
      });

      const headerFlag = card.querySelector('.mission-location-flag');
      if (headerFlag && ready) {
        if (headerFlag.className !== 'mission-location-flag is-ready') headerFlag.className = 'mission-location-flag is-ready';
        if (headerFlag.title !== 'All locations matched') headerFlag.title = 'All locations matched';
        if (headerFlag.getAttribute('aria-label') !== headerFlag.title) headerFlag.setAttribute('aria-label', headerFlag.title);
        setCheckIcon(headerFlag);
      }
    });
  }

  function renderTravelOnlySessionLabels(state = store.getState()) {
    const sessions = state.routePlan?.sessions ?? [];
    document.querySelectorAll('#ops-session-tabs [data-session-index]').forEach((button) => {
      const session = sessions[Number(button.dataset.sessionIndex)];
      const detail = button.querySelector('small');
      if (!session || !detail) return;
      const minutes = Math.max(0, Math.round(session.estimate?.travelMinutes ?? session.estimate?.budgetMinutes ?? session.estimate?.maxMinutes ?? 0));
      const value = `~${minutes} min travel · ${session.estimate?.peakOnboardScu ?? 0} SCU peak`;
      if (detail.textContent !== value) detail.textContent = value;
    });

    const summary = document.querySelector('#ops-session-summary');
    if (summary && sessions.length) {
      const value = `${sessions.length} session${sessions.length === 1 ? '' : 's'} · max ${state.sessionTargetMinutes ?? 60} min travel`;
      if (summary.textContent !== value) summary.textContent = value;
    }
  }

  function polish(state = store.getState()) {
    cleanLocationSuggestions();
    normalizeRunSheetLocations();
    renderTravelOnlySessionLabels(state);
  }

  let scheduled = false;
  function schedule(state) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      polish(state);
    });
  }

  root.addEventListener('sc:session-change', (event) => schedule(event.detail));
  root.addEventListener('hashchange', () => schedule());
  const observer = new MutationObserver(() => schedule());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  polish();
}(typeof globalThis !== 'undefined' ? globalThis : window));
