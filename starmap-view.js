'use strict';

(function initializeStarmap() {
  const data = window.SCCompanionStarmapData;
  const session = window.SCCompanionSession;
  const svg = document.querySelector('#starmap-canvas');
  if (!data || !session || !svg) return;

  const NS = 'http://www.w3.org/2000/svg';
  const elements = {
    mode: document.querySelector('#starmap-mode'),
    title: document.querySelector('#starmap-selection-title'),
    type: document.querySelector('#starmap-selection-type'),
    detail: document.querySelector('#starmap-selection-detail'),
    route: document.querySelector('#starmap-route-status'),
    routeList: document.querySelector('#starmap-route-list'),
    note: document.querySelector('#starmap-data-note'),
    buttons: [...document.querySelectorAll('[data-map-mode]')]
  };

  let mode = 'route';
  let selectedKey = 'route';
  let selectedSystemId = 'stanton';

  function navigation() {
    return window.SCCompanionNavigationEstimates ?? null;
  }

  function official() {
    return window.SCCompanionOfficialUniverseData ?? null;
  }

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

  function clear() {
    svg.replaceChildren();
    const defs = add(svg, 'defs');
    const pattern = add(defs, 'pattern', { id: 'map-grid', width: 40, height: 40, patternUnits: 'userSpaceOnUse' });
    add(pattern, 'path', { d: 'M 40 0 L 0 0 0 40', class: 'map-grid-line', fill: 'none' });
    add(svg, 'rect', { x: 0, y: 0, width: 1000, height: 600, fill: 'url(#map-grid)' });
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

  function estimateLeg(previousStop, stop, context) {
    if (!previousStop) return null;
    return navigation()?.estimateLeg(previousStop.locationId, stop.locationId, {
      quantumTimeFactor: activeQuantumFactor(context)
    }) ?? null;
  }

  function operationSummary(stop) {
    const pickup = stop.operations.filter((operation) => operation.type !== 'delivery' && operation.lotId).reduce((sum, operation) => sum + Number(operation.scu ?? 0), 0);
    const drop = stop.operations.filter((operation) => operation.type === 'delivery' && operation.lotId).reduce((sum, operation) => sum + Number(operation.scu ?? 0), 0);
    return [drop ? `Drop off ${drop} SCU` : '', pickup ? `Pick up ${pickup} SCU` : ''].filter(Boolean).join(' · ') || `${stop.operations.length} objective${stop.operations.length === 1 ? '' : 's'}`;
  }

  function legText(estimate) {
    if (!estimate) return 'Navigation estimate unavailable';
    const jumps = estimate.jumpCount ? ` · ${estimate.jumpCount} jump${estimate.jumpCount === 1 ? '' : 's'}` : '';
    return `${estimate.distanceLabel} · ${estimate.minMinutes}–${estimate.maxMinutes} min${jumps}`;
  }

  function setSelection(title, type, detail, key = '') {
    selectedKey = key || title;
    elements.title.textContent = title;
    elements.type.textContent = type;
    elements.detail.textContent = detail;
  }

  function stopState(stop, context) {
    if (stop.skipped) return 'skipped';
    if (context.progress?.completedSet.has(String(stop.id))) return 'complete';
    if (context.progress?.currentStop?.id === stop.id) return 'current';
    return 'future';
  }

  function addRouteNode(parent, stop, index, x, y, context) {
    const state = stopState(stop, context);
    const group = add(parent, 'g', { class: `map-node map-route-node is-${state}`, tabindex: 0, role: 'button', 'aria-label': `${index + 1}. ${stop.locationLabel}. ${operationSummary(stop)}` });
    add(group, 'circle', { cx: x, cy: y, r: state === 'current' ? 24 : 20 });
    add(group, 'text', { x, y: y + 4, 'text-anchor': 'middle', class: 'map-node-index' }, String(index + 1).padStart(2, '0'));
    const label = stop.locationLabel.length > 34 ? `${stop.locationLabel.slice(0, 32)}…` : stop.locationLabel;
    const labelOnLeft = x > 740;
    const labelX = labelOnLeft ? x - 32 : x + 32;
    const textAnchor = labelOnLeft ? 'end' : 'start';
    const labelY = index % 2 === 0 ? y - 24 : y + 34;
    add(group, 'text', { x: labelX, y: labelY, 'text-anchor': textAnchor, class: 'map-route-label' }, label);
    add(group, 'text', { x: labelX, y: labelY + 18, 'text-anchor': textAnchor, class: 'map-node-sub map-route-summary' }, operationSummary(stop));
    const previousStop = index ? context.stops[index - 1] : null;
    group.addEventListener('click', () => {
      const estimate = estimateLeg(previousStop, stop, context);
      setSelection(stop.locationLabel, `Route stop ${index + 1}`, `${operationSummary(stop)}. ${previousStop ? `From ${previousStop.locationLabel}: ${legText(estimate)}.` : 'Session starting stop.'}${stop.mandatory ? ' Mandatory.' : ''}${stop.skipped ? ' Skipped.' : ''}`, String(stop.id));
    });
    group.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); group.click(); } });
    return { x, y };
  }

  function routePositions(count) {
    if (count <= 4) {
      const gap = 780 / Math.max(1, count - 1);
      return Array.from({ length: count }, (_, index) => ({ x: 100 + index * gap, y: 300 }));
    }
    const columns = 4;
    const rows = Math.ceil(count / columns);
    const positions = [];
    for (let index = 0; index < count; index += 1) {
      const row = Math.floor(index / columns);
      const columnInRow = index % columns;
      const direction = row % 2 === 0 ? columnInRow : columns - 1 - columnInRow;
      positions.push({ x: 120 + direction * 245, y: 145 + row * (310 / Math.max(1, rows - 1)) });
    }
    return positions;
  }

  function routeSummary(context) {
    if (!context.stops.length || !navigation()) return null;
    return navigation().summarizeRoute(context.stops, { quantumTimeFactor: activeQuantumFactor(context) });
  }

  function renderRouteMode(context) {
    elements.mode.textContent = 'Active route';
    if (!context.route?.stops?.length) {
      add(svg, 'text', { x: 500, y: 285, 'text-anchor': 'middle', fill: 'currentColor' }, 'NO ACTIVE ROUTE');
      add(svg, 'text', { x: 500, y: 315, 'text-anchor': 'middle', class: 'map-node-sub' }, 'Generate a hauling session to display stop order.');
      elements.route.textContent = 'No active route';
      setSelection('Active route', 'Route', 'Generate a session to display route stops.', 'route');
      return;
    }
    const positions = routePositions(context.stops.length);
    for (let index = 1; index < positions.length; index += 1) {
      add(svg, 'path', { d: `M ${positions[index - 1].x} ${positions[index - 1].y} L ${positions[index].x} ${positions[index].y}`, class: 'map-link map-link--active' });
    }
    context.stops.forEach((stop, index) => addRouteNode(svg, stop, index, positions[index].x, positions[index].y, context));
    const activeCount = context.route.stops.length;
    const summary = routeSummary(context);
    elements.route.textContent = summary
      ? `${activeCount} stops · ${summary.distanceLabel} · ${summary.minMinutes}–${summary.maxMinutes} min navigation`
      : `${activeCount} active stops · ${context.progress?.completedStopIds.length ?? 0} complete`;
    if (selectedKey === 'route') {
      setSelection('Active route', 'Route', summary
        ? `${activeCount} active stops. Estimated normal-space distance ${summary.distanceLabel}; navigation ${summary.minMinutes}–${summary.maxMinutes} minutes. Arrival and cargo handling are shown in Planner.`
        : `${activeCount} active stops. Click a node or route-list entry for details.`, 'route');
    }
  }

  function projectedBodyPoints(system) {
    const maxRadius = Math.max(...system.bodies.map((body) => Number(body.radius ?? 0)), 1);
    const scale = 235 / maxRadius;
    return new Map(system.bodies.map((body) => {
      if (!body.radius) return [body.id, [500, 300]];
      const angle = Number(body.angle ?? 0) * Math.PI / 180;
      return [body.id, [500 + Math.cos(angle) * body.radius * scale, 300 + Math.sin(angle) * body.radius * scale]];
    }));
  }

  function currentSystemId(context) {
    const current = context.progress?.currentStop ?? context.stops.find((stop) => !stop.skipped) ?? null;
    return data.getLocationAnchor(current?.locationId)?.systemId ?? selectedSystemId;
  }

  function renderLocalMode(context) {
    selectedSystemId = currentSystemId(context);
    const system = data.getSystem(selectedSystemId) ?? data.getSystem('stanton');
    elements.mode.textContent = `${system.name} system`;
    const points = projectedBodyPoints(system);
    const maxOrbit = 235;
    const orbitBodies = system.bodies.filter((body) => body.radius);
    orbitBodies.forEach((body) => {
      const radius = Number(body.radius ?? 0) / Math.max(...orbitBodies.map((item) => Number(item.radius ?? 1))) * maxOrbit;
      add(svg, 'circle', { cx: 500, cy: 300, r: radius, class: 'map-orbit' });
    });
    system.bodies.forEach((body) => {
      const [x, y] = points.get(body.id);
      const group = add(svg, 'g', { class: 'map-node', tabindex: 0, role: 'button' });
      add(group, 'circle', { cx: x, cy: y, r: body.type.includes('star') ? 20 : 13 });
      const labelOnLeft = x > 760;
      add(group, 'text', { x: labelOnLeft ? x - 22 : x + 22, y: y + 4, 'text-anchor': labelOnLeft ? 'end' : 'start' }, body.name);
      group.addEventListener('click', () => setSelection(body.name, body.type.replace(/-/g, ' '), `${system.name} · ${system.security}`, body.id));
    });

    const mapped = context.stops.filter((stop) => data.getLocationAnchor(stop.locationId)?.systemId === system.id);
    mapped.forEach((stop, index) => {
      const anchor = data.getLocationAnchor(stop.locationId);
      const [baseX, baseY] = points.get(anchor.bodyId) ?? [500, 300];
      const angle = index * 1.9;
      const x = baseX + Math.cos(angle) * 38;
      const y = baseY + Math.sin(angle) * 38;
      addRouteNode(svg, stop, context.stops.indexOf(stop), x, y, context);
    });
    elements.route.textContent = `${mapped.length} route stop${mapped.length === 1 ? '' : 's'} in ${system.name}`;
    if (selectedKey === 'route') setSelection(system.name, system.classification, `${system.security}. ${mapped.length} active route stops mapped here.`, system.id);
  }

  function renderNetworkMode(context) {
    elements.mode.textContent = 'System network';
    const points = { stanton: [230, 350], pyro: [505, 190], nyx: [775, 360] };
    data.connections.forEach((connection) => {
      const from = points[connection.from];
      const to = points[connection.to];
      const placeholder = connection.status === 'active-placeholder' || connection.status === 'placeholder';
      add(svg, 'path', { d: `M ${from[0]} ${from[1]} L ${to[0]} ${to[1]}`, class: `map-link${placeholder ? ' is-placeholder' : ''}` });
      const midpointX = (from[0] + to[0]) / 2;
      const midpointY = (from[1] + to[1]) / 2;
      add(svg, 'text', { x: midpointX, y: midpointY - 8, 'text-anchor': 'middle', class: 'map-node-sub' }, placeholder ? 'ACTIVE PLACEHOLDER' : 'ACTIVE JUMP');
    });
    const activeSystems = new Set(context.stops.map((stop) => data.getLocationAnchor(stop.locationId)?.systemId).filter(Boolean));
    data.systems.forEach((system) => {
      const [x, y] = points[system.id];
      const group = add(svg, 'g', { class: `map-node${activeSystems.has(system.id) ? ' is-current' : ''}`, tabindex: 0, role: 'button' });
      add(group, 'circle', { cx: x, cy: y, r: activeSystems.has(system.id) ? 25 : 19 });
      add(group, 'text', { x: x + 33, y: y - 3 }, system.name.toUpperCase());
      add(group, 'text', { x: x + 33, y: y + 16, class: 'map-node-sub' }, system.availability);
      group.addEventListener('click', () => {
        selectedSystemId = system.id;
        setSelection(system.name, system.classification, `${system.security} · ${system.availability}. Select Local system to inspect its route stops.`, system.id);
      });
    });
    const summary = routeSummary(context);
    elements.route.textContent = activeSystems.size
      ? `${activeSystems.size} systems · ${summary?.jumpCount ?? 0} route jumps · ${summary?.distanceLabel ?? 'distance unavailable'}`
      : 'No mapped active route';
    if (selectedKey === 'route') {
      const snapshot = official()?.snapshot;
      setSelection('System network', 'Navigation', `Stanton, Pyro and Nyx jump topology. ${snapshot ? `Official web snapshot ${snapshot.gameVersion}, verified ${snapshot.verifiedAt}.` : ''}`, 'network');
    }
  }

  function renderRouteList(context) {
    elements.routeList.replaceChildren();
    if (!context.stops.length) return;
    context.stops.forEach((stop, index) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      if (context.progress?.currentStop?.id === stop.id) button.setAttribute('aria-current', 'step');
      const estimate = estimateLeg(index ? context.stops[index - 1] : null, stop, context);
      const navigationText = index ? legText(estimate) : 'Session starting stop';
      button.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><strong>${stop.locationLabel}<small>${operationSummary(stop)}</small><small class="map-leg-estimate">${navigationText}</small></strong>`;
      button.addEventListener('click', () => {
        const anchor = data.getLocationAnchor(stop.locationId);
        selectedSystemId = anchor?.systemId ?? selectedSystemId;
        setSelection(stop.locationLabel, `Route stop ${index + 1}`, `${operationSummary(stop)}. ${navigationText}.`, String(stop.id));
        if (mode !== 'route') {
          mode = 'route';
          syncButtons();
          render();
        }
      });
      item.append(button);
      elements.routeList.append(item);
    });
  }

  function syncButtons() {
    elements.buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mapMode === mode)));
  }

  function render() {
    const context = routeContext();
    clear();
    if (mode === 'local' || mode === 'stanton') renderLocalMode(context);
    else if (mode === 'network') renderNetworkMode(context);
    else renderRouteMode(context);
    renderRouteList(context);
    const snapshot = official()?.snapshot;
    if (elements.note && snapshot) elements.note.textContent = `Official RSI universe snapshot: ${snapshot.gameVersion}, verified ${snapshot.verifiedAt}. Distances and times are project-derived estimates; jump tunnels are counted separately.`;
  }

  elements.buttons.forEach((button) => button.addEventListener('click', () => {
    mode = button.dataset.mapMode === 'stanton' ? 'local' : button.dataset.mapMode;
    selectedKey = 'route';
    syncButtons();
    render();
  }));
  window.addEventListener('sc:session-change', render);
  window.addEventListener('sc:route-runtime-ready', render);
  window.addEventListener('sc:navigation-runtime-ready', render);
  syncButtons();
  render();
}());
