'use strict';

(function exposeRoutePlanner(root) {
  function buildRoute(missionInputs, missionModel) {
    const operations = missionModel.buildOperations(missionInputs)
      .map((operation, index) => Object.freeze({ ...operation, order: index }));
    const pending = new Map(operations.map((operation) => [operation.id, operation]));
    const completed = new Set();
    const stops = [];
    let currentLocationId = null;

    while (pending.size) {
      const available = [...pending.values()].filter((operation) => (
        operation.dependsOn.every((dependency) => completed.has(dependency))
      ));
      if (!available.length) throw new Error('Mission operations contain an unresolved dependency cycle');

      const sameLocation = currentLocationId
        ? available.filter((operation) => operation.locationId === currentLocationId)
        : [];
      const seed = (sameLocation.length ? sameLocation : available)
        .sort((left, right) => left.order - right.order)[0];
      currentLocationId = seed.locationId;

      const stopOperations = [];
      let added;
      do {
        added = false;
        [...pending.values()]
          .filter((operation) => operation.locationId === currentLocationId)
          .filter((operation) => operation.dependsOn.every((dependency) => completed.has(dependency)))
          .sort((left, right) => left.order - right.order)
          .forEach((operation) => {
            pending.delete(operation.id);
            completed.add(operation.id);
            stopOperations.push(operation);
            added = true;
          });
      } while (added);

      const index = stops.length;
      stops.push(Object.freeze({
        id: `stop-${index}-${currentLocationId}`,
        index,
        baseIndex: index,
        locationId: currentLocationId,
        locationLabel: stopOperations[0]?.locationLabel ?? currentLocationId,
        operations: Object.freeze(stopOperations)
      }));
      currentLocationId = null;
    }

    return Object.freeze({
      missions: Object.freeze([...missionInputs]),
      stops: Object.freeze(stops),
      totalCargoScu: missionInputs.reduce((total, mission) => (
        total + mission.cargoLots.reduce((sum, lot) => sum + lot.scu, 0)
      ), 0)
    });
  }

  function operationInstruction(operation) {
    const origin = operation.pickupLocationLabel ?? operation.originLocationLabel ?? operation.originLocationId;
    if (operation.type === 'delivery') {
      return `${operation.missionTitle} — ${operation.scu} SCU ${operation.commodity} — loaded at ${origin}`;
    }
    return `${operation.missionTitle} — ${operation.scu} SCU ${operation.commodity}`;
  }

  const api = Object.freeze({ buildRoute, operationInstruction });
  root.SCCompanionRoutePlanner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));