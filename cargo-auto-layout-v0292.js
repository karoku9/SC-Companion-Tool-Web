'use strict';

(function exposeAutoCargoLayoutV0292(root) {
  const base = root.SCCompanionAutoCargoLayout
    ?? (typeof require !== 'undefined' ? require('./cargo-auto-layout-v028.js') : null);
  if (!base) return;

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }

  function floorKey(row, column) {
    return `${row}:${column}`;
  }

  function sideColumns(geometry, side) {
    const half = Math.floor(geometry.columns / 2);
    if (side === 'left') return Array.from({ length: half }, (_, index) => index);
    if (side === 'right') return Array.from({ length: half }, (_, index) => geometry.columns - 1 - index);
    return Array.from({ length: geometry.columns }, (_, index) => index);
  }

  function floorCatalog(model) {
    const { geometry, slots } = base.createSlots(model);
    const floors = new Map();
    slots.forEach((slot) => {
      const floor = floors.get(slot.floorId) ?? {
        id: slot.floorId,
        row: slot.row,
        column: slot.column,
        coordinate: slot.coordinate,
        slots: []
      };
      floor.slots.push(slot);
      floors.set(slot.floorId, floor);
    });
    floors.forEach((floor) => floor.slots.sort((left, right) => left.layer - right.layer));
    return { geometry, slots, floors };
  }

  function desiredStartRow(groupIndex, groupCount, rowsNeeded, geometry) {
    if (groupCount <= 1) return 0;
    const available = Math.max(0, geometry.rows - rowsNeeded);
    return Math.round((groupIndex / Math.max(1, groupCount - 1)) * available);
  }

  function blockCandidate({ geometry, floors, ownerByFloor, side, startRow, requiredScu }) {
    const columns = sideColumns(geometry, side);
    if (!columns.length) return null;
    const ordered = [];
    for (let row = startRow; row < geometry.rows; row += 1) {
      columns.forEach((column) => {
        const floor = floors.get(floorKey(row, column));
        if (floor) ordered.push(floor);
      });
    }

    const selected = [];
    let capacity = 0;
    for (const floor of ordered) {
      if (ownerByFloor.has(floor.id)) break;
      selected.push(floor);
      capacity += floor.slots.length;
      if (capacity >= requiredScu) break;
    }
    if (capacity < requiredScu) return null;

    const lastRow = Math.max(...selected.map((floor) => floor.row));
    const rowsUsed = lastRow - startRow + 1;
    const expectedCells = Math.ceil(requiredScu / Math.max(1, geometry.layers));
    if (selected.length > expectedCells + 1) return null;

    return { side, startRow, lastRow, rowsUsed, floors: selected, capacity };
  }

  function neighbouringOwners(candidate, ownerByFloor, geometry) {
    const owners = new Set();
    candidate.floors.forEach((floor) => {
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
        const row = floor.row + dr;
        const column = floor.column + dc;
        if (row < 0 || row >= geometry.rows || column < 0 || column >= geometry.columns) return;
        const owner = ownerByFloor.get(floorKey(row, column));
        if (owner) owners.add(owner);
      });
    });
    return owners.size;
  }

  function chooseCandidate({ model, geometry, floors, ownerByFloor, group, groupIndex, groupCount, preferredSide, freeScu }) {
    const requiredScu = Math.ceil(group.scu);
    const candidates = [];
    const sides = requiredScu <= Math.floor(model.capacityScu / 2)
      ? [preferredSide, preferredSide === 'left' ? 'right' : 'left']
      : ['full'];

    sides.forEach((side) => {
      const columns = sideColumns(geometry, side);
      const rowsNeeded = Math.ceil(requiredScu / Math.max(1, columns.length * geometry.layers));
      const desired = desiredStartRow(groupIndex, groupCount, rowsNeeded, geometry);
      for (let startRow = 0; startRow <= Math.max(0, geometry.rows - rowsNeeded); startRow += 1) {
        const candidate = blockCandidate({ geometry, floors, ownerByFloor, side, startRow, requiredScu });
        if (!candidate) continue;
        const adjacency = neighbouringOwners(candidate, ownerByFloor, geometry);
        const sidePenalty = side === preferredSide ? 0 : side === 'full' ? 900 : 500;
        const depthPenalty = Math.abs(startRow - desired) * 30;
        const compactnessPenalty = (candidate.floors.length - Math.ceil(requiredScu / geometry.layers)) * 20;
        const bufferPenalty = adjacency * (freeScu >= geometry.layers ? 260 : 30);
        candidates.push({
          ...candidate,
          score: sidePenalty + depthPenalty + compactnessPenalty + bufferPenalty
        });
      }
    });

    candidates.sort((left, right) => (
      left.score - right.score
      || left.startRow - right.startRow
      || left.floors[0].column - right.floors[0].column
    ));
    return candidates[0] ?? null;
  }

  function assignGroups(model, groups) {
    const { geometry, slots, floors } = floorCatalog(model);
    const capacity = slots.length;
    const totalScu = groups.reduce((sum, group) => sum + Math.ceil(group.scu), 0);
    if (totalScu > capacity) {
      throw new Error(`Projected cargo requires ${totalScu} SCU but ${model.model ?? 'the active ship'} provides ${capacity} SCU.`);
    }

    const ownerByFloor = new Map();
    const assignments = [];
    const placementByGroup = new Map();
    let freeScu = capacity - totalScu;

    groups.forEach((group, groupIndex) => {
      const preferredSide = groupIndex % 2 === 0 ? 'left' : 'right';
      const candidate = chooseCandidate({
        model,
        geometry,
        floors,
        ownerByFloor,
        group,
        groupIndex,
        groupCount: groups.length,
        preferredSide,
        freeScu
      });
      if (!candidate) {
        return;
      }

      candidate.floors.forEach((floor) => ownerByFloor.set(floor.id, group.key));
      placementByGroup.set(group.key, {
        side: candidate.side,
        startRow: candidate.startRow,
        lastRow: candidate.lastRow
      });

      let remaining = Math.ceil(group.scu);
      let unit = 0;
      candidate.floors.forEach((floor) => {
        floor.slots.forEach((slot) => {
          if (remaining <= 0) return;
          assignments.push(freeze({
            ...slot,
            groupKey: group.key,
            groupLabel: group.label,
            colorIndex: group.colorIndex,
            unloadOrder: group.unloadOrder,
            scuShare: Math.min(1, group.scu - unit)
          }));
          remaining -= 1;
          unit += 1;
        });
      });
      freeScu = Math.max(0, freeScu);
    });

    if (assignments.length !== totalScu) {
      return base.assignGroups(model, groups);
    }

    const floorCells = [];
    for (let row = 0; row < geometry.rows; row += 1) {
      for (let column = 0; column < geometry.columns; column += 1) {
        const id = floorKey(row, column);
        const floor = floors.get(id);
        const cellAssignments = assignments.filter((assignment) => assignment.floorId === id);
        const ownerKey = ownerByFloor.get(id) ?? null;
        const neighbouringOwners = new Set();
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => {
          const neighbour = ownerByFloor.get(floorKey(row + dr, column + dc));
          if (neighbour) neighbouringOwners.add(neighbour);
        });
        floorCells.push(freeze({
          id,
          row,
          column,
          coordinate: `${String.fromCharCode(65 + row)}${column + 1}`,
          groupKey: ownerKey,
          colorIndex: cellAssignments[0]?.colorIndex ?? null,
          usedLayers: cellAssignments.length,
          capacityLayers: floor?.slots.length ?? geometry.layers,
          buffer: !ownerKey && neighbouringOwners.size > 1,
          empty: !ownerKey
        }));
      }
    }

    const enrichedGroups = groups.map((group) => {
      const groupAssignments = assignments.filter((assignment) => assignment.groupKey === group.key);
      const coordinates = [...new Set(groupAssignments.map((assignment) => assignment.coordinate))];
      const placement = placementByGroup.get(group.key) ?? { side: 'full' };
      const averageDepth = groupAssignments.length
        ? groupAssignments.reduce((sum, assignment) => sum + assignment.accessDistance, 0) / groupAssignments.length
        : 0;
      const sideLabel = placement.side === 'left' ? 'left side' : placement.side === 'right' ? 'right side' : 'full-width zone';
      return freeze({
        ...group,
        coordinates,
        averageDepth,
        side: placement.side,
        accessNote: group.unloadOrder === 1
          ? `Nearest practical access on the ${sideLabel}.`
          : `Separated on the ${sideLabel}; later unloading stays deeper where possible.`
      });
    });

    const occupiedSides = new Set(enrichedGroups.map((group) => group.side).filter((side) => side === 'left' || side === 'right'));
    const bufferFloorCells = floorCells.filter((cell) => cell.buffer).length;
    return freeze({
      mode: groups[0]?.mode ?? 'destination',
      modelId: model.id,
      modelLabel: `${model.manufacturer ?? ''} ${model.model ?? ''}`.trim(),
      capacityScu: capacity,
      usedScu: totalScu,
      freeScu: capacity - totalScu,
      geometry,
      assignments,
      floorCells,
      groups: enrichedGroups,
      bufferFloorCells,
      leavesBufferSpace: bufferFloorCells > 0,
      separationMode: occupiedSides.size > 1 ? 'left-right-first' : 'compact-side-zone',
      basis: 'projected-onboard-after-active-step'
    });
  }

  function plan(route, model, options = {}) {
    const snapshotStopIndex = Number.isFinite(Number(options.snapshotStopIndex)) ? Number(options.snapshotStopIndex) : -1;
    const mode = options.mode === 'mission' ? 'mission' : 'destination';
    const lots = base.projectedLots(route, snapshotStopIndex, options.corrections ?? {});
    const groups = base.groupLots(lots, mode);
    const layout = assignGroups(model, groups);
    return freeze({ ...layout, snapshotStopIndex, lots });
  }

  const api = freeze({
    ...base,
    version: '0.29.2',
    assignGroups,
    plan
  });
  root.SCCompanionAutoCargoLayout = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
