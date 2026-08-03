'use strict';

(() => {
  const VEHICLES_API = 'https://api.star-citizen.wiki/api/vehicles';
  const WIKI_API = 'https://starcitizen.tools/api.php';
  const PAGE_SIZE = 200;
  const pageCache = new Map();

  const LAST_KNOWN = {
    'Corsair': 6224400,
    'Constellation Andromeda': 9652608,
    'Constellation Aquila': 11577384,
    'Constellation Taurus': 7641648,
    'Constellation Phoenix': 14076720,
    '600i Explorer': 27231750,
    '400i': 8398063,
    'Carrack': 34398000,
    '890 Jump': 62088392,
    'Caterpillar': 11850300,
    'C2 Hercules Starlifter': 18900000,
    'M2 Hercules Starlifter': 28009800,
    'A2 Hercules Starlifter': 37800200,
    'Starfarer Gemini': 14244300,
    'Starlancer MAX': 12127500,
    'Starlancer TAC': 13381200,
    'Redeemer': 9803430,
    'Reclaimer': 30164400,
    'Hull C': 16537500,
    'Cutlass Black': 2010960,
    'C1 Spirit': 3118500,
    'Zeus Mk II CL': 6463800,
    'Zeus Mk II ES': 4201470,
    'Vanguard Warden': 7354900,
    'Vanguard Sentinel': 7776700,
    'Vanguard Harbinger': 8200400,
    'Scorpius': 5171040,
    'Ares Ion': 4725000,
    'Ares Inferno': 4725000,
    'Eclipse': 7541100,
    'Retaliator': 7541100,
    'Paladin': 15876000,
    'Asgard': 17860500,
    'Valkyrie': 19845000,
    'Prospector': 2926350,
    'Vulture': 2646000,
    'MOLE': 8946000,
    'Nomad': 1512000,
    'Freelancer MAX': 4252500
  };

  const state = {
    all: [],
    filtered: [],
    selected: null,
    renderedId: null
  };

  const $ = selector => document.querySelector(selector);
  const number = value => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
  const localized = value => {
    if (Array.isArray(value)) return value.map(localized).filter(Boolean).join(' / ');
    if (typeof value === 'string') return value;
    return value?.it_IT || value?.en_EN || value?.en || value?.name || '';
  };
  const formatNumber = value => number(value) === null
    ? '—'
    : Math.round(Number(value)).toLocaleString('it-IT');
  const normalizeName = value => String(value || '')
    .replace(/^(Aegis|Anvil|Drake|MISC|Mirai|Origin|RSI|Crusader|ARGO|Aopoa|Esperia|Gatac|Consolidated Outland)\s+/i, '')
    .trim();
  const excludedEditions = /best in show|bis\s?29|pirate edition|emerald|executive edition|heartseeker|renegade|valiant|comet|advocacy|foundation festival/i;

  function roleOf(raw) {
    return localized(raw.role)
      || localized(raw.career)
      || localized(raw.type)
      || localized(raw.foci?.[0])
      || 'Speciale';
  }

  function lastKnownPrice(name) {
    if (LAST_KNOWN[name]) return LAST_KNOWN[name];
    const normalized = normalizeName(name);
    const key = Object.keys(LAST_KNOWN).find(candidate => normalizeName(candidate) === normalized);
    return key ? LAST_KNOWN[key] : null;
  }

  function purchases(raw) {
    return (raw.uex_prices?.purchase || raw.prices?.purchase || [])
      .map(entry => ({
        price: number(entry.price_buy ?? entry.price),
        terminal: entry.terminal_name || entry.location_name || ''
      }))
      .filter(entry => entry.price && entry.price > 0)
      .sort((a, b) => a.price - b.price);
  }

  function compactVehicle(raw) {
    const name = raw.shipmatrix_name || raw.name || raw.game_name || 'Senza nome';
    const buy = purchases(raw);
    return {
      id: String(raw.uuid || raw.class_name || raw.slug || name),
      name,
      manufacturer: raw.manufacturer?.name || localized(raw.manufacturer),
      role: roleOf(raw),
      isShip: raw.is_spaceship === true || raw.is_spaceship === 1,
      status: localized(raw.production_status).toLowerCase().replace(/[\s_-]/g, ''),
      size: number(raw.size_class),
      cargo: number(raw.cargo_capacity) || 0,
      currentPrice: buy[0]?.price || null,
      terminal: buy[0]?.terminal || ''
    };
  }

  function availability(vehicle) {
    if (vehicle.currentPrice) {
      return {
        kind: 'now',
        label: 'Ora',
        price: vehicle.currentPrice,
        terminal: vehicle.terminal
      };
    }
    const price = lastKnownPrice(vehicle.name);
    return price
      ? { kind: 'last', label: 'Ultimo noto', price, terminal: '' }
      : { kind: 'none', label: 'N/D', price: null, terminal: '' };
  }

  async function fetchVehicles() {
    const result = [];
    for (let page = 1; page <= 10; page += 1) {
      const url = new URL(VEHICLES_API);
      url.searchParams.set('page[size]', String(PAGE_SIZE));
      url.searchParams.set('page[number]', String(page));
      $('#summary').textContent = `Caricamento elenco, pagina ${page}…`;
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`API veicoli HTTP ${response.status}`);
      const json = await response.json();
      const batch = Array.isArray(json) ? json : json.data || [];
      result.push(...batch);
      if (batch.length < PAGE_SIZE) break;
    }
    return result;
  }

  function cleanVehicles(rawList) {
    const unique = new Map();
    for (const raw of rawList) {
      const vehicle = compactVehicle(raw);
      const sale = availability(vehicle);
      if (!vehicle.isShip || !vehicle.size || !sale.price) continue;
      if (vehicle.status && !vehicle.status.includes('flightready') && !vehicle.status.includes('flyable')) continue;
      if (excludedEditions.test(vehicle.name)) continue;
      const key = vehicle.name.toLowerCase();
      const previous = unique.get(key);
      if (!previous || (vehicle.currentPrice && !previous.currentPrice)) unique.set(key, vehicle);
    }
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }

  function fillFilters() {
    const manufacturers = [...new Set(state.all.map(vehicle => vehicle.manufacturer).filter(Boolean))].sort();
    const roles = [...new Set(state.all.map(vehicle => vehicle.role).filter(Boolean))].sort();
    $('#maker').innerHTML = '<option value="">Tutti i produttori</option>'
      + manufacturers.map(value => `<option>${escapeHtml(value)}</option>`).join('');
    $('#role').innerHTML = '<option value="">Tutti i ruoli</option>'
      + roles.map(value => `<option>${escapeHtml(value)}</option>`).join('');
  }

  function renderList() {
    const availableNow = state.filtered.filter(vehicle => availability(vehicle).kind === 'now').length;
    $('#summary').textContent = `${state.filtered.length} navi visibili su ${state.all.length} · ${availableNow} acquistabili ora`;
    $('#rows').innerHTML = state.filtered.map(vehicle => {
      const sale = availability(vehicle);
      return `<tr data-id="${escapeHtml(vehicle.id)}" class="${state.selected?.id === vehicle.id ? 'selected' : ''}">
        <td class="name">${escapeHtml(vehicle.name)}<span class="sub">${escapeHtml(vehicle.manufacturer)}</span></td>
        <td>${escapeHtml(vehicle.role)}</td>
        <td>${sale.label} · ${formatNumber(sale.price)}</td>
        <td>${formatNumber(vehicle.cargo)}</td>
        <td>S${formatNumber(vehicle.size)}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="5">Nessun risultato.</td></tr>';

    document.querySelectorAll('tr[data-id]').forEach(row => {
      row.addEventListener('click', () => {
        const vehicle = state.all.find(candidate => candidate.id === row.dataset.id);
        if (!vehicle) return;
        state.selected = vehicle;
        renderList();
        loadStats(vehicle);
      });
    });
  }

  function applyFilters() {
    const query = $('#q').value.trim().toLowerCase();
    const manufacturer = $('#maker').value;
    const role = $('#role').value;
    const saleFilter = $('#sale').value;
    const minimumCargo = Number($('#cargo').value);

    state.filtered = state.all.filter(vehicle => {
      const sale = availability(vehicle);
      const haystack = `${vehicle.name} ${vehicle.manufacturer} ${vehicle.role}`.toLowerCase();
      return (!query || haystack.includes(query))
        && (!manufacturer || vehicle.manufacturer === manufacturer)
        && (!role || vehicle.role === role)
        && (saleFilter === 'all' || sale.kind === saleFilter)
        && vehicle.cargo >= minimumCargo;
    });

    if (!state.selected || !state.filtered.some(vehicle => vehicle.id === state.selected.id)) {
      state.selected = state.filtered[0] || null;
    }

    renderList();
    if (!state.selected) {
      state.renderedId = null;
      $('#detail').innerHTML = '<div class="status">Nessuna nave corrisponde ai filtri.</div>';
    } else if (state.renderedId !== state.selected.id) {
      loadStats(state.selected);
    }
  }

  function wikiTitle(name) {
    return name.replaceAll(' ', '_');
  }

  async function wikiRequest(params) {
    const url = new URL(WIKI_API);
    url.searchParams.set('origin', '*');
    url.searchParams.set('format', 'json');
    url.searchParams.set('formatversion', '2');
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Wiki HTTP ${response.status}`);
    const json = await response.json();
    if (json.error) throw new Error(json.error.info || json.error.code);
    return json;
  }

  function extractStatsSection(pageHtml) {
    const documentFragment = new DOMParser().parseFromString(pageHtml, 'text/html');
    const label = [...documentFragment.querySelectorAll('.t-infobox-section-label')]
      .find(element => element.textContent.trim().toLowerCase() === 'stats');
    if (!label) throw new Error('Il blocco Stats non è presente nell’infobox generato dalla Wiki.');

    const section = label.closest('.t-infobox-section') || label.closest('details') || label.parentElement;
    if (!section) throw new Error('Il blocco Stats è stato trovato, ma non è stato possibile isolarlo.');

    const clone = section.cloneNode(true);
    clone.querySelectorAll('script, style, link, .mw-editsection').forEach(element => element.remove());
    clone.querySelectorAll('[href]').forEach(element => {
      const href = element.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      try {
        element.setAttribute('href', new URL(href, 'https://starcitizen.tools/').href);
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener');
      } catch {}
    });
    clone.querySelectorAll('[src]').forEach(element => {
      const src = element.getAttribute('src');
      if (!src) return;
      try {
        element.setAttribute('src', new URL(src, 'https://starcitizen.tools/').href);
      } catch {}
    });
    return clone.outerHTML;
  }

  async function exactStats(name) {
    if (pageCache.has(name)) return pageCache.get(name);
    const parsed = await wikiRequest({
      action: 'parse',
      page: wikiTitle(name),
      prop: 'text|modules|modulestyles|revid'
    });
    const payload = {
      html: extractStatsSection(parsed.parse?.text || ''),
      modules: parsed.parse?.modules || [],
      styles: parsed.parse?.modulestyles || [],
      revision: parsed.parse?.revid || null
    };
    pageCache.set(name, payload);
    return payload;
  }

  function frameDocument(name, payload) {
    const styleModules = [...new Set([...(payload.styles || []), ...(payload.modules || [])])];
    const scriptModules = [...new Set(payload.modules || [])];
    const styles = styleModules.length
      ? `<link rel="stylesheet" href="https://starcitizen.tools/load.php?lang=en&modules=${encodeURIComponent(styleModules.join('|'))}&only=styles&skin=vector-2022">`
      : '';
    const scripts = scriptModules.length
      ? `<script src="https://starcitizen.tools/load.php?lang=en&modules=startup&only=scripts&raw=1&skin=vector-2022"><\/script>
         <script src="https://starcitizen.tools/load.php?lang=en&modules=${encodeURIComponent(scriptModules.join('|'))}&only=scripts&raw=1&skin=vector-2022"><\/script>`
      : '';

    return `<!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <base href="https://starcitizen.tools/">
        ${styles}
        <style>
          html{background:#101416;color:#eaeeee;font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
          body{margin:0;padding:14px}
          .mw-parser-output{max-width:none!important}
          .t-infobox-section{width:100%!important;max-width:none!important;margin:0!important}
          .mw-editsection,.vector-page-titlebar,.catlinks{display:none!important}
          a{color:#58c9e8}
          img{max-width:100%;height:auto}
        </style>
        <title>${escapeHtml(name)} Stats</title>
      </head>
      <body>
        <main class="mw-parser-output">${payload.html}</main>
        ${scripts}
      </body>
      </html>`;
  }

  async function loadStats(vehicle) {
    state.renderedId = vehicle.id;
    const sale = availability(vehicle);
    $('#detail').innerHTML = `<div class="detail-head">
      <div class="eyebrow">${escapeHtml(vehicle.manufacturer)} / ${escapeHtml(vehicle.role)}</div>
      <h2>${escapeHtml(vehicle.name)}</h2>
      <div class="badges">
        <span class="badge ${sale.kind === 'now' ? 'now' : ''}">${sale.label}: ${formatNumber(sale.price)} aUEC</span>
        <span class="badge">${formatNumber(vehicle.cargo)} SCU</span>
        <span class="badge">Size ${formatNumber(vehicle.size)}</span>
      </div>
      <a class="wiki-link" target="_blank" rel="noopener" href="https://starcitizen.tools/${encodeURIComponent(wikiTitle(vehicle.name))}">Apri la pagina sulla Wiki ↗</a>
    </div>
    <div class="status">Caricamento del blocco Stats originale dell’infobox…</div>`;

    try {
      const payload = await exactStats(vehicle.name);
      if (state.selected?.id !== vehicle.id) return;
      const frame = document.createElement('iframe');
      frame.title = `Stats Wiki — ${vehicle.name}`;
      frame.srcdoc = frameDocument(vehicle.name, payload);
      const status = $('#detail').querySelector('.status');
      status.replaceWith(frame);
      frame.addEventListener('load', () => {
        try {
          const resize = () => {
            const height = Math.max(760, frame.contentDocument.documentElement.scrollHeight + 24);
            frame.style.height = `${height}px`;
          };
          resize();
          new ResizeObserver(resize).observe(frame.contentDocument.body);
        } catch {}
      });
      $('#detail').insertAdjacentHTML(
        'beforeend',
        `<div class="note">Blocco Stats estratto direttamente dall’infobox Star Citizen Wiki${payload.revision ? ` · revisione ${payload.revision}` : ''}. Nessun valore viene ricalcolato.</div>`
      );
    } catch (error) {
      if (state.selected?.id !== vehicle.id) return;
      $('#detail').querySelector('.status').innerHTML = `Impossibile caricare Stats: ${escapeHtml(error.message)}<br><br>
        <a target="_blank" rel="noopener" href="https://starcitizen.tools/${encodeURIComponent(wikiTitle(vehicle.name))}">Apri direttamente la Wiki</a>`;
    }
  }

  async function boot() {
    try {
      state.renderedId = null;
      const raw = await fetchVehicles();
      state.all = cleanVehicles(raw);
      fillFilters();
      applyFilters();
    } catch (error) {
      $('#rows').innerHTML = `<tr><td colspan="5">Errore: ${escapeHtml(error.message)}</td></tr>`;
      $('#summary').textContent = 'Caricamento fallito.';
    }
  }

  ['q', 'maker', 'role', 'sale', 'cargo'].forEach(id => {
    $('#' + id).addEventListener(id === 'q' ? 'input' : 'change', applyFilters);
  });
  $('#refresh').addEventListener('click', () => {
    pageCache.clear();
    state.selected = null;
    boot();
  });

  boot();
})();
