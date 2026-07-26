'use strict';

(function extendContractLocationRegistry(root) {
  const base = root.SCCompanionLocations
    ?? (typeof require !== 'undefined' ? require('./location-field-registry.js') : null);
  if (!base) throw new Error('Expanded location registry must load before location-contract-extension.js');

  const REVIEWED_AT = '2026-07-26';
  const GAME_VERSION = 'Alpha 4.9.x';
  const COMMUNITY_BUILD = '4.9.0-LIVE.12232306';

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function slug(value) {
    return String(value).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function aliasesFor(name, extras = []) {
    const normalized = String(name).toLowerCase();
    const dequoted = normalized.replace(/['’]/g, '');
    const spaced = dequoted.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
    const compact = dequoted.replace(/[^a-z0-9]/g, '');
    return [...new Set([normalized, dequoted, spaced, compact, ...extras])];
  }

  const source = deepFreeze({
    id: 'scwiki-contract-destinations-4-9',
    label: 'Star Citizen Wiki API — hauling contract destinations',
    url: 'https://api.star-citizen.wiki/locations/stanton',
    kind: 'reviewed-community-game-data',
    authority: 'community',
    gameVersion: COMMUNITY_BUILD,
    reviewedAt: REVIEWED_AT
  });

  const hierarchyLocations = [
    { id: 'pyro-pyro-i', type: 'planet', name: 'Pyro I', parentId: 'pyro', aliases: ['pyro i', 'pyro 1'] },
    { id: 'pyro-pyro-iv', type: 'planet', name: 'Pyro IV', parentId: 'pyro', aliases: ['pyro iv', 'pyro 4'] },
    { id: 'pyro-pyro-v', type: 'gas-giant', name: 'Pyro V', parentId: 'pyro', aliases: ['pyro v', 'pyro 5'] },
    { id: 'pyro-pyro-v-ignis', type: 'moon', name: 'Ignis', contextName: 'Pyro Va', parentId: 'pyro-pyro-v', aliases: ['ignis', 'pyro va', 'pyro 5a'] }
  ].map((location) => deepFreeze({
    operational: false,
    sourceStatus: 'reviewed-community-current',
    sourceIds: [source.id],
    lastVerified: REVIEWED_AT,
    gameVersion: GAME_VERSION,
    ...location
  }));

  function anchor(systemId, bodyId, distanceGroupId, sequence, orbital = false) {
    const angle = (sequence % 12) * Math.PI / 6;
    const radius = orbital ? 7 : 5 + Math.floor(sequence / 12) * 1.5;
    return {
      systemId,
      bodyId,
      offset: [Number((Math.cos(angle) * radius).toFixed(2)), Number((Math.sin(angle) * radius).toFixed(2)), orbital ? 9 : 4 + (sequence % 3)],
      distanceOffsetGm: [Number((Math.cos(angle) * (orbital ? 0.12 : 0.18)).toFixed(3)), Number((Math.sin(angle) * (orbital ? 0.12 : 0.18)).toFixed(3)), orbital ? 0.12 : 0.04],
      geometryStatus: orbital ? 'parent-verified-schematic-orbit' : 'schematic-surface-anchor',
      distanceGroupId
    };
  }

  let sequence = 0;
  const operational = [];
  function addOperational(input) {
    const currentSequence = sequence++;
    operational.push(deepFreeze({
      id: input.id,
      type: input.type ?? 'outpost',
      name: input.name,
      contextName: input.contextName,
      parentId: input.parentId,
      operational: true,
      navigationTarget: input.navigationTarget ?? input.name,
      aliases: aliasesFor(input.name, input.aliases ?? []),
      facilityClass: input.facilityClass ?? 'outpost',
      sourceStatus: 'reviewed-community-current',
      sourceIds: [source.id],
      gameVersion: GAME_VERSION,
      lastVerified: REVIEWED_AT,
      anchor: anchor(input.systemId, input.bodyId, input.distanceGroupId ?? input.parentId.replace(/^(stanton|pyro)-/, ''), currentSequence, input.orbital)
    }));
  }

  const roman = { I: '1', II: '2', III: '3' };
  [
    ['Attritus', 'stanton-crusader-daymar', 'Daymar', 'stanton', 'crusader'],
    ['Lamina', 'stanton-crusader-daymar', 'Daymar', 'stanton', 'crusader'],
    ['Ruptura', 'stanton-hurston-aberdeen', 'Aberdeen', 'stanton', 'hurston'],
    ['Vivere', 'stanton-hurston-aberdeen', 'Aberdeen', 'stanton', 'hurston']
  ].forEach(([family, parentId, contextName, systemId, bodyId]) => {
    ['I', 'II', 'III'].forEach((index) => addOperational({
      id: `${parentId}-${slug(`${family} PAF-${index}`)}`,
      name: `${family} PAF-${index}`,
      contextName,
      parentId,
      facilityClass: 'planetary-alignment-facility',
      aliases: [`${family.toLowerCase()} paf ${index.toLowerCase()}`, `${family.toLowerCase()} paf ${roman[index]}`, `${family.toLowerCase()} paf-${roman[index]}`],
      systemId,
      bodyId,
      distanceGroupId: parentId.replace(/^stanton-/, '')
    }));
    addOperational({
      id: `${parentId}-${slug(`${family} OLP`)}`,
      type: 'orbital-station',
      name: `${family} OLP`,
      contextName: `${contextName} orbit`,
      parentId,
      facilityClass: 'orbital-laser-platform',
      aliases: [`${family.toLowerCase()} orbital laser platform`],
      systemId,
      bodyId,
      distanceGroupId: `${parentId.replace(/^stanton-/, '')}-${family.toLowerCase()}-olp`,
      orbital: true
    });
  });

  addOperational({ id: 'stanton-hurston-reclamation-disposal-orinth', name: 'Reclamation & Disposal Orinth', contextName: 'Hurston', parentId: 'stanton-hurston', facilityClass: 'salvage-yard', aliases: ['reclamation and disposal orinth', 'orinth', 'r&d orinth'], systemId: 'stanton', bodyId: 'hurston' });
  addOperational({ id: 'pyro-pyro-i-rustville', name: 'Rustville', contextName: 'Pyro I', parentId: 'pyro-pyro-i', facilityClass: 'pyro-outpost-serviced', aliases: ['pyro i rustville', 'pyro 1 rustville'], systemId: 'pyro', bodyId: 'pyro-i' });
  addOperational({ id: 'pyro-bloom-shepherds-rest', name: "Shepherd's Rest", contextName: 'Bloom / Pyro III', parentId: 'pyro-bloom', facilityClass: 'pyro-outpost', aliases: ['shepherds rest', 'pyro iii shepherds rest'], systemId: 'pyro', bodyId: 'bloom' });
  addOperational({ id: 'pyro-pyro-iv-fallow-field', name: 'Fallow Field', contextName: 'Pyro IV', parentId: 'pyro-pyro-iv', facilityClass: 'pyro-outpost', aliases: ['pyro iv fallow field', 'pyro 4 fallow field'], systemId: 'pyro', bodyId: 'pyro-iv' });
  addOperational({ id: 'pyro-pyro-v-ignis-ashland', name: 'Ashland', contextName: 'Ignis / Pyro Va', parentId: 'pyro-pyro-v-ignis', facilityClass: 'pyro-outpost', aliases: ['pyro va ashland', 'ignis ashland'], systemId: 'pyro', bodyId: 'pyro-v' });
  addOperational({ id: 'pyro-terminus-last-landings', name: 'Last Landings', contextName: 'Terminus / Pyro VI', parentId: 'pyro-terminus', facilityClass: 'pyro-outpost-serviced', aliases: ['pyro vi last landings', 'terminus last landings'], systemId: 'pyro', bodyId: 'terminus' });

  const sources = deepFreeze([...base.sources, source]);
  const locations = deepFreeze([...base.locations, ...hierarchyLocations, ...operational]);
  const fieldLocations = deepFreeze([...(base.fieldLocations ?? []), ...operational]);
  const byId = new Map(locations.map((location) => [location.id, location]));
  const sourceById = new Map(sources.map((item) => [item.id, item]));
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
    return [location.name, location.contextName, location.navigationTarget, ...(location.aliases ?? []), parentNames.join(' '), `${parentNames.at(-1) ?? ''} ${location.name}`, `${getSystemForLocation(location.id)?.name ?? ''} ${location.name}`]
      .filter(Boolean).map(base.normalizeSearchTerm).filter(Boolean);
  }
  function scoreLocation(location, query) {
    const normalizedQuery = base.normalizeSearchTerm(query);
    if (!normalizedQuery) return 1;
    const queryTokens = normalizedQuery.split(' ');
    return searchableValues(location).reduce((best, candidate) => {
      if (candidate === normalizedQuery) return Math.max(best, 120);
      if (candidate.startsWith(normalizedQuery)) return Math.max(best, 90);
      if (candidate.includes(normalizedQuery)) return Math.max(best, 65);
      const tokens = new Set(candidate.split(' '));
      return queryTokens.every((token) => tokens.has(token)) ? Math.max(best, 50) : best;
    }, 0);
  }
  function searchOperationalLocations(query, options = {}) {
    const limit = Number.isFinite(options.limit) ? Math.max(1, Number(options.limit)) : Infinity;
    return locations.filter((location) => location.operational)
      .map((location) => ({ location, score: scoreLocation(location, query) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || formatOperationalLabel(left.location).localeCompare(formatOperationalLabel(right.location)))
      .slice(0, limit).map((item) => item.location);
  }
  function getCoverageSummary() {
    const bySystem = {};
    locations.filter((location) => location.operational).forEach((location) => {
      const systemId = getSystemForLocation(location.id)?.id;
      if (systemId) bySystem[systemId] = (bySystem[systemId] ?? 0) + 1;
    });
    return deepFreeze({ totalRecords: locations.length, operationalDestinations: locations.filter((location) => location.operational).length, fieldDestinations: fieldLocations.length, bySystem, reviewedAt: REVIEWED_AT, gameVersion: GAME_VERSION });
  }
  function validateCatalog() {
    const errors = [];
    const warnings = [];
    const terms = new Map();
    if (new Set(locations.map((location) => location.id)).size !== locations.length) errors.push('Location ids must be unique.');
    locations.forEach((location) => {
      if (location.parentId && !byId.has(location.parentId)) errors.push(`${location.id} references missing parent ${location.parentId}`);
      (location.sourceIds ?? []).forEach((sourceId) => { if (!sourceById.has(sourceId)) errors.push(`${location.id} references missing source ${sourceId}`); });
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

  const snapshot = deepFreeze({ ...base.snapshot, schemaVersion: 4, reviewedAt: REVIEWED_AT, coverage: getCoverageSummary(), note: 'Expanded hauling registry including Hathor PAF/OLP sites, Orinth and representative Pyro contract outposts. Geometry remains schematic.' });
  const validation = validateCatalog();
  const api = deepFreeze({
    ...base,
    snapshot,
    sources,
    locations,
    fieldLocations,
    contractLocations: deepFreeze(operational),
    validation,
    getLocation,
    getLocationPath,
    getSystemForLocation,
    getSystemRecord: (id) => systemById.get(id) ?? null,
    getSource: (id) => sourceById.get(id) ?? null,
    formatOperationalLabel,
    formatLocationPath,
    searchOperationalLocations,
    getCoverageSummary,
    validateCatalog
  });

  root.SCCompanionLocations = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
