'use strict';

(function connectOperationsToMissions(root) {
  function openMissionStage(stage, append = false) {
    const navigation = document.querySelector('[data-view-target="missions"]');
    navigation?.click();
    requestAnimationFrame(() => {
      const stageButton = document.querySelector(`.missions-page [data-stage="${stage}"]`);
      if (stageButton && !stageButton.disabled) stageButton.click();
      if (stage !== 'input') return;
      const text = document.querySelector('#mission-text');
      if (!text) return;
      if (append) {
        const current = text.value.trimEnd();
        const count = root.SCCompanionSession?.getState?.().missions?.length ?? 0;
        text.value = `${current}${current ? '\n\n' : ''}Mission ${count + 1}\ncollect \ndeliver `;
      }
      text.hidden = false;
      text.focus({ preventScroll: true });
      text.setSelectionRange(text.value.length, text.value.length);
      text.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }

  root.addEventListener('sc:add-current-missions', () => openMissionStage('input', true));
  root.addEventListener('sc:edit-current-missions', () => openMissionStage('review'));
}(typeof globalThis !== 'undefined' ? globalThis : window));