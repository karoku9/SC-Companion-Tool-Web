'use strict';

(function exposeLocationProfiles(root) {
  const catalog = root.SCCompanionLocations
    ?? (typeof require !== 'undefined' ? require('./locations.js') : null);
  if (!catalog) throw new Error('Location registry must load before location-profiles.js');

  const REVIEWED_AT = '2026-07-23';
  const GAME_BUILD = '4.9.0-LIVE.12232306';

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }

  const SERVICE_LABELS = Object.freeze({
    hangars: 'Hangars / pads',
    'landing-services': 'Fuel, repair & rearm',
    food: 'Food & drink',
    medical: 'Medical care',
    accommodation: 'Habitation',
    transit: 'Local transit',
    'cargo-center': 'Cargo services',
    refinery: 'Refinery',
    'ship-market': 'Ships & rentals',
    'ground-vehicles': 'Ground vehicles',
    'commodity-trade': 'Commodity trade',
    'illegal-trade': 'Unregulated trade'
  });

  function service(id, status, detail) {
    return { id, label: SERVICE_LABELS[id], status, detail };
  }

  const serviceSet = (entries) => entries.map(([id, status, detail]) => service(id, status, detail));

  const GAME_DATA_SOURCE = Object.freeze({
    id: 'scunpacked-starmap-4-9',
    label: 'SC Unpacked — game-file starmap and amenity snapshot',
    url: 'https://github.com/StarCitizenWiki/scunpacked-data/blob/master/starmap.json',
    kind: 'unpacked-game-data'
  });

  const WIKI_PATHS = Object.freeze({
    'stanton-hurston-lorville-teasa': 'Teasa_Spaceport',
    'stanton-crusader-orison-august-dunlow': 'August_Dunlow_Spaceport',
    'stanton-arccorp-area18-riker': 'Riker_Memorial_Spaceport',
    'stanton-microtech-new-babbage-nbis': 'New_Babbage_Interstellar_Spaceport',
    'stanton-hurston-everus': 'Everus_Harbor',
    'stanton-crusader-seraphim': 'Seraphim_Station',
    'stanton-arccorp-baijini': 'Baijini_Point',
    'stanton-microtech-port-tressler': 'Port_Tressler',
    'stanton-crusader-yela-grim-hex': 'Grim_HEX',
    'stanton-pyro-gateway': 'Pyro_Gateway_(Stanton)',
    'stanton-magnus-gateway': 'Magnus_Gateway',
    'stanton-terra-gateway': 'Terra_Gateway_(Stanton)',
    'pyro-monox-checkmate': 'Checkmate_Station',
    'pyro-bloom-orbituary': 'Orbituary',
    'pyro-terminus-ruin': 'Ruin_Station',
    'nyx-delamar-levski': 'Levski'
  });

  function wikiPath(location) {
    if (WIKI_PATHS[location.id]) return WIKI_PATHS[location.id];
    return location.name.replace(/ · .*/, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  function wikiSource(location) {
    return {
      id: `sctools-${location.id}`,
      label: `Star Citizen Wiki — ${location.name}`,
      url: `https://starcitizen.tools/${wikiPath(location)}`,
      kind: 'reviewed-community-location'
    };
  }

  function risk(level, label, { jurisdiction, armistice, commArray, factors, note }) {
    return {
      level,
      label,
      jurisdiction,
      armistice,
      commArray,
      factors,
      note,
      live: false,
      sourceKind: 'reviewed-static-location-guidance'
    };
  }

  const cityRisk = (location) => risk('low', 'Low static location risk', {
    jurisdiction: 'UEE / corporate jurisdiction',
    armistice: 'Protected landing-zone rules',
    commArray: 'Covered',
    factors: [
      'Controlled landing infrastructure and city security.',
      'High traffic can still create collision, congestion or opportunistic-player exposure.',
      'This rating does not use the current shard or player population.'
    ],
    note: `${location.contextName ?? location.name} is treated as a controlled landing-zone arrival.`
  });

  const orbitalRisk = (location) => risk('guarded', 'Guarded station environment', {
    jurisdiction: 'UEE / corporate jurisdiction',
    armistice: 'Station armistice zone',
    commArray: 'Covered',
    factors: [
      'Controlled station with medical, habitation and landing support.',
      'Orbital traffic and exposed approaches create more operational risk than a city spaceport.',
      'No live piracy or player-density telemetry is available.'
    ],
    note: `${location.name} is a controlled orbital hub, not a guarantee of a quiet approach.`
  });

  const lagrangeRisk = (location) => risk('guarded', 'Guarded but isolated rest stop', {
    jurisdiction: 'UEE / corporate jurisdiction',
    armistice: 'Station armistice zone',
    commArray: 'Covered',
    factors: [
      'The inhabited station is controlled and provides normal rest-stop services.',
      'The surrounding Lagrange region is more isolated than a planetary orbital hub.',
      'Route planning should not treat the rating as live piracy intelligence.'
    ],
    note: `${location.contextName ?? 'Lagrange point'} is a static rest-stop assessment.`
  });

  const gatewayRisk = (location) => risk('elevated', 'Elevated transit-chokepoint risk', {
    jurisdiction: 'UEE / corporate gateway jurisdiction',
    armistice: 'Station armistice zone',
    commArray: 'Covered near the station',
    factors: [
      'Gateway station services are extensive and the interior is controlled.',
      'Jump-point approaches concentrate traffic and valuable long-range cargo.',
      'Risk outside the protected station area can change sharply with shard activity.'
    ],
    note: `${location.name} is rated for its role as a high-value transit chokepoint.`
  });

  const grimRisk = () => risk('high', 'High-risk outlaw hub', {
    jurisdiction: 'Outlaw / Nine Tails influence',
    armistice: 'Local station restrictions only',
    commArray: 'Coverage and enforcement should not be assumed',
    factors: [
      'Grim HEX is an outlaw-aligned settlement rather than a normal corporate station.',
      'Approaches and nearby space should be treated as exposed.',
      'Medical and landing services exist, but service availability does not imply safety.'
    ],
    note: 'Static outlaw-location guidance; not a live report of players or hostiles.'
  });

  const pyroRisk = (location) => risk('extreme', 'Extreme frontier exposure', {
    jurisdiction: 'Outlaw-controlled / unclaimed Pyro',
    armistice: 'Limited or local protection; general safety not guaranteed',
    commArray: 'No UEE security coverage',
    factors: [
      `${location.name} operates in Pyro under outlaw control or influence.`,
      'Hostile-player, contested-zone and approach risk is materially higher than Stanton.',
      'Docking, fuel and food availability do not imply a protected journey.'
    ],
    note: 'Static system and faction assessment; current hostile activity is unknown.'
  });

  const levskiRisk = () => risk('elevated', 'Elevated frontier settlement risk', {
    jurisdiction: 'People’s Alliance / unclaimed Nyx',
    armistice: 'Settlement protection; external enforcement is limited',
    commArray: 'No UEE security coverage',
    factors: [
      'Levski is a functioning settlement with broad services.',
      'Nyx remains an unclaimed frontier system with limited external enforcement.',
      'Confirm fuel, cargo and onward-route assumptions before committing valuable cargo.'
    ],
    note: 'Static frontier assessment; not live security telemetry.'
  });

  const SPACEPORT_SERVICES = Object.freeze({
    teasa: serviceSet([
      ['hangars', 'available', 'Spaceport hangars and freight elevators are available.'],
      ['landing-services', 'available', 'Fuel, repair and rearm are requested from the landing interface.'],
      ['food', 'available', 'Kel-To and nearby Lorville food options are available.'],
      ['medical', 'local-transfer', 'Full medical care is reached through Lorville transit.'],
      ['accommodation', 'local-transfer', 'Lorville habitation is reached through the city transit network.'],
      ['transit', 'available', 'Hurston Rapid Transit connects the spaceport with Lorville districts.'],
      ['cargo-center', 'local-transfer', 'Freight handling is at the hangar; city trade services require transit.'],
      ['refinery', 'not-available', 'No refinery deck is registered at Teasa Spaceport.'],
      ['ship-market', 'available', 'New Deal and Vantage Rentals are available at or through Teasa.'],
      ['ground-vehicles', 'available', 'Lorville perimeter gates support ground-vehicle retrieval.'],
      ['commodity-trade', 'local-transfer', 'Commodity terminals are elsewhere in Lorville.'],
      ['illegal-trade', 'unverified', 'No reviewed unregulated terminal is recorded at the spaceport.']
    ]),
    august: serviceSet([
      ['hangars', 'available', 'Spaceport hangars and freight elevators are available.'],
      ['landing-services', 'available', 'Fuel, repair and rearm are available through landing services.'],
      ['food', 'available', 'Ellroy’s is present at August Dunlow Spaceport.'],
      ['medical', 'local-transfer', 'Orison General is reached by shuttle from the spaceport.'],
      ['accommodation', 'local-transfer', 'Orison habitation is reached through the Skyway.'],
      ['transit', 'available', 'The Skyway links August Dunlow with Cloudview and Providence.'],
      ['cargo-center', 'local-transfer', 'Hangar freight handling is available; wider cargo services are in Orison.'],
      ['refinery', 'not-available', 'No refinery deck is registered at August Dunlow.'],
      ['ship-market', 'available', 'Traveler Rentals operates at the spaceport.'],
      ['ground-vehicles', 'not-available', 'Orison does not provide a normal surface-vehicle departure from this spaceport.'],
      ['commodity-trade', 'local-transfer', 'Orison trade services require local transit.'],
      ['illegal-trade', 'unverified', 'No reviewed unregulated trade terminal is recorded at the spaceport.']
    ]),
    riker: serviceSet([
      ['hangars', 'available', 'Spaceport hangars and freight elevators are available.'],
      ['landing-services', 'available', 'Fuel, repair and rearm are available through landing services.'],
      ['food', 'available', 'Kel-To sells food, drinks and medical supplies at the spaceport.'],
      ['medical', 'local-transfer', 'Empire Health Services is located in Area18.'],
      ['accommodation', 'local-transfer', 'Area18 habitation is reached by Cityflight shuttle.'],
      ['transit', 'available', 'Cityflight shuttles connect Riker Memorial and Area18.'],
      ['cargo-center', 'local-transfer', 'Hangar freight handling is available; city trade services require transit.'],
      ['refinery', 'not-available', 'No refinery deck is registered at Riker Memorial.'],
      ['ship-market', 'available', 'Traveler Rentals is at the spaceport; Astro Armada is in Area18.'],
      ['ground-vehicles', 'not-available', 'No reviewed ground-vehicle exit is registered at Riker Memorial.'],
      ['commodity-trade', 'local-transfer', 'Area18 TDD and city terminals require shuttle travel.'],
      ['illegal-trade', 'unverified', 'Private contacts exist in Area18, but no spaceport terminal is verified.']
    ]),
    nbis: serviceSet([
      ['hangars', 'available', 'Spaceport hangars, garages and freight elevators are available.'],
      ['landing-services', 'available', 'Fuel, repair and rearm are available through landing services.'],
      ['food', 'local-transfer', 'The main food venues are in the Commons, reached by Metroloop.'],
      ['medical', 'local-transfer', 'New Babbage hospital services require Metroloop travel.'],
      ['accommodation', 'local-transfer', 'Nest Apartments are reached through the city transit system.'],
      ['transit', 'available', 'The Metroloop connects the spaceport, Commons and Aspire Grand.'],
      ['cargo-center', 'local-transfer', 'Freight handling is at the hangar; city commerce requires transit.'],
      ['refinery', 'not-available', 'No refinery deck is registered at NBIS.'],
      ['ship-market', 'available', 'Regal Luxury Rentals operates inside the spaceport.'],
      ['ground-vehicles', 'available', 'Garages provide direct ground-vehicle access to microTech.'],
      ['commodity-trade', 'local-transfer', 'TDD and commercial terminals are in New Babbage.'],
      ['illegal-trade', 'unverified', 'No reviewed unregulated terminal is recorded at NBIS.']
    ])
  });

  const ORBITAL_SERVICES = serviceSet([
    ['hangars', 'available', 'Station hangars, pads and freight elevators are available.'],
    ['landing-services', 'available', 'Fuel, repair and rearm are available on landing.'],
    ['food', 'available', 'Food court or station food vendors are available.'],
    ['medical', 'available', 'A Kel-To medical clinic is available.'],
    ['accommodation', 'available', 'EZ Hab accommodation is available.'],
    ['transit', 'not-available', 'No city transit is required inside the orbital station.'],
    ['cargo-center', 'available', 'A cargo deck provides logistics, supplies and delivery handling.'],
    ['refinery', 'not-available', 'No refinery deck is registered at this planetary orbital station.'],
    ['ship-market', 'available', 'Ship-rental terminals are available through the cargo deck.'],
    ['ground-vehicles', 'not-available', 'Ground-vehicle spawning is not available.'],
    ['commodity-trade', 'available', 'Administration or trade terminals support commodity transactions.'],
    ['illegal-trade', 'unverified', 'No reviewed unregulated terminal is recorded.']
  ]);

  const LAGRANGE_REFINERIES = new Set([
    'stanton-arc-l1-wide-forest',
    'stanton-arc-l2-lively-pathway',
    'stanton-hur-l1-green-glade',
    'stanton-cru-l1-ambitious-dream',
    'stanton-mic-l1-shallow-frontier'
  ]);

  function lagrangeServices(location) {
    const refineryAvailable = LAGRANGE_REFINERIES.has(location.id);
    return serviceSet([
      ['hangars', 'available', 'Rest-stop hangars and pads are available.'],
      ['landing-services', 'available', 'Fuel, repair and rearm are available.'],
      ['food', 'available', 'R&R food and drink vendors are available.'],
      ['medical', 'available', 'A Kel-To clinic is available on the inhabited rest stop.'],
      ['accommodation', 'available', 'EZ Hab accommodation is available.'],
      ['transit', 'not-available', 'No external city transit is required.'],
      ['cargo-center', 'limited', 'Administration and delivery handling are available; this is not a full orbital cargo deck.'],
      ['refinery', refineryAvailable ? 'available' : 'not-available', refineryAvailable
        ? 'A refinery deck and mining support services are registered.'
        : 'No refinery deck is registered for this station.'],
      ['ship-market', 'limited', 'Rental and ship-shop availability varies by rest-stop fit-out.'],
      ['ground-vehicles', 'not-available', 'Ground-vehicle spawning is not available.'],
      ['commodity-trade', 'available', 'Administration terminals support the station commodity set.'],
      ['illegal-trade', 'unverified', 'No reviewed unregulated terminal is recorded.']
    ]);
  }

  const GATEWAY_SERVICES = serviceSet([
    ['hangars', 'available', 'Gateway hangars and freight elevators are available.'],
    ['landing-services', 'available', 'Fuel, repair and rearm are available.'],
    ['food', 'available', 'Food court, bar and quick-service vendors are available.'],
    ['medical', 'available', 'A Kel-To medical clinic is available.'],
    ['accommodation', 'available', 'EZ Hab accommodation is available.'],
    ['transit', 'not-available', 'The gateway is a self-contained station.'],
    ['cargo-center', 'available', 'A cargo deck provides logistics and supplies.'],
    ['refinery', 'available', 'A refinery deck and mining support center are available.'],
    ['ship-market', 'available', 'Ship-rental terminals and ship-related shops are available.'],
    ['ground-vehicles', 'limited', 'Platinum Bay is present; vehicle retrieval depends on the station implementation.'],
    ['commodity-trade', 'available', 'Administration and cargo terminals support commodity trade.'],
    ['illegal-trade', 'unverified', 'No reviewed unregulated terminal is recorded inside the Stanton gateway.']
  ]);

  const GRIM_SERVICES = serviceSet([
    ['hangars', 'available', 'Ship spawning and hangars are available.'],
    ['landing-services', 'available', 'Repair, rearm and refuel services are available.'],
    ['food', 'available', 'Food and drink vendors operate inside Grim HEX.'],
    ['medical', 'available', 'Green Imperial Medical provides Tier 2 healthcare.'],
    ['accommodation', 'available', 'Habitation is available inside the settlement.'],
    ['transit', 'not-available', 'No city transit is required.'],
    ['cargo-center', 'limited', 'Delivery handling and local freight access exist, without a standard corporate cargo deck.'],
    ['refinery', 'not-available', 'No refinery deck is registered at Grim HEX.'],
    ['ship-market', 'not-available', 'No reviewed ship dealership or rental terminal is registered.'],
    ['ground-vehicles', 'not-available', 'Ground-vehicle spawning is not applicable.'],
    ['commodity-trade', 'available', 'Commodity trading is available.'],
    ['illegal-trade', 'available', 'Outlaw and unregulated commerce is a core part of the location.']
  ]);

  function pyroServices(location) {
    const isOrbituary = location.id === 'pyro-bloom-orbituary';
    return serviceSet([
      ['hangars', 'available', 'Station hangars and freight elevators are available.'],
      ['landing-services', 'available', 'Fuel and basic ship support are available through the station.'],
      ['food', 'available', 'Food, drink and supply vendors are available.'],
      ['medical', 'available', 'A local clinic is present in the inhabited station.'],
      ['accommodation', 'available', 'Habitation is available.'],
      ['transit', 'not-available', 'No city transit is required.'],
      ['cargo-center', 'available', 'Cargo Services provides supplies and logistics handling.'],
      ['refinery', isOrbituary ? 'available' : 'limited', isOrbituary
        ? 'Orbituary includes a refinery area.'
        : 'Industrial facilities exist, but full player refinery availability is not treated as universal.'],
      ['ship-market', 'available', 'Buy & Fly vehicle-dealership access is registered.'],
      ['ground-vehicles', 'not-available', 'No normal ground-vehicle departure is registered.'],
      ['commodity-trade', 'available', 'Cargo or administration terminals support local trade.'],
      ['illegal-trade', 'unregulated', 'Trade operates under outlaw control without UEE market protection.']
    ]);
  }

  const LEVSKI_SERVICES = serviceSet([
    ['hangars', 'available', 'Asteroid hangars and freight elevators are available.'],
    ['landing-services', 'available', 'Fuel, repair and rearm are available.'],
    ['food', 'available', 'Food, bars and supply vendors are available in Levski.'],
    ['medical', 'available', 'Levski Hospital provides medical services.'],
    ['accommodation', 'available', 'Habitation is available in the settlement.'],
    ['transit', 'limited', 'Internal elevators and settlement routes connect major areas.'],
    ['cargo-center', 'available', 'A cargo deck and cargo services are available.'],
    ['refinery', 'available', 'Refinery and mining-support areas are available.'],
    ['ship-market', 'available', 'Ship and vehicle commerce is available in the settlement.'],
    ['ground-vehicles', 'available', 'Ground-vehicle access is available for Delamar surface travel.'],
    ['commodity-trade', 'available', 'Administration and cargo terminals support trade.'],
    ['illegal-trade', 'unregulated', 'Frontier barter and unregulated trade are available.']
  ]);

  function profileFor(location) {
    let classification = String(location.type).replace(/-/g, ' ');
    let services;
    let baselineRisk;
    let traffic = { level: 'normal', live: false, note: 'Static operational estimate; not live shard traffic.' };

    if (location.type === 'spaceport') {
      const key = location.id.includes('teasa') ? 'teasa'
        : location.id.includes('august-dunlow') ? 'august'
          : location.id.includes('riker') ? 'riker' : 'nbis';
      classification = 'Major landing-zone spaceport';
      services = SPACEPORT_SERVICES[key];
      baselineRisk = cityRisk(location);
      traffic = { level: 'high', live: false, note: 'Major landing-zone traffic estimate; not live shard telemetry.' };
    } else if (['stanton-hurston-everus', 'stanton-crusader-seraphim', 'stanton-arccorp-baijini', 'stanton-microtech-port-tressler'].includes(location.id)) {
      classification = 'Planetary orbital station';
      services = ORBITAL_SERVICES;
      baselineRisk = orbitalRisk(location);
      traffic = { level: 'high', live: false, note: 'Busy orbital-hub estimate; not live shard telemetry.' };
    } else if (location.id === 'stanton-crusader-yela-grim-hex') {
      classification = 'Outlaw asteroid settlement';
      services = GRIM_SERVICES;
      baselineRisk = grimRisk();
      traffic = { level: 'high', live: false, note: 'Outlaw-hub activity estimate; current shard activity is unknown.' };
    } else if (location.type === 'lagrange-station') {
      classification = 'R&R Lagrange rest stop';
      services = lagrangeServices(location);
      baselineRisk = lagrangeRisk(location);
      traffic = { level: 'normal', live: false, note: 'Rest-stop traffic estimate; not live shard telemetry.' };
    } else if (location.type === 'jump-gateway') {
      classification = 'Inter-system gateway station';
      services = GATEWAY_SERVICES;
      baselineRisk = gatewayRisk(location);
      traffic = { level: 'high', live: false, note: 'Jump-point transit estimate; not live traffic telemetry.' };
    } else if (location.id.startsWith('pyro-')) {
      classification = 'Outlaw-controlled Pyro station';
      services = pyroServices(location);
      baselineRisk = pyroRisk(location);
      traffic = { level: 'volatile', live: false, note: 'Pyro activity is volatile; this is not current shard telemetry.' };
    } else if (location.id === 'nyx-delamar-levski') {
      classification = 'Frontier asteroid landing zone';
      services = LEVSKI_SERVICES;
      baselineRisk = levskiRisk();
      traffic = { level: 'normal', live: false, note: 'Frontier-settlement estimate; not live shard telemetry.' };
    } else {
      return null;
    }

    return {
      locationId: location.id,
      classification,
      dataStatus: 'community-reviewed',
      gameVersion: GAME_BUILD,
      lastReviewed: REVIEWED_AT,
      traffic,
      risk: baselineRisk,
      services,
      sources: [wikiSource(location), GAME_DATA_SOURCE]
    };
  }

  const profiles = freeze(catalog.locations.filter((location) => location.operational).map(profileFor).filter(Boolean));
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
    complete: profiles.length === catalog.locations.filter((location) => location.operational).length,
    gameVersion: GAME_BUILD,
    reviewedAt: REVIEWED_AT
  });

  const api = freeze({ SERVICE_LABELS, profiles, coverage, getProfile, getService });
  root.SCCompanionLocationProfiles = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
