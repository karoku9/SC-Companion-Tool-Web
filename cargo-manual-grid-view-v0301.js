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
    const orderedCells = orderedRows.flatMap((row) => layout.floorCells
      .filter((cell) => cell.row === row)
      .sort((left, right) => left.column - right.column));

    const cells = orderedCells.map((cell) => {
      const group = cell.groupKey ? groups.get(String(cell.groupKey)) : null;
      const classes = [
        'ops-v030-cell',
        group ? `is-group-${cell.colorIndex}` : '',
        cell.manual ? 'is-manual' : '',
        cell.reserved ? 'is-reserved' : '',
        cell.forcedEmpty ? 'is-buffer' : ''
      ].filter(Boolean).join(' ');
      const layers = Number(cell.capacityLayers ?? layout.geometry.layers ?? 1);
      const name = cell.reserved ? 'Reserved' : cell.forcedEmpty ? 'Keep empty' : group ? labelFor(group) : 'Empty';
      const stack = Array.from({ length: layers }, (_, index) => `<i class="${index < Number(cell.usedLayers ?? 0) ? 'is-used' : ''}"></i>`).join('');
      return `<button type="button" class="${classes}" data-v030-cell="${escapeHtml(cell.id)}" draggable="${String(Boolean(group && mode === 'move'))}">
        <small>${escapeHtml(cell.coordinate)}</small><b>${cell.reserved ? '—' : `${cell.usedLayers ?? 0}/${layers}`}</b>
        <strong>${escapeHtml(name)}</strong><span class="ops-v030-stack">${stack}</span>
      </button>`;
    }).join('');

    const groupButtons = layout.groups.length
      ? layout.groups.map((group) => `<button type="button" class="ops-v030-group-button is-group-${group.colorIndex}" data-v030-group="${escapeHtml(group.key)}" aria-pressed="${String(String(group.key) === String(selectedGroupKey))}">
          <span></span><div><strong>${escapeHtml(labelFor(group))}</strong><small>${group.scu} SCU · unload #${group.unloadOrder} · ${escapeHtml(group.coordinates.join(', '))}</small></div><b>${group.scu}</b>
        </button>`).join('')
      : '<div class="tool-empty">No mission cargo is onboard at this point.</div>';

    host.innerHTML = `
      <header class="ops-v030-editor-header">
        <div class="ops-v030-editor-title"><small>CARGO / PHYSICAL SNAP GRID</small><strong>${escapeHtml(layout.modelLabel)} · ${layout.capacityScu} SCU official grid</strong></div>
        <button type="button" class="ops-v030-action-button" data-v030-close>Close</button>
      </header>
      <div class="ops-v030-editor-body">
        <section class="ops-v030-grid-side">
          <nav class="ops-v030-editor-toolbar" aria-label="Cargo grid editing mode">
            <button type="button" class="ops-v030-action-button" data-v030-toggle-manual>${manual.enabled ? 'MANUAL ON' : 'ENABLE MANUAL'}</button>
            ${['move', 'reserve', 'buffer', 'clear'].map((item) => `<button type="button" class="ops-v030-mode-button" data-v030-mode="${item}" aria-pressed="${String(mode === item)}">${item === 'move' ? 'MOVE / ASSIGN' : item === 'reserve' ? 'RESERVE CELL' : item === 'buffer' ? 'KEEP EMPTY' : 'CLEAR OVERRIDE'}</button>`).join('')}
            <button type="button" class="ops-v030-action-button is-danger" data-v030-reset>RESET AUTO</button>
          </nav>
          <div class="ops-v030-grid-wrap"><div class="ops-v030-grid" style="--cargo-columns:${layout.geometry.columns};--cargo-rows:${layout.geometry.rows}">${cells}</div></div>
          <div class="ops-v030-ramp-label">REAR RAMP / ACCESS · ROW A · rows shown F → A</div>
        </section>
        <aside class="ops-v030-side-panel">
          <div class="ops-v030-editor-stats">
            <article><small>Mission cargo</small><strong>${layout.usedScu} SCU</strong></article>
            <article><small>Reserved</small><strong>${layout.reservedScu ?? 0} SCU</strong></article>
            <article><small>Usable grid</small><strong>${layout.usableCapacityScu ?? layout.capacityScu} SCU</strong></article>
            <article><small>Usable free</small><strong>${layout.freeScu} SCU</strong></article>
          </div>
          <div class="ops-v030-editor-help">Drag an occupied square onto another square, or select a destination group and click its target coordinate. <b>Reserve cell</b> marks unrelated cargo or an obstruction. <b>Keep empty</b> forces a loading buffer.</div>
          <div class="ops-v030-groups">${groupButtons}</div>
          <div id="ops-v030-editor-message" class="ops-v030-editor-message">${selectedGroupKey ? `Selected: ${escapeHtml(labelFor(groups.get(String(selectedGroupKey))))}` : 'Select a cargo group or drag a filled cell.'}</div>
        </aside>
      </div>
      <footer class="ops-v030-editor-footer"><span>Grid profile: ${layout.geometry.rows} × ${layout.geometry.columns} floor cells · ${layout.geometry.layers} SCU vertical capacity per cell</span><span>Changes save locally immediately</span></footer>`;

    bind(host, model, layout);
  }

  function message(text, isError = false) {
    const node = document.querySelector('#ops-v030-editor-message');
    if (!node) return;
    node.textContent = text;
    node.classList.toggle('is-error', isError);
  }

  function action(callback) {
    try {
      callback();
    } catch (error) {
      message(error.message, true);
    }
  }

  function bind(host, model, layout) {
    host.querySelector('[data-v030-close]')?.addEventListener('click', close);
    host.querySelector('[data-v030-toggle-manual]')?.addEventListener('click', () => action(() => autoCargo.setEnabled(model, !autoCargo.recordFor(store.getState(), model).enabled)));
    host.querySelector('[data-v030-reset]')?.addEventListener('click', () => action(() => {
      selectedGroupKey = null;
      autoCargo.reset(model);
    }));
    host.querySelectorAll('[data-v030-mode]').forEach((button) => button.addEventListener('click', () => {
      mode = button.dataset.v030Mode;
      lastSignature = '';
      render(true);
    }));
    host.querySelectorAll('[data-v030-group]').forEach((button) => button.addEventListener('click', () => {
      selectedGroupKey = button.dataset.v030Group;
      mode = 'move';
      lastSignature = '';
      render(true);
    }));

    host.querySelectorAll('[data-v030-cell]').forEach((button) => {
      const cellId = button.dataset.v030Cell;
      const cell = layout.floorCells.find((item) => String(item.id) === String(cellId));
      button.addEventListener('click', () => {
        if (mode === 'reserve') {
          if (cell?.groupKey) return message('Move mission cargo out of this square before reserving it.', true);
          return action(() => autoCargo.toggleReserved(model, cellId));
        }
        if (mode === 'buffer') return action(() => autoCargo.toggleEmpty(model, cellId));
        if (mode === 'clear') return action(() => autoCargo.clearCell(model, cellId));
        if (selectedGroupKey) return action(() => autoCargo.assignGroup(model, selectedGroupKey, cellId, layout));
        if (cell?.groupKey) {
          selectedGroupKey = String(cell.groupKey);
          lastSignature = '';
          render(true);
        } else message('Select a cargo group first, or drag an occupied square here.');
      });

      button.addEventListener('dragstart', (event) => {
        if (!cell?.groupKey) return event.preventDefault();
        dragSourceId = cellId;
        button.classList.add('is-dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', cellId);
      });
      button.addEventListener('dragend', () => {
        dragSourceId = null;
        button.classList.remove('is-dragging');
        host.querySelectorAll('.is-drop-target').forEach((node) => node.classList.remove('is-drop-target'));
      });
      button.addEventListener('dragover', (event) => {
        if (!dragSourceId || cell?.reserved) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        button.classList.add('is-drop-target');
      });
      button.addEventListener('dragleave', () => button.classList.remove('is-drop-target'));
      button.addEventListener('drop', (event) => {
        event.preventDefault();
        button.classList.remove('is-drop-target');
        const sourceId = event.dataTransfer.getData('text/plain') || dragSourceId;
        if (sourceId) action(() => autoCargo.moveCell(model, sourceId, cellId, layout));
      });
    });
  }

  function open() {
    const host = editor();
    host.hidden = false;
    document.documentElement.classList.add('cargo-grid-editor-open');
    lastSignature = '';
    render(true);
    host.querySelector('[data-v030-close]')?.focus();
  }

  function close() {
    editor().hidden = true;
    document.documentElement.classList.remove('cargo-grid-editor-open');
  }

  function update() {
    const layout = autoCargo.getLastLayout();
    if (layout) preview(layout);
    if (!editor().hidden) render();
  }

  root.addEventListener('sc:session-change', update);
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !editor().hidden) close();
  });

  const mountObserver = new MutationObserver(() => {
    if (document.querySelector('.operations-page.operations-v028 .ops-v028-cargo-panel')) {
      update();
      mountObserver.disconnect();
    }
  });
  mountObserver.observe(document.documentElement, { childList: true, subtree: true });
  update();
}(typeof globalThis !== 'undefined' ? globalThis : window));
