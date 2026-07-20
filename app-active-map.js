'use strict';

(() => {
  const locationOperations = {
    'Everus Harbor': {
      approach: 'Orbital station above Hurston. Approach the assigned hangar from the station plane and expect frequent traffic near the pads.',
      refuel: true,
      repair: true,
      traffic: 'High',
      danger: 'Low',
      reliability: 'Generally reliable',
      note: 'Large station with standard services. Hangar assignment can add a short local reposition.'
    },
    'Lorville': {
      approach: 'Atmospheric descent to Teasa Spaceport. Budget extra time for the city no-fly zone and hangar approach.',
      refuel: true,
      repair: true,
      traffic: 'High',
      danger: 'Low',
      reliability: 'Moderate',
      note: 'Dense landing-zone approach; occasional hangar or transit delays are possible.'
    },
    'Baijini Point': {
      approach: 'Orbital station above ArcCorp. Align with the station ring before the final hangar approach.',
      refuel: true,
      repair: true,
      traffic: 'High',
      danger: 'Low',
      reliability: 'Generally reliable',
      note: 'Busy cargo hub; allow space for other ships around the hangar entrances.'
    },
    'Area18': {
      approach: 'Atmospheric landing at Riker Memorial Spaceport. Follow the city marker and remain clear of restricted airspace.',
      refuel: true,
      repair: true,
      traffic: 'High',
      danger: 'Low',
      reliability: 'Moderate',
      note: 'Longer approach than an orbital stop. City streaming can occasionally delay markers or hangar doors.'
    },
    'Port Tressler': {
      approach: 'Orbital station above microTech. The station is easy to identify against the planet but can be busy around the main ring.',
      refuel: true,
      repair: true,
      traffic: 'High',
      danger: 'Low',
      reliability: 'Generally reliable',
      note: 'Full orbital services and a straightforward approach.'
    },
    'New Babbage': {
      approach: 'Atmospheric descent to New Babbage Interstellar Spaceport. Weather and the long surface approach can increase travel time.',
      refuel: true,
      repair: true,
      traffic: 'Medium',
      danger: 'Low',
      reliability: 'Moderate',
      note: 'Snow and cloud cover may reduce visual references; use the spaceport marker.'
    },
    'Seraphim Station': {
      approach: 'Large orbital station above Crusader. Expect traffic and approach from outside the rotating ring.',
      refuel: true,
      repair: true,
      traffic: 'High',
      danger: 'Medium',
      reliability: 'Generally reliable',
      note: 'Popular staging point; pad and hangar traffic may be heavy.'
    },
    'Orison': {
      approach: 'Deep atmospheric descent through Crusader to August Dunlow Spaceport. This is a time-expensive landing-zone approach.',
      refuel: true,
      repair: true,
      traffic: 'Medium',
      danger: 'Low',
      reliability: 'Moderate',
      note: 'High atmosphere exit and entry costs; avoid this stop when minimizing time or fuel.'
    },
    'Grim HEX': {
      approach: 'Asteroid station inside the Yela belt. Approach carefully because rocks and player traffic can obscure the hangar line.',
      refuel: true,
      repair: true,
      traffic: 'High',
      danger: 'High',
      reliability: 'Variable',
      note: 'No armistice protection in parts of the surrounding area; expect opportunistic players.'
    },
    'HDMS-Bezdek': {
      approach: 'Surface outpost on Arial. Quantum arrival may leave you on the far side of the moon and require orbital-marker hops.',
      refuel: true,
      repair: true,
      traffic: 'Medium',
      danger: 'Medium',
      reliability: 'Variable',
      note: 'Repair, rearm and refuel can be requested while landed on the service pad.'
    },
    'HDMS-Lathan': {
      approach: 'Surface outpost on Arial. The in-game route can add short orbital-marker hops before the final descent.',
      refuel: true,
      repair: true,
      traffic: 'Medium',
      danger: 'Medium',
      reliability: 'Variable',
      note: 'Repair, rearm and refuel can be requested while landed on the service pad.'
    },
    'ArcCorp Mining Area 056': {
      approach: 'Surface mining outpost on Wala. Expect a local moon approach and possible orbital-marker repositioning.',
      refuel: true,
      repair: true,
      traffic: 'Medium',
      danger: 'Medium',
      reliability: 'Variable',
      note: 'Repair, rearm and refuel are available by landing-service request.'
    },
    'ArcCorp Mining Area 045': {
      approach: 'Surface mining outpost on Wala. Expect a local moon approach and possible orbital-marker repositioning.',
      refuel: true,
      repair: true,
      traffic: 'Medium',
      danger: 'Medium',
      reliability: 'Variable',
      note: 'Repair, rearm and refuel are available by landing-service request.'
    },
    'Brio’s Breaker Yard': {
      approach: 'Unregulated surface scrapyard on Daymar. Land with an escape direction and avoid blocking the terminal area.',
      refuel: false,
      repair: false,
      traffic: 'Medium',
      danger: 'High',
      reliability: 'Variable',
      note: 'No armistice protection. Player ambushes and terminal interruptions are possible.'
    },
    'Shubin Mining Facility SCD-1': {
      approach: 'Surface facility on Daymar. A far-side arrival may require one or more orbital-marker hops.',
      refuel: true,
      repair: true,
      traffic: 'Low',
      danger: 'Medium',
      reliability: 'Variable',
      note: 'Repair, rearm and refuel are available by landing-service request.'
    },
    'Shubin Mining Facility SM0-18': {
      approach: 'Surface facility on microTech. Weather and terrain can make the final visual approach slower.',
      refuel: true,
      repair: true,
      traffic: 'Low',
      danger: 'Medium',
      reliability: 'Variable',
      note: 'Repair, rearm and refuel are available by landing-service request.'
    },
    'Rayari Deltana Research Outpost': {
      approach: 'Remote microTech research outpost. Expect weather, terrain and a surface approach without full station services.',
      refuel: true,
      repair: true,
      traffic: 'Low',
      danger: 'Medium',
      reliability: 'Variable',
      note: 'Landing services are available by request; mission elevators may still be affected by server degradation.'
    }
  };

  const defaultOperation = {
    approach: 'Follow the in-game quantum marker, then verify the final approach visually before committing to landing.',
    refuel: false,
    repair: false,
    traffic: 'Unknown',
    danger: 'Unknown',
    reliability: 'Unrated',
    note: 'No fixed community profile has been added for this location yet.'
  };

  const originalNormalizeLot = window.normalizeLot;
  window.normalizeLot = function normalizeLotManual(raw = {}) {
    const normalized = originalNormalizeLot(raw);
    if (Array.isArray(normalized.containers) && normalized.containers.length && !(Number(normalized.scu) > 0)) {
      normalized.scu = normalized.containers.reduce((sum, group) => sum + Number(group.count || 0) * Number(group.size || 0), 0);
    }
    normalized.containers = [];
    return normalized;
  };

  window.lotScu = function lotScuManual(lot) {
    return Math.max(0, Number(lot?.scu) || 0);
  };

  window.containerLabels = function containerLabelsDisabled() {
    return [];
  };

  window.cargoEditorHtml = function cargoEditorHtmlManual(lot, index) {
    const total = lotScu(lot);
    return `<article class="cargo-editor-card" data-lot-index="${index}">
      <div class="cargo-editor-header">
        <div><strong>Cargo item ${String(index + 1).padStart(2, '0')}</strong><span>${total} SCU</span></div>
        <button class="icon-button delete-lot" type="button" title="Remove cargo item"><svg><use href="#icon-trash"/></svg></button>
      </div>
      <div class="cargo-editor-fields">
        <div class="field autocomplete-field" data-autocomplete="commodity"><label>Commodity</label><input class="editor-commodity" autocomplete="off" value="${esc(lot.commodity)}" placeholder="Neon"><div class="autocomplete-menu" role="listbox"></div></div>
        <div class="field"><label>Quantity (SCU)</label><input class="editor-scu" type="number" min="0" step="1" value="${total}"></div>
        <div class="field autocomplete-field" data-autocomplete="location"><label>Pickup</label><input class="editor-pickup" autocomplete="off" value="${esc(lot.pickup)}" placeholder="Pickup location"><div class="autocomplete-menu" role="listbox"></div></div>
        <div class="field autocomplete-field" data-autocomplete="location"><label>Delivery</label><input class="editor-delivery" autocomplete="off" value="${esc(lot.delivery)}" placeholder="Delivery location"><div class="autocomplete-menu" role="listbox"></div></div>
      </div>
      <div class="cargo-editor-note field"><label>Cargo note <span class="optional-tag">Optional</span></label><input class="editor-lot-note" value="${esc(lot.note)}" placeholder="Rear grid, fragile, mission box A…"></div>
    </article>`;
  };

  window.bindCargoEditors = function bindCargoEditorsManual(root, draft, rerender, updateSummary) {
    $$('.cargo-editor-card', root).forEach(card => {
      const lotIndex = Number(card.dataset.lotIndex);
      const lot = draft.cargo[lotIndex];
      const bindText = (selector, key) => {
        const input = $(selector, card);
        input.addEventListener('input', () => {
          lot[key] = input.value;
          updateSummary();
        });
      };
      bindText('.editor-commodity', 'commodity');
      bindText('.editor-pickup', 'pickup');
      bindText('.editor-delivery', 'delivery');
      bindText('.editor-lot-note', 'note');
      const scuInput = $('.editor-scu', card);
      scuInput.addEventListener('input', () => {
        lot.scu = Math.max(0, Number(scuInput.value) || 0);
        lot.containers = [];
        $('.cargo-editor-header span', card).textContent = `${lot.scu} SCU`;
        updateSummary();
      });
      $('.delete-lot', card).addEventListener('click', () => {
        draft.cargo.splice(lotIndex, 1);
        rerender();
      });
    });
  };

  window.actionText = function actionTextManual(action) {
    return `${action.verb} ${action.scu} SCU ${action.commodity} · ${action.missionCode}`;
  };

  const baseMissionCardHtml = window.missionCardHtml;
  window.missionCardHtml = function missionCardHtmlManual(mission, index, workspace = false) {
    const html = baseMissionCardHtml(mission, index, workspace);
    return html.replace(/<div class="container-badges">[\s\S]*?<\/div><\/div>/g, '</div>');
  };

  function operationFor(name) {
    return locationOperations[name] || defaultOperation;
  }

  function parentBody(name) {
    return findLocation(name)?.parent || '';
  }

  function estimateAssistHops(fromName, toName) {
    const from = findLocation(fromName);
    const to = findLocation(toName);
    if (!from || !to) return { label: 'Unknown', count: '—', reason: 'Custom or unrated location' };
    const fromSurface = /Outpost|Landing Zone|Scrapyard|Research/i.test(from.type);
    const toSurface = /Outpost|Landing Zone|Scrapyard|Research/i.test(to.type);
    const sameParent = norm(from.parent) === norm(to.parent);
    if (sameParent && fromSurface && toSurface) return { label: 'Likely', count: '1–3', reason: `Same-body reposition around ${to.parent}` };
    if (toSurface && (sameParent || parentBody(from.name) === parentBody(to.name))) return { label: 'Possible', count: '1–2', reason: 'Final-side alignment and descent' };
    if (toSurface) return { label: 'Possible', count: '0–2', reason: 'The game may add orbital-marker assists' };
    return { label: 'Unlikely', count: '0–1', reason: 'Orbital or station destination' };
  }

  function legStops() {
    const route = state.route?.length ? state.route : buildRoute();
    if (!route.length) return { route, from: null, to: null, legIndex: 0 };
    if (!state.active) return { route, from: route[0], to: route[1] || route[0], legIndex: 0 };
    const targetIndex = Math.max(1, Math.min(state.activeStopIndex || 1, route.length - 1));
    return { route, from: route[targetIndex - 1], to: route[targetIndex], legIndex: targetIndex - 1 };
  }

  function routeDistanceEstimate(fromName, toName) {
    const from = findLocation(fromName);
    const to = findLocation(toName);
    if (!from || !to) return 'Unknown';
    const mapUnits = Math.hypot(to.x - from.x, to.y - from.y);
    return `${Math.max(1.2, mapUnits / 36).toFixed(1)} Gm`;
  }

  function fuelProfile(fromName, toName) {
    const from = findLocation(fromName);
    const to = findLocation(toName);
    if (!from || !to) return { load: 'Unknown', reserve: 'Keep a conservative reserve' };
    const distance = Math.hypot(to.x - from.x, to.y - from.y) / 36;
    if (distance > 12) return { load: 'High', reserve: 'Refuel before departure when possible' };
    if (distance > 6) return { load: 'Medium', reserve: 'Keep at least a moderate quantum reserve' };
    return { load: 'Low', reserve: 'Normal reserve should be sufficient' };
  }

  function ensureActiveMapPanel() {
    const grid = $('.active-route-grid');
    if (!grid || $('#activeNavPanel')) return;
    const panel = document.createElement('section');
    panel.className = 'content-panel active-nav-panel';
    panel.id = 'activeNavPanel';
    panel.innerHTML = `<div class="panel-heading active-nav-heading">
      <div><span class="eyebrow">Navigation leg</span><h2>Current position → next stop</h2></div>
      <span class="live-mode-pill"><i></i>App-tracked</span>
    </div><div id="activeNavMap" class="active-nav-map"></div>`;
    grid.prepend(panel);
  }

  function navMapSvg(from, to, legIndex, routeLength) {
    const fromName = from?.name || 'Current position';
    const toName = to?.name || fromName;
    const same = norm(fromName) === norm(toName);
    return `<svg viewBox="0 0 1000 430" role="img" aria-label="Perspective route from ${esc(fromName)} to ${esc(toName)}">
      <defs>
        <linearGradient id="navHorizon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10191a"/><stop offset="1" stop-color="#07090a"/></linearGradient>
        <linearGradient id="navPath" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#55d6a4" stop-opacity=".35"/><stop offset="1" stop-color="#70e7b8"/></linearGradient>
        <radialGradient id="navTargetGlow"><stop offset="0" stop-color="#70e7b8" stop-opacity=".62"/><stop offset="1" stop-color="#70e7b8" stop-opacity="0"/></radialGradient>
        <filter id="navGlow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="1000" height="430" fill="url(#navHorizon)"/>
      <g class="nav-stars" opacity=".65">
        <circle cx="72" cy="65" r="1"/><circle cx="188" cy="112" r="1.5"/><circle cx="312" cy="58" r="1"/><circle cx="468" cy="102" r="1"/><circle cx="610" cy="48" r="1.5"/><circle cx="760" cy="91" r="1"/><circle cx="925" cy="52" r="1"/>
      </g>
      <g class="nav-perspective-grid">
        <path d="M0 390 H1000"/><path d="M75 350 H925"/><path d="M145 315 H855"/><path d="M205 285 H795"/><path d="M255 260 H745"/>
        <path d="M500 235 L80 430"/><path d="M500 235 L250 430"/><path d="M500 235 L410 430"/><path d="M500 235 L590 430"/><path d="M500 235 L750 430"/><path d="M500 235 L920 430"/>
      </g>
      <g class="nav-orbit-ghosts"><ellipse cx="760" cy="160" rx="108" ry="40"/><ellipse cx="760" cy="160" rx="66" ry="24"/></g>
      <path class="nav-leg-underlay" d="M180 342 C355 332 500 245 760 160"/>
      <path class="nav-leg-path" d="M180 342 C355 332 500 245 760 160"/>
      ${same ? '' : '<circle class="nav-tracer" r="5" fill="#70e7b8" filter="url(#navGlow)"><animateMotion dur="3.4s" repeatCount="indefinite" path="M180 342 C355 332 500 245 760 160"/></circle>'}
      <g class="nav-origin" transform="translate(180 342)"><circle r="28"/><circle r="7"/><text x="0" y="50" text-anchor="middle">${esc(fromName)}</text><text x="0" y="65" text-anchor="middle">CURRENT</text></g>
      <g class="nav-destination" transform="translate(760 160)"><circle class="nav-target-glow" r="72"/><circle class="nav-target-ring" r="31"/><circle class="nav-target-core" r="9"/><text x="0" y="55" text-anchor="middle">${esc(toName)}</text><text x="0" y="70" text-anchor="middle">NEXT STOP</text></g>
      <g class="nav-ship" transform="translate(410 286) rotate(-18)"><path d="M-22 7 0-15 22 7 8 3 0 17-8 3Z"/></g>
      <text class="nav-leg-label" x="36" y="42">LEG ${String(legIndex + 1).padStart(2, '0')} / ${String(Math.max(1, routeLength - 1)).padStart(2, '0')}</text>
    </svg>`;
  }

  window.renderActiveNavMap = function renderActiveNavMap() {
    ensureActiveMapPanel();
    const root = $('#activeNavMap');
    if (!root) return;
    const { route, from, to, legIndex } = legStops();
    if (!route.length || !from || !to) {
      root.innerHTML = '<div class="active-map-empty"><strong>No route loaded</strong><span>Calculate and start a route to populate the navigation leg.</span></div>';
      return;
    }
    const operation = operationFor(to.name);
    const assists = estimateAssistHops(from.name, to.name);
    const fuel = fuelProfile(from.name, to.name);
    root.innerHTML = `<div class="active-nav-visual">${navMapSvg(from, to, legIndex, route.length)}</div>
      <aside class="active-nav-intel">
        <div class="leg-summary"><span>From</span><strong>${esc(from.name)}</strong><i>→</i><span>To</span><strong>${esc(to.name)}</strong></div>
        <div class="leg-metrics">
          <div><span>Estimated leg</span><strong>${routeDistanceEstimate(from.name, to.name)}</strong></div>
          <div><span>Fuel load</span><strong>${fuel.load}</strong><small>${fuel.reserve}</small></div>
          <div><span>Nav assists</span><strong>${assists.count} hops</strong><small>${assists.label} · ${assists.reason}</small></div>
          <div><span>Refuel at destination</span><strong class="${operation.refuel ? 'is-positive' : 'is-negative'}">${operation.refuel ? 'Available' : 'Not confirmed'}</strong><small>${operation.repair ? 'Repair services also expected' : 'Do not rely on repair services'}</small></div>
          <div><span>Ship cargo profile</span><strong>${formatNumber(shipData().scu)} SCU</strong><small>Fixed community profile · ${totalScu()} SCU planned</small></div>
        </div>
        <div class="landing-profile">
          <div class="landing-profile-heading"><span class="eyebrow">Arrival profile</span><strong>${esc(to.name)}</strong></div>
          <p>${esc(operation.approach)}</p>
          <div class="arrival-badges"><span>Traffic · ${esc(operation.traffic)}</span><span>Danger · ${esc(operation.danger)}</span><span>Reliability · ${esc(operation.reliability)}</span></div>
          <small>${esc(operation.note)}</small>
        </div>
        <div class="telemetry-note"><i></i><span>This view is animated and follows the stop you mark in the app. It does not read your live in-game coordinates.</span></div>
      </aside>`;
  };

  const baseRenderActiveRoute = window.renderActiveRoute;
  window.renderActiveRoute = function renderActiveRouteWithMap() {
    baseRenderActiveRoute();
    window.renderActiveNavMap();
  };

  const baseSwitchView = window.switchView;
  if (typeof baseSwitchView === 'function') {
    window.switchView = function switchViewWithMap(name) {
      baseSwitchView(name);
      if (name === 'active') requestAnimationFrame(window.renderActiveNavMap);
    };
  }

  const baseParseMissionImport = window.parseMissionImport;
  window.parseMissionImport = function parseMissionImportManual(text) {
    const mission = baseParseMissionImport(text);
    mission.cargo = mission.cargo.map(lot => {
      const total = Array.isArray(lot.containers) && lot.containers.length
        ? lot.containers.reduce((sum, group) => sum + Number(group.count || 0) * Number(group.size || 0), 0)
        : Number(lot.scu || 0);
      return normalizeLot({ ...lot, scu: total, containers: [] });
    });
    return mission;
  };

  const baseOpenMissionImport = window.openMissionImport;
  window.openMissionImport = function openMissionImportManual() {
    baseOpenMissionImport();
    requestAnimationFrame(() => {
      const help = $('.import-help');
      if (help) help.innerHTML = 'Accepted readable format:<br><code>Mission: Stanton freight run<br>Type: Hauling<br>Reference: M-03<br>Reward: 46250<br><br>Cargo:<br>Commodity: Agricium<br>SCU: 8<br>Pickup: ArcCorp Mining Area 056<br>Delivery: Area18<br>Note: Front cargo grid</code>';
    });
  };
})();
