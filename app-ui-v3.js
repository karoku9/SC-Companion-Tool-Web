'use strict';

(() => {
  const previousActiveRenderer = window.renderActiveNavMap;

  function systemNodeFor(name) {
    const location = findLocation(name);
    const parent = location ? (['Hurston', 'Crusader', 'ArcCorp', 'microTech', 'Stanton'].includes(location.parent)
      ? location.parent
      : locations.find(item => item.name === location.parent)?.parent || location.parent) : '';
    return maps.system.find(node => norm(node.name) === norm(name) || node.name === parent) || null;
  }

  function currentLeg() {
    const route = state.route?.length ? state.route : buildRoute();
    if (route.length < 2) return { route, from: route[0] || null, to: null, targetIndex: 0 };
    const targetIndex = state.active
      ? Math.min(Math.max(Number(state.activeStopIndex) || 1, 1), route.length - 1)
      : 1;
    return { route, from: route[targetIndex - 1], to: route[targetIndex], targetIndex };
  }

  function mappedPoints(route) {
    return route.map(stop => {
      const node = systemNodeFor(stop.name);
      return node ? { name: stop.name, x: node.x, y: node.y } : null;
    }).filter(Boolean);
  }

  function activeMapSvg(route, from, to, targetIndex) {
    const points = mappedPoints(route);
    const fullPath = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
    const fromNode = systemNodeFor(from.name);
    const toNode = systemNodeFor(to.name);
    const sameAnchor = fromNode && toNode && fromNode.id === toNode.id;
    const segment = sameAnchor
      ? `M ${fromNode.x - 44} ${fromNode.y + 28} C ${fromNode.x - 5} ${fromNode.y - 72}, ${toNode.x + 78} ${toNode.y - 34}, ${toNode.x + 42} ${toNode.y + 30}`
      : fromNode && toNode ? `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}` : '';
    const currentX = sameAnchor ? fromNode.x - 44 : fromNode?.x;
    const currentY = sameAnchor ? fromNode.y + 28 : fromNode?.y;
    const targetX = sameAnchor ? toNode.x + 42 : toNode?.x;
    const targetY = sameAnchor ? toNode.y + 30 : toNode?.y;
    const nodes = maps.system.filter(node => node.id !== 'stanton');

    return `<svg viewBox="0 0 1000 680" role="img" aria-label="Two-dimensional live route map">
      <defs><radialGradient id="activeStarGlow"><stop offset="0" stop-color="#f1dd92" stop-opacity=".8"/><stop offset=".2" stop-color="#d7c56c" stop-opacity=".25"/><stop offset="1" stop-color="#d7c56c" stop-opacity="0"/></radialGradient><filter id="activeSoftGlow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g class="active-map-grid"><path d="M0 136H1000M0 272H1000M0 408H1000M0 544H1000M200 0V680M400 0V680M600 0V680M800 0V680"/></g>
      <g class="active-map-orbits"><ellipse cx="500" cy="340" rx="205" ry="125"/><ellipse cx="500" cy="340" rx="345" ry="215"/><ellipse cx="500" cy="340" rx="455" ry="285"/></g>
      <circle class="active-map-star-glow" cx="500" cy="340" r="88"/><circle class="active-map-star" cx="500" cy="340" r="18"/>
      ${fullPath ? `<path class="active-map-full-route" d="${fullPath}"/>` : ''}
      ${nodes.map(node => `<g class="active-system-node ${node.cls}" transform="translate(${node.x} ${node.y})"><circle class="active-node-halo" r="${node.size + 14}"/><circle class="active-node-core" r="${node.size}"/><text x="${node.x > 760 ? -node.size - 12 : node.size + 12}" y="-2" text-anchor="${node.x > 760 ? 'end' : 'start'}">${esc(node.name)}</text></g>`).join('')}
      ${segment ? `<path class="active-map-leg-underlay" d="${segment}"/><path class="active-map-leg" d="${segment}"/>` : ''}
      ${currentX != null ? `<g class="active-current-marker" transform="translate(${currentX} ${currentY})"><circle class="marker-pulse" r="24"/><circle class="marker-ring" r="12"/><circle class="marker-core" r="5"/><text y="-24" text-anchor="middle">${esc(from.name)}</text><text y="-13" text-anchor="middle">CURRENT</text></g>` : ''}
      ${targetX != null ? `<g class="active-target-marker" transform="translate(${targetX} ${targetY})"><circle class="marker-pulse" r="30"/><circle class="marker-ring" r="15"/><circle class="marker-core" r="6"/><text y="34" text-anchor="middle">${esc(to.name)}</text><text y="45" text-anchor="middle">NEXT STOP</text></g>` : ''}
      ${segment ? `<circle class="active-route-tracer" r="4"><animateMotion dur="6s" repeatCount="indefinite" path="${segment}"/></circle>` : ''}
      <text class="active-map-caption" x="30" y="40">STANTON · LEG ${String(targetIndex).padStart(2, '0')} / ${String(Math.max(1, route.length - 1)).padStart(2, '0')}</text>
      <text class="active-map-caption secondary" x="30" y="58">2D RELATIVE MAP · APP-TRACKED PROGRESS</text>
    </svg>`;
  }

  window.renderActiveNavMap = function renderActiveNavMap2D() {
    previousActiveRenderer();
    const visual = $('#activeNavMap .active-nav-visual');
    const { route, from, to, targetIndex } = currentLeg();
    if (!visual || !from || !to) return;
    visual.innerHTML = activeMapSvg(route, from, to, targetIndex);
    const heading = $('#activeNavPanel .active-nav-heading h2');
    if (heading) heading.textContent = 'Current leg';
  };

  window.renderRouteOverlay = function renderPlannerLiveRoute() {
    const route = state.calculated ? state.route : buildRoute();
    const points = route.map(stop => mapCoordinates(stop.name)).filter(Boolean);
    if (points.length < 2) {
      el.overlay.innerHTML = '';
      return;
    }
    const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
    const moving = points.some((point, index) => index && (point.x !== points[index - 1].x || point.y !== points[index - 1].y));
    el.overlay.innerHTML = `<path class="route-path-underlay" d="${path}"/><path class="route-path planner-live-path" d="${path}"/>${moving ? `<circle class="planner-route-tracer" r="4"><animateMotion dur="8s" repeatCount="indefinite" path="${path}"/></circle>` : ''}`;
  };

  const originalSetNext = window.setNext;
  window.setNext = function setNextWithoutContainers(title, copy) {
    originalSetNext(title, String(copy).replace(/container group/gi, 'cargo lot').replace(/container identity/gi, 'cargo identity'));
  };

  const nextCopy = $('#nextStepCard p');
  if (nextCopy) nextCopy.textContent = 'The planner keeps every mission cargo lot separate throughout the route.';
  const activeCopy = $('[data-view-panel="active"] .page-header p');
  if (activeCopy) activeCopy.textContent = 'Work through the route with the current leg, destination services and mission cargo always visible.';
})();
