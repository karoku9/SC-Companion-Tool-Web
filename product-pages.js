'use strict';

(function exposeProductPages(root) {
  const groups = Object.freeze([
    Object.freeze({
      id: 'command',
      label: 'Command',
      pages: Object.freeze([
        Object.freeze({ id: 'overview', label: 'Overview', eyebrow: 'COMMAND CENTER', title: 'Session overview', status: 'blueprint' }),
        Object.freeze({ id: 'missions', label: 'Mission Builder', eyebrow: 'MISSION INTAKE', title: 'Build the session', status: 'live' }),
        Object.freeze({ id: 'route', label: 'Active Route', eyebrow: 'ACTIVE ROUTE', title: 'One stop at a time', status: 'live' }),
        Object.freeze({ id: 'cargo', label: 'Cargo Layout', eyebrow: 'CARGO LAYOUT', title: 'Zones, sectors and vertical layers', status: 'foundation' }),
        Object.freeze({ id: 'load-operations', label: 'Load Operations', eyebrow: 'LIVE CARGO', title: 'Load and unload instructions', status: 'foundation' })
      ])
    }),
    Object.freeze({
      id: 'planning',
      label: 'Planning',
      pages: Object.freeze([
        Object.freeze({ id: 'route-planner', label: 'Route Planner', eyebrow: 'ROUTE PLANNER', title: 'Compare route profiles', status: 'live' }),
        Object.freeze({ id: 'map', label: '3D Starmap', eyebrow: '3D STARMAP', title: 'Systems and route context', status: 'live' }),
        Object.freeze({ id: 'locations', label: 'Location Intel', eyebrow: 'LOCATION INTEL', title: 'Services, risk and overhead', status: 'foundation' })
      ])
    }),
    Object.freeze({
      id: 'fleet',
      label: 'Fleet',
      pages: Object.freeze([
        Object.freeze({ id: 'hangar', label: 'My Hangar', eyebrow: 'MY HANGAR', title: 'Owned ships and modifications', status: 'foundation' }),
        Object.freeze({ id: 'ship-catalog', label: 'Ship Catalog', eyebrow: 'SHIP CATALOG', title: 'Compare ships and cargo access', status: 'blueprint' }),
        Object.freeze({ id: 'loadouts', label: 'Loadouts', eyebrow: 'SHIP LOADOUTS', title: 'Components, weapons and performance', status: 'blueprint' })
      ])
    }),
    Object.freeze({
      id: 'economy',
      label: 'Economy',
      pages: Object.freeze([
        Object.freeze({ id: 'trading', label: 'Trading', eyebrow: 'TRADE PLANNER', title: 'Classic and en-route opportunities', status: 'blueprint' }),
        Object.freeze({ id: 'market-intel', label: 'Market Intel', eyebrow: 'MARKET INTEL', title: 'Prices, legality and source age', status: 'blueprint' })
      ])
    }),
    Object.freeze({
      id: 'session',
      label: 'Session',
      pages: Object.freeze([
        Object.freeze({ id: 'history', label: 'History', eyebrow: 'SESSION HISTORY', title: 'Completed runs and performance', status: 'blueprint' }),
        Object.freeze({ id: 'companion', label: 'Phone Companion', eyebrow: 'PHONE COMPANION', title: 'Compact route controller', status: 'foundation' })
      ])
    }),
    Object.freeze({
      id: 'system',
      label: 'System',
      pages: Object.freeze([
        Object.freeze({ id: 'settings', label: 'Settings', eyebrow: 'SETTINGS', title: 'Display, estimates and data', status: 'blueprint' }),
        Object.freeze({ id: 'roadmap', label: 'Roadmap', eyebrow: 'DEVELOPMENT ROADMAP', title: 'Product delivery sequence', status: 'live' }),
        Object.freeze({ id: 'changelog', label: 'Changelog', eyebrow: 'RELEASE HISTORY', title: 'Versions and product changes', status: 'live' }),
        Object.freeze({ id: 'automation', label: 'Automation', eyebrow: 'AUTOMATED INTAKE', title: 'OCR and Game.log integrations', status: 'later' })
      ])
    })
  ]);

  const pages = Object.freeze(groups.flatMap((group) => group.pages.map((page) => Object.freeze({ ...page, groupId: group.id, groupLabel: group.label }))));
  const byId = new Map(pages.map((page) => [page.id, page]));

  const api = Object.freeze({
    groups,
    pages,
    defaultPageId: 'overview',
    getPage(id) { return byId.get(id) ?? null; }
  });

  root.SCCompanionPages = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
