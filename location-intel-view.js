'use strict';

(function initializeLocationIntel() {
  const locations = window.SCCompanionLocations;
  const profiles = window.SCCompanionLocationProfiles;
  const estimates = window.SCCompanionArrivalEstimates;
  if (!locations || !profiles || !estimates) return;

  const elements = {
    name: document.querySelector('#intel-location-name'),
    status: document.querySelector('#intel-data-status'),
    traffic: document.querySelector('#intel-traffic'),
    services: document.querySelector('#intel-services'),
    estimateTotal: document.querySelector('#estimate-total'),
    estimateSegments: document.querySelector('#estimate-segments')
  };

  const statusLabels = {
    available: 'AVAILABLE',
    'city-transfer': 'CITY TRANSFER',
    unverified: 'UNVERIFIED'
  };

  function render(locationId) {
    const location = locations.getLocation(locationId);
    const profile = profiles.getProfile(locationId);
    if (!location || !profile) return;

    elements.name.textContent = locations.formatOperationalLabel(location);
    elements.status.textContent = `${profile.dataStatus.replace('-', ' ').toUpperCase()} · REVIEWED ${profile.lastReviewed}`;
    elements.traffic.textContent = `${profile.traffic.level.toUpperCase()} ESTIMATE · NOT LIVE`;

    const serviceNodes = profile.services.map((service) => {
      const card = document.createElement('article');
      card.className = `service-card is-${service.status}`;
      card.innerHTML = `<span>${service.label}</span><strong>${statusLabels[service.status] ?? service.status}</strong><small>${service.detail}</small>`;
      return card;
    });
    elements.services.replaceChildren(...serviceNodes);

    const estimate = estimates.estimateArrival('landing-zone', profile.traffic.level);
    elements.estimateTotal.textContent = `${estimate.minMinutes}–${estimate.maxMinutes} MIN`;
    const segmentNodes = estimate.segments.map((segment) => {
      const row = document.createElement('li');
      row.innerHTML = `<span>${segment.label}</span><strong>${segment.minMinutes}–${segment.maxMinutes} min</strong>`;
      return row;
    });
    elements.estimateSegments.replaceChildren(...segmentNodes);
  }

  window.addEventListener('sc:location-selected', (event) => render(event.detail.locationId));
  render('stanton-hurston-lorville-teasa');
}());
