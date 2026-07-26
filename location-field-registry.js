'use strict';

(function extendLocationRegistry(root) {
  const base = root.SCCompanionLocations
    ?? (typeof require !== 'undefined' ? require('./locations.js') : null);
  if (!base) throw new Error('Base location registry must load before location-field-registry.js');

  const REVIEWED_AT = '2026-07-26';
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

  const contractSource = deepFreeze({
    id: 'scwiki-contract-destinations-4-9',
    label: 'Star Citizen Wiki API — hauling contract destination review',
    url: 'https://api.star-citizen.wiki/locations/stanton',
    kind: 'reviewed-community-game-data',
    authority: 'community',
    gameVersion: COMMUNITY_BUILD,
    reviewedAt: REVIEWED_AT
  });

  function slug(value) {
    return String(value).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function specialAliases(name) {
    const aliases = [];
    const paf = String(name).match(/^(.+) PAF-(I|II|III)$/i);
    if (paf) {
      const number = { I: '1', II: '2', III: '3' }[paf[2].toUpperCase()];
      aliases.push(`${paf[1]} PAF ${paf[2]}`, `${paf[1]} PAF ${number}`, `${paf[1]} PAF-${number}`);
    }
    const olp = String(name).match(/^(.+) OLP$/i);
    if (olp) aliases.push(`${olp[1]} orbital laser platform`);
    if (name === 'Reclamation & Disposal Orinth') aliases.push('Reclamation and Disposal Orinth', 'R&D Orinth', 'Orinth');
    return aliases;
  }

  function aliasesFor(name) {
    const values = [name, ...specialAliases(name)].map((value) => String(value).toLowerCase());
    return [...new Set(values.flatMap((normalized) => {
      const dequoted = normalized.replace(/['’]/g, '');
      const compact = dequoted.replace(/[^a-z0-9]/g, '');
      const spaced = dequoted.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
      return [normalized, dequoted, spaced, compact];
    }))];
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
    'stanton-microtech-euterpe': 'microtech',
    pyro: 'pyro-star',
    'pyro-bloom': 'bloom',
    'pyro-terminus': 'terminus'
  };

  const bodyForName = {
    Rustville: 'pyro-i',
    'Fallow Field': 'pyro-iv',
    Ashland: 'pyro-v',
    "Shepherd's Rest": 'bloom',
    'Last Landings': 'terminus'
  };

  const contextForName = {
    Rustville: 'Pyro I',
    "Shepherd's Rest": 'Bloom / Pyro III',
    'Fallow Field': 'Pyro IV',
    Ashland: 'Ignis / Pyro Va',
    'Last Landings': 'Terminus / Pyro VI'
  };

  const facilityClassForName = {
    'Reclamation & Disposal Orinth': 'salvage-yard',
    Rustville: 'pyro-outpost-serviced',
    "Shepherd's Rest": 'pyro-outpost',
    'Fallow Field': 'pyro-outpost',
    Ashland: 'pyro-outpost',
    'Last Landings': 'pyro-outpost-serviced'
  };

  const contextForParent = new Map(base.locations.map((location) => [location.id, location.name]));

  const standardGroups = [
    ['stanton-hurston', 'outpost', ['HDMS-Edmond', 'HDMS-Hadley', 'HDMS-Oparei', 'HDMS-Pinewood', 'HDMS-Stanhope', 'HDMS-Thedus', 'Reclamation & Disposal Orinth']],
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
    ['stanton-microtech', 'distribution-center', ['Covalex Distribution Centre S4DC05', 'Greycat Stanton IV Production Complex-A', 'MicroTech Logistics Depot S4LD01', 'MicroTech Logistics Depot S4LD13', 'Sakura Sun Goldenrod Workcenter']],
    ['pyro', 'outpost', ['Rustville', 'Fallow Field', 'Ashland']],
    ['pyro-bloom', 'outpost', ["Shepherd's Rest"]],
    ['pyro-terminus', 'outpost', ['Last Landings']]
  ];

  const hathorGroups = [
    ['stanton-crusader-daymar', 'Attritus'],
    ['stanton-crusader-daymar', 'Lamina'],
    ['stanton-hurston-aberdeen', 'Ruptura'],
    ['stanton-hurston-aberdeen', 'Vivere']
  ].flatMap(([parentId, family]) => [
    [parentId, 'planetary-alignment-facility', [`${family} PAF-I`, `${family} PAF-II`, `${family} PAF-III`]],
    [parentId, 'orbital-laser-platform', [`${family} OLP`]]
  ]);

  const groups = [...standardGroups, ...hathorGroups];
  let sequence = 0;
  const fieldLocations = groups.flatMap(([parentId, type, names]) => names.map((name) => {
    const index = sequence++;
    const systemId = parentId.startsWith('pyro') ? 'pyro' : 'stanton';
    const parentName = contextForName[name] ?? contextForParent.get(parentId) ?? parentId;
    const bodyId = bodyForName[name] ?? planetForParent[parentId];
    const angle = (index % 12) * Math.PI / 6;
    const orbital = type === 'orbital-laser-platform';
    const ring = orbital ? 7 : 5 + Math.floor(index / 12) * 2;
    const offset = [Number((Math.cos(angle) * ring).toFixed(2)), Number((Math.sin(angle) * ring).toFixed(2)), orbital ? 9 : 4 + (index % 3)];
    const distanceOffsetGm = [Number((Math.cos(angle) * (orbital ? 0.12 : 0.18)).toFixed(3)), Number((Math.sin(angle) * (orbital ? 0.12 : 0.18)).toFixed(3)), Number((orbital ? 0.12 : 0.03 + (index % 5) * 0.01).toFixed(3))];
    const source = ['planetary-alignment-facility', 'orbital-laser-platform'].includes(type) || facilityClassForName[name] ? contractSource : fieldSource;
    const displayType = type === 'planetary-alignment-facility' ? 'outpost' : type === 'orbital-laser-platform' ? 'orbital-station' : type;
    return deepFreeze({
      id: `${parentId}-${slug(name)}`,
      type: displayType,
      facilityClass: facilityClassForName[name] ?? type,
      name,
      contextName: parentName,
      parentId,
      operational: true,
      navigationTarget: name,
      aliases: aliasesFor(name),
      sourceStatus: 'reviewed-community-current',
      sourceIds: [source.id],
      gameVersion: GAME_VERSION,
      lastVerified: REVIEWED_AT,
      anchor: {
        systemId,
        bodyId,
        offset,
        distanceOffsetGm,
        geometryStatus: orbital ? 'parent-verified-schematic-orbit' : 'schematic-surface-anchor',
        distanceGroupId: `${parentId.replace(/^(stanton|pyro)-/, '')}-${slug(name)}`
      }
    });
  }));

  const sources = deepFreeze([...base.sources, fieldSource, contractSource]);
  const locations = deepFreeze([...base.locations, ...fieldLocations]);
  const byId = new Map(locations.map((location) => [location.id, location]));
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const systemById = new Map(base.systems.map((system) => [system.id, system]));

  function getLocation(id) { return byId.get(id) ?? null; }
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
  function getSystemForLocation(id) { return getLocationPath(id).find((item) => item.type === 'system') ?? null; }
  function formatOperationalLabel(location) { return location?.contextName ? `${location.name} · ${location.contextName}` : location?.name ?? ''; }
  function formatLocationPath(location) { return location ? getLocationPath(location.id).map((item) => item.name).join(' / ') : ''; }
  function searchableValues(location) {
    const path = getLocationPath(location.id);
    const parentNames = path.slice(0, -1).map((item) => item.name);
    return [location.name, location.contextName, location.navigationTarget, ...(location.aliases ?? []), parentNames.join(' '), `${parentNames.at(-1) ?? ''} ${location.name}`, `${getSystemForLocation(location.id)?.name ?? ''} ${location.name}`].filter(Boolean).map(base.normalizeSearchTerm).filter(Boolean);
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
    return locations.filter((location) => location.operational).map((location) => ({ location, score: scoreLocation(location, query) })).filter((result) => result.score > 0).sort((left, right) => right.score - left.score || formatOperationalLabel(left.location).localeCompare(formatOperationalLabel(right.location))).slice(0, limit).map((result) => result.location);
  }
  function validateCatalog() {
    const errors = [];
    const warnings = [];
    const terms = new Map();
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
        const ids = terms.get(term) ?? [];
        ids.push(location.id);
        terms.set(term, ids);
      });
    });
    terms.forEach((ids, term) => { if (new Set(ids).size > 1) warnings.push(`Ambiguous operational search term "${term}": ${[...new Set(ids)].join(', ')}`); });
    return deepFreeze({ errors, warnings });
  }
  function getCoverageSummary() {
    const bySystem = {};
    locations.filter((location) => location.operational).forEach((location) => {
      const systemId = getSystemForLocation(location.id)?.id;
      if (systemId) bySystem[systemId] = (bySystem[systemId] ?? 0) + 1;
    });
    return deepFreeze({ totalRecords: locations.length, operationalDestinations: locations.filter((location) => location.operational).length, fieldDestinations: fieldLocations.length, bySystem, reviewedAt: REVIEWED_AT, gameVersion: GAME_VERSION });
  }

  const snapshot = deepFreeze({ ...base.snapshot, schemaVersion: 4, reviewedAt: REVIEWED_AT, coverage: getCoverageSummary(), note: 'Base registry plus reviewed surface, Hathor PAF/OLP and hauling-contract destinations. Geometry remains schematic.' });
  const validation = validateCatalog();
  const api = deepFreeze({ ...base, snapshot, sources, systems: base.systems, connections: base.connections, locations, fieldLocations, validation, getLocation, getLocationPath, getSystemForLocation, getSystemRecord: (id) => systemById.get(id) ?? null, getSource: (id) => sourceById.get(id) ?? null, formatOperationalLabel, formatLocationPath, searchOperationalLocations, normalizeSearchTerm: base.normalizeSearchTerm, getCoverageSummary, validateCatalog });

  root.SCCompanionLocations = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
