'use strict';

(function exposeManualCargoLayout(root) {
  const base = root.SCCompanionAutoCargoLayout;
  const store = root.SCCompanionSession;
  if (!base || !store || base.manualGridEditor) return;

  let lastLayout = null;

  function freeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }

  function keyFor(state, model) {
    return String(state?.selectedShipId ?? model?.id ?? 'active-ship');
  }

  function normalizeRecord(value) {
    const source = value && typeof value === 'object' ? value : {};
    const placements = {};
    Object.entries(source.placements ?? {}).forEach(([cellId, placement]) => {
      if (!placement?.groupKey) return;
      placements[String(cellId)] = {
        groupKey: String(placement.groupKey),
        layers: Math.max(1, Math.floor(Number(placement.layers ?? 1)))
      };
    });
    return {
      version: 1,
      enabled: Boolean(source.enabled),
      reservedCells: [...new Set((source.reservedCells ?? []).map(String))],
      emptyCells: [...new Set((source.emptyCells ?? []).map(String))],
      placements
    };
  }

  function recordFor(state, model) {
    return normalizeRecord(state?.cargoManualLayouts?.[keyFor(state, model)]);
  }

  function writeRecord(model, updater) {
    const state = store.getState();
    const key = keyFor(state, model);
    const previous = recordFor(state, model);
    const next = normalizeRecord(typeof updater === 'function' ? updater(previous) : updater);
    store.patch({
      cargoManualLayouts: {
        ...(state.cargoManualLayouts ?? {}),
        [key]: next
      }
    });
    return next;
  }

  function applyManualLayout(autoLayout, record) {
    const cellsById = new Map(autoLayout.floorCells.map((cell) => [String(cell.id), cell]));
    const groupsByKey = new Map(autoLayout.groups.map((group) => [String(group.key), group]));
    const reserved = new Set(record.reservedCells.filter((id) => cellsById.has(id)));
    const forcedEmpty = new Set(record.emptyCells.filter((id) => cellsById.has(id) && !reserved.has(id)));
    const remaining = new Map(autoLayout.groups.map((group) => [String(group.key), Math.ceil(Number(group.scu ?? 0))]));
    const ownerByCell = new Map();
    const manualCells = new Set();

    function assign(cellId, groupKey, requestedLayers, manual = false) {
      const cell = cellsById.get(String(cellId));
      const key = String(groupKey);
      if (!cell || !groupsByKey.has(key) || reserved.has(String(cellId)) || forcedEmpty.has(String(cellId)) || ownerByCell.has(String(cellId))) return 0;
      const available = Math.max(0, Number(remaining.get(key) ?? 0));
      const layers = Math.min(Math.max(0, Math.floor(Number(requestedLayers ?? 0))), Number(cell.capacityLayers ?? autoLayout.geometry.layers ?? 1), available);
      if (!layers) return 0;
      ownerByCell.set(String(cellId), { groupKey: key, layers });
      remaining.set(key, available - layers);
      if (manual) manualCells.add(String(cellId));
      return layers;
    }

    if (record.enabled) {
      Object.entries(record.placements).forEach(([cellId, placement]) => {
        assign(cellId, placement.groupKey, placement.layers, true);
      });
    }

    autoLayout.groups.forEach((group) => {
      const key = String(group.key);
      const preferred = autoLayout.floorCells.filter((cell) => String(cell.groupKey ?? '') === key);
      const fallback = autoLayout.floorCells.filter((cell) => !preferred.includes(cell));
      const ordered = [...preferred, ...fallback];
      for (const cell of ordered) {
        if (Number(remaining.get(key) ?? 0) <= 0) break;
        assign(cell.id, key, cell.capacityLayers ?? autoLayout.geometry.layers, false);
      }
    });

    const unresolved = [...remaining.entries()].filter(([, amount]) => amount > 0);
    if (unresolved.length) {
      const missing = unresolved.reduce((sum, [, amount]) => sum + amount, 0);
      throw new Error(`Manual cargo reservations leave ${missing} SCU without a valid snap-grid position.`);
    }

    const assignments = [];
    const floorCells = autoLayout.floorCells.map((cell) => {
      const id = String(cell.id);
      const owner = ownerByCell.get(id) ?? null;
      const group = owner ? groupsByKey.get(owner.groupKey) : null;
      if (owner) {
        for (let layer = 0; layer < owner.layers; layer += 1) {
          assignments.push(freeze({
            id: `${id}:${layer}`,
            floorId: id,
            row: cell.row,
            column: cell.column,
            layer,
            coordinate: cell.coordinate,
            groupKey: owner.groupKey,
            groupLabel: group?.label ?? owner.groupKey,
            colorIndex: group?.colorIndex ?? 0,
            unloadOrder: group?.unloadOrder ?? 0,
            scuShare: 1
          }));
        }
      }
      return freeze({
        ...cell,
        groupKey: owner?.groupKey ?? null,
        colorIndex: group?.colorIndex ?? null,
        usedLayers: owner?.layers ?? 0,
        empty: !owner && !reserved.has(id),
        buffer: forcedEmpty.has(id),
        reserved: reserved.has(id),
        forcedEmpty: forcedEmpty.has(id),
        manual: manualCells.has(id)
      });
    });

    const groups = autoLayout.groups.map((group) => {
      const groupCells = floorCells.filter((cell) => String(cell.groupKey ?? '') === String(group.key));
      return freeze({
        ...group,
        coordinates: groupCells.map((cell) => cell.coordinate),
        manualCoordinates: groupCells.filter((cell) => cell.manual).map((cell) => cell.coordinate)
      });
    });

    const reservedScu = floorCells.filter((cell) => cell.reserved)
      .reduce((sum, cell) => sum + Number(cell.capacityLayers ?? autoLayout.geometry.layers ?? 0), 0);
    const usableCapacityScu = Math.max(0, Number(autoLayout.capacityScu ?? 0) - reservedScu);
    const usableFreeScu = Math.max(0, usableCapacityScu - Number(autoLayout.usedScu ?? 0));

    return freeze({
      ...autoLayout,
      assignments,
      floorCells,
      groups,
      rawFreeScu: autoLayout.freeScu,
      freeScu: usableFreeScu,
      reservedScu,
      usableCapacityScu,
      manual: freeze({ ...record, active: record.enabled, key: null }),
      basis: record.enabled ? 'manual-snap-grid-with-auto-fill' : autoLayout.basis
    });
  }

  function plan(route, model, options = {}) {
    const automatic = base.plan(route, model, options);
    const state = store.getState();
    const record = recordFor(state, model);
    lastLayout = record.enabled || record.reservedCells.length || record.emptyCells.length
      ? applyManualLayout(automatic, record)
      : freeze({
        ...automatic,
        reservedScu: 0,
        usableCapacityScu: automatic.capacityScu,
        rawFreeScu: automatic.freeScu,
        manual: freeze({ ...record, active: false, key: keyFor(state, model) })
      });
    return lastLayout;
  }

  function setEnabled(model, enabled) {
    return writeRecord(model, (record) => ({ ...record, enabled: Boolean(enabled) }));
  }

  function toggleReserved(model, cellId) {
    return writeRecord(model, (record) => {
      const reserved = new Set(record.reservedCells);
      const placements = { ...record.placements };
      const empty = new Set(record.emptyCells);
      if (reserved.has(String(cellId))) reserved.delete(String(cellId));
      else {
        reserved.add(String(cellId));
        delete placements[String(cellId)];
        empty.delete(String(cellId));
      }
      return { ...record, enabled: true, reservedCells: [...reserved], emptyCells: [...empty], placements };
    });
  }

  function toggleEmpty(model, cellId) {
    return writeRecord(model, (record) => {
      const empty = new Set(record.emptyCells);
      const placements = { ...record.placements };
      const reserved = new Set(record.reservedCells);
      if (empty.has(String(cellId))) empty.delete(String(cellId));
      else {
        empty.add(String(cellId));
        delete placements[String(cellId)];
        reserved.delete(String(cellId));
      }
      return { ...record, enabled: true, reservedCells: [...reserved], emptyCells: [...empty], placements };
    });
  }

  function moveCell(model, sourceId, targetId, layout = lastLayout) {
    const source = layout?.floorCells?.find((cell) => String(cell.id) === String(sourceId));
    const target = layout?.floorCells?.find((cell) => String(cell.id) === String(targetId));
    if (!source?.groupKey || !source.usedLayers) throw new Error('Select an occupied cargo cell to move.');
    if (!target || target.reserved) throw new Error('The target cell is reserved.');
    if (String(sourceId) === String(targetId)) return recordFor(store.getState(), model);

    return writeRecord(model, (record) => {
      const placements = { ...record.placements };
      const empty = new Set(record.emptyCells);
      const reserved = new Set(record.reservedCells);
      placements[String(targetId)] = { groupKey: String(source.groupKey), layers: Number(source.usedLayers) };
      empty.delete(String(targetId));
      reserved.delete(String(targetId));

      if (target.groupKey && target.usedLayers) {
        placements[String(sourceId)] = { groupKey: String(target.groupKey), layers: Number(target.usedLayers) };
        empty.delete(String(sourceId));
      } else {
        delete placements[String(sourceId)];
        empty.add(String(sourceId));
      }
      reserved.delete(String(sourceId));
      return { ...record, enabled: true, placements, emptyCells: [...empty], reservedCells: [...reserved] };
    });
  }

  function assignGroup(model, groupKey, targetId, layout = lastLayout) {
    const candidates = (layout?.floorCells ?? [])
      .filter((cell) => String(cell.groupKey ?? '') === String(groupKey) && String(cell.id) !== String(targetId))
      .sort((left, right) => right.row - left.row || right.column - left.column);
    if (!candidates.length) throw new Error('That cargo group has no movable snap-grid cell.');
    return moveCell(model, candidates[0].id, targetId, layout);
  }

  function clearCell(model, cellId) {
    return writeRecord(model, (record) => {
      const placements = { ...record.placements };
      const empty = new Set(record.emptyCells);
      const reserved = new Set(record.reservedCells);
      delete placements[String(cellId)];
      empty.delete(String(cellId));
      reserved.delete(String(cellId));
      return { ...record, placements, emptyCells: [...empty], reservedCells: [...reserved] };
    });
  }

  function reset(model) {
    return writeRecord(model, { version: 1, enabled: false, reservedCells: [], emptyCells: [], placements: {} });
  }

  const api = freeze({
    ...base,
    version: '0.30.0',
    plan,
    manualGridEditor: true,
    getLastLayout: () => lastLayout,
    recordFor,
    setEnabled,
    toggleReserved,
    toggleEmpty,
    moveCell,
    assignGroup,
    clearCell,
    reset
  });
  root.SCCompanionAutoCargoLayout = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
