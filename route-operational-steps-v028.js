'use strict';

(function exposeOperationalRouteStepsV028(root) {
  const locations = root.SCCompanionLocations
    ?? (typeof require !== 'undefined' ? require('./locations.js') : null);
  const navigation = root.SCCompanionNavigationEstimates
    ?? (typeof require !== 'undefined' ? require('./navigation-estimates.js') : null);
  const progressModel = root.SCCompanionRouteProgress
    ?? (typeof require !== 'undefined' ? require('./route-progress.js') : null);
  if (!locations || !navigation || !progressModel) return;

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }

  function systemFor(locationId, fallbackId = null) {
    const system = locationId ? locations.getSystemForLocation(locationId) : null;
    if (system) return { id: system.id, name: system.name };
    const record = fallbackId ? locations.getLocation(fallbackId) : null;
    return record ? { id: record.id, name: record.name } : { id: fallbackId ?? 'unknown', name: fallbackId ?? 'Unknown' };
  }

  function locationReference(locationId, label = null, type = null, systemId = null) {
    const location = locationId ? locations.getLocation(locationId) : null;
    const system = systemFor(location?.id, systemId);
    return freeze({
      id: location?.id ?? String(locationId ?? label ?? ''),
      label: location ? locations.formatOperationalLabel(location) : String(label ?? locationId ?? 'Unknown'),
      shortLabel: location?.name ?? String(label ?? locationId ?? 'Unknown').split('·')[0].trim(),
      type: location?.type ?? type ?? 'virtual',
      systemId: system.id,
      systemName: system.name
    });
  }

  function gatewayReference(label, systemId) {
    const normalized = locations.normalizeSearchTerm(label);
    const matches = locations.searchOperationalLocations(label, { limit: 20 });
    const exact = matches.find((location) => (
      location.type === 'jump-gateway'
      && locations.getSystemForLocation(location.id)?.id === systemId
      && [location.name, location.navigationTarget, ...(location.aliases ?? [])]
        .filter(Boolean)
        .some((value) => locations.normalizeSearchTerm(value) === normalized)
    )) ?? matches.find((location) => location.type === 'jump-gateway' && locations.getSystemForLocation(location.id)?.id === systemId);
    return exact
      ? locationReference(exact.id)
      : locationReference(`virtual-${systemId}-${normalized.replace(/\s+/g, '-')}`, label, 'jump-gateway', systemId);
  }

  function stopTotals(stop) {
    const pickup = (stop?.operations ?? [])
      .filter((operation) => operation.type !== 'delivery' && operation.lotId)
      .reduce((sum, operation) => sum + Number(operation.scu ?? 0), 0);
    const delivery = (stop?.operations ?? [])
      .filter((operation) => operation.type === 'delivery' && operation.lotId)
      .reduce((sum, operation) => sum + Number(operation.scu ?? 0), 0);
    return freeze({ pickup, delivery, delta: pickup - delivery });
  }

  function actionTitle(totals) {
    if (totals.pickup && totals.delivery) return `Drop ${totals.delivery} SCU · Pick up ${totals.pickup} SCU`;
    if (totals.delivery) return `Drop ${totals.delivery} SCU`;
    if (totals.pickup) return `Pick up ${totals.pickup} SCU`;
    return 'Complete objectives';
  }

  function estimateLeg(from, to, fallback = null) {
    if (from?.id && to?.id && !String(from.id).startsWith('virtual-') && !String(to.id).startsWith('virtual-')) {
      const estimate = navigation.estimateLeg(from.id, to.id, { quantumTimeFactor: 1 });
      if (estimate) return estimate;
    }
    return fallback ?? freeze({
      minMinutes: 0,
      maxMinutes: 0,
      jumpCount: 0,
      distanceGm: null,
      distanceLabel: 'Distance unavailable',
      transitionKind: 'unmapped'
    });
  }

  function travelStep(id, kind, from, to, estimate, stop, legIndex, segment = null) {
    const verbs = {
      travel: `Fly to ${to.shortLabel}`,
      'gateway-approach': `Travel to ${to.shortLabel}`,
      jump: `Jump to ${to.shortLabel}`
    };
    return freeze({
      id,
      kind,
      legIndex,
      stopId: stop.id,
      destinationStopId: stop.id,
      title: verbs[kind] ?? `Travel to ${to.shortLabel}`,
      shortTitle: to.shortLabel,
      from,
      to,
      systemId: to.systemId,
      systemName: to.systemName,
      estimate,
      segment
    });
  }

  function stepsForLeg(route, from, stop, legIndex) {
    const to = locationReference(stop.locationId, stop.locationLabel);
    if (!from || from.id === to.id) return [];
    const completeEstimate = estimateLeg(from, to);
    const gatewaySegments = (route.gatewaySegments ?? [])
      .filter((segment) => String(segment.stopId) === String(stop.id))
      .sort((left, right) => Number(left.legIndex ?? 0) - Number(right.legIndex ?? 0));
    if (!gatewaySegments.length) {
      return [travelStep(`travel:${legIndex}:${from.id}:${to.id}`, 'travel', from, to, completeEstimate, stop, legIndex)];
    }

    const steps = [];
    let cursor = from;
    gatewaySegments.forEach((segment, segmentIndex) => {
      const sourceGateway = gatewayReference(segment.fromGateway, segment.fromSystemId);
      const destinationGateway = gatewayReference(segment.toGateway, segment.toSystemId);
      if (cursor.id !== sourceGateway.id) {
        steps.push(travelStep(
          `gateway-approach:${legIndex}:${segmentIndex}:${cursor.id}:${sourceGateway.id}`,
          'gateway-approach',
          cursor,
          sourceGateway,
          estimateLeg(cursor, sourceGateway, completeEstimate),
          stop,
          legIndex,
          segment
        ));
      }
      steps.push(travelStep(
        `gateway-jump:${legIndex}:${segmentIndex}:${sourceGateway.id}:${destinationGateway.id}`,
        'jump',
        sourceGateway,
        destinationGateway,
        estimateLeg(sourceGateway, destinationGateway, completeEstimate),
        stop,
        legIndex,
        segment
      ));
      cursor = destinationGateway;
    });

    if (cursor.id !== to.id) {
      steps.push(travelStep(
        `travel:${legIndex}:${cursor.id}:${to.id}`,
        'travel',
        cursor,
        to,
        estimateLeg(cursor, to, completeEstimate),
        stop,
        legIndex
      ));
    }
    return steps;
  }

  function build(route, options = {}) {
    if (!route?.stops?.length) return freeze({ routeKey: '', steps: [] });
    const startLocationId = String(options.startLocationId ?? route.optimization?.startLocationId ?? '').trim();
    let cursor = startLocationId
      ? locationReference(startLocationId, options.startLocationLabel ?? route.optimization?.startLocationLabel)
      : null;
    const steps = [];

    route.stops.forEach((stop, stopIndex) => {
      steps.push(...stepsForLeg(route, cursor, stop, stopIndex));
      const destination = locationReference(stop.locationId, stop.locationLabel);
      const totals = stopTotals(stop);
      steps.push(freeze({
        id: `action:${stop.id}`,
        kind: 'action',
        stopId: stop.id,
        stopIndex,
        destinationStopId: stop.id,
        title: actionTitle(totals),
        shortTitle: destination.shortLabel,
        location: destination,
        from: destination,
        to: destination,
        systemId: destination.systemId,
        systemName: destination.systemName,
        totals,
        operations: stop.operations
      }));
      cursor = destination;
    });

    const routeKey = [
      startLocationId,
      ...route.stops.map((stop) => String(stop.id)),
      ...(route.gatewaySegments ?? []).map((segment) => String(segment.connectionId))
    ].join('|');
    return freeze({ routeKey, steps });
  }

  function derive(route, state = {}) {
    const built = build(route, {
      startLocationId: state.routeStartLocationId,
      startLocationLabel: state.routeStartLocationLabel
    });
    const validIds = new Set(built.steps.map((step) => step.id));
    const explicitSource = state.operationalRouteKey === built.routeKey
      ? (state.completedOperationalStepIds ?? [])
      : [];
    const completed = new Set(explicitSource.map(String).filter((id) => validIds.has(id)));
    const completedStops = new Set((state.completedStopIds ?? []).map(String));

    let lastCompletedActionIndex = -1;
    built.steps.forEach((step, index) => {
      if (step.kind === 'action' && completedStops.has(String(step.stopId))) lastCompletedActionIndex = Math.max(lastCompletedActionIndex, index);
    });
    for (let index = 0; index <= lastCompletedActionIndex; index += 1) completed.add(built.steps[index].id);

    const currentIndex = built.steps.findIndex((step) => !completed.has(step.id));
    const currentStep = currentIndex >= 0 ? built.steps[currentIndex] : null;
    const nextStep = currentIndex >= 0 ? built.steps[currentIndex + 1] ?? null : null;
    return freeze({
      ...built,
      completedStepIds: [...completed],
      completedSet: completed,
      currentIndex: currentIndex >= 0 ? currentIndex : built.steps.length,
      currentStep,
      nextStep,
      complete: Boolean(built.steps.length) && !currentStep,
      completedCount: completed.size,
      totalSteps: built.steps.length
    });
  }

  function completeCurrent(route, state = {}) {
    const progress = derive(route, state);
    if (!progress.currentStep) return {};
    const completedOperationalStepIds = [...new Set([
      ...(state.operationalRouteKey === progress.routeKey ? state.completedOperationalStepIds ?? [] : []),
      progress.currentStep.id
    ])];
    if (progress.currentStep.kind !== 'action') {
      return {
        operationalRouteKey: progress.routeKey,
        completedOperationalStepIds
      };
    }
    const completedStopIds = progressModel.completeCurrent(route, state.completedStopIds, state.currentStopIndex);
    return {
      operationalRouteKey: progress.routeKey,
      completedOperationalStepIds,
      completedStopIds,
      currentStopIndex: completedStopIds.length
    };
  }

  function previous(route, state = {}) {
    const progress = derive(route, state);
    const previousIndex = Math.min(progress.currentIndex - 1, progress.steps.length - 1);
    if (previousIndex < 0) return {};
    const previousStep = progress.steps[previousIndex];
    const explicit = new Set(state.operationalRouteKey === progress.routeKey ? state.completedOperationalStepIds ?? [] : []);
    explicit.delete(previousStep.id);

    if (previousStep.kind !== 'action') {
      return {
        operationalRouteKey: progress.routeKey,
        completedOperationalStepIds: [...explicit]
      };
    }

    const completedStopIds = progressModel.previous(route, state.completedStopIds, state.currentStopIndex);
    const allowed = new Set(progress.steps.slice(0, previousIndex).map((step) => step.id));
    return {
      operationalRouteKey: progress.routeKey,
      completedOperationalStepIds: [...explicit].filter((id) => allowed.has(id)),
      completedStopIds,
      currentStopIndex: completedStopIds.length
    };
  }

  const api = freeze({ build, derive, completeCurrent, previous, stopTotals, gatewayReference });
  root.SCCompanionOperationalSteps = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
