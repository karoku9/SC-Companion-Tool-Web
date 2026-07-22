'use strict';

(function exposeCargoPlanner(root) {
  function cellKey(row, column) { return `${row}:${column}`; }

  function accessDistance(row, column, layout) {
    const distances = (layout.accessPoints ?? ['rear']).map((access) => {
      if (access === 'rear') return row;
      if (access === 'front') return layout.rows - 1 - row;
      if (access === 'left') return column;
      if (access === 'right') return layout.columns - 1 - column;
      return row;
    });
    return Math.min(...distances);
  }

  function createCells(shipModel) {
    const layout = shipModel.layout;
    const blocked = new Set(layout.blockedCells ?? []);
    const cells = [];
    for (let row = 0; row < layout.rows; row += 1) {
      for (let column = 0; column < layout.columns; column += 1) {
        if (blocked.has(cellKey(row, column))) continue;
        cells.push({
          id: cellKey(row, column), row, column,
          accessDistance: accessDistance(row, column, layout),
          planSlotIndex: cells.length,
          offGrid: false
        });
      }
    }
    return cells.slice(0, shipModel.capacityScu);
  }

  function createOffGridCells(count, startIndex) {
    return Array.from({ length: Math.max(0, Math.ceil(count)) }, (_, index) => Object.freeze({
      id: `off-grid:${index + 1}`,
      row: -1,
      column: -1,
      accessDistance: 1000 + index,
      planSlotIndex: startIndex + index,
      offGrid: true
    }));
  }

  function findStopIndex(route, missionId, lotId, type) {
    const stops = route.stops ?? [];
    return stops.findIndex((stop) => stop.operations.some((operation) => (
      operation.missionId === missionId && operation.lotId === lotId && operation.type === type
    )));
  }

  function intervalsOverlap(left, right) {
    return left.pickupStopIndex < right.deliveryStopIndex
      && right.pickupStopIndex < left.deliveryStopIndex;
  }

  function peakPlannedScu(lots, stopCount) {
    let peak = 0;
    for (let index = 0; index < stopCount; index += 1) {
      const onboard = lots.filter((lot) => (
        lot.pickupStopIndex >= 0
        && lot.pickupStopIndex <= index
        && lot.deliveryStopIndex > index
      )).reduce((total, lot) => total + Number(lot.scu), 0);
      peak = Math.max(peak, onboard);
    }
    return peak;
  }

  function planCargo(route, shipModel, riskResolver = () => 0) {
    const physicalCells = createCells(shipModel)
      .sort((left, right) => left.accessDistance - right.accessDistance || left.row - right.row || left.column - right.column)
      .map((cell, index) => Object.freeze({ ...cell, planSlotIndex: index }));
    const offGridAllowanceScu = Math.max(0, Number(shipModel.offGridAllowanceScu ?? 0));
    const cells = [...physicalCells, ...createOffGridCells(offGridAllowanceScu, physicalCells.length)];
    const lots = route.missions.flatMap((mission) => mission.cargoLots.map((lot) => {
      const pickupStopIndex = findStopIndex(route, mission.id, lot.id, lot.pickupType);
      const activeDeliveryIndex = findStopIndex(route, mission.id, lot.id, 'delivery');
      const deliveryStopIndex = activeDeliveryIndex < 0 ? Number.POSITIVE_INFINITY : activeDeliveryIndex;
      const pickupRisk = Number(riskResolver(lot.pickupLocationId, lot.pickupLocationLabel) ?? 0);
      return {
        ...lot,
        missionId: mission.id,
        missionTitle: mission.title,
        pickupStopIndex,
        deliveryStopIndex,
        pickupRisk,
        priority: (deliveryStopIndex * 100) + (pickupStopIndex * 2) - (pickupRisk * 10)
      };
    })).filter((lot) => lot.pickupStopIndex >= 0);

    const assignments = [];
    const reservations = new Map(cells.map((cell) => [cell.id, []]));
    [...lots]
      .sort((left, right) => left.pickupStopIndex - right.pickupStopIndex
        || left.deliveryStopIndex - right.deliveryStopIndex
        || left.priority - right.priority
        || left.missionTitle.localeCompare(right.missionTitle))
      .forEach((lot) => {
        const required = Math.ceil(lot.scu);
        const available = cells.filter((cell) => reservations.get(cell.id)
          .every((reservedLot) => !intervalsOverlap(lot, reservedLot)))
          .slice(0, required);
        if (available.length < required) {
          const effective = physicalCells.length + offGridAllowanceScu;
          throw new Error(`Peak cargo exceeds ${effective} SCU effective capacity. Increase the off-grid allowance or change the route.`);
        }
        available.forEach((cell, slotIndex) => {
          reservations.get(cell.id).push(lot);
          assignments.push(Object.freeze({
            ...cell,
            missionId: lot.missionId,
            missionTitle: lot.missionTitle,
            lotId: lot.id,
            cargoKey: `${lot.missionId}::${lot.id}`,
            sectorId: `${lot.missionId}:${lot.deliveryLocationId}`,
            commodity: lot.commodity,
            scuShare: Math.min(1, lot.scu - slotIndex),
            originLocationId: lot.pickupLocationId,
            originLocationLabel: lot.pickupLocationLabel,
            deliveryLocationId: lot.deliveryLocationId,
            deliveryLocationLabel: lot.deliveryLocationLabel,
            pickupStopIndex: lot.pickupStopIndex,
            deliveryStopIndex: lot.deliveryStopIndex,
            pickupRisk: lot.pickupRisk
          }));
        });
      });

    return Object.freeze({
      shipModel,
      cells: Object.freeze(physicalCells),
      assignments: Object.freeze(assignments),
      usedScu: lots.reduce((total, lot) => total + lot.scu, 0),
      peakPlannedScu: peakPlannedScu(lots, route.stops.length),
      capacityScu: physicalCells.length,
      offGridAllowanceScu,
      effectiveCapacityScu: physicalCells.length + offGridAllowanceScu
    });
  }

  const api = Object.freeze({ createCells, findStopIndex, intervalsOverlap, peakPlannedScu, planCargo });
  root.SCCompanionCargoPlanner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
