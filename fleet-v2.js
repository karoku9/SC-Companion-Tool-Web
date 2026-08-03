'use strict';

const API = 'https://api.star-citizen.wiki/api/vehicles';
const PAGE_SIZE = 200;
const CACHE_KEY = 'sc-fleet-db-v3-compact';
const CACHE_HOURS = 6;

const LAST_KNOWN = {
  'Cutlass Black': 2010960, 'Cutlass Blue': 3519180, 'C1 Spirit': 3118500,
  'Zeus Mk II CL': 6463800, 'Zeus Mk II ES': 4201470, 'Corsair': 6224400,
  'Constellation Taurus': 7641648, 'Constellation Andromeda': 9652608,
  'Constellation Aquila': 11577384, 'Constellation Phoenix': 14076720,
  'Hermes': 7110180, 'Mercury Star Runner': 12285000, '400i': 8398063,
  '600i Explorer': 27231750, 'RAFT': 3366563, 'Caterpillar': 11850300,
  'C2 Hercules Starlifter': 18900000, 'M2 Hercules Starlifter': 28009800,
  'A2 Hercules Starlifter': 37800200, 'Starfarer Gemini': 14244300,
  'Carrack': 34398000, '890 Jump': 62088392, 'Asgard': 17860500,
  'Valkyrie': 19845000, 'Prowler Utility': 16839000, 'Apollo Triage': 7541100,
  'Apollo Medivac': 8295210, 'Guardian': 6615000, 'Guardian QI': 6900000,
  'Vanguard Warden': 7354900, 'Vanguard Sentinel': 7776700,
  'Vanguard Harbinger': 8200400, 'Scorpius': 5171040, 'Scorpius Antares': 4955580,
  'F7C Hornet Mk II': 4650345, 'Ares Ion': 4725000, 'Ares Inferno': 4725000,
  'Eclipse': 7541100, 'Retaliator': 7541100, 'Redeemer': 9803430,
  'Paladin': 15876000, 'Perseus': 39680000, 'Polaris': 81000000
};

const EXACT = {
  'Corsair': {
    easy: '4× C-788 S4 + 2× M7A S5; 16× S2; torrette scariche o balistiche quando voli solo.',
    meta: '4× C-788 + 2× M7A; FR-86, 2× JS-400, 2× Snowpack, XL-1 via blueprint e reputazione.'
  },
  'Constellation Andromeda': {
    easy: '4× M7A S5; laser delle torrette rimossi o balistici in solo; S2 CS/EM e S1 EM/IR.',
    meta: '4× M7A; FR-86, 2× JS-400, 2× Snowpack, XL-1; Ursa opzionale.'
  },
  'Constellation Aquila': {
    easy: 'Mantieni 4× M7A stock; torretta armata scarica o balistica in solo; missili S2 omogenei.',
    meta: '4× M7A; FR-86, 2× JS-400, 2× Snowpack, XL-1.'
  },
  'Constellation Taurus': {
    easy: '4× M7A; torretta scarica o balistica; quantum drive rapido acquistabile.',
    meta: '4× M7A; FR-86, 2× JS-400, 2× Snowpack, XL-1.'
  },
  '600i Explorer': {
    easy: '3× M7A; remote omogenee solo se realmente usate; QD e scudi acquistabili.',
    meta: '3× M7A + remote; 2× FR-86, 2× JS-500, 2× Blizzard, TS-2.'
  },
  'Starfarer Gemini': {
    easy: '4× M6A; QD e scudi acquistabili migliori compatibili.',
    meta: '4× M6A; 2× FR-86, 2× JS-500, 2× Blizzard, TS-2.'
  },
  'Redeemer': {
    easy: 'Armi pilota omogenee; Lorica acquistabili; gunner necessari per la vera potenza.',
    meta: 'Componenti Grade A e torrette ottimizzate per equipaggio; in solo resta incompleta.'
  }
};

const $ = selector => document.querySelector(selector);
const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const fmt = value => Number.isFinite(Number(value)) ? Math.round(Number(value)).toLocaleString('it-IT') : '—';
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const editionRx = /best in show|bis\s?29|pirate edition|emerald|executive edition|heartseeker|renegade|valiant|comet|advocacy|foundation festival/i;

let state = { all: [], filtered: [], selected: null, sort: 'solo', direction: -1 };

function localized(value) {
  if (typeof value === 'string') return value;
  return value?.it_IT || value?.en_EN || value?.en || value?.name || '';
}

function roleOf(vehicle) {
  return localized(vehicle.role) || localized(vehicle.career) || localized(vehicle.type) || 'Speciale';
}

function normalizeName(name) {
  return String(name || '')
    .replace(/^(Aegis|Anvil|Drake|MISC|Mirai|Origin|RSI|Crusader|ARGO|Aopoa|Esperia|Gatac)\s+/i, '')
    .trim();
}

function lastPrice(name) {
  if (LAST_KNOWN[name]) return LAST_KNOWN[name];
  const normalized = normalizeName(name);
  const key = Object.keys(LAST_KNOWN).find(item => normalizeName(item) === normalized);
  return key ? LAST_KNOWN[key] : null;
}

function currentPrice(vehicle) {
  const prices = (vehicle.purchase || []).map(item => num(item.price)).filter(value => value > 0);
  return prices.length ? Math.min(...prices) : null;
}

function availability(vehicle) {
  const current = currentPrice(vehicle);
  if (current) return { kind: 'now', label: 'Ora', price: current };
  const last = lastPrice(vehicle.name);
  if (last) return { kind: 'last', label: 'Ultimo noto', price: last };
  return { kind: 'none', label: 'Non venduta', price: null };
}

function toCompact(vehicle) {
  const thrusters = vehicle.propulsion?.thrusters || [];
  const main = thrusters.find(item => item.type === 'Main');
  const maneuver = thrusters.find(item => item.type === 'Maneuver');
  const purchases = (vehicle.uex_prices?.purchase || []).map(item => ({
    price: num(item.price_buy), terminal: item.terminal_name || item.location_name || ''
  })).filter(item => item.price > 0);
  return {
    id: vehicle.uuid || vehicle.class_name || vehicle.name,
    slug: vehicle.slug || vehicle.uuid || '',
    name: vehicle.shipmatrix_name || vehicle.name || vehicle.game_name || 'Senza nome',
    manufacturer: vehicle.manufacturer?.name || '',
    role: vehicle.foci?.[0] || vehicle.role || vehicle.career || vehicle.type || '',
    productionStatus: localized(vehicle.production_status).toLowerCase(),
    isSpaceship: Boolean(vehicle.is_spaceship),
    size: num(vehicle.size_class), cargo: num(vehicle.cargo_capacity), inventory: num(vehicle.vehicle_inventory) / 1e6,
    crewMin: vehicle.crew?.min ?? null, crewMax: vehicle.crew?.max ?? null,
    health: num(vehicle.health), shield: num(vehicle.shield?.hp ?? vehicle.shield_hp), armor: num(vehicle.armor?.health),
    scm: num(vehicle.speed?.scm), nav: num(vehicle.speed?.max),
    pitch: num(vehicle.agility?.pitch), yaw: num(vehicle.agility?.yaw), roll: num(vehicle.agility?.roll),
    mainG: num(main?.g), maneuverG: num(maneuver?.g),
    quantumRange: num(vehicle.quantum?.quantum_range), quantumFuel: num(vehicle.quantum?.quantum_fuel_capacity),
    beds: num(vehicle.seating?.beds), medTier: vehicle.max_medical_tier ?? null,
    pilotDps: num(vehicle.weaponry?.pilot_dps), sustainedDps: num(vehicle.weaponry?.pilot_sustained_dps),
    alpha: num(vehicle.weaponry?.pilot_alpha), missileCount: num(vehicle.weaponry?.missiles?.count),
    missileDamage: num(vehicle.weaponry?.total_missile_damage),
    weapons: (vehicle.weaponry?.fixed_weapons?.weapons || []).map(item => item.name).filter(Boolean),
    purchase: purchases,
    source: vehicle.link || `https://api.star-citizen.wiki/api/vehicles/${encodeURIComponent(vehicle.slug || vehicle.uuid || vehicle.name)}`
  };
}

async function fetchAllVehicles() {
  const all = [];
  for (let page = 1; page <= 10; page += 1) {
    $('#progress').textContent = `Caricamento pagina ${page}…`;
    const url = new URL(API);
    url.searchParams.set('page[size]', String(PAGE_SIZE));
    url.searchParams.set('page[number]', String(page));
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`API HTTP ${response.status}`);
    const payload = await response.json();
    const batch = Array.isArray(payload) ? payload : (payload.data || []);
    all.push(...batch);
    const lastPage = num(payload.meta?.last_page || payload.meta?.lastPage || payload.meta?.page?.last);
    if (!batch.length || batch.length < PAGE_SIZE || (lastPage && page >= lastPage)) break;
  }
  return all;
}

function cleanVehicles(raw) {
  const seen = new Map();
  for (const item of raw) {
    const vehicle = item.isSpaceship === undefined ? toCompact(item) : item;
    if (!vehicle.isSpaceship) continue;
    if (vehicle.productionStatus && !vehicle.productionStatus.includes('flight-ready')) continue;
    if (editionRx.test(vehicle.name)) continue;
    const key = normalizeName(vehicle.name).toLowerCase();
    const previous = seen.get(key);
    if (!previous || (currentPrice(vehicle) && !currentPrice(previous))) seen.set(key, vehicle);
  }
  return [...seen.values()];
}

function percentile(values, value, logarithmic = false) {
  if (!Number.isFinite(value) || !values.length) return 0;
  const clean = values.filter(Number.isFinite).map(item => logarithmic ? Math.log1p(Math.max(0, item)) : item).sort((a, b) => a - b);
  const target = logarithmic ? Math.log1p(Math.max(0, value)) : value;
  let index = clean.findIndex(item => item >= target);
  if (index < 0) index = clean.length - 1;
  return clean.length === 1 ? 100 : Math.round(index / (clean.length - 1) * 100);
}

function buildScores(items) {
  const raw = items.map(vehicle => ({
    vehicle,
    defenseRaw: vehicle.health + vehicle.shield * 1.15 + vehicle.armor * 0.35,
    damageRaw: vehicle.sustainedDps * 0.7 + vehicle.pilotDps * 0.3 + Math.sqrt(Math.max(0, vehicle.missileDamage)) * 6,
    turnRaw: (vehicle.pitch + vehicle.yaw) * 1.25 + vehicle.roll * 0.3,
    accelerationRaw: vehicle.mainG * 0.45 + vehicle.maneuverG * 0.55,
    rangeRaw: vehicle.quantumRange + vehicle.quantumFuel * 8e9,
    utilityRaw: vehicle.cargo * 1.3 + vehicle.inventory * 8 + vehicle.beds * 3 + (vehicle.medTier ? 4 - vehicle.medTier : 0) * 12
  }));
  const list = key => raw.map(item => item[key]);
  return raw.map(item => {
    const defense = percentile(list('defenseRaw'), item.defenseRaw, true);
    const damage = percentile(list('damageRaw'), item.damageRaw, true);
    const turn = percentile(list('turnRaw'), item.turnRaw, true);
    const acceleration = percentile(list('accelerationRaw'), item.accelerationRaw, true);
    const agility = Math.round(turn * 0.58 + acceleration * 0.42);
    const range = percentile(list('rangeRaw'), item.rangeRaw, true);
    const utility = percentile(list('utilityRaw'), item.utilityRaw, true);
    const crewPenalty = Math.min(22, Math.max(0, num(item.vehicle.crewMax) - 2) * 4);
    const solo = clamp(Math.round(damage * 0.32 + defense * 0.26 + agility * 0.22 + range * 0.1 + utility * 0.1 - crewPenalty));
    return { ...item.vehicle, scores: { damage, defense, agility, range, utility, solo } };
  });
}

function scoreClass(score) { return score >= 70 ? 'hi' : score >= 40 ? 'mid' : 'low'; }

function populateFilters() {
  const manufacturers = [...new Set(state.all.map(vehicle => vehicle.manufacturer).filter(Boolean))].sort();
  const roles = [...new Set(state.all.map(roleOf).filter(Boolean))].sort();
  $('#manufacturer').innerHTML = '<option value="">Tutti</option>' + manufacturers.map(value => `<option>${esc(value)}</option>`).join('');
  $('#role').innerHTML = '<option value="">Tutti</option>' + roles.map(value => `<option>${esc(value)}</option>`).join('');
}

function sortRows() {
  const key = state.sort;
  const direction = state.direction;
  const value = vehicle => {
    if (key === 'name') return vehicle.name;
    if (key === 'role') return roleOf(vehicle);
    if (key === 'price') return availability(vehicle).price ?? Infinity;
    if (key === 'cargo') return vehicle.cargo;
    return num(vehicle.scores?.[key]);
  };
  state.filtered.sort((a, b) => {
    const left = value(a), right = value(b);
    return typeof left === 'string' ? left.localeCompare(right) * direction : (left - right) * direction;
  });
}

function applyFilters() {
  const query = $('#search').value.trim().toLowerCase();
  const manufacturer = $('#manufacturer').value;
  const role = $('#role').value;
  const availabilityFilter = $('#availability').value;
  const minimumCargo = num($('#cargo').value);
  state.sort = $('#sort').value;
  state.filtered = state.all.filter(vehicle => {
    const sale = availability(vehicle);
    const haystack = `${vehicle.name} ${vehicle.manufacturer} ${roleOf(vehicle)}`.toLowerCase();
    return (!query || haystack.includes(query))
      && (!manufacturer || vehicle.manufacturer === manufacturer)
      && (!role || roleOf(vehicle) === role)
      && (availabilityFilter === 'all' || sale.kind === availabilityFilter)
      && vehicle.cargo >= minimumCargo
      && sale.price !== null;
  });
  sortRows();
  if (!state.selected || !state.filtered.some(vehicle => vehicle.id === state.selected.id)) {
    state.selected = state.filtered[0] || null;
  }
  render();
  renderDetail(state.selected);
}

function render() {
  $('#loading').style.display = 'none';
  const rows = state.filtered.map(vehicle => {
    const sale = availability(vehicle), scores = vehicle.scores;
    return `<tr data-id="${esc(vehicle.id)}" class="${state.selected?.id === vehicle.id ? 'selected' : ''}">
      <td class="name">${esc(vehicle.name)}<span class="sub">${esc(vehicle.manufacturer)}</span></td>
      <td>${esc(roleOf(vehicle))}</td>
      <td><span class="pill ${sale.kind}">${sale.label}</span> ${fmt(sale.price)}</td>
      <td>${fmt(vehicle.cargo)}</td>
      ${['damage','defense','agility','range','utility','solo'].map(key => `<td><span class="score ${scoreClass(scores[key])}">${scores[key]}</span></td>`).join('')}
      <td>${fmt(vehicle.scm)} / ${fmt(vehicle.nav)}</td><td>${vehicle.crewMin ?? '—'}–${vehicle.crewMax ?? '—'}</td>
    </tr>`;
  }).join('');
  $('#rows').innerHTML = rows || '<tr><td colspan="12">Nessuna nave corrisponde ai filtri.</td></tr>';
  $('#cards').innerHTML = state.filtered.map(vehicle => {
    const sale = availability(vehicle), scores = vehicle.scores;
    return `<article class="ship-card" data-id="${esc(vehicle.id)}"><div class="ship-card-head"><div><h3>${esc(vehicle.name)}</h3><span class="sub">${esc(roleOf(vehicle))}</span></div><span class="pill ${sale.kind}">${fmt(sale.price)}</span></div><div class="card-scores">${['damage','defense','agility','range','solo'].map(key => `<div><b>${scores[key]}</b><span class="sub">${key}</span></div>`).join('')}</div></article>`;
  }).join('');
  const purchasable = state.filtered.filter(vehicle => availability(vehicle).kind === 'now').length;
  const averageSolo = state.filtered.length ? Math.round(state.filtered.reduce((sum, vehicle) => sum + vehicle.scores.solo, 0) / state.filtered.length) : 0;
  const maximumCargo = Math.max(0, ...state.filtered.map(vehicle => vehicle.cargo));
  $('#summary').textContent = `${state.filtered.length} navi visibili su ${state.all.length} · prezzi aUEC`;
  $('#stats').innerHTML = [
    ['Visibili', state.filtered.length], ['Acquistabili ora', purchasable], ['Solo medio', averageSolo],
    ['SCU massimo', fmt(maximumCargo)], ['Top ordine', state.filtered[0]?.name || '—'], ['Dati', 'Live 4.9']
  ].map(([label, value]) => `<div class="stat"><b>${esc(value)}</b><span>${label}</span></div>`).join('');
  document.querySelectorAll('[data-id]').forEach(element => { element.onclick = () => selectVehicle(element.dataset.id); });
}

function selectVehicle(id) {
  state.selected = state.all.find(vehicle => vehicle.id === id) || null;
  render();
  renderDetail(state.selected);
}

function radarSvg(scores) {
  const keys = ['damage','defense','agility','range','utility','solo'];
  const labels = ['Danno','Difesa','Agilità','Range','Utilità','Solo'];
  const centerX = 150, centerY = 105, radius = 78;
  const point = (index, value) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / keys.length;
    return [centerX + Math.cos(angle) * radius * value / 100, centerY + Math.sin(angle) * radius * value / 100];
  };
  const grid = [25,50,75,100].map(value => `<polygon points="${keys.map((_, index) => point(index, value).join(',')).join(' ')}" fill="none" stroke="#24434f"/>`).join('');
  const axes = keys.map((_, index) => { const end = point(index, 100), label = point(index, 122); return `<line x1="${centerX}" y1="${centerY}" x2="${end[0]}" y2="${end[1]}" stroke="#24434f"/><text x="${label[0]}" y="${label[1]}" fill="#8ea7ae" font-size="10" text-anchor="middle">${labels[index]}</text>`; }).join('');
  const polygon = keys.map((key, index) => point(index, scores[key]).join(',')).join(' ');
  return `<svg class="radar" viewBox="0 0 300 210" aria-label="Grafico prestazioni">${grid}${axes}<polygon points="${polygon}" fill="rgba(94,231,240,.2)" stroke="#5ee7f0" stroke-width="2"/></svg>`;
}

function stockText(vehicle) {
  const counts = {};
  vehicle.weapons.forEach(name => { counts[name] = (counts[name] || 0) + 1; });
  const weapons = Object.entries(counts).map(([name, count]) => `${count}× ${name}`).join(', ') || 'Armi stock non esposte dalla fonte';
  return `${weapons}${vehicle.missileCount ? `; ${vehicle.missileCount} missili o ordigni` : ''}.`;
}

function buildText(vehicle, meta = false) {
  const exact = EXACT[vehicle.name];
  if (exact) return meta ? exact.meta : exact.easy;
  const role = roleOf(vehicle).toLowerCase();
  const core = vehicle.size >= 5 ? 'componenti S3 Grade A compatibili' : vehicle.size >= 3 ? 'componenti S2 Grade A compatibili' : 'componenti S1 Grade A compatibili';
  if (meta) return `${core} via acquisto, blueprint e reputazione; armi e missili uniformati al ruolo reale.`;
  if (/fighter|combat|gunship|bomber|interdict/.test(role)) return 'Armi con velocità proiettile omogenea, scudi Grade A acquistabili e missili uniformati CS, EM o IR.';
  if (/cargo|freight|transport|explor|touring|passenger/.test(role)) return 'Priorità a quantum drive, scudi e affidabilità energetica; armi solo dopo gli upgrade logistici.';
  return 'Scudi e quantum drive acquistabili migliori compatibili; mantieni lo stock finché il ruolo non richiede un fit dedicato.';
}

function renderDetail(vehicle) {
  if (!vehicle) {
    $('#detail').innerHTML = '<div class="detail-empty">Nessuna nave visibile con i filtri attuali.</div>';
    return;
  }
  const sale = availability(vehicle), scores = vehicle.scores;
  const location = vehicle.purchase.find(item => item.price === sale.price);
  $('#detail').innerHTML = `<div class="hero"><span class="eyebrow">${esc(vehicle.manufacturer)} / ${esc(roleOf(vehicle))}</span><h2>${esc(vehicle.name)}</h2><div class="hero-meta"><span class="pill ${sale.kind}">${sale.label} · ${fmt(sale.price)} aUEC</span><span class="pill">Size ${vehicle.size || 'N/D'}</span></div></div><div class="detail-body">
    <div class="metrics">${[['Danno',scores.damage],['Difesa',scores.defense],['Agilità',scores.agility],['Range',scores.range],['Utilità',scores.utility],['Solo',scores.solo]].map(([label,value]) => `<div class="metric"><b>${value}</b><span>${label}</span></div>`).join('')}</div>
    ${radarSvg(scores)}
    <div class="section"><h3>Dati principali</h3><div class="kv"><span>Prezzo</span><b>${fmt(sale.price)} aUEC</b><span>Terminale</span><b>${esc(location?.terminal || 'Ultimo prezzo noto')}</b><span>Cargo</span><b>${fmt(vehicle.cargo)} SCU</b><span>Hull / shield</span><b>${fmt(vehicle.health)} / ${fmt(vehicle.shield)}</b><span>DPS burst / sostenuto</span><b>${fmt(vehicle.pilotDps)} / ${fmt(vehicle.sustainedDps)}</b><span>Alpha</span><b>${fmt(vehicle.alpha)}</b><span>Missili</span><b>${fmt(vehicle.missileCount)} · ${fmt(vehicle.missileDamage)} dmg</b><span>SCM / NAV</span><b>${fmt(vehicle.scm)} / ${fmt(vehicle.nav)}</b><span>Pitch / yaw / roll</span><b>${fmt(vehicle.pitch)} / ${fmt(vehicle.yaw)} / ${fmt(vehicle.roll)}</b><span>QT range</span><b>${fmt(vehicle.quantumRange / 1e9)} Gm</b><span>Letti / med</span><b>${fmt(vehicle.beds)} / ${vehicle.medTier ?? '—'}</b></div></div>
    <div class="section"><h3>Loadout</h3><div class="build"><b>Stock</b>${esc(stockText(vehicle))}</div><div class="build easy"><b>Easy</b>${esc(buildText(vehicle, false))}</div><div class="build meta"><b>Max / meta</b>${esc(buildText(vehicle, true))}</div></div>
    <div class="section"><h3>Come sono calcolati gli indici</h3><div class="formula"><b>Difesa:</b> hull + scudi ×1,15 + armor ×0,35. <b>Danno:</b> 70% DPS sostenuto + 30% burst + peso ridotto dei missili. <b>Agilità:</b> 58% rotazione + 42% accelerazione. <b>Solo:</b> 32% danno, 26% difesa, 22% agilità, 10% autonomia e 10% utilità, meno la penalità equipaggio. Gli indici sono percentili 0–100 sulle navi caricate.</div></div>
    <div class="section"><a href="${esc(vehicle.source)}" target="_blank" rel="noopener">Apri fonte tecnica ↗</a></div>
  </div>`;
}

async function load(force = false) {
  $('#loading').style.display = 'block';
  $('#loading').textContent = 'Recupero di tutte le pagine API…';
  $('#progress').textContent = '';
  try {
    let compact = null;
    if (!force) {
      try {
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (cache && Date.now() - cache.time < CACHE_HOURS * 3600000) compact = cache.data;
      } catch { localStorage.removeItem(CACHE_KEY); }
    }
    if (!compact) {
      const raw = await fetchAllVehicles();
      compact = cleanVehicles(raw).map(item => item.isSpaceship === undefined ? toCompact(item) : item);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data: compact })); } catch { /* quota piena: il tool resta operativo */ }
    }
    state.all = buildScores(cleanVehicles(compact)).filter(vehicle => availability(vehicle).price !== null);
    state.selected = state.all.find(vehicle => normalizeName(vehicle.name).toLowerCase() === 'corsair') || state.all[0] || null;
    populateFilters();
    applyFilters();
    $('#progress').textContent = `${state.all.length} navi caricate correttamente.`;
  } catch (error) {
    $('#loading').innerHTML = `<span class="error">Impossibile caricare il database: ${esc(error.message)}.</span><br>Premi “Aggiorna dati” per riprovare.`;
    $('#progress').textContent = '';
  }
}

['search','manufacturer','role','availability','cargo'].forEach(id => $('#'+id).addEventListener(id === 'search' ? 'input' : 'change', applyFilters));
$('#sort').addEventListener('change', () => {
  state.sort = $('#sort').value;
  state.direction = ['name','role','price'].includes(state.sort) ? 1 : -1;
  applyFilters();
});
$('#reset').onclick = () => {
  ['search','manufacturer','role'].forEach(id => { $('#'+id).value = ''; });
  $('#availability').value = 'all'; $('#cargo').value = '0'; $('#sort').value = 'solo';
  state.sort = 'solo'; state.direction = -1; applyFilters();
};
$('#refresh').onclick = () => { localStorage.removeItem(CACHE_KEY); load(true); };
document.querySelectorAll('th[data-sort]').forEach(header => {
  header.onclick = () => {
    const key = header.dataset.sort;
    state.direction = state.sort === key ? -state.direction : (['name','role','price'].includes(key) ? 1 : -1);
    state.sort = key;
    if ([...$('#sort').options].some(option => option.value === key)) $('#sort').value = key;
    sortRows();
    if (!state.filtered.some(vehicle => vehicle.id === state.selected?.id)) state.selected = state.filtered[0] || null;
    render(); renderDetail(state.selected);
  };
});

load();