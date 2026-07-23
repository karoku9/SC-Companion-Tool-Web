'use strict';

(function extendLocationProfiles(root) {
  const catalog = root.SCCompanionLocations
    ?? (typeof require !== 'undefined' ? require('./location-field-registry.js') : null);
  const baseProfiles = root.SCCompanionLocationProfiles
    ?? (typeof require !== 'undefined' ? require('./location-profiles.js') : null);
  if (!catalog || !baseProfiles) throw new Error('Field registry and base profiles must load before location-field-profiles.js');

  const REVIEWED_AT = '2026-07-23';
  const GAME_BUILD = '4.9.0-LIVE.12232306';

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }

  function service(id, status, detail) {
    return { id, label: baseProfiles.SERVICE_LABELS[id], status, detail };
  }

  const outpostServices = (outlaw = false) => [
    service('hangars', 'limited', 'Surface landing pads are available; enclosed hangars are not assumed.'),
    service('landing-services', 'available', 'Vehicle-service pads provide fuel, repair and rearm where the facility is operational.'),
    service('food', 'not-available', 'No reviewed public food or drink vendor is registered.'),
    service('medical', 'not-available', 'No reviewed public clinic or respawn facility is registered.'),
    service('accommodation', 'not-available', 'No public habitation service is registered.'),
    service('transit', 'not-available', 'No local transit network is available.'),
    service('cargo-center', 'limited', 'Freight elevators or delivery access support local mission cargo; this is not a full cargo deck.'),
    service('refinery', 'not-available', 'No player refinery deck is registered at the surface facility.'),
    service('ship-market', 'not-available', 'No ship dealership or rental terminal is registered.'),
    service('ground-vehicles', 'available', 'A Platinum Bay or local vehicle pad supports ground-vehicle retrieval at the standard facility archetype.'),
    service('commodity-trade', 'available', 'A local commodity terminal is registered for the facility archetype.'),
    service('illegal-trade', outlaw ? 'unregulated' : 'unverified', outlaw
      ? 'The location is treated as an unregulated or criminally influenced trade site.'
      : 'No reviewed unregulated trade terminal is recorded.')
  ];

  const distributionServices = [
    service('hangars', 'available', 'Large freight hangars and delivery access are available for authorized operations.'),
    service('landing-services', 'available', 'Landing pads provide fuel, repair and rearm support.'),
    service('food', 'limited', 'Employee amenities may exist, but public food access is not treated as guaranteed.'),
    service('medical', 'limited', 'On-site emergency support may exist; a public hospital or respawn service is not guaranteed.'),
    service('accommodation', 'not-available', 'No public habitation service is registered.'),
    service('transit', 'not-available', 'No public local transit network is available.'),
    service('cargo-center', 'available', 'The facility is purpose-built for freight handling, logistics and distribution missions.'),
    service('refinery', 'not-available', 'No player refinery deck is registered.'),
    service('ship-market', 'not-available', 'No public ship dealership or rental terminal is registered.'),
    service('ground-vehicles', 'limited', 'Ground access exists; public vehicle retrieval depends on the individual site.'),
    service('commodity-trade', 'limited', 'Freight and contract terminals are available, but open public commodity trading is not assumed.'),
    service('illegal-trade', 'unverified', 'No reviewed unregulated terminal is recorded.')
  ];

  const outlawNames = new Set(["Bud's Growery", 'Devlin Scrap & Salvage', 'Kudre Ore']);

  function sourceFor(location) {
    return {
      id: `sctools-${location.id}`,
      label: `Star Citizen Wiki — ${location.name}`,
      url: `https://starcitizen.tools/${location.name.replace(/['’]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
      kind: 'reviewed-community-location'
    };
  }

  function outpostRisk(location, outlaw) {
    return {
      level: outlaw ? 'high' : 'elevated',
      label: outlaw ? 'High-risk unregulated surface site' : 'Elevated surface-outpost exposure',
      jurisdiction: outlaw ? 'Unregulated / criminal influence' : 'Corporate or local Stanton jurisdiction',
      armistice: 'Pad-area protection may be limited; exterior safety is not guaranteed',
      commArray: 'Normally covered while the regional comm array is active',
      factors: outlaw
        ? [
            'The site is associated with unregulated trade or criminal activity.',
            'Surface approaches expose the ship before landing and while loading cargo.',
            'No on-site medical or habitation fallback is assumed.'
          ]
        : [
            'The facility is isolated and surface approaches remain exposed.',
            'Landing support and commodity service do not imply a protected perimeter.',
            'No on-site medical or habitation fallback is assumed.'
          ],
      note: 'Static facility assessment; current players, hostiles and comm-array state are unknown.',
      live: false,
      sourceKind: 'reviewed-static-location-guidance'
    };
  }

  function distributionRisk(location) {
    return {
      level: 'elevated',
      label: 'Elevated industrial-site exposure',
      jurisdiction: 'Corporate Stanton jurisdiction',
      armistice: 'Landing support is controlled; exterior and mission interiors may be contested',
      commArray: 'Normally covered while the regional comm array is active',
      factors: [
        'Distribution centers concentrate cargo, contracts and ground activity.',
        'Large exterior footprints and mission interiors can create prolonged exposure.',
        'Access restrictions vary by contract and facility owner.'
      ],
      note: `${location.name} is rated as a static industrial logistics site, not from live hostile activity.`,
      live: false,
      sourceKind: 'reviewed-static-location-guidance'
    };
  }

  const fieldProfiles = catalog.fieldLocations.map((location) => {
    const outlaw = outlawNames.has(location.name);
    const distribution = location.type === 'distribution-center';
    return freeze({
      locationId: location.id,
      classification: distribution ? 'Surface distribution center' : (outlaw ? 'Unregulated surface outpost' : 'Surface industrial or research outpost'),
      dataStatus: 'community-reviewed',
      gameVersion: GAME_BUILD,
      lastReviewed: REVIEWED_AT,
      traffic: {
        level: distribution ? 'high' : 'normal',
        live: false,
        note: distribution
          ? 'Industrial mission-traffic estimate; not live shard telemetry.'
          : 'Isolated surface-facility estimate; not live shard telemetry.'
      },
      risk: distribution ? distributionRisk(location) : outpostRisk(location, outlaw),
      services: distribution ? distributionServices : outpostServices(outlaw),
      sources: [
        sourceFor(location),
        {
          id: 'sctools-stanton-field-4-9',
          label: 'Star Citizen Wiki and 4.9 game-data field-location review',
          url: 'https://starcitizen.tools/List_of_Stanton_locations',
          kind: 'reviewed-community-field-data'
        }
      ]
    });
  });

  const profiles = freeze([...baseProfiles.profiles, ...fieldProfiles]);
  const byLocationId = new Map(profiles.map((profile) => [profile.locationId, profile]));

  function getProfile(locationId) {
    return byLocationId.get(locationId) ?? null;
  }

  function getService(profile, serviceId) {
    return profile?.services.find((item) => item.id === serviceId) ?? null;
  }

  const coverage = freeze({
    operationalDestinations: catalog.locations.filter((location) => location.operational).length,
    reviewedProfiles: profiles.length,
    fieldProfiles: fieldProfiles.length,
    complete: profiles.length === catalog.locations.filter((location) => location.operational).length,
    gameVersion: GAME_BUILD,
    reviewedAt: REVIEWED_AT
  });

  const api = freeze({ ...baseProfiles, profiles, fieldProfiles, coverage, getProfile, getService });
  root.SCCompanionLocationProfiles = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
