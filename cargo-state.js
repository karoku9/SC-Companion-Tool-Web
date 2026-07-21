'use strict';

(function exposeCargoState(root) {
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

  function deriveCargoState(route, requestedStopIndex = 0) {
    if (!route?.stops?.length) {
      return Object.freeze({
        currentStopIndex: 0,
        currentStop: null,
        complete: false,
        lots: Object.freeze([]),
        pendingLots: Object.freeze([]),
        onboardLots: Object.freeze([]),
        deliveredLots: Object.freeze([]),
        currentMoves: Object.freeze([]),
        totals: Object.freeze({ pendingScu: 0, onboardScu: 0, deliveredScu: 0 })
      });
    }

    const currentStopIndex = clampStopIndex(route, requestedStopIndex);
    const complete = currentStopIndex >= route.stops.length;
    const currentStop = complete ? null : route.stops[currentStopIndex];

    const lots = route.missions.flatMap((mission) => mission.cargoLots.map((lot) => {
      const pickupStopIndex = findOperationStop(route, mission.id, lot.id, lot.pickupType);
      const deliveryStopIndex = findOperationStop(route, mission.id, lot.id, 'delivery');
      const status = deliveryStopIndex >= 0 && deliveryStopIndex < currentStopIndex
        ? 'delivered'
        : pickupStopIndex >= 0 && pickupStopIndex < currentStopIndex
          ? 'onboard'
          : 'pending';

      return Object.freeze({
        key: cargoKey(mission.id, lot.id),
        missionId: mission.id,
        missionTitle: mission.title,
        lotId: lot.id,
        commodity: lot.commodity,
        scu: lot.scu,
        pickupType: lot.pickupType,
        originLocationId: lot.pickupLocationId,
        originLocationLabel: lot.pickupLocationLabel,
        deliveryLocationId: lot.deliveryLocationId,
        deliveryLocationLabel: lot.deliveryLocationLabel,
        pickupStopIndex,
        deliveryStopIndex,
        status
      });
    }));

    const lotsByKey = new Map(lots.map((lot) => [lot.key, lot]));
    const currentMoves = (currentStop?.operations ?? [])
      .filter((operation) => operation.lotId)
      .map((operation) => {
        const lot = lotsByKey.get(cargoKey(operation.missionId, operation.lotId));
        return Object.freeze({
          action: operation.type === 'delivery' ? 'unload' : 'load',
          operation,
          lot: lot ?? null
        });
      });

    const pendingLots = lots.filter((lot) => lot.status === 'pending');
    const onboardLots = lots.filter((lot) => lot.status === 'onboard');
    const deliveredLots = lots.filter((lot) => lot.status === 'delivered');
    const sumScu = (items) => items.reduce((total, item) => total + item.scu, 0);

    return Object.freeze({
      currentStopIndex,
      currentStop,
      complete,
      lots: Object.freeze(lots),
      pendingLots: Object.freeze(pendingLots),
      onboardLots: Object.freeze(onboardLots),
      deliveredLots: Object.freeze(deliveredLots),
      currentMoves: Object.freeze(currentMoves),
      totals: Object.freeze({
        pendingScu: sumScu(pendingLots),
        onboardScu: sumScu(onboardLots),
        deliveredScu: sumScu(deliveredLots)
      })
    });
  }

  const api = Object.freeze({ cargoKey, clampStopIndex, deriveCargoState });
  root.SCCompanionCargoState = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
