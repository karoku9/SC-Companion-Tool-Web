'use strict';

(function exposeMissionModel(root) {
  const CARGO_PICKUP_TYPES = Object.freeze(['pickup', 'collect']);

  function requiredText(value, fieldName) {
    const text = String(value ?? '').trim();
    if (!text) throw new Error(`${fieldName} is required`);
    return text;
  }

  function positiveNumber(value, fieldName) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      throw new Error(`${fieldName} must be greater than zero`);
    }
    return number;
  }

  function optionalSource(value) {
    if (!value || typeof value !== 'object') return null;
    return Object.freeze({ ...value });
  }

  function optionalConfidence(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(100, number <= 1 ? number * 100 : number)) : null;
  }

  function normalizeCargoLot(lot, missionId) {
    const id = requiredText(lot.id, 'Cargo lot id');
    const pickupLocationId = requiredText(lot.pickupLocationId, 'Pickup location');
    const deliveryLocationId = requiredText(lot.deliveryLocationId, 'Delivery location');

    return Object.freeze({
      id,
      missionId,
      commodity: requiredText(lot.commodity, 'Commodity'),
      scu: positiveNumber(lot.scu, 'SCU'),
      pickupLocationId,
      pickupLocationLabel: String(lot.pickupLocationLabel ?? pickupLocationId),
      pickupType: CARGO_PICKUP_TYPES.includes(lot.pickupType) ? lot.pickupType : 'pickup',
      deliveryLocationId,
      deliveryLocationLabel: String(lot.deliveryLocationLabel ?? deliveryLocationId),
      confidence: optionalConfidence(lot.confidence),
      source: optionalSource(lot.source)
    });
  }

  function normalizeObjective(objective, missionId) {
    return Object.freeze({
      id: requiredText(objective.id, 'Objective id'),
      missionId,
      type: requiredText(objective.type, 'Objective type'),
      locationId: requiredText(objective.locationId, 'Objective location'),
      locationLabel: String(objective.locationLabel ?? objective.locationId),
      label: requiredText(objective.label, 'Objective label'),
      dependsOn: Object.freeze([...(objective.dependsOn ?? [])].map(String)),
      confidence: optionalConfidence(objective.confidence),
      source: optionalSource(objective.source)
    });
  }

  function normalizeMission(input) {
    const id = requiredText(input.id, 'Mission id');
    const cargoLots = (input.cargoLots ?? []).map((lot) => normalizeCargoLot(lot, id));
    const objectives = (input.objectives ?? []).map((objective) => normalizeObjective(objective, id));
    if (!cargoLots.length && !objectives.length) throw new Error(`Mission ${id} has no operations`);

    const itemIds = [...cargoLots, ...objectives].map((item) => item.id);
    if (new Set(itemIds).size !== itemIds.length) {
      throw new Error(`Mission ${id} contains duplicate lot or objective ids`);
    }

    return Object.freeze({
      id,
      title: requiredText(input.title, 'Mission title'),
      category: String(input.category ?? (cargoLots.length ? 'cargo' : 'general')),
      confidence: optionalConfidence(input.confidence),
      source: optionalSource(input.source),
      cargoLots: Object.freeze(cargoLots),
      objectives: Object.freeze(objectives)
    });
  }

  function cargoLotOperations(mission, lot) {
    const pickupId = `${mission.id}:${lot.id}:${lot.pickupType}`;
    const deliveryId = `${mission.id}:${lot.id}:delivery`;
    const common = {
      missionId: mission.id,
      missionTitle: mission.title,
      missionConfidence: mission.confidence,
      missionSource: mission.source,
      lotId: lot.id,
      commodity: lot.commodity,
      scu: lot.scu,
      confidence: lot.confidence,
      source: lot.source,
      originLocationId: lot.pickupLocationId,
      originLocationLabel: lot.pickupLocationLabel,
      destinationLocationId: lot.deliveryLocationId,
      destinationLocationLabel: lot.deliveryLocationLabel
    };

    return [
      Object.freeze({
        ...common,
        id: pickupId,
        type: lot.pickupType,
        locationId: lot.pickupLocationId,
        locationLabel: lot.pickupLocationLabel,
        pickupLocationLabel: lot.pickupLocationLabel,
        sourceLine: lot.source?.pickupLine ?? null,
        sourceText: lot.source?.pickupText ?? null,
        dependsOn: Object.freeze([])
      }),
      Object.freeze({
        ...common,
        id: deliveryId,
        type: 'delivery',
        locationId: lot.deliveryLocationId,
        locationLabel: lot.deliveryLocationLabel,
        pickupLocationLabel: lot.pickupLocationLabel,
        sourceLine: lot.source?.deliveryLine ?? null,
        sourceText: lot.source?.deliveryText ?? null,
        dependsOn: Object.freeze([pickupId])
      })
    ];
  }

  function objectiveOperation(mission, objective) {
    return Object.freeze({
      id: `${mission.id}:${objective.id}`,
      missionId: mission.id,
      missionTitle: mission.title,
      missionConfidence: mission.confidence,
      missionSource: mission.source,
      objectiveId: objective.id,
      type: objective.type,
      locationId: objective.locationId,
      locationLabel: objective.locationLabel,
      label: objective.label,
      confidence: objective.confidence,
      source: objective.source,
      sourceLine: objective.source?.line ?? null,
      sourceText: objective.source?.text ?? null,
      dependsOn: objective.dependsOn
    });
  }

  function buildOperations(missionInputs) {
    const missions = missionInputs.map(normalizeMission);
    const missionIds = missions.map((mission) => mission.id);
    if (new Set(missionIds).size !== missionIds.length) throw new Error('Mission ids must be unique');

    return missions.flatMap((mission) => [
      ...mission.cargoLots.flatMap((lot) => cargoLotOperations(mission, lot)),
      ...mission.objectives.map((objective) => objectiveOperation(mission, objective))
    ]);
  }

  function groupOperationsByLocation(operations) {
    const stops = new Map();
    operations.forEach((operation) => {
      const existing = stops.get(operation.locationId) ?? {
        locationId: operation.locationId,
        locationLabel: operation.locationLabel ?? operation.locationId,
        operations: []
      };
      existing.operations.push(operation);
      stops.set(operation.locationId, existing);
    });
    return [...stops.values()].map((stop) => Object.freeze({
      locationId: stop.locationId,
      locationLabel: stop.locationLabel,
      operations: Object.freeze([...stop.operations])
    }));
  }

  const api = Object.freeze({ normalizeMission, buildOperations, groupOperationsByLocation });
  root.SCCompanionMissions = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
