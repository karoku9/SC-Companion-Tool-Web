'use strict';

(function createDesignSystemShowcase() {
  const system = window.SCCompanionDesignSystem;
  const icons = window.SCCompanionMfdIcons;
  const host = document.querySelector('#future-pages-root');
  if (!system || !icons || !host || document.querySelector('#design-system-showcase')) return;

  const theme = system.getTheme(system.currentThemeId);
  const iconNames = Object.keys(icons.paths);
  const swatches = [
    ['Canvas', '--ds-surface-canvas'],
    ['Panel', '--ds-surface-panel'],
    ['Raised panel', '--ds-surface-panel-raised'],
    ['MFD screen', '--ds-surface-screen'],
    ['Primary text', '--ds-content-primary'],
    ['Muted text', '--ds-content-muted'],
    ['Drake amber', '--ds-action-primary'],
    ['Amber hover', '--ds-action-primary-hover'],
    ['Pickup', '--ds-cargo-pickup'],
    ['Drop-off', '--ds-cargo-dropoff'],
    ['Mixed stop', '--ds-cargo-mixed'],
    ['Danger', '--ds-status-danger']
  ];
  const typeSamples = [
    ['xs / 11', 'var(--ds-type-xs)', 'Telemetry label'],
    ['sm / 12', 'var(--ds-type-sm)', 'Secondary metadata'],
    ['md / 14', 'var(--ds-type-md)', 'Operational body text'],
    ['lg / 16', 'var(--ds-type-lg)', 'Primary row value'],
    ['xl / 20', 'var(--ds-type-xl)', 'Panel title'],
    ['2xl / 28', 'var(--ds-type-2xl)', 'Display heading'],
    ['3xl / 36', 'var(--ds-type-3xl)', 'Maximum destination size']
  ];

  const root = document.createElement('section');
  root.id = 'design-system-showcase';
  root.className = 'design-system-showcase workspace-tool-content';
  root.hidden = true;
  root.innerHTML = `
    <header class="ds-showcase-intro">
      <span class="ds-status ds-status--warning">Foundation v0.14</span>
      <h3>${theme.brand.wordmark} · interface system</h3>
      <p>This is the single visual and interaction source for every page. Future manufacturer MFDs will replace theme tokens and approved treatment rules while retaining component meaning, accessibility and behaviour.</p>
      <p><strong>${theme.sourceNote}</strong></p>
    </header>

    <section class="ds-panel ds-panel--aux-display ds-showcase-section">
      <header class="ds-panel__header"><h4>Semantic palette</h4><span>Do not use raw colours in page CSS</span></header>
      <div class="ds-panel__body ds-palette">
        ${swatches.map(([label, token]) => `<article class="ds-swatch"><div class="ds-swatch-color" style="--swatch:var(${token})"></div><div class="ds-swatch-copy"><strong>${label}</strong><small>${token}</small></div></article>`).join('')}
      </div>
    </section>

    <div class="ds-showcase-grid">
      <section class="ds-panel ds-showcase-section">
        <header class="ds-panel__header"><h4>Buttons</h4><span>Stable variants</span></header>
        <div class="ds-panel__body">
          <div class="ds-showcase-stack">
            <button class="ds-button ds-button--primary" type="button">Primary action</button>
            <button class="ds-button ds-button--secondary" type="button">Secondary</button>
            <button class="ds-button ds-button--ghost" type="button">Ghost</button>
            <button class="ds-button ds-button--danger" type="button">Danger</button>
            <button class="ds-button ds-button--function" type="button" aria-pressed="true">${icons.render('cargo')} F2 Cargo</button>
            <button class="ds-button ds-button--icon" type="button" aria-label="Close example" title="Close">${icons.render('close')}</button>
          </div>
        </div>
      </section>

      <section class="ds-panel ds-showcase-section">
        <header class="ds-panel__header"><h4>Operational semantics</h4><span>Meaning is theme-independent</span></header>
        <div class="ds-panel__body ds-showcase-stack">
          <span class="ds-status ds-status--ready">Ready</span>
          <span class="ds-status ds-status--warning">Warning</span>
          <span class="ds-status ds-status--danger">Fault</span>
          <span class="ds-status ds-status--info">Navigation</span>
          <strong class="ds-cargo-pickup">LOAD / PICKUP</strong>
          <strong class="ds-cargo-dropoff">UNLOAD / DROP-OFF</strong>
          <strong class="ds-cargo-mixed">MIXED STOP</strong>
          <strong class="ds-cargo-offgrid">OFF-GRID</strong>
        </div>
      </section>

      <section class="ds-panel ds-showcase-section">
        <header class="ds-panel__header"><h4>Typography</h4><span>Seven approved sizes</span></header>
        <div class="ds-panel__body">
          ${typeSamples.map(([token, size, copy]) => `<div class="ds-type-sample"><code>${token}</code><span style="font-size:${size}">${copy}</span></div>`).join('')}
        </div>
      </section>

      <section class="ds-panel ds-showcase-section">
        <header class="ds-panel__header"><h4>Fields</h4><span>Shared focus and density</span></header>
        <div class="ds-panel__body" style="display:grid;gap:12px">
          <label class="ds-field"><span>Text field</span><input class="ds-input" value="Drake Corsair"></label>
          <label class="ds-field"><span>Select</span><select class="ds-input"><option>Compact density</option><option>Comfortable density</option></select></label>
        </div>
      </section>
    </div>

    <section class="ds-panel ds-panel--aux-display ds-showcase-section">
      <header class="ds-panel__header"><h4>Canonical icon family</h4><span>24 px grid · 1.7 px stroke · 16/20/24 px use sizes</span></header>
      <div class="ds-panel__body ds-icon-grid">
        ${iconNames.map((name) => `<div class="ds-icon-cell">${icons.render(name, 'ds-icon')}<small>${name}</small></div>`).join('')}
      </div>
    </section>

    <section class="ds-panel ds-showcase-section">
      <header class="ds-panel__header"><h4>Manufacturer theme contract</h4><span>Required before another MFD theme ships</span></header>
      <div class="ds-panel__body">
        <dl class="ds-theme-contract">
          <div><dt>Brand identity</dt><dd>Wordmark, product label, optional mark and fan-project qualifier.</dd></div>
          <div><dt>Primitive palette</dt><dd>Manufacturer-specific inks, display colour, metals and warning accents.</dd></div>
          <div><dt>Semantic mapping</dt><dd>Canvas, panels, text, borders, actions, cargo states and system states.</dd></div>
          <div><dt>Geometry</dt><dd>Approved radii, corners, bezel treatment, separators and display chrome.</dd></div>
          <div><dt>Typography</dt><dd>Approved UI and technical font stacks using the shared seven-size scale.</dd></div>
          <div><dt>Components</dt><dd>The same button, panel, field, icon and status behaviours; only approved theme treatment changes.</dd></div>
          <div><dt>Validation</dt><dd>UI Kit review, keyboard behaviour, contrast, responsive states and page screenshots before merge.</dd></div>
        </dl>
      </div>
    </section>`;

  host.append(root);

  function installDevelopmentTab() {
    const tabs = document.querySelector('.development-tabs');
    const roadmapPane = document.querySelector('[data-development-pane="roadmap"]');
    const changelogPane = document.querySelector('[data-development-pane="changelog"]');
    if (!tabs || !roadmapPane || !changelogPane || tabs.querySelector('[data-development-tab="ui-kit"]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.developmentTab = 'ui-kit';
    button.setAttribute('aria-selected', 'false');
    button.textContent = 'UI Kit';

    const pane = document.createElement('div');
    pane.dataset.developmentPane = 'ui-kit';
    pane.hidden = true;
    root.hidden = false;
    pane.append(root);
    tabs.append(button);
    changelogPane.after(pane);

    tabs.addEventListener('click', (event) => {
      const selected = event.target.closest('[data-development-tab]')?.dataset.developmentTab;
      if (!selected) return;
      pane.hidden = selected !== 'ui-kit';
    });
  }

  window.addEventListener('sc:dynamic-pages-ready', () => requestAnimationFrame(installDevelopmentTab), { once: true });
}());
