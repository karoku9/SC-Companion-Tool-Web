'use strict';

(function exposeCargoState(root) {
  const CORRECTION_STATUSES = Object.freeze(['auto', 'pending', 'onboard', 'delivered', 'lost']);

  function cargoKey(missionId, lotId) {
    return `${missionId}::${lotId}`;
  }

  function clampStopIndex(route, value) {
    const total = route?.stops?.length ?? 0;
    const numeric = Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0;
    return Math.min(Math.max(numeric, 0), total);
  }

  function findOperationStop(route, missionId, lotId, type) {
    return route.stops.findIndex((stop) => stop.operations.some((operation) => (
      operation.missionId === missionId
      && operation.lotId === lotId
      && operation.type === type
    )));
  }

  function allowedStatuses(lot, currentStopIndex) {
    const statuses = ['auto', 'pending'];
    if (lot.pickupStopIndex >= 0 && lot.pickupStopIndex < currentStopIndex) statuses.push('onboard', 'lost');
    if (lot.deliveryStopIndex >= 0 && lot.deliveryStopIndex < currentStopIndex) statuses.push('delivered');
    return Object.freeze(statuses);
  }

  function normalizeCorrection(lot, correction, currentStopIndex) {
    if (!correction || typeof correction !== 'object') return null;
    const actualScu = correction.actualScu === '' || correction.actualScu == null
      ? lot.plannedScu
      : Number(correction.actualScu);
    if (!Number.isFinite(actualScu) || actualScu < 0 || actualScu > lot.plannedScu) {
      throw new Error(`Actual SCU for ${lot.missionTitle} ${lot.commodity} must be between 0 and ${lot.plannedScu}`);
    }
    const requestedStatus = String(correction.status ?? 'auto').toLowerCase();
    if (!CORRECTION_STATUSES.includes(requestedStatus)) throw new Error(`Unknown cargo status: ${requestedStatus}`);
    const allowed = allowedStatuses(lot, currentStopIndex);
    const statusValid = allowed.includes(requestedStatus);
    return Object.freeze({
      actualScu,
      requestedStatus,
      appliedStatus: statusValid ? requestedStatus : 'auto',
      statusValid,
      issue: statusValid ? '' : `${requestedStatus.toUpperCase()} is not valid at the current route position`
    });
  }

  function baseLots(route, currentStopIndex) {
    return route.missions.flatMap((mission) => mission.cargoLots.map((lot) => {
      const pickupStopIndex = findOperationStop(route, mission.id, lot.id, lot.pickupType);
      const deliveryStopIndex = findOperationStop(route, mission.id, lot.id, 'delivery');
      const automaticStatus = deliveryStopIndex >= 0 && deliveryStopIndex < currentStopIndex
        ? 'delivered'
        : pickupStopIndex >= 0 && pickupStopIndex < currentStopIndex
          ? 'onboard'
          : 'pending';
      return {
        key: cargoKey(mission.id, lot.id),
        missionId: mission.id,
        missionTitle: mission.title,
        lotId: lot.id,
        commodity: lot.commodity,
        plannedScu: lot.scu,
        scu: lot.scu,
        pickupType: lot.pickupType,
        originLocationId: lot.pickupLocationId,
        originLocationLabel: lot.pickupLocationLabel,
        deliveryLocationId: lot.deliveryLocationId,
        deliveryLocationLabel: lot.deliveryLocationLabel,
        pickupStopIndex,
        deliveryStopIndex,
        automaticStatus
      };
    }));
  }

  function validateCorrection(route, requestedStopIndex, key, correction) {
    if (!route?.stops?.length) throw new Error('Generate a route before correcting cargo.');
    const currentStopIndex = clampStopIndex(route, requestedStopIndex);
    const lot = baseLots(route, currentStopIndex).find((item) => item.key === key);
    if (!lot) throw new Error('Cargo lot not found.');
    const normalized = normalizeCorrection(lot, correction, currentStopIndex);
    if (normalized && !normalized.statusValid) throw new Error(normalized.issue);
    return normalized;
  }

  function deriveCargoState(route, requestedStopIndex = 0, corrections = {}) {
    if (!route?.stops?.length) {
      return Object.freeze({
        currentStopIndex: 0, currentStop: null, complete: false,
        lots: Object.freeze([]), pendingLots: Object.freeze([]), onboardLots: Object.freeze([]),
        deliveredLots: Object.freeze([]), lostLots: Object.freeze([]), currentMoves: Object.freeze([]),
        totals: Object.freeze({ pendingScu: 0, onboardScu: 0, deliveredScu: 0, lostScu: 0 }),
        correctionCount: 0, correctionIssues: Object.freeze([])
      });
    }

    const currentStopIndex = clampStopIndex(route, requestedStopIndex);
    const complete = currentStopIndex >= route.stops.length;
    const currentStop = complete ? null : route.stops[currentStopIndex];
    const issues = [];

    const lots = baseLots(route, currentStopIndex).map((base) => {
      let correction = null;
      try {
        correction = normalizeCorrection(base, corrections?.[base.key], currentStopIndex);
      } catch (error) {
        correction = Object.freeze({ actualScu: base.plannedScu, requestedStatus: 'auto', appliedStatus: 'auto', statusValid: false, issue: error.message });
      }
      if (correction?.issue) issues.push(Object.freeze({ key: base.key, message: correction.issue }));
      const status = correction?.appliedStatus && correction.appliedStatus !== 'auto'
        ? correction.appliedStatus
        : base.automaticStatus;
      const scu = correction?.actualScu ?? base.plannedScu;
      return Object.freeze({
        ...base,
        scu,
        status,
        corrected: Boolean(correction && (scu !== base.plannedScu || correction.requestedStatus !== 'auto')),
        correction
      });
    });

    const lotsByKey = new Map(lots.map((lot) => [lot.key, lot]));
    const currentMoves = (currentStop?.operations ?? [])
      .filter((operation) => operation.lotId)
      .map((operation) => Object.freeze({
        action: operation.type === 'delivery' ? 'unload' : 'load',
        operation,
        lot: lotsByKey.get(cargoKey(operation.missionId, operation.lotId)) ?? null
      }));

    const byStatus = (status) => lots.filter((lot) => lot.status === status);
    const pendingLots = byStatus('pending');
    const onboardLots = byStatus('onboard');
    const deliveredLots = byStatus('delivered');
    const lostLots = byStatus('lost');
    const sumScu = (items) => items.reduce((total, item) => total + item.scu, 0);

    return Object.freeze({
      currentStopIndex, currentStop, complete, lots: Object.freeze(lots),
      pendingLots: Object.freeze(pendingLots), onboardLots: Object.freeze(onboardLots),
      deliveredLots: Object.freeze(deliveredLots), lostLots: Object.freeze(lostLots),
      currentMoves: Object.freeze(currentMoves),
      totals: Object.freeze({
        pendingScu: sumScu(pendingLots), onboardScu: sumScu(onboardLots),
        deliveredScu: sumScu(deliveredLots), lostScu: sumScu(lostLots)
      }),
      correctionCount: lots.filter((lot) => lot.corrected).length,
      correctionIssues: Object.freeze(issues)
    });
  }

  const api = Object.freeze({ cargoKey, clampStopIndex, allowedStatuses, validateCorrection, deriveCargoState, CORRECTION_STATUSES });
  root.SCCompanionCargoState = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
