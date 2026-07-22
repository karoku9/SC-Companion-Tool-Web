'use strict';

(function initializeLocationWorkspace() {
  const model = window.SCCompanionLocations;
  const form = document.querySelector('#location-search');
  if (!model || !form) return;

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
      system: 'System',
      planet: 'Planet',
      planetoid: 'Planetoid',
      'asteroid-belt': 'Asteroid belt',
      'landing-zone': 'Landing zone',
      spaceport: 'Spaceport',
      'orbital-station': 'Orbital station'
    };
    return labels[type] ?? type;
  }

  function renderSearchResults(results) {
    elements.results?.replaceChildren();
    if (!elements.results || !results.length) {
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
    if (!location) return;
    if (elements.title) elements.title.textContent = model.formatOperationalLabel(location);
    if (elements.navigationTarget) elements.navigationTarget.textContent = location.navigationTarget ?? location.name;
    if (elements.type) elements.type.textContent = humanizeType(location.type);
    if (elements.path) elements.path.textContent = model.formatLocationPath(location);
    if (elements.query) elements.query.value = location.navigationTarget ?? location.name;
    renderSearchResults([]);
    window.dispatchEvent(new CustomEvent('sc:location-selected', { detail: { locationId: location.id } }));
  }

  function runSearch() {
    const results = model.searchOperationalLocations(elements.query?.value ?? '');
    if (results.length === 1) selectLocation(results[0]);
    else renderSearchResults(results);
  }

  elements.form.addEventListener('submit', (event) => { event.preventDefault(); runSearch(); });
  elements.query?.addEventListener('input', () => {
    const value = elements.query.value.trim();
    renderSearchResults(value ? model.searchOperationalLocations(value) : []);
  });
  selectLocation(model.getLocation('stanton-hurston-lorville-teasa'));
}());

(function loadApplicationRuntimes() {
  import('./official-universe-data.js')
    .then(() => import('./navigation-estimates.js'))
    .then(() => import('./location-context.js'))
    .then(() => Promise.all([
      import('./route-corrections.js'),
      import('./route-progress.js'),
      import('./route-planner-engine.js'),
      import('./cargo-state.js'),
      import('./cargo-layout.js'),
      import('./cargo-zone-model.js')
    ]))
    .then(() => {
      window.dispatchEvent(new Event('sc:route-runtime-ready'));
      window.dispatchEvent(new Event('sc:cargo-runtime-ready'));
      window.dispatchEvent(new Event('sc:navigation-runtime-ready'));
      window.dispatchEvent(new Event('sc:location-context-ready'));
      return Promise.all([
        import('./route-planner-view.js'),
        import('./changelog-view.js'),
        import('./design-system-view.js'),
        import('./ui-v2.js').then(() => window.SCCompanionCleanInterfaceReady),
        import('./ui-v2-accessibility.js')
      ]);
    })
    .then(() => window.dispatchEvent(new Event('sc:dynamic-pages-ready')))
    .catch((error) => console.error('Application runtime failed to load.', error));
}());
