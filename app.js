'use strict';

(function initializeRouteWorkspace() {
  const model = window.SCCompanionLocations;

  if (!model) {
    throw new Error('Location model failed to load.');
  }

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
      spaceport: 'Spaceport'
    };

    return labels[type] ?? type;
  }

  function renderDestination(location) {
    elements.title.textContent = model.formatOperationalLabel(location);
    elements.navigationTarget.textContent = location.navigationTarget ?? location.name;
    elements.type.textContent = humanizeType(location.type);
    elements.path.textContent = model.formatLocationPath(location);
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

    if (results.length === 1) {
      selectLocation(results[0]);
      return;
    }

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

  const initialLocation = model.getLocation('stanton-hurston-lorville-teasa');
  renderDestination(initialLocation);
}());
