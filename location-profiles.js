'use strict';

(function exposeLocationProfiles(root) {
  const catalog = root.SCCompanionLocations
    ?? (typeof require !== 'undefined' ? require('./locations.js') : null);
  if (!catalog) throw new Error('Location registry must load before location-profiles.js');

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }

  const detailedProfiles = [
    {
      locationId: 'stanton-hurston-lorville-teasa',
      dataStatus: 'community-reference',
      lastReviewed: '2026-07-21',
      traffic: {
        level: 'high',
        live: false,
        note: 'Major landing-zone estimate; not live shard telemetry.'
      },
      services: [
        { id: 'hangars', label: 'Hangars', status: 'available', detail: 'Multiple hangars; assigned size varies.' },
        { id: 'landing-services', label: 'Fuel & repair', status: 'available', detail: 'Landing Services is listed for Lorville.' },
        { id: 'food', label: 'Food & drink', status: 'available', detail: 'Kel-To is located at Teasa; more options are in Lorville.' },
        { id: 'transit', label: 'City transit', status: 'available', detail: 'Spaceport and Commerce transit connections.' },
        { id: 'ship-market', label: 'Ships & rentals', status: 'available', detail: 'New Deal and Vantage Rentals.' },
        { id: 'commodity-trade', label: 'Commodity trade', status: 'city-transfer', detail: 'Commodity terminals are elsewhere in Lorville, not at the hangar concourse.' },
        { id: 'illegal-trade', label: 'Illegal trade', status: 'unverified', detail: 'No verified NQA terminal at Teasa.' }
      ],
      sources: [
        { label: 'Star Citizen Wiki — Teasa Spaceport', kind: 'community-wiki' },
        { label: 'UEX — Lorville terminals', kind: 'community-data' }
      ]
    }
  ];

  const detailedIds = new Set(detailedProfiles.map((profile) => profile.locationId));
  const generatedRegistryProfiles = catalog.locations
    .filter((location) => location.operational && !detailedIds.has(location.id))
    .map((location) => {
      const sources = location.sourceIds
        .map((sourceId) => catalog.getSource(sourceId))
        .filter((source) => source?.authority === 'community')
        .map((source) => ({
          id: source.id,
          label: source.label,
          url: source.url,
          kind: source.kind
        }));
      if (!sources.length) return null;
      return {
        locationId: location.id,
        dataStatus: 'community-registry',
        lastReviewed: location.lastVerified,
        traffic: {
          level: 'unknown',
          live: false,
          note: 'No reviewed traffic profile. Registry presence is not live shard telemetry.'
        },
        services: [],
        sources
      };
    })
    .filter(Boolean);

  const profiles = freeze([...detailedProfiles, ...generatedRegistryProfiles]);
  const byLocationId = new Map(profiles.map((profile) => [profile.locationId, profile]));

  function getProfile(locationId) {
    return byLocationId.get(locationId) ?? null;
  }

  function getService(profile, serviceId) {
    return profile?.services.find((service) => service.id === serviceId) ?? null;
  }

  const api = freeze({ profiles, getProfile, getService });
  root.SCCompanionLocationProfiles = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
