'use strict';

(function initializeUxShell() {
  const store = window.SCCompanionSession;
  const status = document.querySelector('.system-status');
  if (!store || !status) return;

  const toastRegion = document.createElement('div');
  toastRegion.className = 'app-toast-region';
  toastRegion.setAttribute('aria-live', 'polite');
  toastRegion.setAttribute('aria-atomic', 'false');
  document.body.append(toastRegion);

  function effectiveProgress(state) {
    if (!state.route?.stops?.length) return null;
    const route = window.SCCompanionRouteCorrections?.deriveRoute(state.route, state.routeCorrections) ?? state.route;
    if (window.SCCompanionRouteProgress) return { route, progress: window.SCCompanionRouteProgress.derive(route, state.completedStopIds, state.currentStopIndex) };
    const index = Math.min(Math.max(Number(state.currentStopIndex) || 0, 0), route.stops.length);
    return { route, progress: { currentStop: route.stops[index] ?? null, completedCount: index, totalStops: route.stops.length, complete: index >= route.stops.length } };
  }

  function renderStatus(state) {
    const context = effectiveProgress(state);
    status.classList.toggle('is-active-session', Boolean(context));
    status.title = context ? 'Open Operations' : 'Open Missions';
    status.tabIndex = 0;
    status.setAttribute('role', 'button');
    if (!context) {
      status.innerHTML = '<span class="status-dot"></span><strong>READY</strong><small>BUILD A SESSION</small>';
      return;
    }
    const { route, progress } = context;
    const current = progress.currentStop?.locationLabel ?? (progress.complete ? 'SESSION COMPLETE' : 'ROUTE READY');
    status.innerHTML = `<span class="status-dot"></span><strong>${progress.completedCount}/${route.stops.length} STOPS</strong><small>${current}</small>`;
  }

  function openStatusTarget() {
    const target = store.getState().route?.stops?.length ? 'route' : 'missions';
    document.querySelector(`[data-view-target="${target}"]`)?.click();
  }

  function showToast(detail = {}) {
    const toast = document.createElement('article');
    toast.className = `app-toast is-${detail.tone ?? 'info'}`;
    const content = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = detail.title ?? 'Update';
    const message = document.createElement('span');
    message.textContent = detail.message ?? '';
    content.append(title, message);
    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.textContent = '×';
    close.addEventListener('click', () => toast.remove());
    toast.append(content, close);
    toastRegion.append(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => toast.remove(), 220);
    }, Number(detail.duration ?? 4200));
  }

  status.addEventListener('click', openStatusTarget);
  status.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openStatusTarget();
    }
  });
  window.addEventListener('sc:toast', (event) => showToast(event.detail));
  window.addEventListener('sc:session-change', (event) => renderStatus(event.detail));
  renderStatus(store.getState());
}());
