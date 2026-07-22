'use strict';

(function exposeLocationContext(root) {
  const locations = root.SCCompanionLocations;
  const profiles = root.SCCompanionLocationProfiles;
  const official = root.SCCompanionOfficialUniverseData;
  const starmap = root.SCCompanionStarmapData;
  if (!locations || !profiles || !official || !starmap) return;

  const SERVICE_CATALOG = Object.freeze([
    Object.freeze({ id: 'hangars', label: 'Hangars' }),
    Object.freeze({ id: 'landing-services', label: 'Fuel & repair' }),
    Object.freeze({ id: 'food', label: 'Food & drink' }),
    Object.freeze({ id: 'transit', label: 'Local transit' }),
    Object.freeze({ id: 'ship-market', label: 'Ships & rentals' }),
    Object.freeze({ id: 'commodity-trade', label: 'Commodity trade' }),
    Object.freeze({ id: 'illegal-trade', label: 'Unregulated trade' })
  ]);

  const EXPOSURE_ORDER = Object.freeze(['clear', 'controlled', 'caution', 'high-exposure', 'unknown']);

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }

  function daysBetween(earlier, later) {
    const first = Date.parse(earlier);
    const second = Date.parse(later);
    if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
    return Math.max(0, Math.floor((second - first) / 86_400_000));
  }

  function assessFreshness(reviewedAt, asOf = new Date().toISOString().slice(0, 10)) {
    const ageDays = daysBetween(reviewedAt, asOf);
    if (ageDays === null) return freeze({ state: 'unknown', ageDays: null, label: 'Review date unavailable' });
    if (ageDays <= 30) return freeze({ state: 'fresh', ageDays, label: `Reviewed ${ageDays} day${ageDays === 1 ? '' : 's'} ago` });
    if (ageDays <= 90) return freeze({ state: 'aging', ageDays, label: `Review is ${ageDays} days old` });
    return freeze({ state: 'stale', ageDays, label: `Review is ${ageDays} days old` });
  }

  function sourceConfidence(location, profile) {
    if (!location) return freeze({ level: 'unavailable', label: 'No registered location', rank: 0 });
    const officialSources = (location.sourceIds ?? []).map((id) => official.getSource(id)).filter(Boolean);
    if (location.sourceStatus?.startsWith('official-current') && officialSources.length) {
      return freeze({ level: 'official-current', label: 'Official current reference', rank: 3 });
    }
    if (profile?.sources?.length) return freeze({ level: 'community-reviewed', label: 'Reviewed community reference', rank: 2 });
    return freeze({ level: 'registered-unverified', label: 'Registered location; details unavailable', rank: 1 });
  }

  function sourceLedger(location, profile) {
    const officialItems = (location?.sourceIds ?? [])
      .map((id) => official.getSource(id))
      .filter(Boolean)
      .map((source) => ({
        id: source.id,
        label: source.label,
        url: source.url,
        kind: source.kind,
        authority: 'official',
        reviewedAt: location.lastVerified ?? official.snapshot.verifiedAt
      }));
    const communityItems = (profile?.sources ?? []).map((source, index) => ({
      id: `${location?.id ?? 'location'}-community-${index + 1}`,
      label: source.label,
      url: source.url ?? null,
      kind: source.kind ?? 'community-reference',
      authority: 'community',
      reviewedAt: profile.lastReviewed ?? null
    }));
    return freeze([...officialItems, ...communityItems]);
  }

  function resolveSystem(locationId) {
    const system = locations.getSystemForLocation(locationId);
    return system ? starmap.getSystem(system.id) : null;
  }

  function officialFacts(location) {
    if (!location) return [];
    const system = resolveSystem(location.id);
    return freeze([
      { id: 'type', label: 'Location type', value: String(location.type).replace(/-/g, ' '), sourceKind: 'official-or-registry' },
      { id: 'system', label: 'System', value: system?.name ?? 'Unavailable', sourceKind: system ? 'official' : 'unavailable' },
      { id: 'navigation-target', label: 'Navigation target', value: location.navigationTarget ?? location.name, sourceKind: 'location-registry' },
      { id: 'hierarchy', label: 'Hierarchy', value: locations.formatLocationPath(location), sourceKind: 'location-registry' }
    ]);
  }

  function servicesFor(location, profile) {
    return freeze(SERVICE_CATALOG.map((definition) => {
      const service = profile?.services?.find((item) => item.id === definition.id);
      if (!service) {
        return {
          ...definition,
          status: 'unavailable-data',
          detail: 'No reviewed service record is available for this location.',
          sourceKind: 'unavailable'
        };
      }
      return {
        ...definition,
        status: service.status,
        detail: service.detail,
        sourceKind: profile.dataStatus === 'community-reference' ? 'community-reviewed' : profile.dataStatus
      };
    }));
  }

  function exposureFor(locationId, options = {}) {
    const onboardScu = Math.max(0, Number(options.onboardScu ?? 0));
    const location = locations.getLocation(locationId);
    if (!onboardScu) {
      return freeze({
        level: 'clear',
        label: 'No mission cargo exposed',
        reasons: ['No mission cargo is currently onboard.'],
        sourceKind: 'derived-operational-guidance'
      });
    }
    if (!location || String(locationId).startsWith('custom-')) {
      return freeze({
        level: 'unknown',
        label: 'Exposure unknown',
        reasons: [`${onboardScu} SCU is onboard, but this location has no verified system context.`],
        sourceKind: 'derived-operational-guidance'
      });
    }

    const system = resolveSystem(locationId);
    const systemId = system?.id;
    if (systemId === 'pyro') {
      return freeze({
        level: 'high-exposure',
        label: 'High cargo exposure',
        reasons: [`${onboardScu} SCU remains onboard.`, 'Pyro is represented as an unclaimed system with high outlaw activity.', 'Minimize unnecessary time before the next cargo reduction.'],
        sourceKind: 'derived-from-official-system-context'
      });
    }
    if (systemId === 'nyx') {
      return freeze({
        level: 'caution',
        label: 'Frontier cargo exposure',
        reasons: [`${onboardScu} SCU remains onboard.`, 'Nyx is represented as an unclaimed frontier system.', 'Confirm services and onward route before committing to the stop.'],
        sourceKind: 'derived-from-official-system-context'
      });
    }
    if (systemId === 'stanton') {
      return freeze({
        level: 'controlled',
        label: 'Controlled-system exposure',
        reasons: [`${onboardScu} SCU remains onboard.`, 'Stanton is represented with UEE and corporate jurisdiction.', 'This is contextual guidance, not live security telemetry.'],
        sourceKind: 'derived-from-official-system-context'
      });
    }
    return freeze({
      level: 'unknown',
      label: 'Exposure unknown',
      reasons: [`${onboardScu} SCU remains onboard.`, 'No reviewed system exposure guidance is available.'],
      sourceKind: 'derived-operational-guidance'
    });
  }

  function placementPriority(locationId) {
    const exposure = exposureFor(locationId, { onboardScu: 1 });
    return ({ clear: 0, controlled: 0, caution: 1, 'high-exposure': 3, unknown: 2 })[exposure.level] ?? 2;
  }

  function buildContext(locationId, options = {}) {
    const location = locations.getLocation(locationId);
    const profile = profiles.getProfile(locationId);
    const ledger = sourceLedger(location, profile);
    const reviewedAt = profile?.lastReviewed ?? location?.lastVerified ?? official.snapshot.verifiedAt;
    const freshness = assessFreshness(reviewedAt, options.asOf);
    const confidence = sourceConfidence(location, profile);
    const services = servicesFor(location, profile);
    const unknownServices = services.filter((service) => service.status === 'unavailable-data' || service.status === 'unverified');
    const system = location ? resolveSystem(location.id) : null;
    const exposure = exposureFor(locationId, options);
    const unavailable = [];
    if (!profile) unavailable.push('No reviewed facility profile is available.');
    if (!location) unavailable.push('Location is not present in the operational registry.');
    if (!system) unavailable.push('System context is unavailable.');
    if (unknownServices.length) unavailable.push(`${unknownServices.length} service record${unknownServices.length === 1 ? ' is' : 's are'} unavailable or unverified.`);

    return freeze({
      locationId,
      location,
      label: location ? locations.formatOperationalLabel(location) : String(options.label ?? locationId ?? 'Unknown location'),
      system,
      profile,
      confidence,
      freshness,
      sources: ledger,
      facts: officialFacts(location),
      services,
      exposure,
      unavailable,
      snapshot: official.snapshot,
      dataBoundary: {
        facts: 'Official or registered location data',
        services: profile ? profile.dataStatus : 'Unavailable',
        exposure: exposure.sourceKind,
        liveTelemetry: false
      }
    });
  }

  const api = freeze({
    SERVICE_CATALOG,
    EXPOSURE_ORDER,
    assessFreshness,
    sourceConfidence,
    sourceLedger,
    exposureFor,
    placementPriority,
    buildContext
  });
  root.SCCompanionLocationContext = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
