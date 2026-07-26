'use strict';

(function exposeRichMissionModel(root) {
  const PICKUP_TYPES = Object.freeze(['pickup', 'collect']);
  const text = (value, name) => {
    const result = String(value ?? '').trim();
    if (!result) throw new Error(`${name} is required`);
    return result;
  };
  const number = (value, name) => {
    const result = Number(value);
    if (!Number.isFinite(result) || result <= 0) throw new Error(`${name} must be greater than zero`);
    return result;
  };
  const confidence = (value) => {
    const result = Number(value);
    return Number.isFinite(result) ? Math.max(0, Math.min(100, result <= 1 ? result * 100 : result)) : null;
  };
  const source = (value) => value && typeof value === 'object' ? Object.freeze({ ...value }) : null;

  function normalizePickupLocations(lot) {
    const supplied = Array.isArray(lot.pickupLocations) ? lot.pickupLocations : [];
    const values = supplied.length ? supplied : [{ id: lot.pickupLocationId, label: lot.pickupLocationLabel }];
    const seen = new Set();
    return Object.freeze(values.map((location) => {
      const id = text(location.id, 'Pickup location');
      return Object.freeze({ id, label: String(location.label ?? id) });
    }).filter((location) => !seen.has(location.id) && seen.add(location.id)));
  }

  function normalizeCargoLot(lot, missionId) {
    const pickupLocations = normalizePickupLocations(lot);
    const deliveryLocationId = text(lot.deliveryLocationId, 'Delivery location');
    return Object.freeze({
      id: text(lot.id, 'Cargo lot id'), missionId,
      commodity: text(lot.commodity, 'Commodity'),
      scu: number(lot.scu, 'SCU'),
      pickupType: PICKUP_TYPES.includes(lot.pickupType) ? lot.pickupType : 'pickup',
      pickupLocations,
      pickupLocationId: pickupLocations[0].id,
      pickupLocationLabel: pickupLocations.map((location) => location.label).join(' + '),
      sharedPickup: pickupLocations.length > 1 || Boolean(lot.sharedPickup),
      deliveryLocationId,
      deliveryLocationLabel: String(lot.deliveryLocationLabel ?? deliveryLocationId),
      confidence: confidence(lot.confidence),
      source: source(lot.source)
    });
  }

  function normalizeMission(input) {
    const id = text(input.id, 'Mission id');
    const cargoLots = (input.cargoLots ?? []).map((lot) => normalizeCargoLot(lot, id));
    const objectives = Object.freeze([...(input.objectives ?? [])]);
    if (!cargoLots.length && !objectives.length) throw new Error(`Mission ${id} has no operations`);
    return Object.freeze({
      id,
      title: text(input.title, 'Mission title'),
      contractor: input.contractor ? String(input.contractor) : null,
      rewardAuec: Number.isFinite(Number(input.rewardAuec)) ? Number(input.rewardAuec) : null,
      category: String(input.category ?? (cargoLots.length ? 'cargo' : 'general')),
      confidence: confidence(input.confidence),
      source: source(input.source),
      cargoLots: Object.freeze(cargoLots),
      objectives
    });
  }

  function cargoLotOperations(mission, lot) {
    const pickupIds = lot.pickupLocations.map((location, index) => `${mission.id}:${lot.id}:${lot.pickupType}:${index}`);
    const common = {
      missionId: mission.id,
      missionTitle: mission.title,
      missionContractor: mission.contractor,
      missionRewardAuec: mission.rewardAuec,
      missionConfidence: mission.confidence,
      missionSource: mission.source,
      lotId: lot.id,
      commodity: lot.commodity,
      scu: lot.scu,
      sharedPickup: lot.sharedPickup,
      pickupCount: lot.pickupLocations.length,
      quantityLabel: lot.sharedPickup ? `${lot.scu} SCU total across ${lot.pickupLocations.length} pickups` : `${lot.scu} SCU`,
      confidence: lot.confidence,
      source: lot.source,
      originLocationId: lot.pickupLocationId,
      originLocationLabel: lot.pickupLocationLabel,
      destinationLocationId: lot.deliveryLocationId,
      destinationLocationLabel: lot.deliveryLocationLabel
    };
    const pickups = lot.pickupLocations.map((location, index) => Object.freeze({
      ...common,
      id: pickupIds[index],
      type: lot.pickupType,
      locationId: location.id,
      locationLabel: location.label,
      pickupLocationLabel: location.label,
      pickupIndex: index,
      sourceLine: lot.source?.pickupLine ?? null,
      sourceText: lot.source?.pickupText ?? null,
      dependsOn: Object.freeze([])
    }));
    const delivery = Object.freeze({
      ...common,
      id: `${mission.id}:${lot.id}:delivery`,
      type: 'delivery',
      locationId: lot.deliveryLocationId,
      locationLabel: lot.deliveryLocationLabel,
      pickupLocationLabel: lot.pickupLocationLabel,
      sourceLine: lot.source?.deliveryLine ?? null,
      sourceText: lot.source?.deliveryText ?? null,
      dependsOn: Object.freeze(pickupIds)
    });
    return [...pickups, delivery];
  }

  function buildOperations(inputs) {
    const missions = inputs.map(normalizeMission);
    if (new Set(missions.map((mission) => mission.id)).size !== missions.length) throw new Error('Mission ids must be unique');
    return missions.flatMap((mission) => mission.cargoLots.flatMap((lot) => cargoLotOperations(mission, lot)));
  }

  function groupOperationsByLocation(operations) {
    const stops = new Map();
    operations.forEach((operation) => {
      const stop = stops.get(operation.locationId) ?? { locationId: operation.locationId, locationLabel: operation.locationLabel, operations: [] };
      stop.operations.push(operation);
      stops.set(operation.locationId, stop);
    });
    return [...stops.values()].map((stop) => Object.freeze({ ...stop, operations: Object.freeze(stop.operations) }));
  }

  const api = Object.freeze({ normalizeMission, buildOperations, groupOperationsByLocation });
  root.SCCompanionMissions = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));