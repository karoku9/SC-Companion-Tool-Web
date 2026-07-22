'use strict';

(function exposeCargoState(root) {
  const CORRECTION_STATUSES = Object.freeze(['auto', 'pending', 'onboard', 'delivered', 'lost']);

  function cargoKey(missionId, lotId) { return `${missionId}::${lotId}`; }
  function allStops(route) { return route?.allStops ?? route?.stops ?? []; }

  function normalizeCompletedStopIds(route, progress = 0) {
    const activeStops = route?.stops ?? [];
    const valid = new Set(activeStops.map((stop) => String(stop.id)));
    if (Array.isArray(progress)) return Object.freeze([...new Set(progress.map(String).filter((id) => valid.has(id)))]);
    const count = Math.min(Math.max(Math.trunc(Number(progress) || 0), 0), activeStops.length);
    return Object.freeze(activeStops.slice(0, count).map((stop) => String(stop.id)));
  }

  function clampStopIndex(route, value) {
    const total = route?.stops?.length ?? 0;
    const numeric = Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 0;
    return Math.min(Math.max(numeric, 0), total);
  }

  function findOperationStop(route, missionId, lotId, type) {
    const stops = allStops(route);
    const index = stops.findIndex((stop) => stop.operations.some((operation) => (
      operation.missionId === missionId && operation.lotId === lotId && operation.type === type
    )));
    return index < 0 ? null : Object.freeze({ id: String(stops[index].id), index, stop: stops[index] });
  }

  function allowedStatuses(lot) {
    const statuses = ['auto', 'pending'];
    if (lot.pickupCompleted) statuses.push('onboard', 'lost');
    if (lot.deliveryCompleted) statuses.push('delivered');
    return Object.freeze(statuses);
  }

  function normalizeCorrection(lot, correction) {
    if (!correction || typeof correction !== 'object') return null;
    const actualScu = correction.actualScu === '' || correction.actualScu == null ? lot.plannedScu : Number(correction.actualScu);
    if (!Number.isFinite(actualScu) || actualScu < 0 || actualScu > lot.plannedScu) {
      throw new Error(`Actual SCU for ${lot.missionTitle} ${lot.commodity} must be between 0 and ${lot.plannedScu}`);
    }
    const requestedStatus = String(correction.status ?? 'auto').toLowerCase();
    if (!CORRECTION_STATUSES.includes(requestedStatus)) throw new Error(`Unknown cargo status: ${requestedStatus}`);
    const allowed = allowedStatuses(lot);
    const statusValid = allowed.includes(requestedStatus);
    return Object.freeze({
      actualScu, requestedStatus, appliedStatus: statusValid ? requestedStatus : 'auto', statusValid,
      issue: statusValid ? '' : `${requestedStatus.toUpperCase()} is not valid at the current route position`
    });
  }

  function baseLots(route, completedStopIds) {
    const completed = new Set(completedStopIds);
    return route.missions.flatMap((mission) => mission.cargoLots.map((lot) => {
      const pickupStop = findOperationStop(route, mission.id, lot.id, lot.pickupType);
      const deliveryStop = findOperationStop(route, mission.id, lot.id, 'delivery');
      const pickupCompleted = Boolean(pickupStop && completed.has(pickupStop.id));
      const deliveryCompleted = Boolean(deliveryStop && completed.has(deliveryStop.id));
      const automaticStatus = deliveryCompleted ? 'delivered' : pickupCompleted ? 'onboard' : 'pending';
      return {
        key: cargoKey(mission.id, lot.id), missionId: mission.id, missionTitle: mission.title, lotId: lot.id,
        commodity: lot.commodity, plannedScu: lot.scu, scu: lot.scu, pickupType: lot.pickupType,
        originLocationId: lot.pickupLocationId, originLocationLabel: lot.pickupLocationLabel,
        deliveryLocationId: lot.deliveryLocationId, deliveryLocationLabel: lot.deliveryLocationLabel,
        pickupStopId: pickupStop?.id ?? null, deliveryStopId: deliveryStop?.id ?? null,
        pickupStopIndex: pickupStop?.index ?? -1, deliveryStopIndex: deliveryStop?.index ?? -1,
        pickupCompleted, deliveryCompleted, automaticStatus
      };
    }));
  }

  function validateCorrection(route, progress, key, correction) {
    if (!route?.stops?.length && !route?.allStops?.length) throw new Error('Generate a route before correcting cargo.');
    const completedStopIds = normalizeCompletedStopIds(route, progress);
    const lot = baseLots(route, completedStopIds).find((item) => item.key === key);
    if (!lot) throw new Error('Cargo lot not found.');
    const normalized = normalizeCorrection(lot, correction);
    if (normalized && !normalized.statusValid) throw new Error(normalized.issue);
    return normalized;
  }

  function deriveCargoState(route, progress = 0, corrections = null) {
    if (!route?.stops?.length && !route?.allStops?.length) {
      return Object.freeze({
        currentStopIndex: 0, currentStop: null, complete: false, completedStopIds: Object.freeze([]), lots: Object.freeze([]),
        pendingLots: Object.freeze([]), onboardLots: Object.freeze([]), deliveredLots: Object.freeze([]),
        lostLots: Object.freeze([]), currentMoves: Object.freeze([]),
        totals: Object.freeze({ pendingScu: 0, onboardScu: 0, deliveredScu: 0, lostScu: 0 }),
        correctionCount: 0, correctionIssues: Object.freeze([])
      });
    }

    const completedStopIds = normalizeCompletedStopIds(route, progress);
    const completedSet = new Set(completedStopIds);
    const currentStop = (route.stops ?? []).find((stop) => !completedSet.has(String(stop.id))) ?? null;
    const currentStopIndex = currentStop ? route.stops.findIndex((stop) => String(stop.id) === String(currentStop.id)) : (route.stops?.length ?? 0);
    const complete = Boolean(route.stops?.length) && !currentStop;
    const activeCorrections = corrections ?? root.SCCompanionSession?.getState?.().cargoCorrections ?? {};
    const issues = [];

    const lots = baseLots(route, completedStopIds).map((base) => {
      let correction = null;
      try {
        correction = normalizeCorrection(base, activeCorrections?.[base.key]);
      } catch (error) {
        correction = Object.freeze({ actualScu: base.plannedScu, requestedStatus: 'auto', appliedStatus: 'auto', statusValid: false, issue: error.message });
      }
      if (correction?.issue) issues.push(Object.freeze({ key: base.key, message: correction.issue }));
      const status = correction?.appliedStatus && correction.appliedStatus !== 'auto' ? correction.appliedStatus : base.automaticStatus;
      const scu = correction?.actualScu ?? base.plannedScu;
      return Object.freeze({
        ...base, scu, status,
        corrected: Boolean(correction && (scu !== base.plannedScu || correction.requestedStatus !== 'auto')),
        correction
      });
    });

    const lotsByKey = new Map(lots.map((lot) => [lot.key, lot]));
    const currentMoves = (currentStop?.operations ?? []).filter((operation) => operation.lotId).map((operation) => Object.freeze({
      action: operation.type === 'delivery' ? 'unload' : 'load', operation,
      lot: lotsByKey.get(cargoKey(operation.missionId, operation.lotId)) ?? null
    }));
    const byStatus = (status) => lots.filter((lot) => lot.status === status);
    const pendingLots = byStatus('pending');
    const onboardLots = byStatus('onboard');
    const deliveredLots = byStatus('delivered');
    const lostLots = byStatus('lost');
    const sumScu = (items) => items.reduce((total, item) => total + item.scu, 0);

    return Object.freeze({
      currentStopIndex, currentStop, complete, completedStopIds, lots: Object.freeze(lots),
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

  const api = Object.freeze({
    cargoKey, allStops, normalizeCompletedStopIds, clampStopIndex, findOperationStop,
    allowedStatuses, validateCorrection, deriveCargoState, CORRECTION_STATUSES
  });
  root.SCCompanionCargoState = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));