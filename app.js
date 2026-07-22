'use strict';

(function initializeLocationWorkspace() {
  const model = window.SCCompanionLocations;
  if (!model) throw new Error('Location model failed to load.');

  const elements = {
    form: document.querySelector('#location-search'),
    query: document.querySelector('#location-query'),
    results: document.querySelector('#search-results'),
    title: document.querySelector('#destination-title'),
    navigationTarget: document.querySelector('#navigation-target'),
    type: document.querySelector('#location-type'),
    path: document.querySelector('#location-path')
  };

  function humanizeType(type) {
    const labels = { system: 'System', planet: 'Planet', 'landing-zone': 'Landing zone', spaceport: 'Spaceport', 'orbital-station': 'Orbital station' };
    return labels[type] ?? type;
  }

  function renderDestination(location) {
    elements.title.textContent = model.formatOperationalLabel(location);
    elements.navigationTarget.textContent = location.navigationTarget ?? location.name;
    elements.type.textContent = humanizeType(location.type);
    elements.path.textContent = model.formatLocationPath(location);
    window.dispatchEvent(new CustomEvent('sc:location-selected', { detail: { locationId: location.id } }));
  }

  function selectLocation(location) {
    renderDestination(location);
    elements.query.value = location.navigationTarget ?? location.name;
    renderSearchResults([]);
  }

  function createResultButton(location) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'result-button';
    const title = document.createElement('strong');
    title.textContent = model.formatOperationalLabel(location);
    const detail = document.createElement('span');
    detail.textContent = `In game: ${location.navigationTarget ?? location.name}`;
    button.append(title, detail);
    button.addEventListener('click', () => selectLocation(location));
    return button;
  }

  function renderSearchResults(results) {
    elements.results.replaceChildren();
    if (!results.length) {
      elements.results.hidden = true;
      return;
    }
    const fragment = document.createDocumentFragment();
    results.forEach((location) => fragment.append(createResultButton(location)));
    elements.results.append(fragment);
    elements.results.hidden = false;
  }

  function runSearch() {
    const results = model.searchOperationalLocations(elements.query.value);
    if (results.length === 1) return selectLocation(results[0]);
    renderSearchResults(results);
  }

  elements.form.addEventListener('submit', (event) => { event.preventDefault(); runSearch(); });
  elements.query.addEventListener('input', () => {
    const value = elements.query.value.trim();
    renderSearchResults(value ? model.searchOperationalLocations(value) : []);
  });

  renderDestination(model.getLocation('stanton-hurston-lorville-teasa'));
}());

(function loadOperationalRuntimes() {
  [
    'cargo-operations.css', 'cargo-corrections.css', 'route-corrections.css', 'changelog.css',
    'route-planner-live.css', 'ux-refresh.css', 'ux-hierarchy-v2.css', 'workspace-consolidation.css',
    'release-roadmap.css', 'ui-rebuild.css', 'drake-mfd.css', 'mfd-layout-v2.css'
  ].forEach((href) => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = href;
    document.head.append(stylesheet);
  });

  Promise.all([
    import('./route-corrections.js'),
    import('./route-progress.js'),
    import('./route-planner-engine.js'),
    import('./cargo-state.js'),
    import('./cargo-layout.js'),
    import('./cargo-zone-model.js')
  ])
    .then(() => {
      window.dispatchEvent(new Event('sc:route-runtime-ready'));
      window.dispatchEvent(new Event('sc:cargo-runtime-ready'));
      return import('./load-operations-view.js');
    })
    .then(() => Promise.all([
      import('./cargo-corrections-view.js'),
      import('./cargo-zone-editor-view.js'),
      import('./route-corrections-view.js'),
      import('./route-planner-view.js'),
      import('./changelog-view.js'),
      import('./ux-shell.js'),
      import('./workspace-shell.js'),
      import('./ui-rebuild.js'),
      import('./mfd-layout-v2.js')
    ]))
    .then(() => window.dispatchEvent(new Event('sc:dynamic-pages-ready'))
    .catch((error) => console.error('Operational runtime failed to load.', error));
}());
