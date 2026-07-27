'use strict';

(function initializeManualCargoGridView(root) {
  const store = root.SCCompanionSession;
  const autoCargo = root.SCCompanionAutoCargoLayout;
  const shipCatalog = root.SCCompanionShipCatalog;
  const cargoZones = root.SCCompanionCargoZones;
  if (!store || !autoCargo?.manualGridEditor || !shipCatalog || !cargoZones) return;

  let selectedGroupKey = null;
  let editMode = 'move';
  let dragSourceId = null;
  let scheduled = false;

  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = new URL('./cargo-manual-grid-v030.css?v=0.30.0', document.baseURI).href;
  style.dataset.cargoManualGridStyle = '0.30.0';
  if (!document.querySelector('[data-cargo-manual-grid-style]')) document.head.append(style);

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

  function ensureEditor() {
    let editor = document.querySelector('#ops-v030-cargo-editor');
    if (editor) return editor;
    editor = document.createElement('section');
    editor.id = 'ops-v030-cargo-editor';
    editor.className = 'ops-v030-cargo-editor';
    editor.hidden = true;
    editor.setAttribute('role', 'dialog');
    editor.setAttribute('aria-modal', 'true');
    editor.setAttribute('aria-label', 'Manual cargo grid editor');
    document.body.append(editor);
    return editor;
  }

  function setMessage(message = '', error = false) {
    const host = document.querySelector('#ops-v030-editor-message');
    if (!host) return;
    host.textContent = message;
    host.classList.toggle('is-error', Boolean(error));
  }

  function groupLabel(group) {
    return String(group?.label ?? group?.groupLabel ?? group?.key ?? 'Cargo');
  }

  function decoratePreview(layout) {
    const panel = document.querySelector('.operations-page.operations-v028 .ops-v028-cargo-panel');
    if (!panel || !layout) return;
    const header = panel.querySelector('.ops-v028-panel-header');
    let button = header?.querySelector('.ops-v030-edit-grid');
    if (header && !button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'ops-v030-edit-grid';
      button.textContent = 'EDIT GRID';
      button.addEventListener('click', openEditor);
      header.insertBefore(button, header.querySelector('.ops-v028-grouping'));
    }
    if (button) button.textContent = layout.manual?.active ? 'EDIT GRID · MANUAL' : 'EDIT GRID';

    const cells = [...panel.querySelectorAll('.ops-v028-cargo-cell')];
    cells.forEach((element, index) => {
      const cell = layout.floorCells[index];
      if (!cell) return;
      element.dataset.cellId = String(cell.id);
      element.classList.toggle('is-reserved', Boolean(cell.reserved));
      element.classList.toggle('is-manual', Boolean(cell.manual));
      element.title = cell.reserved
        ? `${cell.coordinate} · reserved / occupied outside mission cargo`
        : cell.forcedEmpty
          ? `${cell.coordinate} · manually kept empty`
          : cell.groupKey
            ? `${cell.coordinate} · ${cell.usedLayers}/${cell.capacityLayers} SCU stack · ${groupLabel(layout.groups.find((group) => String(group.key) === String(cell.groupKey)))}`
            : `${cell.coordinate} · empty`;
    });
    panel.querySelector('.ops-v028-cargo-grid')?.addEventListener('dblclick', openEditor, { once: true });
  }

  function renderEditor() {
    const editor = ensureEditor();
    if (editor.hidden) return;
    const layout = autoCargo.getLastLayout();
    const state = store.getState();
    const model = activeModel(state);
    if (!layout) {
      editor.innerHTML = '<div class="tool-empty">Generate and open an active route before editing the cargo grid.</div>';
      return;
    }

    if (selectedGroupKey && !layout.groups.some((group) => String(group.key) === String(selectedGroupKey))) selectedGroupKey = null;
    const manual = autoCargo.recordFor(state, model);
    const rows = [...new Set(layout.floorCells.map((cell) => cell.row))].sort((left, right) => right - left);
    const orderedCells = rows.flatMap((row) => layout.floorCells.filter((cell) => cell.row === row).sort((left, right) => left.column - right.column));
    const groupsByKey = new Map(layout.groups.map((group) => [String(group.key), group]));

    const cellMarkup = orderedCells.map((cell) => {
      const group = cell.groupKey ? groupsByKey.get(String(cell.groupKey)) : null;
      const classes = [
        'ops-v030-cell',
        cell.groupKey ? `is-group-${cell.colorIndex}` : '',
        cell.manual ? 'is-manual' : '',
        cell.reserved ? 'is-reserved' : '',
        cell.forcedEmpty ? 'is-buffer' : ''
      ].filter(Boolean).join(' ');
      const label = cell.reserved ? 'Reserved' : cell.forcedEmpty ? 'Keep empty' : group ? groupLabel(group) : 'Empty';
      const layers = Number(cell.capacityLayers ?? layout.geometry.layers ?? 1);
      const stack = Array.from({ length: layers }, (_, index) => `<i class="${index < Number(cell.usedLayers ?? 0) ? 'is-used' : ''}"></i>`).join('');
      return `<button type="button" class="${classes}" data-v030-cell="${escapeHtml(cell.id)}" draggable="${Boolean(cell.groupKey && editMode === 'move')}">
        <small>${escapeHtml(cell.coordinate)}</small><b>${cell.reserved ? '—' : `${cell.usedLayers ?? 0}/${layers}`}</b>
        <strong>${escapeHtml(label)}</strong><span class="ops-v030-stack">${stack}</span>
      </button>`;
    }).join('');

    const groupMarkup = layout.groups.length ? layout.groups.map((group) => `<button type="button" class="ops-v030-group-button is-group-${group.colorIndex}" data-v030-group="${escapeHtml(group.key)}" aria-pressed="${String(String(selectedGroupKey) === String(group.key))}">
      <span></span><div><strong>${escapeHtml(groupLabel(group))}</strong><small>${group.scu} SCU · unload #${group.unloadOrder} · ${escapeHtml(group.coordinates.join(', '))}</small></div><b>${group.scu}</b>
    </button>`).join('') : '<div class="tool-empty">No mission cargo is onboard at this point.</div>';

    editor.innerHTML = `
      <header class="ops-v030-editor-header">
        <div class="ops-v030-editor-title"><small>CARGO / PHYSICAL SNAP GRID</small><strong>${escapeHtml(layout.modelLabel)} · ${layout.capacityScu} SCU official grid</strong></div>
        <button type="button" class="ops-v030-action-button" data-v030-close>Close</button>
      </header>
      <div class="ops-v030-editor-body">
        <section class="ops-v030-grid-side">
          <nav class="ops-v030-editor-toolbar" aria-label="Cargo grid editing mode">
            <button type="button" class="ops-v030-action-button" data-v030-toggle-manual>${manual.enabled ? 'MANUAL ON' : 'ENABLE MANUAL'}</button>
            ${['move', 'reserve', 'buffer', 'clear'].map((mode) => `<button type="button" class="ops-v030-mode-button" data-v030-mode="${mode}" aria-pressed="${String(editMode === mode)}">${mode === 'move' ? 'MOVE / ASSIGN' : mode === 'reserve' ? 'RESERVE CELL' : mode === 'buffer' ? 'KEEP EMPTY' : 'CLEAR OVERRIDE'}</button>`).join('')}
            <button type="button" class="ops-v030-action-button is-danger" data-v030-reset>RESET AUTO</button>
          </nav>
          <div class="ops-v030-grid-wrap">
            <div class="ops-v030-grid" style="--cargo-columns:${layout.geometry.columns};--cargo-rows:${layout.geometry.rows}">${cellMarkup}</div>
          </div>
          <div class="ops-v030-ramp-label">REAR RAMP / ACCESS · ROW A · rows shown F → A</div>
        </section>
        <aside class="ops-v030-side-panel">
          <div class="ops-v030-editor-stats">
            <article><small>Mission cargo</small><strong>${layout.usedScu} SCU</strong></article>
            <article><small>Reserved</small><strong>${layout.reservedScu ?? 0} SCU</strong></article>
            <article><small>Usable grid</small><strong>${layout.usableCapacityScu ?? layout.capacityScu} SCU</strong></article>
            <article><small>Usable free</small><strong>${layout.freeScu} SCU</strong></article>
          </div>
          <div class="ops-v030-editor-help">Drag an occupied square onto another square, or select a destination group and click its target coordinate. <b>Reserve cell</b> marks space occupied by unrelated cargo or an obstruction. <b>Keep empty</b> forces a loading buffer.</div>
          <div class="ops-v030-groups">${groupMarkup}</div>
          <div id="ops-v030-editor-message" class="ops-v030-editor-message">${selectedGroupKey ? `Selected: ${escapeHtml(groupLabel(groupsByKey.get(String(selectedGroupKey))))}` : 'Select a cargo group or drag a filled cell.'}</div>
        </aside>
      </div>
      <footer class="ops-v030-editor-footer"><span>Grid profile: ${layout.geometry.rows} × ${layout.geometry.columns} floor cells · ${layout.geometry.layers} SCU vertical capacity per cell</span><span>Changes save locally immediately</span></footer>`;

    bindEditorEvents(editor, model, layout);
  }

  function runAction(action) {
    try {
      action();
      setMessage('Cargo grid updated.');
    } catch (error) {
      setMessage(error.message, true);
    }
  }

  function bindEditorEvents(editor, model, layout) {
    editor.querySelector('[data-v030-close]')?.addEventListener('click', closeEditor);
    editor.querySelector('[data-v030-toggle-manual]')?.addEventListener('click', () => runAction(() => autoCargo.setEnabled(model, !autoCargo.recordFor(store.getState(), model).enabled)));
    editor.querySelector('[data-v030-reset]')?.addEventListener('click', () => runAction(() => {
      selectedGroupKey = null;
      autoCargo.reset(model);
    }));
    editor.querySelectorAll('[data-v030-mode]').forEach((button) => button.addEventListener('click', () => {
      editMode = button.dataset.v030Mode;
      renderEditor();
    }));
    editor.querySelectorAll('[data-v030-group]').forEach((button) => button.addEventListener('click', () => {
      selectedGroupKey = button.dataset.v030Group;
      editMode = 'move';
      renderEditor();
    }));

    editor.querySelectorAll('[data-v030-cell]').forEach((button) => {
      const cellId = button.dataset.v030Cell;
      const cell = layout.floorCells.find((item) => String(item.id) === String(cellId));
      button.addEventListener('click', () => {
        if (editMode === 'reserve') {
          if (cell?.groupKey) return setMessage('Move mission cargo out of this square before reserving it.', true);
          return runAction(() => autoCargo.toggleReserved(model, cellId));
        }
        if (editMode === 'buffer') return runAction(() => autoCargo.toggleEmpty(model, cellId));
        if (editMode === 'clear') return runAction(() => autoCargo.clearCell(model, cellId));
        if (selectedGroupKey) return runAction(() => autoCargo.assignGroup(model, selectedGroupKey, cellId, layout));
        if (cell?.groupKey) {
          selectedGroupKey = String(cell.groupKey);
          renderEditor();
        } else setMessage('Select a cargo group first, or drag an occupied square here.');
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
        editor.querySelectorAll('.is-drop-target').forEach((item) => item.classList.remove('is-drop-target'));
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
        if (sourceId) runAction(() => autoCargo.moveCell(model, sourceId, cellId, layout));
      });
    });
  }

  function openEditor() {
    const editor = ensureEditor();
    editor.hidden = false;
    document.documentElement.classList.add('cargo-grid-editor-open');
    renderEditor();
    editor.querySelector('[data-v030-close]')?.focus();
  }

  function closeEditor() {
    const editor = ensureEditor();
    editor.hidden = true;
    document.documentElement.classList.remove('cargo-grid-editor-open');
  }

  function update() {
    const layout = autoCargo.getLastLayout();
    if (layout) decoratePreview(layout);
    if (!ensureEditor().hidden) renderEditor();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  }

  root.addEventListener('sc:session-change', schedule);
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !ensureEditor().hidden) closeEditor();
  });
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  schedule();
}(typeof globalThis !== 'undefined' ? globalThis : window));
