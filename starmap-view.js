'use strict';

(function initializeStarmap() {
  const data = window.SCCompanionStarmapData;
  const session = window.SCCompanionSession;
  const page = document.querySelector('#map');
  if (!data || !session || !page) return;

  const NS = 'http://www.w3.org/2000/svg';
  const BASE_CAMERA = Object.freeze({ x: 0, y: 0, width: 1200, height: 720 });
  const MIN_CAMERA_WIDTH = 360;
  const MAX_CAMERA_WIDTH = 1800;
  const mobileQuery = window.matchMedia('(max-width: 900px)');

  page.classList.add('starmap-page-v2');
  page.innerHTML = `
    <header class="page-header starmap-page-header">
      <div>
        <small>NAVIGATION DISPLAY</small>
        <h2>Starmap</h2>
        <p>Read the route at a glance, inspect its system context, then return to the next objective without losing your place.</p>
      </div>
      <span class="status-tag status-tag--ready">UX foundation</span>
    </header>

    <div class="starmap-shell">
      <section class="mfd-panel starmap-primary-panel" aria-label="Interactive navigation map">
        <header class="starmap-commandbar">
          <div class="starmap-layer-control">
            <small>VIEW</small>
            <div class="starmap-segments" role="tablist" aria-label="Navigation layer">
              <button type="button" role="tab" data-map-mode="route" aria-selected="true" aria-pressed="true">Itinerary</button>
              <button type="button" role="tab" data-map-mode="local" aria-selected="false" aria-pressed="false">System</button>
              <button type="button" role="tab" data-map-mode="network" aria-selected="false" aria-pressed="false">Network</button>
            </div>
          </div>

          <label class="starmap-system-picker" for="starmap-system-select" hidden>
            <span>System</span>
            <select id="starmap-system-select" aria-label="Select system"></select>
          </label>

          <div class="starmap-camera-controls" aria-label="Map controls">
            <button type="button" data-map-action="zoom-out" aria-label="Zoom out" title="Zoom out">−</button>
            <button type="button" data-map-action="fit" aria-label="Fit map" title="Fit map">Fit</button>
            <button type="button" data-map-action="current" aria-label="Center current objective" title="Center current objective">Current</button>
            <button type="button" data-map-action="zoom-in" aria-label="Zoom in" title="Zoom in">+</button>
          </div>
        </header>

        <div class="starmap-stage-wrap">
          <svg id="starmap-canvas" class="starmap-canvas" viewBox="0 0 1200 720" role="img" tabindex="0" aria-label="Interactive route and system map" aria-describedby="starmap-data-note"></svg>

          <div class="starmap-objective-hud" aria-label="Route orientation">
            <button type="button" data-hud-stop="current"><small>CURRENT OBJECTIVE</small><strong id="starmap-hud-current">No active route</strong><span id="starmap-hud-current-meta">Generate a session first</span></button>
            <button type="button" data-hud-stop="next"><small>NEXT</small><strong id="starmap-hud-next">—</strong><span id="starmap-hud-next-meta">—</span></button>
            <button type="button" data-hud-stop="final"><small>FINAL DESTINATION</small><strong id="starmap-hud-final">—</strong><span id="starmap-hud-final-meta">—</span></button>
          </div>

          <button type="button" class="starmap-context-toggle" id="starmap-context-toggle" aria-controls="starmap-context-panel" aria-expanded="false"><span>Details</span><strong id="starmap-context-toggle-title">Route</strong></button>
        </div>

        <footer class="starmap-statusbar">
          <div><small id="starmap-mode">Itinerary overview</small><strong id="starmap-route-status">No mapped route</strong></div>
          <span>Wheel or +/− to zoom · drag or arrow keys to move · Home to fit</span>
        </footer>
      </section>

      <button type="button" class="starmap-context-backdrop" id="starmap-context-backdrop" aria-label="Close details" tabindex="-1"></button>

      <aside class="mfd-panel starmap-context-panel" id="starmap-context-panel" aria-label="Selected map object">
        <header class="mfd-header starmap-context-header">
          <div><small>SELECTED</small><strong id="starmap-selection-title">Route overview</strong></div>
          <div><span id="starmap-selection-type">Itinerary</span><button type="button" id="starmap-context-close" aria-label="Close details">×</button></div>
        </header>
        <div class="starmap-selection-card">
          <p id="starmap-selection-detail">Generate a session to display route stops.</p>
          <div class="starmap-selection-actions">
            <button type="button" class="button button--primary" id="starmap-open-system" hidden>Open system</button>
            <button type="button" class="button button--secondary" id="starmap-center-selection" hidden>Center selection</button>
          </div>
        </div>
        <details class="starmap-route-drawer" open>
          <summary><span>Route sequence</span><strong id="starmap-route-count">0 stops</strong></summary>
          <ol id="starmap-route-list"></ol>
        </details>
        <p class="data-note" id="starmap-data-note">Positions are schematic and optimized for navigation clarity, not physical scale.</p>
      </aside>
    </div>
    <div class="sr-only" id="starmap-live-status" aria-live="polite"></div>`;

  const svg = page.querySelector('#starmap-canvas');
  const elements = {
    mode: page.querySelector('#starmap-mode'),
    title: page.querySelector('#starmap-selection-title'),
    type: page.querySelector('#starmap-selection-type'),
    detail: page.querySelector('#starmap-selection-detail'),
    route: page.querySelector('#starmap-route-status'),
    routeCount: page.querySelector('#starmap-route-count'),
    routeList: page.querySelector('#starmap-route-list'),
    note: page.querySelector('#starmap-data-note'),
    buttons: [...page.querySelectorAll('[data-map-mode]')],
    systemPicker: page.querySelector('.starmap-system-picker'),
    systemSelect: page.querySelector('#starmap-system-select'),
    openSystem: page.querySelector('#starmap-open-system'),
    centerSelection: page.querySelector('#starmap-center-selection'),
    contextToggle: page.querySelector('#starmap-context-toggle'),
    contextToggleTitle: page.querySelector('#starmap-context-toggle-title'),
    contextClose: page.querySelector('#starmap-context-close'),
    contextBackdrop: page.querySelector('#starmap-context-backdrop'),
    liveStatus: page.querySelector('#starmap-live-status'),
    hudCurrent: page.querySelector('#starmap-hud-current'),
    hudCurrentMeta: page.querySelector('#starmap-hud-current-meta'),
    hudNext: page.querySelector('#starmap-hud-next'),
    hudNextMeta: page.querySelector('#starmap-hud-next-meta'),
    hudFinal: page.querySelector('#starmap-hud-final'),
    hudFinalMeta: page.querySelector('#starmap-hud-final-meta')
  };

  data.systems.forEach((system) => {
    const option = document.createElement('option');
    option.value = system.id;
    option.textContent = system.name;
    elements.systemSelect.append(option);
  });

  let mode = 'route';
  let selected = { kind: 'route', key: 'route', systemId: null, object: null };
  let selectedSystemId = 'stanton';
  let camera = { ...BASE_CAMERA };
  let points = new Map();
  let drag = null;
  let hudStops = { current: null, next: null, final: null };

  function navigation() { return window.SCCompanionNavigationEstimates ?? null; }
  function official() { return window.SCCompanionOfficialUniverseData ?? null; }

  function node(name, attributes = {}, text = '') {
    const element = document.createElementNS(NS, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    if (text) element.textContent = text;
    return element;
  }

  function add(parent, name, attributes = {}, text = '') {
    const element = node(name, attributes, text);
    parent.append(element);
    return element;
  }

  function trimLabel(value, maximum = 34) {
    const text = String(value ?? '');
    return text.length > maximum ? `${text.slice(0, maximum - 1)}…` : text;
  }

  function formatType(value) {
    return String(value ?? '').replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function routeContext() {
    const state = session.getState();
    if (!state.route?.stops?.length) return { state, route: null, progress: null, stops: [] };
    const corrections = window.SCCompanionRouteCorrections;
    const progressModel = window.SCCompanionRouteProgress;
    const route = corrections ? corrections.deriveRoute(state.route, state.routeCorrections) : state.route;
    const progress = progressModel ? progressModel.derive(route, state.completedStopIds, state.currentStopIndex) : null;
    return { state, route, progress, stops: route.allStops ?? route.stops };
  }

  function activeQuantumFactor(context) {
    const ship = (context.state.hangarShips ?? []).find((item) => item.id === context.state.selectedShipId);
    return Number(ship?.quantumTimeFactor ?? 1);
  }

  function activeStops(context) { return context.stops.filter((stop) => !stop.skipped); }

  function routeSummary(context) {
    const stops = activeStops(context);
    return stops.length && navigation() ? navigation().summarizeRoute(stops, { quantumTimeFactor: activeQuantumFactor(context) }) : null;
  }

  function estimateLeg(previousStop, stop, context) {
    if (!previousStop) return null;
    return navigation()?.estimateLeg(previousStop.locationId, stop.locationId, { quantumTimeFactor: activeQuantumFactor(context) }) ?? null;
  }

  function operationSummary(stop) {
    if (!stop?.operations) return 'No operation details';
    const pickup = stop.operations.filter((operation) => operation.type !== 'delivery' && operation.lotId).reduce((sum, operation) => sum + Number(operation.scu ?? 0), 0);
    const drop = stop.operations.filter((operation) => operation.type === 'delivery' && operation.lotId).reduce((sum, operation) => sum + Number(operation.scu ?? 0), 0);
    return [drop ? `Drop ${drop} SCU` : '', pickup ? `Pick up ${pickup} SCU` : ''].filter(Boolean).join(' · ') || `${stop.operations.length} objective${stop.operations.length === 1 ? '' : 's'}`;
  }

  function legText(estimate) {
    if (!estimate) return 'Navigation estimate unavailable';
    const jumps = estimate.jumpCount ? ` · ${estimate.jumpCount} jump${estimate.jumpCount === 1 ? '' : 's'}` : '';
    return `${estimate.distanceLabel} · ${estimate.minMinutes}–${estimate.maxMinutes} min${jumps}`;
  }

  function stopState(stop, context) {
    if (stop.skipped) return 'skipped';
    if (context.progress?.completedSet.has(String(stop.id))) return 'complete';
    if (context.progress?.currentStop?.id === stop.id) return 'current';
    return 'future';
  }

  function defaultSystemId(context) {
    if (selected.systemId) return selected.systemId;
    const current = context.progress?.currentStop ?? activeStops(context)[0] ?? null;
    return data.getLocationAnchor(current?.locationId)?.systemId ?? selectedSystemId;
  }

  function cameraViewBox() { return `${camera.x} ${camera.y} ${camera.width} ${camera.height}`; }
  function applyCamera() { svg.setAttribute('viewBox', cameraViewBox()); }
  function resetCamera() { camera = { ...BASE_CAMERA }; applyCamera(); }

  function zoomAt(factor, centerX = camera.x + camera.width / 2, centerY = camera.y + camera.height / 2) {
    const nextWidth = Math.min(MAX_CAMERA_WIDTH, Math.max(MIN_CAMERA_WIDTH, camera.width * factor));
    const ratio = nextWidth / camera.width;
    const nextHeight = nextWidth * BASE_CAMERA.height / BASE_CAMERA.width;
    camera = {
      x: centerX - (centerX - camera.x) * ratio,
      y: centerY - (centerY - camera.y) * ratio,
      width: nextWidth,
      height: nextHeight
    };
    applyCamera();
  }

  function panBy(dx, dy) { camera.x += dx; camera.y += dy; applyCamera(); }

  function svgPoint(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    return {
      x: camera.x + ((clientX - rect.left) / Math.max(rect.width, 1)) * camera.width,
      y: camera.y + ((clientY - rect.top) / Math.max(rect.height, 1)) * camera.height
    };
  }

  function centerOnKey(key, announce = true) {
    const point = points.get(String(key));
    if (!point) return false;
    const width = Math.min(camera.width, 720);
    const height = width * BASE_CAMERA.height / BASE_CAMERA.width;
    camera = { x: point.x - width / 2, y: point.y - height / 2, width, height };
    applyCamera();
    if (announce) elements.liveStatus.textContent = `Centered ${elements.title.textContent}`;
    return true;
  }

  function clearMap() {
    svg.replaceChildren();
    points = new Map();
    const defs = add(svg, 'defs');
    const pattern = add(defs, 'pattern', { id: 'map-grid-v2', width: 48, height: 48, patternUnits: 'userSpaceOnUse' });
    add(pattern, 'path', { d: 'M 48 0 L 0 0 0 48', class: 'map-grid-line', fill: 'none' });
    const arrow = add(defs, 'marker', { id: 'map-arrow', markerWidth: 8, markerHeight: 8, refX: 6, refY: 3, orient: 'auto', markerUnits: 'strokeWidth' });
    add(arrow, 'path', { d: 'M0,0 L0,6 L7,3 z', class: 'map-arrow-head' });
    add(svg, 'rect', { x: -2000, y: -1200, width: 5200, height: 3200, fill: 'url(#map-grid-v2)', class: 'map-background' });
  }

  function openContextPanel() {
    page.classList.add('is-context-open');
    elements.contextToggle.setAttribute('aria-expanded', 'true');
  }

  function closeContextPanel() {
    page.classList.remove('is-context-open');
    elements.contextToggle.setAttribute('aria-expanded', 'false');
    if (mobileQuery.matches) elements.contextToggle.focus({ preventScroll: true });
  }

  function setSelection(next, options = {}) {
    selected = next;
    elements.title.textContent = next.title;
    elements.type.textContent = next.type;
    elements.detail.textContent = next.detail;
    elements.contextToggleTitle.textContent = trimLabel(next.title, 23);
    elements.openSystem.hidden = !next.systemId;
    elements.openSystem.textContent = next.kind === 'system' ? 'Open system' : 'View in system';
    elements.centerSelection.hidden = !points.has(String(next.key));
    page.querySelectorAll('.map-node.is-selected').forEach((item) => item.classList.remove('is-selected'));
    page.querySelector(`[data-map-key="${CSS.escape(String(next.key))}"]`)?.classList.add('is-selected');
    page.querySelectorAll('#starmap-route-list button').forEach((button) => button.classList.toggle('is-selected', button.dataset.stopId === String(next.key)));
    if (options.announce !== false) elements.liveStatus.textContent = `Selected ${next.title}`;
    if (options.openPanel) openContextPanel();
  }

  function selectStop(stop, index, context, options = {}) {
    if (!stop) return;
    const previous = index > 0 ? context.stops[index - 1] : null;
    const anchor = data.getLocationAnchor(stop.locationId);
    setSelection({
      kind: 'stop', key: String(stop.id), object: stop, systemId: anchor?.systemId ?? null,
      title: stop.locationLabel, type: `Stop ${index + 1} of ${context.stops.length}`,
      detail: `${operationSummary(stop)}. ${previous ? `From ${previous.locationLabel}: ${legText(estimateLeg(previous, stop, context))}.` : 'Session starting point.'}${stop.mandatory ? ' Mandatory stop.' : ''}${stop.skipped ? ' Currently skipped.' : ''}`
    }, options);
  }

  function selectSystem(system, options = {}) {
    if (!system) return;
    selectedSystemId = system.id;
    elements.systemSelect.value = system.id;
    setSelection({
      kind: 'system', key: system.id, object: system, systemId: system.id,
      title: system.name, type: system.classification,
      detail: `${system.security}. ${system.availability}. Select Open system to inspect bodies and route stops.`
    }, options);
  }

  function addAccessibleGroup(parent, attributes, activate) {
    const group = add(parent, 'g', { tabindex: 0, role: 'button', ...attributes });
    group.addEventListener('click', activate);
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); }
    });
    return group;
  }

  function routePositions(count) {
    if (count <= 1) return [{ x: 600, y: 360, row: 0 }];
    const columns = Math.min(4, count);
    const rows = Math.ceil(count / columns);
    const xGap = 900 / Math.max(1, columns - 1);
    const yStart = rows === 1 ? 360 : 175;
    const yGap = rows === 1 ? 0 : 370 / Math.max(1, rows - 1);
    return Array.from({ length: count }, (_, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const visualColumn = row % 2 === 0 ? column : columns - 1 - column;
      return { x: 150 + visualColumn * xGap, y: yStart + row * yGap, row };
    });
  }

  function routePath(from, to) {
    if (Math.abs(from.y - to.y) < 2) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
    const midpointY = (from.y + to.y) / 2;
    return `M ${from.x} ${from.y} C ${from.x} ${midpointY}, ${to.x} ${midpointY}, ${to.x} ${to.y}`;
  }

  function addRouteNode(parent, stop, index, position, context) {
    const state = stopState(stop, context);
    const key = String(stop.id);
    points.set(key, position);
    const group = addAccessibleGroup(parent, {
      class: `map-node map-route-node is-${state}${selected.key === key ? ' is-selected' : ''}`,
      'data-map-key': key,
      'aria-label': `${index + 1}. ${stop.locationLabel}. ${operationSummary(stop)}. ${state}`
    }, () => selectStop(stop, index, context, { openPanel: mobileQuery.matches }));
    add(group, 'circle', { cx: position.x, cy: position.y, r: state === 'current' ? 29 : 24, class: 'map-node-halo' });
    add(group, 'circle', { cx: position.x, cy: position.y, r: state === 'current' ? 19 : 16, class: 'map-node-core' });
    add(group, 'text', { x: position.x, y: position.y + 4, 'text-anchor': 'middle', class: 'map-node-index' }, String(index + 1).padStart(2, '0'));
    const labelY = position.row % 2 === 1 ? position.y - 73 : position.y + 38;
    const labelX = Math.min(960, Math.max(20, position.x - 110));
    add(group, 'rect', { x: labelX, y: labelY, width: 220, height: 52, rx: 4, class: 'map-label-plate' });
    add(group, 'text', { x: labelX + 10, y: labelY + 20, class: 'map-route-label' }, trimLabel(stop.locationLabel, 31));
    add(group, 'text', { x: labelX + 10, y: labelY + 39, class: 'map-node-sub' }, trimLabel(operationSummary(stop), 36));
  }

  function renderRouteMode(context) {
    elements.mode.textContent = 'Itinerary overview';
    elements.systemPicker.hidden = true;
    if (!context.stops.length) {
      add(svg, 'text', { x: 600, y: 330, 'text-anchor': 'middle', class: 'map-empty-title' }, 'NO ACTIVE ROUTE');
      add(svg, 'text', { x: 600, y: 370, 'text-anchor': 'middle', class: 'map-empty-copy' }, 'Generate a hauling session in Missions to display the itinerary.');
      elements.route.textContent = 'No mapped route';
      setSelection({ kind: 'route', key: 'route', object: null, systemId: null, title: 'Route overview', type: 'Itinerary', detail: 'Generate a session to display route stops.' }, { announce: false });
      return;
    }

    const positions = routePositions(context.stops.length);
    const links = add(svg, 'g', { class: 'map-route-links' });
    for (let index = 1; index < positions.length; index += 1) {
      add(links, 'path', {
        d: routePath(positions[index - 1], positions[index]),
        class: `map-link map-link--route is-${stopState(context.stops[index], context)}`,
        'marker-end': 'url(#map-arrow)'
      });
    }
    const nodes = add(svg, 'g', { class: 'map-route-nodes' });
    context.stops.forEach((stop, index) => addRouteNode(nodes, stop, index, positions[index], context));

    const summary = routeSummary(context);
    const completed = context.progress?.completedStopIds.length ?? 0;
    elements.route.textContent = summary
      ? `${completed}/${context.stops.length} complete · ${summary.jumpCount ?? 0} jump${summary.jumpCount === 1 ? '' : 's'} · ${summary.minMinutes}–${summary.maxMinutes} min · ${summary.distanceLabel}`
      : `${completed}/${context.stops.length} stops complete`;

    if (selected.kind === 'route') {
      const systems = new Set(context.stops.map((stop) => data.getLocationAnchor(stop.locationId)?.systemId).filter(Boolean));
      setSelection({
        kind: 'route', key: 'route', object: context.route, systemId: null,
        title: 'Route overview', type: 'Itinerary',
        detail: summary ? `${context.stops.length} stops across ${systems.size} systems. Estimated navigation ${summary.minMinutes}–${summary.maxMinutes} minutes with ${summary.jumpCount ?? 0} jumps. Select a stop for cargo and leg details.` : `${context.stops.length} stops. Select a stop for details.`
      }, { announce: false });
    }
  }

  function projectedBodyPoints(system) {
    const maximum = Math.max(...system.bodies.map((body) => Number(body.radius ?? 0)), 1);
    const scale = 270 / maximum;
    return new Map(system.bodies.map((body) => {
      if (!body.radius) return [body.id, [600, 360]];
      const angle = Number(body.angle ?? 0) * Math.PI / 180;
      return [body.id, [600 + Math.cos(angle) * body.radius * scale, 360 + Math.sin(angle) * body.radius * scale]];
    }));
  }

  function renderLocalMode(context) {
    selectedSystemId = defaultSystemId(context);
    const system = data.getSystem(selectedSystemId) ?? data.getSystem('stanton');
    selectedSystemId = system.id;
    elements.systemSelect.value = system.id;
    elements.systemPicker.hidden = false;
    elements.mode.textContent = `${system.name} system`;

    const bodyPoints = projectedBodyPoints(system);
    const orbitBodies = system.bodies.filter((body) => body.radius);
    const maximum = Math.max(...orbitBodies.map((body) => Number(body.radius ?? 1)), 1);
    orbitBodies.forEach((body) => add(svg, 'circle', { cx: 600, cy: 360, r: Number(body.radius) / maximum * 270, class: 'map-orbit' }));

    const bodies = add(svg, 'g', { class: 'map-system-bodies' });
    system.bodies.forEach((body) => {
      const [x, y] = bodyPoints.get(body.id);
      points.set(body.id, { x, y });
      const group = addAccessibleGroup(bodies, {
        class: `map-node map-body-node${selected.key === body.id ? ' is-selected' : ''}`,
        'data-map-key': body.id,
        'aria-label': `${body.name}, ${formatType(body.type)}`
      }, () => setSelection({
        kind: 'body', key: body.id, object: body, systemId: system.id,
        title: body.name, type: formatType(body.type),
        detail: `${system.name} system. Orbital placement is schematic and used only for navigation context.`
      }, { openPanel: mobileQuery.matches }));
      const radius = body.type.includes('star') ? 24 : Math.max(9, Number(body.size ?? 5) + 7);
      add(group, 'circle', { cx: x, cy: y, r: radius, class: 'map-node-core' });
      const left = x > 860;
      add(group, 'text', { x: left ? x - radius - 12 : x + radius + 12, y: y + 4, 'text-anchor': left ? 'end' : 'start', class: 'map-body-label' }, body.name);
    });

    const mapped = context.stops.filter((stop) => data.getLocationAnchor(stop.locationId)?.systemId === system.id);
    const offsets = new Map();
    const stops = add(svg, 'g', { class: 'map-system-stops' });
    mapped.forEach((stop) => {
      const routeIndex = context.stops.indexOf(stop);
      const anchor = data.getLocationAnchor(stop.locationId);
      const [baseX, baseY] = bodyPoints.get(anchor.bodyId) ?? [600, 360];
      const offset = offsets.get(anchor.bodyId) ?? 0;
      offsets.set(anchor.bodyId, offset + 1);
      const angle = -Math.PI / 3 + offset * 1.25;
      const x = baseX + Math.cos(angle) * 58;
      const y = baseY + Math.sin(angle) * 58;
      const key = String(stop.id);
      points.set(key, { x, y });
      const state = stopState(stop, context);
      const group = addAccessibleGroup(stops, {
        class: `map-node map-system-stop is-${state}${selected.key === key ? ' is-selected' : ''}`,
        'data-map-key': key,
        'aria-label': `${stop.locationLabel}. Route stop ${routeIndex + 1}. ${state}`
      }, () => selectStop(stop, routeIndex, context, { openPanel: mobileQuery.matches }));
      add(group, 'line', { x1: baseX, y1: baseY, x2: x, y2: y, class: 'map-anchor-link' });
      add(group, 'circle', { cx: x, cy: y, r: state === 'current' ? 18 : 14, class: 'map-node-core' });
      add(group, 'text', { x, y: y + 4, 'text-anchor': 'middle', class: 'map-node-index' }, String(routeIndex + 1).padStart(2, '0'));
      const left = x > 850;
      const labelX = left ? x - 24 : x + 24;
      add(group, 'text', { x: labelX, y: y - 3, 'text-anchor': left ? 'end' : 'start', class: 'map-route-label' }, trimLabel(stop.locationLabel, 29));
      add(group, 'text', { x: labelX, y: y + 15, 'text-anchor': left ? 'end' : 'start', class: 'map-node-sub' }, trimLabel(operationSummary(stop), 31));
    });

    elements.route.textContent = `${mapped.length} route stop${mapped.length === 1 ? '' : 's'} in ${system.name} · ${system.security}`;
    if (selected.kind === 'route' || (selected.systemId && selected.systemId !== system.id)) selectSystem(system, { announce: false });
  }

  function renderNetworkMode(context) {
    elements.systemPicker.hidden = true;
    elements.mode.textContent = 'System network';
    const networkPoints = { stanton: { x: 225, y: 455 }, pyro: { x: 600, y: 220 }, nyx: { x: 975, y: 455 } };
    const routeSystems = activeStops(context).map((stop) => data.getLocationAnchor(stop.locationId)?.systemId).filter(Boolean);
    const activeSystems = new Set(routeSystems);

    const links = add(svg, 'g', { class: 'map-network-links' });
    data.connections.forEach((connection) => {
      const from = networkPoints[connection.from];
      const to = networkPoints[connection.to];
      const onRoute = routeSystems.some((systemId, index) => index > 0 && ((routeSystems[index - 1] === connection.from && systemId === connection.to) || (routeSystems[index - 1] === connection.to && systemId === connection.from)));
      const placeholder = connection.status.includes('placeholder');
      add(links, 'path', {
        d: `M ${from.x} ${from.y} L ${to.x} ${to.y}`,
        class: `map-link map-network-link${placeholder ? ' is-placeholder' : ''}${onRoute ? ' is-route' : ''}`,
        'marker-end': onRoute ? 'url(#map-arrow)' : ''
      });
      add(links, 'text', { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - 12, 'text-anchor': 'middle', class: 'map-network-label' }, placeholder ? 'TEMPORARY LINK' : 'JUMP LINK');
    });

    const systems = add(svg, 'g', { class: 'map-network-systems' });
    data.systems.forEach((system) => {
      const point = networkPoints[system.id];
      const onRoute = activeSystems.has(system.id);
      points.set(system.id, point);
      const group = addAccessibleGroup(systems, {
        class: `map-node map-system-node${onRoute ? ' is-route-system' : ''}${selected.key === system.id ? ' is-selected' : ''}`,
        'data-map-key': system.id,
        'aria-label': `${system.name}. ${system.classification}. ${onRoute ? 'Contains active route stops.' : 'No active route stops.'}`
      }, () => selectSystem(system, { openPanel: mobileQuery.matches }));
      add(group, 'circle', { cx: point.x, cy: point.y, r: onRoute ? 38 : 31, class: 'map-node-halo' });
      add(group, 'circle', { cx: point.x, cy: point.y, r: onRoute ? 25 : 20, class: 'map-node-core' });
      add(group, 'rect', { x: point.x - 92, y: point.y + 52, width: 184, height: 62, rx: 4, class: 'map-label-plate' });
      add(group, 'text', { x: point.x, y: point.y + 76, 'text-anchor': 'middle', class: 'map-system-label' }, system.name.toUpperCase());
      add(group, 'text', { x: point.x, y: point.y + 97, 'text-anchor': 'middle', class: 'map-node-sub' }, onRoute ? `${routeSystems.filter((id) => id === system.id).length} route stops` : system.availability);
    });

    const summary = routeSummary(context);
    elements.route.textContent = activeSystems.size ? `${activeSystems.size} systems on route · ${summary?.jumpCount ?? 0} jumps · ${summary?.distanceLabel ?? 'distance unavailable'}` : 'No systems on an active route';
    if (selected.kind === 'route') {
      const snapshot = official()?.snapshot;
      setSelection({
        kind: 'network', key: 'network', object: null, systemId: null,
        title: 'System network', type: 'Navigation layer',
        detail: `Stanton, Pyro and Nyx jump topology.${snapshot ? ` Official web snapshot ${snapshot.gameVersion}, verified ${snapshot.verifiedAt}.` : ''} Select a system to inspect it.`
      }, { announce: false });
    }
  }

  function updateHud(context) {
    const active = activeStops(context);
    const current = context.progress?.currentStop ?? active.find((stop) => !context.progress?.completedSet.has(String(stop.id))) ?? active[0] ?? null;
    const index = current ? active.indexOf(current) : -1;
    const next = index >= 0 ? active.slice(index + 1).find((stop) => !context.progress?.completedSet.has(String(stop.id))) ?? null : null;
    const final = active.at(-1) ?? null;
    hudStops = { current, next, final };
    const setHud = (stop, title, meta, fallback) => {
      title.textContent = stop?.locationLabel ?? fallback;
      meta.textContent = stop ? operationSummary(stop) : '—';
      title.closest('button').disabled = !stop;
    };
    setHud(current, elements.hudCurrent, elements.hudCurrentMeta, 'No active route');
    setHud(next, elements.hudNext, elements.hudNextMeta, 'Route ends here');
    setHud(final, elements.hudFinal, elements.hudFinalMeta, '—');
  }

  function renderRouteList(context) {
    elements.routeList.replaceChildren();
    elements.routeCount.textContent = `${context.stops.length} stop${context.stops.length === 1 ? '' : 's'}`;
    if (!context.stops.length) {
      const empty = document.createElement('li');
      empty.className = 'starmap-route-empty';
      empty.textContent = 'No active route';
      elements.routeList.append(empty);
      return;
    }
    context.stops.forEach((stop, index) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      const state = stopState(stop, context);
      button.type = 'button';
      button.dataset.stopId = String(stop.id);
      button.className = `is-${state}${selected.key === String(stop.id) ? ' is-selected' : ''}`;
      if (state === 'current') button.setAttribute('aria-current', 'step');
      const previous = index ? context.stops[index - 1] : null;
      const number = document.createElement('span');
      number.textContent = String(index + 1).padStart(2, '0');
      const copy = document.createElement('strong');
      const name = document.createElement('b');
      name.textContent = stop.locationLabel;
      const operation = document.createElement('small');
      operation.textContent = operationSummary(stop);
      const leg = document.createElement('small');
      leg.className = 'map-leg-estimate';
      leg.textContent = previous ? legText(estimateLeg(previous, stop, context)) : 'Session starting point';
      copy.append(name, operation, leg);
      button.append(number, copy);
      button.addEventListener('click', () => selectStop(stop, index, context));
      item.append(button);
      elements.routeList.append(item);
    });
  }

  function syncButtons() {
    elements.buttons.forEach((button) => {
      const active = button.dataset.mapMode === mode;
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
  }

  function render() {
    const context = routeContext();
    clearMap();
    if (mode === 'local') renderLocalMode(context);
    else if (mode === 'network') renderNetworkMode(context);
    else renderRouteMode(context);
    renderRouteList(context);
    updateHud(context);
    syncButtons();
    applyCamera();
    const snapshot = official()?.snapshot;
    if (snapshot) elements.note.textContent = `Official RSI universe snapshot: ${snapshot.gameVersion}, verified ${snapshot.verifiedAt}. Positions and travel times are project-derived estimates; jump tunnels are counted separately.`;
    requestAnimationFrame(() => {
      page.querySelector(`[data-map-key="${CSS.escape(String(selected.key))}"]`)?.classList.add('is-selected');
      elements.centerSelection.hidden = !points.has(String(selected.key));
    });
  }

  function switchMode(nextMode) {
    mode = nextMode === 'stanton' ? 'local' : nextMode;
    resetCamera();
    render();
    elements.buttons.find((button) => button.dataset.mapMode === mode)?.focus({ preventScroll: true });
    elements.liveStatus.textContent = `${elements.mode.textContent} view`;
  }

  elements.buttons.forEach((button, index) => {
    button.addEventListener('click', () => switchMode(button.dataset.mapMode));
    button.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const offset = event.key === 'ArrowRight' ? 1 : -1;
      switchMode(elements.buttons[(index + offset + elements.buttons.length) % elements.buttons.length].dataset.mapMode);
    });
  });

  elements.systemSelect.addEventListener('change', () => {
    const system = data.getSystem(elements.systemSelect.value);
    if (!system) return;
    selectedSystemId = system.id;
    selected = { kind: 'system', key: system.id, object: system, systemId: system.id, title: system.name, type: system.classification, detail: `${system.security}. ${system.availability}.` };
    resetCamera();
    render();
  });

  page.querySelectorAll('[data-map-action]').forEach((button) => button.addEventListener('click', () => {
    const action = button.dataset.mapAction;
    if (action === 'zoom-in') zoomAt(0.78);
    if (action === 'zoom-out') zoomAt(1.28);
    if (action === 'fit') resetCamera();
    if (action === 'current') {
      const context = routeContext();
      const current = context.progress?.currentStop ?? activeStops(context)[0] ?? null;
      if (!current) return;
      if (!points.has(String(current.id)) && mode !== 'route') switchMode('route');
      selectStop(current, context.stops.indexOf(current), context, { announce: false });
      centerOnKey(current.id);
    }
  }));

  page.querySelectorAll('[data-hud-stop]').forEach((button) => button.addEventListener('click', () => {
    const context = routeContext();
    const stop = hudStops[button.dataset.hudStop];
    if (!stop) return;
    selectStop(stop, context.stops.indexOf(stop), context, { openPanel: mobileQuery.matches });
    if (points.has(String(stop.id))) centerOnKey(stop.id, false);
  }));

  elements.openSystem.addEventListener('click', () => {
    if (!selected.systemId) return;
    selectedSystemId = selected.systemId;
    mode = 'local';
    resetCamera();
    render();
    if (mobileQuery.matches) openContextPanel();
  });
  elements.centerSelection.addEventListener('click', () => centerOnKey(selected.key));
  elements.contextToggle.addEventListener('click', () => page.classList.contains('is-context-open') ? closeContextPanel() : openContextPanel());
  elements.contextClose.addEventListener('click', closeContextPanel);
  elements.contextBackdrop.addEventListener('click', closeContextPanel);

  svg.addEventListener('wheel', (event) => {
    event.preventDefault();
    const point = svgPoint(event.clientX, event.clientY);
    zoomAt(event.deltaY < 0 ? 0.86 : 1.16, point.x, point.y);
  }, { passive: false });

  svg.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('.map-node')) return;
    drag = { pointerId: event.pointerId, point: svgPoint(event.clientX, event.clientY), camera: { ...camera } };
    svg.setPointerCapture(event.pointerId);
    svg.classList.add('is-dragging');
  });

  svg.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = svgPoint(event.clientX, event.clientY);
    camera.x = drag.camera.x - (point.x - drag.point.x);
    camera.y = drag.camera.y - (point.y - drag.point.y);
    applyCamera();
  });

  function endDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    svg.classList.remove('is-dragging');
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  svg.addEventListener('keydown', (event) => {
    const step = camera.width * 0.08;
    if (event.key === 'ArrowLeft') { event.preventDefault(); panBy(-step, 0); }
    if (event.key === 'ArrowRight') { event.preventDefault(); panBy(step, 0); }
    if (event.key === 'ArrowUp') { event.preventDefault(); panBy(0, -step); }
    if (event.key === 'ArrowDown') { event.preventDefault(); panBy(0, step); }
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomAt(0.78); }
    if (event.key === '-') { event.preventDefault(); zoomAt(1.28); }
    if (event.key === 'Home') { event.preventDefault(); resetCamera(); }
    if (event.key === 'Escape') closeContextPanel();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && page.classList.contains('is-context-open')) closeContextPanel();
  });
  window.addEventListener('sc:session-change', render);
  window.addEventListener('sc:route-runtime-ready', render);
  window.addEventListener('sc:navigation-runtime-ready', render);
  window.matchMedia('(min-width: 901px)').addEventListener?.('change', (event) => { if (event.matches) closeContextPanel(); });

  resetCamera();
  render();
}());
