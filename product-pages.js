'use strict';

(function exposeProductPages(root) {
  const groups = Object.freeze([
    Object.freeze({
      id: 'operate',
      label: 'Operate',
      pages: Object.freeze([
        Object.freeze({ id: 'route', label: 'Operations', icon: 'OP', hint: 'Current stop and cargo', eyebrow: 'Live session', title: 'Current operation' }),
        Object.freeze({ id: 'missions', label: 'Missions', icon: 'MS', hint: 'Contracts and intake', eyebrow: 'Mission intake', title: 'Build a session' })
      ])
    }),
    Object.freeze({
      id: 'plan',
      label: 'Plan',
      pages: Object.freeze([
        Object.freeze({ id: 'route-planner', label: 'Planner', icon: 'PL', hint: 'Compare valid routes', eyebrow: 'Route planning', title: 'Choose a route' }),
        Object.freeze({ id: 'map', label: 'Starmap', icon: 'MP', hint: 'System and route context', eyebrow: 'Starmap', title: 'Route context' })
      ])
    }),
    Object.freeze({
      id: 'manage',
      label: 'Manage',
      pages: Object.freeze([
        Object.freeze({ id: 'hangar', label: 'Fleet', icon: 'FL', hint: 'Ships and cargo zones', eyebrow: 'Fleet', title: 'Ships and configuration' }),
        Object.freeze({ id: 'roadmap', label: 'Development', icon: 'DV', hint: 'Roadmap and releases', eyebrow: 'Development', title: 'Product progress' })
      ])
    })
  ]);

  const internalPages = Object.freeze([
    Object.freeze({ id: 'load-operations', parentView: 'route', panel: 'moves' }),
    Object.freeze({ id: 'cargo', parentView: 'route', panel: 'cargo' }),
    Object.freeze({ id: 'companion', parentView: 'route', panel: 'companion' }),
    Object.freeze({ id: 'locations', parentView: 'route-planner', panel: 'locations' }),
    Object.freeze({ id: 'changelog', parentView: 'roadmap', panel: 'changelog' })
  ]);

  const pages = Object.freeze(groups.flatMap((group) => group.pages.map((page) => Object.freeze({
    ...page,
    status: 'live',
    groupId: group.id,
    groupLabel: group.label
  }))));
  const byId = new Map([...pages, ...internalPages].map((page) => [page.id, page]));

  function resolveView(id) {
    const page = byId.get(String(id ?? ''));
    if (!page) return 'route';
    return page.parentView ?? page.id;
  }

  const api = Object.freeze({
    groups,
    pages,
    internalPages,
    defaultPageId: 'route',
    getPage(id) { return byId.get(id) ?? null; },
    resolveView
  });

  root.SCCompanionPages = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
