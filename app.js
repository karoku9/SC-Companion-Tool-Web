'use strict';

const DATA = window.COMPANION_DATA;
const STORAGE_VERSION = 1;
const STORAGE_KEY = 'waypoint-cargo-companion-state';
const copy = value => JSON.parse(JSON.stringify(value));
const byId = id => document.getElementById(id);
const markupSafe = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));
const makeId = prefix => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const pageMeta = {
  dashboard: ['Operations overview', 'Dashboard'], planner: ['Contract hauling', 'Mission Planner'],
  active: ['Guided workflow', 'Active Route'], hauling: ['Commodity trading', 'Hauling'],
  map: ['Stanton reference', 'Map'], fleet: ['Ship management', 'Fleet'],
  intel: ['Operational knowledge', 'Intel'], tools: ['Local utilities', 'Tools'],
  settings: ['Application preferences', 'Settings']
};

function fixedLocationById(id) { return DATA.locations.find(location => location.id === id) || null; }
function fixedLocationByName(name) { return DATA.locations.find(location => location.name.toLowerCase() === String(name || '').trim().toLowerCase()) || null; }
function locationLabel(id, customLabel = '') { return fixedLocationById(id)?.name || customLabel || 'Unknown location'; }
function lotPickup(lot) { return locationLabel(lot.pickupLocationId, lot.pickupLabel || lot.pickup); }
function lotDelivery(lot) { return locationLabel(lot.deliveryLocationId, lot.deliveryLabel || lot.delivery); }
function locationRecord(id, label = '') {
  const fixed = fixedLocationById(id) || fixedLocationByName(label);
  if (fixed) return fixed;
  return { id: id || `custom:${label}`, name: label || 'Custom location', parent: 'Unmapped', type: 'Custom', x: null, y: null, landing: 'Unknown', refuel: false, repair: false, traffic: 'Unknown', danger: 'Unknown', reliability: 'Unmapped', hops: 'Unknown', note: 'Custom location. Distance and services are not available in the local reference data.' };
}
function normalizeLot(lot, missionId) {
  const pickup = fixedLocationById(lot.pickupLocationId) || fixedLocationByName(lot.pickupLabel || lot.pickup);
  const delivery = fixedLocationById(lot.deliveryLocationId) || fixedLocationByName(lot.deliveryLabel || lot.delivery);
  return {
    id: lot.id || makeId('lot'), missionId, commodity: String(lot.commodity || '').trim(), scu: Number(lot.scu || 0),
    pickupLocationId: pickup?.id || null, pickupLabel: pickup?.name || String(lot.pickupLabel || lot.pickup || '').trim(),
    deliveryLocationId: delivery?.id || null, deliveryLabel: delivery?.name || String(lot.deliveryLabel || lot.delivery || '').trim(),
    note: String(lot.note || '').trim()
  };
}
function normalizeMission(mission) {
  const id = mission.id || makeId('mission');
  return { id, title: String(mission.title || '').trim(), type: String(mission.type || 'Hauling'), reference: String(mission.reference || '').trim(), reward: Number(mission.reward || 0), notes: String(mission.notes || '').trim(), cargo: Array.isArray(mission.cargo) ? mission.cargo.map(lot => normalizeLot(lot, id)) : [] };
}
function fleetEntry(shipId, nickname = '') { return { id: makeId('fleet'), shipId, nickname: String(nickname || '').trim() }; }
function distanceBetween(a, b) {
  if (!a || !b || !Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(b.x) || !Number.isFinite(b.y)) return null;
  return Math.hypot(a.x - b.x, a.y - b.y) * 1.35;
}
function actionStep(kind, location, lot, mission) {
  const verb = kind === 'pickup' ? 'Pick up' : 'Deliver';
  return {
    id: makeId('step'), kind, locationId: location.id?.startsWith('custom:') ? null : location.id, location: location.name,
    nextLocationId: location.id?.startsWith('custom:') ? null : location.id, nextLocation: location.name,
    lotId: lot.id, missionId: mission.id, title: `${verb} ${lot.scu} SCU ${lot.commodity}`,
    detail: `${mission.reference || mission.title} · ${lot.note || (kind === 'pickup' ? 'verify cargo identity before loading' : 'confirm contract delivery')}.`
  };
}

function generateRoute(missions, startingLocationId) {
  const lots = missions.flatMap(mission => mission.cargo.map(lot => ({ lot, mission })));
  const start = fixedLocationById(startingLocationId) || DATA.locations.find(location => !['System', 'Planet', 'Gas Giant', 'Moon'].includes(location.type));
  const picked = new Set();
  const delivered = new Set();
  const steps = [];
  const visits = [start.name];
  let current = start;
  let departed = false;
  let knownDistance = 0;
  let unknownLegs = 0;
  let guard = 0;

  const eligibleAt = locationName => {
    const pickups = lots.filter(({ lot }) => !picked.has(lot.id) && lotPickup(lot) === locationName).sort((a, b) => `${a.mission.reference}|${a.lot.id}`.localeCompare(`${b.mission.reference}|${b.lot.id}`));
    const deliveries = lots.filter(({ lot }) => picked.has(lot.id) && !delivered.has(lot.id) && lotDelivery(lot) === locationName).sort((a, b) => `${a.mission.reference}|${a.lot.id}`.localeCompare(`${b.mission.reference}|${b.lot.id}`));
    return { pickups, deliveries };
  };

  while (delivered.size < lots.length && guard++ < Math.max(20, lots.length * 8)) {
    let local = eligibleAt(current.name);
    if (local.pickups.length || local.deliveries.length) {
      local.pickups.forEach(({ lot, mission }) => { steps.push(actionStep('pickup', current, lot, mission)); picked.add(lot.id); });
      local = eligibleAt(current.name);
      local.deliveries.forEach(({ lot, mission }) => { steps.push(actionStep('delivery', current, lot, mission)); delivered.add(lot.id); });
      continue;
    }

    const candidateNames = [...new Set(lots.flatMap(({ lot }) => {
      if (!picked.has(lot.id)) return [lotPickup(lot)];
      if (!delivered.has(lot.id)) return [lotDelivery(lot)];
      return [];
    }))];
    if (!candidateNames.length) break;
    const candidates = candidateNames.map(name => {
      const fixed = fixedLocationByName(name);
      return { name, record: locationRecord(fixed?.id, name), distance: distanceBetween(current, fixed) };
    }).sort((a, b) => {
      if (a.distance === null && b.distance !== null) return 1;
      if (a.distance !== null && b.distance === null) return -1;
      if (a.distance !== b.distance) return (a.distance ?? 0) - (b.distance ?? 0);
      return a.name.localeCompare(b.name);
    });
    const target = candidates[0];
    if (!departed) {
      steps.push({ id: makeId('step'), kind: 'depart', locationId: current.id, location: current.name, nextLocationId: target.record.id, nextLocation: target.name, title: `Depart from ${current.name}`, detail: 'Confirm doors, fuel and manifest before departure.' });
      departed = true;
    }
    if (current.name !== target.name) {
      const legDistance = distanceBetween(current, target.record);
      if (legDistance === null) unknownLegs += 1; else knownDistance += legDistance;
      steps.push({ id: makeId('step'), kind: 'travel', locationId: current.id?.startsWith('custom:') ? null : current.id, location: current.name, nextLocationId: target.record.id?.startsWith('custom:') ? null : target.record.id, nextLocation: target.name, distance: legDistance, title: `Travel to ${target.name}`, detail: legDistance === null ? 'Unknown local distance · custom or unmapped destination.' : `Local estimate · approximately ${legDistance.toFixed(1)} Gm.` });
      current = target.record;
      visits.push(current.name);
    }
  }
  steps.push({ id: makeId('step'), kind: 'complete', locationId: current.id?.startsWith('custom:') ? null : current.id, location: current.name, nextLocationId: current.id?.startsWith('custom:') ? null : current.id, nextLocation: current.name, title: 'Route complete', detail: 'Review the manifest and close the tracked route.' });
  const handlingMinutes = lots.length * 8;
  const travelMinutes = Math.round(knownDistance * 1.8) + unknownLegs * 12;
  const surfaceVisits = [...new Set(visits)].map(name => fixedLocationByName(name)).filter(location => location && ['Outpost', 'Scrapyard', 'Landing Zone'].includes(location.type)).length;
  const fuelDemand = knownDistance > 130 || visits.length > 6 ? 'High' : knownDistance > 65 || visits.length > 3 ? 'Medium' : 'Low';
  const customLocations = [...new Set(lots.flatMap(({ lot }) => [lotPickup(lot), lotDelivery(lot)]))].filter(name => !fixedLocationByName(name));
  return {
    id: makeId('route'), createdAt: new Date().toISOString(), startLocationId: start.id, startLocation: start.name, steps,
    lotIds: lots.map(({ lot }) => lot.id), stopLabels: [...new Set(visits)], customLocations,
    metrics: { distance: knownDistance, unknownLegs, stops: [...new Set(visits)].length, pickups: lots.length, deliveries: lots.length, handlingMinutes, travelMinutes, totalMinutes: handlingMinutes + travelMinutes, fuelDemand, omAssists: surfaceVisits ? `${Math.max(1, surfaceVisits)}–${surfaceVisits * 2 + 1} likely` : '0–1 likely' }
  };
}

function defaultState() {
  const missions = DATA.missions.map(normalizeMission);
  const fleet = [fleetEntry('caterpillar', 'Long Haul'), fleetEntry('taurus', 'Constellation One'), fleetEntry('freelancer-max', 'Max Lift')];
  const plannedRoute = generateRoute(missions, 'everus');
  return {
    version: STORAGE_VERSION,
    ui: { page: 'dashboard', sidebarCollapsed: false, mapMode: 'orbital', selectedLocationId: 'bezdek', selectedCustomLocation: '', haulingView: 'list', intelTab: 'locations', toolsTab: 'ocr', openMissionMenu: null, editingMissionId: null, pendingConfirm: null, storageRecovery: false },
    preferences: { density: 'standard', reducedMotion: false, defaultShipCatalogId: 'caterpillar', defaultStartingLocationId: 'everus', defaultMapMode: 'orbital', automaticSave: true, showIllegalCommodities: false, numberFormat: 'en-US', adaptiveTheme: true, themeOverride: 'auto', manualTheme: 'neutral' },
    fleet, missions, selectedShipId: fleet[0].id, startingLocationId: 'everus', plannedRoute,
    activeRoute: { routeId: plannedRoute.id, status: 'active', stepIndex: Math.min(2, plannedRoute.steps.length - 1), steps: copy(plannedRoute.steps), metrics: copy(plannedRoute.metrics), lotIds: copy(plannedRoute.lotIds), stopLabels: copy(plannedRoute.stopLabels), customLocations: copy(plannedRoute.customLocations), manifest: missions.flatMap(mission => mission.cargo.map(lot => ({ ...copy(lot), missionReference: mission.reference, missionTitle: mission.title }))), manualCorrections: {} },
    hauling: { selectedRouteId: 'trade-02', demoLoadScu: 140 }, intel: { lastLocationId: 'bezdek' }, lastSavedAt: null
  };
}

function persistedState(value) {
  return { version: STORAGE_VERSION, ui: { mapMode: value.ui.mapMode, selectedLocationId: value.ui.selectedLocationId, selectedCustomLocation: value.ui.selectedCustomLocation, haulingView: value.ui.haulingView, intelTab: value.ui.intelTab, toolsTab: value.ui.toolsTab, sidebarCollapsed: value.ui.sidebarCollapsed }, preferences: copy(value.preferences), fleet: copy(value.fleet), missions: copy(value.missions), selectedShipId: value.selectedShipId, startingLocationId: value.startingLocationId, plannedRoute: copy(value.plannedRoute), activeRoute: copy(value.activeRoute), hauling: copy(value.hauling), intel: copy(value.intel), lastSavedAt: value.lastSavedAt };
}
function loadState() {
  const fallback = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw);
    if (!saved || saved.version !== STORAGE_VERSION || !Array.isArray(saved.fleet) || !Array.isArray(saved.missions)) throw new Error('Incompatible persisted schema');
    const merged = { ...fallback, ...saved, ui: { ...fallback.ui, ...(saved.ui || {}) }, preferences: { ...fallback.preferences, ...(saved.preferences || {}) }, hauling: { ...fallback.hauling, ...(saved.hauling || {}) }, intel: { ...fallback.intel, ...(saved.intel || {}) } };
    merged.fleet = saved.fleet.filter(entry => entry && DATA.ships.some(ship => ship.id === entry.shipId));
    if (!merged.fleet.length) merged.fleet = fallback.fleet;
    if (!merged.fleet.some(entry => entry.id === merged.selectedShipId)) merged.selectedShipId = merged.fleet[0].id;
    merged.missions = saved.missions.map(normalizeMission).filter(mission => mission.title && mission.cargo.length);
    if (!fixedLocationById(merged.startingLocationId)) merged.startingLocationId = merged.preferences.defaultStartingLocationId || 'everus';
    merged.ui.page = 'dashboard'; merged.ui.openMissionMenu = null; merged.ui.editingMissionId = null; merged.ui.pendingConfirm = null;
    return merged;
  } catch (error) {
    fallback.ui.storageRecovery = true;
    return fallback;
  }
}

const state = loadState();

function selectedFleetEntry() { return state.fleet.find(entry => entry.id === state.selectedShipId) || state.fleet[0]; }
function selectedShip() { return DATA.ships.find(ship => ship.id === selectedFleetEntry()?.shipId) || DATA.ships[0]; }
function selectedStart() { return fixedLocationById(state.startingLocationId) || fixedLocationById(state.preferences.defaultStartingLocationId) || DATA.locations[0]; }
function manufacturerTheme(ship = selectedShip()) { const maker = ship.maker.toLowerCase(); return maker.includes('drake') ? 'drake' : maker.includes('roberts space industries') ? 'rsi' : maker.includes('musashi industrial') ? 'misc' : 'neutral'; }
function resolvedTheme() { return state.preferences.themeOverride !== 'auto' ? state.preferences.themeOverride : state.preferences.adaptiveTheme ? manufacturerTheme() : state.preferences.manualTheme; }
function money(value) { return new Intl.NumberFormat(state.preferences.numberFormat || 'en-US', { maximumFractionDigits: 0 }).format(Number(value || 0)); }
function totalScu() { return state.missions.reduce((total, mission) => total + mission.cargo.reduce((sum, lot) => sum + Number(lot.scu || 0), 0), 0); }
function totalReward() { return state.missions.reduce((total, mission) => total + Number(mission.reward || 0), 0); }
function routeSource() { return state.activeRoute?.steps?.length ? state.activeRoute : state.plannedRoute; }
function activeStep() { const route = routeSource(); return route?.steps?.[state.activeRoute?.stepIndex || 0] || null; }
function activeLocationLabel() { const step = activeStep(); return state.activeRoute?.status === 'active' && step ? step.location : selectedStart().name; }
function saveState(force = false) {
  if (!force && !state.preferences.automaticSave) return false;
  state.lastSavedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState(state)));
  return true;
}
function mutate(mutator, options = {}) {
  mutator(state);
  if (options.forceSave) saveState(true); else if (options.save !== false) saveState(false);
  if (options.render !== false) renderPage();
}
function formatDuration(minutes) { const hours = Math.floor(minutes / 60); const rest = minutes % 60; return hours ? `${hours}h ${rest}m` : `${rest}m`; }
function applyPreferences() {
  document.documentElement.dataset.theme = resolvedTheme();
  document.documentElement.dataset.density = state.preferences.density;
  document.documentElement.classList.toggle('reduced-motion', state.preferences.reducedMotion);
  byId('appShell').classList.toggle('sidebar-collapsed', state.ui.sidebarCollapsed);
}

function statusDerived(lotId) {
  const override = state.activeRoute?.manualCorrections?.[lotId];
  if (override) return override;
  const steps = state.activeRoute?.steps || [];
  const pickupIndex = steps.findIndex(step => step.kind === 'pickup' && step.lotId === lotId);
  const deliveryIndex = steps.findIndex(step => step.kind === 'delivery' && step.lotId === lotId);
  const index = state.activeRoute?.stepIndex || 0;
  if (deliveryIndex >= 0 && deliveryIndex < index) return 'Delivered';
  if (index === deliveryIndex) return 'Ready to deliver';
  if (pickupIndex >= 0 && pickupIndex < index) return 'On board';
  if (index === pickupIndex) return 'Ready to load';
  return 'Pending';
}
function statusTone(status) { return status === 'Delivered' ? 'good' : status === 'On board' ? 'info' : status.startsWith('Ready') ? 'warn' : ''; }
function routeLots() {
  if (Array.isArray(state.activeRoute?.manifest) && state.activeRoute.manifest.length) return state.activeRoute.manifest;
  const lotIds = new Set(state.activeRoute?.lotIds || state.plannedRoute?.lotIds || []);
  return state.missions.flatMap(mission => mission.cargo.map(lot => ({ ...lot, missionReference: mission.reference, missionTitle: mission.title }))).filter(lot => lotIds.has(lot.id));
}
function issueForLocation(name) { return DATA.issues.find(issue => issue.location === name)?.title || 'No known fixed-profile issue'; }

function pageHeader(kicker, title, description, actions = '') { return `<header class="page-header"><div class="page-header-copy"><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${description}</p></div>${actions ? `<div class="header-actions">${actions}</div>` : ''}</header>`; }
function metric(label, value, detail, accent = false) { return `<article class="panel metric-card${accent ? ' is-accent' : ''}"><span>${label}</span><strong class="mono">${value}</strong><small>${detail}</small></article>`; }
function locationOptions(selectedId) { return DATA.locations.filter(location => !['System', 'Planet', 'Gas Giant', 'Moon'].includes(location.type)).map(location => `<option value="${location.id}"${location.id === selectedId ? ' selected' : ''}>${markupSafe(location.name)}</option>`).join(''); }
function locationSelector(value, id, label = 'Starting location') { return `<label class="field"><span>${label}</span><select id="${id}">${locationOptions(value)}</select></label>`; }
function fleetSelector(value, id, label = 'Selected ship') { return `<label class="field"><span>${label}</span><select id="${id}">${state.fleet.map(entry => { const ship = DATA.ships.find(item => item.id === entry.shipId); return `<option value="${entry.id}"${entry.id === value ? ' selected' : ''}>${markupSafe(entry.nickname || ship.name)} · ${ship.capacity} SCU</option>`; }).join('')}</select></label>`; }

function routeLegState(index) {
  if (state.activeRoute?.status !== 'active') return 'remaining';
  const current = state.activeRoute.stepIndex;
  return index < current ? 'completed' : index === current ? 'current' : 'remaining';
}
function routeMapMarkup(compact = false) {
  const route = routeSource();
  const steps = route?.steps || [];
  const currentIndex = state.activeRoute?.status === 'active' ? state.activeRoute.stepIndex : 0;
  const currentStep = steps[currentIndex] || null;
  const showsTravel = currentStep?.kind === 'travel' && currentStep.location !== currentStep.nextLocation;
  const current = locationRecord(currentStep?.locationId, currentStep?.location || selectedStart().name);
  const next = locationRecord(currentStep?.nextLocationId, currentStep?.nextLocation || current.name);
  const travelSteps = steps.filter(step => step.kind === 'travel');
  const routeLocationNames = new Set(steps.flatMap(step => [step.location, step.nextLocation]));
  const completedNames = new Set(steps.slice(0, currentIndex).flatMap(step => [step.location, step.nextLocation]));
  const nextName = showsTravel ? next.name : current.name;
  const nodes = DATA.locations.filter(location => ['Planet', 'Gas Giant', 'Moon', 'Orbital Station', 'Landing Zone', 'Outpost', 'Gateway'].includes(location.type));
  return `<div class="map-chassis"><div class="map-bezel"><span>NAV / STANTON</span><span>LOCAL ESTIMATE · NOT IN-GAME ROUTER</span></div><div class="map-canvas${compact ? ' hauling-map' : ''}">
    <div class="map-readout map-readout-left"><b>POS</b> ${Number.isFinite(current.x) ? `${current.x.toFixed(1)} / ${current.y.toFixed(1)}` : 'UNMAPPED'}</div><div class="map-readout map-readout-right"><b>${showsTravel ? 'TGT' : 'OP AT'}</b> ${markupSafe(nextName).toUpperCase()}</div>
    <div class="map-orbit orbit-1"></div><div class="map-orbit orbit-2"></div><div class="map-orbit orbit-3"></div><div class="map-star" title="Stanton star"></div>
    <svg class="route-line-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Complete planned route">${travelSteps.map((step, index) => { const a = fixedLocationByName(step.location); const b = fixedLocationByName(step.nextLocation); if (!a || !b) return ''; const sourceIndex = steps.indexOf(step); const legState = state.activeRoute?.status === 'active' ? routeLegState(sourceIndex) : 'remaining'; return `<path class="route-leg is-${legState}" d="M ${a.x} ${a.y} L ${b.x} ${b.y}"/>`; }).join('')}</svg>
    ${nodes.map(location => { const used = routeLocationNames.has(location.name); const isCurrent = location.name === current.name; const isNext = location.name === nextName && showsTravel; const completed = completedNames.has(location.name); const selected = location.id === state.ui.selectedLocationId; return `<button class="map-node${selected ? ' is-selected' : ''}${used ? ' is-route-stop' : ''}${completed ? ' is-completed' : ''}${isCurrent ? ' is-current' : ''}${isNext ? ' is-next' : ''}" type="button" data-location="${location.id}" style="left:${location.x}%;top:${location.y}%"><i></i><strong>${markupSafe(location.name)}</strong><small>${markupSafe(location.type)}</small></button>`; }).join('')}
    <div class="map-legend"><span>● CURRENT</span><span>◇ NEXT</span><span>— COMPLETE ROUTE</span>${route?.customLocations?.length ? `<span>! ${route.customLocations.length} UNMAPPED</span>` : ''}</div></div></div>`;
}

function renderDashboard() {
  const ship = selectedShip(); const entry = selectedFleetEntry(); const step = activeStep(); const hasActive = state.activeRoute?.status === 'active';
  const status = hasActive ? `STEP ${state.activeRoute.stepIndex + 1} / ${state.activeRoute.steps.length}` : state.plannedRoute?.steps?.length ? 'ROUTE READY' : 'NO ROUTE';
  return `<section class="page" data-page-view="dashboard">${pageHeader('OPS CONTROL / READINESS', 'Cargo Operations Deck', 'Live local vessel, contract load and route state.', `<button class="button button-primary" data-action="add-mission"><span>NEW</span> Add mission</button>${hasActive ? '<button class="button button-secondary" data-page="active"><span>EXEC</span> Resume active route</button>' : ''}`)}
    ${state.ui.storageRecovery ? '<div class="notice is-demo">SAVED DATA WAS INVALID — SAFE DEFAULTS LOADED</div>' : ''}<div class="system-strip"><span><b>SYS</b> OPERATIONS DECK</span><span><i></i> LOCAL CORE ONLINE</span><span>${state.lastSavedAt ? `SAVED // ${new Date(state.lastSavedAt).toLocaleTimeString()}` : 'SAVE // PENDING'}</span></div>
    <section class="panel readiness-console"><div class="vessel-ident"><span class="module-code">VESSEL ASSIGNMENT // ${manufacturerTheme(ship).toUpperCase()}</span><strong>${markupSafe(entry.nickname || ship.name)}</strong><small>${markupSafe(ship.name)} · ${markupSafe(ship.role)}</small></div><div class="readiness-grid"><div><span>CARGO ENVELOPE</span><strong>${money(ship.capacity)} <small>SCU</small></strong><em>${money(totalScu())} planned</em></div><div><span>CONTRACT STACK</span><strong>${String(state.missions.length).padStart(2, '0')}</strong><em>persisted locally</em></div><div><span>DECLARED REWARD</span><strong>${money(totalReward())}</strong><em>aUEC total</em></div><div><span>ROUTE STATE</span><strong>${status}</strong><em>${markupSafe(activeLocationLabel())}</em></div></div></section>
    <div class="dashboard-layout"><div class="dashboard-column">${hasActive ? `<section class="panel action-banner"><div><span class="eyebrow">EXECUTION CHANNEL A · ${status}</span><h2>${markupSafe(step.title)}</h2><p>${markupSafe(step.detail)}</p></div><button class="button button-primary button-large" data-page="active"><span>EXEC</span> Continue route →</button></section>` : `<section class="panel action-banner"><div><span class="eyebrow">ROUTE CHANNEL IDLE</span><h2>Build a local cargo route</h2><p>${state.missions.length} missions are available for planning.</p></div><button class="button button-primary button-large" data-page="planner">Open Planner →</button></section>`}
      <section class="panel panel-pad"><div class="panel-head"><div><span class="module-code">NAV QUEUE // GENERATED</span><h2>Route preview</h2><p>${state.plannedRoute?.stopLabels?.join(' → ') || 'No generated route'}</p></div><span class="status-pill ${hasActive ? 'good' : ''}">${hasActive ? 'IN PROGRESS' : 'LOCAL DRAFT'}</span></div>${state.plannedRoute ? `<div class="plan-summary"><div><span>Distance</span><strong>${state.plannedRoute.metrics.unknownLegs ? `${state.plannedRoute.metrics.distance.toFixed(1)}+ Gm` : `${state.plannedRoute.metrics.distance.toFixed(1)} Gm`}</strong><small>${state.plannedRoute.metrics.unknownLegs ? 'includes unknown legs' : 'local coordinate estimate'}</small></div><div><span>Duration</span><strong>${formatDuration(state.plannedRoute.metrics.totalMinutes)}</strong><small>travel + handling</small></div><div><span>Stops</span><strong>${state.plannedRoute.metrics.stops}</strong><small>${state.plannedRoute.metrics.fuelDemand} fuel demand</small></div></div>` : ''}</section>
      <section class="panel panel-pad"><div class="panel-head"><div><span class="module-code">CONTRACT BUFFER</span><h2>Recent missions</h2><p>Actual locally stored missions</p></div><button class="link-button" data-page="planner">View planner</button></div><div class="list-stack">${state.missions.slice(-3).reverse().map(mission => `<div class="list-row"><div><strong>${markupSafe(mission.reference || '—')} · ${markupSafe(mission.title)}</strong><small>${mission.cargo.length} lots · ${mission.cargo.reduce((sum, lot) => sum + lot.scu, 0)} SCU</small></div><b>${money(mission.reward)} aUEC</b></div>`).join('') || '<div class="empty-state">No missions stored.</div>'}</div></section></div>
      <aside class="dashboard-column"><section class="panel panel-pad"><div class="panel-head"><div><span class="module-code">CONTROL BANK // A</span><h2>Quick actions</h2><p>Working local systems</p></div></div><div class="quick-grid"><button class="quick-action" data-action="add-mission"><i>＋</i><span><strong>Add mission</strong><small>Create cargo lots</small></span></button><button class="quick-action" data-action="import-mission"><i>↥</i><span><strong>Import mission</strong><small>Parse readable text</small></span></button><button class="quick-action" data-page="planner"><i>⌁</i><span><strong>Generate route</strong><small>Deterministic local estimate</small></span></button><button class="quick-action" data-page="map"><i>◇</i><span><strong>Open nav display</strong><small>Route map and tree</small></span></button></div></section>
      <section class="panel panel-pad"><div class="panel-head"><div><span class="module-code">PERSISTENCE // LOCAL</span><h2>Local state</h2><p>Version ${STORAGE_VERSION} browser schema</p></div><span class="chip good">READY</span></div><div class="list-stack"><div class="list-row"><div><strong>Automatic local save</strong><small>${state.preferences.automaticSave ? 'Enabled after meaningful changes' : 'Disabled — use Save now'}</small></div><span class="status-pill ${state.preferences.automaticSave ? 'good' : 'warn'}">${state.preferences.automaticSave ? 'ON' : 'OFF'}</span></div><div class="list-row"><div><strong>Last saved</strong><small>${state.lastSavedAt ? new Date(state.lastSavedAt).toLocaleString() : 'Not saved yet'}</small></div><button class="button button-small button-secondary" data-action="save-now">Save now</button></div></div></section></aside></div></section>`;
}

function missionCard(mission) {
  const scu = mission.cargo.reduce((sum, lot) => sum + Number(lot.scu || 0), 0);
  return `<article class="mission-card"><div class="mission-card-head"><div class="mission-title-line"><div class="chip-row"><span class="chip info">${markupSafe(mission.reference || 'No reference')}</span><span class="chip">${markupSafe(mission.type)}</span></div><h3 class="spacer-top">${markupSafe(mission.title)}</h3><p>${money(mission.reward)} aUEC · ${scu} SCU · ${mission.cargo.length} lots</p></div><div class="card-menu"><button class="menu-trigger" data-mission-menu="${mission.id}" aria-label="Mission actions">···</button>${state.ui.openMissionMenu === mission.id ? `<div class="context-menu"><button data-edit-mission="${mission.id}">Edit mission</button><button data-duplicate-mission="${mission.id}">Duplicate</button><button class="danger" data-delete-mission="${mission.id}">Delete</button></div>` : ''}</div></div><div class="cargo-lots">${mission.cargo.map(lot => `<div class="cargo-lot-row"><div><strong>${markupSafe(lot.commodity)} <span class="text-accent">· ${markupSafe(mission.reference || mission.title)}</span></strong><small>${markupSafe(lotPickup(lot))} → ${markupSafe(lotDelivery(lot))}${lot.note ? ` · ${markupSafe(lot.note)}` : ''}</small></div><b>${lot.scu} SCU</b></div>`).join('')}</div></article>`;
}
function renderPlanner() {
  const ship = selectedShip(); const used = totalScu(); const overloaded = used > ship.capacity; const route = state.plannedRoute; const percent = Math.min(100, ship.capacity ? used / ship.capacity * 100 : 0);
  return `<section class="page" data-page-view="planner">${pageHeader('CARGO CONTROL / LOAD PLAN', 'Mission Planner', 'Manage contracts and generate a deterministic local route.', '<button class="button button-secondary" data-action="import-mission"><span>IMP</span> Import mission</button><button class="button button-primary" data-action="add-mission"><span>NEW</span> Add mission</button>')}
    <div class="notice">LOCAL ESTIMATE — NOT THE IN-GAME QUANTUM ROUTER</div><div class="system-strip"><span><b>SYS</b> CARGO PLANNER</span><span><i></i> PERSISTED STATE READY</span><span>${state.lastSavedAt ? `SAVED // ${new Date(state.lastSavedAt).toLocaleTimeString()}` : 'SAVE // PENDING'}</span></div>
    <section class="panel setup-strip">${fleetSelector(state.selectedShipId, 'plannerShip')}${locationSelector(state.startingLocationId, 'plannerStart')}<div class="ship-readout"><span>${money(ship.capacity)} SCU</span><small>${markupSafe(ship.role)}</small></div><button class="button button-primary" data-action="calculate-route"><span>CALC</span> Calculate route</button></section>
    ${overloaded ? `<div class="notice notice-danger spacer-top">CAPACITY EXCEEDED — ${used - ship.capacity} SCU OVER ${ship.capacity} SCU. Route generation is allowed; starting requires confirmation.</div>` : ''}
    <div class="planner-layout"><section class="panel panel-pad"><div class="panel-head"><div><span class="module-code">MODULE 01 // CONTRACT STACK</span><h2>Contract missions</h2><p>${state.missions.length} missions · ${used} planned SCU · ${money(totalReward())} aUEC</p></div><span class="status-pill ${overloaded ? 'danger' : 'good'}">${overloaded ? 'OVER CAPACITY' : 'READY'}</span></div><div class="mission-list">${state.missions.length ? state.missions.map(missionCard).join('') : '<div class="empty-state">No missions yet. Add or import a contract to begin.</div>'}</div></section>
      <section class="panel panel-pad route-preview"><div><div class="panel-head"><div><span class="module-code">MODULE 02 // ROUTE QUEUE</span><h2>Route preview</h2><p>${route ? `Generated ${new Date(route.createdAt).toLocaleTimeString()}` : 'No local route generated'}</p></div><span class="chip ${route ? 'good' : 'warn'}">${route ? 'LOCAL ROUTE' : 'NOT CALCULATED'}</span></div><div class="plan-summary"><div><span>Planned cargo</span><strong>${used} SCU</strong><div class="capacity-bar${overloaded ? ' is-overloaded' : ''}"><i style="width:${percent}%"></i></div><small>${Math.round(used / ship.capacity * 100 || 0)}% of ${ship.capacity} SCU</small></div><div><span>Total reward</span><strong>${money(totalReward())}</strong><small>aUEC declared</small></div><div><span>Stops</span><strong>${route?.metrics?.stops || 0}</strong><small>${route?.stopLabels?.join(' · ') || 'Awaiting calculation'}</small></div></div>${route ? `<div class="route-metrics"><span>${route.metrics.distance.toFixed(1)}${route.metrics.unknownLegs ? '+' : ''} Gm</span><span>${formatDuration(route.metrics.totalMinutes)}</span><span>${route.metrics.fuelDemand} fuel</span><span>${route.metrics.omAssists} OM assists</span></div>` : ''}</div>
      <div class="route-steps">${route?.steps?.map((step, index) => `<div class="route-step"><span class="step-index">${index + 1}</span><div><strong>${markupSafe(step.title)}</strong><small>${markupSafe(step.detail)}</small></div><span class="chip">${markupSafe(step.kind)}</span></div>`).join('') || '<div class="empty-state">Calculate a route to build the Active Route timeline.</div>'}</div><div class="button-row spacer-top"><button class="button button-secondary" data-action="calculate-route">Recalculate</button><button class="button button-primary" data-action="start-route"${route ? '' : ' disabled'}>Start route</button></div></section></div></section>`;
}

function destinationProfileMarkup(destination) { return `<div class="service-grid"><div><span>Landing</span><strong>${markupSafe(destination.landing)}</strong></div><div><span>Refuel</span><strong>${destination.refuel ? 'Available' : 'Unavailable'}</strong></div><div><span>Repair</span><strong>${destination.repair ? 'Available' : 'Unavailable'}</strong></div><div><span>Traffic</span><strong>${markupSafe(destination.traffic)}</strong></div><div><span>Danger</span><strong>${markupSafe(destination.danger)}</strong></div><div><span>OM assists</span><strong>${markupSafe(destination.hops)}</strong></div></div><p class="spacer-top"><strong>Known issue:</strong> ${markupSafe(issueForLocation(destination.name))}</p><p class="spacer-top">${markupSafe(destination.note)}</p><small class="operational-note">The in-game quantum router may add different OM jumps depending on your current side of the planet or moon.</small>`; }
function renderActive() {
  const active = state.activeRoute;
  if (!active?.steps?.length || active.status === 'none') return `<section class="page" data-page-view="active">${pageHeader('ROUTE CONTROL / EXECUTION', 'Active Route', 'No route is currently active.')}<div class="empty-state panel"><h2>No active route</h2><p>Generate and start a route from Mission Planner.</p><button class="button button-primary spacer-top" data-page="planner">Open Mission Planner</button></div></section>`;
  const steps = active.steps; const index = Math.min(active.stepIndex, steps.length - 1); const step = steps[index]; const previous = steps[index - 1]; const next = steps[index + 1]; const completed = active.status === 'completed';
  const showsTravel = step.kind === 'travel' && step.location !== step.nextLocation; const destination = locationRecord(showsTravel ? step.nextLocationId : step.locationId, showsTravel ? step.nextLocation : step.location); const lots = routeLots();
  return `<section class="page" data-page-view="active">${pageHeader('ROUTE CONTROL / EXECUTION', 'Active Route', 'Persisted NEXT-first workflow with derived cargo state.', '<button class="button button-ghost" data-action="end-route"><span>TERM</span> End route</button>')}<div class="notice">LOCAL ESTIMATE — NOT LIVE GAME TELEMETRY OR THE IN-GAME QUANTUM ROUTER</div><div class="active-layout spacer-top"><div class="active-main"><section class="panel action-stage"><div class="action-console-head"><span>EXECUTION CHANNEL A</span><span>${completed ? 'ROUTE COMPLETE' : `STEP ${String(index + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`}</span></div><div class="action-counter">${completed ? 'SEQUENCE CLOSED' : 'CURRENT COMMAND'}</div><div class="action-kind">${markupSafe(step.kind)}</div><h2>${completed ? 'Route complete' : markupSafe(step.title)}</h2><p>${completed ? 'All generated steps have been confirmed.' : markupSafe(step.detail)}</p><div class="command-deck"><button class="previous-button" data-active-previous${index === 0 && !completed ? ' disabled' : ''}><span>◀</span><small>BACK</small><strong>Previous</strong></button><button class="next-button" data-active-next${completed ? ' disabled' : ''}><small>${index === steps.length - 1 ? 'CONFIRM ROUTE COMPLETION' : 'CONFIRM PHYSICAL ACTION'}</small><strong>${index === steps.length - 1 ? 'COMPLETE ROUTE' : 'EXECUTE NEXT'}</strong><span>▶</span></button></div><div class="step-neighbours"><div class="neighbour"><span>Previous</span><strong>${previous ? markupSafe(previous.title) : 'Route start'}</strong></div><div class="neighbour"><span>Up next</span><strong>${next ? markupSafe(next.title) : 'Route complete'}</strong></div></div><div class="correct-wrap"><button class="link-button" data-action="correct-status">Correct status</button></div></section>
      <section class="panel panel-pad"><div class="panel-head"><div><h2>${showsTravel ? 'Current and next locations' : 'Current operation location'}</h2><p>${showsTravel ? `${markupSafe(step.location)} → ${markupSafe(step.nextLocation)}` : `Currently at ${markupSafe(step.location)}`}</p></div><button class="link-button" data-page="map">Open full map</button></div>${routeMapMarkup(true)}</section></div>
      <aside class="active-side"><section class="panel panel-pad"><div class="panel-head"><div><h2>Cargo manifest</h2><p>Mission and lot identity remain distinct</p></div><span class="chip">${lots.reduce((sum, lot) => sum + lot.scu, 0)} SCU</span></div><div class="manifest-list">${lots.map(lot => { const status = statusDerived(lot.id); const manual = active.manualCorrections?.[lot.id]; return `<div class="manifest-row"><div><strong>${lot.scu} SCU ${markupSafe(lot.commodity)}</strong><small>${markupSafe(lot.missionReference || lot.missionTitle)} · ${markupSafe(lotPickup(lot))} → ${markupSafe(lotDelivery(lot))}</small></div><span class="status-pill ${statusTone(status)}">${markupSafe(status)}${manual ? ' · MANUAL' : ''}</span></div>`; }).join('')}</div></section>
      <section class="panel panel-pad"><div class="panel-head"><div><h2>${markupSafe(destination.name)}</h2><p>Destination fixed profile</p></div><span class="status-pill ${destination.danger === 'High' ? 'danger' : 'good'}">${markupSafe(destination.reliability)}</span></div>${destinationProfileMarkup(destination)}</section>
      <section class="panel panel-pad"><div class="panel-head"><div><h2>Full timeline</h2><p>Generated route progression</p></div></div><div class="route-timeline">${steps.map((item, itemIndex) => `<div class="timeline-item${itemIndex === index && !completed ? ' is-current' : itemIndex < index || completed ? ' is-done' : ''}"><i>${itemIndex < index || completed ? '✓' : itemIndex + 1}</i><div><strong>${markupSafe(item.title)}</strong><small>${itemIndex === index && !completed ? 'Current action' : itemIndex < index || completed ? 'Completed' : 'Queued'}</small></div></div>`).join('')}</div></section></aside></div></section>`;
}

function renderHauling() {
  const ship = selectedShip(); const load = state.hauling.demoLoadScu;
  return `<section class="page" data-page-view="hauling">${pageHeader('MARKET TERMINAL / LOGISTICS', 'Commodity Hauling', 'Checkpoint 3 market workflow remains demo-only.', `<div class="segmented"><button class="${state.ui.haulingView === 'list' ? 'is-active' : ''}" data-hauling-view="list">LIST</button><button class="${state.ui.haulingView === 'map' ? 'is-active' : ''}" data-hauling-view="map">MAP</button></div>`)}<div class="notice is-demo">DEMO MARKET DATA — FILTERS, RUNS AND ACCOUNTING LOCKED UNTIL CHECKPOINT 3</div><section class="panel filter-bar spacer-top"><div class="filter-heading"><span class="module-code">FILTER BANK // DEMO QUERY</span><strong>ROUTE PARAMETERS</strong><small>Controls remain visual-only</small></div>${fleetSelector(state.selectedShipId, 'haulingShip')}<label class="field"><span>Origin</span><select disabled><option>Any origin</option></select></label><label class="field"><span>Destination</span><select disabled><option>Any destination</option></select></label><label class="field"><span>Commodity</span><select disabled><option>All commodities</option></select></label></section><div class="market-readouts spacer-top">${metric('Demo load', `${load} SCU`, `${ship.capacity} SCU vessel capacity`, true)}${metric('Routes shown', DATA.haulingRoutes.length, 'Fixed local examples')}${metric('Best profit / SCU', '578', 'Demo aUEC / SCU')}${metric('Workflow', 'CP3', 'Trading run locked')}</div><div class="hauling-toolbar"><div><span class="module-code">VESSEL LIMIT</span><strong>${money(ship.capacity)} SCU capacity</strong><small> · ${markupSafe(selectedFleetEntry().nickname || ship.name)}</small></div><span class="chip warn">DEMO ONLY</span></div>${state.ui.haulingView === 'list' ? `<div class="market-table">${DATA.haulingRoutes.map((route, routeIndex) => { const incompatible = load > ship.capacity; return `<article class="panel route-card${incompatible ? ' is-incompatible' : ''}"><div class="route-code">R-${String(routeIndex + 1).padStart(2, '0')}</div><div class="route-card-main"><span class="chip ${incompatible ? 'danger' : 'good'}">${incompatible ? 'INCOMPATIBLE' : route.commodity}</span><strong class="spacer-top">${markupSafe(route.buy)} → ${markupSafe(route.sell)}</strong><small>${load} SCU demo load · ${markupSafe(route.travel)} · prices ${markupSafe(route.freshness)}</small></div><div class="route-stat"><span>Capacity</span><strong>${incompatible ? `${load - ship.capacity} SCU over` : 'Compatible'}</strong></div><div class="route-stat"><span>Total profit</span><strong>${money(route.profitScu * load)}</strong></div><div class="route-stat hide-small"><span>aUEC / hour</span><strong>${money(route.hourly)}</strong></div><div class="route-card-actions"><button class="button button-small button-secondary" data-route-details="${route.id}">View details</button><button class="button button-small" disabled>Run · CP3</button></div></article>`; }).join('')}</div>` : routeMapMarkup()}</section>`;
}

function routeLocationState(name) {
  const route = routeSource(); const steps = route?.steps || []; const index = state.activeRoute?.status === 'active' ? state.activeRoute.stepIndex : 0; const current = steps[index];
  if (current?.location === name) return 'current'; if (current?.kind === 'travel' && current.nextLocation === name) return 'next';
  if (steps.slice(0, index).some(step => step.location === name || step.nextLocation === name)) return 'completed';
  if (steps.some(step => step.location === name || step.nextLocation === name)) return 'remaining'; return '';
}
function renderMap() {
  const selected = state.ui.selectedCustomLocation ? locationRecord(null, state.ui.selectedCustomLocation) : fixedLocationById(state.ui.selectedLocationId) || selectedStart();
  const parents = ['Hurston', 'ArcCorp', 'Crusader', 'microTech']; const custom = routeSource()?.customLocations || [];
  const tree = `<div class="entity-tree">${parents.map(parent => `<section class="tree-group"><strong>Stanton → ${parent}</strong><div class="tree-children">${DATA.locations.filter(location => location.parent === parent || fixedLocationByName(location.parent)?.parent === parent).map(location => { const routeState = routeLocationState(location.name); return `<button class="${location.id === selected.id ? 'is-selected' : ''} ${routeState ? `is-${routeState}` : ''}" data-location="${location.id}"><span>${markupSafe(location.name)}</span><small>${routeState || location.type}</small></button>`; }).join('')}</div></section>`).join('')}${custom.length ? `<section class="tree-group custom-tree"><strong>UNMAPPED / CUSTOM LOCATIONS</strong><div class="tree-children">${custom.map(name => `<button class="${name === state.ui.selectedCustomLocation ? 'is-selected' : ''}" data-custom-location="${markupSafe(name)}"><span>${markupSafe(name)}</span><small>UNMAPPED</small></button>`).join('')}</div></section>` : ''}</div>`;
  return `<section class="page" data-page-view="map">${pageHeader('NAV SYSTEM / STANTON', 'Orbital Navigation Reference', 'Generated route, current leg and synchronized entity selection.', `<div class="segmented"><button class="${state.ui.mapMode === 'orbital' ? 'is-active' : ''}" data-map-mode="orbital">Orbital Map</button><button class="${state.ui.mapMode === 'tree' ? 'is-active' : ''}" data-map-mode="tree">Entity Tree</button></div>`)}<div class="notice">LOCAL ESTIMATE — NOT THE IN-GAME QUANTUM ROUTER</div><div class="map-layout spacer-top"><section class="panel panel-pad">${state.ui.mapMode === 'orbital' ? routeMapMarkup() : tree}</section><aside class="inspector nav-inspector"><section class="panel panel-pad"><span class="module-code">ENTITY RECORD // ${markupSafe(selected.id).toUpperCase()}</span><span class="eyebrow">${markupSafe(selected.type)}</span><h2 class="spacer-top">${markupSafe(selected.name)}</h2><p class="spacer-top">${markupSafe(selected.note)}</p>${destinationProfileMarkup(selected)}<div class="button-row spacer-top">${selected.type !== 'Custom' ? `<button class="button button-secondary" data-action="set-start-from-map" data-location-id="${selected.id}">Set as Planner start</button>` : ''}</div></section><div class="notice is-demo">FIXED LOCAL PROFILE — NOT LIVE DATA</div></aside></div></section>`;
}

function renderFleet() {
  return `<section class="page" data-page-view="fleet">${pageHeader('VEHICLE SYSTEM / REGISTRY', 'Fleet Registry', 'Saved ship instances backed by the fixed catalogue.', '<button class="button button-secondary" data-action="compare-ships"><span>COMP</span> Compare fleet</button><button class="button button-primary" data-action="add-ship"><span>REG</span> Add ship</button>')}<div class="system-strip"><span><b>SYS</b> VEHICLE MANAGEMENT</span><span><i></i> ${state.fleet.length} SAVED SHIPS</span><span>SOURCE // FIXED CAPACITY</span></div><div class="fleet-grid">${state.fleet.map((entry, index) => { const ship = DATA.ships.find(item => item.id === entry.shipId); const selected = entry.id === state.selectedShipId; return `<article class="panel ship-card-large${selected ? ' is-selected' : ''}" data-maker="${manufacturerTheme(ship)}"><div class="ship-card-top"><span>REG ${String(index + 1).padStart(3, '0')}</span><b>${manufacturerTheme(ship).toUpperCase()} // ${markupSafe(ship.variant).toUpperCase()}</b></div><div class="ship-visual"><span class="ship-schematic"><i></i><i></i><i></i></span><small>VEHICLE PROFILE // ${markupSafe(ship.family).toUpperCase()}</small></div><div class="ship-record"><div class="chip-row"><span class="chip">${markupSafe(ship.family)}</span><span class="chip info">${markupSafe(ship.variant)}</span></div><h3>${markupSafe(entry.nickname || ship.name)}</h3><p>${entry.nickname ? `${markupSafe(ship.name)} · ` : ''}${markupSafe(ship.maker)} · ${markupSafe(ship.role)}</p><div class="ship-meta"><div><span>Cargo capacity</span><strong>${money(ship.capacity)} <small>SCU</small></strong></div><div class="button-row"><button class="button button-small ${selected ? 'button-primary' : 'button-secondary'}" data-select-ship="${entry.id}">${selected ? 'Selected' : 'Use in Planner'}</button><button class="button button-small button-danger" data-remove-ship="${entry.id}"${state.fleet.length === 1 ? ' disabled' : ''}>Remove</button></div></div></div></article>`; }).join('')}</div></section>`;
}

function renderIntel() {
  const tabs = ['locations', 'commodities', 'services', 'issues', 'reports']; let content = '';
  if (state.ui.intelTab === 'locations' || state.ui.intelTab === 'services') {
    const locations = DATA.locations.filter(location => !['System', 'Planet', 'Gas Giant', 'Moon'].includes(location.type)).filter(location => state.ui.intelTab === 'locations' || location.refuel || location.repair).slice(0, 12);
    content = locations.map(location => `<article class="panel intel-card"><span class="eyebrow">${markupSafe(location.type)} · ${markupSafe(location.parent)}</span><h3 class="spacer-top">${markupSafe(location.name)}</h3><p>${markupSafe(location.note)}</p><div class="chip-row"><span class="chip ${location.refuel ? 'good' : ''}">Refuel ${location.refuel ? 'yes' : 'no'}</span><span class="chip">Traffic ${markupSafe(location.traffic)}</span><span class="chip ${location.danger === 'High' ? 'danger' : 'info'}">Danger ${markupSafe(location.danger)}</span></div><div class="intel-card-footer"><button class="link-button" data-open-intel-location="${location.id}">Open on Map</button><button class="link-button" data-set-start-location="${location.id}">Set Planner start</button></div></article>`).join('');
  } else if (state.ui.intelTab === 'commodities') {
    content = DATA.commodities.filter(item => state.preferences.showIllegalCommodities || item.legality !== 'Illegal').map(item => `<article class="panel intel-card"><span class="eyebrow">${markupSafe(item.category)}</span><h3 class="spacer-top">${markupSafe(item.name)}</h3><p>Fixed reference profile for cargo identification.</p><div class="chip-row"><span class="chip ${item.legality === 'Illegal' ? 'danger' : 'good'}">${item.legality}</span><span class="chip">Volatility ${item.volatility}</span></div></article>`).join('');
  } else if (state.ui.intelTab === 'issues') content = DATA.issues.map(issue => `<article class="panel intel-card"><span class="eyebrow">${markupSafe(issue.location)}</span><h3 class="spacer-top">${markupSafe(issue.title)}</h3><p>${markupSafe(issue.detail)}</p><div class="chip-row"><span class="chip warn">${markupSafe(issue.severity)}</span></div></article>`).join('');
  else content = DATA.reports.map(report => `<article class="panel intel-card"><span class="eyebrow">${markupSafe(report.location)}</span><h3 class="spacer-top">Fixed sample report</h3><p>${markupSafe(report.message)}</p><div class="chip-row"><span class="chip ${report.tone}">${markupSafe(report.age)}</span></div></article>`).join('');
  return `<section class="page" data-page-view="intel">${pageHeader('DATABASE / LOCAL REFERENCE', 'Onboard Intel Database', 'Fixed profiles synchronized with Planner and Active Route.', '<label class="field search-bar"><span>Search intel</span><input id="intelSearch" type="search" placeholder="Search current results"></label>')}<div class="system-strip"><span><b>DB</b> STANTON OPERATIONS INDEX</span><span><i></i> READ-ONLY CACHE</span><span>LIVE LINK // OFFLINE</span></div><div class="panel panel-pad intel-console"><div class="tab-list">${tabs.map((tab, index) => `<button class="tab-button${state.ui.intelTab === tab ? ' is-active' : ''}" data-intel-tab="${tab}"><small>0${index + 1}</small>${tab}</button>`).join('')}</div><div class="intel-grid spacer-top" id="intelResults">${content || '<div class="empty-state">No matching fixed reference data.</div>'}</div></div></section>`;
}

function renderTools() {
  const tabs = ['ocr', 'agent', 'transfer']; let panel;
  if (state.ui.toolsTab === 'ocr') panel = `<div class="tool-grid spacer-top"><section class="panel panel-pad"><div class="panel-head"><div><h2>Mission OCR</h2><p>Visual mockup only</p></div><span class="chip warn">CHECKPOINT 3</span></div><button class="upload-zone" disabled><span><b>Screenshot recognition unavailable</b><p>Use working Readable Mission Import in Planner.</p></span></button></section><section class="panel panel-pad"><div class="panel-head"><div><h2>Readable import</h2><p>Checkpoint 2 working path</p></div><span class="chip good">ONLINE</span></div><p>Paste mission text, preview parsed cargo blocks, then review in the standard editor.</p><button class="button button-primary spacer-top" data-action="import-mission">Open readable import</button></section></div>`;
  else if (state.ui.toolsTab === 'agent') panel = `<div class="tool-grid spacer-top"><section class="panel panel-pad"><div class="panel-head"><div><h2>Log Agent / Datalink</h2><p>External integration remains deferred</p></div><span class="status-pill danger">LOCKED · CP3</span></div><div class="notice is-demo">NO GAME.LOG MONITORING IN CHECKPOINT 2</div></section><section class="panel panel-pad"><h2>Local core boundaries</h2><p class="spacer-top">Mission, route and persistence functions operate entirely in this browser. No external telemetry is read.</p></section></div>`;
  else panel = `<div class="tool-grid spacer-top"><section class="panel panel-pad"><div class="panel-head"><div><h2>JSON import / export</h2><p>Transfer tools remain deferred</p></div><span class="status-pill warn">LOCKED · CP3</span></div><button class="button button-secondary" disabled>Choose JSON · Locked</button></section><section class="panel panel-pad"><div class="panel-head"><div><h2>Local persistence</h2><p>Checkpoint 2 controls</p></div><span class="chip good">AVAILABLE</span></div><div class="button-row spacer-top"><button class="button button-primary" data-action="save-now">Save now</button><button class="button button-danger" data-action="reset-data">Reset local application data</button></div></section></div>`;
  return `<section class="page" data-page-view="tools">${pageHeader('UTILITY BAY / LOCAL SYSTEMS', 'Onboard Tools', 'Working local utilities and clearly locked integrations.')}<div class="system-strip"><span><b>SYS</b> UTILITY BAY</span><span><i></i> LOCAL CORE READY</span><span>EXTERNAL LINKS // OFFLINE</span></div><div class="panel panel-pad tools-console"><div class="tab-list">${tabs.map((tab, index) => `<button class="tab-button${state.ui.toolsTab === tab ? ' is-active' : ''}" data-tools-tab="${tab}"><small>0${index + 1}</small>${tab === 'ocr' ? 'Mission OCR' : tab === 'agent' ? 'Log Agent / Datalink' : 'Import / Export'}</button>`).join('')}</div>${panel}</div></section>`;
}

function toggleMarkup(key, label, note) { const on = state.preferences[key]; return `<div class="setting-row"><div><strong>${label}</strong><small>${note}</small></div><button class="switch${on ? ' is-on' : ''}" data-setting-toggle="${key}" aria-label="Toggle ${label}" aria-pressed="${on}"></button></div>`; }
function renderSettings() {
  return `<section class="page" data-page-view="settings">${pageHeader('SYSTEM CONFIG / LOCAL', 'Interface Settings', 'Persistent application defaults and local data controls.')}<div class="system-strip"><span><b>CFG</b> INTERFACE CONTROL</span><span><i></i> CHANGES APPLY IMMEDIATELY</span><span>${state.lastSavedAt ? `SAVED // ${new Date(state.lastSavedAt).toLocaleTimeString()}` : 'SAVE // PENDING'}</span></div><div class="settings-grid"><section class="panel setting-group"><h2>Manufacturer interface</h2>${toggleMarkup('adaptiveTheme', 'Adaptive ship-brand theme', 'Auto follows the selected ship manufacturer')}<label class="setting-row"><span><strong>Theme override</strong><small>Manual choice takes precedence</small></span><select id="themeOverride"><option value="auto">Auto</option>${['neutral', 'drake', 'rsi', 'misc'].map(theme => `<option value="${theme}"${state.preferences.themeOverride === theme ? ' selected' : ''}>${theme.toUpperCase()}</option>`).join('')}</select></label><div class="setting-row"><div><strong>Resolved system</strong><small>Applied across chassis and controls</small></div><strong>${resolvedTheme().toUpperCase()}</strong></div>${toggleMarkup('reducedMotion', 'Reduced motion', 'Disables non-essential transitions')}</section>
    <section class="panel setting-group"><h2>Defaults</h2><label class="setting-row"><span><strong>UI density</strong><small>Operational spacing</small></span><select id="densitySetting"><option value="standard"${state.preferences.density === 'standard' ? ' selected' : ''}>Standard</option><option value="compact"${state.preferences.density === 'compact' ? ' selected' : ''}>Compact</option></select></label><label class="setting-row"><span><strong>Default ship</strong><small>New-session fleet selection</small></span><select id="defaultShipSetting">${DATA.ships.map(ship => `<option value="${ship.id}"${state.preferences.defaultShipCatalogId === ship.id ? ' selected' : ''}>${markupSafe(ship.name)}</option>`).join('')}</select></label><label class="setting-row"><span><strong>Default starting location</strong><small>Used after reset</small></span><select id="defaultStartSetting">${locationOptions(state.preferences.defaultStartingLocationId)}</select></label><label class="setting-row"><span><strong>Default map mode</strong><small>Orbital or Entity Tree</small></span><select id="defaultMapSetting"><option value="orbital"${state.preferences.defaultMapMode === 'orbital' ? ' selected' : ''}>Orbital Map</option><option value="tree"${state.preferences.defaultMapMode === 'tree' ? ' selected' : ''}>Entity Tree</option></select></label></section>
    <section class="panel setting-group"><h2>Data and visibility</h2>${toggleMarkup('automaticSave', 'Automatic local save', 'Save after meaningful mutations')}${toggleMarkup('showIllegalCommodities', 'Show illegal commodities', 'Include contraband in reference lists')}<label class="setting-row"><span><strong>Number formatting</strong><small>Applied to SCU and aUEC</small></span><select id="numberFormatSetting"><option value="en-US"${state.preferences.numberFormat === 'en-US' ? ' selected' : ''}>1,234.56</option><option value="it-IT"${state.preferences.numberFormat === 'it-IT' ? ' selected' : ''}>1.234,56</option><option value="de-DE"${state.preferences.numberFormat === 'de-DE' ? ' selected' : ''}>1.234,56 (DE)</option></select></label><div class="button-row spacer-top"><button class="button button-primary" data-action="save-now">Save now</button><button class="button button-danger" data-action="reset-data">Reset local application data</button></div></section>
    <section class="panel setting-group"><h2>Deferred systems</h2><div class="setting-row"><div><strong>JSON import / export</strong><small>Transfer workflow reserved for Checkpoint 3</small></div><span class="status-pill warn">LOCKED · CP3</span></div><div class="setting-row"><div><strong>Cloud synchronization</strong><small>No external persistence connection</small></div><span class="status-pill">LOCKED</span></div></section>
    <section class="panel setting-group planned-system"><div class="setting-title-line"><h2>Display texture</h2><span class="chip warn">PLANNED</span></div><div class="planned-display"><strong>INDEPENDENT DISPLAY RENDERING LAYER</strong><p>Clean, MFD Glass, CRT / Phosphor and Industrial LCD remain an approved future system separate from manufacturer themes.</p><div class="planned-map"><span>Drake <b>CRT / Phosphor</b></span><span>RSI <b>MFD Glass</b></span><span>MISC <b>Industrial LCD</b></span><span>Neutral <b>Clean</b></span></div></div></section></div></section>`;
}

function renderPage() {
  applyPreferences();
  const renderers = { dashboard: renderDashboard, planner: renderPlanner, active: renderActive, hauling: renderHauling, map: renderMap, fleet: renderFleet, intel: renderIntel, tools: renderTools, settings: renderSettings };
  if (!renderers[state.ui.page]) state.ui.page = 'dashboard';
  byId('pageFrame').innerHTML = renderers[state.ui.page]();
  const meta = pageMeta[state.ui.page]; byId('pageEyebrow').textContent = meta[0]; byId('pageTitle').textContent = meta[1]; document.title = `${meta[1]} · Waypoint Cargo Companion`;
  document.querySelectorAll('[data-page]').forEach(button => { const active = button.dataset.page === state.ui.page; button.classList.toggle('is-active', active); if (button.classList.contains('nav-item')) active ? button.setAttribute('aria-current', 'page') : button.removeAttribute('aria-current'); });
  const ship = selectedShip(); const entry = selectedFleetEntry(); byId('headerShip').textContent = entry.nickname || ship.name; byId('headerShipCapacity').textContent = `${money(ship.capacity)} SCU`; byId('headerTheme').textContent = `${resolvedTheme().toUpperCase()} SYS`; byId('headerLocation').textContent = activeLocationLabel();
  const badge = document.querySelector('.nav-item[data-page="active"] .nav-badge'); if (badge) badge.textContent = state.activeRoute?.status === 'active' ? String(state.activeRoute.steps.length - state.activeRoute.stepIndex) : '—';
  if (byId('themeOverride')) byId('themeOverride').value = state.preferences.themeOverride;
}
function navigate(page) { if (!pageMeta[page]) return; mutate(value => { value.ui.page = page; value.ui.openMissionMenu = null; }, { save: false }); closeMobileNav(); byId('pageFrame').focus({ preventScroll: true }); }
function showToast(title, message) { const toast = document.createElement('div'); toast.className = 'toast'; toast.innerHTML = `<strong>${markupSafe(title)}</strong><small>${markupSafe(message)}</small>`; byId('toastRegion').appendChild(toast); setTimeout(() => toast.remove(), 3400); }
function closeAllDialogs() { document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close()); }
function clearFormErrors() { document.querySelectorAll('.field-error').forEach(item => item.textContent = ''); document.querySelectorAll('.is-invalid').forEach(item => item.classList.remove('is-invalid')); byId('missionFormError').hidden = true; }
function setFieldError(input, message, target) { input?.classList.add('is-invalid'); const error = target || input?.closest('.field')?.querySelector('.field-error'); if (error) error.textContent = message; }
function populateDatalists() { byId('locationList').innerHTML = DATA.locations.filter(location => !['System', 'Planet', 'Gas Giant', 'Moon'].includes(location.type)).map(location => `<option value="${markupSafe(location.name)}"></option>`).join(''); byId('commodityList').innerHTML = DATA.commodities.map(item => `<option value="${markupSafe(item.name)}"></option>`).join(''); }

function openMissionEditor(mission = null) {
  state.ui.editingMissionId = mission?.id || null; clearFormErrors(); byId('missionDialogTitle').textContent = mission ? 'Edit mission' : 'Create mission'; byId('missionTitle').value = mission?.title || ''; byId('missionType').value = mission?.type || 'Hauling'; byId('missionReference').value = mission?.reference || ''; byId('missionReward').value = mission?.reward ?? ''; byId('missionNotes').value = mission?.notes || '';
  renderCargoEditor(mission?.cargo?.length ? copy(mission.cargo) : [normalizeLot({ commodity: 'Titanium', scu: 8, pickupLabel: 'HDMS-Bezdek', deliveryLabel: 'Lorville', note: '' }, '')]); byId('missionDialog').showModal(); byId('missionTitle').focus();
}
function cargoEditorData() { return [...byId('cargoEditor').querySelectorAll('.cargo-edit-row')].map(row => { const pickupLabel = row.querySelector('[data-lot-field="pickup"]').value.trim(); const deliveryLabel = row.querySelector('[data-lot-field="delivery"]').value.trim(); return normalizeLot({ id: row.dataset.lotId, commodity: row.querySelector('[data-lot-field="commodity"]').value.trim(), scu: Number(row.querySelector('[data-lot-field="scu"]').value), pickupLabel, deliveryLabel, note: row.querySelector('[data-lot-field="note"]').value.trim() }, state.ui.editingMissionId || ''); }); }
function renderCargoEditor(lots) { byId('cargoEditor').innerHTML = lots.map((lot, index) => `<div class="cargo-edit-row" data-lot-id="${markupSafe(lot.id || makeId('lot'))}"><label class="field"><span>Commodity</span><input list="commodityList" data-lot-field="commodity" value="${markupSafe(lot.commodity)}"><small class="field-error" data-lot-error="commodity"></small></label><label class="field"><span>SCU</span><input data-lot-field="scu" type="number" min="0.01" step="0.01" value="${Number(lot.scu || 0)}"><small class="field-error" data-lot-error="scu"></small></label><label class="field"><span>Pickup</span><input list="locationList" data-lot-field="pickup" value="${markupSafe(lotPickup(lot))}"><small class="field-error" data-lot-error="pickup"></small></label><label class="field"><span>Delivery</span><input list="locationList" data-lot-field="delivery" value="${markupSafe(lotDelivery(lot))}"><small class="field-error" data-lot-error="delivery"></small></label><label class="field lot-note"><span>Lot note <em>Optional</em></span><input data-lot-field="note" value="${markupSafe(lot.note || '')}" placeholder="e.g. Front cargo grid"></label><button class="remove-lot" type="button" data-remove-lot="${index}" aria-label="Remove cargo lot">×</button></div>`).join(''); }
function validateMissionForm() {
  clearFormErrors(); let valid = true; const title = byId('missionTitle'); const reward = byId('missionReward');
  if (!title.value.trim()) { setFieldError(title, 'Mission title is required.'); valid = false; }
  if (reward.value !== '' && Number(reward.value) < 0) { setFieldError(reward, 'Reward cannot be negative.'); valid = false; }
  const rows = [...byId('cargoEditor').querySelectorAll('.cargo-edit-row')]; if (!rows.length) { byId('missionFormError').textContent = 'At least one cargo lot is required.'; byId('missionFormError').hidden = false; return false; }
  rows.forEach(row => {
    [['commodity', 'Commodity is required.'], ['pickup', 'Pickup is required.'], ['delivery', 'Delivery is required.']].forEach(([field, message]) => {
      const input = row.querySelector(`[data-lot-field="${field}"]`);
      if (!input.value.trim()) { setFieldError(input, message, row.querySelector(`[data-lot-error="${field}"]`)); valid = false; }
    });
    const scu = row.querySelector('[data-lot-field="scu"]');
    if (!(Number(scu.value) > 0)) { setFieldError(scu, 'SCU must be greater than zero.', row.querySelector('[data-lot-error="scu"]')); valid = false; }
  });
  if (!valid) { byId('missionFormError').textContent = 'Correct the highlighted mission fields before saving.'; byId('missionFormError').hidden = false; }
  return valid;
}

function parseMissionText(text) {
  const lines = text.split(/\r?\n/).map(line => line.trim()); const cargo = []; const missionValues = {}; let current = null;
  lines.forEach(line => { if (!line) return; if (/^cargo\s*:/i.test(line)) { if (current) cargo.push(current); current = {}; return; } const match = line.match(/^([^:]+)\s*:\s*(.*)$/); if (!match) return; const key = match[1].trim().toLowerCase(); const value = match[2].trim(); if (current) { if (key === 'commodity') current.commodity = value; if (key === 'scu' || key === 'quantity') current.scu = Number(value.replace(',', '.')); if (key === 'pickup') current.pickupLabel = value; if (key === 'delivery' || key === 'drop-off' || key === 'dropoff') current.deliveryLabel = value; if (key === 'note') current.note = value; } else missionValues[key] = value; }); if (current) cargo.push(current);
  const missionId = makeId('mission'); const mission = normalizeMission({ id: missionId, title: missionValues.mission || '', type: missionValues.type || 'Hauling', reference: missionValues.reference || '', reward: Number(String(missionValues.reward || '0').replace(/[^0-9.-]/g, '')), notes: missionValues['mission notes'] || missionValues.notes || '', cargo: cargo.map(lot => ({ ...lot, id: makeId('lot') })) });
  const errors = []; if (!mission.title) errors.push('Mission title is missing.'); if (!cargo.length) errors.push('At least one Cargo block is required.'); mission.cargo.forEach((lot, index) => { if (!lot.commodity) errors.push(`Cargo ${index + 1}: commodity is missing.`); if (!(lot.scu > 0)) errors.push(`Cargo ${index + 1}: SCU/Quantity must be greater than zero.`); if (!lotPickup(lot) || lotPickup(lot) === 'Unknown location') errors.push(`Cargo ${index + 1}: pickup is missing.`); if (!lotDelivery(lot) || lotDelivery(lot) === 'Unknown location') errors.push(`Cargo ${index + 1}: delivery/drop-off is missing.`); }); if (mission.reward < 0) errors.push('Reward cannot be negative.'); return { mission, errors };
}
function updateImportPreview() { const { mission, errors } = parseMissionText(byId('importText').value); byId('importPreview').innerHTML = errors.length ? `<div class="form-error">${errors.map(error => `<span>${markupSafe(error)}</span>`).join('')}</div>` : `<div class="import-summary"><span class="eyebrow">PARSED PREVIEW</span><strong>${markupSafe(mission.reference || 'No reference')} · ${markupSafe(mission.title)}</strong><small>${mission.cargo.length} cargo lots · ${mission.cargo.reduce((sum, lot) => sum + lot.scu, 0)} SCU · ${money(mission.reward)} aUEC</small>${mission.cargo.map(lot => `<p>${lot.scu} SCU ${markupSafe(lot.commodity)} · ${markupSafe(lotPickup(lot))} → ${markupSafe(lotDelivery(lot))}</p>`).join('')}</div>`; return { mission, errors }; }

function openConfirm(config) { state.ui.pendingConfirm = config; byId('confirmTitle').textContent = config.title; byId('confirmMessage').textContent = config.message; byId('confirmAction').textContent = config.actionLabel || 'Confirm'; byId('confirmAction').className = `button ${config.tone === 'primary' ? 'button-primary' : 'button-danger'}`; byId('confirmInputWrap').hidden = !config.typed; byId('confirmInputLabel').textContent = config.typed ? `Type ${config.typed} to confirm` : ''; byId('confirmInput').value = ''; byId('confirmInputError').textContent = ''; byId('confirmDialog').showModal(); }
function calculateRouteNow() { mutate(value => { value.plannedRoute = generateRoute(value.missions, value.startingLocationId); }); showToast('Route generated', `${state.plannedRoute.metrics.stops} stops · ${formatDuration(state.plannedRoute.metrics.totalMinutes)} local estimate.`); }
function requestCalculateRoute() { if (!state.missions.length) return showToast('No missions to route', 'Add or import at least one mission.'); if (state.activeRoute?.status === 'active') openConfirm({ title: 'Replace route draft?', message: 'An active route exists. Recalculating replaces the planned draft but does not change current progress until you start the new route.', actionLabel: 'Replace draft', tone: 'primary', action: 'calculate-route' }); else calculateRouteNow(); }
function startRouteNow() { mutate(value => { const route = value.plannedRoute; value.activeRoute = { routeId: route.id, status: 'active', stepIndex: 0, steps: copy(route.steps), metrics: copy(route.metrics), lotIds: copy(route.lotIds), stopLabels: copy(route.stopLabels), customLocations: copy(route.customLocations), manifest: value.missions.flatMap(mission => mission.cargo.filter(lot => route.lotIds.includes(lot.id)).map(lot => ({ ...copy(lot), missionReference: mission.reference, missionTitle: mission.title }))), manualCorrections: {} }; value.ui.page = 'active'; }); showToast('Route started', `${state.activeRoute.steps.length} generated steps are now active.`); }
function requestStartRoute() { if (!state.plannedRoute?.steps?.length) return showToast('No route ready', 'Calculate a route first.'); const over = totalScu() - selectedShip().capacity; if (over > 0) return openConfirm({ title: 'Start overloaded route?', message: `Planned cargo exceeds ${selectedShip().capacity} SCU by ${over} SCU. Confirm that you want to start this route anyway.`, actionLabel: 'Start overloaded route', tone: 'primary', action: 'start-route' }); if (state.activeRoute?.status === 'active' && state.activeRoute.routeId !== state.plannedRoute.id) return openConfirm({ title: 'Replace active route?', message: 'Starting this draft will replace the current active route and its progress.', actionLabel: 'Replace and start', tone: 'primary', action: 'start-route' }); startRouteNow(); }
function performConfirmed(config) {
  if (config.action === 'delete-mission') { mutate(value => { value.missions = value.missions.filter(mission => mission.id !== config.id); value.plannedRoute = null; value.ui.openMissionMenu = null; }); showToast('Mission deleted', 'The mission and its cargo lots were removed.'); }
  if (config.action === 'remove-ship') { mutate(value => { value.fleet = value.fleet.filter(entry => entry.id !== config.id); if (value.selectedShipId === config.id) value.selectedShipId = value.fleet[0].id; }); showToast('Ship removed', 'Fleet registry updated.'); }
  if (config.action === 'calculate-route') calculateRouteNow();
  if (config.action === 'start-route') startRouteNow();
  if (config.action === 'end-route') { mutate(value => { value.activeRoute.status = 'none'; value.activeRoute.stepIndex = 0; value.activeRoute.manualCorrections = {}; }); showToast('Route ended', 'Progress was cleared; the planned route remains available.'); }
  if (config.action === 'set-start') { mutate(value => { value.startingLocationId = config.id; value.preferences.defaultStartingLocationId = config.id; value.plannedRoute = null; value.ui.page = 'planner'; }); showToast('Starting location updated', fixedLocationById(config.id).name); }
  if (config.action === 'reset-data') { localStorage.removeItem(STORAGE_KEY); const fresh = defaultState(); Object.keys(state).forEach(key => delete state[key]); Object.assign(state, fresh); saveState(true); renderPage(); showToast('Local data reset', 'The default persisted workspace was restored.'); }
}

function openAddShipDialog() { byId('featureDialogEyebrow').textContent = 'Fleet registry'; byId('featureDialogTitle').textContent = 'Add a ship'; byId('featureDialogBody').innerHTML = `<div class="form-grid"><label class="field"><span>Fixed ship catalogue</span><select id="newShipCatalog">${DATA.ships.map(ship => `<option value="${ship.id}">${markupSafe(ship.name)} · ${ship.capacity} SCU</option>`).join('')}</select></label><label class="field"><span>Nickname <em>Optional</em></span><input id="newShipNickname" maxlength="40" placeholder="Required for a second identical ship"></label></div><div class="form-error spacer-top" id="fleetFormError" hidden></div><button class="button button-primary spacer-top" data-action="save-ship">Add to fleet</button>`; byId('featureDialog').showModal(); }
function openCorrectionDialog() { const lots = routeLots(); byId('featureDialogEyebrow').textContent = 'Secondary control'; byId('featureDialogTitle').textContent = 'Correct cargo status'; byId('featureDialogBody').innerHTML = `<div class="notice is-demo">MANUAL CORRECTIONS MAY DIFFER FROM THE GENERATED ROUTE SEQUENCE</div><div class="list-stack spacer-top">${lots.map(lot => `<label class="list-row"><div><strong>${markupSafe(lot.missionReference)} · ${lot.scu} SCU ${markupSafe(lot.commodity)}</strong><small>Derived: ${markupSafe(statusDerived(lot.id))}</small></div><select data-manual-status="${lot.id}"><option value="">Derived status</option>${['Pending', 'On board', 'Delivered'].map(status => `<option value="${status}"${state.activeRoute.manualCorrections?.[lot.id] === status ? ' selected' : ''}>${status}</option>`).join('')}</select></label>`).join('')}</div><button class="button button-secondary spacer-top" data-action="reset-corrections">Return all to derived status</button>`; byId('featureDialog').showModal(); }
function openCompareDialog() { const entries = state.fleet.map(entry => { const ship = DATA.ships.find(item => item.id === entry.shipId); return `<div class="list-row"><div><strong>${markupSafe(entry.nickname || ship.name)}</strong><small>${markupSafe(ship.maker)} · ${markupSafe(ship.family)} ${markupSafe(ship.variant)} · ${markupSafe(ship.role)}</small></div><b>${ship.capacity} SCU</b></div>`; }).join(''); byId('featureDialogEyebrow').textContent = 'Fleet comparison'; byId('featureDialogTitle').textContent = 'Saved ships'; byId('featureDialogBody').innerHTML = `<div class="list-stack">${entries}</div>`; byId('featureDialog').showModal(); }
function openRouteDrawer(routeId) { const route = DATA.haulingRoutes.find(item => item.id === routeId); if (!route) return; mutate(value => { value.hauling.selectedRouteId = routeId; }, { render: false }); const load = state.hauling.demoLoadScu; const incompatible = load > selectedShip().capacity; byId('drawerTitle').textContent = `${route.commodity} demo route`; byId('drawerBody').innerHTML = `<div class="notice is-demo">DEMO MARKET DATA — CHECKPOINT 3 WORKFLOW LOCKED</div><section class="drawer-section"><span class="eyebrow">Buy → Sell</span><h2 class="spacer-top">${markupSafe(route.buy)} → ${markupSafe(route.sell)}</h2><p class="spacer-top">${load} SCU demo load · ${money(route.profitScu * load)} aUEC estimated profit</p></section><section class="drawer-section"><span class="status-pill ${incompatible ? 'danger' : 'good'}">${incompatible ? `${load - selectedShip().capacity} SCU OVER CAPACITY` : 'VESSEL COMPATIBLE'}</span><p class="spacer-top">${markupSafe(route.warning)}</p></section><button class="button" disabled>Start trading run · Checkpoint 3</button>`; byId('routeDrawer').classList.add('is-open'); byId('routeDrawer').setAttribute('aria-hidden', 'false'); byId('drawerScrim').hidden = false; }
function closeDrawer() { byId('routeDrawer').classList.remove('is-open'); byId('routeDrawer').setAttribute('aria-hidden', 'true'); byId('drawerScrim').hidden = true; }
function openMobileNav() { byId('sidebar').classList.add('is-open'); byId('mobileScrim').hidden = false; byId('menuButton').setAttribute('aria-expanded', 'true'); }
function closeMobileNav() { byId('sidebar').classList.remove('is-open'); byId('mobileScrim').hidden = true; byId('menuButton').setAttribute('aria-expanded', 'false'); }

function handleAction(action, target) {
  if (action === 'add-mission') openMissionEditor();
  if (action === 'import-mission') { byId('importText').value = 'Mission: Covalex freight transfer\nType: Hauling\nReference: M-07\nReward: 46250\nMission notes: Priority transfer\n\nCargo:\nCommodity: Agricium\nQuantity: 8\nPickup: ArcCorp Mining Area 056\nDrop-off: Area18\nNote: Front cargo grid\n\nCargo:\nCommodity: Titanium\nSCU: 4\nPickup: HDMS-Bezdek\nDelivery: Lorville'; updateImportPreview(); byId('importDialog').showModal(); }
  if (action === 'calculate-route') requestCalculateRoute(); if (action === 'start-route') requestStartRoute();
  if (action === 'end-route') openConfirm({ title: 'End active route?', message: 'Current progress and manual cargo corrections will be cleared. The planned route remains available.', actionLabel: 'End route', action: 'end-route' });
  if (action === 'correct-status') openCorrectionDialog(); if (action === 'reset-corrections') { mutate(value => { value.activeRoute.manualCorrections = {}; }); byId('featureDialog').close(); showToast('Corrections cleared', 'All cargo statuses now derive from route progress.'); }
  if (action === 'add-ship') openAddShipDialog(); if (action === 'compare-ships') openCompareDialog();
  if (action === 'save-ship') { const shipId = byId('newShipCatalog').value; const nickname = byId('newShipNickname').value.trim(); const sameShip = state.fleet.filter(entry => entry.shipId === shipId); const duplicate = sameShip.length && (!nickname || sameShip.some(entry => (entry.nickname || '').toLowerCase() === nickname.toLowerCase())); if (duplicate) { byId('fleetFormError').textContent = nickname ? 'That ship and nickname already exist.' : 'This ship is already saved. Add a distinct nickname for another instance.'; byId('fleetFormError').hidden = false; return; } mutate(value => { value.fleet.push(fleetEntry(shipId, nickname)); }); byId('featureDialog').close(); showToast('Ship added', nickname || DATA.ships.find(ship => ship.id === shipId).name); }
  if (action === 'save-now') { saveState(true); renderPage(); showToast('Local state saved', new Date(state.lastSavedAt).toLocaleTimeString()); }
  if (action === 'reset-data') openConfirm({ title: 'Reset local application data?', message: 'This removes saved fleet, missions, routes, progress and preferences from this browser.', actionLabel: 'Reset application', action: 'reset-data', typed: 'RESET' });
  if (action === 'set-start-from-map') openConfirm({ title: 'Change Planner starting location?', message: `Set ${fixedLocationById(target.dataset.locationId).name} as the current and default Planner starting location?`, actionLabel: 'Set starting location', tone: 'primary', action: 'set-start', id: target.dataset.locationId });
}

function handleClick(event) {
  const settingToggle = event.target.closest('[data-setting-toggle]');
  if (settingToggle) { const key = settingToggle.dataset.settingToggle; mutate(value => { value.preferences[key] = !value.preferences[key]; }, { forceSave: key === 'automaticSave' }); return; }
  const page = event.target.closest('[data-page]'); if (page) { if (page.dataset.toolsTab) state.ui.toolsTab = page.dataset.toolsTab; navigate(page.dataset.page); return; }
  const action = event.target.closest('[data-action]'); if (action) { handleAction(action.dataset.action, action); return; }
  const missionMenu = event.target.closest('[data-mission-menu]'); if (missionMenu) { mutate(value => { value.ui.openMissionMenu = value.ui.openMissionMenu === missionMenu.dataset.missionMenu ? null : missionMenu.dataset.missionMenu; }, { save: false }); return; }
  const edit = event.target.closest('[data-edit-mission]'); if (edit) { const mission = state.missions.find(item => item.id === edit.dataset.editMission); state.ui.openMissionMenu = null; openMissionEditor(copy(mission)); return; }
  const duplicate = event.target.closest('[data-duplicate-mission]'); if (duplicate) { const source = state.missions.find(item => item.id === duplicate.dataset.duplicateMission); const missionId = makeId('mission'); const clone = { ...copy(source), id: missionId, title: `${source.title} copy`, reference: source.reference ? `${source.reference}-COPY` : 'COPY', cargo: source.cargo.map(lot => ({ ...lot, id: makeId('lot'), missionId })) }; mutate(value => { value.missions.push(clone); value.plannedRoute = null; value.ui.openMissionMenu = null; }); showToast('Mission duplicated', 'Cargo-lot identities were regenerated.'); return; }
  const removeMission = event.target.closest('[data-delete-mission]'); if (removeMission) { const mission = state.missions.find(item => item.id === removeMission.dataset.deleteMission); openConfirm({ title: 'Delete mission?', message: `Delete ${mission.reference || mission.title} and its ${mission.cargo.length} cargo lots?`, actionLabel: 'Delete mission', action: 'delete-mission', id: mission.id }); return; }
  const next = event.target.closest('[data-active-next]'); if (next && state.activeRoute.status === 'active') { mutate(value => { if (value.activeRoute.stepIndex >= value.activeRoute.steps.length - 1) value.activeRoute.status = 'completed'; else value.activeRoute.stepIndex += 1; }); return; }
  const previous = event.target.closest('[data-active-previous]'); if (previous) { mutate(value => { if (value.activeRoute.status === 'completed') value.activeRoute.status = 'active'; else value.activeRoute.stepIndex = Math.max(0, value.activeRoute.stepIndex - 1); }); return; }
  const mapMode = event.target.closest('[data-map-mode]'); if (mapMode) { mutate(value => { value.ui.mapMode = mapMode.dataset.mapMode; }); return; }
  const location = event.target.closest('[data-location]'); if (location) { mutate(value => { value.ui.selectedLocationId = location.dataset.location; value.ui.selectedCustomLocation = ''; }); return; }
  const custom = event.target.closest('[data-custom-location]'); if (custom) { mutate(value => { value.ui.selectedCustomLocation = custom.dataset.customLocation; }); return; }
  const intelOpen = event.target.closest('[data-open-intel-location]'); if (intelOpen) { mutate(value => { value.ui.selectedLocationId = intelOpen.dataset.openIntelLocation; value.ui.selectedCustomLocation = ''; value.ui.page = 'map'; }); return; }
  const setStart = event.target.closest('[data-set-start-location]'); if (setStart) { const locationInfo = fixedLocationById(setStart.dataset.setStartLocation); openConfirm({ title: 'Change Planner starting location?', message: `Set ${locationInfo.name} as the current and default starting location?`, actionLabel: 'Set starting location', tone: 'primary', action: 'set-start', id: locationInfo.id }); return; }
  const haulingView = event.target.closest('[data-hauling-view]'); if (haulingView) { mutate(value => { value.ui.haulingView = haulingView.dataset.haulingView; }); return; }
  const details = event.target.closest('[data-route-details]'); if (details) { openRouteDrawer(details.dataset.routeDetails); return; }
  const selectShip = event.target.closest('[data-select-ship]'); if (selectShip) { mutate(value => { value.selectedShipId = selectShip.dataset.selectShip; }); showToast('Planner ship selected', `${selectedFleetEntry().nickname || selectedShip().name} · ${selectedShip().capacity} SCU`); return; }
  const removeShip = event.target.closest('[data-remove-ship]'); if (removeShip) { const entry = state.fleet.find(item => item.id === removeShip.dataset.removeShip); openConfirm({ title: 'Remove saved ship?', message: `Remove ${entry.nickname || DATA.ships.find(ship => ship.id === entry.shipId).name} from the local fleet?`, actionLabel: 'Remove ship', action: 'remove-ship', id: entry.id }); return; }
  const intelTab = event.target.closest('[data-intel-tab]'); if (intelTab) { mutate(value => { value.ui.intelTab = intelTab.dataset.intelTab; }); return; }
  const toolsTab = event.target.closest('[data-tools-tab]'); if (toolsTab) { mutate(value => { value.ui.toolsTab = toolsTab.dataset.toolsTab; }); return; }
  const closeDialog = event.target.closest('[data-close-dialog]'); if (closeDialog) { closeDialog.closest('dialog').close(); return; }
  if (event.target.closest('[data-close-drawer]') || event.target === byId('drawerScrim')) { closeDrawer(); return; }
  const openMenu = event.target.closest('[data-open-menu]'); if (openMenu) { byId('profileMenu').hidden = !byId('profileMenu').hidden; }
}

document.addEventListener('click', handleClick);
document.addEventListener('change', event => {
  if (event.target.id === 'plannerShip' || event.target.id === 'haulingShip') mutate(value => { value.selectedShipId = event.target.value; });
  if (event.target.id === 'plannerStart') mutate(value => { value.startingLocationId = event.target.value; value.plannedRoute = null; });
  if (event.target.id === 'themeOverride') mutate(value => { value.preferences.themeOverride = event.target.value; if (event.target.value !== 'auto') value.preferences.manualTheme = event.target.value; }, { forceSave: true });
  if (event.target.id === 'densitySetting') mutate(value => { value.preferences.density = event.target.value; });
  if (event.target.id === 'defaultShipSetting') mutate(value => { value.preferences.defaultShipCatalogId = event.target.value; let entry = value.fleet.find(item => item.shipId === event.target.value); if (!entry) { entry = fleetEntry(event.target.value, ''); value.fleet.push(entry); } value.selectedShipId = entry.id; });
  if (event.target.id === 'defaultStartSetting') mutate(value => { value.preferences.defaultStartingLocationId = event.target.value; value.startingLocationId = event.target.value; value.plannedRoute = null; });
  if (event.target.id === 'defaultMapSetting') mutate(value => { value.preferences.defaultMapMode = event.target.value; value.ui.mapMode = event.target.value; });
  if (event.target.id === 'numberFormatSetting') mutate(value => { value.preferences.numberFormat = event.target.value; });
  if (event.target.matches('[data-manual-status]')) { const lotId = event.target.dataset.manualStatus; const status = event.target.value; mutate(value => { if (status) value.activeRoute.manualCorrections[lotId] = status; else delete value.activeRoute.manualCorrections[lotId]; }); openCorrectionDialog(); }
});
document.addEventListener('input', event => { if (event.target.id === 'intelSearch') { const query = event.target.value.trim().toLowerCase(); document.querySelectorAll('#intelResults .intel-card').forEach(card => { card.hidden = Boolean(query) && !card.textContent.toLowerCase().includes(query); }); } if (event.target.id === 'importText') updateImportPreview(); });

byId('missionForm').addEventListener('submit', event => { event.preventDefault(); if (!validateMissionForm()) return; const missionId = state.ui.editingMissionId || makeId('mission'); const mission = normalizeMission({ id: missionId, title: byId('missionTitle').value.trim(), type: byId('missionType').value, reference: byId('missionReference').value.trim(), reward: Number(byId('missionReward').value || 0), notes: byId('missionNotes').value.trim(), cargo: cargoEditorData().map(lot => ({ ...lot, missionId })) }); const existing = state.missions.findIndex(item => item.id === missionId); mutate(value => { if (existing >= 0) value.missions[existing] = mission; else value.missions.push(mission); value.plannedRoute = null; value.ui.editingMissionId = null; }); byId('missionDialog').close(); showToast(existing >= 0 ? 'Mission updated' : 'Mission created', `${mission.cargo.length} cargo lots · ${mission.cargo.reduce((sum, lot) => sum + lot.scu, 0)} SCU`); });
byId('addCargoLot').addEventListener('click', () => { const lots = cargoEditorData(); lots.push(normalizeLot({ id: makeId('lot'), commodity: 'Titanium', scu: 4, pickupLabel: 'HDMS-Bezdek', deliveryLabel: 'Lorville' }, state.ui.editingMissionId || '')); renderCargoEditor(lots); });
byId('cargoEditor').addEventListener('click', event => { const remove = event.target.closest('[data-remove-lot]'); if (!remove) return; const lots = cargoEditorData(); lots.splice(Number(remove.dataset.removeLot), 1); renderCargoEditor(lots); if (!lots.length) { byId('missionFormError').textContent = 'At least one cargo lot is required before saving.'; byId('missionFormError').hidden = false; } });
byId('importForm').addEventListener('submit', event => { event.preventDefault(); const parsed = updateImportPreview(); if (parsed.errors.length) return; byId('importDialog').close(); openMissionEditor(parsed.mission); showToast('Mission parsed', 'Review and correct the normal mission editor before saving.'); });
byId('confirmAction').addEventListener('click', () => { const config = state.ui.pendingConfirm; if (!config) return; if (config.typed && byId('confirmInput').value !== config.typed) { byId('confirmInputError').textContent = `Type ${config.typed} exactly.`; byId('confirmInput').classList.add('is-invalid'); return; } byId('confirmDialog').close(); state.ui.pendingConfirm = null; performConfirmed(config); });
byId('menuButton').addEventListener('click', () => byId('sidebar').classList.contains('is-open') ? closeMobileNav() : openMobileNav());
byId('mobileScrim').addEventListener('click', closeMobileNav);
byId('collapseSidebar').addEventListener('click', () => mutate(value => { value.ui.sidebarCollapsed = !value.ui.sidebarCollapsed; }));
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeAllDialogs(); closeDrawer(); closeMobileNav(); byId('profileMenu').hidden = true; state.ui.openMissionMenu = null; } });

populateDatalists();
renderPage();
if (state.ui.storageRecovery) showToast('Recovered safely', 'Malformed or incompatible saved data was ignored.');

window.WAYPOINT_TEST_API = Object.freeze({ STORAGE_KEY, STORAGE_VERSION, getState: () => copy(persistedState(state)), generateRoute: (missions, startId) => copy(generateRoute(missions.map(normalizeMission), startId)), cargoStatus: statusDerived, reset: () => { localStorage.removeItem(STORAGE_KEY); location.reload(); } });
