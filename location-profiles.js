'use strict';

(function exposeLocationProfiles(root) {
  const profiles = Object.freeze([
    Object.freeze({
      locationId: 'stanton-hurston-lorville-teasa',
      dataStatus: 'community-reference',
      lastReviewed: '2026-07-21',
      traffic: Object.freeze({
        level: 'high',
        live: false,
        note: 'Major landing-zone estimate; not live shard telemetry.'
      }),
      services: Object.freeze([
        Object.freeze({ id: 'hangars', label: 'Hangars', status: 'available', detail: 'Multiple hangars; assigned size varies.' }),
        Object.freeze({ id: 'landing-services', label: 'Fuel & repair', status: 'available', detail: 'Landing Services is listed for Lorville.' }),
        Object.freeze({ id: 'food', label: 'Food & drink', status: 'available', detail: 'Kel-To is located at Teasa; more options are in Lorville.' }),
        Object.freeze({ id: 'transit', label: 'City transit', status: 'available', detail: 'Spaceport and Commerce transit connections.' }),
        Object.freeze({ id: 'ship-market', label: 'Ships & rentals', status: 'available', detail: 'New Deal and Vantage Rentals.' }),
        Object.freeze({ id: 'commodity-trade', label: 'Commodity trade', status: 'city-transfer', detail: 'Commodity terminals are elsewhere in Lorville, not at the hangar concourse.' }),
        Object.freeze({ id: 'illegal-trade', label: 'Illegal trade', status: 'unverified', detail: 'No verified NQA terminal at Teasa.' })
      ]),
      sources: Object.freeze([
        Object.freeze({ label: 'Star Citizen Wiki — Teasa Spaceport', kind: 'community-wiki' }),
        Object.freeze({ label: 'UEX — Lorville terminals', kind: 'community-data' })
      ])
    })
  ]);

  const byLocationId = new Map(profiles.map((profile) => [profile.locationId, profile]));

  function getProfile(locationId) {
    return byLocationId.get(locationId) ?? null;
  }

  function getService(profile, serviceId) {
    return profile?.services.find((service) => service.id === serviceId) ?? null;
  }

  const api = Object.freeze({ profiles, getProfile, getService });
  root.SCCompanionLocationProfiles = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
