'use strict';

(function bootstrapGameLogIntakeView() {
  const MAX_INITIAL_SCAN_BYTES = 24 * 1024 * 1024;
  const LINE_COUNT_CHUNK_BYTES = 4 * 1024 * 1024;
  const HEAD_PROBE_BYTES = 4096;
  let initialized = false;

  function initialize() {
    if (initialized) return true;
    const intake = window.SCCompanionGameLogIntake;
    const store = window.SCCompanionSession;
    const locations = window.SCCompanionLocations;
    const form = document.querySelector('#mission-form');
    const missionText = document.querySelector('#mission-text');
    if (!intake || !store || !locations || !form || !missionText) return false;
    initialized = true;

    const panel = document.createElement('section');
    panel.className = 'game-log-intake';
    panel.id = 'game-log-intake';
    panel.setAttribute('aria-labelledby', 'game-log-intake-title');
    panel.innerHTML = `
      <header class="game-log-intake-header">
        <div>
          <small>ASSISTED INPUT / LOCAL FILE</small>
          <strong id="game-log-intake-title">Game.log intake</strong>
        </div>
        <span id="game-log-file-state">No file selected</span>
      </header>
      <div class="game-log-controls">
        <button type="button" class="button button--primary" id="game-log-choose">Choose Game.log</button>
        <button type="button" class="button button--secondary" id="game-log-refresh" disabled>Read new lines</button>
        <button type="button" class="button button--secondary" id="game-log-copy-unresolved" disabled>Copy unresolved lines</button>
        <input type="file" id="game-log-file-input" accept=".log,.txt,text/plain" hidden>
      </div>
      <div class="game-log-summary" id="game-log-summary" aria-live="polite">
        <article><small>NEW EVENTS</small><strong>0</strong></article>
        <article><small>COMPLETE</small><strong>0</strong></article>
        <article><small>NEEDS REVIEW</small><strong>0</strong></article>
        <article><small>MISSIONS</small><strong>0</strong></article>
      </div>
      <div class="game-log-message" id="game-log-message" aria-live="polite">Select the local Game.log explicitly. The app cannot scan your computer in the background.</div>
      <div class="game-log-event-list" id="game-log-event-list"></div>
      <footer class="game-log-actions">
        <p>Only relevant candidate lines are retained in this browser. A draft enters the existing field-by-field review and never replaces the active route automatically.</p>
        <button type="button" class="button button--primary" id="game-log-use-draft" disabled>Load extracted draft into review</button>
      </footer>`;

    const editorHeader = form.querySelector('.mfd-header');
    editorHeader.insertAdjacentElement('afterend', panel);

    const chooseButton = panel.querySelector('#game-log-choose');
    const refreshButton = panel.querySelector('#game-log-refresh');
    const copyButton = panel.querySelector('#game-log-copy-unresolved');
    const fileInput = panel.querySelector('#game-log-file-input');
    const fileState = panel.querySelector('#game-log-file-state');
    const summary = panel.querySelector('#game-log-summary');
    const message = panel.querySelector('#game-log-message');
    const eventList = panel.querySelector('#game-log-event-list');
    const useDraftButton = panel.querySelector('#game-log-use-draft');

    let activeHandle = null;
    let activeFile = null;
    let activeSourceKey = null;
    let latestDraft = null;
    let latestUnresolved = [];

    function escapeHtml(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function importState() {
      return store.getState().gameLogImport ?? { version: 1, sources: {}, events: [], processedIds: [], lastDraft: null };
    }

    function setMessage(copy, tone = '') {
      message.textContent = copy;
      message.className = `game-log-message${tone ? ` is-${tone}` : ''}`;
    }

    function renderMetrics(values) {
      const metrics = [
        ['NEW EVENTS', values.freshCount ?? 0],
        ['COMPLETE', values.completeCount ?? 0],
        ['NEEDS REVIEW', values.unresolvedCount ?? 0],
        ['MISSIONS', values.missionCount ?? 0]
      ];
      summary.replaceChildren(...metrics.map(([label, value]) => {
        const card = document.createElement('article');
        card.innerHTML = `<small>${label}</small><strong>${value}</strong>`;
        return card;
      }));
    }

    function eventField(label, value, state = '') {
      return `<span${state ? ` data-state="${escapeHtml(state)}"` : ''}><small>${escapeHtml(label)}</small>${escapeHtml(value ?? 'Unresolved')}</span>`;
    }

    function renderEvents(events) {
      eventList.replaceChildren();
      const visible = [...events].slice(-30).reverse();
      if (!visible.length) {
        eventList.innerHTML = '<div class="game-log-empty">No mission-bearing Game.log lines have been detected yet.</div>';
        return;
      }
      visible.forEach((event) => {
        const item = document.createElement('article');
        item.className = `game-log-event is-${event.status}`;
        const location = event.location?.label ?? event.location?.target;
        const cargo = event.cargo?.scu && event.cargo?.commodity ? `${event.cargo.scu} SCU ${event.cargo.commodity}` : null;
        item.innerHTML = `
          <header>
            <strong>${event.status === 'complete' ? 'Complete objective candidate' : 'Partial log event'}</strong>
            <span>${escapeHtml(event.timestamp ?? 'Timestamp unavailable')} · line ${escapeHtml(event.lineNumber ?? 'unknown')}</span>
          </header>
          <div class="game-log-event-fields">
            ${eventField('Action', event.action, event.action ? 'ready' : 'missing')}
            ${eventField('Location', location, event.location?.id ? 'ready' : event.location?.status ?? 'missing')}
            ${eventField('Cargo', cargo, cargo ? 'ready' : 'missing')}
            ${eventField('Contract', event.title ?? event.contractId, event.title || event.contractId ? 'ready' : 'missing')}
          </div>
          <p>${escapeHtml(event.message)}</p>
          <details><summary>Raw provenance</summary><code>${escapeHtml(event.rawLine)}</code></details>`;
        eventList.append(item);
      });
    }

    async function countNewlines(file, endOffset) {
      let count = 0;
      for (let start = 0; start < endOffset; start += LINE_COUNT_CHUNK_BYTES) {
        const end = Math.min(endOffset, start + LINE_COUNT_CHUNK_BYTES);
        const bytes = new Uint8Array(await file.slice(start, end).arrayBuffer());
        for (let index = 0; index < bytes.length; index += 1) if (bytes[index] === 10) count += 1;
      }
      return count;
    }

    async function alignToNextLine(file, offset) {
      if (offset <= 0) return 0;
      const bytes = new Uint8Array(await file.slice(offset, Math.min(file.size, offset + 65536)).arrayBuffer());
      const newline = bytes.indexOf(10);
      return newline >= 0 ? offset + newline + 1 : file.size;
    }

    async function readCompleteRange(file, startOffset) {
      const bytes = new Uint8Array(await file.slice(startOffset).arrayBuffer());
      let finalNewline = -1;
      for (let index = bytes.length - 1; index >= 0; index -= 1) {
        if (bytes[index] === 10) {
          finalNewline = index;
          break;
        }
      }
      if (finalNewline < 0) return { text: '', nextOffset: startOffset, completeByteLength: 0, newlineCount: 0 };
      const complete = bytes.slice(0, finalNewline + 1);
      let newlineCount = 0;
      for (let index = 0; index < complete.length; index += 1) if (complete[index] === 10) newlineCount += 1;
      return {
        text: new TextDecoder('utf-8', { fatal: false }).decode(complete),
        nextOffset: startOffset + complete.byteLength,
        completeByteLength: complete.byteLength,
        newlineCount
      };
    }

    async function fileHeadHash(file) {
      const probe = await file.slice(0, Math.min(file.size, HEAD_PROBE_BYTES)).text();
      return intake.hash(probe);
    }

    function latestSourceForName(state, name) {
      return Object.entries(state.sources ?? {})
        .filter(([, source]) => source.name === name)
        .sort((left, right) => String(right[1].importedAt ?? '').localeCompare(String(left[1].importedAt ?? '')))[0]
        ? (() => {
          const [key, source] = Object.entries(state.sources ?? {})
            .filter(([, candidate]) => candidate.name === name)
            .sort((left, right) => String(right[1].importedAt ?? '').localeCompare(String(left[1].importedAt ?? '')))[0];
          return { key, source };
        })()
        : null;
    }

    function sourceKey(file, headHash, generation) {
      return `${file.name}:generation-${generation}:${headHash}`;
    }

    function eventsForSource(state, key) {
      return (state.events ?? []).filter((event) => event.sourceKey === key);
    }

    function enrichEvent(event, key) {
      return Object.freeze({
        ...event,
        id: `gle-${intake.hash(`${key}|${event.rawLine}`)}`,
        sourceKey: key
      });
    }

    async function importFile(file) {
      if (!file) return;
      chooseButton.disabled = true;
      refreshButton.disabled = true;
      setMessage('Reading complete Game.log lines…');
      try {
        const previousImport = importState();
        const headHash = await fileHeadHash(file);
        const latestSource = latestSourceForName(previousImport, file.name);
        const previousKey = latestSource?.key ?? null;
        const previousSource = latestSource?.source ?? null;
        const stableHeadComparable = Boolean(previousSource && previousSource.size >= HEAD_PROBE_BYTES && file.size >= HEAD_PROBE_BYTES);
        const headChanged = Boolean(stableHeadComparable && previousSource.headHash && previousSource.headHash !== headHash);
        const rotated = Boolean(previousSource && (file.size < previousSource.offset || headChanged));
        const generationNumber = previousSource ? Number(previousSource.generation ?? previousSource.rotationCount ?? 0) + (rotated ? 1 : 0) : 0;
        const key = previousSource && !rotated ? previousKey : sourceKey(file, headHash, generationNumber);
        const isNewGeneration = Boolean(previousSource && rotated);

        let startOffset;
        if (previousSource && !rotated) startOffset = previousSource.offset;
        else startOffset = Math.max(0, file.size - MAX_INITIAL_SCAN_BYTES);
        if ((!previousSource || rotated) && startOffset > 0) startOffset = await alignToNextLine(file, startOffset);

        const baseLineNumber = previousSource && !rotated
          ? previousSource.lineCount + 1
          : (await countNewlines(file, startOffset)) + 1;
        const range = await readCompleteRange(file, startOffset);
        const parsed = intake.parseLines(range.text, {
          sourceName: file.name,
          baseLineNumber,
          baseByteOffset: startOffset,
          locationModel: locations
        }).map((event) => enrichEvent(event, key));
        const merged = intake.mergeImportedEvents(previousImport.events, parsed, previousImport.processedIds);
        const sourceEvents = eventsForSource({ events: merged.events }, key);
        const draft = intake.buildDraft(sourceEvents);
        const sources = {
          ...(previousImport.sources ?? {}),
          [key]: {
            name: file.name,
            size: file.size,
            lastModified: file.lastModified,
            headHash,
            offset: range.nextOffset,
            lineCount: baseLineNumber - 1 + range.newlineCount,
            importedAt: new Date().toISOString(),
            generation: generationNumber,
            rotationCount: generationNumber
          }
        };
        const nextImport = {
          version: 1,
          sources,
          events: merged.events,
          processedIds: merged.processedIds,
          lastDraft: {
            sourceName: file.name,
            sourceKey: key,
            draftText: draft.draftText,
            createdAt: new Date().toISOString(),
            eventIds: draft.completeEvents.map((event) => event.id),
            summary: draft.summary,
            confidence: draft.confidence
          }
        };
        store.patch({ gameLogImport: nextImport });

        activeFile = file;
        activeSourceKey = key;
        latestDraft = draft;
        latestUnresolved = draft.unresolvedEvents;
        fileState.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB · generation ${generationNumber + 1}`;
        renderMetrics({
          freshCount: merged.fresh.length,
          completeCount: draft.completeEvents.length,
          unresolvedCount: draft.unresolvedEvents.length,
          missionCount: draft.missions.length
        });
        renderEvents(sourceEvents);
        useDraftButton.disabled = !draft.draftText.trim();
        copyButton.disabled = !latestUnresolved.length;
        const scanBoundary = startOffset > 0 && (!previousSource || rotated)
          ? ` Initial scan used the newest ${Math.round((file.size - startOffset) / 1024 / 1024)} MB; future imports continue from byte ${range.nextOffset.toLocaleString('en-US')}.`
          : '';
        const generation = isNewGeneration ? ' A new/truncated log generation was detected and isolated from the previous source.' : '';
        const incompleteTail = range.nextOffset < file.size ? ' The unfinished final line will be read on the next refresh.' : '';
        setMessage(
          `${merged.fresh.length} new relevant event${merged.fresh.length === 1 ? '' : 's'}; ${draft.completeEvents.length} complete objective candidate${draft.completeEvents.length === 1 ? '' : 's'} and ${draft.unresolvedEvents.length} needing review.${scanBoundary}${generation}${incompleteTail}`,
          draft.completeEvents.length ? 'success' : draft.unresolvedEvents.length ? 'warning' : ''
        );
      } catch (error) {
        console.error('Game.log import failed.', error);
        setMessage(`Game.log import failed: ${error.message}`, 'error');
      } finally {
        chooseButton.disabled = false;
        refreshButton.disabled = !activeHandle && !activeFile;
      }
    }

    async function chooseFile() {
      if ('showOpenFilePicker' in window) {
        try {
          const [handle] = await window.showOpenFilePicker({
            multiple: false,
            types: [{ description: 'Star Citizen Game.log', accept: { 'text/plain': ['.log', '.txt'] } }]
          });
          activeHandle = handle;
          activeFile = await handle.getFile();
          refreshButton.textContent = 'Read new lines';
          await importFile(activeFile);
          return;
        } catch (error) {
          if (error?.name === 'AbortError') return;
          console.warn('File System Access picker unavailable; falling back to file input.', error);
        }
      }
      fileInput.value = '';
      fileInput.click();
    }

    async function refreshFile() {
      if (activeHandle) {
        try {
          const permission = await activeHandle.queryPermission?.({ mode: 'read' });
          if (permission === 'denied') {
            const requested = await activeHandle.requestPermission?.({ mode: 'read' });
            if (requested !== 'granted') throw new Error('Read permission was not granted.');
          }
          activeFile = await activeHandle.getFile();
          await importFile(activeFile);
          return;
        } catch (error) {
          setMessage(`Could not refresh Game.log: ${error.message}`, 'error');
          return;
        }
      }
      fileInput.value = '';
      fileInput.click();
    }

    function loadDraftIntoReview() {
      if (!latestDraft?.draftText.trim()) return;
      missionText.value = latestDraft.draftText;
      missionText.dispatchEvent(new Event('input', { bubbles: true }));
      form.requestSubmit();
      setMessage('Extracted Game.log draft loaded into the normal mission review. Verify every field, then generate explicitly.', 'success');
      panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    async function copyUnresolved() {
      if (!latestUnresolved.length) return;
      const text = latestUnresolved.map((event) => event.rawLine).join('\n');
      try {
        await navigator.clipboard.writeText(text);
        setMessage(`${latestUnresolved.length} unresolved raw line${latestUnresolved.length === 1 ? '' : 's'} copied for diagnostics.`, 'success');
      } catch {
        setMessage('Clipboard access was unavailable. Open each Raw provenance section to copy the lines manually.', 'warning');
      }
    }

    function restoreLastImport() {
      const state = importState();
      const last = state.lastDraft;
      if (!last?.sourceKey) {
        renderEvents([]);
        return;
      }
      activeSourceKey = last.sourceKey;
      const events = eventsForSource(state, last.sourceKey);
      const draft = intake.buildDraft(events);
      latestDraft = draft;
      latestUnresolved = draft.unresolvedEvents;
      fileState.textContent = `${last.sourceName} · previous local import`;
      renderMetrics({
        freshCount: 0,
        completeCount: draft.completeEvents.length,
        unresolvedCount: draft.unresolvedEvents.length,
        missionCount: draft.missions.length
      });
      renderEvents(events);
      useDraftButton.disabled = !draft.draftText.trim();
      copyButton.disabled = !draft.unresolvedEvents.length;
      setMessage('Previous extracted candidates restored from this browser. Reselect Game.log to read newer lines; no filesystem permission is retained after reload.');
    }

    chooseButton.addEventListener('click', chooseFile);
    refreshButton.addEventListener('click', refreshFile);
    useDraftButton.addEventListener('click', loadDraftIntoReview);
    copyButton.addEventListener('click', copyUnresolved);
    fileInput.addEventListener('change', async () => {
      const [file] = fileInput.files ?? [];
      if (!file) return;
      activeHandle = null;
      activeFile = file;
      refreshButton.textContent = 'Reselect and read new lines';
      await importFile(file);
    });

    restoreLastImport();
    window.dispatchEvent(new Event('sc:game-log-intake-ready'));
    return true;
  }

  if (!initialize()) window.addEventListener('sc:dynamic-pages-ready', initialize, { once: true });
}());