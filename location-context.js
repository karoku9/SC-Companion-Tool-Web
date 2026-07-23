'use strict';

(function exposeLocationContext(root) {
  const locations = root.SCCompanionLocations
    ?? (typeof require !== 'undefined' ? require('./locations.js') : null);
  const profiles = root.SCCompanionLocationProfiles
    ?? (typeof require !== 'undefined' ? require('./location-profiles.js') : null);
  const official = root.SCCompanionOfficialUniverseData
    ?? (typeof require !== 'undefined' ? require('./official-universe-data.js') : null);
  const starmap = root.SCCompanionStarmapData
    ?? (typeof require !== 'undefined' ? require('./starmap-data.js') : null);
  if (!locations || !profiles || !official || !starmap) return;

  const SERVICE_CATALOG = Object.freeze([
    Object.freeze({ id: 'hangars', label: 'Hangars / pads' }),
    Object.freeze({ id: 'landing-services', label: 'Fuel, repair & rearm' }),
    Object.freeze({ id: 'food', label: 'Food & drink' }),
    Object.freeze({ id: 'medical', label: 'Medical care' }),
    Object.freeze({ id: 'accommodation', label: 'Habitation' }),
    Object.freeze({ id: 'transit', label: 'Local transit' }),
    Object.freeze({ id: 'cargo-center', label: 'Cargo services' }),
    Object.freeze({ id: 'refinery', label: 'Refinery' }),
    Object.freeze({ id: 'ship-market', label: 'Ships & rentals' }),
    Object.freeze({ id: 'ground-vehicles', label: 'Ground vehicles' }),
    Object.freeze({ id: 'commodity-trade', label: 'Commodity trade' }),
    Object.freeze({ id: 'illegal-trade', label: 'Unregulated trade' })
  ]);

  const EXPOSURE_ORDER = Object.freeze(['clear', 'controlled', 'caution', 'high-exposure', 'unknown']);
  const RISK_ORDER = Object.freeze(['low', 'guarded', 'elevated', 'high', 'extreme', 'unknown']);

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
      return freeze({ level: 'official-current', label: 'Official location + reviewed facilities', rank: 3 });
    }
    if (profile?.sources?.length) return freeze({ level: 'community-reviewed', label: 'Reviewed game-data and community profile', rank: 2 });
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
      id: source.id ?? `${location?.id ?? 'location'}-community-${index + 1}`,
      label: source.label,
      url: source.url ?? null,
      kind: source.kind ?? 'community-reference',
      authority: source.kind === 'unpacked-game-data' ? 'game-data' : 'community',
      reviewedAt: profile.lastReviewed ?? null
    }));
    return freeze([...officialItems, ...communityItems]);
  }

  function resolveSystem(locationId) {
    const system = locations.getSystemForLocation(locationId);
    return system ? starmap.getSystem(system.id) : null;
  }

  function unknownRisk(locationId) {
    return freeze({
      level: 'unknown',
      label: 'Location risk unavailable',
      jurisdiction: 'Unknown',
      armistice: 'Unknown',
      commArray: 'Unknown',
      factors: [`No reviewed static risk profile is available for ${locationId ?? 'this location'}.`],
      note: 'No live security telemetry is available.',
      live: false,
      sourceKind: 'unavailable'
    });
  }

  function baselineRiskFor(locationId) {
    return freeze(profiles.getProfile(locationId)?.risk ?? unknownRisk(locationId));
  }

  function officialFacts(location, profile) {
    if (!location) return [];
    const system = resolveSystem(location.id);
    return freeze([
      { id: 'type', label: 'Location type', value: String(location.type).replace(/-/g, ' '), sourceKind: 'official-or-registry' },
      { id: 'classification', label: 'Facility class', value: profile?.classification ?? 'Unavailable', sourceKind: profile ? 'community-reviewed' : 'unavailable' },
      { id: 'system', label: 'System', value: system?.name ?? 'Unavailable', sourceKind: system ? 'official' : 'unavailable' },
      { id: 'navigation-target', label: 'Navigation target', value: location.navigationTarget ?? location.name, sourceKind: 'location-registry' },
      { id: 'hierarchy', label: 'Hierarchy', value: locations.formatLocationPath(location), sourceKind: 'location-registry' }
    ]);
  }

  function servicesFor(location, profile) {
    return freeze(SERVICE_CATALOG.map((definition) => {
      const item = profile?.services?.find((service) => service.id === definition.id);
      if (!item) {
        return {
          ...definition,
          status: 'unavailable-data',
          detail: 'No reviewed service record is available for this location.',
          sourceKind: 'unavailable'
        };
      }
      return {
        ...definition,
        status: item.status,
        detail: item.detail,
        sourceKind: profile.dataStatus
      };
    }));
  }

  function exposureFor(locationId, options = {}) {
    const onboardScu = Math.max(0, Number(options.onboardScu ?? 0));
    const location = locations.getLocation(locationId);
    const baseline = baselineRiskFor(locationId);

    if (!onboardScu) {
      return freeze({
        level: 'clear',
        label: 'No mission cargo exposed',
        reasons: ['No mission cargo is currently onboard.', `Baseline location assessment: ${baseline.label}.`],
        sourceKind: 'derived-operational-guidance'
      });
    }
    if (!location || String(locationId).startsWith('custom-')) {
      return freeze({
        level: 'unknown',
        label: 'Exposure unknown',
        reasons: [`${onboardScu} SCU is onboard, but this location has no verified system or facility context.`],
        sourceKind: 'derived-operational-guidance'
      });
    }

    const riskToExposure = {
      low: 'controlled',
      guarded: 'controlled',
      elevated: 'caution',
      high: 'high-exposure',
      extreme: 'high-exposure',
      unknown: 'unknown'
    };
    const level = riskToExposure[baseline.level] ?? 'unknown';
    const labels = {
      controlled: 'Controlled cargo exposure',
      caution: 'Elevated cargo exposure',
      'high-exposure': 'High cargo exposure',
      unknown: 'Exposure unknown'
    };
    return freeze({
      level,
      label: labels[level],
      reasons: [
        `${onboardScu} SCU remains onboard.`,
        `Baseline destination assessment: ${baseline.label}.`,
        baseline.factors[0] ?? baseline.note,
        'Minimize unnecessary dwell time when the next stop reduces cargo.'
      ],
      sourceKind: 'derived-from-reviewed-location-context'
    });
  }

  function placementPriority(locationId) {
    const baseline = baselineRiskFor(locationId);
    return ({ low: 0, guarded: 0, elevated: 1, high: 3, extreme: 3, unknown: 2 })[baseline.level] ?? 2;
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
    const risk = baselineRiskFor(locationId);
    const exposure = exposureFor(locationId, options);
    const unavailable = [];
    if (!profile) unavailable.push('No reviewed facility profile is available.');
    if (!location) unavailable.push('Location is not present in the operational registry.');
    if (!system) unavailable.push('System context is unavailable.');
    if (unknownServices.length) unavailable.push(`${unknownServices.length} service record${unknownServices.length === 1 ? ' is' : 's are'} unavailable or unverified.`);
    if (risk.level === 'unknown') unavailable.push('Baseline location risk is unavailable.');

    return freeze({
      locationId,
      location,
      label: location ? locations.formatOperationalLabel(location) : String(options.label ?? locationId ?? 'Unknown location'),
      system,
      profile,
      confidence,
      freshness,
      sources: ledger,
      facts: officialFacts(location, profile),
      services,
      risk,
      exposure,
      unavailable,
      snapshot: official.snapshot,
      dataBoundary: {
        facts: 'Official or registered location data',
        services: profile ? profile.dataStatus : 'Unavailable',
        risk: risk.sourceKind,
        exposure: exposure.sourceKind,
        liveTelemetry: false
      }
    });
  }

  const api = freeze({
    SERVICE_CATALOG,
    EXPOSURE_ORDER,
    RISK_ORDER,
    assessFreshness,
    sourceConfidence,
    sourceLedger,
    baselineRiskFor,
    exposureFor,
    placementPriority,
    buildContext
  });
  root.SCCompanionLocationContext = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
