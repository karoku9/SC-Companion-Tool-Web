'use strict';

(function bootstrapAssistedIntakeAccess(root) {
  let gameLogEnhanced = false;
  let ocrEnhanced = false;

  function visible(element) {
    return Boolean(element?.isConnected && element.getClientRects().length);
  }

  function setMessage(element, copy, tone = '') {
    if (!element) return;
    element.textContent = copy;
    const base = element.id === 'game-log-message' ? 'game-log-message' : 'ocr-message';
    element.className = `${base}${tone ? ` is-${tone}` : ''}`;
  }

  function transferFiles(input, files) {
    const accepted = [...files].filter(Boolean);
    if (!input || !accepted.length) return false;
    try {
      const transfer = new DataTransfer();
      accepted.forEach((file) => transfer.items.add(file));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } catch (error) {
      console.warn('Programmatic file handoff is unavailable.', error);
      return false;
    }
  }

  function enhanceGameLog() {
    if (gameLogEnhanced) return true;
    const panel = document.querySelector('#game-log-intake');
    const chooseButton = panel?.querySelector('#game-log-choose');
    const refreshButton = panel?.querySelector('#game-log-refresh');
    const fileInput = panel?.querySelector('#game-log-file-input');
    const controls = panel?.querySelector('.game-log-controls');
    const message = panel?.querySelector('#game-log-message');
    if (!panel || !chooseButton || !refreshButton || !fileInput || !controls) return false;
    gameLogEnhanced = true;
    panel.dataset.accessEnhanced = 'true';

    chooseButton.textContent = 'Import Game.log';
    chooseButton.title = 'Uses the normal browser file input, including files inside protected installation folders.';

    const liveButton = document.createElement('button');
    liveButton.type = 'button';
    liveButton.className = 'button button--secondary';
    liveButton.id = 'game-log-live';
    liveButton.textContent = 'Enable live refresh';
    liveButton.title = 'Optional persistent file handle. Chromium may block this inside protected or system folders.';
    controls.insertBefore(liveButton, refreshButton);

    const dropZone = document.createElement('div');
    dropZone.className = 'assisted-intake-dropzone game-log-dropzone';
    dropZone.id = 'game-log-dropzone';
    dropZone.tabIndex = 0;
    dropZone.setAttribute('role', 'group');
    dropZone.setAttribute('aria-label', 'Drop Game.log here');
    dropZone.innerHTML = '<strong>Drop Game.log here</strong><span>Normal import works without persistent folder permission. Live refresh is optional.</span>';
    controls.insertAdjacentElement('afterend', dropZone);

    let liveHandle = null;
    let pendingSource = 'standard';

    function openStandardPicker() {
      liveHandle = null;
      pendingSource = 'standard';
      fileInput.value = '';
      fileInput.click();
    }

    async function chooseLiveFile() {
      if (!('showOpenFilePicker' in root)) {
        setMessage(message, 'Live refresh is not supported by this browser. Import Game.log normally and reselect it when you need newer lines.', 'warning');
        openStandardPicker();
        return;
      }
      try {
        const [handle] = await root.showOpenFilePicker({
          id: 'sc-companion-game-log-live',
          multiple: false,
          excludeAcceptAllOption: false,
          types: [{ description: 'Star Citizen Game.log', accept: { 'text/plain': ['.log', '.txt'] } }]
        });
        const file = await handle.getFile();
        liveHandle = handle;
        pendingSource = 'live';
        if (!transferFiles(fileInput, [file])) throw new Error('The browser could not hand the selected file to the importer.');
        refreshButton.disabled = false;
        refreshButton.textContent = 'Read new lines';
        setMessage(message, 'Live refresh enabled for this page session. The permission is not retained after reload.', 'success');
      } catch (error) {
        liveHandle = null;
        const detail = error?.name === 'AbortError' ? 'Live access was cancelled or blocked.' : `Live access failed: ${error.message}`;
        setMessage(message, `${detail} Use Import Game.log instead; it does not require persistent access to the installation folder.`, 'warning');
      }
    }

    async function refreshSelectedFile() {
      if (!liveHandle) {
        pendingSource = 'standard';
        fileInput.value = '';
        fileInput.click();
        return;
      }
      try {
        const permission = await liveHandle.queryPermission?.({ mode: 'read' });
        if (permission === 'denied') {
          const requested = await liveHandle.requestPermission?.({ mode: 'read' });
          if (requested !== 'granted') throw new Error('Read permission was not granted.');
        }
        const file = await liveHandle.getFile();
        pendingSource = 'live';
        if (!transferFiles(fileInput, [file])) throw new Error('The browser could not refresh the selected file.');
        refreshButton.textContent = 'Read new lines';
      } catch (error) {
        liveHandle = null;
        refreshButton.textContent = 'Reselect and read new lines';
        setMessage(message, `Live refresh is no longer available: ${error.message}. Reselect Game.log with the normal importer.`, 'warning');
      }
    }

    panel.addEventListener('click', (event) => {
      const intercepted = event.target.closest('#game-log-choose, #game-log-refresh');
      if (!intercepted) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (intercepted.id === 'game-log-choose') openStandardPicker();
      else refreshSelectedFile();
    }, true);

    liveButton.addEventListener('click', chooseLiveFile);

    fileInput.addEventListener('change', () => {
      if (!fileInput.files?.length) return;
      if (pendingSource !== 'live') liveHandle = null;
      refreshButton.disabled = false;
      refreshButton.textContent = pendingSource === 'live' ? 'Read new lines' : 'Reselect and read new lines';
      pendingSource = 'standard';
    });

    function dragState(active) {
      dropZone.classList.toggle('is-dragover', active);
    }

    ['dragenter', 'dragover'].forEach((name) => dropZone.addEventListener(name, (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      dragState(true);
    }));
    ['dragleave', 'dragend'].forEach((name) => dropZone.addEventListener(name, () => dragState(false)));
    dropZone.addEventListener('drop', (event) => {
      event.preventDefault();
      dragState(false);
      const file = [...(event.dataTransfer?.files ?? [])].find((candidate) => /\.(?:log|txt)$/i.test(candidate.name) || candidate.type === 'text/plain');
      if (!file) {
        setMessage(message, 'Drop Game.log or a plain-text .log/.txt file.', 'error');
        return;
      }
      liveHandle = null;
      pendingSource = 'drop';
      if (!transferFiles(fileInput, [file])) {
        setMessage(message, 'Drag and drop is unavailable in this browser. Use Import Game.log.', 'warning');
      }
    });

    return true;
  }

  function enhanceOcr() {
    if (ocrEnhanced) return true;
    const panel = document.querySelector('#ocr-intake');
    const controls = panel?.querySelector('.ocr-controls');
    const chooseButton = panel?.querySelector('#ocr-choose');
    const fileInput = panel?.querySelector('#ocr-file-input');
    const message = panel?.querySelector('#ocr-message');
    if (!panel || !controls || !chooseButton || !fileInput) return false;
    ocrEnhanced = true;
    panel.dataset.accessEnhanced = 'true';

    chooseButton.classList.remove('button--primary');
    chooseButton.classList.add('button--secondary');
    chooseButton.textContent = 'Choose image file';

    const pasteButton = document.createElement('button');
    pasteButton.type = 'button';
    pasteButton.className = 'button button--primary';
    pasteButton.id = 'ocr-paste';
    pasteButton.textContent = 'Paste screenshot';
    pasteButton.title = 'Reads an image copied by Win+Shift+S after an explicit click.';
    controls.insertBefore(pasteButton, chooseButton);

    const pasteZone = document.createElement('div');
    pasteZone.className = 'assisted-intake-dropzone ocr-paste-zone';
    pasteZone.id = 'ocr-paste-zone';
    pasteZone.tabIndex = 0;
    pasteZone.setAttribute('role', 'group');
    pasteZone.setAttribute('aria-label', 'Paste or drop a mission screenshot');
    pasteZone.innerHTML = '<strong>Win + Shift + S → Ctrl + V here</strong><span>You can also drop screenshots. The image stays inside the browser OCR flow.</span>';
    controls.insertAdjacentElement('afterend', pasteZone);

    function timestampName(index, type) {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : type === 'image/bmp' ? 'bmp' : 'png';
      return `clipboard-${stamp}-${index + 1}.${extension}`;
    }

    function normalizeImages(files, source = 'clipboard') {
      return [...files].filter((file) => String(file.type ?? '').startsWith('image/')).map((file, index) => {
        if (source !== 'clipboard' && file.name) return file;
        return new File([file], timestampName(index, file.type), {
          type: file.type || 'image/png',
          lastModified: Date.now()
        });
      });
    }

    function handoffImages(files, source) {
      const images = normalizeImages(files, source);
      if (!images.length) {
        setMessage(message, 'The clipboard or drop did not contain an image. Use Win+Shift+S, then paste again.', 'warning');
        return false;
      }
      fileInput.value = '';
      if (!transferFiles(fileInput, images)) {
        setMessage(message, 'This browser could not transfer the pasted image. Use Choose image file instead.', 'warning');
        return false;
      }
      return true;
    }

    async function readClipboardImages() {
      if (!navigator.clipboard?.read) {
        setMessage(message, 'Direct clipboard reading is unavailable here. Focus the paste area and press Ctrl+V.', 'warning');
        pasteZone.focus();
        return;
      }
      try {
        const items = await navigator.clipboard.read();
        const blobs = [];
        for (const item of items) {
          for (const type of item.types.filter((value) => value.startsWith('image/'))) {
            blobs.push(await item.getType(type));
          }
        }
        if (!handoffImages(blobs, 'clipboard')) throw new Error('No image was available in the clipboard.');
      } catch (error) {
        setMessage(message, `Clipboard read was not granted: ${error.message}. Click the paste area and press Ctrl+V instead.`, 'warning');
        pasteZone.focus();
      }
    }

    function clipboardImages(event) {
      const files = [];
      for (const item of event.clipboardData?.items ?? []) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (!files.length) files.push(...[...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith('image/')));
      return files;
    }

    function isEditable(target) {
      return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'));
    }

    pasteButton.addEventListener('click', readClipboardImages);
    pasteZone.addEventListener('keydown', (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        readClipboardImages();
      }
    });

    document.addEventListener('paste', (event) => {
      if (!visible(panel) || isEditable(event.target)) return;
      const images = clipboardImages(event);
      if (!images.length) return;
      event.preventDefault();
      handoffImages(images, 'clipboard');
    });

    function dragState(active) {
      pasteZone.classList.toggle('is-dragover', active);
    }

    ['dragenter', 'dragover'].forEach((name) => pasteZone.addEventListener(name, (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      dragState(true);
    }));
    ['dragleave', 'dragend'].forEach((name) => pasteZone.addEventListener(name, () => dragState(false)));
    pasteZone.addEventListener('drop', (event) => {
      event.preventDefault();
      dragState(false);
      handoffImages(event.dataTransfer?.files ?? [], 'drop');
    });

    return true;
  }

  function initialize() {
    const gameLogReady = enhanceGameLog();
    const ocrReady = enhanceOcr();
    return gameLogReady && ocrReady;
  }

  initialize();
  root.addEventListener('sc:game-log-intake-ready', initialize);
  root.addEventListener('sc:ocr-intake-ready', initialize);
  root.addEventListener('sc:dynamic-pages-ready', initialize);
  if (!gameLogEnhanced || !ocrEnhanced) {
    const observer = new MutationObserver(() => {
      if (initialize()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}(window));
