'use strict';

(function initializeAccessibilityContract() {
  const toolPanel = document.querySelector('#ops-tool-panel');
  const toolClose = document.querySelector('#ops-tool-close');
  const toolExpand = document.querySelector('#ops-tool-expand');
  const toolButtons = [...document.querySelectorAll('[data-ops-tool]')];
  if (!toolPanel || !toolClose || !toolExpand || !toolButtons.length) return;

  let keyboardInput = false;
  let lastToolTrigger = toolButtons[0];
  let panelWasVisible = !toolPanel.hidden;
  let panelWasExpanded = toolPanel.classList.contains('is-expanded');

  toolPanel.setAttribute('role', 'region');
  toolPanel.setAttribute('aria-labelledby', 'ops-tool-title');
  toolPanel.setAttribute('tabindex', '-1');

  document.addEventListener('keydown', () => { keyboardInput = true; }, true);
  document.addEventListener('pointerdown', () => { keyboardInput = false; }, true);

  toolButtons.forEach((button) => {
    button.addEventListener('pointerdown', () => { lastToolTrigger = button; });
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') lastToolTrigger = button;
    });
  });

  window.addEventListener('keydown', (event) => {
    const keyMap = { F1: 'moves', F2: 'cargo', F3: 'adjust', F4: 'route' };
    const toolId = keyMap[event.key];
    if (toolId) lastToolTrigger = toolButtons.find((button) => button.dataset.opsTool === toolId) ?? lastToolTrigger;
  }, true);

  function focusableElements() {
    return [...toolPanel.querySelectorAll('button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"])')]
      .filter((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0;
      });
  }

  function updatePanelSemantics() {
    const visible = !toolPanel.hidden;
    const expanded = toolPanel.classList.contains('is-expanded');

    toolExpand.setAttribute('aria-label', expanded ? 'Restore auxiliary display' : 'Expand auxiliary display');
    toolPanel.setAttribute('role', expanded ? 'dialog' : 'region');
    if (expanded) toolPanel.setAttribute('aria-modal', 'true');
    else toolPanel.removeAttribute('aria-modal');

    if (visible && !panelWasVisible && keyboardInput) {
      queueMicrotask(() => toolClose.focus({ preventScroll: true }));
    }
    if (visible && expanded && !panelWasExpanded) {
      queueMicrotask(() => {
        if (!toolPanel.contains(document.activeElement)) toolClose.focus({ preventScroll: true });
      });
    }
    if (!visible && panelWasVisible && toolPanel.contains(document.activeElement)) {
      queueMicrotask(() => lastToolTrigger?.focus({ preventScroll: true }));
    }

    panelWasVisible = visible;
    panelWasExpanded = expanded;
  }

  const observer = new MutationObserver(updatePanelSemantics);
  observer.observe(toolPanel, { attributes: true, attributeFilter: ['hidden', 'class'] });
  updatePanelSemantics();

  toolPanel.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || !toolPanel.classList.contains('is-expanded')) return;
    const focusables = focusableElements();
    if (!focusables.length) {
      event.preventDefault();
      toolPanel.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function activateDevelopmentTab(button) {
    const selected = button?.dataset.developmentTab;
    if (!selected) return;
    document.querySelectorAll('[data-development-tab]').forEach((item) => {
      const active = item === button;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('[data-development-pane]').forEach((pane) => {
      pane.hidden = pane.dataset.developmentPane !== selected;
    });
  }

  const developmentTabs = document.querySelector('.development-tabs');
  developmentTabs?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-development-tab]');
    if (button) activateDevelopmentTab(button);
  });
  const initiallySelectedDevelopmentTab = document.querySelector('[data-development-tab][aria-selected="true"]');
  if (initiallySelectedDevelopmentTab) activateDevelopmentTab(initiallySelectedDevelopmentTab);

  function bindRovingTabs(containerSelector, buttonSelector, selectedAttribute) {
    document.querySelectorAll(containerSelector).forEach((container) => {
      container.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        const buttons = [...container.querySelectorAll(buttonSelector)].filter((button) => !button.disabled);
        if (!buttons.length) return;
        const currentIndex = Math.max(0, buttons.indexOf(document.activeElement));
        let nextIndex = currentIndex;
        if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
        if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % buttons.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = buttons.length - 1;
        event.preventDefault();
        const next = buttons[nextIndex];
        next.focus();
        if (selectedAttribute) {
          next.click();
          if (next.dataset.developmentTab) activateDevelopmentTab(next);
        }
      });
    });
  }

  bindRovingTabs('.development-tabs', '[data-development-tab]', 'aria-selected');
  bindRovingTabs('.map-toolbar nav', '[data-map-mode]', 'aria-pressed');

  window.SCCompanionAccessibility = Object.freeze({
    focusableElements,
    activateDevelopmentTab,
    getLastToolTrigger: () => lastToolTrigger
  });
}());
