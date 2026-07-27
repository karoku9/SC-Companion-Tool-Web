'use strict';

(function installOperationAwareExposureV028(root) {
  const base = root.SCCompanionLocationContext;
  const locations = root.SCCompanionLocations;
  const profiles = root.SCCompanionLocationProfiles;
  if (!base || !locations || !profiles || base.operationAwareExposure) return;

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }

  function protectedCargoAccess(locationId) {
    const location = locations.getLocation(locationId);
    const profile = profiles.getProfile(locationId);
    const hangars = profile?.services?.find((service) => service.id === 'hangars');
    const cargo = profile?.services?.find((service) => service.id === 'cargo-center');
    const supported = new Set(['available', 'local-transfer', 'limited']);
    const facilityType = ['spaceport', 'orbital-station', 'asteroid-station', 'lagrange-station', 'jump-gateway', 'landing-zone'].includes(location?.type);
    return Boolean(facilityType && (supported.has(hangars?.status) || supported.has(cargo?.status)));
  }

  function exposureFor(locationId, options = {}) {
    const baseExposure = base.exposureFor(locationId, options);
    const hasDelivery = Boolean(options.hasDelivery || options.operationKind === 'delivery' || options.operationKind === 'mixed');
    const hasPickup = Boolean(options.hasPickup || options.operationKind === 'pickup' || options.operationKind === 'mixed');
    const onboardBeforeScu = Math.max(0, Number(options.onboardScu ?? 0));
    const onboardAfterScu = Math.max(0, Number(options.onboardAfterScu ?? onboardBeforeScu));
    if (!hasDelivery) return baseExposure;

    const baseline = base.baselineRiskFor(locationId);
    const protectedAccess = protectedCargoAccess(locationId);
    if (onboardAfterScu === 0) {
      return freeze({
        level: 'clear',
        label: 'Cargo cleared at this stop',
        reasons: [
          'The planned delivery leaves no mission cargo onboard.',
          protectedAccess ? 'Cargo handling is associated with a registered hangar or cargo facility.' : `Baseline location assessment: ${baseline.label}.`
        ],
        sourceKind: 'derived-operation-aware-guidance'
      });
    }

    if (protectedAccess) {
      const level = ['high', 'extreme'].includes(baseline.level) ? 'caution' : 'controlled';
      return freeze({
        level,
        label: hasPickup ? 'Protected mixed cargo stop' : 'Protected hangar delivery',
        reasons: [
          `${onboardAfterScu} SCU remains onboard after the planned cargo movement.`,
          'The delivery uses a registered hangar, pad or cargo-handling facility.',
          ['high', 'extreme'].includes(baseline.level)
            ? `Transit around the facility still inherits the location baseline: ${baseline.label}.`
            : 'Minimize dwell time only if additional cargo remains onboard.'
        ],
        sourceKind: 'derived-operation-aware-guidance'
      });
    }
    return baseExposure;
  }

  function buildContext(locationId, options = {}) {
    const context = base.buildContext(locationId, options);
    return freeze({ ...context, exposure: exposureFor(locationId, options) });
  }

  root.SCCompanionLocationContext = Object.freeze({
    ...base,
    exposureFor,
    buildContext,
    operationAwareExposure: true
  });
}(typeof globalThis !== 'undefined' ? globalThis : window));
