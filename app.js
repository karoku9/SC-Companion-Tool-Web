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
    const labels = {
      system: 'System',
      planet: 'Planet',
      'landing-zone': 'Landing zone',
      spaceport: 'Spaceport',
      'orbital-station': 'Orbital station'
    };
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
    detail.textContent = `IN GAME: ${location.navigationTarget ?? location.name}`;
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

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    runSearch();
  });
  elements.query.addEventListener('input', () => {
    const value = elements.query.value.trim();
    renderSearchResults(value ? model.searchOperationalLocations(value) : []);
  });

  renderDestination(model.getLocation('stanton-hurston-lorville-teasa'));
}());

(function loadCargoOperationsRuntime() {
  if (!document.querySelector('link[href="cargo-operations.css"]')) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = 'cargo-operations.css';
    document.head.append(stylesheet);
  }

  Promise.all([
    import('./cargo-state.js'),
    import('./cargo-layout.js')
  ])
    .then(() => {
      window.dispatchEvent(new Event('sc:cargo-runtime-ready'));
      return import('./load-operations-view.js');
    })
    .catch((error) => {
      console.error('Cargo operations runtime failed to load.', error);
    });
}());
