'use strict';

(function initializeOperationalPolishV026(root) {
  const store = root.SCCompanionSession;
  if (!store) return;

  function renderTravelOnlySessionLabels(state = store.getState()) {
    const sessions = state.routePlan?.sessions ?? [];
    document.querySelectorAll('#ops-session-tabs [data-session-index]').forEach((button) => {
      const session = sessions[Number(button.dataset.sessionIndex)];
      const detail = button.querySelector('small');
      if (!session || !detail) return;
      const minutes = Math.max(0, Math.round(session.estimate?.travelMinutes ?? session.estimate?.budgetMinutes ?? session.estimate?.maxMinutes ?? 0));
      detail.textContent = `~${minutes} min travel · ${session.estimate?.peakOnboardScu ?? 0} SCU peak`;
    });

    const summary = document.querySelector('#ops-session-summary');
    if (summary && sessions.length) {
      summary.textContent = `${sessions.length} session${sessions.length === 1 ? '' : 's'} · max ${state.sessionTargetMinutes ?? 60} min travel`;
    }
  }

  root.addEventListener('sc:session-change', (event) => requestAnimationFrame(() => renderTravelOnlySessionLabels(event.detail)));
  root.addEventListener('hashchange', () => requestAnimationFrame(() => renderTravelOnlySessionLabels()));
  const observer = new MutationObserver(() => renderTravelOnlySessionLabels());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  renderTravelOnlySessionLabels();
}(typeof globalThis !== 'undefined' ? globalThis : window));
