'use strict';

(function initializeMissionView() {
  const store = window.SCCompanionSession;
  const parser = window.SCCompanionMissionText;
  const missionModel = window.SCCompanionMissions;
  const routePlanner = window.SCCompanionRoutePlanner;
  const locationModel = window.SCCompanionLocations;
  const form = document.querySelector('#mission-form');
  if (!store || !parser || !form) return;

  const text = document.querySelector('#mission-text');
  const message = document.querySelector('#mission-message');
  const cards = document.querySelector('#mission-cards');
  const title = document.querySelector('#mission-preview-title');

  function renderMissions(missions) {
    cards.replaceChildren();
    title.textContent = missions.length ? `${missions.length} missions ready` : 'No generated session';
    missions.forEach((mission) => {
      const card = document.createElement('article');
      card.className = 'mission-card';
      const heading = document.createElement('h4');
      heading.textContent = mission.title;
      const list = document.createElement('ul');
      mission.cargoLots.forEach((lot) => {
        const item = document.createElement('li');
        item.innerHTML = `<strong>${lot.scu} SCU ${lot.commodity}</strong><span>${lot.pickupLocationLabel} → ${lot.deliveryLocationLabel}</span>`;
        list.append(item);
      });
      card.append(heading, list);
      cards.append(card);
    });
  }

  function generate() {
    try {
      const parsed = parser.parseMissionText(text.value, locationModel);
      const route = routePlanner.buildRoute(parsed.missions, missionModel);
      store.patch({
        missionText: text.value,
        missions: parsed.missions,
        route,
        currentStopIndex: 0
      });
      renderMissions(parsed.missions);
      message.className = 'form-message is-success';
      message.textContent = parsed.warnings.length
        ? `Session generated. ${parsed.warnings.join(' ')}`
        : `${route.stops.length} stops generated with cargo provenance preserved.`;
    } catch (error) {
      message.className = 'form-message is-error';
      message.textContent = error.message;
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    generate();
  });

  document.querySelector('#reset-session').addEventListener('click', () => {
    const state = store.reset();
    text.value = state.missionText;
    renderMissions([]);
    message.textContent = 'Local session reset.';
  });

  const state = store.getState();
  text.value = state.missionText;
  renderMissions(state.missions ?? []);
}());
