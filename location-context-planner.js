'use strict';

(function initializePlannerLocationContext() {
  const contextModel = window.SCCompanionLocationContext;
  const locations = window.SCCompanionLocations;
  const routeList = document.querySelector('#planner-route-list');
  if (!contextModel || !locations || !routeList) return;

  function resolveLocation(label) {
    const normalized = String(label ?? '').trim().toLowerCase();
    const candidates = locations.searchOperationalLocations(label);
    return candidates.find((location) => locations.formatOperationalLabel(location).toLowerCase() === normalized)
      ?? candidates[0]
      ?? null;
  }

  function onboardScu(item) {
    const value = item.querySelector('.planner-stop-total strong')?.textContent ?? '';
    return Math.max(0, Number(value.match(/([\d.]+)\s*SCU/i)?.[1] ?? 0));
  }

  function enhance() {
    routeList.querySelectorAll('.planner-route-stop').forEach((item) => {
      const label = item.querySelector('.planner-stop-main > strong')?.textContent?.trim();
      if (!label) return;
      const location = resolveLocation(label);
      const locationId = location?.id ?? `custom-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
      const context = contextModel.buildContext(locationId, { onboardScu: onboardScu(item), label });
      let panel = item.querySelector('.planner-location-context');
      if (!panel) {
        panel = document.createElement('div');
        panel.className = 'planner-location-context';
        item.querySelector('.planner-stop-main')?.append(panel);
      }
      panel.className = `planner-location-context is-${context.exposure.level}`;
      panel.dataset.locationId = locationId;
      panel.innerHTML = `<strong>${context.exposure.label}</strong><span>${context.system?.name ?? 'System unavailable'} · ${context.confidence.label}</span><small>${context.exposure.reasons[0] ?? 'No derived guidance available.'}</small>`;
    });
  }

  const observer = new MutationObserver(enhance);
  observer.observe(routeList, { childList: true, subtree: true });
  window.addEventListener('sc:session-change', () => requestAnimationFrame(enhance));
  requestAnimationFrame(enhance);
}());
