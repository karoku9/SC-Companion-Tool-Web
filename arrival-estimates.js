'use strict';

(function exposeArrivalEstimates(root) {
  const presets = Object.freeze({
    'landing-zone': Object.freeze([
      Object.freeze({ id: 'approach', label: 'Approach and atmospheric descent', minMinutes: 4, maxMinutes: 8 }),
      Object.freeze({ id: 'atc', label: 'ATC, hangar assignment and final approach', minMinutes: 2, maxMinutes: 5 }),
      Object.freeze({ id: 'ship-exit', label: 'Landing, doors and leaving the ship', minMinutes: 1, maxMinutes: 3 }),
      Object.freeze({ id: 'local-transit', label: 'Elevators, walking and transit animations', minMinutes: 3, maxMinutes: 8 })
    ]),
    'orbital-station': Object.freeze([
      Object.freeze({ id: 'approach', label: 'Orbital approach and alignment', minMinutes: 2, maxMinutes: 4 }),
      Object.freeze({ id: 'atc', label: 'ATC and hangar assignment', minMinutes: 1, maxMinutes: 3 }),
      Object.freeze({ id: 'ship-exit', label: 'Landing, doors and elevator access', minMinutes: 1, maxMinutes: 3 })
    ]),
    outpost: Object.freeze([
      Object.freeze({ id: 'approach', label: 'Surface approach and landing', minMinutes: 2, maxMinutes: 5 }),
      Object.freeze({ id: 'ship-exit', label: 'Ship exit and terminal access', minMinutes: 1, maxMinutes: 3 })
    ])
  });

  const trafficFactors = Object.freeze({ low: 0.9, normal: 1, high: 1.2 });

  function round(value) {
    return Math.max(1, Math.round(value));
  }

  function estimateArrival(presetId, trafficLevel = 'normal') {
    const segments = presets[presetId];
    if (!segments) throw new Error(`Unknown arrival preset: ${presetId}`);
    const factor = trafficFactors[trafficLevel] ?? trafficFactors.normal;
    const adjusted = segments.map((segment) => Object.freeze({
      ...segment,
      minMinutes: round(segment.minMinutes * factor),
      maxMinutes: round(segment.maxMinutes * factor)
    }));

    return Object.freeze({
      presetId,
      trafficLevel,
      indicativeOnly: true,
      segments: Object.freeze(adjusted),
      minMinutes: adjusted.reduce((total, segment) => total + segment.minMinutes, 0),
      maxMinutes: adjusted.reduce((total, segment) => total + segment.maxMinutes, 0)
    });
  }

  const api = Object.freeze({ presets, estimateArrival });
  root.SCCompanionArrivalEstimates = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
