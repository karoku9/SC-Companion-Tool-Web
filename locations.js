'use strict';

(function exposeLocationModel(root) {
  const verifiedAt = '2026-07-22';
  const locations = Object.freeze([
    Object.freeze({ id: 'stanton', type: 'system', name: 'Stanton', parentId: null, operational: false, aliases: ['stanton system'], sourceStatus: 'official-current', sourceIds: Object.freeze(['rsi-stanton']), lastVerified: verifiedAt }),
    Object.freeze({ id: 'stanton-hurston', type: 'planet', name: 'Hurston', parentId: 'stanton', operational: false, aliases: ['hurston planet'], sourceStatus: 'official-current', sourceIds: Object.freeze(['rsi-stanton']), lastVerified: verifiedAt }),
    Object.freeze({ id: 'stanton-hurston-lorville', type: 'landing-zone', name: 'Lorville', parentId: 'stanton-hurston', operational: false, aliases: ['lorville city', 'lorville landing zone'], sourceStatus: 'official-current', sourceIds: Object.freeze(['rsi-stanton']), lastVerified: verifiedAt }),
    Object.freeze({
      id: 'stanton-hurston-lorville-teasa',
      type: 'spaceport',
      name: 'Teasa Spaceport',
      contextName: 'Lorville',
      parentId: 'stanton-hurston-lorville',
      operational: true,
      navigationTarget: 'Lorville',
      aliases: ['teasa', 'taesa', 'teasa spaceport', 'lorville', 'lorville spaceport', 'hurston lorville'],
      sourceStatus: 'official-current',
      sourceIds: Object.freeze(['rsi-stanton']),
      lastVerified: verifiedAt
    }),
    Object.freeze({ id: 'stanton-arccorp', type: 'planet', name: 'ArcCorp', parentId: 'stanton', operational: false, aliases: ['arc corp', 'arccorp planet'], sourceStatus: 'official-current', sourceIds: Object.freeze(['rsi-stanton']), lastVerified: verifiedAt }),
    Object.freeze({ id: 'stanton-arccorp-area18', type: 'landing-zone', name: 'Area18', parentId: 'stanton-arccorp', operational: false, aliases: ['area 18', 'area18 city'], sourceStatus: 'official-current', sourceIds: Object.freeze(['rsi-stanton']), lastVerified: verifiedAt }),
    Object.freeze({
      id: 'stanton-arccorp-area18-riker',
      type: 'spaceport',
      name: 'Riker Memorial Spaceport',
      contextName: 'Area18',
      parentId: 'stanton-arccorp-area18',
      operational: true,
      navigationTarget: 'Area18',
      aliases: ['area18', 'area 18', 'riker', 'riker memorial', 'area18 spaceport'],
      sourceStatus: 'official-current',
      sourceIds: Object.freeze(['rsi-stanton']),
      lastVerified: verifiedAt
    }),
    Object.freeze({
      id: 'stanton-arccorp-baijini',
      type: 'orbital-station',
      name: 'Baijini Point',
      contextName: 'ArcCorp',
      parentId: 'stanton-arccorp',
      operational: true,
      navigationTarget: 'Baijini Point',
      aliases: ['baijini', 'baijini point', 'arc corp orbital station'],
      sourceStatus: 'official-current',
      sourceIds: Object.freeze(['rsi-stanton']),
      lastVerified: verifiedAt
    }),

    Object.freeze({ id: 'pyro', type: 'system', name: 'Pyro', parentId: null, operational: false, aliases: ['pyro system'], sourceStatus: 'official-current', sourceIds: Object.freeze(['rsi-pyro', 'rsi-alpha-4-9']), lastVerified: verifiedAt }),
    Object.freeze({ id: 'pyro-monox', type: 'planet', name: 'Monox', contextName: 'Pyro II', parentId: 'pyro', operational: false, aliases: ['monox', 'pyro ii', 'pyro 2'], sourceStatus: 'official-current', sourceIds: Object.freeze(['rsi-pyro', 'rsi-checkmate']), lastVerified: verifiedAt }),
    Object.freeze({
      id: 'pyro-monox-checkmate',
      type: 'orbital-station',
      name: 'Checkmate Station',
      contextName: 'Pyro',
      parentId: 'pyro-monox',
      operational: true,
      navigationTarget: 'Checkmate Station',
      aliases: ['checkmate', 'checkmate station', 'checkmate station pyro', 'pyro checkmate'],
      sourceStatus: 'official-current',
      sourceIds: Object.freeze(['rsi-checkmate', 'rsi-alpha-4-9']),
      lastVerified: verifiedAt
    }),
    Object.freeze({ id: 'pyro-bloom', type: 'planet', name: 'Bloom', contextName: 'Pyro III', parentId: 'pyro', operational: false, aliases: ['bloom', 'pyro iii', 'pyro 3'], sourceStatus: 'official-current', sourceIds: Object.freeze(['rsi-pyro']), lastVerified: verifiedAt }),
    Object.freeze({
      id: 'pyro-bloom-orbituary',
      type: 'orbital-station',
      name: 'Orbituary',
      contextName: 'Pyro',
      parentId: 'pyro-bloom',
      operational: true,
      navigationTarget: 'Orbituary',
      aliases: ['orbituary', 'orbituary station', 'orbituary pyro', 'pyro orbituary'],
      sourceStatus: 'official-current-location-derived-parent',
      sourceIds: Object.freeze(['rsi-orbituary', 'rsi-pyro']),
      lastVerified: verifiedAt
    }),
    Object.freeze({ id: 'pyro-terminus', type: 'planet', name: 'Terminus', contextName: 'Pyro VI', parentId: 'pyro', operational: false, aliases: ['terminus', 'pyro vi', 'pyro 6'], sourceStatus: 'official-current', sourceIds: Object.freeze(['rsi-ruin', 'rsi-pyro']), lastVerified: verifiedAt }),
    Object.freeze({
      id: 'pyro-terminus-ruin',
      type: 'orbital-station',
      name: 'Ruin Station',
      contextName: 'Pyro',
      parentId: 'pyro-terminus',
      operational: true,
      navigationTarget: 'Ruin Station',
      aliases: ['ruin', 'ruin station', 'ruin station pyro', 'pyro ruin'],
      sourceStatus: 'official-current',
      sourceIds: Object.freeze(['rsi-ruin', 'rsi-orbituary']),
      lastVerified: verifiedAt
    }),

    Object.freeze({ id: 'nyx', type: 'system', name: 'Nyx', parentId: null, operational: false, aliases: ['nyx system'], sourceStatus: 'official-current', sourceIds: Object.freeze(['rsi-nyx', 'rsi-alpha-4-4-nyx']), lastVerified: verifiedAt }),
    Object.freeze({ id: 'nyx-glaciem', type: 'asteroid-belt', name: 'Glaciem Ring', parentId: 'nyx', operational: false, aliases: ['glaciem', 'glaciem ring'], sourceStatus: 'official-current', sourceIds: Object.freeze(['rsi-nyx', 'rsi-alpha-4-4-nyx']), lastVerified: verifiedAt }),
    Object.freeze({ id: 'nyx-delamar', type: 'planetoid', name: 'Delamar', contextName: 'Glaciem Ring', parentId: 'nyx-glaciem', operational: false, aliases: ['delamar'], sourceStatus: 'official-current', sourceIds: Object.freeze(['rsi-levski', 'rsi-nyx']), lastVerified: verifiedAt }),
    Object.freeze({
      id: 'nyx-delamar-levski',
      type: 'landing-zone',
      name: 'Levski',
      contextName: 'Nyx',
      parentId: 'nyx-delamar',
      operational: true,
      navigationTarget: 'Levski',
      aliases: ['levski', 'levski nyx', 'nyx levski', 'delamar levski'],
      sourceStatus: 'official-current',
      sourceIds: Object.freeze(['rsi-levski', 'rsi-alpha-4-4-nyx']),
      lastVerified: verifiedAt
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
      if (visited.has(current.id)) throw new Error(`Location hierarchy cycle detected at ${current.id}`);
      visited.add(current.id);
      path.unshift(current);
      current = current.parentId ? getLocation(current.parentId) : null;
    }
    return path;
  }

  function getSystemForLocation(id) {
    return getLocationPath(id).find((item) => item.type === 'system') ?? null;
  }

  function formatOperationalLabel(location) {
    if (!location) return '';
    return location.contextName ? `${location.name} · ${location.contextName}` : location.name;
  }

  function formatLocationPath(location) {
    if (!location) return '';
    return getLocationPath(location.id).map((item) => item.name).join(' / ');
  }

  function searchableValues(location) {
    return [location.name, location.contextName, location.navigationTarget, ...(location.aliases ?? [])]
      .filter(Boolean)
      .map(normalize);
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
      .sort((left, right) => right.score - left.score || formatOperationalLabel(left.location).localeCompare(formatOperationalLabel(right.location)))
      .map((result) => result.location);
  }

  const api = Object.freeze({ locations, getLocation, getLocationPath, getSystemForLocation, formatOperationalLabel, formatLocationPath, searchOperationalLocations });
  root.SCCompanionLocations = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
