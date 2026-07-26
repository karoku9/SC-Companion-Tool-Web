'use strict';

(function exposeShipCatalog(root) {
  function zones(total, labels) {
    const count = labels.length;
    const base = Math.floor(total / count);
    let remainder = total - base * count;
    return Object.freeze(labels.map(([id, label, access]) => {
      const capacityScu = base + (remainder > 0 ? 1 : 0);
      remainder = Math.max(0, remainder - 1);
      return Object.freeze({ id, label, access, capacityScu, layers: 1, columns: capacityScu, separable: true });
    }));
  }

  function model(input) {
    return Object.freeze({
      ...input,
      layout: Object.freeze({
        rows: 1,
        columns: input.capacityScu,
        accessPoints: Object.freeze(input.accessPoints ?? ['rear']),
        geometryStatus: 'operational-capacity-only',
        zones: zones(input.capacityScu, input.zones)
      }),
      sourceStatus: input.sourceStatus ?? 'official-capacity-reference'
    });
  }

  const models = Object.freeze([
    model({
      id: 'drake-corsair', manufacturer: 'Drake', model: 'Corsair', capacityScu: 72,
      accessPoints: ['rear'],
      zones: [['rear-access', 'Rear access', 'Rear ramp'], ['mid-bay', 'Mid bay', 'Through rear access'], ['forward-bay', 'Forward bay', 'Deep cargo']]
    }),
    model({
      id: 'drake-cutlass-black', manufacturer: 'Drake', model: 'Cutlass Black', capacityScu: 46,
      accessPoints: ['rear', 'left', 'right'],
      zones: [['rear-zone', 'Rear ramp', 'Rear ramp'], ['center-zone', 'Center bay', 'Rear or side doors'], ['side-zone', 'Side access', 'Side doors']]
    }),
    model({
      id: 'rsi-constellation-taurus', manufacturer: 'RSI', model: 'Constellation Taurus', capacityScu: 168,
      accessPoints: ['ventral-lift', 'rear'],
      zones: [['main-grid', 'Main cargo grid', 'Ventral lift'], ['rear-bay', 'Rear bay', 'Rear access']]
    }),
    model({
      id: 'misc-freelancer-max', manufacturer: 'MISC', model: 'Freelancer MAX', capacityScu: 120,
      accessPoints: ['rear'],
      zones: [['rear-grid', 'Rear grid', 'Rear ramp'], ['forward-grid', 'Forward grid', 'Through rear grid']]
    }),
    model({
      id: 'crusader-c2-hercules', manufacturer: 'Crusader', model: 'C2 Hercules', capacityScu: 696,
      accessPoints: ['front', 'rear'],
      zones: [['front-deck', 'Front cargo deck', 'Front ramp'], ['center-deck', 'Center cargo deck', 'Front or rear'], ['rear-deck', 'Rear cargo deck', 'Rear ramp']]
    }),
    model({
      id: 'misc-starlancer-max', manufacturer: 'MISC', model: 'Starlancer MAX', capacityScu: 224,
      accessPoints: ['rear', 'side'],
      zones: [['rear-hold', 'Rear hold', 'Rear ramp'], ['central-hold', 'Central hold', 'Side or rear access']]
    }),
    model({
      id: 'argo-raft', manufacturer: 'ARGO', model: 'RAFT', capacityScu: 96,
      accessPoints: ['external'],
      zones: [['container-a', 'Container A', 'External tractor'], ['container-b', 'Container B', 'External tractor'], ['container-c', 'Container C', 'External tractor']]
    })
  ]);

  function getModel(id) {
    return models.find((entry) => entry.id === id) ?? null;
  }

  function createHangarShip(input) {
    const selected = getModel(input.modelId);
    if (!selected) throw new Error('Unknown ship model');
    const quantumTimeFactor = Number(input.quantumTimeFactor ?? 1);
    if (!Number.isFinite(quantumTimeFactor) || quantumTimeFactor <= 0) throw new Error('Quantum time factor must be greater than zero');
    return Object.freeze({
      id: String(input.id ?? `ship-${Date.now()}`),
      modelId: selected.id,
      nickname: String(input.nickname ?? '').trim(),
      cargoCapacityScu: Number(input.cargoCapacityScu ?? selected.capacityScu),
      quantumDrive: String(input.quantumDrive ?? 'Stock').trim(),
      quantumTimeFactor,
      notes: String(input.notes ?? '').trim()
    });
  }

  const api = Object.freeze({ models, getModel, createHangarShip });
  root.SCCompanionShipCatalog = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));