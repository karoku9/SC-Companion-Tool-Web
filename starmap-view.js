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

  function operationSummary(stop) {
    const pickup = stop.operations.filter((operation) => operation.type !== 'delivery' && operation.lotId).reduce((sum, operation) => sum + Number(operation.scu ?? 0), 0);
    const drop = stop.operations.filter((operation) => operation.type === 'delivery' && operation.lotId).reduce((sum, operation) => sum + Number(operation.scu ?? 0), 0);
    return [drop ? `Drop ${drop} SCU` : '', pickup ? `Pick up ${pickup} SCU` : ''].filter(Boolean).join(' · ') || `${stop.operations.length} objective${stop.operations.length === 1 ? '' : 's'}`;
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
    add(group, 'text', { x: labelX, y: y - 4, 'text-anchor': textAnchor }, label);
    add(group, 'text', { x: labelX, y: y + 14, 'text-anchor': textAnchor, class: 'map-node-sub' }, operationSummary(stop));
    group.addEventListener('click', () => setSelection(stop.locationLabel, `Route stop ${index + 1}`, `${operationSummary(stop)}${stop.mandatory ? ' · Mandatory' : ''}${stop.skipped ? ' · Skipped' : ''}`, String(stop.id)));
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
    elements.route.textContent = `${activeCount} active stop${activeCount === 1 ? '' : 's'} · ${context.progress?.completedStopIds.length ?? 0} complete`;
    if (selectedKey === 'route') setSelection('Active route', 'Route', `${activeCount} active stops. Click a node or route-list entry for details.`, 'route');
  }

  function bodyPoint(bodyId) {
    const points = {
      'stanton-star': [500, 300], hurston: [235, 215], crusader: [365, 455], arccorp: [705, 220], microtech: [795, 455]
    };
    return points[bodyId] ?? [500, 300];
  }

  function renderStantonMode(context) {
    elements.mode.textContent = 'Stanton system';
    const system = data.getSystem('stanton');
    [95, 170, 245, 320].forEach((radius) => add(svg, 'circle', { cx: 500, cy: 300, r: radius, class: 'map-orbit' }));
    system.bodies.forEach((body) => {
      const [x, y] = bodyPoint(body.id);
      const group = add(svg, 'g', { class: 'map-node', tabindex: 0, role: 'button' });
      add(group, 'circle', { cx: x, cy: y, r: body.type.includes('star') ? 20 : 13 });
      add(group, 'text', { x: x + 22, y: y + 4 }, body.name);
      group.addEventListener('click', () => setSelection(body.name, body.type.replace(/-/g, ' '), `${system.name} · ${system.security}`, body.id));
    });

    const mapped = context.stops.filter((stop) => data.getLocationAnchor(stop.locationId)?.systemId === 'stanton');
    mapped.forEach((stop, index) => {
      const anchor = data.getLocationAnchor(stop.locationId);
      const [baseX, baseY] = bodyPoint(anchor.bodyId);
      const angle = index * 1.9;
      const x = baseX + Math.cos(angle) * 38;
      const y = baseY + Math.sin(angle) * 38;
      addRouteNode(svg, stop, context.stops.indexOf(stop), x, y, context);
    });
    elements.route.textContent = `${mapped.length} mapped route stop${mapped.length === 1 ? '' : 's'} in Stanton`;
    if (selectedKey === 'route') setSelection('Stanton', system.classification, system.security, 'stanton');
  }

  function renderNetworkMode(context) {
    elements.mode.textContent = 'System network';
    const points = { stanton: [230, 350], pyro: [505, 190], nyx: [775, 360] };
    data.connections.forEach((connection) => {
      const from = points[connection.from];
      const to = points[connection.to];
      add(svg, 'path', { d: `M ${from[0]} ${from[1]} L ${to[0]} ${to[1]}`, class: `map-link${connection.status === 'placeholder' ? ' is-placeholder' : ''}` });
    });
    const activeSystems = new Set(context.stops.map((stop) => data.getLocationAnchor(stop.locationId)?.systemId).filter(Boolean));
    data.systems.forEach((system) => {
      const [x, y] = points[system.id];
      const group = add(svg, 'g', { class: `map-node${activeSystems.has(system.id) ? ' is-current' : ''}`, tabindex: 0, role: 'button' });
      add(group, 'circle', { cx: x, cy: y, r: activeSystems.has(system.id) ? 25 : 19 });
      add(group, 'text', { x: x + 33, y: y - 3 }, system.name.toUpperCase());
      add(group, 'text', { x: x + 33, y: y + 14, class: 'map-node-sub' }, system.availability);
      group.addEventListener('click', () => setSelection(system.name, system.classification, `${system.security} · ${system.availability}`, system.id));
    });
    elements.route.textContent = activeSystems.size ? `Active route crosses ${activeSystems.size} mapped system${activeSystems.size === 1 ? '' : 's'}` : 'No mapped active route';
    if (selectedKey === 'route') setSelection('System network', 'Navigation', 'Stanton, Pyro and Nyx schematic jump links.', 'network');
  }

  function renderRouteList(context) {
    elements.routeList.replaceChildren();
    if (!context.stops.length) return;
    context.stops.forEach((stop, index) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      if (context.progress?.currentStop?.id === stop.id) button.setAttribute('aria-current', 'step');
      button.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><strong>${stop.locationLabel}<br><small>${operationSummary(stop)}</small></strong>`;
      button.addEventListener('click', () => {
        setSelection(stop.locationLabel, `Route stop ${index + 1}`, operationSummary(stop), String(stop.id));
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
    if (mode === 'stanton') renderStantonMode(context);
    else if (mode === 'network') renderNetworkMode(context);
    else renderRouteMode(context);
    renderRouteList(context);
  }

  elements.buttons.forEach((button) => button.addEventListener('click', () => {
    mode = button.dataset.mapMode;
    selectedKey = 'route';
    syncButtons();
    render();
  }));
  window.addEventListener('sc:session-change', render);
  window.addEventListener('sc:route-runtime-ready', render);
  syncButtons();
  render();
}());
