'use strict';

(function exposeLocationModel(root) {
  const locations = Object.freeze([
    Object.freeze({
      id: 'stanton',
      type: 'system',
      name: 'Stanton',
      parentId: null,
      operational: false,
      aliases: ['stanton system']
    }),
    Object.freeze({
      id: 'stanton-hurston',
      type: 'planet',
      name: 'Hurston',
      parentId: 'stanton',
      operational: false,
      aliases: ['hurston planet']
    }),
    Object.freeze({
      id: 'stanton-hurston-lorville',
      type: 'landing-zone',
      name: 'Lorville',
      parentId: 'stanton-hurston',
      operational: false,
      aliases: ['lorville city', 'lorville landing zone']
    }),
    Object.freeze({
      id: 'stanton-hurston-lorville-teasa',
      type: 'spaceport',
      name: 'Teasa Spaceport',
      contextName: 'Lorville',
      parentId: 'stanton-hurston-lorville',
      operational: true,
      navigationTarget: 'Lorville',
      aliases: [
        'teasa',
        'teasa spaceport',
        'lorville',
        'lorville spaceport',
        'hurston lorville'
      ]
    })
  ]);

  const byId = new Map(locations.map((location) => [location.id, location]));

  function normalize(value) {
    return String(value ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  function getLocation(id) {
    return byId.get(id) ?? null;
  }

  function getLocationPath(id) {
    const path = [];
    const visited = new Set();
    let current = getLocation(id);

    while (current) {
      if (visited.has(current.id)) {
        throw new Error(`Location hierarchy cycle detected at ${current.id}`);
      }

      visited.add(current.id);
      path.unshift(current);
      current = current.parentId ? getLocation(current.parentId) : null;
    }

    return path;
  }

  function formatOperationalLabel(location) {
    if (!location) return '';
    return location.contextName
      ? `${location.name} · ${location.contextName}`
      : location.name;
  }

  function formatLocationPath(location) {
    if (!location) return '';
    return getLocationPath(location.id)
      .map((item) => item.name)
      .join(' / ');
  }

  function searchableValues(location) {
    return [
      location.name,
      location.contextName,
      location.navigationTarget,
      ...(location.aliases ?? [])
    ].filter(Boolean).map(normalize);
  }

  function scoreLocation(location, query) {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return 1;

    return searchableValues(location).reduce((best, candidate) => {
      if (candidate === normalizedQuery) return Math.max(best, 100);
      if (candidate.startsWith(normalizedQuery)) return Math.max(best, 70);
      if (candidate.includes(normalizedQuery)) return Math.max(best, 40);
      return best;
    }, 0);
  }

  function searchOperationalLocations(query) {
    return locations
      .filter((location) => location.operational)
      .map((location) => ({ location, score: scoreLocation(location, query) }))
      .filter((result) => result.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return formatOperationalLabel(left.location)
          .localeCompare(formatOperationalLabel(right.location));
      })
      .map((result) => result.location);
  }

  const api = Object.freeze({
    locations,
    getLocation,
    getLocationPath,
    formatOperationalLabel,
    formatLocationPath,
    searchOperationalLocations
  });

  root.SCCompanionLocations = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : window));
