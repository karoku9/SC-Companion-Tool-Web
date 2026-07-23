'use strict';

(function exposeStarmapData(root) {
  const registry = root.SCCompanionLocations
    ?? (typeof require !== 'undefined' ? require('./locations.js') : null);
  if (!registry) throw new Error('Location registry must load before starmap-data.js');

  const systems = registry.systems;
  const connections = registry.connections;
  const locationAnchors = Object.freeze(Object.fromEntries(
    registry.locations
      .filter((location) => location.operational && location.anchor)
      .map((location) => [location.id, Object.freeze({
        ...location.anchor,
        label: registry.formatOperationalLabel(location),
        sourceIds: location.sourceIds,
        sourceStatus: location.sourceStatus,
        geometryStatus: location.anchor.geometryStatus,
        gameVersion: location.gameVersion,
        lastVerified: location.lastVerified
      })])
  ));

  const bySystemId = new Map(systems.map((system) => [system.id, system]));

  function getSystem(id) {
    return bySystemId.get(id) ?? null;
  }

  function polarPosition(radius, angleDegrees) {
    if (!radius) return [0, 0, 0];
    const angle = angleDegrees * Math.PI / 180;
    return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
  }

  function bodyPosition(body) {
    return body ? polarPosition(body.radius, body.angle) : [0, 0, 0];
  }

  function bodyDistancePosition(body) {
    return body ? polarPosition(body.distanceRadiusGm ?? body.radius, body.angle) : [0, 0, 0];
  }

  function getBody(systemId, bodyId) {
    return getSystem(systemId)?.bodies.find((body) => body.id === bodyId) ?? null;
  }

  function getLocationAnchor(locationId) {
    const anchor = locationAnchors[locationId];
    if (!anchor) return null;
    const body = getBody(anchor.systemId, anchor.bodyId);
    if (!body) return null;
    const base = bodyPosition(body);
    const distanceBase = bodyDistancePosition(body);
    return Object.freeze({
      ...anchor,
      position: Object.freeze(base.map((value, index) => value + anchor.offset[index])),
      distancePositionGm: Object.freeze(distanceBase.map((value, index) => value + anchor.distanceOffsetGm[index]))
    });
  }

  function getMappedLocations(systemId) {
    return Object.entries(locationAnchors)
      .map(([locationId]) => ({ locationId, anchor: getLocationAnchor(locationId) }))
      .filter((entry) => entry.anchor?.systemId === systemId);
  }

  const api = Object.freeze({
    systems,
    connections,
    locationAnchors,
    getSystem,
    getBody,
    bodyPosition,
    bodyDistancePosition,
    getLocationAnchor,
    getMappedLocations,
    snapshot: registry.snapshot
  });
  root.SCCompanionStarmapData = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
