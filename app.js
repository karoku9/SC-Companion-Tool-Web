'use strict';

(async function loadApplication() {
  try {
    await import('./location-pyro-hotfix-v0293.js');
    await Promise.all([
      import('./fleet-loadouts.js'),
      import('./game-log-intake.js'),
      import('./ocr-intake.js'),
      import('./official-universe-data.js'),
      import('./navigation-estimates.js'),
      import('./location-context.js'),
      import('./route-corrections.js'),
      import('./route-progress.js'),
      import('./route-planner-engine.js'),
      import('./cargo-state.js'),
      import('./cargo-layout.js'),
      import('./cargo-zone-model.js')
    ]);
    await import('./route-operational-steps-v028.js');
    await import('./cargo-auto-layout-v028.js');
    await import('./cargo-ship-grid-profile-v030.js');
    await import('./cargo-auto-layout-v0292.js');
    await import('./cargo-manual-layout-v030.js');
    await import('./fleet-estimate-adapter.js');
    await import('./route-optimization.js');
    await import('./focused-route-optimizer.js');
    await import('./route-locality-hotfix-v0294.js');
    await import('./route-session-planner.js');
    await import('./ui/app-shell.js?v=9');
    window.dispatchEvent(new Event('sc:app-ready'));
  } catch (error) {
    console.error('Application runtime failed to load.', error);
    const root = document.querySelector('#app');
    if (root) root.innerHTML = `<main class="fatal-error"><h1>Unable to initialize</h1><p>${String(error.message ?? error)}</p></main>`;
  }
}());
