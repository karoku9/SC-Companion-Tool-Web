'use strict';

(function preserveFocusedMissionSource(root) {
  const store = root.SCCompanionSession;
  if (!store || typeof document === 'undefined') return;

  let sourceText = '';
  let correcting = false;
  const editor = () => document.querySelector('#mission-text');

  document.addEventListener('submit', (event) => {
    if (event.target?.id === 'mission-form') sourceText = editor()?.value ?? '';
  }, true);

  document.addEventListener('click', (event) => {
    if (event.target.closest('#reset-session')) sourceText = '';
    if (event.target.closest('#ocr-use-draft, #game-log-use-draft')) {
      setTimeout(() => { sourceText = editor()?.value ?? sourceText; }, 0);
    }
  });

  root.addEventListener('sc:session-change', (event) => {
    if (correcting || !sourceText.trim()) return;
    const state = event.detail;
    if (!state?.route || state.missionSourceText === sourceText) return;
    correcting = true;
    store.patch({
      missionSourceText: sourceText,
      missionValidation: state.missionValidation
        ? { ...state.missionValidation, sourceText }
        : state.missionValidation
    });
    correcting = false;
  });
}(typeof globalThis !== 'undefined' ? globalThis : window));