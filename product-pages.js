'use strict';

(function exposeProductPages(root) {
  const groups = Object.freeze([
    Object.freeze({
      id: 'operate',
      label: 'Operate',
      pages: Object.freeze([
        Object.freeze({ id: 'route', label: 'Operations', eyebrow: 'LIVE OPERATIONS', title: 'Navigate, move cargo, continue' }),
        Object.freeze({ id: 'missions', label: 'Missions', eyebrow: 'MISSION INTAKE', title: 'Build the session' })
      ])
    }),
    Object.freeze({
      id: 'plan',
      label: 'Plan',
      pages: Object.freeze([
        Object.freeze({ id: 'route-planner', label: 'Planner', eyebrow: 'ROUTE PLANNER', title: 'Choose the next valid route' }),
        Object.freeze({ id: 'map', label: 'Starmap', eyebrow: '3D STARMAP', title: 'Route and system context' })
      ])
    }),
    Object.freeze({
      id: 'manage',
      label: 'Manage',
      pages: Object.freeze([
        Object.freeze({ id: 'hangar', label: 'Fleet', eyebrow: 'FLEET', title: 'Ships and cargo configuration' }),
        Object.freeze({ id: 'roadmap', label: 'Development', eyebrow: 'DEVELOPMENT', title: 'Roadmap and release history' })
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
