'use strict';

(function bootstrapLocationIntel() {
  let initialized = false;

  function initialize() {
    if (initialized) return true;
    const locations = window.SCCompanionLocations;
    const contextModel = window.SCCompanionLocationContext;
    const estimates = window.SCCompanionArrivalEstimates;
    const store = window.SCCompanionSession;
    const cargoState = window.SCCompanionCargoState;
    const routeCorrections = window.SCCompanionRouteCorrections;
    const routeProgress = window.SCCompanionRouteProgress;
    const host = document.querySelector('#locations');
    if (!locations || !contextModel || !estimates || !store || !cargoState || !routeCorrections || !routeProgress || !host) return false;

    const intel = host.querySelector('article:last-of-type');
    if (!intel) return false;
    initialized = true;
    intel.className = 'location-context-panel';
    intel.innerHTML = `
      <header class="location-context-header">
        <div><small>LOCATION CONTEXT</small><h3 id="intel-location-name">—</h3><p id="intel-location-system">—</p></div>
        <div class="location-source-state"><strong id="intel-data-status">—</strong><span id="intel-freshness">—</span></div>
      </header>
      <section class="location-essentials" aria-label="Essential location answers">
        <article data-essential="risk"><small>RISK</small><strong id="intel-essential-risk">—</strong></article>
        <article data-essential="landing-services"><small>FUEL / REPAIR</small><strong id="intel-essential-fuel">—</strong></article>
        <article data-essential="food"><small>FOOD / DRINK</small><strong id="intel-essential-food">—</strong></article>
        <article data-essential="medical"><small>MEDICAL</small><strong id="intel-essential-medical">—</strong></article>
      </section>
      <div class="location-guidance-grid">
        <section class="location-risk" id="intel-risk">
          <div>
            <small>STATIC LOCATION RISK</small>
            <strong id="intel-risk-label">—</strong>
            <div class="location-risk-meta">
              <span id="intel-risk-jurisdiction">—</span>
              <span id="intel-risk-armistice">—</span>
              <span id="intel-risk-comm">—</span>
            </div>
          </div>
          <ul id="intel-risk-factors"></ul>
        </section>
        <section class="location-exposure" id="intel-exposure">
          <div><small>DERIVED CARGO GUIDANCE</small><strong id="intel-exposure-label">—</strong></div>
          <ul id="intel-exposure-reasons"></ul>
        </section>
      </div>
      <div class="location-context-grid">
        <section class="location-context-section">
          <header><small>VERIFIED / REGISTERED FACTS</small><strong>Location record</strong></header>
          <dl id="intel-facts"></dl>
        </section>
        <section class="location-context-section">
          <header><small>DERIVED ARRIVAL RANGE</small><strong id="estimate-total">—</strong></header>
          <ol id="estimate-segments"></ol>
          <p id="intel-traffic">—</p>
        </section>
      </div>
      <section class="location-context-section">
        <header><small>FACILITIES AND SERVICES</small><strong id="intel-service-summary">Reviewed availability</strong></header>
        <div class="location-services" id="intel-services"></div>
      </section>
      <div class="location-context-grid">
        <section class="location-context-section">
          <header><small>SOURCE LEDGER</small><strong id="intel-source-count">0 sources</strong></header>
          <div class="location-source-list" id="intel-sources"></div>
        </section>
        <section class="location-context-section">
          <header><small>UNAVAILABLE / UNVERIFIED</small><strong>Known data gaps</strong></header>
          <ul class="location-unavailable-list" id="intel-unavailable"></ul>
        </section>
      </div>
      <p class="location-boundary-note" id="intel-boundary">—</p>`;

    const elements = {
      name: intel.querySelector('#intel-location-name'),
      system: intel.querySelector('#intel-location-system'),
      status: intel.querySelector('#intel-data-status'),
      freshness: intel.querySelector('#intel-freshness'),
      essentialRisk: intel.querySelector('[data-essential="risk"]'),
      essentialRiskValue: intel.querySelector('#intel-essential-risk'),
      essentialFuel: intel.querySelector('[data-essential="landing-services"]'),
      essentialFuelValue: intel.querySelector('#intel-essential-fuel'),
      essentialFood: intel.querySelector('[data-essential="food"]'),
      essentialFoodValue: intel.querySelector('#intel-essential-food'),
      essentialMedical: intel.querySelector('[data-essential="medical"]'),
      essentialMedicalValue: intel.querySelector('#intel-essential-medical'),
      risk: intel.querySelector('#intel-risk'),
      riskLabel: intel.querySelector('#intel-risk-label'),
      riskJurisdiction: intel.querySelector('#intel-risk-jurisdiction'),
      riskArmistice: intel.querySelector('#intel-risk-armistice'),
      riskComm: intel.querySelector('#intel-risk-comm'),
      riskFactors: intel.querySelector('#intel-risk-factors'),
      exposure: intel.querySelector('#intel-exposure'),
      exposureLabel: intel.querySelector('#intel-exposure-label'),
      exposureReasons: intel.querySelector('#intel-exposure-reasons'),
      facts: intel.querySelector('#intel-facts'),
      traffic: intel.querySelector('#intel-traffic'),
      services: intel.querySelector('#intel-services'),
      serviceSummary: intel.querySelector('#intel-service-summary'),
      estimateTotal: intel.querySelector('#estimate-total'),
      estimateSegments: intel.querySelector('#estimate-segments'),
      sources: intel.querySelector('#intel-sources'),
      sourceCount: intel.querySelector('#intel-source-count'),
      unavailable: intel.querySelector('#intel-unavailable'),
      boundary: intel.querySelector('#intel-boundary')
    };

    let selectedLocationId = 'stanton-hurston-lorville-teasa';

    function routeContext(state) {
      if (!state.route?.stops?.length) return { currentLocationId: null, onboardScu: 0 };
      const route = routeCorrections.deriveRoute(state.route, state.routeCorrections);
      const progress = routeProgress.derive(route, state.completedStopIds, state.currentStopIndex);
      const lifecycle = cargoState.deriveCargoState(route, progress.completedStopIds, state.cargoCorrections);
      return {
        currentLocationId: progress.currentStop?.locationId ?? null,
        onboardScu: lifecycle.totals.onboardScu
      };
    }

    function statusLabel(status) {
      const labels = {
        available: 'Available',
        'local-transfer': 'Local transfer',
        limited: 'Limited',
        unregulated: 'Unregulated',
        'not-available': 'Not available',
        unverified: 'Unverified',
        'unavailable-data': 'No reviewed data'
      };
      return labels[status] ?? String(status).replace(/-/g, ' ');
    }

    function arrivalPreset(location) {
      if (!location) return null;
      if (['orbital-station', 'lagrange-station', 'jump-gateway', 'asteroid-station'].includes(location.type)) return 'orbital-station';
      if (location.type === 'spaceport' || location.type === 'landing-zone') return 'landing-zone';
      return null;
    }

    function renderEssentials(context) {
      const fuel = context.services.find((service) => service.id === 'landing-services');
      const food = context.services.find((service) => service.id === 'food');
      const medical = context.services.find((service) => service.id === 'medical');
      const entries = [
        [elements.essentialRisk, elements.essentialRiskValue, context.risk.level, context.risk.label, context.risk.note],
        [elements.essentialFuel, elements.essentialFuelValue, fuel?.status ?? 'unavailable-data', statusLabel(fuel?.status ?? 'unavailable-data'), fuel?.detail],
        [elements.essentialFood, elements.essentialFoodValue, food?.status ?? 'unavailable-data', statusLabel(food?.status ?? 'unavailable-data'), food?.detail],
        [elements.essentialMedical, elements.essentialMedicalValue, medical?.status ?? 'unavailable-data', statusLabel(medical?.status ?? 'unavailable-data'), medical?.detail]
      ];
      entries.forEach(([card, value, state, label, detail]) => {
        card.dataset.state = state;
        value.textContent = label;
        card.title = detail ?? label;
      });
    }

    function renderFacts(context) {
      elements.facts.replaceChildren(...context.facts.map((fact) => {
        const row = document.createElement('div');
        row.innerHTML = `<dt>${fact.label}</dt><dd>${fact.value}</dd>`;
        row.dataset.sourceKind = fact.sourceKind;
        return row;
      }));
    }

    function renderRisk(context) {
      elements.risk.dataset.level = context.risk.level;
      elements.riskLabel.textContent = context.risk.label;
      elements.riskJurisdiction.textContent = `Jurisdiction: ${context.risk.jurisdiction}`;
      elements.riskArmistice.textContent = `Protection: ${context.risk.armistice}`;
      elements.riskComm.textContent = `Comms: ${context.risk.commArray}`;
      elements.riskFactors.replaceChildren(...context.risk.factors.map((factor) => {
        const item = document.createElement('li');
        item.textContent = factor;
        return item;
      }));
    }

    function renderArrival(context) {
      const preset = arrivalPreset(context.location);
      if (!preset) {
        elements.estimateTotal.textContent = 'Unavailable';
        elements.estimateSegments.replaceChildren();
        elements.traffic.textContent = 'No reviewed arrival model for this location type.';
        return;
      }
      const trafficLevel = context.profile?.traffic?.level ?? 'normal';
      const estimate = estimates.estimateArrival(preset, trafficLevel === 'volatile' ? 'high' : trafficLevel);
      elements.estimateTotal.textContent = `${estimate.minMinutes}–${estimate.maxMinutes} min`;
      elements.estimateSegments.replaceChildren(...estimate.segments.map((segment) => {
        const row = document.createElement('li');
        row.innerHTML = `<span>${segment.label}</span><strong>${segment.minMinutes}–${segment.maxMinutes} min</strong>`;
        return row;
      }));
      elements.traffic.textContent = context.profile?.traffic
        ? `${context.profile.traffic.level.toUpperCase()} estimate · ${context.profile.traffic.note}`
        : 'NORMAL fallback · derived estimate, not live traffic telemetry.';
    }

    function renderServices(context) {
      const available = context.services.filter((service) => service.status === 'available').length;
      const conditional = context.services.filter((service) => ['local-transfer', 'limited', 'unregulated'].includes(service.status)).length;
      elements.serviceSummary.textContent = `${available} direct · ${conditional} conditional`;
      elements.services.replaceChildren(...context.services.map((service) => {
        const card = document.createElement('article');
        card.className = `location-service is-${service.status}`;
        card.innerHTML = `<div><strong>${service.label}</strong><span>${statusLabel(service.status)}</span></div><p>${service.detail}</p><small>${service.sourceKind.replace(/-/g, ' ')}</small>`;
        return card;
      }));
    }

    function renderSources(context) {
      elements.sourceCount.textContent = `${context.sources.length} source${context.sources.length === 1 ? '' : 's'}`;
      if (!context.sources.length) {
        elements.sources.innerHTML = '<div class="location-empty">No linked source record.</div>';
        return;
      }
      elements.sources.replaceChildren(...context.sources.map((source) => {
        const item = document.createElement('article');
        const title = source.url
          ? `<a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.label}</a>`
          : `<strong>${source.label}</strong>`;
        item.innerHTML = `${title}<span>${source.authority.toUpperCase()} · ${source.kind.replace(/-/g, ' ')}</span><small>Reviewed ${source.reviewedAt ?? 'date unavailable'}</small>`;
        return item;
      }));
    }

    function renderUnavailable(context) {
      const items = context.unavailable.length ? context.unavailable : ['No explicit data gaps are recorded for the current context.'];
      elements.unavailable.replaceChildren(...items.map((message) => {
        const item = document.createElement('li');
        item.textContent = message;
        return item;
      }));
    }

    function render(locationId = selectedLocationId, state = store.getState()) {
      selectedLocationId = locationId;
      const route = routeContext(state);
      const isCurrentStop = route.currentLocationId === locationId;
      const context = contextModel.buildContext(locationId, {
        onboardScu: isCurrentStop ? route.onboardScu : 0,
        label: locations.getLocation(locationId)?.name
      });

      elements.name.textContent = context.label;
      elements.system.textContent = context.system
        ? `${context.system.name} · ${context.system.security}`
        : 'System context unavailable';
      elements.status.textContent = context.confidence.label;
      elements.status.dataset.level = context.confidence.level;
      elements.freshness.textContent = context.freshness.label;
      elements.freshness.dataset.state = context.freshness.state;
      renderEssentials(context);
      renderRisk(context);
      elements.exposure.dataset.level = context.exposure.level;
      elements.exposureLabel.textContent = context.exposure.label;
      elements.exposureReasons.replaceChildren(...context.exposure.reasons.map((reason) => {
        const item = document.createElement('li');
        item.textContent = reason;
        return item;
      }));
      renderFacts(context);
      renderArrival(context);
      renderServices(context);
      renderSources(context);
      renderUnavailable(context);
      elements.boundary.textContent = `${context.snapshot.gameVersion} static web snapshot, verified ${context.snapshot.verifiedAt}. Facility services and baseline risk are reviewed static records; cargo exposure and arrival ranges are derived. Nothing on this page is live shard, player or security telemetry.`;
      window.dispatchEvent(new CustomEvent('sc:location-context-rendered', { detail: { locationId, context } }));
    }

    window.addEventListener('sc:location-selected', (event) => render(event.detail.locationId));
    window.addEventListener('sc:session-change', (event) => render(selectedLocationId, event.detail));
    window.addEventListener('sc:current-stop-location', (event) => render(event.detail.locationId));
    render(selectedLocationId);
    return true;
  }

  if (!initialize()) window.addEventListener('sc:location-context-ready', initialize, { once: true });
}());
