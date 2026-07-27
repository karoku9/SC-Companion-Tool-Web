'use strict';

(function exposeDesignSystem(root) {
  const primitive = Object.freeze({
    color: Object.freeze({
      ink950: '#070706',
      ink925: '#0b0b09',
      ink900: '#10100d',
      ink875: '#15140f',
      ink850: '#1a1812',
      ink800: '#211e16',
      metal700: '#39352a',
      metal600: '#4c4637',
      metal500: '#665e49',
      metal300: '#a7a296',
      paper100: '#f0eee6',
      paper200: '#d9d5ca',
      amber700: '#754013',
      amber500: '#c7772b',
      amber400: '#e89a42',
      amber300: '#ffc06b',
      red500: '#d87a68',
      green500: '#8db37d',
      blue500: '#78a8b8',
      violet500: '#a796c2'
    }),
    space: Object.freeze({ 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 }),
    type: Object.freeze({ '2xs': 12, xs: 13, sm: 14, md: 16, lg: 19, xl: 24, '2xl': 32 }),
    radius: Object.freeze({ none: 0, sm: 2, md: 4 }),
    control: Object.freeze({ sm: 32, md: 40, lg: 48 }),
    motion: Object.freeze({ fast: 120, standard: 170 })
  });

  const semanticRoles = Object.freeze([
    'surface.canvas', 'surface.screen', 'surface.panel', 'surface.panelRaised', 'surface.interactive', 'surface.selected',
    'content.primary', 'content.secondary', 'content.muted', 'content.disabled', 'content.inverse',
    'border.subtle', 'border.strong', 'border.focus',
    'action.primary', 'action.primaryHover', 'action.secondary', 'action.danger',
    'cargo.pickup', 'cargo.dropoff', 'cargo.mixed', 'cargo.offGrid',
    'status.ready', 'status.warning', 'status.danger', 'status.info', 'status.unknown'
  ]);

  const typography = Object.freeze({
    display: Object.freeze({ preferred: 'Rajdhani', fallback: 'Arial Narrow, Roboto Condensed, sans-serif' }),
    ui: Object.freeze({ preferred: 'IBM Plex Sans Condensed', fallback: 'Arial Narrow, Arial, sans-serif' }),
    data: Object.freeze({ preferred: 'Saira Condensed', fallback: 'Roboto Condensed, ui-monospace, monospace' }),
    rules: Object.freeze([
      'Body and control text never renders below 12px.',
      'Uppercase is reserved for short labels and state, never paragraphs.',
      'SCU, aUEC, time, capacity and sequence values use tabular numerals.',
      'Primary operational values are visually stronger than decoration and provenance.'
    ])
  });

  const components = Object.freeze({
    button: Object.freeze({
      variants: Object.freeze(['primary', 'secondary', 'ghost', 'danger', 'function', 'icon']),
      sizes: Object.freeze(['small', 'medium', 'large']),
      rules: Object.freeze([
        'One primary action per decision surface.',
        'Destructive actions use the danger role and never the primary role.',
        'Icon-only buttons require an accessible label and visible tooltip on hover or focus.',
        'Disabled actions explain their unavailable state beside the action.'
      ])
    }),
    icon: Object.freeze({
      family: 'Lucide-derived local subset',
      grid: 24,
      strokeWidth: 1.7,
      sizes: Object.freeze([16, 18, 20, 24]),
      rules: Object.freeze([
        'Every action has one canonical symbol.',
        'Icons never replace labels for unfamiliar or destructive actions.',
        'Domain icons are original and added only when generic symbols are insufficient.',
        'Themes may change treatment, not meaning.'
      ])
    }),
    panel: Object.freeze({
      variants: Object.freeze(['primary-display', 'aux-display', 'embedded', 'popover']),
      rules: Object.freeze([
        'Primary displays contain the current decision and next action.',
        'Auxiliary displays contain supporting context on demand.',
        'Headers, tabs and content use fixed density tokens instead of page-specific values.',
        'Decoration must communicate grouping, selection, direction or state.'
      ])
    }),
    field: Object.freeze({ variants: Object.freeze(['text', 'number', 'select', 'combobox', 'textarea', 'checkbox', 'segmented']) }),
    table: Object.freeze({ variants: Object.freeze(['commodity', 'warehouse', 'manifest', 'compact']) }),
    status: Object.freeze({ variants: Object.freeze(['ready', 'pickup', 'delivery', 'warning', 'danger', 'info', 'unknown']) }),
    missionCard: Object.freeze({
      anatomy: Object.freeze(['sequence', 'identity', 'contractor', 'payout', 'validity', 'objectives', 'edit', 'remove']),
      rules: Object.freeze([
        'Normal mode is graphical and canonical; raw fields appear only in explicit edit mode.',
        'Each objective exposes action, canonical location, cargo objects and row-level validation.',
        'A player can verify the full parsed mission without reopening the original text.'
      ])
    }),
    routeTimeline: Object.freeze({
      states: Object.freeze(['complete', 'current', 'next', 'future', 'blocked']),
      rules: Object.freeze([
        'Current and next are visually dominant.',
        'Gateway transitions remain explicit.',
        'Progress updates once per completed stop and respects reduced motion.'
      ])
    })
  });

  const productQuestions = Object.freeze({
    input: 'Did the tool receive the contracts?',
    review: 'Did it parse every mission, location, action, quantity and commodity correctly?',
    sessions: 'What complete work fits inside the exact time available?',
    operations: 'Where do I go next and what do I do there?',
    cargo: 'What is onboard, where is it accessible and where must it go?',
    map: 'Which leg and gateway come next?'
  });

  const inspirationBlend = Object.freeze({
    commodityShop: 40,
    freightManagement: 30,
    newMfd: 20,
    warehouseCargoTerminal: 10,
    note: 'Percentages express product emphasis only. No screen, asset or proprietary style is copied.'
  });

  const principles = Object.freeze([
    'Original industrial interface; no copied game assets, logos, proprietary fonts or exact screen layouts.',
    'Dense but legible information with a visible minimum type size of 12px.',
    'Dark warm-neutral surfaces, one-pixel separators, square geometry and minimal elevation.',
    'Amber marks active operational emphasis; blue marks pickup/navigation; green marks delivery/ready; red marks destructive/blocking state.',
    'Color never carries meaning alone.',
    'No glassmorphism, persistent bloom, cyberpunk neon or looping decorative animation.',
    'Every page makes the player’s next action dominant.',
    'Desktop 1366×768 and mobile 390×844 are first-class acceptance viewports.'
  ]);

  const themes = Object.freeze({
    industrial: Object.freeze({
      id: 'industrial',
      manufacturer: null,
      label: 'SC Companion industrial terminal',
      status: 'active',
      brand: Object.freeze({
        wordmark: 'SC COMPANION',
        product: 'HAULING OPERATIONS',
        qualifier: 'UNOFFICIAL LOCAL COMPANION SOFTWARE'
      }),
      character: Object.freeze(['industrial', 'dense', 'modular', 'low-glow', 'cargo-first', 'desktop-first']),
      sourceNote: 'Original project palette and geometry informed by public cargo-terminal workflows and modern MFD hierarchy; not an official CIG palette.'
    }),
    drake: Object.freeze({
      id: 'drake',
      manufacturer: 'Drake Interplanetary',
      label: 'Legacy Drake utility MFD',
      status: 'compatibility',
      brand: Object.freeze({
        wordmark: 'DRAKE INTERPLANETARY',
        product: 'COMPANION MFD',
        qualifier: 'UNOFFICIAL HAULING OPERATIONS SOFTWARE'
      }),
      character: Object.freeze(['utilitarian', 'rugged', 'repairable', 'dense', 'amber phosphor', 'physical soft keys']),
      sourceNote: 'Compatibility theme retained for existing pages while the proprietary industrial design library replaces manufacturer imitation.'
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

  const api = Object.freeze({
    version: '0.27',
    primitive,
    semanticRoles,
    typography,
    components,
    productQuestions,
    inspirationBlend,
    principles,
    themes,
    getTheme,
    applyTheme,
    currentThemeId: 'industrial'
  });

  root.SCCompanionDesignSystem = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
