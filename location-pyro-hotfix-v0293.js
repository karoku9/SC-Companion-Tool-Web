'use strict';

(function extendPyroContractLocations(root) {
  const base = root.SCCompanionLocations
    ?? (typeof require !== 'undefined' ? require('./location-field-registry.js') : null);
  if (!base) throw new Error('Extended location registry must load before the Pyro hotfix.');

  const REVIEWED_AT = '2026-07-27';
  const GAME_VERSION = 'Alpha 4.9.x';
  const SOURCE_ID = 'scwiki-contract-destinations-4-9';

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  const additions = deepFreeze([
    {
      id: 'pyro-pyro-iv-chawlas-beach',
      type: 'outpost',
      facilityClass: 'pyro-outpost-serviced',
      name: "Chawla's Beach",
      contextName: 'Pyro IV',
      parentId: 'pyro',
      operational: true,
      navigationTarget: "Chawla's Beach",
      aliases: [
        "chawla's beach", 'chawlas beach', 'chawla beach', 'chawlasbeach',
        "chawla's beach pyro", 'chawlas beach pyro', 'pyro iv chawlas beach', 'pyro 4 chawlas beach'
      ],
      sourceStatus: 'reviewed-community-current',
      sourceIds: [SOURCE_ID],
      gameVersion: GAME_VERSION,
      lastVerified: REVIEWED_AT,
      anchor: {
        systemId: 'pyro', bodyId: 'pyro-iv', offset: [-4.2, 2.4, 5],
        distanceOffsetGm: [-0.17, 0.1, 0.05], geometryStatus: 'schematic-surface-anchor',
        distanceGroupId: 'pyro-iv-chawlas-beach'
      }
    },
    {
      id: 'pyro-vatra-seers-canyon',
      type: 'outpost',
      facilityClass: 'pyro-outpost-serviced',
      name: "Seer's Canyon",
      contextName: 'Vatra / Pyro Vb',
      parentId: 'pyro',
      operational: true,
      navigationTarget: "Seer's Canyon",
      aliases: [
        "seer's canyon", 'seers canyon', 'seer canyon', 'seerscanyon',
        "seer's canyon pyro", 'seers canyon pyro', 'vatra seers canyon', 'pyro vb seers canyon', 'pyro 5b seers canyon'
      ],
      sourceStatus: 'reviewed-community-current',
      sourceIds: [SOURCE_ID],
      gameVersion: GAME_VERSION,
      lastVerified: REVIEWED_AT,
      anchor: {
        systemId: 'pyro', bodyId: 'pyro-v', offset: [4.2, -2.4, 5],
        distanceOffsetGm: [0.17, -0.1, 0.05], geometryStatus: 'schematic-surface-anchor',
        distanceGroupId: 'vatra-seers-canyon'
      }
    }
  ]);

  const locations = deepFreeze([...base.locations.filter((location) => !additions.some((item) => item.id === location.id)), ...additions]);
  const fieldLocations = deepFreeze([...(base.fieldLocations ?? []).filter((location) => !additions.some((item) => item.id === location.id)), ...additions]);
  const byId = new Map(locations.map((location) => [location.id, location]));

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
    return [
      location.name, location.contextName, location.navigationTarget, ...(location.aliases ?? []),
      parentNames.join(' '), `${parentNames.at(-1) ?? ''} ${location.name}`,
      `${getSystemForLocation(location.id)?.name ?? ''} ${location.name}`
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
  function getCoverageSummary() {
    const previous = base.getCoverageSummary?.() ?? {};
    const bySystem = { ...(previous.bySystem ?? {}) };
    bySystem.pyro = (bySystem.pyro ?? 0) + additions.length;
    return deepFreeze({
      ...previous,
      totalRecords: locations.length,
      operationalDestinations: locations.filter((location) => location.operational).length,
      fieldDestinations: fieldLocations.length,
      bySystem,
      reviewedAt: REVIEWED_AT,
      gameVersion: GAME_VERSION
    });
  }
  function validateCatalog() {
    const errors = [];
    if (new Set(locations.map((location) => location.id)).size !== locations.length) errors.push('Location ids must be unique.');
    additions.forEach((location) => {
      if (!byId.has(location.parentId)) errors.push(`${location.id} references missing parent ${location.parentId}`);
      const system = base.getSystemRecord(location.anchor.systemId);
      if (!system?.bodies.some((body) => body.id === location.anchor.bodyId)) errors.push(`${location.id} references missing anchor body ${location.anchor.bodyId}`);
    });
    return deepFreeze({ errors, warnings: [] });
  }

  const validation = validateCatalog();
  const snapshot = deepFreeze({
    ...base.snapshot,
    schemaVersion: Math.max(5, Number(base.snapshot?.schemaVersion ?? 0)),
    reviewedAt: REVIEWED_AT,
    coverage: getCoverageSummary(),
    note: `${base.snapshot?.note ?? ''} Pyro contract hotfix adds Chawla's Beach and Seer's Canyon.`.trim()
  });
  const api = deepFreeze({
    ...base,
    snapshot,
    locations,
    fieldLocations,
    validation,
    getLocation,
    getLocationPath,
    getSystemForLocation,
    formatOperationalLabel,
    formatLocationPath,
    searchOperationalLocations,
    getCoverageSummary,
    validateCatalog
  });

  root.SCCompanionLocations = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
