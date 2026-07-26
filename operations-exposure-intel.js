'use strict';

(function installOperationsExposureIntel(root) {
  const store = root.SCCompanionSession;
  const corrections = root.SCCompanionRouteCorrections;
  const cargoState = root.SCCompanionCargoState;
  const locationContext = root.SCCompanionLocationContext;
  const icons = root.SCCompanionMfdIcons;
  if (!store || !corrections || !cargoState || !locationContext) return;

  const icon = (name) => icons?.render?.(name, 'ops-icon') ?? '';

  function exposureSnapshot() {
    const state = store.getState();
    if (!state.route) return null;
    const route = corrections.deriveRoute(state.route, state.routeCorrections);
    const progress = state.completedStopIds?.length ? state.completedStopIds : state.currentStopIndex;
    const cargo = cargoState.deriveCargoState(route, progress, state.cargoCorrections);
    const stop = cargo.currentStop ?? route.stops?.at(-1) ?? null;
    if (!stop) return null;
    return {
      stop,
      onboardScu: cargo.totals.onboardScu,
      exposure: locationContext.exposureFor(stop.locationId, { onboardScu: cargo.totals.onboardScu })
    };
  }

  function render() {
    const grid = document.querySelector('.current-stop-intel-grid');
    if (!grid) return;
    const snapshot = exposureSnapshot();
    let card = grid.querySelector('[data-intel="cargo-exposure"]');
    if (!snapshot) {
      card?.remove();
      return;
    }
    if (!card) {
      card = document.createElement('article');
      card.className = 'current-stop-intel-card current-stop-exposure-card';
      card.dataset.intel = 'cargo-exposure';
      grid.append(card);
    }
    const reasons = snapshot.exposure.reasons.join(' ');
    card.className = `current-stop-intel-card current-stop-exposure-card is-${snapshot.exposure.level}`;
    card.innerHTML = `<span class="intel-icon">${icon('cargo')}</span><small>CARGO EXPOSURE</small><strong>${snapshot.exposure.label}</strong><span>${snapshot.onboardScu} SCU onboard. ${reasons}</span>`;
    card.title = `${snapshot.exposure.label}. ${snapshot.onboardScu} SCU onboard. ${reasons}`;
    card.setAttribute('aria-label', card.title);
  }

  let frame = 0;
  function schedule() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => requestAnimationFrame(render));
  }

  root.addEventListener('sc:session-change', schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('.operations-page') ?? document.body, { childList: true, subtree: true });
  schedule();
}(typeof globalThis !== 'undefined' ? globalThis : window));