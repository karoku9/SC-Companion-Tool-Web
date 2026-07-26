'use strict';

(function exposeMfdIcons(root) {
  /* Curated static subset based on Lucide's 24px SVG language (ISC). Kept local so the MFD does not depend on a runtime CDN. */
  const paths = Object.freeze({
    operations: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
    missions: '<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    planner: '<circle cx="5" cy="18" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="19" cy="17" r="2"/><path d="m6.2 16.4 4.6-8.8M13.5 7.5l4.2 7.8"/>',
    starmap: '<circle cx="12" cy="12" r="3"/><path d="M3.6 9a9 9 0 1 0 16.8 0M4.5 16.5a9 9 0 0 1 15 0"/><circle cx="20" cy="7" r="1"/>',
    fleet: '<path d="m3 14 5-6h8l5 6-5 4H8z"/><path d="M8 8l2-4h4l2 4M6 18l-2 3M18 18l2 3"/>',
    development: '<path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/><circle cx="12" cy="12" r="3"/>',
    moves: '<path d="M5 9h11M13 6l3 3-3 3M19 15H8M11 12l-3 3 3 3"/>',
    cargo: '<path d="m4 7 8-4 8 4-8 4z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4zM12 11v10"/>',
    corrections: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    route: '<circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18h4a3 3 0 0 0 3-3v-4a3 3 0 0 1 3-3"/>',
    load: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/>',
    unload: '<path d="M12 21V9M7 14l5-5 5 5"/><path d="M4 5h16"/>',
    previous: '<path d="M19 12H6M11 7l-5 5 5 5"/>',
    next: '<path d="M5 12h13M13 7l5 5-5 5"/>',
    expand: '<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    warning: '<path d="M12 3 2.8 20h18.4z"/><path d="M12 9v5M12 17h.01"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    ship: '<path d="M3 14 8 8h8l5 6-5 4H8z"/><path d="M9 8l1.5-4h3L15 8"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    gateway: '<path d="M4 4h6v16H4zM14 4h6v16h-6z"/><path d="M10 8h4M10 16h4"/>',
    navigation: '<path d="m12 2 7 19-7-4-7 4z"/>',
    pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/>',
    shield: '<path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z"/>',
    fuel: '<path d="M5 3h9v18H5zM7 7h5"/><path d="M14 8h2l3 3v7a2 2 0 0 1-4 0v-3"/>',
    medical: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
    food: '<path d="M6 3v7M9 3v7M6 7h3M7.5 10v11M16 3c2 2 2 6 0 8v10"/>',
    hangar: '<path d="M3 21V8l9-5 9 5v13"/><path d="M7 21v-8h10v8M7 17h10"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9 3h6l1 4H8zM7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    chevronUp: '<path d="m6 15 6-6 6 6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    play: '<path d="m8 5 11 7-11 7z"/>',
    pause: '<path d="M8 5h3v14H8zM14 5h3v14h-3z"/>'
  });

  const meta = Object.freeze({
    family: 'Lucide-derived SC Companion operational subset',
    license: 'ISC',
    grid: 24,
    strokeWidth: 1.7,
    sizes: Object.freeze([16, 20, 24]),
    names: Object.freeze(Object.keys(paths))
  });

  function render(name, className = 'mfd-icon') {
    const path = paths[name] ?? paths.warning;
    return `<svg class="${className}" viewBox="0 0 ${meta.grid} ${meta.grid}" fill="none" stroke="currentColor" stroke-width="${meta.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  }

  const api = Object.freeze({ paths, meta, render });
  root.SCCompanionMfdIcons = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));