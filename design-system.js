'use strict';

(function exposeDesignSystem(root) {
  const primitive = Object.freeze({
    color: Object.freeze({
      ink950: '#050403',
      ink900: '#0b0906',
      ink850: '#12100c',
      ink800: '#1a160f',
      metal700: '#3a3933',
      metal500: '#6d7472',
      metal300: '#a9b0ac',
      paper100: '#e5e2d8',
      amber900: '#6e3e0c',
      amber700: '#8f5518',
      amber500: '#c97b2e',
      amber400: '#dc9143',
      amber300: '#f0a65c',
      amber200: '#ffc47a',
      red500: '#c66052',
      green500: '#7da36b',
      blue500: '#6d9097'
    }),
    space: Object.freeze({ 0: 0, 1: 2, 2: 4, 3: 6, 4: 8, 5: 12, 6: 16, 7: 24, 8: 32 }),
    type: Object.freeze({ xs: 11, sm: 12, md: 14, lg: 16, xl: 20, '2xl': 28, '3xl': 36 }),
    radius: Object.freeze({ none: 0, sm: 2, md: 4, lg: 6 }),
    control: Object.freeze({ sm: 28, md: 36, lg: 44 })
  });

  const semanticRoles = Object.freeze([
    'surface.canvas', 'surface.panel', 'surface.panelRaised', 'surface.screen', 'surface.interactive',
    'content.primary', 'content.secondary', 'content.muted', 'content.inverse',
    'border.subtle', 'border.strong', 'border.focus',
    'action.primary', 'action.primaryHover', 'action.secondary', 'action.danger',
    'cargo.pickup', 'cargo.dropoff', 'cargo.mixed', 'cargo.offGrid',
    'status.ready', 'status.warning', 'status.danger', 'status.info'
  ]);

  const components = Object.freeze({
    button: Object.freeze({
      variants: Object.freeze(['primary', 'secondary', 'ghost', 'danger', 'function', 'icon']),
      sizes: Object.freeze(['small', 'medium', 'large']),
      rules: Object.freeze([
        'One primary action per decision surface.',
        'Destructive actions use the danger role and never the primary role.',
        'Icon-only buttons require an accessible label and visible tooltip on hover or focus.',
        'Function keys use a stable icon, short label and persistent selected state.'
      ])
    }),
    icon: Object.freeze({
      grid: 24,
      strokeWidth: 1.7,
      sizes: Object.freeze([16, 20, 24]),
      rules: Object.freeze([
        'Every action has one canonical symbol.',
        'Icons never replace a label for unfamiliar or destructive actions.',
        'Manufacturer themes may change treatment, not meaning.'
      ])
    }),
    panel: Object.freeze({
      variants: Object.freeze(['primary-display', 'aux-display', 'embedded', 'popover']),
      rules: Object.freeze([
        'A panel is sized for its host; full-page layouts are not embedded inside auxiliary displays.',
        'Primary displays contain the current decision. Auxiliary displays contain supporting data.',
        'Headers, tabs and content use fixed density tokens instead of page-specific values.'
      ])
    }),
    status: Object.freeze({ variants: Object.freeze(['ready', 'warning', 'danger', 'info', 'muted']) }),
    field: Object.freeze({ variants: Object.freeze(['text', 'number', 'select', 'textarea', 'toggle']) })
  });

  const themes = Object.freeze({
    drake: Object.freeze({
      id: 'drake',
      manufacturer: 'Drake Interplanetary',
      label: 'Drake utility MFD',
      status: 'active',
      brand: Object.freeze({
        wordmark: 'DRAKE INTERPLANETARY',
        product: 'COMPANION MFD',
        qualifier: 'UNOFFICIAL HAULING OPERATIONS SOFTWARE'
      }),
      character: Object.freeze(['utilitarian', 'rugged', 'repairable', 'dense', 'amber phosphor', 'physical soft keys']),
      sourceNote: 'Project-derived palette and geometry informed by official Drake design references and in-game cockpit imagery; not an official CIG palette.'
    })
  });

  function getTheme(id) {
    return themes[String(id ?? '')] ?? null;
  }

  function applyTheme(id) {
    const theme = getTheme(id);
    if (!theme || typeof document === 'undefined') return false;
    document.documentElement.dataset.theme = theme.id;
    window.dispatchEvent(new CustomEvent('sc:theme-change', { detail: theme }));
    return true;
  }

  const api = Object.freeze({ primitive, semanticRoles, components, themes, getTheme, applyTheme, currentThemeId: 'drake' });
  root.SCCompanionDesignSystem = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
