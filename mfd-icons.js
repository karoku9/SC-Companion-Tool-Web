'use strict';

(function exposeMfdIcons(root) {
  const paths = Object.freeze({
    operations: '<path d="M5 5h14v14H5z"/><path d="M9 9h6v6H9z"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    missions: '<path d="M7 3h8l3 3v15H7z"/><path d="M15 3v4h4M10 11h5M10 15h5"/><path d="M4 7v13h11"/>',
    planner: '<circle cx="5" cy="17" r="2"/><circle cx="12" cy="7" r="2"/><circle cx="19" cy="16" r="2"/><path d="M6.5 15.5 10.5 8.5M13.5 8.5l4 6M7 17h10"/>',
    starmap: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="9" ry="4"/><path d="M7 4.5c3 2.5 7 2.5 10 0M7 19.5c3-2.5 7-2.5 10 0"/><circle cx="20" cy="12" r="1"/>',
    fleet: '<path d="M3 14 7 9h10l4 5-4 4H7z"/><path d="M8 9 10 5h4l2 4M8 14h8M6 18l-2 3M18 18l2 3"/>',
    development: '<path d="m8 4 2 2-5 5-2-2zM14 4h6v6M20 4l-8 8"/><path d="M7 15h10v6H7zM10 15v-3h4v3"/>',
    moves: '<path d="M4 7h11M12 4l3 3-3 3M20 17H9M12 14l-3 3 3 3"/>',
    cargo: '<path d="m4 7 8-4 8 4-8 4z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4zM12 11v10"/>',
    corrections: '<path d="M4 18h4l10-10-4-4L4 14zM13 5l4 4M4 18v-4"/><path d="M14 18h6"/>',
    route: '<circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18h4a3 3 0 0 0 3-3v-4a3 3 0 0 1 3-3"/><path d="m15 5 2-2 2 2"/>',
    load: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/>',
    unload: '<path d="M12 21V9M7 14l5-5 5 5"/><path d="M4 5h16"/>',
    previous: '<path d="M19 12H6M11 7l-5 5 5 5"/>',
    next: '<path d="M5 12h13M13 7l5 5-5 5"/>',
    expand: '<path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    warning: '<path d="M12 3 2.8 20h18.4z"/><path d="M12 9v5M12 17h.01"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    ship: '<path d="M3 14 8 8h8l5 6-5 4H8z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
  });

  function render(name, className = 'mfd-icon') {
    const path = paths[name] ?? paths.warning;
    return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${path}</svg>`;
  }

  root.SCCompanionMfdIcons = Object.freeze({ paths, render });
  if (typeof module !== 'undefined' && module.exports) module.exports = { paths, render };
}(typeof globalThis !== 'undefined' ? globalThis : window));