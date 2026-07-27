'use strict';

(function exposeAutoCargoLayoutV028(root) {
  const locations = root.SCCompanionLocations
    ?? (typeof require !== 'undefined' ? require('./locations.js') : null);
  if (!locations) return;

  const GEOMETRIES = Object.freeze({
    'drake-corsair': Object.freeze({ rows: 6, columns: 4, layers: 3, accessEdges: Object.freeze(['rear']), orientation: 'Rear ramp at row A', status: 'conceptual-grid' }),
    'drake-cutlass-black': Object.freeze({ rows: 6, columns: 4, layers: 2, accessEdges: Object.freeze(['rear', 'left', 'right']), orientation: 'Rear ramp at row A', blockedSlots: 2, status: 'conceptual-grid' }),
    'rsi-constellation-taurus': Object.freeze({ rows: 7, columns: 8, layers: 3, accessEdges: Object.freeze(['rear', 'ventral-lift']), orientation: 'Primary lift access at row A', status: 'conceptual-grid' }),
    'misc-freelancer-max': Object.freeze({ rows: 5, columns: 8, layers: 3, accessEdges: Object.freeze(['rear']), orientation: 'Rear ramp at row A', status: 'conceptual-grid' }),
    'crusader-c2-hercules': Object.freeze({ rows: 12, columns: 12, layers: 5, accessEdges: Object.freeze(['front', 'rear']), orientation: 'Front and rear ramp access', blockedSlots: 24, status: 'conceptual-grid' }),
    'misc-starlancer-max': Object.freeze({ rows: 8, columns: 7, layers: 4, accessEdges: Object.freeze(['rear', 'side']), orientation: 'Rear access at row A', status: 'conceptual-grid' }),
    'argo-raft': Object.freeze({ rows: 3, columns: 4, layers: 8, accessEdges: Object.freeze(['external']), orientation: 'External container access', status: 'conceptual-grid' })
  });

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }

  function geometryFor(model) {
    const explicit = GEOMETRIES[model?.id];
    if (explicit) return explicit;
    const capacity = Math.max(1, Number(model?.capacityScu ?? 1));
    const columns = Math.max(3, Math.min(8, Math.ceil(Math.sqrt(capacity / 2))));
    const rows = Math.max(3, Math.ceil(capacity / columns / 2));
    const layers = Math.max(1, Math.ceil(capacity / (rows * columns)));
    return freeze({
      rows,
      columns,
      layers,
      accessEdges: model?.layout?.accessPoints ?? ['rear'],
      orientation: 'Primary access at row A',
      blockedSlots: Math.max(0, rows * columns * layers - capacity),
      status: 'generated-conceptual-grid'
    });
  }

  function floorKey(row, column) { return `${row}:${column}`; }

  function accessDistance(row, column, geometry) {
    const distances = (geometry.accessEdges ?? ['rear']).map((edge) => {
      if (edge === 'rear' || edge === 'ventral-lift' || edge === 'external') return row;
      if (edge === 'front') return geometry.rows - 1 - row;
      if (edge === 'left' || edge === 'side') return column;
      if (edge === 'right') return geometry.columns - 1 - column;
      return row;
    });
    return Math.min(...distances);
  }

  function createSlots(model) {
    const geometry = geometryFor(model);
    const capacity = Math.max(0, Number(model?.capacityScu ?? 0));
    const slots = [];
    for (let layer = 0; layer < geometry.layers; layer += 1) {
      for (let row = 0; row < geometry.rows; row += 1) {
        for (let column = 0; column < geometry.columns; column += 1) {
          if (slots.length >= capacity) break;
          slots.push({
            id: `${row}:${column}:${layer}`,
            floorId: floorKey(row, column),
            row,
            column,
            layer,
            coordinate: `${String.fromCharCode(65 + row)}${column + 1}`,
            accessDistance: accessDistance(row, column, geometry)
          });
        }
      }
    }
    return freeze({ geometry, slots });
  }

  function operationIndexes(route, missionId, lotId, type) {
    return (route?.stops ?? []).flatMap((stop, index) => stop.operations.some((operation) => (
      String(operation.missionId) === String(missionId)
      && String(operation.lotId) === String(lotId)
      && operation.type === type
    )) ? [index] : []);
  }

  function projectedLots(route, snapshotStopIndex, corrections = {}) {
    if (!route?.missions?.length) return [];
    return route.missions.flatMap((mission) => (mission.cargoLots ?? []).map((lot) => {
      const pickupIndexes = operationIndexes(route, mission.id, lot.id, lot.pickupType);
      const deliveryIndex = operationIndexes(route, mission.id, lot.id, 'delivery')[0] ?? Number.POSITIVE_INFINITY;
      const pickedUp = pickupIndexes.length > 0 && pickupIndexes.every((index) => index <= snapshotStopIndex);
      const delivered = deliveryIndex <= snapshotStopIndex;
      const correction = corrections?.[`${mission.id}::${lot.id}`];
      const actualScu = Number.isFinite(Number(correction?.actualScu)) ? Number(correction.actualScu) : Number(lot.scu ?? 0);
      return {
        key: `${mission.id}::${lot.id}`,
        missionId: mission.id,
        missionTitle: mission.title,
        lotId: lot.id,
        commodity: lot.commodity,
        scu: Math.max(0, actualScu),
        pickupIndexes,
        pickupIndex: pickupIndexes.length ? Math.max(...pickupIndexes) : -1,
        deliveryIndex,
        deliveryLocationId: lot.deliveryLocationId,
        deliveryLocationLabel: lot.deliveryLocationLabel,
        onboard: pickedUp && !delivered && correction?.status !== 'lost' && correction?.status !== 'delivered'
      };
    })).filter((lot) => lot.onboard && lot.scu > 0);
  }

  function groupLots(lots, mode = 'destination') {
    const groups = new Map();
    lots.forEach((lot) => {
      const key = mode === 'mission' ? `mission:${lot.missionId}` : `destination:${lot.deliveryLocationId}`;
      const group = groups.get(key) ?? {
        key,
        mode,
        label: mode === 'mission' ? lot.missionTitle : lot.deliveryLocationLabel,
        destinationLocationId: lot.deliveryLocationId,
        destinationLocationLabel: lot.deliveryLocationLabel,
        missionIds: new Set(),
        lots: [],
        scu: 0,
        deliveryIndex: lot.deliveryIndex,
        pickupIndex: lot.pickupIndex
      };
      group.missionIds.add(lot.missionId);
      group.lots.push(lot);
      group.scu += lot.scu;
      group.deliveryIndex = Math.min(group.deliveryIndex, lot.deliveryIndex);
      group.pickupIndex = Math.min(group.pickupIndex, lot.pickupIndex);
      groups.set(key, group);
    });
    return [...groups.values()]
      .sort((left, right) => left.deliveryIndex - right.deliveryIndex || right.scu - left.scu || left.label.localeCompare(right.label))
      .map((group, index) => freeze({
        ...group,
        missionIds: [...group.missionIds],
        lots: group.lots,
        colorIndex: index % 8,
        unloadOrder: index + 1
      }));
  }

  function seedFor(index, count, geometry) {
    const depthBands = Math.max(1, Math.ceil(count / 2));
    const band = Math.floor(index / 2);
    const depth = count === 1 ? 0 : Math.round((band / Math.max(1, depthBands - 1)) * (geometry.rows - 1));
    return {
      row: depth,
      column: index % 2 === 0 ? 0 : geometry.columns - 1
    };
  }

  function neighbourFloorIds(slot, geometry) {
    return [[-1, 0], [1, 0], [0, -1], [0, 1]]
      .map(([dr, dc]) => [slot.row + dr, slot.column + dc])
      .filter(([row, column]) => row >= 0 && row < geometry.rows && column >= 0 && column < geometry.columns)
      .map(([row, column]) => floorKey(row, column));
  }

  function assignGroups(model, groups) {
    const { geometry, slots } = createSlots(model);
    const capacity = slots.length;
    const totalScu = groups.reduce((sum, group) => sum + Math.ceil(group.scu), 0);
    if (totalScu > capacity) throw new Error(`Projected cargo requires ${totalScu} SCU but ${model.model ?? 'the active ship'} provides ${capacity} SCU.`);

    const used = new Map();
    const floorOwner = new Map();
    const assignments = [];
    const floorBufferAffordable = capacity - totalScu >= Math.max(0, groups.length - 1) * geometry.layers;

    groups.forEach((group, groupIndex) => {
      const seed = seedFor(groupIndex, groups.length, geometry);
      const groupSlots = [];
      const required = Math.ceil(group.scu);
      for (let unit = 0; unit < required; unit += 1) {
        const candidates = slots.filter((slot) => !used.has(slot.id));
        if (!candidates.length) throw new Error('Cargo layout ran out of physical slots.');
        const centroid = groupSlots.length ? {
          row: groupSlots.reduce((sum, slot) => sum + slot.row, 0) / groupSlots.length,
          column: groupSlots.reduce((sum, slot) => sum + slot.column, 0) / groupSlots.length,
          layer: groupSlots.reduce((sum, slot) => sum + slot.layer, 0) / groupSlots.length
        } : seed;
        candidates.sort((left, right) => {
          const score = (slot) => {
            const owner = floorOwner.get(slot.floorId);
            const foreignSameFloor = owner && owner !== group.key ? 10_000 : 0;
            const foreignNeighbours = neighbourFloorIds(slot, geometry)
              .filter((id) => floorOwner.has(id) && floorOwner.get(id) !== group.key).length;
            const separation = floorBufferAffordable ? foreignNeighbours * 700 : foreignNeighbours * 35;
            const cohesion = Math.abs(slot.row - centroid.row) * 22 + Math.abs(slot.column - centroid.column) * 14 + Math.abs(slot.layer - (centroid.layer ?? 0)) * 4;
            const seedDistance = Math.abs(slot.row - seed.row) * 12 + Math.abs(slot.column - seed.column) * 8;
            const unloadBias = slot.accessDistance * (groups.length - groupIndex) * 2;
            return foreignSameFloor + separation + cohesion + seedDistance + unloadBias + slot.layer;
          };
          return score(left) - score(right) || left.accessDistance - right.accessDistance || left.row - right.row || left.column - right.column || left.layer - right.layer;
        });
        const selected = candidates[0];
        used.set(selected.id, group.key);
        if (!floorOwner.has(selected.floorId)) floorOwner.set(selected.floorId, group.key);
        groupSlots.push(selected);
        assignments.push(freeze({
          ...selected,
          groupKey: group.key,
          groupLabel: group.label,
          colorIndex: group.colorIndex,
          unloadOrder: group.unloadOrder,
          scuShare: Math.min(1, group.scu - unit)
        }));
      }
    });

    const floorCells = [];
    for (let row = 0; row < geometry.rows; row += 1) {
      for (let column = 0; column < geometry.columns; column += 1) {
        const floorId = floorKey(row, column);
        const cellAssignments = assignments.filter((assignment) => assignment.floorId === floorId);
        const ownerKey = floorOwner.get(floorId) ?? null;
        const neighbouringOwners = new Set(
          neighbourFloorIds({ row, column }, geometry)
            .map((id) => floorOwner.get(id))
            .filter(Boolean)
        );
        floorCells.push(freeze({
          id: floorId,
          row,
          column,
          coordinate: `${String.fromCharCode(65 + row)}${column + 1}`,
          groupKey: ownerKey,
          colorIndex: cellAssignments[0]?.colorIndex ?? null,
          usedLayers: cellAssignments.length,
          capacityLayers: geometry.layers,
          buffer: !ownerKey && neighbouringOwners.size > 0,
          empty: !ownerKey
        }));
      }
    }

    const enrichedGroups = groups.map((group) => {
      const groupAssignments = assignments.filter((assignment) => assignment.groupKey === group.key);
      const coordinates = [...new Set(groupAssignments.map((assignment) => assignment.coordinate))];
      const averageDepth = groupAssignments.length
        ? groupAssignments.reduce((sum, assignment) => sum + assignment.accessDistance, 0) / groupAssignments.length
        : 0;
      return freeze({
        ...group,
        coordinates,
        averageDepth,
        accessNote: group.unloadOrder === 1
          ? 'Nearest practical access for the next drop-off.'
          : averageDepth > geometry.rows / 2
            ? 'Loaded deeper because it unloads later.'
            : 'Kept separate from adjacent destination groups where space allows.'
      });
    });

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
      bufferFloorCells: floorCells.filter((cell) => cell.buffer).length,
      leavesBufferSpace: floorCells.some((cell) => cell.buffer),
      basis: 'projected-onboard-after-active-step'
    });
  }

  function plan(route, model, options = {}) {
    const snapshotStopIndex = Number.isFinite(Number(options.snapshotStopIndex)) ? Number(options.snapshotStopIndex) : -1;
    const mode = options.mode === 'mission' ? 'mission' : 'destination';
    const lots = projectedLots(route, snapshotStopIndex, options.corrections ?? {});
    const groups = groupLots(lots, mode);
    const layout = assignGroups(model, groups);
    return freeze({ ...layout, snapshotStopIndex, lots });
  }

  const api = freeze({ GEOMETRIES, geometryFor, createSlots, projectedLots, groupLots, assignGroups, plan });
  root.SCCompanionAutoCargoLayout = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
