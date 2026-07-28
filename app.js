'use strict';

(function initializeLocationWorkspace() {
  const form = document.querySelector('#location-search');
  if (!form) return;
  const currentModel = () => window.SCCompanionLocations;
  const elements = {
    form,
    query: document.querySelector('#location-query'),
    results: document.querySelector('#search-results'),
    title: document.querySelector('#destination-title'),
    navigationTarget: document.querySelector('#navigation-target'),
    type: document.querySelector('#location-type'),
    path: document.querySelector('#location-path')
  };

  function humanizeType(type) {
    const labels = {
      system: 'System', planet: 'Planet', moon: 'Moon', planetoid: 'Planetoid', 'gas-giant': 'Gas giant',
      'asteroid-belt': 'Asteroid belt', 'landing-zone': 'Landing zone', spaceport: 'Spaceport',
      'orbital-station': 'Orbital station', 'asteroid-station': 'Asteroid station',
      'lagrange-point': 'Lagrange point', 'lagrange-station': 'Lagrange station', 'jump-gateway': 'Jump gateway',
      outpost: 'Surface outpost', 'distribution-center': 'Distribution center'
    };
    return labels[type] ?? String(type ?? '').replace(/-/g, ' ');
  }

  function renderSearchResults(results) {
    const model = currentModel();
    elements.results?.replaceChildren();
    if (!elements.results || !results.length || !model) {
      if (elements.results) elements.results.hidden = true;
      return;
    }
    results.forEach((location) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'result-button';
      button.innerHTML = `<strong>${model.formatOperationalLabel(location)}</strong><span>In game: ${location.navigationTarget ?? location.name}</span>`;
      button.addEventListener('click', () => selectLocation(location));
      elements.results.append(button);
    });
    elements.results.hidden = false;
  }

  function selectLocation(location) {
    const model = currentModel();
    if (!location || !model) return;
    if (elements.title) elements.title.textContent = model.formatOperationalLabel(location);
    if (elements.navigationTarget) elements.navigationTarget.textContent = location.navigationTarget ?? location.name;
    if (elements.type) elements.type.textContent = humanizeType(location.type);
    if (elements.path) elements.path.textContent = model.formatLocationPath(location);
    if (elements.query) elements.query.value = location.navigationTarget ?? location.name;
    renderSearchResults([]);
    window.dispatchEvent(new CustomEvent('sc:location-selected', { detail: { locationId: location.id } }));
  }

  function runSearch() {
    const model = currentModel();
    const results = model?.searchOperationalLocations(elements.query?.value ?? '') ?? [];
    if (results.length === 1) selectLocation(results[0]);
    else renderSearchResults(results);
  }

  elements.form.addEventListener('submit', (event) => { event.preventDefault(); runSearch(); });
  elements.query?.addEventListener('input', () => {
    const model = currentModel();
    const value = elements.query.value.trim();
    renderSearchResults(value ? model?.searchOperationalLocations(value) ?? [] : []);
  });
  window.addEventListener('sc:location-registry-ready', runSearch);
  selectLocation(currentModel()?.getLocation('stanton-hurston-lorville-teasa'));
}());

(function installOcrRuntimeImportMap() {
  const upstream = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.esm.min.js';
  const adapter = new URL('./tesseract-runtime-adapter-v0293.js', document.baseURI).href;
  const importMap = document.createElement('script');
  importMap.type = 'importmap';
  importMap.textContent = JSON.stringify({ imports: { [upstream]: adapter } });
  document.head.append(importMap);
}());

(function loadApplicationRuntimes() {
  window.dispatchEvent(new Event('sc:location-registry-ready'));

  import('./location-pyro-hotfix-v0293.js')
    .then(() => {
      window.dispatchEvent(new Event('sc:location-registry-ready'));
      return import('./fleet-loadouts.js');
    })
    .then(() => import('./game-log-intake.js'))
    .then(() => import('./game-log-intake-correlation.js'))
    .then(() => import('./ocr-intake.js'))
    .then(() => import('./official-universe-data.js'))
    .then(() => import('./navigation-estimates.js'))
    .then(() => import('./location-context.js'))
    .then(() => import('./location-exposure-v028.js'))
    .then(() => Promise.all([
      import('./route-corrections.js'),
      import('./route-progress.js'),
      import('./route-planner-engine.js'),
      import('./cargo-state.js'),
      import('./cargo-layout.js'),
      import('./cargo-zone-model.js')
    ]))
    .then(() => Promise.all([
      import('./route-operational-steps-v028.js'),
      import('./cargo-auto-layout-v028.js')
        .then(() => import('./cargo-ship-grid-profile-v030.js'))
        .then(() => import('./cargo-auto-layout-v0292.js'))
        .then(() => import('./cargo-manual-layout-v030.js'))
        .then(() => import('./cargo-manual-version-compat-v030.js'))
    ]))
    .then(() => import('./fleet-estimate-adapter.js'))
    .then(() => {
      window.dispatchEvent(new Event('sc:route-runtime-ready'));
      window.dispatchEvent(new Event('sc:cargo-runtime-ready'));
      window.dispatchEvent(new Event('sc:navigation-runtime-ready'));
      window.dispatchEvent(new Event('sc:location-context-ready'));
      return Promise.all([
        import('./route-planner-view.js').then(() => import('./location-context-planner.js')),
        import('./changelog-view.js'),
        import('./design-system-view.js'),
        import('./ui-v2.js').then(() => window.SCCompanionCleanInterfaceReady),
        import('./ui-v2-accessibility.js'),
        import('./game-log-intake-view.js'),
        import('./ocr-intake-view.js')
      ]);
    })
    .then(() => Promise.all([
      import('./fleet-loadouts-view.js'),
      import('./starmap-layer-context.js'),
      import('./assisted-intake-access.js')
    ]))
    .then(() => import('./focused-route-optimizer.js'))
    .then(() => import('./route-locality-hotfix-v0294.js'))
    .then(() => import('./route-session-planner.js'))
    .then(() => import('./missions-focus-workflow.js'))
    .then(() => import('./mission-location-picker.js'))
    .then(() => import('./operational-ui-v025.js'))
    .then(() => import('./operational-polish-v026.js'))
    .then(() => import('./operations-exposure-intel.js'))
    .then(() => import('./operations-design-v027.js'))
    .then(() => import('./operations-flow-v028.js'))
    .then(() => import('./operations-readable-short-desktop-v0291.js'))
    .then(() => import('./operations-cargo-guidance-v0292.js'))
    .then(() => import('./cargo-manual-grid-view-v0301.js'))
    .then(() => import('./cargo-manual-grid-fit-v030.js'))
    .then(() => import('./operations-readable-scroll-v0301.js'))
    .then(() => import('./ship-selector-sync.js'))
    .then(() => import('./missions-operations-bridge.js'))
    .then(() => window.dispatchEvent(new Event('sc:dynamic-pages-ready')))
    .catch((error) => console.error('Application runtime failed to load.', error));
}());
