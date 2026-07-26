'use strict';

(function extendContractProfiles(root) {
  const catalog = root.SCCompanionLocations
    ?? (typeof require !== 'undefined' ? require('./location-contract-extension.js') : null);
  const baseProfiles = root.SCCompanionLocationProfiles
    ?? (typeof require !== 'undefined' ? require('./location-field-profiles.js') : null);
  if (!catalog || !baseProfiles) throw new Error('Contract locations and field profiles must load before location-contract-profiles.js');

  const REVIEWED_AT = '2026-07-26';
  const GAME_VERSION = 'Alpha 4.9.x';
  const ids = Object.keys(baseProfiles.SERVICE_LABELS);

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }

  function service(id, status, detail) {
    return freeze({ id, label: baseProfiles.SERVICE_LABELS[id], status, detail });
  }

  function services(overrides = {}) {
    const defaults = {
      hangars: ['unverified', 'Landing access exists for contract operations, but pad or hangar type is not reviewed.'],
      'landing-services': ['unverified', 'Fuel, repair and rearm availability is not verified.'],
      food: ['not-available', 'No reviewed public food or drink service is registered.'],
      medical: ['not-available', 'No reviewed public clinic or respawn service is registered.'],
      accommodation: ['not-available', 'No reviewed public habitation service is registered.'],
      transit: ['not-available', 'No local public transit service is registered.'],
      'cargo-center': ['limited', 'Mission cargo access is available; a full public cargo deck is not assumed.'],
      refinery: ['not-available', 'No player refinery service is registered.'],
      'ship-market': ['not-available', 'No public ship sales or rental service is registered.'],
      'ground-vehicles': ['unverified', 'Ground-vehicle retrieval is not verified for this facility.'],
      'commodity-trade': ['unverified', 'Open commodity trading is not verified.'],
      'illegal-trade': ['unverified', 'Unregulated trade access is not verified.']
    };
    return freeze(ids.map((id) => service(id, ...(overrides[id] ?? defaults[id] ?? ['unavailable-data', 'No reviewed record is available.']))));
  }

  const source = freeze({
    id: 'scwiki-contract-destinations-4-9',
    label: 'Reviewed hauling-contract destination snapshot',
    url: 'https://starcitizen.tools/Category:Locations',
    kind: 'reviewed-community-game-data'
  });

  function pafProfile(location) {
    return freeze({
      locationId: location.id,
      classification: 'Planetary alignment facility',
      dataStatus: 'community-reviewed',
      gameVersion: GAME_VERSION,
      lastReviewed: REVIEWED_AT,
      traffic: { level: 'normal', live: false, note: 'Contract-activity guidance only; not live traffic.' },
      risk: {
        level: 'elevated',
        label: 'Exposed industrial surface facility',
        jurisdiction: 'Stanton corporate jurisdiction',
        armistice: 'Protection status at the operating area is not treated as guaranteed',
        commArray: 'Regional comm coverage depends on the active array',
        factors: ['Surface approach and loading leave the ship exposed.', 'No public medical or habitation fallback is registered.', 'Facility activity can concentrate contract traffic.'],
        note: 'Static reviewed guidance; current players and hostiles are unknown.', live: false, sourceKind: 'reviewed-static-location-guidance'
      },
      services: services({
        hangars: ['limited', 'Contract landing access is available; enclosed public hangars are not assumed.'],
        'landing-services': ['not-available', 'No reviewed public fuel, repair or rearm service is registered.'],
        'ground-vehicles': ['not-available', 'No reviewed public ground-vehicle retrieval service is registered.'],
        'commodity-trade': ['not-available', 'This is a contract facility, not a reviewed public commodity market.']
      }),
      sources: [source]
    });
  }

  function olpProfile(location) {
    return freeze({
      locationId: location.id,
      classification: 'Orbital laser platform',
      dataStatus: 'community-reviewed',
      gameVersion: GAME_VERSION,
      lastReviewed: REVIEWED_AT,
      traffic: { level: 'normal', live: false, note: 'Contract-platform guidance only; not live traffic.' },
      risk: {
        level: 'elevated', label: 'Exposed orbital industrial platform', jurisdiction: 'Stanton corporate jurisdiction',
        armistice: 'Local protection is not treated as a full station armistice zone', commArray: 'Regional comm coverage depends on the active array',
        factors: ['The platform is an industrial objective rather than a serviced station.', 'Approach and cargo transfer can remain exposed.', 'No public medical fallback is registered.'],
        note: 'Static reviewed guidance; current players and hostiles are unknown.', live: false, sourceKind: 'reviewed-static-location-guidance'
      },
      services: services({
        hangars: ['limited', 'Contract docking or landing access is available; public hangar facilities are not assumed.'],
        'landing-services': ['not-available', 'No reviewed public fuel, repair or rearm service is registered.'],
        'cargo-center': ['limited', 'Contract cargo transfer is supported; this is not a public freight station.'],
        'ground-vehicles': ['not-available', 'Ground vehicles are not applicable to the orbital platform.'],
        'commodity-trade': ['not-available', 'No reviewed public commodity market is registered.']
      }),
      sources: [source]
    });
  }

  function orinthProfile(location) {
    return freeze({
      locationId: location.id,
      classification: 'Unregulated salvage yard', dataStatus: 'community-reviewed', gameVersion: GAME_VERSION, lastReviewed: REVIEWED_AT,
      traffic: { level: 'volatile', live: false, note: 'Outlaw-site guidance only; not live traffic.' },
      risk: {
        level: 'high', label: 'High-risk unregulated salvage site', jurisdiction: 'Limited corporate enforcement',
        armistice: 'No protected landing assumption', commArray: 'Regional comm coverage may vary',
        factors: ['The salvage yard is isolated and unregulated.', 'Surface loading leaves the ship exposed.', 'No public medical or habitation fallback is registered.'],
        note: 'Static reviewed guidance; current players and hostiles are unknown.', live: false, sourceKind: 'reviewed-static-location-guidance'
      },
      services: services({
        hangars: ['limited', 'Surface landing space is available; enclosed hangars are not assumed.'],
        'landing-services': ['not-available', 'No reviewed public fuel, repair or rearm service is registered.'],
        'illegal-trade': ['unregulated', 'The location is associated with unregulated salvage and contract activity.'],
        'commodity-trade': ['limited', 'Contract or local terminals may be present; ordinary regulated trade is not assumed.']
      }),
      sources: [source]
    });
  }

  function pyroProfile(location) {
    const serviced = location.facilityClass === 'pyro-outpost-serviced';
    return freeze({
      locationId: location.id,
      classification: serviced ? 'Serviced Pyro settlement' : 'Pyro surface settlement',
      dataStatus: 'community-reviewed', gameVersion: GAME_VERSION, lastReviewed: REVIEWED_AT,
      traffic: { level: 'volatile', live: false, note: 'Pyro settlement guidance only; not live traffic.' },
      risk: {
        level: 'extreme', label: 'Extreme unregulated Pyro exposure', jurisdiction: 'No dependable UEE enforcement',
        armistice: 'No protected approach or exterior safety assumption', commArray: 'Dependable communication coverage is not assumed',
        factors: ['Pyro has no dependable system-wide law enforcement.', 'Approach and cargo transfer can attract hostile player activity.', 'Medical and repair fallback may require another destination.'],
        note: 'Static destination guidance; current shard activity is unknown.', live: false, sourceKind: 'reviewed-static-location-guidance'
      },
      services: services({
        hangars: ['limited', 'Settlement landing access is available; enclosed hangars are not assumed.'],
        'landing-services': serviced ? ['limited', 'Some settlement support may exist, but fuel, repair and rearm availability must be checked in game.'] : ['unverified', 'Fuel, repair and rearm availability is not verified.'],
        food: serviced ? ['limited', 'Basic settlement supplies may exist; public availability is not guaranteed.'] : ['unverified', 'Food and drink availability is not verified.'],
        medical: ['unverified', 'Medical treatment and respawn availability is not verified.'],
        accommodation: ['unverified', 'Habitation access is not verified.'],
        'illegal-trade': ['unregulated', 'Trade and contract activity occurs without dependable regulated-market protection.'],
        'commodity-trade': ['limited', 'Contract terminals may be available; open-market coverage is not guaranteed.']
      }),
      sources: [source]
    });
  }

  const replacements = new Map((catalog.contractLocations ?? []).map((location) => {
    if (location.facilityClass === 'planetary-alignment-facility') return [location.id, pafProfile(location)];
    if (location.facilityClass === 'orbital-laser-platform') return [location.id, olpProfile(location)];
    if (location.facilityClass === 'salvage-yard') return [location.id, orinthProfile(location)];
    return [location.id, pyroProfile(location)];
  }));

  const profiles = freeze([
    ...baseProfiles.profiles.filter((profile) => !replacements.has(profile.locationId)),
    ...replacements.values()
  ]);
  const byLocationId = new Map(profiles.map((profile) => [profile.locationId, profile]));
  const getProfile = (locationId) => byLocationId.get(locationId) ?? null;
  const getService = (profile, serviceId) => profile?.services.find((item) => item.id === serviceId) ?? null;
  const coverage = freeze({
    operationalDestinations: catalog.locations.filter((location) => location.operational).length,
    reviewedProfiles: profiles.length,
    fieldProfiles: baseProfiles.fieldProfiles?.length ?? 0,
    contractProfiles: replacements.size,
    complete: profiles.length === catalog.locations.filter((location) => location.operational).length,
    gameVersion: GAME_VERSION,
    reviewedAt: REVIEWED_AT
  });

  const api = freeze({ ...baseProfiles, profiles, coverage, contractProfiles: freeze([...replacements.values()]), getProfile, getService });
  root.SCCompanionLocationProfiles = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));