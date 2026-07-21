'use strict';

(function exposeShipCatalog(root) {
  const models = Object.freeze([
    Object.freeze({
      id: 'drake-corsair',
      manufacturer: 'Drake',
      model: 'Corsair',
      capacityScu: 72,
      layout: Object.freeze({
        rows: 8,
        columns: 9,
        accessPoints: ['rear'],
        geometryStatus: 'concept',
        zones: Object.freeze([
          Object.freeze({ id: 'rear-access', label: 'Zone A · Rear access', access: 'Rear ramp', capacityScu: 24, layers: 3, columns: 8, separable: true }),
          Object.freeze({ id: 'mid-bay', label: 'Zone B · Mid bay', access: 'Through Zone A', capacityScu: 24, layers: 3, columns: 8, separable: true }),
          Object.freeze({ id: 'forward-bay', label: 'Zone C · Forward bay', access: 'Deep cargo', capacityScu: 24, layers: 3, columns: 8, separable: true })
        ])
      }),
      sourceStatus: 'reference'
    }),
    Object.freeze({
      id: 'drake-cutlass-black',
      manufacturer: 'Drake',
      model: 'Cutlass Black',
      capacityScu: 46,
      layout: Object.freeze({
        rows: 6,
        columns: 8,
        accessPoints: ['rear', 'left', 'right'],
        blockedCells: Object.freeze(['0:0', '0:7']),
        geometryStatus: 'concept',
        zones: Object.freeze([
          Object.freeze({ id: 'rear-zone', label: 'Zone A · Rear ramp', access: 'Rear ramp', capacityScu: 16, layers: 2, columns: 8, separable: true }),
          Object.freeze({ id: 'center-zone', label: 'Zone B · Center bay', access: 'Rear or side doors', capacityScu: 16, layers: 2, columns: 8, separable: true }),
          Object.freeze({ id: 'side-zone', label: 'Zone C · Side access', access: 'Side doors', capacityScu: 14, layers: 2, columns: 7, separable: true })
        ])
      }),
      sourceStatus: 'reference'
    })
  ]);

  function getModel(id) {
    return models.find((model) => model.id === id) ?? null;
  }

  function createHangarShip(input) {
    const model = getModel(input.modelId);
    if (!model) throw new Error('Unknown ship model');
    const quantumTimeFactor = Number(input.quantumTimeFactor ?? 1);
    if (!Number.isFinite(quantumTimeFactor) || quantumTimeFactor <= 0) {
      throw new Error('Quantum time factor must be greater than zero');
    }
    return Object.freeze({
      id: String(input.id ?? `ship-${Date.now()}`),
      modelId: model.id,
      nickname: String(input.nickname ?? '').trim(),
      cargoCapacityScu: Number(input.cargoCapacityScu ?? model.capacityScu),
      quantumDrive: String(input.quantumDrive ?? 'Stock').trim(),
      quantumTimeFactor,
      notes: String(input.notes ?? '').trim()
    });
  }

  const api = Object.freeze({ models, getModel, createHangarShip });
  root.SCCompanionShipCatalog = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
