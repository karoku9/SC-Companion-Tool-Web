'use strict';

(function initializeProductShell() {
  const registry = window.SCCompanionPages;
  if (!registry) return;

  const navigation = document.querySelector('#product-navigation');
  const mobileSelect = document.querySelector('#mobile-page-select');
  const futureRoot = document.querySelector('#future-pages-root');
  const pageEyebrow = document.querySelector('#shell-page-eyebrow');
  const pageTitle = document.querySelector('#shell-page-title');

  const statusLabel = {
    live: 'LIVE',
    foundation: 'FOUNDATION',
    blueprint: 'BLUEPRINT',
    later: 'LATER'
  };

  function statusBadge(status) {
    return `<span class="page-status is-${status}">${statusLabel[status] ?? status}</span>`;
  }

  function blueprintSection(page, content) {
    return `
      <section class="app-view section-block blueprint-page" data-view="${page.id}" id="${page.id}" hidden>
        <header class="section-heading blueprint-heading">
          <div><p class="eyebrow">${page.eyebrow}</p><h2>${page.title}</h2></div>
          ${statusBadge(page.status)}
        </header>
        ${content}
      </section>`;
  }

  function overviewTemplate(page) {
    return blueprintSection(page, `
      <div class="blueprint-grid overview-grid">
        <article class="blueprint-card is-primary"><span class="card-kicker">ACTIVE SESSION</span><h3>3 missions · 3 stops</h3><p>Teasa → Area18 → Baijini Point</p><div class="metric-row"><span>Current stop<strong>Teasa</strong></span><span>Loaded<strong>0 / 5 SCU</strong></span></div></article>
        <article class="blueprint-card"><span class="card-kicker">SELECTED SHIP</span><h3>Drake Corsair</h3><p>Personal loadout and cargo zones will feed every estimate.</p><div class="metric-row"><span>Quantum<strong>Stock</strong></span><span>Capacity<strong>72 SCU</strong></span></div></article>
        <article class="blueprint-card"><span class="card-kicker">SESSION ESTIMATE</span><h3>48–63 min</h3><p>Travel, descent, ATC, transit and cargo handling shown separately.</p></article>
        <article class="blueprint-card"><span class="card-kicker">PHONE</span><h3>Not paired</h3><p>Short-code controller will expose only the active stop.</p></article>
      </div>
      <div class="blueprint-split">
        <article class="blueprint-panel"><div class="panel-title"><span>NEXT ACTIONS</span><small>OPERATIONS PREVIEW</small></div><div class="action-preview"><strong>01</strong><div><b>COLLECT · MISSION X</b><span>2 SCU ETAM · Teasa</span></div></div><div class="action-preview"><strong>02</strong><div><b>COLLECT · MISSION Y</b><span>2 SCU ETAM · Teasa</span></div></div></article>
        <article class="blueprint-panel"><div class="panel-title"><span>QUICK ACCESS</span><small>PAGE SHORTCUTS</small></div><div class="shortcut-grid"><button data-shell-link="missions">Mission Builder</button><button data-shell-link="route">Active Route</button><button data-shell-link="cargo">Cargo Layout</button><button data-shell-link="map">3D Starmap</button></div></article>
      </div>`);
  }

  function routePlannerTemplate(page) {
    return blueprintSection(page, `
      <div class="blueprint-layout planner-blueprint">
        <aside class="blueprint-panel compact-panel"><div class="panel-title"><span>ROUTE PROFILE</span><small>PLANNED CONTROL</small></div><label class="choice-row is-selected"><input type="radio" checked disabled><span><b>Fastest practical</b><small>Travel + arrival + handling</small></span></label><label class="choice-row"><input type="radio" disabled><span><b>Fewest jumps</b><small>Reduce quantum transitions</small></span></label><label class="choice-row"><input type="radio" disabled><span><b>Lower risk</b><small>Avoid exposed stops where possible</small></span></label><div class="compact-form"><label>START LOCATION<select disabled><option>Current position</option></select></label><label>ACTIVE SHIP<select disabled><option>Drake Corsair</option></select></label></div></aside>
        <section class="blueprint-panel route-comparison"><div class="panel-title"><span>PROPOSED ROUTE</span><small>BLUEPRINT</small></div><ol class="mock-route"><li><strong>01</strong><div><b>Teasa Spaceport · Lorville</b><span>Collect 4 SCU ETAM · estimated handling 3–5 min</span></div><em>START</em></li><li><strong>02</strong><div><b>Riker Memorial · Area18</b><span>Deliver 2 SCU ETAM · collect 1 SCU Neon</span></div><em>+18 min</em></li><li><strong>03</strong><div><b>Baijini Point · ArcCorp</b><span>Deliver Mission Y cargo</span></div><em>+9 min</em></li></ol><div class="summary-strip"><span>Total<strong>48–63 min</strong></span><span>Quantum<strong>2 legs</strong></span><span>Risk<strong>Moderate</strong></span><span>Fuel<strong>Pending data</strong></span></div></section>
      </div>`);
  }

  function loadOperationsTemplate(page) {
    return blueprintSection(page, `
      <div class="blueprint-layout operations-blueprint">
        <article class="blueprint-card is-primary operation-focus"><span class="card-kicker">CURRENT STOP · TEASA</span><h3>Load Mission X first</h3><p>Place the earlier Area18 delivery in the rear-access zone. Mission Y can sit deeper because it unloads at Baijini.</p><div class="operation-buttons"><button disabled>PREVIOUS</button><button class="accent-button" disabled>COMPLETE STOP — NEXT</button></div></article>
        <section class="blueprint-panel"><div class="panel-title"><span>MOVE QUEUE</span><small>LIVE STATE BLUEPRINT</small></div><div class="move-row"><i>LOAD</i><div><b>Mission X · 2 SCU ETAM</b><span>Teasa → Area18 · Zone A / Layer 1</span></div></div><div class="move-row"><i>LOAD</i><div><b>Mission Y · 2 SCU ETAM</b><span>Teasa → Baijini · Zone B / Layer 2</span></div></div><div class="move-row is-warning"><i>NOTE</i><div><b>Keep rear access clear</b><span>Next stop adds 1 SCU Neon at Area18.</span></div></div></section>
      </div>`);
  }

  function shipCatalogTemplate(page) {
    return blueprintSection(page, `
      <div class="catalog-toolbar"><input type="search" placeholder="Search manufacturer or ship" disabled><select disabled><option>All roles</option></select><select disabled><option>All cargo sizes</option></select></div>
      <div class="ship-card-grid">
        <article class="ship-catalog-card"><div class="ship-silhouette">CORSAIR</div><span>DRAKE INTERPLANETARY</span><h3>Corsair</h3><div class="spec-grid"><small>CARGO<strong>72 SCU</strong></small><small>ACCESS<strong>REAR RAMP</strong></small><small>GRID DATA<strong>CONCEPT</strong></small><small>ROLE<strong>EXPEDITION</strong></small></div><button disabled>OPEN PROFILE</button></article>
        <article class="ship-catalog-card"><div class="ship-silhouette">CUTLASS</div><span>DRAKE INTERPLANETARY</span><h3>Cutlass Black</h3><div class="spec-grid"><small>CARGO<strong>46 SCU</strong></small><small>ACCESS<strong>REAR + SIDES</strong></small><small>GRID DATA<strong>CONCEPT</strong></small><small>ROLE<strong>MULTIROLE</strong></small></div><button disabled>OPEN PROFILE</button></article>
        <article class="ship-catalog-card is-empty"><div class="ship-silhouette">+</div><span>CATALOG PIPELINE</span><h3>More ships</h3><p>Each profile will separate sourced specifications from community observations and cargo-layout geometry.</p></article>
      </div>`);
  }

  function loadoutsTemplate(page) {
    return blueprintSection(page, `
      <div class="blueprint-layout loadout-blueprint"><aside class="blueprint-panel"><div class="panel-title"><span>SHIP INSTANCE</span><small>CORSAIR · MAIN</small></div><div class="ship-instance-banner"><strong>Drake Corsair</strong><span>Selected Hangar ship</span></div><div class="delta-grid"><span>Quantum time<strong>−15%</strong></span><span>Fuel use<strong>Pending</strong></span><span>Top speed<strong>Baseline</strong></span></div></aside><section class="blueprint-panel"><div class="panel-title"><span>COMPONENT SLOTS</span><small>STRUCTURED LOADOUT</small></div><div class="slot-row"><span>QUANTUM DRIVE</span><b>XL-1</b><em>Travel estimate input</em></div><div class="slot-row"><span>POWER PLANT</span><b>Stock</b><em>No route impact yet</em></div><div class="slot-row"><span>SHIELDS</span><b>Stock</b><em>Risk profile input later</em></div><div class="slot-row"><span>WEAPONS</span><b>Custom set</b><em>Combat readiness</em></div></section></div>`);
  }

  function tradingTemplate(page) {
    return blueprintSection(page, `
      <div class="blueprint-layout trade-blueprint"><aside class="blueprint-panel"><div class="panel-title"><span>TRADE MODE</span><small>PLANNED</small></div><label class="choice-row is-selected"><input type="radio" checked disabled><span><b>Along active route</b><small>Use spare capacity between mission stops</small></span></label><label class="choice-row"><input type="radio" disabled><span><b>Classic A → B</b><small>Build a dedicated commodity run</small></span></label><div class="compact-form"><label>FREE CAPACITY<input value="18 SCU" disabled></label><label>BUDGET<input value="250,000 aUEC" disabled></label></div></aside><section class="blueprint-panel"><div class="panel-title"><span>OPPORTUNITIES</span><small>NO MARKET SOURCE CONNECTED</small></div><div class="opportunity-row"><div><b>Teasa area → Area18</b><span>Commodity placeholder · legal</span></div><strong>DATA REQUIRED</strong></div><div class="opportunity-row"><div><b>Area18 → Baijini Point</b><span>Route-compatible space only</span></div><strong>DATA REQUIRED</strong></div><p class="blueprint-note">Every result will include source, age, terminal, legality, estimated profit and remaining mission capacity.</p></section></div>`);
  }

  function marketTemplate(page) {
    return blueprintSection(page, `
      <div class="market-summary"><article><span>DATA SOURCE</span><strong>Not connected</strong></article><article><span>LAST UPDATE</span><strong>—</strong></article><article><span>PATCH</span><strong>—</strong></article><article><span>CONFIDENCE</span><strong>Unavailable</strong></article></div><div class="blueprint-table"><div class="table-head"><span>COMMODITY</span><span>BUY</span><span>SELL</span><span>LEGALITY</span><span>SOURCE AGE</span></div><div class="table-row"><b>ETAM</b><span>—</span><span>—</span><em>Restricted</em><small>Awaiting source</small></div><div class="table-row"><b>NEON</b><span>—</span><span>—</span><em>Restricted</em><small>Awaiting source</small></div><div class="table-row"><b>Medical Supplies</b><span>—</span><span>—</span><em>Legal</em><small>Awaiting source</small></div></div>`);
  }

  function historyTemplate(page) {
    return blueprintSection(page, `
      <div class="history-metrics"><article><span>SESSIONS</span><strong>0</strong></article><article><span>MISSION SCU</span><strong>0</strong></article><article><span>AVERAGE TIME</span><strong>—</strong></article><article><span>INCIDENTS</span><strong>0</strong></article></div><div class="blueprint-panel history-panel"><div class="panel-title"><span>COMPLETED SESSIONS</span><small>LOCAL HISTORY</small></div><div class="empty-state"><strong>No completed session yet</strong><span>Future entries will retain missions, ship, route, timings, cargo corrections and profit.</span></div></div>`);
  }

  function settingsTemplate(page) {
    return blueprintSection(page, `
      <div class="settings-columns"><section class="blueprint-panel"><div class="panel-title"><span>DISPLAY</span><small>LOCAL</small></div><label class="setting-row"><span><b>Interface density</b><small>Comfortable</small></span><select disabled><option>Comfortable</option></select></label><label class="setting-row"><span><b>Manufacturer theme</b><small>Follow selected ship</small></span><select disabled><option>Automatic</option></select></label><label class="setting-row"><span><b>Units</b><small>Time, distance and fuel</small></span><select disabled><option>Game-native</option></select></label></section><section class="blueprint-panel"><div class="panel-title"><span>ESTIMATES</span><small>TRANSPARENT</small></div><label class="setting-row"><span><b>Traffic multiplier</b><small>Landing-zone heuristic</small></span><input value="1.15" disabled></label><label class="setting-row"><span><b>Handling pace</b><small>Personal cargo speed</small></span><select disabled><option>Average</option></select></label><label class="setting-row"><span><b>Show confidence</b><small>Never hide uncertain data</small></span><input type="checkbox" checked disabled></label></section><section class="blueprint-panel"><div class="panel-title"><span>DATA & PRIVACY</span><small>BROWSER LOCAL</small></div><label class="setting-row"><span><b>Local session storage</b><small>Currently enabled</small></span><input type="checkbox" checked disabled></label><label class="setting-row"><span><b>External sources</b><small>Per-source controls later</small></span><button disabled>MANAGE</button></label><label class="setting-row"><span><b>Export / backup</b><small>Portable JSON session</small></span><button disabled>EXPORT</button></label></section></div>`);
  }

  function automationTemplate(page) {
    return blueprintSection(page, `
      <div class="deferred-banner"><span>LATER PHASE</span><strong>Manual mission entry remains the priority.</strong><p>This page is reserved now so OCR and Game.log can be added without changing the product navigation later.</p></div><div class="automation-grid"><article class="blueprint-card"><span class="card-kicker">SCREENSHOT OCR</span><h3>Mission image intake</h3><p>Multiple screenshots, confidence per field and a mandatory correction review before session generation.</p><div class="feature-tags"><span>LOCAL FIRST</span><span>REVIEW STEP</span><span>DEFERRED</span></div></article><article class="blueprint-card"><span class="card-kicker">GAME.LOG</span><h3>Best-effort live companion</h3><p>Local file watcher, resilient parser and explicit fallback when the game stops logging useful fields.</p><div class="feature-tags"><span>LOCAL AGENT</span><span>PATCH SENSITIVE</span><span>DEFERRED</span></div></article></div>`);
  }

  const templates = {
    overview: overviewTemplate,
    'route-planner': routePlannerTemplate,
    'load-operations': loadOperationsTemplate,
    'ship-catalog': shipCatalogTemplate,
    loadouts: loadoutsTemplate,
    trading: tradingTemplate,
    'market-intel': marketTemplate,
    history: historyTemplate,
    settings: settingsTemplate,
    automation: automationTemplate
  };

  function renderNavigation() {
    if (!navigation) return;
    navigation.innerHTML = registry.groups.map((group) => `
      <section class="nav-group" data-nav-group="${group.id}">
        <h2>${group.label}</h2>
        ${group.pages.map((page) => `<button type="button" data-view-target="${page.id}" aria-selected="false"><span>${page.label}</span><i class="nav-status is-${page.status}" aria-label="${statusLabel[page.status]}"></i></button>`).join('')}
      </section>`).join('');
  }

  function renderMobileOptions() {
    if (!mobileSelect) return;
    mobileSelect.innerHTML = registry.groups.map((group) => `<optgroup label="${group.label}">${group.pages.map((page) => `<option value="${page.id}">${page.label}</option>`).join('')}</optgroup>`).join('');
  }

  function renderBlueprintPages() {
    if (!futureRoot) return;
    futureRoot.innerHTML = registry.pages.filter((page) => templates[page.id]).map((page) => templates[page.id](page)).join('');
  }

  function setContext(pageId) {
    const page = registry.getPage(pageId) ?? registry.getPage(registry.defaultPageId);
    if (!page) return;
    if (pageEyebrow) pageEyebrow.textContent = page.eyebrow;
    if (pageTitle) pageTitle.textContent = page.title;
    if (mobileSelect) mobileSelect.value = page.id;
    document.title = `${page.label} · SC Companion Tool`;
  }

  renderNavigation();
  renderMobileOptions();
  renderBlueprintPages();

  navigation?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-view-target]');
    if (button) setContext(button.dataset.viewTarget);
  });

  mobileSelect?.addEventListener('change', () => {
    navigation?.querySelector(`[data-view-target="${mobileSelect.value}"]`)?.click();
  });

  document.addEventListener('click', (event) => {
    const shortcut = event.target.closest('[data-shell-link]');
    if (shortcut) navigation?.querySelector(`[data-view-target="${shortcut.dataset.shellLink}"]`)?.click();
  });

  window.addEventListener('hashchange', () => setContext(location.hash.slice(1) || registry.defaultPageId));
  setContext(location.hash.slice(1) || registry.defaultPageId);
}());
