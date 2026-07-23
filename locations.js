'use strict';

(function exposeLocationModel(root) {
  const REVIEWED_AT = '2026-07-23';
  const GAME_VERSION = 'Alpha 4.9.x';
  const COMMUNITY_BUILD = '4.9.0-LIVE.12232306';

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  const sources = deepFreeze([
    ['rsi-alpha-4-9', 'RSI Patch Notes — Star Citizen Alpha 4.9', 'https://robertsspaceindustries.com/en/patch-notes', 'official-live-version', 'official'],
    ['rsi-stanton', 'RSI Galactic Guide — Stanton System', 'https://robertsspaceindustries.com/en/comm-link/spectrum-dispatch/13141-Galactic-Guide-Stanton-System', 'official-universe-reference', 'official'],
    ['rsi-pyro', 'RSI Galactapedia — Pyro System', 'https://robertsspaceindustries.com/galactapedia/article/0ODxJM917N-pyro-system', 'official-universe-reference', 'official'],
    ['rsi-nyx', 'RSI Galactapedia — Nyx System', 'https://robertsspaceindustries.com/galactapedia/article/0jGxP6kpG3-nyx-system', 'official-universe-reference', 'official'],
    ['rsi-alpha-4-4-nyx', 'RSI Patch Notes — Alpha 4.4.0 Nyx and jump points', 'https://robertsspaceindustries.com/en/comm-link/Patch-Notes/20899-Star-Citizen-Alpha-440', 'official-release-notes', 'official'],
    ['rsi-checkmate', 'RSI Galactapedia — Checkmate Station', 'https://robertsspaceindustries.com/galactapedia/article/RPDeA41EZX-checkmate-station', 'official-location-reference', 'official'],
    ['rsi-ruin', 'RSI Galactapedia — Terminus / Ruin Station', 'https://robertsspaceindustries.com/galactapedia/article/RAXv9kpk5m-terminus-pyro-vi', 'official-location-reference', 'official'],
    ['rsi-orbituary', 'RSI Alpha 4.6 Patch Notes — Checkmate, Orbituary and Ruin stations', 'https://robertsspaceindustries.com/comm-link/Patch-Notes/20969-Star-Citizen-Alpha-46', 'official-release-notes', 'official'],
    ['rsi-levski', 'RSI Galactapedia — Levski', 'https://robertsspaceindustries.com/galactapedia/article/0dXQqBMAOp-levski', 'official-location-reference', 'official'],
    ['scwiki-stanton-4-9', 'Star Citizen Wiki API — Stanton location snapshot', 'https://api.star-citizen.wiki/locations/stanton', 'reviewed-community-game-data', 'community', COMMUNITY_BUILD],
    ['sctools-stanton-2026', 'Star Citizen Wiki — Stanton system locations', 'https://starcitizen.tools/Stanton', 'reviewed-community-reference', 'community']
  ].map(([id, label, url, kind, authority, gameVersion = GAME_VERSION]) => ({ id, label, url, kind, authority, gameVersion, reviewedAt: REVIEWED_AT })));

  const systems = deepFreeze([
    {
      id: 'stanton', name: 'Stanton', position: [-72, 8, -18], classification: 'Corporate system',
      security: 'UEE / corporate jurisdiction', availability: 'Playable', sourceKind: 'official-current',
      sourceIds: ['rsi-stanton', 'rsi-alpha-4-9'], navigationRadiusGm: 145,
      bodies: [
        ['stanton-star', 'Stanton', 'star', 0, 0, 0, 13],
        ['hurston', 'Hurston', 'planet', 32, 32, -24, 6],
        ['crusader', 'Crusader', 'gas-giant', 54, 54, 56, 9],
        ['arccorp', 'ArcCorp', 'planet', 76, 76, 151, 6],
        ['microtech', 'microTech', 'planet', 103, 103, 248, 7]
      ]
    },
    {
      id: 'pyro', name: 'Pyro', position: [8, -12, 18], classification: 'Unclaimed flare-star system',
      security: 'High outlaw activity', availability: 'Playable', sourceKind: 'official-current',
      sourceIds: ['rsi-pyro', 'rsi-alpha-4-9'], navigationRadiusGm: 150,
      bodies: [
        ['pyro-star', 'Pyro', 'flare-star', 0, 0, 0, 15],
        ['pyro-i', 'Pyro I', 'planet', 24, 24, 18, 4],
        ['monox', 'Monox', 'planet', 40, 40, 88, 5],
        ['bloom', 'Bloom', 'planet', 58, 58, 154, 5],
        ['pyro-iv', 'Pyro IV', 'planet', 76, 76, 214, 4],
        ['pyro-v', 'Pyro V', 'gas-giant', 96, 96, 272, 10],
        ['terminus', 'Terminus', 'planet', 122, 122, 329, 6]
      ]
    },
    {
      id: 'nyx', name: 'Nyx', position: [80, 18, -6], classification: 'Unclaimed frontier system',
      security: 'People’s Alliance influence; frontier risk', availability: 'Playable', sourceKind: 'official-current',
      sourceIds: ['rsi-nyx', 'rsi-alpha-4-4-nyx', 'rsi-alpha-4-9'], navigationRadiusGm: 130,
      bodies: [
        ['nyx-star', 'Nyx', 'star', 0, 0, 0, 14],
        ['nyx-i', 'Nyx I', 'planet', 32, 32, 34, 5],
        ['nyx-ii', 'Nyx II', 'planet', 57, 57, 143, 5],
        ['nyx-iii', 'Nyx III', 'ice-giant', 84, 84, 261, 8],
        ['glaciem-ring', 'Glaciem Ring', 'asteroid-belt', 111, 111, 0, 0],
        ['delamar', 'Delamar / Levski', 'asteroid-settlement', 111, 111, 204, 5]
      ]
    }
  ].map((system) => ({
    ...system,
    position: Object.freeze(system.position),
    bodies: Object.freeze(system.bodies.map(([id, name, type, radius, distanceRadiusGm, angle, size]) =>
      Object.freeze({ id, name, type, radius, distanceRadiusGm, angle, size })))
  })));

  const connections = deepFreeze([
    { id: 'stanton-pyro', from: 'stanton', to: 'pyro', status: 'active', label: 'Stanton ↔ Pyro', sourceIds: ['rsi-pyro', 'rsi-alpha-4-4-nyx'] },
    { id: 'pyro-nyx', from: 'pyro', to: 'nyx', status: 'active', label: 'Pyro ↔ Nyx', sourceIds: ['rsi-pyro', 'rsi-alpha-4-4-nyx'] },
    { id: 'stanton-nyx', from: 'stanton', to: 'nyx', status: 'active-placeholder', label: 'Stanton ↔ Nyx', sourceIds: ['rsi-alpha-4-4-nyx'], note: 'Current in-game connection is documented by CIG as a placeholder.' }
  ]);

  const locations = [];
  const add = (input) => locations.push({
    operational: false,
    aliases: [],
    sourceStatus: 'official-current',
    sourceIds: [],
    lastVerified: REVIEWED_AT,
    gameVersion: GAME_VERSION,
    ...input
  });
  const mapAnchor = (systemId, bodyId, offset, distanceOffsetGm, geometryStatus, distanceGroupId = bodyId) => ({
    systemId, bodyId, offset, distanceOffsetGm, geometryStatus, distanceGroupId
  });

  add({ id: 'stanton', type: 'system', name: 'Stanton', parentId: null, aliases: ['stanton system'], sourceIds: ['rsi-stanton', 'rsi-alpha-4-9'] });
  [
    ['hurston', 'Hurston', ['hurston planet']],
    ['crusader', 'Crusader', ['crusader planet']],
    ['arccorp', 'ArcCorp', ['arc corp', 'arccorp planet']],
    ['microtech', 'microTech', ['micro tech', 'microtech planet']]
  ].forEach(([id, name, aliases]) => add({ id: `stanton-${id}`, type: 'planet', name, parentId: 'stanton', aliases, sourceIds: ['rsi-stanton'] }));

  const moons = {
    hurston: [['aberdeen', 'Aberdeen'], ['arial', 'Arial'], ['ita', 'Ita'], ['magda', 'Magda']],
    crusader: [['cellin', 'Cellin'], ['daymar', 'Daymar'], ['yela', 'Yela']],
    arccorp: [['lyria', 'Lyria'], ['wala', 'Wala']],
    microtech: [['calliope', 'Calliope'], ['clio', 'Clio'], ['euterpe', 'Euterpe']]
  };
  Object.entries(moons).forEach(([planet, entries]) => entries.forEach(([id, name]) => add({
    id: `stanton-${planet}-${id}`, type: 'moon', name, parentId: `stanton-${planet}`,
    aliases: [name.toLowerCase(), `${name.toLowerCase()} moon`], sourceIds: ['rsi-stanton']
  })));

  [
    ['hurston', 'lorville', 'Lorville', 'teasa', 'Teasa Spaceport',
      ['lorville city', 'lorville landing zone'], ['teasa', 'taesa', 'teasa spaceport', 'lorville', 'lorville spaceport', 'hurston lorville'], 'hurston', [0, 0, 8], [0, 0, 0.08]],
    ['crusader', 'orison', 'Orison', 'august-dunlow', 'August Dunlow Spaceport',
      ['orison city', 'orison landing zone'], ['orison', 'august dunlow', 'august dunlow spaceport', 'orison spaceport', 'crusader orison'], 'crusader', [0, 0, 10], [0, 0, 0.1]],
    ['arccorp', 'area18', 'Area18', 'riker', 'Riker Memorial Spaceport',
      ['area 18', 'area18 city'], ['area18', 'area 18', 'riker', 'riker memorial', 'riker memorial spaceport', 'area18 spaceport'], 'arccorp', [0, 0, 8], [0, 0, 0.08]],
    ['microtech', 'new-babbage', 'New Babbage', 'nbis', 'New Babbage Interstellar Spaceport',
      ['new babbage city', 'new babbage landing zone', 'nb'], ['new babbage', 'new babbage spaceport', 'nbis', 'new babbage interstellar', 'microtech new babbage'], 'microtech', [0, 0, 9], [0, 0, 0.09]]
  ].forEach(([planet, cityId, cityName, portId, portName, cityAliases, portAliases, bodyId, offset, distanceOffset]) => {
    const cityFullId = `stanton-${planet}-${cityId}`;
    add({ id: cityFullId, type: 'landing-zone', name: cityName, parentId: `stanton-${planet}`, aliases: cityAliases, sourceIds: ['rsi-stanton', 'scwiki-stanton-4-9'] });
    add({
      id: `${cityFullId}-${portId}`, type: 'spaceport', name: portName, contextName: cityName, parentId: cityFullId,
      operational: true, navigationTarget: cityName, aliases: portAliases, sourceStatus: 'reviewed-community-current',
      sourceIds: ['rsi-stanton', 'scwiki-stanton-4-9', 'sctools-stanton-2026'],
      anchor: mapAnchor('stanton', bodyId, offset, distanceOffset, 'parent-verified-schematic-offset')
    });
  });

  [
    ['hurston', 'everus', 'Everus Harbor', ['everus', 'everus harbor', 'hurston orbital', 'hurston station'], 'Hurston', 'hurston', [5, 2, 12], [0.08, 0.03, 0.12]],
    ['crusader', 'seraphim', 'Seraphim Station', ['seraphim', 'seraphim station', 'crusader orbital', 'orison orbital'], 'Crusader', 'crusader', [-5, 2, 13], [-0.08, 0.03, 0.13]],
    ['arccorp', 'baijini', 'Baijini Point', ['baijini', 'baijini point', 'arc corp orbital', 'arccorp orbital'], 'ArcCorp', 'arccorp', [5, 2, 12], [0.08, 0.03, 0.12]],
    ['microtech', 'port-tressler', 'Port Tressler', ['port tressler', 'tressler', 'microtech orbital', 'new babbage orbital'], 'microTech', 'microtech', [-5, 2, 13], [-0.08, 0.03, 0.13]]
  ].forEach(([planet, id, name, aliases, contextName, bodyId, offset, distanceOffset]) => add({
    id: `stanton-${planet}-${id}`, type: 'orbital-station', name, contextName, parentId: `stanton-${planet}`,
    operational: true, navigationTarget: name, aliases, sourceStatus: 'reviewed-community-current',
    sourceIds: ['scwiki-stanton-4-9', 'sctools-stanton-2026'], gameVersion: COMMUNITY_BUILD,
    anchor: mapAnchor('stanton', bodyId, offset, distanceOffset, 'parent-verified-schematic-offset')
  }));

  add({
    id: 'stanton-crusader-yela-grim-hex', type: 'asteroid-station', name: 'Grim HEX', contextName: 'Yela / Crusader', parentId: 'stanton-crusader-yela',
    operational: true, navigationTarget: 'Grim HEX', aliases: ['grim hex', 'grimhex', 'grim hex station', 'green imperial housing exchange'],
    sourceStatus: 'reviewed-community-current', sourceIds: ['scwiki-stanton-4-9', 'sctools-stanton-2026'], gameVersion: COMMUNITY_BUILD,
    anchor: mapAnchor('stanton', 'crusader', [5, -2, 10], [0.06, -0.02, 0.1], 'parent-verified-schematic-offset', 'yela')
  });

  const lagrangeStations = [
    ['ARC-L1', 'Wide Forest Station', 'wide-forest', ['wide forest']],
    ['ARC-L2', 'Lively Pathway Station', 'lively-pathway', ['lively pathway', 'lively']],
    ['ARC-L3', 'Modern Express Station', 'modern-express', ['modern express']],
    ['ARC-L4', 'Faint Glen Station', 'faint-glen', ['faint glen']],
    ['ARC-L5', 'Yellow Core Station', 'yellow-core', ['yellow core']],
    ['HUR-L1', 'Green Glade Station', 'green-glade', ['green glade']],
    ['HUR-L2', 'Faithful Dream Station', 'faithful-dream', ['faithful dream']],
    ['HUR-L3', 'Thundering Express Station', 'thundering-express', ['thundering express']],
    ['HUR-L4', 'Melodic Fields Station', 'melodic-fields', ['melodic fields']],
    ['HUR-L5', 'High Course Station', 'high-course', ['high course']],
    ['CRU-L1', 'Ambitious Dream Station', 'ambitious-dream', ['ambitious dream']],
    ['CRU-L4', 'Shallow Fields Station', 'shallow-fields', ['shallow fields']],
    ['CRU-L5', 'Beautiful Glen Station', 'beautiful-glen', ['beautiful glen']],
    ['MIC-L1', 'Shallow Frontier Station', 'shallow-frontier', ['shallow frontier']],
    ['MIC-L2', 'Long Forest Station', 'long-forest', ['long forest']],
    ['MIC-L3', 'Endless Odyssey Station', 'endless-odyssey', ['endless odyssey']],
    ['MIC-L4', 'Red Crossroads Station', 'red-crossroads', ['red crossroads']],
    ['MIC-L5', 'Modern Icarus Station', 'modern-icarus', ['modern icarus']]
  ];
  const lagrangeBody = { ARC: 'arccorp', HUR: 'hurston', CRU: 'crusader', MIC: 'microtech' };
  const lagrangeDistanceOffset = {
    'ARC-L1': [-7.1, 0, 1.4], 'ARC-L2': [-15.684, 0, -5.3092], 'ARC-L3': [-23.1, 0, -8.2], 'ARC-L4': [8.2, 0, 4.5], 'ARC-L5': [-6.4, 0, -16.7],
    'HUR-L1': [6.2, 0, 2.2], 'HUR-L2': [10.7, 0, -5.1], 'HUR-L3': [13.4, 0, -12.8], 'HUR-L4': [11.8, 0, 10.5], 'HUR-L5': [4.4, 0, -19.4],
    'CRU-L1': [5.9, 0, -1.1], 'CRU-L4': [16.1, 0, -10.8], 'CRU-L5': [-3.5, 0, 13.9],
    'MIC-L1': [4.8, 0, 1.6], 'MIC-L2': [10.1, 0, -5.4], 'MIC-L3': [15.5, 0, -11.9], 'MIC-L4': [-6.4, 0, 8.8], 'MIC-L5': [1.3, 0, -15.2]
  };
  lagrangeStations.forEach(([code, stationName, slug, stationAliases]) => {
    const family = code.slice(0, 3);
    const pointId = `stanton-${code.toLowerCase()}`;
    add({
      id: pointId, type: 'lagrange-point', name: code, parentId: 'stanton',
      aliases: [code.toLowerCase(), code.toLowerCase().replace('-', ' ')],
      sourceStatus: 'reviewed-community-current', sourceIds: ['scwiki-stanton-4-9', 'sctools-stanton-2026'], gameVersion: COMMUNITY_BUILD
    });
    add({
      id: `${pointId}-${slug}`, type: 'lagrange-station', name: `${code} ${stationName}`, contextName: code,
      parentId: pointId, operational: true, navigationTarget: `${code} ${stationName}`,
      aliases: [...stationAliases, code.toLowerCase(), code.toLowerCase().replace('-', ' '), `${code.toLowerCase()} station`, stationName.toLowerCase()],
      sourceStatus: 'reviewed-community-current', sourceIds: ['scwiki-stanton-4-9', 'sctools-stanton-2026'], gameVersion: COMMUNITY_BUILD,
      anchor: mapAnchor('stanton', lagrangeBody[family], [0, 0, 5], lagrangeDistanceOffset[code], 'schematic-lagrange-anchor', code.toLowerCase())
    });
  });

  [
    ['pyro', 'Pyro Gateway', ['pyro gateway', 'stanton pyro gateway', 'pyro jump point station']],
    ['magnus', 'Magnus Gateway', ['magnus gateway', 'stanton magnus gateway', 'magnus jump point station']],
    ['terra', 'Terra Gateway', ['terra gateway', 'stanton terra gateway', 'terra jump point station']]
  ].forEach(([id, name, aliases], index) => add({
    id: `stanton-${id}-gateway`, type: 'jump-gateway', name, contextName: 'Stanton', parentId: 'stanton',
    operational: true, navigationTarget: name, aliases, sourceStatus: 'reviewed-community-current',
    sourceIds: ['scwiki-stanton-4-9', 'sctools-stanton-2026'], gameVersion: COMMUNITY_BUILD,
    anchor: mapAnchor('stanton', 'stanton-star', [0, 0, 6 + index * 3], [110 + index * 8, 0, (index - 1) * 35], 'schematic-gateway-anchor', `${id}-gateway`)
  }));

  add({ id: 'pyro', type: 'system', name: 'Pyro', parentId: null, aliases: ['pyro system'], sourceIds: ['rsi-pyro', 'rsi-alpha-4-9'] });
  add({ id: 'pyro-monox', type: 'planet', name: 'Monox', contextName: 'Pyro II', parentId: 'pyro', aliases: ['monox', 'pyro ii', 'pyro 2'], sourceIds: ['rsi-pyro', 'rsi-checkmate'] });
  add({
    id: 'pyro-monox-checkmate', type: 'orbital-station', name: 'Checkmate Station', contextName: 'Pyro', parentId: 'pyro-monox',
    operational: true, navigationTarget: 'Checkmate Station', aliases: ['checkmate', 'checkmate station', 'checkmate station pyro', 'pyro checkmate'],
    sourceIds: ['rsi-checkmate', 'rsi-alpha-4-9'],
    anchor: mapAnchor('pyro', 'monox', [5, 2, 11], [0.1, 0.04, 0.15], 'parent-verified-schematic-offset')
  });
  add({ id: 'pyro-bloom', type: 'planet', name: 'Bloom', contextName: 'Pyro III', parentId: 'pyro', aliases: ['bloom', 'pyro iii', 'pyro 3'], sourceIds: ['rsi-pyro'] });
  add({
    id: 'pyro-bloom-orbituary', type: 'orbital-station', name: 'Orbituary', contextName: 'Pyro', parentId: 'pyro-bloom',
    operational: true, navigationTarget: 'Orbituary', aliases: ['orbituary', 'orbituary station', 'orbituary pyro', 'pyro orbituary'],
    sourceStatus: 'official-current-location-derived-parent', sourceIds: ['rsi-orbituary', 'rsi-pyro'],
    anchor: mapAnchor('pyro', 'bloom', [-5, 2, 12], [-0.1, 0.04, 0.18], 'parent-derived-schematic-offset')
  });
  add({ id: 'pyro-terminus', type: 'planet', name: 'Terminus', contextName: 'Pyro VI', parentId: 'pyro', aliases: ['terminus', 'pyro vi', 'pyro 6'], sourceIds: ['rsi-ruin', 'rsi-pyro'] });
  add({
    id: 'pyro-terminus-ruin', type: 'orbital-station', name: 'Ruin Station', contextName: 'Pyro', parentId: 'pyro-terminus',
    operational: true, navigationTarget: 'Ruin Station', aliases: ['ruin', 'ruin station', 'ruin station pyro', 'pyro ruin'],
    sourceIds: ['rsi-ruin', 'rsi-orbituary'],
    anchor: mapAnchor('pyro', 'terminus', [5, -2, 12], [0.1, -0.04, 0.18], 'parent-verified-schematic-offset')
  });

  add({ id: 'nyx', type: 'system', name: 'Nyx', parentId: null, aliases: ['nyx system'], sourceIds: ['rsi-nyx', 'rsi-alpha-4-4-nyx'] });
  add({ id: 'nyx-glaciem', type: 'asteroid-belt', name: 'Glaciem Ring', parentId: 'nyx', aliases: ['glaciem', 'glaciem ring'], sourceIds: ['rsi-nyx', 'rsi-alpha-4-4-nyx'] });
  add({ id: 'nyx-delamar', type: 'planetoid', name: 'Delamar', contextName: 'Glaciem Ring', parentId: 'nyx-glaciem', aliases: ['delamar'], sourceIds: ['rsi-levski', 'rsi-nyx'] });
  add({
    id: 'nyx-delamar-levski', type: 'landing-zone', name: 'Levski', contextName: 'Nyx', parentId: 'nyx-delamar',
    operational: true, navigationTarget: 'Levski', aliases: ['levski', 'levski nyx', 'nyx levski', 'delamar levski'],
    sourceIds: ['rsi-levski', 'rsi-alpha-4-4-nyx'],
    anchor: mapAnchor('nyx', 'delamar', [0, 0, 8], [0, 0, 0.1], 'parent-verified-schematic-offset')
  });

  deepFreeze(locations);
  const byId = new Map(locations.map((location) => [location.id, location]));
  const systemById = new Map(systems.map((system) => [system.id, system]));
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  function normalizeSearchTerm(value) {
    return String(value ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

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
    ].filter(Boolean).map(normalizeSearchTerm).filter(Boolean);
  }

  function scoreLocation(location, query) {
    const normalizedQuery = normalizeSearchTerm(query);
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
      [location.name, location.navigationTarget, ...(location.aliases ?? [])].map(normalizeSearchTerm).filter(Boolean).forEach((term) => {
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
      bySystem,
      reviewedAt: REVIEWED_AT,
      gameVersion: GAME_VERSION
    });
  }

  const snapshot = deepFreeze({
    schemaVersion: 2,
    gameVersion: GAME_VERSION,
    reviewedAt: REVIEWED_AT,
    coverage: getCoverageSummary(),
    note: 'Static local-first catalog. Official facts, reviewed community records and schematic geometry remain distinguishable.'
  });
  const validation = validateCatalog();
  const api = deepFreeze({
    snapshot, sources, systems, connections, locations, validation,
    getLocation, getLocationPath, getSystemForLocation,
    getSystemRecord: (id) => systemById.get(id) ?? null,
    getSource: (id) => sourceById.get(id) ?? null,
    formatOperationalLabel, formatLocationPath, searchOperationalLocations,
    normalizeSearchTerm, getCoverageSummary, validateCatalog
  });

  root.SCCompanionLocations = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
