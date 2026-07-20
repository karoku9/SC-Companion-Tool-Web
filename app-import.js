'use strict';

window.openMissionImport = function openMissionImportReadable() {
  openCustomOverlay({
    title: 'Import mission',
    subtitle: 'Paste a readable mission. Each cargo block can have its own pickup, delivery and container breakdown. JSON remains optional.',
    size: 'medium',
    content: `<div class="import-layout">
      <div class="import-help">Accepted readable format:<br><code>Mission: Stanton consolidated freight run<br>Type: Hauling<br>Reference: TEST-MULTI-01<br>Reward: 87500<br><br>Cargo:<br>Commodity: Agricium<br>Pickup: ArcCorp Mining Area 056<br>Delivery: Area18<br>Containers: 1x8 SCU<br>Note: Front cargo grid<br><br>Cargo:<br>Commodity: Titanium<br>Pickup: HDMS-Bezdek<br>Delivery: Lorville<br>Containers: 2x4 SCU</code></div>
      <div class="field"><label>Mission text or JSON</label><textarea id="missionImportText" placeholder="Paste mission details here…"></textarea></div>
      <div class="button-row" style="justify-content:flex-end"><button class="secondary-button" id="cancelMissionImport">Cancel</button><button class="primary-button" id="parseMissionImport">Parse and review</button></div>
    </div>`,
    onOpen: root => {
      $('#cancelMissionImport', root).addEventListener('click', closeOverlay);
      $('#parseMissionImport', root).addEventListener('click', () => {
        const text = $('#missionImportText', root).value.trim();
        if (!text) return toast('Paste mission details first.');
        const parsed = window.parseMissionImport(text);
        closeOverlay();
        requestAnimationFrame(() => openMissionEditor(null, parsed));
      });
    }
  });
};

window.parseMissionImport = function parseMissionImportReadable(text) {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') return normalizeMission(parsed);
  } catch {}

  const result = blankMission();
  result.cargo = [];

  let currentLot = null;
  let globalPickup = '';
  let globalDelivery = '';

  const beginLot = commodity => {
    currentLot = normalizeLot({
      commodity: commodity || '',
      pickup: globalPickup,
      delivery: globalDelivery,
      scu: 0,
      containers: [],
      note: ''
    });
    result.cargo.push(currentLot);
    return currentLot;
  };

  const parseContainerGroups = value => {
    const groups = [];
    const pattern = /(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*scu/gi;
    let match;
    while ((match = pattern.exec(value))) {
      groups.push({ count: Math.max(1, Number(match[1]) || 1), size: Math.max(0, Number(match[2]) || 0) });
    }
    return groups;
  };

  const lines = text.split(/\r?\n/);
  for (const originalLine of lines) {
    const line = originalLine.trim().replace(/^[-•]\s*/, '');
    if (!line) continue;

    const cargoHeader = line.match(/^cargo(?:\s+\d+)?\s*:\s*(.*)$/i);
    if (cargoHeader) {
      const value = cargoHeader[1].trim();
      const legacy = value.match(/^(?:(\d+)\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*scu\s+(.+)$/i);
      if (legacy) {
        const count = legacy[1] ? Number(legacy[1]) : null;
        const amount = Number(legacy[2]);
        const commodity = legacy[3].trim();
        let lot = result.cargo.find(item =>
          norm(item.commodity) === norm(commodity) &&
          norm(item.pickup) === norm(globalPickup) &&
          norm(item.delivery) === norm(globalDelivery)
        );
        if (!lot) lot = beginLot(commodity);
        if (count) lot.containers.push({ count, size: amount });
        else lot.scu = amount;
        currentLot = lot;
      } else {
        beginLot(value);
      }
      continue;
    }

    const field = line.match(/^([^:]+)\s*:\s*(.*)$/);
    if (!field) continue;

    const key = field[1].trim().toLowerCase();
    const value = field[2].trim();

    if (['mission', 'title', 'mission name'].includes(key)) {
      result.title = value || result.title;
      continue;
    }
    if (key === 'type' || key === 'mission type') {
      result.type = value || result.type;
      continue;
    }
    if (['reference', 'ref'].includes(key)) {
      result.reference = value;
      continue;
    }
    if (key === 'reward') {
      result.reward = Number(value.replace(/[^0-9.]/g, '')) || 0;
      continue;
    }
    if (['mission notes', 'mission note'].includes(key)) {
      result.notes = value;
      continue;
    }

    if (key === 'commodity') {
      (currentLot || beginLot()).commodity = value;
      continue;
    }
    if (key === 'pickup') {
      if (currentLot) currentLot.pickup = value;
      else globalPickup = value;
      continue;
    }
    if (key === 'delivery' || key === 'drop-off' || key === 'dropoff') {
      if (currentLot) currentLot.delivery = value;
      else globalDelivery = value;
      continue;
    }
    if (['scu', 'total scu', 'quantity'].includes(key)) {
      (currentLot || beginLot()).scu = Number(value.replace(/[^0-9.]/g, '')) || 0;
      continue;
    }
    if (['containers', 'container', 'boxes', 'box breakdown'].includes(key)) {
      const lot = currentLot || beginLot();
      const groups = parseContainerGroups(value);
      if (groups.length) {
        lot.containers.push(...groups);
        lot.scu = 0;
      }
      continue;
    }
    if (['note', 'cargo note', 'lot note'].includes(key)) {
      if (currentLot) currentLot.note = value;
      else result.notes = value;
    }
  }

  if (!result.cargo.length) {
    result.cargo.push(normalizeLot({
      pickup: globalPickup,
      delivery: globalDelivery,
      scu: 1,
      note: `Imported source: ${text.slice(0, 220)}`
    }));
  }

  result.cargo.forEach(lot => {
    if (!lot.pickup) lot.pickup = globalPickup;
    if (!lot.delivery) lot.delivery = globalDelivery;
    if (!lot.containers.length && lot.scu <= 0) lot.scu = 1;
  });

  return normalizeMission(result);
};
