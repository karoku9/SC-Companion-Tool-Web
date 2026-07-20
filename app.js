'use strict';

const DATA = window.COMPANION_DATA;
const copy = value => JSON.parse(JSON.stringify(value));
const byId = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('en-US').format(Number(value || 0));
const markupSafe = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));
const makeId = prefix => prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const state = {
  ui: {
    page: 'dashboard',
    sidebarCollapsed: false,
    mapMode: 'orbital',
    selectedLocationId: 'bezdek',
    haulingView: 'list',
    intelTab: 'locations',
    toolsTab: 'ocr',
    openMissionMenu: null,
    editingMissionId: null,
    correctionOpen: false,
    adaptiveTheme: true,
    themeOverride: 'auto',
    manualTheme: 'neutral'
  },
  selectedShipId: 'caterpillar',
  startingLocationId: 'everus',
  missions: copy(DATA.missions),
  activeRoute: {
    stepIndex: 2,
    steps: copy(DATA.sampleRoute),
    ended: false
  },
  hauling: {
    selectedRouteId: 'trade-02',
    activeRunId: 'trade-02'
  }
};

const pageMeta = {
  dashboard: ['Operations overview', 'Dashboard'],
  planner: ['Contract hauling', 'Mission Planner'],
  active: ['Guided workflow', 'Active Route'],
  hauling: ['Commodity trading', 'Hauling'],
  map: ['Stanton reference', 'Map'],
  fleet: ['Ship management', 'Fleet'],
  intel: ['Operational knowledge', 'Intel'],
  tools: ['Local utilities', 'Tools'],
  settings: ['Application preferences', 'Settings']
};

function selectedShip() {
  return DATA.ships.find(ship => ship.id === state.selectedShipId) || DATA.ships[0];
}

function selectedStart() {
  return DATA.locations.find(location => location.id === state.startingLocationId) || DATA.locations[0];
}

function manufacturerTheme(ship = selectedShip()) {
  const maker = ship.maker.toLowerCase();
  if (maker.includes('drake')) return 'drake';
  if (maker.includes('roberts space industries')) return 'rsi';
  if (maker.includes('musashi industrial')) return 'misc';
  return 'neutral';
}

function resolvedTheme() {
  if (state.ui.themeOverride !== 'auto') return state.ui.themeOverride;
  if (state.ui.adaptiveTheme) return manufacturerTheme();
  return state.ui.manualTheme || 'neutral';
}

function applyTheme() {
  const theme = resolvedTheme();
  document.documentElement.dataset.theme = theme;
  const themeReadout = byId('headerTheme');
  if (themeReadout) themeReadout.textContent = theme.toUpperCase() + ' SYS';
}

function locationByName(name) {
  return DATA.locations.find(location => location.name === name) || DATA.locations[0];
}

function totalScu() {
  return state.missions.reduce((missionTotal, mission) =>
    missionTotal + mission.cargo.reduce((lotTotal, lot) => lotTotal + Number(lot.scu || 0), 0), 0);
}

function totalReward() {
  return state.missions.reduce((sum, mission) => sum + Number(mission.reward || 0), 0);
}

function missionOptions(selected) {
  return DATA.locations
    .filter(location => !['System', 'Planet', 'Gas Giant', 'Moon'].includes(location.type))
    .map(location => `<option value="${markupSafe(location.name)}"${location.name === selected ? ' selected' : ''}>${markupSafe(location.name)}</option>`)
    .join('');
}

function commodityOptions(selected) {
  return DATA.commodities
    .map(item => `<option value="${markupSafe(item.name)}"${item.name === selected ? ' selected' : ''}>${markupSafe(item.name)}</option>`)
    .join('');
}

function cargoStatus(lotId) {
  const pickupIndex = state.activeRoute.steps.findIndex(step => step.kind === 'pickup' && step.lotId === lotId);
  const deliveryIndex = state.activeRoute.steps.findIndex(step => step.kind === 'delivery' && step.lotId === lotId);
  const current = state.activeRoute.stepIndex;
  if (pickupIndex < 0) return 'Pending';
  if (current < pickupIndex) return 'Pending';
  if (current === pickupIndex) return 'Ready to load';
  if (deliveryIndex < 0 || current <= deliveryIndex) return 'On board';
  return 'Delivered';
}

function statusTone(status) {
  return status === 'Delivered' ? 'good' : status === 'On board' ? 'info' : status === 'Ready to load' ? 'warn' : '';
}

function locationSelector(value, id) {
  return `<label class="field"><span>Starting location</span><select id="${id}">${DATA.locations
    .filter(location => !['System', 'Planet', 'Gas Giant', 'Moon'].includes(location.type))
    .map(location => `<option value="${location.id}"${location.id === value ? ' selected' : ''}>${markupSafe(location.name)}</option>`)
    .join('')}</select></label>`;
}

function shipSelector(value, id) {
  return `<label class="field"><span>Selected ship</span><select id="${id}">${DATA.ships
    .map(ship => `<option value="${ship.id}"${ship.id === value ? ' selected' : ''}>${markupSafe(ship.name)} · ${ship.capacity} SCU</option>`)
    .join('')}</select></label>`;
}

function pageHeader(kicker, title, description, actions = '') {
  return `<header class="page-header">
    <div class="page-header-copy"><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${description}</p></div>
    ${actions ? `<div class="header-actions">${actions}</div>` : ''}
  </header>`;
}

function metric(label, value, detail, accent = false) {
  return `<article class="panel metric-card${accent ? ' is-accent' : ''}"><span>${label}</span><strong class="mono">${value}</strong><small>${detail}</small></article>`;
}

function routeMapMarkup(compact = false) {
  const nodes = DATA.locations.filter(location => ['Planet', 'Gas Giant', 'Moon', 'Orbital Station', 'Landing Zone', 'Outpost', 'Gateway'].includes(location.type));
  const currentStep = state.activeRoute.steps[state.activeRoute.stepIndex] || state.activeRoute.steps[0];
  const current = locationByName(currentStep.location);
  const next = locationByName(currentStep.nextLocation);
  return `<div class="map-chassis">
    <div class="map-bezel"><span>NAV / STANTON</span><span>GRID 07-A · APP TRACK</span></div>
    <div class="map-canvas${compact ? ' hauling-map' : ''}">
    <div class="map-readout map-readout-left"><b>POS</b> ${current.x.toFixed(1)} / ${current.y.toFixed(1)}</div>
    <div class="map-readout map-readout-right"><b>TGT</b> ${markupSafe(next.name).toUpperCase()}</div>
    <div class="map-orbit orbit-1"></div><div class="map-orbit orbit-2"></div><div class="map-orbit orbit-3"></div>
    <div class="map-star" title="Stanton star"></div>
    <svg class="route-line-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M ${current.x} ${current.y} L ${next.x} ${next.y}"/>
    </svg>
    ${nodes.map(location => `<button class="map-node${location.id === state.ui.selectedLocationId ? ' is-selected' : ''}" type="button" data-location="${location.id}" style="left:${location.x}%;top:${location.y}%"><i></i><strong>${markupSafe(location.name)}</strong><small>${markupSafe(location.type)}</small></button>`).join('')}
    <div class="map-legend"><span>● CURRENT</span><span>◇ DESTINATION</span><span>— APP ROUTE</span></div>
    </div>
    <div class="map-controls"><button type="button" data-action="phase-two" aria-label="Zoom out">−</button><span>ORB 1.00X</span><button type="button" data-action="phase-two" aria-label="Zoom in">＋</button></div>
  </div>`;
}

function renderDashboard() {
  const ship = selectedShip();
  return `<section class="page" data-page-view="dashboard">
    ${pageHeader('OPS CONTROL / READINESS', 'Cargo Operations Deck', 'Current vessel, contract load and route state for this local session.',
      '<button class="button button-primary" data-page="planner"><span>NEW</span> Add mission</button><button class="button button-secondary" data-page="active"><span>EXEC</span> Resume route</button>')}
    <div class="system-strip"><span><b>SYS</b> OPERATIONS DECK</span><span><i></i> LOCAL SESSION NOMINAL</span><span>LINK // OFFLINE</span></div>
    <section class="panel readiness-console">
      <div class="vessel-ident"><span class="module-code">VESSEL ASSIGNMENT // ${markupSafe(manufacturerTheme(ship)).toUpperCase()}</span><strong>${markupSafe(ship.name)}</strong><small>${markupSafe(ship.maker)} · ${markupSafe(ship.role)}</small></div>
      <div class="readiness-grid"><div><span>CARGO ENVELOPE</span><strong>${money(ship.capacity)} <small>SCU</small></strong><em>${money(totalScu())} planned</em></div><div><span>CONTRACT STACK</span><strong>${state.missions.length.toString().padStart(2, '0')}</strong><em>ready in memory</em></div><div><span>DECLARED REWARD</span><strong>${money(totalReward())}</strong><em>aUEC total</em></div><div><span>ROUTE STATE</span><strong>${String(state.activeRoute.stepIndex + 1).padStart(2, '0')} / ${String(state.activeRoute.steps.length).padStart(2, '0')}</strong><em>app-tracked</em></div></div>
    </section>
    <div class="dashboard-layout">
      <div class="dashboard-column">
        <section class="panel action-banner">
          <div><span class="eyebrow">EXECUTION CHANNEL A · STEP ${state.activeRoute.stepIndex + 1} OF ${state.activeRoute.steps.length}</span><h2>${markupSafe(state.activeRoute.steps[state.activeRoute.stepIndex].title)}</h2><p>${markupSafe(state.activeRoute.steps[state.activeRoute.stepIndex].detail)}</p></div>
          <button class="button button-primary button-large" data-page="active"><span>EXEC</span> Continue route →</button>
        </section>
        <section class="panel panel-pad">
          <div class="panel-head"><div><span class="module-code">NAV QUEUE // ROUTE 01</span><h2>Route preview</h2><p>Everus Harbor → HDMS-Bezdek → Lorville</p></div><span class="status-pill good">IN PROGRESS</span></div>
          <div class="route-mini"><div class="mini-route-line"></div><i class="mini-node one"></i><i class="mini-node two"></i><i class="mini-node three"></i><span class="mini-label one">Everus Harbor</span><span class="mini-label two">HDMS-Bezdek</span><span class="mini-label three">Lorville</span></div>
        </section>
        <section class="panel panel-pad">
          <div class="panel-head"><div><span class="module-code">CONTRACT BUFFER</span><h2>Recent missions</h2><p>Contract work prepared in this session</p></div><button class="link-button" data-page="planner">View planner</button></div>
          <div class="list-stack">${state.missions.slice(0,3).map(mission => `<div class="list-row"><div><strong>${markupSafe(mission.reference)} · ${markupSafe(mission.title)}</strong><small>${mission.cargo.length} cargo lots · ${mission.cargo.reduce((sum, lot) => sum + lot.scu, 0)} SCU</small></div><b>${money(mission.reward)} aUEC</b></div>`).join('')}</div>
        </section>
      </div>
      <aside class="dashboard-column">
        <section class="panel panel-pad">
          <div class="panel-head"><div><span class="module-code">CONTROL BANK // A</span><h2>Quick actions</h2><p>Direct access to local systems</p></div></div>
          <div class="quick-grid">
            <button class="quick-action" data-action="add-mission"><i>＋</i><span><strong>Add mission</strong><small>Build a contract</small></span></button>
            <button class="quick-action" data-action="import-mission"><i>↥</i><span><strong>Import mission</strong><small>Paste readable text</small></span></button>
            <button class="quick-action" data-page="tools" data-tools-tab="ocr"><i>▣</i><span><strong>Open OCR</strong><small>Mock parser</small></span></button>
            <button class="quick-action" data-page="tools" data-tools-tab="agent"><i>⌁</i><span><strong>Connect Log Agent</strong><small>Prototype only</small></span></button>
            <button class="quick-action" data-page="hauling"><i>⇄</i><span><strong>Plan hauling route</strong><small>Demo market data</small></span></button>
            <button class="quick-action" data-page="active"><i>→</i><span><strong>Resume route</strong><small>Step ${state.activeRoute.stepIndex + 1} of 8</small></span></button>
          </div>
        </section>
        <section class="panel panel-pad">
          <div class="panel-head"><div><span class="module-code">MARKET BUFFER // DEMO</span><h2>Recent hauling routes</h2><p>Fixed market opportunities</p></div><span class="chip warn">DEMO DATA</span></div>
          <div class="list-stack">${DATA.haulingRoutes.slice(0,3).map(route => `<div class="list-row"><div><strong>${route.commodity}</strong><small>${route.buy} → ${route.sell}</small></div><b class="text-green">+${money(route.totalProfit)}</b></div>`).join('')}</div>
        </section>
      </aside>
    </div>
  </section>`;
}

function missionCard(mission) {
  const missionScu = mission.cargo.reduce((sum, lot) => sum + Number(lot.scu || 0), 0);
  return `<article class="mission-card">
    <div class="mission-card-head">
      <div class="mission-title-line"><div class="chip-row"><span class="chip info">${markupSafe(mission.reference || 'No reference')}</span><span class="chip">${markupSafe(mission.type)}</span></div><h3 class="spacer-top">${markupSafe(mission.title)}</h3><p>${money(mission.reward)} aUEC · ${missionScu} SCU</p></div>
      <div class="card-menu">
        <button class="menu-trigger" type="button" data-mission-menu="${mission.id}" aria-label="Mission actions" aria-expanded="${state.ui.openMissionMenu === mission.id}">···</button>
        ${state.ui.openMissionMenu === mission.id ? `<div class="context-menu"><button data-edit-mission="${mission.id}">Edit mission</button><button data-duplicate-mission="${mission.id}">Duplicate</button><button class="danger" data-delete-mission="${mission.id}">Delete</button></div>` : ''}
      </div>
    </div>
    <div class="cargo-lots">${mission.cargo.map(lot => `<div class="cargo-lot-row"><div><strong>${markupSafe(lot.commodity)} <span class="text-accent">· ${markupSafe(mission.reference)}</span></strong><small>${markupSafe(lot.pickup)} → ${markupSafe(lot.delivery)}${lot.note ? ' · ' + markupSafe(lot.note) : ''}</small></div><b>${lot.scu} SCU</b></div>`).join('')}</div>
  </article>`;
}

function renderPlanner() {
  const ship = selectedShip();
  const used = totalScu();
  const percent = Math.min(100, (used / ship.capacity) * 100);
  return `<section class="page" data-page-view="planner">
    ${pageHeader('CARGO CONTROL / LOAD PLAN', 'Mission Planner', 'Configure vessel, departure point and contract lots. Route optimization remains offline.',
      '<button class="button button-secondary" data-action="import-mission"><span>IMP</span> Import mission</button><button class="button button-primary" data-action="add-mission"><span>NEW</span> Add mission</button>')}
    <div class="system-strip"><span><b>SYS</b> CARGO PLANNER</span><span><i></i> SESSION READY</span><span>MEM // IN-MEMORY</span></div>
    <section class="panel setup-strip">
      ${shipSelector(state.selectedShipId, 'plannerShip')}
      ${locationSelector(state.startingLocationId, 'plannerStart')}
      <div class="ship-readout"><span>${money(ship.capacity)} SCU</span><small>${markupSafe(ship.role)}</small></div>
      <button class="button button-secondary" data-action="phase-two"><span>CALC</span> Calculate route</button>
    </section>
    <div class="planner-layout">
      <section class="panel panel-pad">
        <div class="panel-head"><div><span class="module-code">MODULE 01 // CONTRACT STACK</span><h2>Contract missions</h2><p>${state.missions.length} missions · ${used} planned SCU</p></div><span class="status-pill good">READY</span></div>
        <div class="mission-list">${state.missions.length ? state.missions.map(missionCard).join('') : '<div class="empty-state">No missions yet. Add or import a contract to begin.</div>'}</div>
      </section>
      <section class="panel panel-pad route-preview">
        <div>
          <div class="panel-head"><div><span class="module-code">MODULE 02 // ROUTE QUEUE</span><h2>Route preview</h2><p>Predefined visual route for Checkpoint 1</p></div><span class="chip warn">OPT OFFLINE</span></div>
          <div class="plan-summary">
            <div><span>Planned cargo</span><strong>${used} SCU</strong><div class="capacity-bar"><i style="width:${percent}%"></i></div><small>${Math.round(percent)}% of ${ship.capacity} SCU</small></div>
            <div><span>Total reward</span><strong>${money(totalReward())}</strong><small>aUEC declared</small></div>
            <div><span>Stops</span><strong>3</strong><small>Everus · Bezdek · Lorville</small></div>
          </div>
        </div>
        <div class="route-steps">${state.activeRoute.steps.slice(0,6).map((step, index) => `<div class="route-step${index === 0 ? ' is-current' : ''}"><span class="step-index">${index + 1}</span><div><strong>${markupSafe(step.title)}</strong><small>${markupSafe(step.detail)}</small></div><span class="chip">${markupSafe(step.kind)}</span></div>`).join('')}</div>
        <div class="button-row spacer-top"><button class="button button-secondary" data-action="phase-two">Calculate route</button><button class="button button-primary" data-page="active">Open sample route</button></div>
      </section>
    </div>
  </section>`;
}

function renderActive() {
  const steps = state.activeRoute.steps;
  const index = state.activeRoute.stepIndex;
  const step = steps[index];
  const previous = steps[index - 1];
  const next = steps[index + 1];
  const manifestLots = state.missions.flatMap(mission => mission.cargo.map(lot => ({ ...lot, reference: mission.reference }))).filter(lot => ['lot-01', 'lot-03'].includes(lot.id));
  const destination = locationByName(step.nextLocation);
  return `<section class="page" data-page-view="active">
    ${pageHeader('ROUTE CONTROL / EXECUTION', 'Active Route', 'App-tracked workflow. Confirm each physical cargo operation before advancing.',
      '<button class="button button-ghost" data-action="end-route"><span>TERM</span> End route</button>')}
    <div class="notice">APP-TRACKED ROUTE — NOT LIVE GAME TELEMETRY</div>
    <div class="active-layout spacer-top">
      <div class="active-main">
        <section class="panel action-stage">
          <div class="action-console-head"><span>EXECUTION CHANNEL A</span><span>STEP ${String(index + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}</span></div>
          <div class="action-counter">CURRENT COMMAND</div>
          <div class="action-kind">${markupSafe(step.kind)}</div>
          <h2>${markupSafe(step.title)}</h2>
          <p>${markupSafe(step.detail)}</p>
          <div class="command-deck">
            <button class="previous-button" type="button" data-active-previous${index === 0 ? ' disabled' : ''}><span>◀</span><small>BACK</small><strong>Previous</strong></button>
            <button class="next-button" type="button" data-active-next${index >= steps.length - 1 ? ' disabled' : ''}><small>CONFIRM PHYSICAL ACTION</small><strong>EXECUTE NEXT</strong><span>▶</span></button>
          </div>
          <div class="step-neighbours">
            <div class="neighbour"><span>Previous</span><strong>${previous ? markupSafe(previous.title) : 'Route start'}</strong></div>
            <div class="neighbour"><span>Up next</span><strong>${next ? markupSafe(next.title) : 'Route complete'}</strong></div>
          </div>
          <div class="correct-wrap">
            <button class="link-button" data-correct-toggle aria-expanded="${state.ui.correctionOpen}">Correct status</button>
            ${state.ui.correctionOpen ? '<div class="correct-menu"><p>Manual correction is secondary to the guided workflow.</p><div class="button-row"><button class="button button-small button-ghost" data-correction="-1">Move one step back</button><button class="button button-small button-ghost" data-correction="1">Move one step forward</button></div></div>' : ''}
          </div>
        </section>
        <section class="panel panel-pad">
          <div class="panel-head"><div><h2>Current and next locations</h2><p>${markupSafe(step.location)} → ${markupSafe(step.nextLocation)}</p></div><button class="link-button" data-page="map">Open full map</button></div>
          ${routeMapMarkup(true)}
        </section>
      </div>
      <aside class="active-side">
        <section class="panel panel-pad">
          <div class="panel-head"><div><h2>Cargo manifest</h2><p>Mission lots remain distinct</p></div><span class="chip">${manifestLots.reduce((sum, lot) => sum + lot.scu, 0)} SCU</span></div>
          <div class="manifest-list">${manifestLots.map(lot => { const status = cargoStatus(lot.id); return `<div class="manifest-row"><div><strong>${lot.scu} SCU ${markupSafe(lot.commodity)}</strong><small>${markupSafe(lot.reference)} · ${markupSafe(lot.pickup)} → ${markupSafe(lot.delivery)}</small></div><span class="status-pill ${statusTone(status)}">${status}</span></div>`; }).join('')}</div>
        </section>
        <section class="panel panel-pad">
          <div class="panel-head"><div><h2>${markupSafe(destination.name)}</h2><p>Destination information</p></div><span class="status-pill ${destination.danger === 'High' ? 'danger' : 'good'}">${markupSafe(destination.reliability)}</span></div>
          <div class="service-grid">
            <div><span>Landing</span><strong>${markupSafe(destination.landing)}</strong></div>
            <div><span>Refuel</span><strong>${destination.refuel ? 'Available' : 'Unavailable'}</strong></div>
            <div><span>Repair</span><strong>${destination.repair ? 'Available' : 'Unavailable'}</strong></div>
            <div><span>Traffic</span><strong>${markupSafe(destination.traffic)}</strong></div>
            <div><span>Danger</span><strong>${markupSafe(destination.danger)}</strong></div>
            <div><span>OM assists</span><strong>${markupSafe(destination.hops)}</strong></div>
          </div>
          <p class="spacer-top">${markupSafe(destination.note)}</p>
        </section>
        <section class="panel panel-pad">
          <div class="panel-head"><div><h2>Full timeline</h2><p>Sample route progression</p></div></div>
          <div class="route-timeline">${steps.map((item, itemIndex) => `<div class="timeline-item${itemIndex === index ? ' is-current' : itemIndex < index ? ' is-done' : ''}"><i>${itemIndex < index ? '✓' : itemIndex + 1}</i><div><strong>${markupSafe(item.title)}</strong><small>${itemIndex === index ? 'Current action' : itemIndex < index ? 'Completed' : 'Queued'}</small></div></div>`).join('')}</div>
        </section>
      </aside>
    </div>
  </section>`;
}

function renderHauling() {
  const ship = selectedShip();
  return `<section class="page" data-page-view="hauling">
    ${pageHeader('MARKET TERMINAL / LOGISTICS', 'Commodity Hauling', 'Compare fixed demo opportunities separately from contract missions.',
      `<div class="segmented"><button class="${state.ui.haulingView === 'list' ? 'is-active' : ''}" data-hauling-view="list">LIST</button><button class="${state.ui.haulingView === 'map' ? 'is-active' : ''}" data-hauling-view="map">MAP</button></div>`)}
    <div class="notice is-demo">DEMO MARKET DATA — LIVE PROVIDER NOT CONNECTED</div>
    ${state.hauling.activeRunId ? `<section class="panel active-run-card spacer-top"><div><span class="eyebrow">RUN CHANNEL 01 // ACTIVE</span><h2 class="spacer-top">Laranite · HDMS-Lathan → Lorville</h2><p>140 SCU planned · estimated profit 76,580 aUEC</p></div><div class="run-state"><span class="status-pill good">TRACKING</span><div class="button-row"><button class="button button-ghost" data-action="feature" data-feature="partial">Partial sell</button><button class="button button-primary" data-action="complete-run">Complete run</button></div></div></section>` : ''}
    <section class="panel filter-bar spacer-top">
      <div class="filter-heading"><span class="module-code">FILTER BANK // MARKET QUERY</span><strong>ROUTE PARAMETERS</strong><small>All values use fixed Checkpoint 1 data</small></div>
      ${shipSelector(state.selectedShipId, 'haulingShip')}
      <label class="field"><span>Origin</span><select><option>Any origin</option><option>Hurston</option><option>ArcCorp</option><option>microTech</option></select></label>
      <label class="field"><span>Destination</span><select><option>Any destination</option><option>Lorville</option><option>Area18</option><option>New Babbage</option></select></label>
      <label class="field"><span>Commodity</span><select><option>All commodities</option>${commodityOptions('')}</select></label>
      <label class="field"><span>Legal status</span><select><option>Legal only</option><option>Legal and illegal</option></select></label>
      <label class="field"><span>Terminal type</span><select><option>All terminals</option><option>Outposts</option><option>Cities</option><option>Stations</option></select></label>
      <label class="field"><span>Minimum stock</span><input type="number" value="100"></label>
      <label class="field"><span>Route priority</span><select><option>Best aUEC / hour</option><option>Total profit</option><option>Profit / SCU</option><option>Shortest run</option></select></label>
    </section>
    <div class="market-readouts spacer-top">
      ${metric('Routes found', '12', '3 strong matches')}
      ${metric('Best total profit', '80,828', 'aUEC per run', true)}
      ${metric('Best aUEC / hour', '211,000', 'Demo estimate')}
      ${metric('Best profit / SCU', '578', 'aUEC per SCU')}
    </div>
    <div class="hauling-toolbar"><div><span class="module-code">VESSEL LIMIT</span><strong>${money(ship.capacity)} SCU capacity</strong><small> · 1,250,000 aUEC available capital</small></div><button class="button button-secondary" data-action="phase-two"><span>CALC</span> Plan route</button></div>
    ${state.ui.haulingView === 'list' ? `<div class="market-table">${DATA.haulingRoutes.map((route, routeIndex) => `<article class="panel route-card"><div class="route-code">R-${String(routeIndex + 1).padStart(2, '0')}</div><div class="route-card-main"><span class="chip good">${route.commodity}</span><strong class="spacer-top">${markupSafe(route.buy)} → ${markupSafe(route.sell)}</strong><small>${route.travel} · prices ${route.freshness}</small></div><div class="route-stat"><span>Profit / SCU</span><strong class="text-green">+${money(route.profitScu)}</strong></div><div class="route-stat"><span>Total profit</span><strong>${money(route.totalProfit)}</strong></div><div class="route-stat hide-small"><span>aUEC / hour</span><strong>${money(route.hourly)}</strong></div><div class="route-stat hide-medium"><span>Upfront cost</span><strong>${money(route.cost)}</strong></div><div class="route-card-actions"><button class="button button-small button-secondary" data-route-details="${route.id}">View details</button><button class="button button-small button-primary" data-start-run="${route.id}">Start run</button></div></article>`).join('')}</div>` : routeMapMarkup()}
  </section>`;
}

function renderMap() {
  const selected = DATA.locations.find(location => location.id === state.ui.selectedLocationId) || DATA.locations[0];
  const parents = ['Hurston', 'ArcCorp', 'Crusader', 'microTech'];
  return `<section class="page" data-page-view="map">
    ${pageHeader('NAV SYSTEM / STANTON', 'Orbital Navigation Reference', 'Select a location to inspect fixed services, risk and operational notes.',
      `<div class="segmented"><button class="${state.ui.mapMode === 'orbital' ? 'is-active' : ''}" data-map-mode="orbital">Orbital Map</button><button class="${state.ui.mapMode === 'tree' ? 'is-active' : ''}" data-map-mode="tree">Entity Tree</button></div>`)}
    <div class="notice">APP-TRACKED ROUTE — NOT LIVE GAME TELEMETRY</div>
    <div class="map-layout spacer-top">
      <section class="panel panel-pad">
        ${state.ui.mapMode === 'orbital' ? routeMapMarkup() : `<div class="entity-tree">${parents.map(parent => `<section class="tree-group"><strong>Stanton → ${parent}</strong><div class="tree-children">${DATA.locations.filter(location => location.parent === parent || DATA.locations.find(item => item.name === location.parent)?.parent === parent).map(location => `<button class="${location.id === selected.id ? 'is-selected' : ''}" data-location="${location.id}"><span>${markupSafe(location.name)}</span><small>${markupSafe(location.type)}</small></button>`).join('')}</div></section>`).join('')}</div>`}
      </section>
      <aside class="inspector nav-inspector">
        <section class="panel panel-pad">
          <span class="module-code">ENTITY RECORD // ${markupSafe(selected.id).toUpperCase()}</span><span class="eyebrow">${markupSafe(selected.type)}</span><h2 class="spacer-top">${markupSafe(selected.name)}</h2><p class="spacer-top">${markupSafe(selected.note)}</p>
          <div class="service-grid spacer-top">
            <div><span>Parent</span><strong>${markupSafe(selected.parent)}</strong></div>
            <div><span>Landing</span><strong>${markupSafe(selected.landing)}</strong></div>
            <div><span>Refuel</span><strong>${selected.refuel ? 'Yes' : 'No'}</strong></div>
            <div><span>Repair</span><strong>${selected.repair ? 'Yes' : 'No'}</strong></div>
            <div><span>Traffic</span><strong>${markupSafe(selected.traffic)}</strong></div>
            <div><span>Danger</span><strong>${markupSafe(selected.danger)}</strong></div>
            <div><span>Reliability</span><strong>${markupSafe(selected.reliability)}</strong></div>
            <div><span>OM assists</span><strong>${markupSafe(selected.hops)}</strong></div>
          </div>
        </section>
        <div class="notice is-demo">FIXED COMMUNITY PROFILE — NOT LIVE DATA</div>
      </aside>
    </div>
  </section>`;
}

function renderFleet() {
  return `<section class="page" data-page-view="fleet">
    ${pageHeader('VEHICLE SYSTEM / REGISTRY', 'Fleet Registry', 'Hangar records with fixed cargo capacity and role profiles.',
      '<button class="button button-secondary" data-action="compare-ships"><span>COMP</span> Compare two ships</button><button class="button button-primary" data-action="add-ship-preview"><span>REG</span> Add ship</button>')}
    <div class="system-strip"><span><b>SYS</b> VEHICLE MANAGEMENT</span><span><i></i> ${DATA.ships.length} RECORDS AVAILABLE</span><span>SOURCE // FIXED PROFILE</span></div>
    <div class="fleet-grid">${DATA.ships.map((ship, shipIndex) => `<article class="panel ship-card-large${ship.id === state.selectedShipId ? ' is-selected' : ''}" data-maker="${manufacturerTheme(ship)}"><div class="ship-card-top"><span>REG ${String(shipIndex + 1).padStart(3, '0')}</span><b>${manufacturerTheme(ship).toUpperCase()} // ${markupSafe(ship.variant).toUpperCase()}</b></div><div class="ship-visual" aria-hidden="true"><span class="ship-schematic"><i></i><i></i><i></i></span><small>VEHICLE PROFILE // ${markupSafe(ship.family).toUpperCase()}</small></div><div class="ship-record"><div class="chip-row"><span class="chip">${markupSafe(ship.family)}</span><span class="chip info">${markupSafe(ship.variant)}</span></div><h3>${markupSafe(ship.name)}</h3><p>${markupSafe(ship.maker)} · ${markupSafe(ship.role)}</p><div class="ship-meta"><div><span>Cargo capacity</span><strong>${money(ship.capacity)} <small>SCU</small></strong></div><button class="button button-small ${ship.id === state.selectedShipId ? 'button-primary' : 'button-secondary'}" data-select-ship="${ship.id}">${ship.id === state.selectedShipId ? 'Selected' : 'Use in Planner'}</button></div></div></article>`).join('')}</div>
  </section>`;
}

function renderIntel() {
  const tabs = ['locations', 'commodities', 'services', 'issues', 'reports'];
  let content = '';
  if (state.ui.intelTab === 'locations') {
    content = DATA.locations.filter(location => !['System', 'Planet', 'Gas Giant', 'Moon'].includes(location.type)).slice(0,9).map(location => `<article class="panel intel-card"><span class="eyebrow">${markupSafe(location.type)} · ${markupSafe(location.parent)}</span><h3 class="spacer-top">${markupSafe(location.name)}</h3><p>${markupSafe(location.note)}</p><div class="chip-row"><span class="chip ${location.refuel ? 'good' : ''}">Refuel ${location.refuel ? 'yes' : 'no'}</span><span class="chip">Traffic ${location.traffic}</span><span class="chip ${location.danger === 'High' ? 'danger' : 'info'}">Danger ${location.danger}</span></div><div class="intel-card-footer"><span>${markupSafe(location.reliability)} reliability</span><span>Updated · fixed profile</span></div></article>`).join('');
  } else if (state.ui.intelTab === 'commodities') {
    content = DATA.commodities.map(item => `<article class="panel intel-card"><span class="eyebrow">${markupSafe(item.category)}</span><h3 class="spacer-top">${markupSafe(item.name)}</h3><p>Reference profile for hauling and contract cargo identification.</p><div class="chip-row"><span class="chip ${item.legality === 'Illegal' ? 'danger' : 'good'}">${item.legality}</span><span class="chip">Volatility ${item.volatility}</span></div><div class="intel-card-footer"><span>Demo reference</span><span>No live price</span></div></article>`).join('');
  } else if (state.ui.intelTab === 'services') {
    content = DATA.locations.filter(location => location.refuel || location.repair).slice(0,9).map(location => `<article class="panel intel-card"><span class="eyebrow">${markupSafe(location.type)}</span><h3 class="spacer-top">${markupSafe(location.name)}</h3><p>Landing: ${markupSafe(location.landing)}</p><div class="chip-row"><span class="chip good">Refuel ${location.refuel ? 'available' : 'unavailable'}</span><span class="chip good">Repair ${location.repair ? 'available' : 'unavailable'}</span></div><div class="intel-card-footer"><span>${markupSafe(location.parent)}</span><span>Fixed profile</span></div></article>`).join('');
  } else if (state.ui.intelTab === 'issues') {
    content = DATA.issues.map(issue => `<article class="panel intel-card"><span class="eyebrow">${markupSafe(issue.location)}</span><h3 class="spacer-top">${markupSafe(issue.title)}</h3><p>${markupSafe(issue.detail)}</p><div class="chip-row"><span class="chip warn">${markupSafe(issue.severity)}</span></div><div class="intel-card-footer"><span>Known issue</span><span>${markupSafe(issue.updated)}</span></div></article>`).join('');
  } else {
    content = DATA.reports.map(report => `<article class="panel intel-card"><span class="eyebrow">${markupSafe(report.location)}</span><h3 class="spacer-top">Community terminal report</h3><p>${markupSafe(report.message)}</p><div class="chip-row"><span class="chip ${report.tone}">${markupSafe(report.age)}</span></div><div class="intel-card-footer"><span>Demo community report</span><span>Not verified live</span></div></article>`).join('');
  }
  return `<section class="page" data-page-view="intel">
    ${pageHeader('DATABASE / LOCAL REFERENCE', 'Onboard Intel Database', 'Locations, cargo, services and known issues in one indexed reference.',
      '<label class="field search-bar"><span>Search intel</span><input id="intelSearch" type="search" placeholder="Search locations, commodities or reports"></label>')}
    <div class="system-strip"><span><b>DB</b> STANTON OPERATIONS INDEX</span><span><i></i> READ-ONLY CACHE</span><span>LIVE LINK // OFFLINE</span></div>
    <div class="panel panel-pad intel-console"><div class="tab-list" role="tablist">${tabs.map((tab, tabIndex) => `<button class="tab-button${state.ui.intelTab === tab ? ' is-active' : ''}" role="tab" aria-selected="${state.ui.intelTab === tab}" data-intel-tab="${tab}"><small>0${tabIndex + 1}</small>${tab === 'issues' ? 'Known Issues' : tab === 'reports' ? 'Community Reports' : tab[0].toUpperCase() + tab.slice(1)}</button>`).join('')}</div><div class="intel-grid spacer-top" id="intelResults">${content}</div></div>
  </section>`;
}

function renderTools() {
  const tabs = ['ocr', 'agent', 'transfer'];
  let panel = '';
  if (state.ui.toolsTab === 'ocr') {
    panel = `<div class="tool-grid spacer-top"><section class="panel panel-pad"><div class="panel-head"><div><span class="module-code">TOOL 01 // CAPTURE INGEST</span><h2>Mission OCR</h2><p>Visual workflow preview for future screenshot parsing</p></div><span class="chip warn">MOCK PARSER</span></div><button class="upload-zone" data-action="mock-ocr"><span class="upload-reticle">＋</span><span><b>Drop a mission screenshot here</b><p>or choose an image from your computer</p><span class="button button-secondary spacer-top">Choose screenshot</span></span></button><div class="button-row spacer-top"><button class="button button-ghost" data-action="mock-ocr">Paste screenshot</button><button class="button button-ghost" data-action="feature" data-feature="captures">Recent captures</button></div></section><section class="panel panel-pad"><div class="panel-head"><div><span class="module-code">PARSER OUTPUT // EXAMPLE</span><h2>Detected fields</h2><p>Static preview only</p></div><span class="status-pill warn">REVIEW NEEDED</span></div><div class="ocr-preview"><div class="detected-row"><div><strong>Mission</strong><small>Covalex freight transfer</small></div><span class="confidence">96%</span></div><div class="detected-row"><div><strong>Reward</strong><small>46,250 aUEC</small></div><span class="confidence">93%</span></div><div class="detected-row"><div><strong>Cargo</strong><small>8 SCU Agricium</small></div><span class="confidence">88%</span></div><div class="detected-row"><div><strong>Destination</strong><small>Area18</small></div><span class="confidence">91%</span></div></div><button class="button button-primary spacer-top" data-action="mock-ocr">Review and import</button></section></div>`;
  } else if (state.ui.toolsTab === 'agent') {
    panel = `<div class="tool-grid spacer-top"><section class="panel panel-pad"><div class="panel-head"><div><h2>Log Agent / Datalink</h2><p>Future local Game.log companion</p></div><span class="status-pill danger">Disconnected</span></div><div class="notice is-demo">AGENT NOT CONNECTED IN THIS PROTOTYPE</div><label class="field spacer-top"><span>Game.log path</span><input value="C:\\Program Files\\Roberts Space Industries\\StarCitizen\\LIVE\\Game.log" readonly></label><div class="button-row spacer-top"><button class="button button-primary" data-action="mock-agent">Connect</button><button class="button button-secondary" disabled>Disconnect</button><button class="button button-secondary" data-action="mock-agent">Start monitoring</button></div><p class="spacer-top">Planned processing is local-only. No log contents will leave your device without explicit action.</p></section><section class="panel panel-pad"><div class="panel-head"><div><h2>Detected activity</h2><p>Illustrative event stream</p></div><span class="chip">Shard EU-090</span></div><div class="service-grid"><div><span>Last location</span><strong>Everus Harbor</strong></div><div><span>Cargo events</span><strong>3 detected</strong></div></div><div class="event-stream spacer-top"><div class="event-row"><div><strong>Location change</strong><small>Everus Harbor</small></div><time>18:42</time></div><div class="event-row"><div><strong>Purchase detected</strong><small>12 SCU Medical Supplies</small></div><time>18:39</time></div><div class="event-row"><div><strong>Cargo event</strong><small>Freight elevator transfer</small></div><time>18:36</time></div></div></section></div>`;
  } else {
    panel = `<div class="tool-grid spacer-top"><section class="panel panel-pad"><div class="panel-head"><div><h2>Import application data</h2><p>Restore a future Waypoint JSON backup</p></div></div><div class="upload-zone"><span><b>Choose a JSON backup</b><p>Validation and import arrive in Checkpoint 3.</p><button class="button button-secondary spacer-top" data-action="phase-three">Choose JSON</button></span></div></section><section class="panel panel-pad"><div class="panel-head"><div><h2>Export and reset</h2><p>Local data controls</p></div></div><div class="list-stack"><div class="list-row"><div><strong>Export JSON</strong><small>Download missions, fleet and settings</small></div><button class="button button-secondary" data-action="phase-three">Export</button></div><div class="list-row"><div><strong>Reset local data</strong><small>Restore the sample workspace</small></div><button class="button button-danger" data-action="phase-three">Reset</button></div></div></section></div>`;
  }
  return `<section class="page" data-page-view="tools">${pageHeader('UTILITY BAY / LOCAL SYSTEMS', 'Onboard Tools', 'Unavailable integrations remain explicitly marked and never report a false connection.')}<div class="system-strip"><span><b>SYS</b> UTILITY BAY</span><span><i></i> LOCAL INTERFACE READY</span><span>EXTERNAL LINKS // OFFLINE</span></div><div class="panel panel-pad tools-console"><div class="tab-list" role="tablist">${tabs.map((tab, tabIndex) => `<button class="tab-button${state.ui.toolsTab === tab ? ' is-active' : ''}" role="tab" aria-selected="${state.ui.toolsTab === tab}" data-tools-tab="${tab}"><small>0${tabIndex + 1}</small>${tab === 'ocr' ? 'Mission OCR' : tab === 'agent' ? 'Log Agent / Datalink' : 'Import / Export'}</button>`).join('')}</div>${panel}</div></section>`;
}

function renderSettings() {
  return `<section class="page" data-page-view="settings">
    ${pageHeader('SYSTEM CONFIG / LOCAL', 'Interface Settings', 'Manufacturer identity is active in memory; persistence remains offline.')}
    <div class="system-strip"><span><b>CFG</b> INTERFACE CONTROL</span><span><i></i> CHANGES APPLY IMMEDIATELY</span><span>STORAGE // VOLATILE</span></div>
    <div class="settings-grid">
      <section class="panel setting-group"><h2>Manufacturer interface</h2><div class="setting-row"><div><strong>Adaptive ship-brand theme</strong><small>Auto follows the selected ship manufacturer</small></div><button class="switch${state.ui.adaptiveTheme ? ' is-on' : ''}" data-theme-adaptive aria-label="Toggle adaptive ship-brand theme" aria-pressed="${state.ui.adaptiveTheme}"></button></div><label class="setting-row"><span><strong>Theme override</strong><small>Manual choice always takes precedence</small></span><select id="themeOverride"><option value="auto"${state.ui.themeOverride === 'auto' ? ' selected' : ''}>Auto</option><option value="neutral"${state.ui.themeOverride === 'neutral' ? ' selected' : ''}>Neutral</option><option value="drake"${state.ui.themeOverride === 'drake' ? ' selected' : ''}>Drake</option><option value="rsi"${state.ui.themeOverride === 'rsi' ? ' selected' : ''}>RSI</option><option value="misc"${state.ui.themeOverride === 'misc' ? ' selected' : ''}>MISC</option></select></label><div class="setting-row"><div><strong>Resolved system</strong><small>Applied across chassis, displays and controls</small></div><strong>${resolvedTheme().toUpperCase()}</strong></div><div class="setting-row"><div><strong>Reduced motion</strong><small>Limit interface transitions</small></div><button class="switch is-on" data-action="toggle-setting" aria-label="Toggle reduced motion"></button></div></section>
      <section class="panel setting-group"><h2>Defaults</h2><div class="setting-row"><div><strong>Default ship</strong><small>Used when creating a plan</small></div><strong>Drake Caterpillar</strong></div><div class="setting-row"><div><strong>Starting location</strong><small>Default departure point</small></div><strong>Everus Harbor</strong></div><div class="setting-row"><div><strong>Map mode</strong><small>Initial map presentation</small></div><strong>Orbital Map</strong></div></section>
      <section class="panel setting-group"><h2>Data and visibility</h2><div class="setting-row"><div><strong>Automatic local save</strong><small>Available in Checkpoint 2</small></div><button class="switch is-on" data-action="toggle-setting" aria-label="Toggle automatic save"></button></div><div class="setting-row"><div><strong>Show illegal commodities</strong><small>Include contraband in filters</small></div><button class="switch" data-action="toggle-setting" aria-label="Toggle illegal commodities"></button></div></section>
      <section class="panel setting-group"><h2>Formatting and maintenance</h2><div class="setting-row"><div><strong>Units</strong><small>Cargo and distance</small></div><strong>SCU · Gm</strong></div><div class="setting-row"><div><strong>Numbers</strong><small>Locale formatting</small></div><strong>1,234.56</strong></div><div class="button-row spacer-top"><button class="button button-secondary" data-page="tools" data-tools-tab="transfer">Import / Export</button><button class="button button-danger" data-action="phase-three">Reset application</button></div></section>
      <section class="panel setting-group planned-system"><div class="setting-title-line"><h2>Display texture</h2><span class="chip warn">PLANNED</span></div><div class="planned-display"><strong>INDEPENDENT DISPLAY RENDERING LAYER</strong><p>Future control for Clean, MFD Glass, CRT / Phosphor and Industrial LCD treatments.</p><div class="planned-map"><span>Drake <b>CRT / Phosphor</b></span><span>RSI <b>MFD Glass</b></span><span>MISC <b>Industrial LCD</b></span><span>Neutral <b>Clean</b></span></div></div><small>No control is enabled in Checkpoint 1. This system will remain separate from manufacturer chassis themes.</small></section>
    </div>
  </section>`;
}

function renderPage() {
  applyTheme();
  const renderers = {
    dashboard: renderDashboard,
    planner: renderPlanner,
    active: renderActive,
    hauling: renderHauling,
    map: renderMap,
    fleet: renderFleet,
    intel: renderIntel,
    tools: renderTools,
    settings: renderSettings
  };
  byId('pageFrame').innerHTML = renderers[state.ui.page]();
  const meta = pageMeta[state.ui.page];
  byId('pageEyebrow').textContent = meta[0];
  byId('pageTitle').textContent = meta[1];
  document.title = meta[1] + ' · Waypoint Cargo Companion';
  document.querySelectorAll('[data-page]').forEach(button => {
    const active = button.dataset.page === state.ui.page;
    button.classList.toggle('is-active', active);
    if (button.classList.contains('nav-item')) {
      active ? button.setAttribute('aria-current', 'page') : button.removeAttribute('aria-current');
    }
  });
  const ship = selectedShip();
  byId('headerShip').textContent = ship.name;
  byId('headerShipCapacity').textContent = money(ship.capacity) + ' SCU';
  byId('headerLocation').textContent = selectedStart().name;
}

function navigate(page) {
  if (!pageMeta[page]) return;
  state.ui.page = page;
  state.ui.openMissionMenu = null;
  state.ui.correctionOpen = false;
  closeMobileNav();
  renderPage();
  byId('pageFrame').focus({ preventScroll: true });
}

function showToast(title, message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<strong>${markupSafe(title)}</strong><small>${markupSafe(message)}</small>`;
  byId('toastRegion').appendChild(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

function closeAllDialogs() {
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
}

function openMissionEditor(mission = null) {
  state.ui.editingMissionId = mission?.id || null;
  byId('missionDialogTitle').textContent = mission ? 'Edit mission' : 'Create mission';
  byId('missionTitle').value = mission?.title || '';
  byId('missionType').value = mission?.type || 'Hauling';
  byId('missionReference').value = mission?.reference || '';
  byId('missionReward').value = mission?.reward || '';
  byId('missionNotes').value = mission?.notes || '';
  const lots = mission?.cargo?.length ? copy(mission.cargo) : [{ id: makeId('lot'), commodity: 'Titanium', scu: 8, pickup: 'HDMS-Bezdek', delivery: 'Lorville', note: '' }];
  renderCargoEditor(lots);
  byId('missionDialog').showModal();
  byId('missionTitle').focus();
}

function cargoEditorData() {
  return [...byId('cargoEditor').querySelectorAll('.cargo-edit-row')].map(row => ({
    id: row.dataset.lotId || makeId('lot'),
    commodity: row.querySelector('[data-lot-field="commodity"]').value,
    scu: Math.max(0, Number(row.querySelector('[data-lot-field="scu"]').value || 0)),
    pickup: row.querySelector('[data-lot-field="pickup"]').value,
    delivery: row.querySelector('[data-lot-field="delivery"]').value,
    note: row.querySelector('[data-lot-field="note"]').value
  }));
}

function renderCargoEditor(lots) {
  byId('cargoEditor').innerHTML = lots.map((lot, index) => `<div class="cargo-edit-row" data-lot-id="${markupSafe(lot.id || makeId('lot'))}">
    <label class="field"><span>Commodity</span><select data-lot-field="commodity">${commodityOptions(lot.commodity)}</select></label>
    <label class="field"><span>SCU</span><input data-lot-field="scu" type="number" min="1" value="${Number(lot.scu || 1)}"></label>
    <label class="field"><span>Pickup</span><select data-lot-field="pickup">${missionOptions(lot.pickup)}</select></label>
    <label class="field"><span>Delivery</span><select data-lot-field="delivery">${missionOptions(lot.delivery)}</select></label>
    <label class="field lot-note"><span>Lot note <em>Optional</em></span><input data-lot-field="note" value="${markupSafe(lot.note || '')}" placeholder="e.g. Front cargo grid"></label>
    <button class="remove-lot" type="button" data-remove-lot="${index}" aria-label="Remove cargo lot">×</button>
  </div>`).join('');
}

function parseMissionText(text) {
  const lines = text.split(/\r?\n/).map(line => line.trim());
  const valueFor = key => {
    const line = lines.find(item => item.toLowerCase().startsWith(key.toLowerCase() + ':'));
    return line ? line.slice(line.indexOf(':') + 1).trim() : '';
  };
  const cargo = [];
  let current = null;
  lines.forEach(line => {
    if (line.toLowerCase() === 'cargo:') {
      if (current) cargo.push(current);
      current = { id: makeId('lot'), commodity: '', scu: 1, pickup: 'Everus Harbor', delivery: 'Lorville', note: '' };
      return;
    }
    if (!current || !line.includes(':')) return;
    const separator = line.indexOf(':');
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === 'commodity') current.commodity = value;
    if (key === 'scu') current.scu = Math.max(1, Number(value) || 1);
    if (key === 'pickup') current.pickup = value;
    if (key === 'delivery') current.delivery = value;
    if (key === 'note') current.note = value;
  });
  if (current) cargo.push(current);
  return {
    id: makeId('mission'),
    title: valueFor('Mission') || 'Imported mission',
    type: valueFor('Type') || 'Hauling',
    reference: valueFor('Reference'),
    reward: Number(valueFor('Reward').replace(/[^0-9.]/g, '')) || 0,
    notes: valueFor('Notes'),
    cargo: cargo.length ? cargo : [{ id: makeId('lot'), commodity: 'Titanium', scu: 1, pickup: 'Everus Harbor', delivery: 'Lorville', note: '' }]
  };
}

function openFeatureDialog(kind) {
  const content = {
    addShip: ['Fleet preview', 'Add a ship', `<div class="form-grid"><label class="field"><span>Ship family</span><select>${DATA.ships.map(ship => `<option>${markupSafe(ship.family)}</option>`).join('')}</select></label><label class="field"><span>Variant</span><select><option>Caterpillar</option><option>Pirate Edition</option></select></label><label class="field field-wide"><span>Nickname</span><input placeholder="e.g. Long Haul"></label></div><div class="notice is-demo spacer-top">FLEET MUTATION ARRIVES IN CHECKPOINT 2</div>`],
    compare: ['Fleet preview', 'Compare two ships', '<div class="form-grid"><label class="field"><span>Ship A</span><select><option>Drake Caterpillar</option><option>RSI Constellation Taurus</option></select></label><label class="field"><span>Ship B</span><select><option>RSI Constellation Taurus</option><option>Drake Caterpillar</option></select></label></div><div class="plan-summary spacer-top"><div><span>Caterpillar</span><strong>576 SCU</strong><small>Heavy freight</small></div><div><span>Taurus</span><strong>174 SCU</strong><small>Multi-role freight</small></div><div><span>Difference</span><strong>402 SCU</strong><small>Caterpillar advantage</small></div></div>'],
    partial: ['Hauling run', 'Record a partial sell', '<div class="form-grid"><label class="field"><span>Commodity</span><input value="Laranite" readonly></label><label class="field"><span>SCU sold</span><input type="number" value="72"></label><label class="field"><span>Sale terminal</span><select><option>Lorville TDD</option><option>Change terminal…</option></select></label><label class="field"><span>Sale total</span><input value="251,136 aUEC"></label></div><div class="notice is-demo spacer-top">VISUAL WORKFLOW — RUN ACCOUNTING ARRIVES IN CHECKPOINT 3</div>'],
    captures: ['Mission OCR', 'Recent captures', '<div class="list-stack"><div class="list-row"><div><strong>contract_capture_04.png</strong><small>Detected 2 cargo lots · 8 minutes ago</small></div><span class="chip warn">Mock</span></div><div class="list-row"><div><strong>mission_board_03.png</strong><small>Detected 1 cargo lot · yesterday</small></div><span class="chip warn">Mock</span></div></div>'],
    terminal: ['Hauling run', 'Change sale terminal', '<div class="form-grid"><label class="field"><span>Current terminal</span><input value="New Babbage TDD" readonly></label><label class="field"><span>New terminal</span><select><option>Area18 TDD</option><option>Lorville TDD</option><option>Orison TDD</option></select></label></div><div class="notice is-demo spacer-top">VISUAL WORKFLOW — LIVE TERMINAL LOOKUP ARRIVES IN CHECKPOINT 3</div>']
  };
  const item = content[kind] || ['Prototype', 'Coming in a later checkpoint', '<p>This interaction is intentionally visual-only in Checkpoint 1.</p>'];
  byId('featureDialogEyebrow').textContent = item[0];
  byId('featureDialogTitle').textContent = item[1];
  byId('featureDialogBody').innerHTML = item[2];
  byId('featureDialog').showModal();
}

function openRouteDrawer(routeId) {
  const route = DATA.haulingRoutes.find(item => item.id === routeId);
  if (!route) return;
  state.hauling.selectedRouteId = routeId;
  byId('drawerTitle').textContent = route.commodity + ' route';
  byId('drawerBody').innerHTML = `<div class="notice is-demo">DEMO MARKET DATA — LIVE PROVIDER NOT CONNECTED</div>
    <section class="drawer-section"><span class="eyebrow">Buy terminal</span><h2 class="spacer-top">${markupSafe(route.buy)}</h2><p class="spacer-top">${money(route.buyPrice)} aUEC / SCU · ${money(route.buyStock)} SCU reported stock</p></section>
    <section class="drawer-section"><span class="eyebrow">Sell terminal</span><h2 class="spacer-top">${markupSafe(route.sell)}</h2><p class="spacer-top">${money(route.sellPrice)} aUEC / SCU · ${money(route.sellCapacity)} SCU reported capacity</p></section>
    <section class="drawer-section"><h3>Run economics</h3><div class="drawer-metrics"><div><span>Profit / SCU</span><strong class="text-green">+${money(route.profitScu)}</strong></div><div><span>Total profit</span><strong>${money(route.totalProfit)}</strong></div><div><span>aUEC / hour</span><strong>${money(route.hourly)}</strong></div><div><span>Upfront cost</span><strong>${money(route.cost)}</strong></div></div></section>
    <section class="drawer-section"><h3>Terminal report</h3><p>${markupSafe(route.warning)}</p><div class="chip-row spacer-top"><span class="chip warn">Prices ${markupSafe(route.freshness)}</span><span class="chip">${markupSafe(route.travel)}</span></div></section>
    <div class="button-row spacer-top"><button class="button button-primary" data-start-run="${route.id}">Start run</button><button class="button button-secondary" data-action="feature" data-feature="terminal">Change terminal</button><button class="button button-secondary" data-action="favourite">Favourite route</button><button class="button button-ghost" data-action="report-terminal">Report terminal</button></div>`;
  byId('routeDrawer').classList.add('is-open');
  byId('routeDrawer').setAttribute('aria-hidden', 'false');
  byId('drawerScrim').hidden = false;
  byId('routeDrawer').querySelector('[data-close-drawer]').focus();
}

function closeDrawer() {
  byId('routeDrawer').classList.remove('is-open');
  byId('routeDrawer').setAttribute('aria-hidden', 'true');
  byId('drawerScrim').hidden = true;
}

function openMobileNav() {
  byId('sidebar').classList.add('is-open');
  byId('mobileScrim').hidden = false;
  byId('menuButton').setAttribute('aria-expanded', 'true');
}

function closeMobileNav() {
  byId('sidebar').classList.remove('is-open');
  byId('mobileScrim').hidden = true;
  byId('menuButton').setAttribute('aria-expanded', 'false');
}

function handleClick(event) {
  const adaptiveTheme = event.target.closest('[data-theme-adaptive]');
  if (adaptiveTheme) {
    state.ui.adaptiveTheme = !state.ui.adaptiveTheme;
    renderPage();
    showToast('Interface theme updated', state.ui.adaptiveTheme ? 'Adaptive manufacturer mode enabled.' : 'Adaptive manufacturer mode disabled.');
    return;
  }
  const pageTarget = event.target.closest('[data-page]');
  if (pageTarget) {
    if (pageTarget.dataset.toolsTab) state.ui.toolsTab = pageTarget.dataset.toolsTab;
    navigate(pageTarget.dataset.page);
    return;
  }
  const actionTarget = event.target.closest('[data-action]');
  if (actionTarget) {
    const action = actionTarget.dataset.action;
    if (action === 'add-mission') openMissionEditor();
    if (action === 'import-mission') {
      byId('importText').value = 'Mission: Covalex freight transfer\nType: Hauling\nReference: M-07\nReward: 46250\n\nCargo:\nCommodity: Agricium\nSCU: 8\nPickup: ArcCorp Mining Area 056\nDelivery: Area18\nNote: Front cargo grid\n\nCargo:\nCommodity: Titanium\nSCU: 4\nPickup: HDMS-Bezdek\nDelivery: Lorville';
      byId('importDialog').showModal();
    }
    if (action === 'phase-two') showToast('Checkpoint 2', 'Calculation and persistence are intentionally deferred.');
    if (action === 'phase-three') showToast('Checkpoint 3', 'This data action is intentionally deferred.');
    if (action === 'mock-ocr') showToast('Mock parser only', 'No image recognition runs in this prototype.');
    if (action === 'mock-agent') showToast('Agent unavailable', 'No Game.log monitoring runs in this prototype.');
    if (action === 'add-ship-preview') openFeatureDialog('addShip');
    if (action === 'compare-ships') openFeatureDialog('compare');
    if (action === 'feature') openFeatureDialog(actionTarget.dataset.feature);
    if (action === 'favourite') showToast('Favourite saved visually', 'Persistence arrives in Checkpoint 3.');
    if (action === 'report-terminal') showToast('Report terminal', 'Community reporting is a visual mockup.');
    if (action === 'complete-run') {
      state.hauling.activeRunId = null;
      renderPage();
      showToast('Run complete', 'The demo hauling run was closed.');
    }
    if (action === 'end-route') {
      state.activeRoute.stepIndex = 0;
      renderPage();
      showToast('Route ended', 'Sample route progress returned to the first step.');
    }
    if (action === 'toggle-setting') {
      actionTarget.classList.toggle('is-on');
      showToast('Preference changed', 'This in-memory preview resets when the page reloads.');
    }
    return;
  }

  const missionMenu = event.target.closest('[data-mission-menu]');
  if (missionMenu) {
    state.ui.openMissionMenu = state.ui.openMissionMenu === missionMenu.dataset.missionMenu ? null : missionMenu.dataset.missionMenu;
    renderPage();
    return;
  }
  const edit = event.target.closest('[data-edit-mission]');
  if (edit) {
    const mission = state.missions.find(item => item.id === edit.dataset.editMission);
    state.ui.openMissionMenu = null;
    openMissionEditor(copy(mission));
    return;
  }
  const duplicate = event.target.closest('[data-duplicate-mission]');
  if (duplicate) {
    const source = state.missions.find(item => item.id === duplicate.dataset.duplicateMission);
    const missionId = makeId('mission');
    const cloned = {
      ...copy(source),
      id: missionId,
      title: source.title + ' copy',
      reference: source.reference + '-COPY',
      cargo: source.cargo.map(lot => ({ ...lot, id: makeId('lot'), missionId }))
    };
    state.missions.push(cloned);
    state.ui.openMissionMenu = null;
    renderPage();
    showToast('Mission duplicated', cloned.reference + ' is ready to edit.');
    return;
  }
  const remove = event.target.closest('[data-delete-mission]');
  if (remove) {
    const mission = state.missions.find(item => item.id === remove.dataset.deleteMission);
    byId('confirmMessage').textContent = 'Delete ' + mission.reference + ' · ' + mission.title + '? This only affects the current in-memory session.';
    byId('confirmAction').dataset.deleteId = mission.id;
    byId('confirmDialog').showModal();
    return;
  }
  const activeNext = event.target.closest('[data-active-next]');
  if (activeNext && state.activeRoute.stepIndex < state.activeRoute.steps.length - 1) {
    state.activeRoute.stepIndex += 1;
    renderPage();
    return;
  }
  const activePrevious = event.target.closest('[data-active-previous]');
  if (activePrevious && state.activeRoute.stepIndex > 0) {
    state.activeRoute.stepIndex -= 1;
    renderPage();
    return;
  }
  const correction = event.target.closest('[data-correct-toggle]');
  if (correction) {
    state.ui.correctionOpen = !state.ui.correctionOpen;
    renderPage();
    return;
  }
  const correctionAction = event.target.closest('[data-correction]');
  if (correctionAction) {
    const nextIndex = state.activeRoute.stepIndex + Number(correctionAction.dataset.correction);
    state.activeRoute.stepIndex = Math.max(0, Math.min(state.activeRoute.steps.length - 1, nextIndex));
    renderPage();
    return;
  }
  const mapMode = event.target.closest('[data-map-mode]');
  if (mapMode) {
    state.ui.mapMode = mapMode.dataset.mapMode;
    renderPage();
    return;
  }
  const locationTarget = event.target.closest('[data-location]');
  if (locationTarget) {
    state.ui.selectedLocationId = locationTarget.dataset.location;
    renderPage();
    return;
  }
  const haulingView = event.target.closest('[data-hauling-view]');
  if (haulingView) {
    state.ui.haulingView = haulingView.dataset.haulingView;
    renderPage();
    return;
  }
  const details = event.target.closest('[data-route-details]');
  if (details) {
    openRouteDrawer(details.dataset.routeDetails);
    return;
  }
  const startRun = event.target.closest('[data-start-run]');
  if (startRun) {
    state.hauling.activeRunId = startRun.dataset.startRun;
    closeDrawer();
    renderPage();
    showToast('Hauling run started', 'This active run uses demo market data.');
    return;
  }
  const selectShipTarget = event.target.closest('[data-select-ship]');
  if (selectShipTarget) {
    state.selectedShipId = selectShipTarget.dataset.selectShip;
    renderPage();
    showToast('Planner ship selected', selectedShip().name + ' · ' + selectedShip().capacity + ' SCU');
    return;
  }
  const intelTab = event.target.closest('[data-intel-tab]');
  if (intelTab) {
    state.ui.intelTab = intelTab.dataset.intelTab;
    renderPage();
    return;
  }
  const toolsTab = event.target.closest('[data-tools-tab]');
  if (toolsTab) {
    state.ui.toolsTab = toolsTab.dataset.toolsTab;
    renderPage();
    return;
  }
  const closeDialog = event.target.closest('[data-close-dialog]');
  if (closeDialog) {
    closeDialog.closest('dialog').close();
    return;
  }
  if (event.target.closest('[data-close-drawer]') || event.target === byId('drawerScrim')) {
    closeDrawer();
    return;
  }
  const openMenu = event.target.closest('[data-open-menu]');
  if (openMenu) {
    const menu = byId('profileMenu');
    menu.hidden = !menu.hidden;
    return;
  }
}

document.addEventListener('click', handleClick);
document.addEventListener('change', event => {
  if (event.target.id === 'plannerShip' || event.target.id === 'haulingShip') {
    state.selectedShipId = event.target.value;
    renderPage();
  }
  if (event.target.id === 'plannerStart') {
    state.startingLocationId = event.target.value;
    renderPage();
  }
  if (event.target.id === 'themeOverride') {
    state.ui.themeOverride = event.target.value;
    if (event.target.value !== 'auto') state.ui.manualTheme = event.target.value;
    renderPage();
  }
});

document.addEventListener('input', event => {
  if (event.target.id !== 'intelSearch') return;
  const query = event.target.value.trim().toLowerCase();
  document.querySelectorAll('#intelResults .intel-card').forEach(card => {
    card.hidden = Boolean(query) && !card.textContent.toLowerCase().includes(query);
  });
});

byId('missionForm').addEventListener('submit', event => {
  event.preventDefault();
  const missionId = state.ui.editingMissionId || makeId('mission');
  const mission = {
    id: missionId,
    title: byId('missionTitle').value.trim(),
    type: byId('missionType').value,
    reference: byId('missionReference').value.trim(),
    reward: Math.max(0, Number(byId('missionReward').value || 0)),
    notes: byId('missionNotes').value.trim(),
    cargo: cargoEditorData().map(lot => ({ ...lot, missionId }))
  };
  if (!mission.title || !mission.cargo.length) return;
  const existingIndex = state.missions.findIndex(item => item.id === missionId);
  if (existingIndex >= 0) state.missions[existingIndex] = mission;
  else state.missions.push(mission);
  byId('missionDialog').close();
  renderPage();
  showToast(existingIndex >= 0 ? 'Mission updated' : 'Mission created', mission.reference + ' · ' + mission.cargo.length + ' cargo lots');
});

byId('addCargoLot').addEventListener('click', () => {
  const lots = cargoEditorData();
  lots.push({ id: makeId('lot'), commodity: 'Titanium', scu: 4, pickup: 'HDMS-Bezdek', delivery: 'Lorville', note: '' });
  renderCargoEditor(lots);
});

byId('cargoEditor').addEventListener('click', event => {
  const remove = event.target.closest('[data-remove-lot]');
  if (!remove) return;
  const lots = cargoEditorData();
  if (lots.length === 1) {
    showToast('One cargo lot required', 'A mission needs at least one cargo lot.');
    return;
  }
  lots.splice(Number(remove.dataset.removeLot), 1);
  renderCargoEditor(lots);
});

byId('importForm').addEventListener('submit', event => {
  event.preventDefault();
  const parsed = parseMissionText(byId('importText').value);
  byId('importDialog').close();
  openMissionEditor(parsed);
  showToast('Mission parsed', 'Review the detected fields before saving.');
});

byId('confirmAction').addEventListener('click', event => {
  const missionId = event.currentTarget.dataset.deleteId;
  if (!missionId) return;
  state.missions = state.missions.filter(mission => mission.id !== missionId);
  event.currentTarget.dataset.deleteId = '';
  state.ui.openMissionMenu = null;
  window.setTimeout(() => {
    renderPage();
    showToast('Mission deleted', 'The mission was removed from this session.');
  }, 0);
});

byId('menuButton').addEventListener('click', () => {
  byId('sidebar').classList.contains('is-open') ? closeMobileNav() : openMobileNav();
});
byId('mobileScrim').addEventListener('click', closeMobileNav);
byId('collapseSidebar').addEventListener('click', () => {
  state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
  byId('appShell').classList.toggle('sidebar-collapsed', state.ui.sidebarCollapsed);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeAllDialogs();
    closeDrawer();
    closeMobileNav();
    byId('profileMenu').hidden = true;
    state.ui.openMissionMenu = null;
  }
});

renderPage();
