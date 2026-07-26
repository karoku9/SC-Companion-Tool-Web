'use strict';

(function extendLocationProfiles(root) {
  const catalog = root.SCCompanionLocations
    ?? (typeof require !== 'undefined' ? require('./location-field-registry.js') : null);
  const baseProfiles = root.SCCompanionLocationProfiles
    ?? (typeof require !== 'undefined' ? require('./location-profiles.js') : null);
  if (!catalog || !baseProfiles) throw new Error('Field registry and base profiles must load before location-field-profiles.js');

  const REVIEWED_AT = '2026-07-26';
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
    service('illegal-trade', outlaw ? 'unregulated' : 'unverified', outlaw ? 'The location is treated as an unregulated or criminally influenced trade site.' : 'No reviewed unregulated trade terminal is recorded.')
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

  const hathorServices = (orbital) => [
    service('hangars', 'limited', orbital ? 'The orbital platform provides mission landing access; public full-service hangars are not assumed.' : 'The planetary facility provides mission landing access; enclosed public hangars are not assumed.'),
    service('landing-services', 'unverified', 'Fuel, repair and rearm availability has not been reviewed as a dependable public service.'),
    service('food', 'not-available', 'No reviewed public food or drink vendor is registered.'),
    service('medical', 'not-available', 'No reviewed public clinic or respawn service is registered.'),
    service('accommodation', 'not-available', 'No public habitation service is registered.'),
    service('transit', 'not-available', 'No public transit network is registered.'),
    service('cargo-center', 'limited', 'Mission cargo access is supported; a normal public cargo deck is not assumed.'),
    service('refinery', 'not-available', 'No player refinery deck is registered.'),
    service('ship-market', 'not-available', 'No ship dealership or rental terminal is registered.'),
    service('ground-vehicles', orbital ? 'not-available' : 'unverified', orbital ? 'Ground vehicles are not applicable to the orbital platform.' : 'Ground-vehicle retrieval has not been verified as a public service.'),
    service('commodity-trade', 'unverified', 'Contract cargo access does not establish an open commodity market.'),
    service('illegal-trade', 'unverified', 'No reviewed unregulated trade terminal is recorded.')
  ];

  const pyroOutpostServices = (serviced) => [
    service('hangars', 'limited', 'Exposed surface pads or local landing areas are available; protected hangars are not assumed.'),
    service('landing-services', serviced ? 'available' : 'unverified', serviced ? 'The settlement is reviewed as offering basic refuel and repair support.' : 'Dependable public refuel, repair and rearm support is not verified.'),
    service('food', serviced ? 'limited' : 'unverified', serviced ? 'Basic settlement supplies may be available.' : 'Public food access is not verified.'),
    service('medical', 'unverified', 'A dependable public clinic or respawn service is not verified.'),
    service('accommodation', 'unverified', 'Public habitation access is not guaranteed.'),
    service('transit', 'not-available', 'No public local transit network is available.'),
    service('cargo-center', 'limited', 'Mission cargo access exists without a protected corporate cargo deck.'),
    service('refinery', 'not-available', 'No player refinery deck is registered.'),
    service('ship-market', 'not-available', 'No public ship dealership or rental terminal is registered.'),
    service('ground-vehicles', 'unverified', 'Ground-vehicle retrieval varies by settlement and is not assumed.'),
    service('commodity-trade', 'limited', 'Local trade may exist, but stock and terminal access are not guaranteed.'),
    service('illegal-trade', 'unregulated', 'The settlement operates in unregulated Pyro trade conditions.')
  ];

  const outlawNames = new Set(["Bud's Growery", 'Devlin Scrap & Salvage', 'Kudre Ore', 'Reclamation & Disposal Orinth']);

  function sourceFor(location) {
    return {
      id: `sctools-${location.id}`,
      label: `Star Citizen Wiki — ${location.name}`,
      url: `https://starcitizen.tools/${location.name.replace(/['’]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
      kind: 'reviewed-community-location'
    };
  }

  function staticRisk(location, level, label, jurisdiction, factors) {
    return {
      level,
      label,
      jurisdiction,
      armistice: jurisdiction.includes('Pyro') || jurisdiction.includes('Unregulated') ? 'Protection is limited and exterior safety is not guaranteed' : 'Pad-area protection may be limited; exterior safety is not guaranteed',
      commArray: jurisdiction.includes('Pyro') ? 'No dependable UEE security coverage' : 'Normally covered while the regional comm array is active',
      factors,
      note: `${location.name} uses static reviewed guidance; current players, hostiles and service state are unknown.`,
      live: false,
      sourceKind: 'reviewed-static-location-guidance'
    };
  }

  function profileShape(location) {
    const facility = location.facilityClass ?? location.type;
    const outlaw = outlawNames.has(location.name);
    if (location.type === 'distribution-center') {
      return {
        classification: 'Surface distribution center',
        services: distributionServices,
        traffic: { level: 'high', live: false, note: 'Industrial mission-traffic estimate; not live shard telemetry.' },
        risk: staticRisk(location, 'elevated', 'Elevated industrial-site exposure', 'Corporate Stanton jurisdiction', ['Distribution centers concentrate cargo, contracts and ground activity.', 'Large exterior footprints and mission interiors can create prolonged exposure.', 'Access restrictions vary by contract and facility owner.'])
      };
    }
    if (facility === 'planetary-alignment-facility' || facility === 'orbital-laser-platform') {
      const orbital = facility === 'orbital-laser-platform';
      return {
        classification: orbital ? 'Hathor orbital laser platform' : 'Hathor planetary alignment facility',
        services: hathorServices(orbital),
        traffic: { level: 'volatile', live: false, note: 'Contested mission-facility estimate; not live shard telemetry.' },
        risk: staticRisk(location, 'high', 'High contested-facility exposure', 'Corporate conflict zone / mission-controlled access', ['The facility is an exposed mission objective rather than a normal public station.', 'Approach and cargo handling can be contested.', 'Public fallback services are limited or unverified.'])
      };
    }
    if (facility.startsWith('pyro-outpost')) {
      const serviced = facility.endsWith('serviced');
      return {
        classification: serviced ? 'Serviced Pyro settlement' : 'Unregulated Pyro surface outpost',
        services: pyroOutpostServices(serviced),
        traffic: { level: 'volatile', live: false, note: 'Pyro settlement activity is volatile; not live shard telemetry.' },
        risk: staticRisk(location, 'extreme', 'Extreme Pyro surface exposure', 'Unregulated Pyro', ['No UEE security response should be assumed.', 'Surface landing and cargo handling remain exposed.', 'Local services do not imply a safe approach or departure.'])
      };
    }
    return {
      classification: outlaw ? 'Unregulated surface outpost' : 'Surface industrial or research outpost',
      services: outpostServices(outlaw),
      traffic: { level: 'normal', live: false, note: 'Isolated surface-facility estimate; not live shard telemetry.' },
      risk: staticRisk(location, outlaw ? 'high' : 'elevated', outlaw ? 'High-risk unregulated surface site' : 'Elevated surface-outpost exposure', outlaw ? 'Unregulated / criminal influence' : 'Corporate or local Stanton jurisdiction', outlaw ? ['The site is associated with unregulated trade or criminal activity.', 'Surface approaches expose the ship before landing and while loading cargo.', 'No on-site medical or habitation fallback is assumed.'] : ['The facility is isolated and surface approaches remain exposed.', 'Landing support and commodity service do not imply a protected perimeter.', 'No on-site medical or habitation fallback is assumed.'])
    };
  }

  const fieldProfiles = catalog.fieldLocations.map((location) => {
    const shape = profileShape(location);
    return freeze({
      locationId: location.id,
      classification: shape.classification,
      dataStatus: 'community-reviewed',
      gameVersion: GAME_BUILD,
      lastReviewed: REVIEWED_AT,
      traffic: shape.traffic,
      risk: shape.risk,
      services: shape.services,
      sources: [sourceFor(location), { id: location.sourceIds?.[0] ?? 'sctools-stanton-field-4-9', label: '4.9 game-data field-location review', url: 'https://starcitizen.tools/List_of_Stanton_locations', kind: 'reviewed-community-field-data' }]
    });
  });

  const fieldIds = new Set(fieldProfiles.map((profile) => profile.locationId));
  const profiles = freeze([...baseProfiles.profiles.filter((profile) => !fieldIds.has(profile.locationId)), ...fieldProfiles]);
  const byLocationId = new Map(profiles.map((profile) => [profile.locationId, profile]));

  function getProfile(locationId) { return byLocationId.get(locationId) ?? null; }
  function getService(profile, serviceId) { return profile?.services.find((item) => item.id === serviceId) ?? null; }

  const operationalDestinations = catalog.locations.filter((location) => location.operational).length;
  const coverage = freeze({
    operationalDestinations,
    reviewedProfiles: profiles.length,
    fieldProfiles: fieldProfiles.length,
    complete: byLocationId.size === operationalDestinations,
    gameVersion: GAME_BUILD,
    reviewedAt: REVIEWED_AT
  });

  const api = freeze({ ...baseProfiles, profiles, fieldProfiles, coverage, getProfile, getService });
  root.SCCompanionLocationProfiles = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
