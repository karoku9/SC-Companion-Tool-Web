'use strict';

(function initializeManualCargoGridView(root) {
  const store = root.SCCompanionSession;
  const autoCargo = root.SCCompanionAutoCargoLayout;
  const shipCatalog = root.SCCompanionShipCatalog;
  const cargoZones = root.SCCompanionCargoZones;
  if (!store || !autoCargo?.manualGridEditor || !shipCatalog || !cargoZones) return;

  let selectedGroupKey = null;
  let mode = 'move';
  let dragSourceId = null;
  let lastSignature = '';

  if (!document.querySelector('[data-cargo-manual-grid-style]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = new URL('./cargo-manual-grid-v030.css?v=0.30.0', document.baseURI).href;
    style.dataset.cargoManualGridStyle = '0.30.0';
    document.head.append(style);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function activeModel(state = store.getState()) {
    const ship = (state.hangarShips ?? []).find((item) => item.id === state.selectedShipId) ?? null;
    const base = shipCatalog.getModel(ship?.modelId ?? state.selectedShipModelId) ?? shipCatalog.models[0];
    return cargoZones.resolveModel(base, ship, state.cargoZoneOverrides);
  }

  function editor() {
    let node = document.querySelector('#ops-v030-cargo-editor');
    if (node) return node;
    node = document.createElement('section');
    node.id = 'ops-v030-cargo-editor';
    node.className = 'ops-v030-cargo-editor';
    node.hidden = true;
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-modal', 'true');
    node.setAttribute('aria-label', 'Manual cargo grid editor');
    document.body.append(node);
    return node;
  }

  function labelFor(group) {
    return String(group?.label ?? group?.groupLabel ?? group?.key ?? 'Cargo');
  }

  function preview(layout) {
    const panel = document.querySelector('.operations-page.operations-v028 .ops-v028-cargo-panel');
    if (!panel || !layout) return;
    const header = panel.querySelector('.ops-v028-panel-header');
    let button = header?.querySelector('.ops-v030-edit-grid');
    if (header && !button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'ops-v030-edit-grid';
      button.addEventListener('click', open);
      const grouping = header.querySelector('.ops-v028-grouping');
      if (grouping?.parentElement === header) header.insertBefore(button, grouping);
      else header.append(button);
    }
    if (button) button.textContent = layout.manual?.active ? 'EDIT GRID · MANUAL' : 'EDIT GRID';

    [...panel.querySelectorAll('.ops-v028-cargo-cell')].forEach((element, index) => {
      const cell = layout.floorCells[index];
      if (!cell) return;
      element.dataset.cellId = String(cell.id);
      element.classList.toggle('is-reserved', Boolean(cell.reserved));
      element.classList.toggle('is-manual', Boolean(cell.manual));
      element.title = cell.reserved
        ? `${cell.coordinate} · reserved / unrelated cargo`
        : cell.forcedEmpty
          ? `${cell.coordinate} · manually kept empty`
          : cell.groupKey
            ? `${cell.coordinate} · ${cell.usedLayers}/${cell.capacityLayers} SCU · ${labelFor(layout.groups.find((group) => String(group.key) === String(cell.groupKey)))}`
            : `${cell.coordinate} · empty`;
    });

    const grid = panel.querySelector('.ops-v028-cargo-grid');
    if (grid && !grid.dataset.manualEditorBound) {
      grid.dataset.manualEditorBound = 'true';
      grid.addEventListener('dblclick', open);
    }
  }

  function signature(layout, manual) {
    return JSON.stringify({
      mode,
      selectedGroupKey,
      enabled: manual.enabled,
      cells: layout.floorCells.map((cell) => [cell.id, cell.groupKey, cell.usedLayers, cell.reserved, cell.forcedEmpty, cell.manual]),
      groups: layout.groups.map((group) => [group.key, group.scu, group.coordinates.join(',')])
    });
  }

  function render(force = false) {
    const host = editor();
    if (host.hidden) return;
    const layout = autoCargo.getLastLayout();
    const state = store.getState();
    const model = activeModel(state);
    if (!layout) {
      host.innerHTML = '<div class="tool-empty">Generate and open an active route before editing the cargo grid.</div>';
      return;
    }

    if (selectedGroupKey && !layout.groups.some((group) => String(group.key) === String(selectedGroupKey))) selectedGroupKey = null;
    const manual = autoCargo.recordFor(state, model);
    const nextSignature = signature(layout, manual);
    if (!force && nextSignature === lastSignature) return;
    lastSignature = nextSignature;

    const groups = new Map(layout.groups.map((group) => [String(group.key), group]));
    const orderedRows = [...new Set(layout.floorCells.map((cell) => cell.row))].sort((left, right) => right - left);
    const orderedCells = orderedRows.flatMap((row) => layout.floorCells.filter((cell) => cell.row === row).sort((left, right) => left.column - right.column));
    const placedCount = layout.floorCells.filter((cell) => cell.groupKey).length;
    const manualCount = layout.floorCells.filter((cell) => cell.manual).length;
    const reservedScu = manual.reservedCells.length * Number(layout.geometry.layersPerCell ?? 1);
    const clearedScu = manual.emptyCells.length * Number(layout.geometry.layersPerCell ?? 1);
    const usableScu = Math.max(0, Number(layout.capacityScu ?? 0) - reservedScu - clearedScu);
    const referenceNote = layout.geometry.geometryStatus === 'configured-corsair-72-scu-grid'
      ? '72 SCU official capacity represented as a configured 6 × 4 floor matrix with 3 SCU vertical capacity per cell. Cell coordinates are planning labels, not a certified manufacturer blueprint.'
      : 'Conceptual floor matrix derived from the ship cargo profile. Capacity is authoritative inside this tool; exact floor geometry is not claimed.';

    host.innerHTML = `<header class="ops-v030-editor-header"><div><small>CARGO / MANUAL GRID</small><strong class="ops-v030-editor-title">${escapeHtml(layout.geometry.label)}</strong><span>${escapeHtml(referenceNote)}</span></div><button type="button" data-v030-close aria-label="Close cargo grid editor">×</button></header>
      <div class="ops-v030-editor-body">
        <aside class="ops-v030-editor-sidebar">
          <section><small>MODE</small><div class="ops-v030-mode-switch"><button type="button" data-v030-mode="move" class="${mode === 'move' ? 'is-active' : ''}">MOVE CARGO</button><button type="button" data-v030-mode="reserve" class="${mode === 'reserve' ? 'is-active' : ''}">RESERVE SPACE</button><button type="button" data-v030-mode="empty" class="${mode === 'empty' ? 'is-active' : ''}">KEEP EMPTY</button></div></section>
          <section><small>CARGO GROUP</small><div class="ops-v030-group-list">${layout.groups.map((group) => `<button type="button" data-v030-group="${escapeHtml(group.key)}" class="${String(selectedGroupKey) === String(group.key) ? 'is-active' : ''}"><span class="is-group-${group.colorIndex}"></span><strong>${escapeHtml(labelFor(group))}</strong><small>${group.scu} SCU · unload #${group.unloadOrder}</small></button>`).join('')}</div></section>
          <section class="ops-v030-editor-stats"><small>GRID STATE</small><dl><div><dt>Placed</dt><dd>${placedCount} / ${layout.floorCells.length} cells</dd></div><div><dt>Manual</dt><dd>${manualCount} cells</dd></div><div><dt>Reserved</dt><dd>${reservedScu} SCU</dd></div><div><dt>Kept empty</dt><dd>${clearedScu} SCU</dd></div><div><dt>Usable</dt><dd>${usableScu} SCU</dd></div></dl></section>
          <footer><button type="button" data-v030-reset>RESET AUTO LAYOUT</button></footer>
        </aside>
        <div class="ops-v030-grid-wrap"><div class="ops-v030-grid" style="--cargo-columns:${layout.geometry.columns};--cargo-rows:${layout.geometry.rows}">${orderedCells.map((cell) => {
          const group = groups.get(String(cell.groupKey));
          const label = cell.reserved ? 'Reserved' : cell.forcedEmpty ? 'Keep empty' : group ? labelFor(group) : 'Empty';
          return `<button type="button" draggable="${Boolean(group)}" data-v030-cell="${escapeHtml(cell.id)}" class="ops-v030-cell${group ? ` is-group-${group.colorIndex}` : ''}${cell.reserved ? ' is-reserved' : ''}${cell.forcedEmpty ? ' is-empty' : ''}${cell.manual ? ' is-manual' : ''}"><small>${escapeHtml(cell.coordinate)}</small><strong>${escapeHtml(label)}</strong><span>${cell.usedLayers ? `${cell.usedLayers}/${cell.capacityLayers} SCU` : cell.reserved || cell.forcedEmpty ? `${cell.capacityLayers} SCU` : '—'}</span></button>`;
        }).join('')}</div><b class="ops-v030-grid-access">ACCESS / RAMP · ROW A</b></div>
      </div>
      <footer class="ops-v030-editor-footer"><span>${layout.geometry.rows} × ${layout.geometry.columns} floor cells · ${layout.geometry.layersPerCell} SCU vertical capacity per cell</span><span>Drag occupied cells or select a group/mode, then choose an exact coordinate.</span></footer>`;

    host.querySelector('[data-v030-close]')?.addEventListener('click', close);
    host.querySelector('[data-v030-reset]')?.addEventListener('click', () => autoCargo.manualGridEditor.resetForShip(store, state, model));
    host.querySelectorAll('[data-v030-mode]').forEach((button) => button.addEventListener('click', () => { mode = button.dataset.v030Mode; selectedGroupKey = null; render(true); }));
    host.querySelectorAll('[data-v030-group]').forEach((button) => button.addEventListener('click', () => { mode = 'move'; selectedGroupKey = button.dataset.v030Group; render(true); }));
    host.querySelectorAll('[data-v030-cell]').forEach((cell) => {
      cell.addEventListener('click', () => handleCell(cell.dataset.v030Cell));
      cell.addEventListener('dragstart', (event) => {
        if (!cell.draggable) return;
        dragSourceId = cell.dataset.v030Cell;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', dragSourceId);
      });
      cell.addEventListener('dragover', (event) => { if (dragSourceId) event.preventDefault(); });
      cell.addEventListener('drop', (event) => {
        event.preventDefault();
        const sourceId = dragSourceId || event.dataTransfer.getData('text/plain');
        dragSourceId = null;
        if (sourceId && sourceId !== cell.dataset.v030Cell) autoCargo.manualGridEditor.move(store, state, model, sourceId, cell.dataset.v030Cell);
      });
      cell.addEventListener('dragend', () => { dragSourceId = null; });
    });
  }

  function handleCell(cellId) {
    const state = store.getState();
    const model = activeModel(state);
    if (mode === 'reserve') autoCargo.manualGridEditor.reserve(store, state, model, cellId);
    else if (mode === 'empty') autoCargo.manualGridEditor.keepEmpty(store, state, model, cellId);
    else if (selectedGroupKey) autoCargo.manualGridEditor.place(store, state, model, cellId, selectedGroupKey);
    else autoCargo.manualGridEditor.clearCell(store, state, model, cellId);
  }

  function open() {
    const host = editor();
    host.hidden = false;
    document.documentElement.classList.add('has-v030-cargo-editor');
    selectedGroupKey = null;
    mode = 'move';
    lastSignature = '';
    render(true);
  }

  function close() {
    const host = editor();
    host.hidden = true;
    document.documentElement.classList.remove('has-v030-cargo-editor');
  }

  root.addEventListener('sc:session-change', () => {
    const layout = autoCargo.getLastLayout();
    if (layout) preview(layout);
    if (!editor().hidden) render();
  });
  root.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !editor().hidden) close(); });
  const initial = autoCargo.getLastLayout();
  if (initial) preview(initial);
}(typeof globalThis !== 'undefined' ? globalThis : window));
