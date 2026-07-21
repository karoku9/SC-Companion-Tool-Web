'use strict';

(function initializeStarmap() {
  const data = window.SCCompanionStarmapData;
  const session = window.SCCompanionSession;
  const canvas = document.querySelector('#starmap-canvas');
  if (!data || !canvas) return;

  const context = canvas.getContext('2d');
  if (!context) return;

  const elements = {
    mode: document.querySelector('#starmap-mode'),
    title: document.querySelector('#starmap-selection-title'),
    type: document.querySelector('#starmap-selection-type'),
    detail: document.querySelector('#starmap-selection-detail'),
    route: document.querySelector('#starmap-route-status'),
    note: document.querySelector('#starmap-data-note'),
    buttons: [...document.querySelectorAll('[data-map-mode]')]
  };

  const camera = { yaw: -0.35, pitch: -0.28, zoom: 1 };
  const pointer = { down: false, moved: false, x: 0, y: 0 };
  const projectedItems = [];
  let mode = 'network';
  let selectedId = 'stanton';
  let frameRequested = false;

  function createStars(count) {
    let seed = 43891;
    return Array.from({ length: count }, () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const x = (seed % 10000) / 10000;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const y = (seed % 10000) / 10000;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const size = 0.35 + ((seed % 1000) / 1000) * 1.4;
      return { x, y, size };
    });
  }

  const stars = createStars(220);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    requestDraw();
  }

  function rotatePoint(point) {
    const [x, y, z] = point;
    const cosYaw = Math.cos(camera.yaw);
    const sinYaw = Math.sin(camera.yaw);
    const yawX = x * cosYaw - z * sinYaw;
    const yawZ = x * sinYaw + z * cosYaw;
    const cosPitch = Math.cos(camera.pitch);
    const sinPitch = Math.sin(camera.pitch);
    return [yawX, y * cosPitch - yawZ * sinPitch, y * sinPitch + yawZ * cosPitch];
  }

  function project(point, sceneScale = 1) {
    const [x, y, z] = rotatePoint(point);
    const rect = canvas.getBoundingClientRect();
    const focal = Math.min(rect.width, rect.height) * 1.6;
    const depth = Math.max(0.35, (focal + z * sceneScale) / focal);
    const scale = camera.zoom * sceneScale / depth;
    return {
      x: rect.width / 2 + x * scale,
      y: rect.height / 2 + y * scale,
      depth,
      scale
    };
  }

  function drawBackground(time) {
    const rect = canvas.getBoundingClientRect();
    const gradient = context.createRadialGradient(rect.width * 0.47, rect.height * 0.43, 8, rect.width * 0.5, rect.height * 0.5, Math.max(rect.width, rect.height) * 0.75);
    gradient.addColorStop(0, '#132127');
    gradient.addColorStop(0.38, '#091014');
    gradient.addColorStop(1, '#030608');
    context.fillStyle = gradient;
    context.fillRect(0, 0, rect.width, rect.height);

    stars.forEach((star, index) => {
      const pulse = 0.34 + Math.sin(time * 0.0008 + index * 0.63) * 0.12;
      context.globalAlpha = pulse;
      context.fillStyle = '#dcecf4';
      context.beginPath();
      context.arc(star.x * rect.width, star.y * rect.height, star.size, 0, Math.PI * 2);
      context.fill();
    });
    context.globalAlpha = 1;
  }

  function line(from, to, options = {}) {
    context.save();
    context.strokeStyle = options.color ?? 'rgba(122, 164, 181, 0.55)';
    context.lineWidth = options.width ?? 1;
    context.setLineDash(options.dash ?? []);
    context.shadowColor = options.glow ?? 'transparent';
    context.shadowBlur = options.blur ?? 0;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    context.restore();
  }

  function label(text, point, options = {}) {
    context.save();
    context.font = `${options.weight ?? 700} ${options.size ?? 12}px Inter, system-ui, sans-serif`;
    context.textAlign = options.align ?? 'left';
    context.textBaseline = 'middle';
    context.fillStyle = options.color ?? '#dbe5e9';
    context.shadowColor = '#030608';
    context.shadowBlur = 5;
    context.fillText(text, point.x, point.y);
    context.restore();
  }

  function node(point, radius, options = {}) {
    context.save();
    context.shadowColor = options.glow ?? '#f4a340';
    context.shadowBlur = options.blur ?? 18;
    const gradient = context.createRadialGradient(point.x - radius * 0.3, point.y - radius * 0.3, 1, point.x, point.y, radius);
    gradient.addColorStop(0, options.core ?? '#fff6d8');
    gradient.addColorStop(0.42, options.color ?? '#f4a340');
    gradient.addColorStop(1, options.edge ?? '#5a2d0d');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
    if (options.selected) {
      context.strokeStyle = '#fff0cb';
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(point.x, point.y, radius + 7, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }

  function getSystemPoint(systemId) {
    const system = data.getSystem(systemId);
    return system ? project(system.position, 3.1) : null;
  }

  function routeSystemIds() {
    const route = session?.getState().route;
    if (!route?.stops?.length) return [];
    const result = [];
    route.stops.forEach((stop) => {
      const anchor = data.getLocationAnchor(stop.locationId);
      const inferred = anchor?.systemId ?? (stop.locationId.startsWith('stanton-') ? 'stanton' : null);
      if (inferred && result[result.length - 1] !== inferred) result.push(inferred);
    });
    return result;
  }

  function drawNetwork() {
    data.connections.forEach((connection) => {
      const from = getSystemPoint(connection.from);
      const to = getSystemPoint(connection.to);
      if (!from || !to) return;
      line(from, to, {
        color: connection.status === 'placeholder' ? 'rgba(160, 173, 181, 0.38)' : 'rgba(244, 163, 64, 0.52)',
        width: connection.status === 'placeholder' ? 1 : 1.6,
        dash: connection.status === 'placeholder' ? [7, 7] : [],
        glow: connection.status === 'placeholder' ? 'transparent' : 'rgba(244, 163, 64, 0.48)',
        blur: 8
      });
      label(connection.status === 'placeholder' ? 'PLACEHOLDER' : 'JUMP LINK', {
        x: (from.x + to.x) / 2,
        y: (from.y + to.y) / 2 - 9
      }, { align: 'center', size: 9, color: connection.status === 'placeholder' ? '#87949a' : '#c99355' });
    });

    const activeSystems = routeSystemIds();
    for (let index = 0; index < activeSystems.length - 1; index += 1) {
      const from = getSystemPoint(activeSystems[index]);
      const to = getSystemPoint(activeSystems[index + 1]);
      if (from && to) line(from, to, { color: '#b9f18b', width: 3, glow: '#75d638', blur: 12 });
    }

    data.systems
      .map((system) => ({ system, point: getSystemPoint(system.id) }))
      .sort((left, right) => right.point.depth - left.point.depth)
      .forEach(({ system, point }) => {
        const radius = Math.max(9, 13 / point.depth);
        node(point, radius, {
          color: system.id === 'pyro' ? '#e56d37' : system.id === 'nyx' ? '#b8d8e8' : '#f4a340',
          edge: system.id === 'pyro' ? '#4e160b' : '#21343c',
          glow: system.id === 'pyro' ? '#d7411d' : '#f4a340',
          selected: selectedId === system.id
        });
        label(system.name.toUpperCase(), { x: point.x + radius + 12, y: point.y - 2 }, { size: 13, color: '#eef5f7' });
        label(system.availability, { x: point.x + radius + 12, y: point.y + 14 }, { size: 9, weight: 600, color: '#87969d' });
        projectedItems.push({ id: system.id, kind: 'system', object: system, x: point.x, y: point.y, radius: radius + 12 });
      });
  }

  function orbitPoint(radius, angle) {
    return [Math.cos(angle) * radius, Math.sin(angle * 0.37) * radius * 0.04, Math.sin(angle) * radius];
  }

  function drawOrbit(radius, type) {
    const points = [];
    for (let index = 0; index <= 96; index += 1) {
      points.push(project(orbitPoint(radius, index / 96 * Math.PI * 2), 3.05));
    }
    context.save();
    context.strokeStyle = type === 'asteroid-belt' ? 'rgba(167, 186, 195, 0.28)' : 'rgba(100, 137, 151, 0.26)';
    context.lineWidth = type === 'asteroid-belt' ? 4 : 1;
    context.setLineDash(type === 'asteroid-belt' ? [2, 5] : []);
    context.beginPath();
    points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
    context.stroke();
    context.restore();
  }

  function bodyColor(type, systemId) {
    if (type.includes('star')) return systemId === 'pyro' ? '#ff7241' : '#ffe5a7';
    if (type === 'gas-giant') return '#b8c3a0';
    if (type === 'ice-giant') return '#91c0d4';
    if (type === 'asteroid-settlement') return '#c5b7a0';
    return systemId === 'pyro' ? '#a96849' : '#7295a4';
  }

  function drawRouteOverlay(system) {
    const route = session?.getState().route;
    if (!route?.stops?.length) {
      elements.route.textContent = 'No active mission route to overlay.';
      return;
    }
    const routePoints = route.stops
      .map((stop, routeIndex) => ({ stop, routeIndex, anchor: data.getLocationAnchor(stop.locationId) }))
      .filter((entry) => entry.anchor?.systemId === system.id)
      .map((entry) => ({ ...entry, point: project(entry.anchor.position, 3.05) }));

    elements.route.textContent = routePoints.length
      ? `${routePoints.length} mapped stop${routePoints.length === 1 ? '' : 's'} in ${system.name}.`
      : `The active route has no mapped stop in ${system.name}.`;

    routePoints.forEach((entry, index) => {
      if (index) line(routePoints[index - 1].point, entry.point, { color: '#b9f18b', width: 3, glow: '#75d638', blur: 12 });
      context.save();
      context.fillStyle = '#b9f18b';
      context.shadowColor = '#75d638';
      context.shadowBlur = 13;
      context.beginPath();
      context.arc(entry.point.x, entry.point.y, 7, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#071007';
      context.font = '800 9px Inter, system-ui, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(String(entry.routeIndex + 1), entry.point.x, entry.point.y + 0.5);
      context.restore();
      label(entry.anchor.label, { x: entry.point.x + 11, y: entry.point.y - 10 }, { size: 10, color: '#ccefb4' });
      projectedItems.push({ id: `route-${entry.routeIndex}`, kind: 'route-stop', object: entry, x: entry.point.x, y: entry.point.y, radius: 16 });
    });
  }

  function drawSystem(system) {
    system.bodies.filter((body) => body.radius > 0).forEach((body) => drawOrbit(body.radius, body.type));

    system.bodies
      .map((body) => ({ body, position: data.bodyPosition(body) }))
      .map((entry) => ({ ...entry, point: project(entry.position, 3.05) }))
      .sort((left, right) => right.point.depth - left.point.depth)
      .forEach(({ body, point }) => {
        if (body.type === 'asteroid-belt') {
          label(body.name.toUpperCase(), { x: point.x, y: point.y - 14 }, { align: 'center', size: 9, color: '#8fa4ad' });
          return;
        }
        const radius = Math.max(3.5, body.size / point.depth);
        node(point, radius, {
          color: bodyColor(body.type, system.id),
          edge: '#172329',
          glow: body.type.includes('star') ? bodyColor(body.type, system.id) : 'rgba(120, 170, 188, 0.45)',
          blur: body.type.includes('star') ? 26 : 9,
          selected: selectedId === body.id
        });
        if (camera.zoom > 0.66 || body.type.includes('star')) {
          label(body.name, { x: point.x + radius + 8, y: point.y - 1 }, { size: body.type.includes('star') ? 13 : 10 });
        }
        projectedItems.push({ id: body.id, kind: 'body', object: body, system, x: point.x, y: point.y, radius: radius + 10 });
      });

    drawRouteOverlay(system);
  }

  function draw(time = performance.now()) {
    frameRequested = false;
    projectedItems.length = 0;
    drawBackground(time);
    if (mode === 'network') {
      drawNetwork();
      elements.mode.textContent = 'SYSTEM NETWORK · SCHEMATIC 3D';
      elements.route.textContent = routeSystemIds().length ? 'Active route systems are highlighted in green.' : 'Generate a mission route to add an overlay.';
      elements.note.textContent = 'System coordinates are visual layout coordinates, not claimed physical distances.';
    } else {
      const system = data.getSystem(mode);
      if (system) drawSystem(system);
      elements.mode.textContent = `${system?.name.toUpperCase() ?? 'SYSTEM'} · SCHEMATIC ORBITS`;
      elements.note.textContent = 'Orbit radii and body angles are visualized schematically. Names and system composition use reference data.';
    }
    requestDraw();
  }

  function requestDraw() {
    if (!frameRequested) {
      frameRequested = true;
      requestAnimationFrame(draw);
    }
  }

  function updateButtons() {
    elements.buttons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.mapMode === mode));
    });
  }

  function setSelection(item) {
    if (!item) return;
    selectedId = item.id;
    if (item.kind === 'system') {
      elements.title.textContent = item.object.name;
      elements.type.textContent = item.object.classification;
      elements.detail.textContent = `${item.object.security}. ${item.object.availability}.`;
    } else if (item.kind === 'body') {
      elements.title.textContent = item.object.name;
      elements.type.textContent = item.object.type.replaceAll('-', ' ');
      elements.detail.textContent = `${item.system.name} system · schematic orbital position.`;
    } else if (item.kind === 'route-stop') {
      elements.title.textContent = item.object.anchor.label;
      elements.type.textContent = `Route stop ${item.object.routeIndex + 1}`;
      elements.detail.textContent = `${item.object.stop.operations.length} operation${item.object.stop.operations.length === 1 ? '' : 's'} at this stop.`;
    }
    requestDraw();
  }

  function setMode(nextMode) {
    mode = nextMode === 'network' || data.getSystem(nextMode) ? nextMode : 'network';
    selectedId = mode === 'network' ? 'stanton' : `${mode}-star`;
    camera.yaw = mode === 'network' ? -0.35 : -0.52;
    camera.pitch = mode === 'network' ? -0.28 : -0.48;
    camera.zoom = mode === 'network' ? 1 : 0.86;
    updateButtons();
    const selectedSystem = data.getSystem(mode);
    if (selectedSystem) setSelection({ id: selectedSystem.id, kind: 'system', object: selectedSystem });
    requestDraw();
  }

  function nearestItem(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return projectedItems
      .map((item) => ({ item, distance: Math.hypot(item.x - x, item.y - y) }))
      .filter((entry) => entry.distance <= entry.item.radius)
      .sort((left, right) => left.distance - right.distance)[0]?.item ?? null;
  }

  elements.buttons.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mapMode)));

  canvas.addEventListener('pointerdown', (event) => {
    pointer.down = true;
    pointer.moved = false;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!pointer.down) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) pointer.moved = true;
    camera.yaw += dx * 0.007;
    camera.pitch = Math.max(-1.25, Math.min(1.25, camera.pitch + dy * 0.006));
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    requestDraw();
  });

  canvas.addEventListener('pointerup', (event) => {
    if (!pointer.moved) setSelection(nearestItem(event.clientX, event.clientY));
    pointer.down = false;
  });

  canvas.addEventListener('dblclick', (event) => {
    const item = nearestItem(event.clientX, event.clientY);
    if (mode === 'network' && item?.kind === 'system') setMode(item.object.id);
  });

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    camera.zoom = Math.max(0.42, Math.min(2.25, camera.zoom * (event.deltaY > 0 ? 0.9 : 1.1)));
    requestDraw();
  }, { passive: false });

  window.addEventListener('sc:session-change', requestDraw);
  new ResizeObserver(resize).observe(canvas);
  setSelection({ id: 'stanton', kind: 'system', object: data.getSystem('stanton') });
  updateButtons();
  resize();
}());
