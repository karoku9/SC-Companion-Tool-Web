'use strict';

(function exposeCargoPlanner(root) {
  function cellKey(row, column) {
    return `${row}:${column}`;
  }

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
          id: cellKey(row, column),
          row,
          column,
          accessDistance: accessDistance(row, column, layout)
        });
      }
    }
    return cells.slice(0, shipModel.capacityScu);
  }

  function findStopIndex(route, lotId, type) {
    return route.stops.findIndex((stop) => (
      stop.operations.some((operation) => operation.lotId === lotId && operation.type === type)
    ));
  }

  function planCargo(route, shipModel, riskResolver = () => 0) {
    const cells = createCells(shipModel)
      .sort((left, right) => left.accessDistance - right.accessDistance || left.row - right.row || left.column - right.column);
    const lots = route.missions.flatMap((mission) => mission.cargoLots.map((lot) => {
      const pickupStopIndex = findStopIndex(route, lot.id, lot.pickupType);
      const deliveryStopIndex = findStopIndex(route, lot.id, 'delivery');
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
    }));

    const requiredCells = lots.reduce((total, lot) => total + Math.ceil(lot.scu), 0);
    if (requiredCells > cells.length) {
      throw new Error(`Cargo requires ${requiredCells} SCU cells but ${shipModel.model} exposes ${cells.length}`);
    }

    const assignments = [];
    let cursor = 0;
    [...lots]
      .sort((left, right) => left.priority - right.priority || left.missionTitle.localeCompare(right.missionTitle))
      .forEach((lot) => {
        const sectorCells = cells.slice(cursor, cursor + Math.ceil(lot.scu));
        cursor += sectorCells.length;
        sectorCells.forEach((cell, slotIndex) => assignments.push(Object.freeze({
          ...cell,
          missionId: lot.missionId,
          missionTitle: lot.missionTitle,
          lotId: lot.id,
          sectorId: `${lot.missionId}:${lot.deliveryLocationId}`,
          commodity: lot.commodity,
          scuShare: Math.min(1, lot.scu - slotIndex),
          originLocationId: lot.pickupLocationId,
          originLocationLabel: lot.pickupLocationLabel,
          deliveryLocationId: lot.deliveryLocationId,
          deliveryLocationLabel: lot.deliveryLocationLabel,
          deliveryStopIndex: lot.deliveryStopIndex,
          pickupRisk: lot.pickupRisk
        })));
      });

    return Object.freeze({
      shipModel,
      cells: Object.freeze(cells),
      assignments: Object.freeze(assignments),
      usedScu: lots.reduce((total, lot) => total + lot.scu, 0),
      capacityScu: shipModel.capacityScu
    });
  }

  const api = Object.freeze({ createCells, planCargo });
  root.SCCompanionCargoPlanner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
