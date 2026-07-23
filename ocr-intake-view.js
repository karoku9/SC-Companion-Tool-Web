'use strict';

(function bootstrapOcrIntakeView() {
  const TESSERACT_VERSION = '7.0.0';
  const TESSERACT_MODULE_URL = `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.esm.min.js`;
  const MAX_IMAGE_DIMENSION = 2400;
  const MAX_FILES = 6;
  let initialized = false;

  function initialize() {
    if (initialized) return true;
    const intake = window.SCCompanionOcrIntake;
    const store = window.SCCompanionSession;
    const locations = window.SCCompanionLocations;
    const form = document.querySelector('#mission-form');
    const missionText = document.querySelector('#mission-text');
    if (!intake || !store || !locations || !form || !missionText) return false;
    initialized = true;

    const panel = document.createElement('section');
    panel.className = 'ocr-intake';
    panel.id = 'ocr-intake';
    panel.setAttribute('aria-labelledby', 'ocr-intake-title');
    panel.innerHTML = `
      <header class="ocr-intake-header">
        <div><small>ASSISTED INPUT / SCREENSHOT</small><strong id="ocr-intake-title">OCR mission intake</strong></div>
        <span id="ocr-engine-state">Engine loads only when used</span>
      </header>
      <div class="ocr-controls">
        <button type="button" class="button button--primary" id="ocr-choose">Choose screenshot</button>
        <button type="button" class="button button--secondary" id="ocr-cancel" disabled>Cancel OCR</button>
        <button type="button" class="button button--secondary" id="ocr-use-raw" disabled>Load raw text into editor</button>
        <input type="file" id="ocr-file-input" accept="image/png,image/jpeg,image/webp,image/bmp" multiple hidden>
      </div>
      <div class="ocr-progress" id="ocr-progress" hidden>
        <div><span id="ocr-progress-label">Preparing image…</span><strong id="ocr-progress-value">0%</strong></div>
        <progress id="ocr-progress-bar" max="100" value="0"></progress>
      </div>
      <div class="ocr-message" id="ocr-message" aria-live="polite">Select a screenshot or cropped contract image. Recognition runs in your browser; the pinned OCR engine and English model are downloaded on first use.</div>
      <div class="ocr-workspace" id="ocr-workspace" hidden>
        <aside class="ocr-preview-column">
          <div class="ocr-image-list" id="ocr-image-list"></div>
          <details class="ocr-raw-text"><summary>Extracted raw text</summary><pre id="ocr-raw-text"></pre></details>
        </aside>
        <div class="ocr-review-list" id="ocr-review-list"></div>
      </div>
      <footer class="ocr-actions">
        <p>Each extracted field keeps OCR-line provenance and confidence. Nothing is sent to route generation until the draft passes the normal mission review.</p>
        <button type="button" class="button button--primary" id="ocr-use-draft" disabled>Load OCR draft into review</button>
      </footer>`;

    const gameLogPanel = form.querySelector('#game-log-intake');
    const editorHeader = form.querySelector('.mfd-header');
    (gameLogPanel ?? editorHeader).insertAdjacentElement('afterend', panel);

    const chooseButton = panel.querySelector('#ocr-choose');
    const cancelButton = panel.querySelector('#ocr-cancel');
    const rawButton = panel.querySelector('#ocr-use-raw');
    const draftButton = panel.querySelector('#ocr-use-draft');
    const fileInput = panel.querySelector('#ocr-file-input');
    const engineState = panel.querySelector('#ocr-engine-state');
    const progressRoot = panel.querySelector('#ocr-progress');
    const progressLabel = panel.querySelector('#ocr-progress-label');
    const progressValue = panel.querySelector('#ocr-progress-value');
    const progressBar = panel.querySelector('#ocr-progress-bar');
    const message = panel.querySelector('#ocr-message');
    const workspace = panel.querySelector('#ocr-workspace');
    const imageList = panel.querySelector('#ocr-image-list');
    const rawText = panel.querySelector('#ocr-raw-text');
    const reviewList = panel.querySelector('#ocr-review-list');

    let worker = null;
    let modulePromise = null;
    let cancelled = false;
    let reports = [];
    let previewUrls = [];
    const overrides = {};

    function escapeHtml(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function setMessage(copy, tone = '') {
      message.textContent = copy;
      message.className = `ocr-message${tone ? ` is-${tone}` : ''}`;
    }

    function setProgress(status, progress) {
      const percent = Math.max(0, Math.min(100, Math.round(Number(progress ?? 0) * 100)));
      progressRoot.hidden = false;
      progressLabel.textContent = String(status ?? 'Recognizing text…').replace(/_/g, ' ');
      progressValue.textContent = `${percent}%`;
      progressBar.value = percent;
    }

    function clearPreviewUrls() {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      previewUrls = [];
    }

    async function loadOcrModule() {
      if (!modulePromise) modulePromise = import(TESSERACT_MODULE_URL);
      return modulePromise;
    }

    async function getWorker() {
      if (worker) return worker;
      engineState.textContent = `Loading Tesseract.js ${TESSERACT_VERSION}`;
      const library = await loadOcrModule();
      worker = await library.createWorker('eng', 1, {
        logger(update) {
          if (update?.status) setProgress(update.status, update.progress);
        },
        errorHandler(error) {
          console.error('OCR worker error.', error);
        }
      });
      await worker.setParameters({
        tessedit_pageseg_mode: library.PSM?.SPARSE_TEXT ?? '11',
        preserve_interword_spaces: '1',
        user_defined_dpi: '180'
      });
      engineState.textContent = `Tesseract.js ${TESSERACT_VERSION} · English`;
      return worker;
    }

    async function digestFile(file) {
      try {
        const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
        return [...new Uint8Array(digest)].slice(0, 12).map((value) => value.toString(16).padStart(2, '0')).join('');
      } catch {
        return intake.hash(`${file.name}|${file.size}|${file.lastModified}`);
      }
    }

    function sampleAverageLuma(imageData) {
      const data = imageData.data;
      let sum = 0;
      let samples = 0;
      for (let index = 0; index < data.length; index += 64) {
        sum += data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
        samples += 1;
      }
      return samples ? sum / samples : 255;
    }

    async function prepareImage(file) {
      const bitmap = await createImageBitmap(file);
      const longest = Math.max(bitmap.width, bitmap.height);
      const scale = Math.min(2, MAX_IMAGE_DIMENSION / longest);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.fillStyle = '#fff';
      context.fillRect(0, 0, width, height);
      context.filter = 'grayscale(1) contrast(1.7)';
      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close?.();

      const imageData = context.getImageData(0, 0, width, height);
      const invert = sampleAverageLuma(imageData) < 126;
      const data = imageData.data;
      for (let index = 0; index < data.length; index += 4) {
        const luma = Math.max(0, Math.min(255, Math.round(data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722)));
        const value = invert ? 255 - luma : luma;
        data[index] = value;
        data[index + 1] = value;
        data[index + 2] = value;
        data[index + 3] = 255;
      }
      context.putImageData(imageData, 0, 0);
      return { canvas, width, height, inverted: invert };
    }

    function lineConfidenceFromBlocks(data) {
      const values = {};
      const lines = [];
      (data?.blocks ?? []).forEach((block) => {
        (block.paragraphs ?? []).forEach((paragraph) => {
          (paragraph.lines ?? []).forEach((line) => {
            const text = String(line.text ?? '').trim();
            if (text) lines.push({ text, confidence: line.confidence ?? paragraph.confidence ?? block.confidence ?? data.confidence });
          });
        });
      });
      const rawLines = String(data?.text ?? '').split(/\r?\n/);
      let cursor = 0;
      rawLines.forEach((line, index) => {
        const normalized = intake.normalize(line);
        if (!normalized) return;
        const matchIndex = lines.findIndex((candidate, candidateIndex) => candidateIndex >= cursor && intake.normalize(candidate.text) === normalized);
        if (matchIndex >= 0) {
          values[index + 1] = lines[matchIndex].confidence;
          cursor = matchIndex + 1;
        }
      });
      return values;
    }

    function persistReports() {
      const sanitized = reports.slice(-10).map((report) => ({
        ...report,
        rawText: String(report.rawText ?? '').slice(0, 50000),
        lines: (report.lines ?? []).slice(0, 800),
        objectives: (report.objectives ?? []).slice(0, 40)
      }));
      const draftText = combinedDraft();
      store.patch({
        ocrImport: {
          version: 1,
          reports: sanitized,
          lastDraft: draftText ? {
            draftText,
            reportIds: reports.map((report) => report.id),
            sourceHashes: reports.map((report) => report.source.hash),
            createdAt: new Date().toISOString()
          } : null
        }
      });
    }

    function reportOverrides(report) {
      if (!overrides[report.id]) overrides[report.id] = { title: report.title.value, objectives: {} };
      return overrides[report.id];
    }

    function combinedDraft() {
      return reports.map((report) => intake.serializeReport(report, reportOverrides(report))).filter(Boolean).join('\n\n');
    }

    function fieldConfidence(field) {
      return `${Math.round((Number(field?.confidence ?? 0)) * 100)}%`;
    }

    function provenance(field) {
      const line = field?.provenance?.line;
      return line ? `Line ${line} · ${fieldConfidence(field)}` : `No OCR line · ${fieldConfidence(field)}`;
    }

    function renderReport(report) {
      const edit = reportOverrides(report);
      const card = document.createElement('article');
      card.className = 'ocr-report';
      card.dataset.reportId = report.id;
      card.innerHTML = `
        <header><div><strong>${escapeHtml(report.source.name)}</strong><small>${report.source.width}×${report.source.height} · OCR ${report.confidence}%</small></div><span>${report.summary.completeCount}/${report.summary.objectiveCount} complete</span></header>
        <label class="ocr-title-field">Mission title<input type="text" data-ocr-title value="${escapeHtml(edit.title)}"><small>${escapeHtml(provenance(report.title))}</small></label>
        <div class="ocr-objectives"></div>`;
      const list = card.querySelector('.ocr-objectives');
      report.objectives.forEach((objective, index) => {
        const objectiveEdit = edit.objectives[objective.id] ?? {};
        const row = document.createElement('section');
        row.className = `ocr-objective is-${objective.status}`;
        row.dataset.objectiveId = objective.id;
        row.innerHTML = `
          <header><strong>Objective ${index + 1}</strong><span>${objective.status === 'complete' ? 'Complete candidate' : 'Needs correction'} · ${objective.confidence}%</span></header>
          <div class="ocr-field-grid">
            <label>Action<select data-ocr-field="action">
              <option value="">Unresolved</option>
              <option value="collect">Collect</option>
              <option value="pickup">Pickup</option>
              <option value="deliver">Deliver</option>
            </select><small>${escapeHtml(provenance(objective.action))}</small></label>
            <label>Location<input type="text" data-ocr-field="location" value="${escapeHtml(objectiveEdit.location ?? objective.location.value ?? objective.location.label ?? '')}"><small>${escapeHtml(provenance(objective.location))}</small></label>
            <label>SCU<input type="number" min="0.01" step="0.01" data-ocr-field="quantity" value="${escapeHtml(objectiveEdit.quantity ?? objective.quantity.value ?? '')}"><small>${escapeHtml(provenance(objective.quantity))}</small></label>
            <label>Commodity<input type="text" data-ocr-field="commodity" value="${escapeHtml(objectiveEdit.commodity ?? objective.commodity.value ?? '')}"><small>${escapeHtml(provenance(objective.commodity))}</small></label>
          </div>
          <details><summary>Image-to-field provenance</summary><pre>${escapeHtml(objective.sourceLines.map((line) => `${line.line}: ${line.text}`).join('\n'))}</pre></details>`;
        const actionSelect = row.querySelector('[data-ocr-field="action"]');
        actionSelect.value = objectiveEdit.action ?? objective.action.value ?? '';
        list.append(row);
      });
      return card;
    }

    function render() {
      workspace.hidden = reports.length === 0;
      imageList.replaceChildren();
      reviewList.replaceChildren();
      rawText.textContent = reports.map((report) => `--- ${report.source.name} ---\n${report.rawText}`).join('\n\n');
      reports.forEach((report, index) => {
        const imageCard = document.createElement('article');
        const preview = previewUrls[index];
        imageCard.innerHTML = `${preview ? `<img src="${escapeHtml(preview)}" alt="OCR source preview for ${escapeHtml(report.source.name)}">` : '<div class="ocr-preview-unavailable">Preview unavailable after reload</div>'}<strong>${escapeHtml(report.source.name)}</strong><small>${report.source.width}×${report.source.height} · ${report.source.engine}</small>`;
        imageList.append(imageCard);
        reviewList.append(renderReport(report));
      });
      const hasText = reports.some((report) => report.rawText.trim());
      rawButton.disabled = !hasText;
      draftButton.disabled = !combinedDraft().trim();
    }

    function updateOverride(target) {
      const reportCard = target.closest('[data-report-id]');
      if (!reportCard) return;
      const report = reports.find((item) => item.id === reportCard.dataset.reportId);
      if (!report) return;
      const edit = reportOverrides(report);
      if (target.matches('[data-ocr-title]')) edit.title = target.value;
      const objectiveRow = target.closest('[data-objective-id]');
      if (objectiveRow && target.dataset.ocrField) {
        const objectiveEdit = edit.objectives[objectiveRow.dataset.objectiveId] ?? {};
        objectiveEdit[target.dataset.ocrField] = target.value;
        edit.objectives[objectiveRow.dataset.objectiveId] = objectiveEdit;
      }
      draftButton.disabled = !combinedDraft().trim();
    }

    async function processFile(file, index, total) {
      if (cancelled) throw new DOMException('OCR cancelled.', 'AbortError');
      setProgress(`Preparing ${file.name} (${index + 1}/${total})`, 0.03);
      const prepared = await prepareImage(file);
      const sourceHash = await digestFile(file);
      const activeWorker = await getWorker();
      if (cancelled) throw new DOMException('OCR cancelled.', 'AbortError');
      const result = await activeWorker.recognize(prepared.canvas, {}, { blocks: true });
      const report = intake.inspectOcrText(result.data.text, locations, {
        sourceName: file.name,
        sourceType: file.type || 'image',
        sourceSize: file.size,
        width: prepared.width,
        height: prepared.height,
        sourceHash,
        engine: 'Tesseract.js',
        engineVersion: TESSERACT_VERSION,
        globalConfidence: result.data.confidence,
        lineConfidence: lineConfidenceFromBlocks(result.data)
      });
      return report;
    }

    async function processFiles(fileList) {
      const files = [...fileList].filter((file) => file.type.startsWith('image/')).slice(0, MAX_FILES);
      if (!files.length) {
        setMessage('Choose a PNG, JPEG, WebP or BMP image.', 'error');
        return;
      }
      cancelled = false;
      chooseButton.disabled = true;
      cancelButton.disabled = false;
      draftButton.disabled = true;
      rawButton.disabled = true;
      progressRoot.hidden = false;
      clearPreviewUrls();
      reports = [];
      Object.keys(overrides).forEach((key) => delete overrides[key]);
      previewUrls = files.map((file) => URL.createObjectURL(file));
      render();
      setMessage(`Processing ${files.length} image${files.length === 1 ? '' : 's'} locally. First use may download the pinned OCR runtime and English model.`);
      try {
        for (let index = 0; index < files.length; index += 1) {
          const report = await processFile(files[index], index, files.length);
          reports.push(report);
          render();
        }
        persistReports();
        const complete = reports.reduce((sum, report) => sum + report.summary.completeCount, 0);
        const unresolved = reports.reduce((sum, report) => sum + report.summary.unresolvedCount, 0);
        setProgress('OCR complete', 1);
        setMessage(`${complete} complete objective candidate${complete === 1 ? '' : 's'} and ${unresolved} needing correction. Review every field before loading the draft.`, unresolved ? 'warning' : 'success');
      } catch (error) {
        if (error?.name === 'AbortError' || cancelled) setMessage('OCR was cancelled. No route or mission state changed.', 'warning');
        else {
          console.error('OCR intake failed.', error);
          setMessage(`OCR failed: ${error.message}. The image remains local and the active route was not changed.`, 'error');
        }
      } finally {
        chooseButton.disabled = false;
        cancelButton.disabled = true;
      }
    }

    async function cancelOcr() {
      cancelled = true;
      cancelButton.disabled = true;
      if (worker) {
        try { await worker.terminate(); } catch { /* worker may already be stopping */ }
        worker = null;
      }
      progressRoot.hidden = true;
    }

    function loadDraftIntoReview() {
      const draft = combinedDraft();
      if (!draft.trim()) return;
      persistReports();
      missionText.value = draft;
      missionText.dispatchEvent(new Event('input', { bubbles: true }));
      form.requestSubmit();
      setMessage('OCR draft loaded into the normal mission review. Correct any remaining blocker, then generate explicitly.', 'success');
      panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    function loadRawIntoEditor() {
      const text = reports.map((report) => report.rawText).filter(Boolean).join('\n\n');
      if (!text.trim()) return;
      missionText.value = text;
      missionText.dispatchEvent(new Event('input', { bubbles: true }));
      setMessage('Raw OCR text copied into the editor for manual cleanup. It has not generated or replaced a route.', 'warning');
    }

    function restorePrevious() {
      const state = store.getState().ocrImport;
      reports = Array.isArray(state?.reports) ? state.reports : [];
      if (!reports.length) return;
      reports.forEach((report) => reportOverrides(report));
      render();
      setMessage('Previous OCR extraction restored from this browser. Source image previews are not retained; select the images again to rerun recognition.');
      engineState.textContent = `Saved extraction · engine ${reports[0]?.source?.engineVersion || 'unknown'}`;
    }

    chooseButton.addEventListener('click', () => {
      fileInput.value = '';
      fileInput.click();
    });
    fileInput.addEventListener('change', () => processFiles(fileInput.files ?? []));
    cancelButton.addEventListener('click', cancelOcr);
    draftButton.addEventListener('click', loadDraftIntoReview);
    rawButton.addEventListener('click', loadRawIntoEditor);
    reviewList.addEventListener('input', (event) => updateOverride(event.target));
    reviewList.addEventListener('change', (event) => updateOverride(event.target));
    window.addEventListener('beforeunload', () => {
      clearPreviewUrls();
      worker?.terminate?.();
    });

    restorePrevious();
    window.dispatchEvent(new Event('sc:ocr-intake-ready'));
    return true;
  }

  if (!initialize()) window.addEventListener('sc:dynamic-pages-ready', initialize, { once: true });
}());
