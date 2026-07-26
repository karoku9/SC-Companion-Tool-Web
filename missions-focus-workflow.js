'use strict';

(function initializeFocusedMissionWorkflow() {
  let initialized = false;

  function initialize() {
    if (initialized) return true;
    const page = document.querySelector('.missions-page');
    const grid = page?.querySelector('.missions-grid');
    const form = page?.querySelector('#mission-form');
    const validation = page?.querySelector('#mission-validation-panel');
    const output = page?.querySelector('.mission-output, .mission-preview');
    const gameLog = page?.querySelector('#game-log-intake');
    const ocr = page?.querySelector('#ocr-intake');
    if (!page || !grid || !form || !validation || !output || !gameLog || !ocr) return false;
    initialized = true;

    page.dataset.intakeMode = 'text';
    page.dataset.intakeStage = 'input';

    const toolbar = document.createElement('nav');
    toolbar.className = 'mission-focus-toolbar';
    toolbar.setAttribute('aria-label', 'Mission input method');
    toolbar.innerHTML = `
      <button type="button" data-mission-mode="text" aria-pressed="true"><strong>Paste text</strong><small>Fastest and most reliable</small></button>
      <button type="button" data-mission-mode="ocr" aria-pressed="false"><strong>Screenshot</strong><small>Paste with Ctrl+V</small></button>
      <button type="button" data-mission-mode="log" aria-pressed="false"><strong>Game.log</strong><small>Experimental</small></button>`;

    const stage = document.createElement('div');
    stage.className = 'mission-focus-stage';
    grid.insertBefore(toolbar, grid.firstChild);
    grid.insertBefore(stage, toolbar.nextSibling);
    stage.append(form, validation, output);

    const textControls = [...form.children].filter((node) => ![gameLog, ocr].includes(node));
    const formHeader = form.querySelector(':scope > .mfd-header');
    const submit = form.querySelector('button[type="submit"]');
    const reset = form.querySelector('#reset-session');
    const generate = validation.querySelector('#mission-generate-validated');

    const reviewBack = document.createElement('button');
    reviewBack.type = 'button';
    reviewBack.className = 'button button--secondary mission-review-back';
    reviewBack.textContent = 'Back to input';
    validation.querySelector('.mission-validation-actions > div')?.prepend(reviewBack);

    const outputActions = document.createElement('footer');
    outputActions.className = 'mission-output-actions';
    outputActions.innerHTML = `
      <button type="button" class="button button--secondary" data-mission-edit>Edit input</button>
      <button type="button" class="button button--primary" data-shell-link="route">Open Operations</button>`;
    output.append(outputActions);

    function updateHeader(mode) {
      const title = formHeader?.querySelector('strong');
      const tag = formHeader?.querySelector(':scope > span');
      const eyebrow = formHeader?.querySelector('small');
      const copy = {
        text: ['INPUT / CONTRACT TEXT', 'Paste mission text', 'PRIMARY'],
        ocr: ['INPUT / SCREENSHOT', 'Paste or load screenshot', 'OCR'],
        log: ['INPUT / EXPERIMENTAL', 'Game.log candidate import', 'EXPERIMENTAL']
      }[mode];
      if (eyebrow) eyebrow.textContent = copy[0];
      if (title) title.textContent = copy[1];
      if (tag) tag.textContent = copy[2];
    }

    function setMode(mode) {
      if (!['text', 'ocr', 'log'].includes(mode)) return;
      page.dataset.intakeMode = mode;
      page.dataset.intakeStage = 'input';
      toolbar.querySelectorAll('[data-mission-mode]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.missionMode === mode));
      });
      updateHeader(mode);
      textControls.forEach((node) => { node.hidden = mode !== 'text' && node !== formHeader; });
      gameLog.hidden = mode !== 'log';
      ocr.hidden = mode !== 'ocr';
      form.hidden = false;
      validation.hidden = true;
      output.hidden = true;
      form.classList.toggle('is-assisted-mode', mode !== 'text');
      const target = mode === 'text'
        ? form.querySelector('#mission-text')
        : mode === 'ocr'
          ? ocr.querySelector('#ocr-choose, #ocr-paste-clipboard')
          : gameLog.querySelector('#game-log-standard-import, #game-log-choose');
      target?.focus({ preventScroll: true });
    }

    function setStage(stageName) {
      page.dataset.intakeStage = stageName;
      toolbar.hidden = stageName !== 'input';
      form.hidden = stageName !== 'input';
      validation.hidden = stageName !== 'review';
      output.hidden = stageName !== 'summary';
      if (stageName === 'review') {
        validation.scrollIntoView({ block: 'start', behavior: 'smooth' });
        validation.querySelector('input, select, button')?.focus({ preventScroll: true });
        compactReviewCards();
      }
      if (stageName === 'summary') output.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    function compactReviewCards() {
      const cards = [...validation.querySelectorAll('.mission-review-card[data-mission-key]')];
      cards.forEach((card, index) => {
        const header = card.querySelector(':scope > header');
        if (!header || header.dataset.compactReady) return;
        header.dataset.compactReady = 'true';
        header.tabIndex = 0;
        header.setAttribute('role', 'button');
        header.setAttribute('aria-expanded', String(index === 0));
        card.classList.toggle('is-collapsed', index !== 0);
        const toggle = () => {
          const opening = card.classList.contains('is-collapsed');
          cards.forEach((other) => {
            other.classList.toggle('is-collapsed', other !== card || !opening);
            other.querySelector(':scope > header')?.setAttribute('aria-expanded', String(other === card && opening));
          });
        };
        header.addEventListener('click', (event) => {
          if (event.target.closest('input, select, button, label')) return;
          toggle();
        });
        header.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggle();
          }
        });
      });
    }

    toolbar.addEventListener('click', (event) => {
      const button = event.target.closest('[data-mission-mode]');
      if (button) setMode(button.dataset.missionMode);
    });

    form.addEventListener('submit', () => queueMicrotask(() => setStage('review')));
    form.addEventListener('click', (event) => {
      if (event.target.closest('#ocr-use-draft, #game-log-use-draft')) setTimeout(() => setStage('review'), 0);
    });
    reviewBack.addEventListener('click', () => setMode(page.dataset.intakeMode || 'text'));
    generate?.addEventListener('click', () => setTimeout(() => setStage('summary'), 0));
    reset?.addEventListener('click', () => setMode('text'));
    outputActions.querySelector('[data-mission-edit]')?.addEventListener('click', () => setMode('text'));

    const reviewObserver = new MutationObserver(() => compactReviewCards());
    reviewObserver.observe(validation, { childList: true, subtree: true });

    setMode('text');
    return true;
  }

  if (!initialize()) {
    const observer = new MutationObserver(() => {
      if (initialize()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('sc:dynamic-pages-ready', initialize, { once: true });
  }
}());
