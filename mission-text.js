'use strict';

(function exposeMissionText(root) {
  function slug(value) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function tokenizeCargo(value) {
    const pattern = /(\d+(?:\.\d+)?)\s*scu\s+([a-z0-9_-]+)/gi;
    const items = [];
    let match;
    while ((match = pattern.exec(value)) !== null) {
      items.push({ scu: Number(match[1]), commodity: match[2] });
    }
    return items;
  }

  function resolveLocation(name, locationModel) {
    const [known] = locationModel?.searchOperationalLocations(name) ?? [];
    if (known) return { id: known.id, label: locationModel.formatOperationalLabel(known) };
    return { id: `custom-${slug(name)}`, label: String(name).trim() };
  }

  function parseMissionText(text, locationModel) {
    const lines = String(text ?? '').split(/\r?\n/).map((line) => line.trim());
    const missions = [];
    const warnings = [];
    let current = null;

    function startMission(title) {
      current = {
        id: `mission-${missions.length + 1}-${slug(title)}`,
        title,
        cargoLots: [],
        pickupPools: []
      };
      missions.push(current);
    }

    lines.forEach((line, index) => {
      if (!line) return;
      const action = line.match(/^(collect|pickup|deliver)\s+(.+)$/i);
      if (!action) {
        startMission(line.replace(/^mission\s+/i, '').trim());
        return;
      }
      if (!current) throw new Error(`Line ${index + 1}: add a mission name before objectives`);

      const type = action[1].toLowerCase();
      const payload = action[2];
      const firstCargo = payload.search(/\d+(?:\.\d+)?\s*scu/i);
      if (firstCargo < 1) throw new Error(`Line ${index + 1}: expected a location and SCU cargo`);
      const location = resolveLocation(payload.slice(0, firstCargo).trim(), locationModel);
      const cargo = tokenizeCargo(payload.slice(firstCargo));
      if (!cargo.length) throw new Error(`Line ${index + 1}: no cargo quantity found`);

      if (type === 'collect' || type === 'pickup') {
        cargo.forEach((item) => current.pickupPools.push({
          commodity: item.commodity,
          remaining: item.scu,
          pickupType: type,
          pickupLocationId: location.id,
          pickupLocationLabel: location.label
        }));
        return;
      }

      cargo.forEach((deliveryItem) => {
        let remaining = deliveryItem.scu;
        current.pickupPools
          .filter((pool) => pool.commodity.toLowerCase() === deliveryItem.commodity.toLowerCase() && pool.remaining > 0)
          .forEach((pool) => {
            if (remaining <= 0) return;
            const allocated = Math.min(pool.remaining, remaining);
            current.cargoLots.push({
              id: `${current.id}-lot-${current.cargoLots.length + 1}`,
              commodity: pool.commodity,
              scu: allocated,
              pickupType: pool.pickupType,
              pickupLocationId: pool.pickupLocationId,
              pickupLocationLabel: pool.pickupLocationLabel,
              deliveryLocationId: location.id,
              deliveryLocationLabel: location.label
            });
            pool.remaining -= allocated;
            remaining -= allocated;
          });
        if (remaining > 0) {
          throw new Error(`Line ${index + 1}: ${remaining} SCU ${deliveryItem.commodity} has no matching pickup`);
        }
      });
    });

    missions.forEach((mission) => {
      mission.pickupPools.filter((pool) => pool.remaining > 0).forEach((pool) => {
        warnings.push(`${mission.title}: ${pool.remaining} SCU ${pool.commodity} collected at ${pool.pickupLocationLabel} has no delivery`);
      });
      delete mission.pickupPools;
    });

    return { missions, warnings };
  }

  const api = Object.freeze({ parseMissionText, tokenizeCargo });
  root.SCCompanionMissionText = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
