'use strict';

(function extendLocationRegistry(root) {
  const base = root.SCCompanionLocations
    ?? (typeof require !== 'undefined' ? require('./locations.js') : null);
  if (!base) throw new Error('Base location registry must load before location-field-registry.js');

  const REVIEWED_AT = '2026-07-23';
  const GAME_VERSION = 'Alpha 4.9.x';
  const COMMUNITY_BUILD = '4.9.0-LIVE.12232306';

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  const fieldSource = deepFreeze({
    id: 'sctools-stanton-field-4-9',
    label: 'Star Citizen Wiki and 4.9 game-data field-location review',
    url: 'https://starcitizen.tools/List_of_Stanton_locations',
    kind: 'reviewed-community-field-data',
    authority: 'community',
    gameVersion: COMMUNITY_BUILD,
    reviewedAt: REVIEWED_AT
  });

  function slug(value) {
    return String(value).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function aliasesFor(name) {
    const normalized = String(name).toLowerCase();
    const dequoted = normalized.replace(/['’]/g, '');
    const compact = dequoted.replace(/[^a-z0-9]/g, '');
    const spaced = dequoted.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
    return [...new Set([normalized, dequoted, spaced, compact])];
  }

  const planetForParent = {
    'stanton-hurston': 'hurston',
    'stanton-hurston-aberdeen': 'hurston',
    'stanton-hurston-arial': 'hurston',
    'stanton-hurston-ita': 'hurston',
    'stanton-hurston-magda': 'hurston',
    'stanton-crusader-cellin': 'crusader',
    'stanton-crusader-daymar': 'crusader',
    'stanton-crusader-yela': 'crusader',
    'stanton-arccorp-lyria': 'arccorp',
    'stanton-arccorp-wala': 'arccorp',
    'stanton-microtech': 'microtech',
    'stanton-microtech-calliope': 'microtech',
    'stanton-microtech-clio': 'microtech',
    'stanton-microtech-euterpe': 'microtech'
  };

  const contextForParent = new Map(base.locations.map((location) => [location.id, location.name]));

  const groups = [
    ['stanton-hurston', 'outpost', ['HDMS-Edmond', 'HDMS-Hadley', 'HDMS-Oparei', 'HDMS-Pinewood', 'HDMS-Stanhope', 'HDMS-Thedus']],
    ['stanton-hurston-aberdeen', 'outpost', ['HDMS-Anderson', 'HDMS-Norgaard']],
    ['stanton-hurston-arial', 'outpost', ['HDMS-Bezdek', 'HDMS-Lathan']],
    ['stanton-hurston-ita', 'outpost', ['HDMS-Ryder', 'HDMS-Woodruff']],
    ['stanton-hurston-magda', 'outpost', ['HDMS-Hahn', 'HDMS-Perlman']],
    ['stanton-crusader-cellin', 'outpost', ['Galette Family Farms', 'Hickes Research Outpost', 'Terra Mills HydroFarm', 'Tram & Myers Mining']],
    ['stanton-crusader-daymar', 'outpost', ['ArcCorp Mining Area 141', 'Bountiful Harvest Hydroponics', 'Kudre Ore', 'Shubin Mining Facility SCD-1']],
    ['stanton-crusader-yela', 'outpost', ['ArcCorp Mining Area 157', 'Benson Mining Outpost', 'Deakins Research Outpost']],
    ['stanton-arccorp-lyria', 'outpost', ['Humboldt Mines', 'Loveridge Mineral Reserve', 'Shubin Mining Facility SAL-2', 'Shubin Mining Facility SAL-5']],
    ['stanton-arccorp-wala', 'outpost', ['ArcCorp Mining Area 045', 'ArcCorp Mining Area 048', 'ArcCorp Mining Area 056', 'ArcCorp Mining Area 061']],
    ['stanton-microtech', 'outpost', ['Rayari Deltana Research Outpost', 'Rayari Kaltag Research Outpost', 'Shubin Mining Facility SM0-18', 'Shubin Mining Facility SM0-22S']],
    ['stanton-microtech-calliope', 'outpost', ['Shubin Mining Facility SMCa-6', 'Shubin Mining Facility SMCa-8']],
    ['stanton-microtech-clio', 'outpost', ['Rayari Cantwell Research Outpost', 'Rayari McGrath Research Outpost']],
    ['stanton-microtech-euterpe', 'outpost', ["Bud's Growery", 'Devlin Scrap & Salvage']],
    ['stanton-hurston', 'distribution-center', ['HDPC-Cassillo', 'HDPC-Farnesway']],
    ['stanton-microtech', 'distribution-center', ['Covalex Distribution Centre S4DC05', 'Greycat Stanton IV Production Complex-A', 'MicroTech Logistics Depot S4LD01', 'MicroTech Logistics Depot S4LD13', 'Sakura Sun Goldenrod Workcenter']]
  ];

  let sequence = 0;
  const fieldLocations = groups.flatMap(([parentId, type, names]) => names.map((name) => {
    const index = sequence++;
    const parentName = contextForParent.get(parentId) ?? parentId;
    const bodyId = planetForParent[parentId];
    const angle = (index % 12) * Math.PI / 6;
    const ring = 5 + Math.floor(index / 12) * 2;
    const offset = [Number((Math.cos(angle) * ring).toFixed(2)), Number((Math.sin(angle) * ring).toFixed(2)), 4 + (index % 3)];
    const distanceOffsetGm = [Number((Math.cos(angle) * 0.18).toFixed(3)), Number((Math.sin(angle) * 0.18).toFixed(3)), Number((0.03 + (index % 5) * 0.01).toFixed(3))];
    return deepFreeze({
      id: `${parentId}-${slug(name)}`,
      type,
      name,
      contextName: parentName,
      parentId,
      operational: true,
      navigationTarget: name,
      aliases: aliasesFor(name),
      sourceStatus: 'reviewed-community-current',
      sourceIds: [fieldSource.id],
      gameVersion: GAME_VERSION,
      lastVerified: REVIEWED_AT,
      anchor: {
        systemId: 'stanton',
        bodyId,
        offset,
        distanceOffsetGm,
        geometryStatus: 'schematic-surface-anchor',
        distanceGroupId: parentId.replace(/^stanton-/, '')
      }
    });
  }));

  const sources = deepFreeze([...base.sources, fieldSource]);
  const locations = deepFreeze([...base.locations, ...fieldLocations]);
  const byId = new Map(locations.map((location) => [location.id, location]));
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const systemById = new Map(base.systems.map((system) => [system.id, system]));

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
    const path = getLocationPath(location.id);
    const parentNames = path.slice(0, -1).map((item) => item.name);
    return [
      location.name, location.contextName, location.navigationTarget, ...(location.aliases ?? []),
      parentNames.join(' '), `${parentNames.at(-1) ?? ''} ${location.name}`, `${getSystemForLocation(location.id)?.name ?? ''} ${location.name}`
    ].filter(Boolean).map(base.normalizeSearchTerm).filter(Boolean);
  }

  function scoreLocation(location, query) {
    const normalizedQuery = base.normalizeSearchTerm(query);
    if (!normalizedQuery) return 1;
    const queryTokens = normalizedQuery.split(' ');
    return searchableValues(location).reduce((best, candidate) => {
      if (candidate === normalizedQuery) return Math.max(best, 120);
      if (candidate.startsWith(normalizedQuery)) return Math.max(best, 90);
      if (candidate.includes(normalizedQuery)) return Math.max(best, 65);
      const candidateTokens = new Set(candidate.split(' '));
      return queryTokens.every((token) => candidateTokens.has(token)) ? Math.max(best, 50) : best;
    }, 0);
  }

  function searchOperationalLocations(query, options = {}) {
    const limit = Number.isFinite(options.limit) ? Math.max(1, Number(options.limit)) : Infinity;
    return locations
      .filter((location) => location.operational)
      .map((location) => ({ location, score: scoreLocation(location, query) }))
      .filter((result) => result.score > 0)
      .sort((left, right) => right.score - left.score || formatOperationalLabel(left.location).localeCompare(formatOperationalLabel(right.location)))
      .slice(0, limit)
      .map((result) => result.location);
  }

  function validateCatalog() {
    const errors = [];
    const warnings = [];
    const operationalTerms = new Map();
    if (new Set(locations.map((location) => location.id)).size !== locations.length) errors.push('Location ids must be unique.');
    if (new Set(sources.map((source) => source.id)).size !== sources.length) errors.push('Source ids must be unique.');
    locations.forEach((location) => {
      if (location.parentId && !byId.has(location.parentId)) errors.push(`${location.id} references missing parent ${location.parentId}`);
      (location.sourceIds ?? []).forEach((sourceId) => { if (!sourceById.has(sourceId)) errors.push(`${location.id} references missing source ${sourceId}`); });
      if (!location.lastVerified || !location.gameVersion) errors.push(`${location.id} has incomplete review metadata`);
      if (!location.operational) return;
      if (!location.navigationTarget || !location.anchor) errors.push(`${location.id} is operational without navigation metadata`);
      const system = systemById.get(location.anchor?.systemId);
      if (!system?.bodies.some((body) => body.id === location.anchor.bodyId)) errors.push(`${location.id} references missing anchor body ${location.anchor?.bodyId}`);
      [location.name, location.navigationTarget, ...(location.aliases ?? [])].map(base.normalizeSearchTerm).filter(Boolean).forEach((term) => {
        const ids = operationalTerms.get(term) ?? [];
        ids.push(location.id);
        operationalTerms.set(term, ids);
      });
    });
    operationalTerms.forEach((ids, term) => {
      const unique = [...new Set(ids)];
      if (unique.length > 1) warnings.push(`Ambiguous operational search term "${term}": ${unique.join(', ')}`);
    });
    return deepFreeze({ errors, warnings });
  }

  function getCoverageSummary() {
    const bySystem = {};
    locations.filter((location) => location.operational).forEach((location) => {
      const systemId = getSystemForLocation(location.id)?.id;
      if (systemId) bySystem[systemId] = (bySystem[systemId] ?? 0) + 1;
    });
    return deepFreeze({
      totalRecords: locations.length,
      operationalDestinations: locations.filter((location) => location.operational).length,
      fieldDestinations: fieldLocations.length,
      bySystem,
      reviewedAt: REVIEWED_AT,
      gameVersion: GAME_VERSION
    });
  }

  const snapshot = deepFreeze({
    ...base.snapshot,
    schemaVersion: 3,
    reviewedAt: REVIEWED_AT,
    coverage: getCoverageSummary(),
    note: 'Base interstellar registry plus reviewed Stanton surface outposts and distribution centers. Surface geometry remains schematic.'
  });
  const validation = validateCatalog();
  const api = deepFreeze({
    snapshot,
    sources,
    systems: base.systems,
    connections: base.connections,
    locations,
    fieldLocations,
    validation,
    getLocation,
    getLocationPath,
    getSystemForLocation,
    getSystemRecord: (id) => systemById.get(id) ?? null,
    getSource: (id) => sourceById.get(id) ?? null,
    formatOperationalLabel,
    formatLocationPath,
    searchOperationalLocations,
    normalizeSearchTerm: base.normalizeSearchTerm,
    getCoverageSummary,
    validateCatalog
  });

  root.SCCompanionLocations = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
