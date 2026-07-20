'use strict';

window.COMPANION_DATA = Object.freeze({
  ships: [
    { id: 'caterpillar', family: 'Caterpillar', variant: 'Caterpillar', name: 'Drake Caterpillar', maker: 'Drake Interplanetary', capacity: 576, role: 'Heavy freight' },
    { id: 'taurus', family: 'Constellation', variant: 'Taurus', name: 'RSI Constellation Taurus', maker: 'Roberts Space Industries', capacity: 174, role: 'Multi-role freight' },
    { id: 'freelancer-max', family: 'Freelancer', variant: 'MAX', name: 'MISC Freelancer MAX', maker: 'Musashi Industrial & Starflight Concern', capacity: 120, role: 'Medium freight' },
    { id: 'zeus-cl', family: 'Zeus Mk II', variant: 'CL', name: 'RSI Zeus Mk II CL', maker: 'Roberts Space Industries', capacity: 128, role: 'Medium freight' },
    { id: 'raft', family: 'RAFT', variant: 'Standard', name: 'ARGO RAFT', maker: 'ARGO Astronautics', capacity: 96, role: 'Container freight' },
    { id: 'cutlass-black', family: 'Cutlass', variant: 'Black', name: 'Drake Cutlass Black', maker: 'Drake Interplanetary', capacity: 46, role: 'Light freight' },
    { id: 'c2-hercules', family: 'Hercules', variant: 'C2', name: 'Crusader C2 Hercules', maker: 'Crusader Industries', capacity: 696, role: 'Vehicle and heavy freight' },
    { id: 'hull-a', family: 'Hull', variant: 'A', name: 'MISC Hull A', maker: 'Musashi Industrial & Starflight Concern', capacity: 64, role: 'External cargo freight' }
  ],

  locations: [
    { id: 'stanton', name: 'Stanton', parent: 'System', type: 'System', x: 50, y: 48, landing: 'N/A', refuel: true, repair: true, traffic: 'High', danger: 'Guarded', reliability: 'Stable', hops: '—', note: 'Corporate system with four primary jurisdictions.' },
    { id: 'hurston', name: 'Hurston', parent: 'Stanton', type: 'Planet', x: 30, y: 36, landing: 'Orbital approach', refuel: true, repair: true, traffic: 'High', danger: 'Low', reliability: 'Stable', hops: '0–1', note: 'Industrial world; Everus Harbor is the fastest staging point.' },
    { id: 'everus', name: 'Everus Harbor', parent: 'Hurston', type: 'Orbital Station', x: 26, y: 30, landing: 'Hangar', refuel: true, repair: true, traffic: 'High', danger: 'Low', reliability: 'Good', hops: '0', note: 'Reliable freight staging above Lorville.' },
    { id: 'lorville', name: 'Lorville', parent: 'Hurston', type: 'Landing Zone', x: 34, y: 42, landing: 'City spaceport', refuel: true, repair: true, traffic: 'High', danger: 'Low', reliability: 'Moderate', hops: '1–2', note: 'Allow extra time for atmosphere and tram travel.' },
    { id: 'arial', name: 'Arial', parent: 'Hurston', type: 'Moon', x: 18, y: 25, landing: 'Surface', refuel: false, repair: false, traffic: 'Medium', danger: 'Moderate', reliability: 'Variable', hops: '1–3', note: 'Hot mining moon with exposed outposts.' },
    { id: 'bezdek', name: 'HDMS-Bezdek', parent: 'Arial', type: 'Outpost', x: 13, y: 19, landing: 'Surface pad', refuel: true, repair: true, traffic: 'Medium', danger: 'Moderate', reliability: 'Variable', hops: '2–4', note: 'Use an orbital marker before descending to the surface.' },
    { id: 'lathan', name: 'HDMS-Lathan', parent: 'Arial', type: 'Outpost', x: 21, y: 18, landing: 'Surface pad', refuel: true, repair: true, traffic: 'Medium', danger: 'Moderate', reliability: 'Variable', hops: '2–4', note: 'Cargo elevators may be busy during peak trade windows.' },
    { id: 'arccorp', name: 'ArcCorp', parent: 'Stanton', type: 'Planet', x: 74, y: 27, landing: 'Orbital approach', refuel: true, repair: true, traffic: 'High', danger: 'Low', reliability: 'Stable', hops: '0–1', note: 'Dense urban jurisdiction with a busy orbital corridor.' },
    { id: 'baijini', name: 'Baijini Point', parent: 'ArcCorp', type: 'Orbital Station', x: 69, y: 22, landing: 'Hangar', refuel: true, repair: true, traffic: 'High', danger: 'Low', reliability: 'Good', hops: '0', note: 'Convenient orbital staging for Area18 deliveries.' },
    { id: 'area18', name: 'Area18', parent: 'ArcCorp', type: 'Landing Zone', x: 80, y: 32, landing: 'City spaceport', refuel: true, repair: true, traffic: 'High', danger: 'Low', reliability: 'Moderate', hops: '1–2', note: 'Riker Memorial can be congested at busy times.' },
    { id: 'wala', name: 'Wala', parent: 'ArcCorp', type: 'Moon', x: 84, y: 21, landing: 'Surface', refuel: false, repair: false, traffic: 'Medium', danger: 'Moderate', reliability: 'Variable', hops: '1–3', note: 'Industrial moon with several surface terminals.' },
    { id: 'arc056', name: 'ArcCorp Mining Area 056', parent: 'Wala', type: 'Outpost', x: 89, y: 16, landing: 'Surface pad', refuel: true, repair: true, traffic: 'Medium', danger: 'Moderate', reliability: 'Variable', hops: '2–4', note: 'Approach visibility can be reduced on the night side.' },
    { id: 'crusader', name: 'Crusader', parent: 'Stanton', type: 'Gas Giant', x: 42, y: 72, landing: 'Orbital approach', refuel: true, repair: true, traffic: 'High', danger: 'Moderate', reliability: 'Stable', hops: '0–1', note: 'Long atmospheric travel makes Orison a slower cargo stop.' },
    { id: 'seraphim', name: 'Seraphim Station', parent: 'Crusader', type: 'Orbital Station', x: 37, y: 66, landing: 'Hangar', refuel: true, repair: true, traffic: 'High', danger: 'Moderate', reliability: 'Good', hops: '0', note: 'Popular staging point with high player traffic.' },
    { id: 'orison', name: 'Orison', parent: 'Crusader', type: 'Landing Zone', x: 47, y: 78, landing: 'City spaceport', refuel: true, repair: true, traffic: 'Medium', danger: 'Low', reliability: 'Moderate', hops: '1–2', note: 'Budget for a long atmospheric exit.' },
    { id: 'daymar', name: 'Daymar', parent: 'Crusader', type: 'Moon', x: 28, y: 78, landing: 'Surface', refuel: false, repair: false, traffic: 'Medium', danger: 'Moderate', reliability: 'Variable', hops: '1–3', note: 'Desert moon with mining and salvage terminals.' },
    { id: 'brios', name: 'Brio’s Breaker Yard', parent: 'Daymar', type: 'Scrapyard', x: 20, y: 85, landing: 'Open surface', refuel: false, repair: false, traffic: 'Medium', danger: 'High', reliability: 'Variable', hops: '2–4', note: 'Unregulated site outside armistice protection.' },
    { id: 'microtech', name: 'microTech', parent: 'Stanton', type: 'Planet', x: 72, y: 68, landing: 'Orbital approach', refuel: true, repair: true, traffic: 'High', danger: 'Low', reliability: 'Stable', hops: '0–1', note: 'Weather can complicate surface approaches.' },
    { id: 'tressler', name: 'Port Tressler', parent: 'microTech', type: 'Orbital Station', x: 67, y: 62, landing: 'Hangar', refuel: true, repair: true, traffic: 'High', danger: 'Low', reliability: 'Good', hops: '0', note: 'Primary orbital cargo staging above New Babbage.' },
    { id: 'newbabbage', name: 'New Babbage', parent: 'microTech', type: 'Landing Zone', x: 78, y: 75, landing: 'City spaceport', refuel: true, repair: true, traffic: 'Medium', danger: 'Low', reliability: 'Moderate', hops: '1–2', note: 'Snow and terrain may reduce approach visibility.' },
    { id: 'pyro-gateway', name: 'Pyro Gateway', parent: 'Stanton', type: 'Gateway', x: 88, y: 88, landing: 'Hangar', refuel: true, repair: true, traffic: 'High', danger: 'High', reliability: 'Variable', hops: '0–1', note: 'High-risk transit corridor toward Pyro.' }
  ],

  commodities: [
    { id: 'titanium', name: 'Titanium', legality: 'Legal', category: 'Metal', volatility: 'Low' },
    { id: 'agricium', name: 'Agricium', legality: 'Legal', category: 'Mineral', volatility: 'Medium' },
    { id: 'medical', name: 'Medical Supplies', legality: 'Legal', category: 'Medical', volatility: 'Medium' },
    { id: 'gold', name: 'Gold', legality: 'Legal', category: 'Metal', volatility: 'High' },
    { id: 'laranite', name: 'Laranite', legality: 'Legal', category: 'Mineral', volatility: 'High' },
    { id: 'distilled', name: 'Distilled Spirits', legality: 'Legal', category: 'Consumer', volatility: 'Low' },
    { id: 'weevil', name: 'Gasping Weevil Eggs', legality: 'Illegal', category: 'Contraband', volatility: 'Extreme' }
  ],

  missions: [
    {
      id: 'mission-01', title: 'Hurston relief transfer', type: 'Hauling', reference: 'M-01', reward: 68400,
      notes: 'Priority delivery window at Lorville.',
      cargo: [
        { id: 'lot-01', commodity: 'Titanium', scu: 8, pickup: 'HDMS-Bezdek', delivery: 'Lorville', note: 'Main cargo grid', missionId: 'mission-01' },
        { id: 'lot-02', commodity: 'Medical Supplies', scu: 12, pickup: 'Everus Harbor', delivery: 'Lorville', note: 'Load near lift', missionId: 'mission-01' }
      ]
    },
    {
      id: 'mission-03', title: 'Covalex freight transfer', type: 'Hauling', reference: 'M-03', reward: 46250,
      notes: 'Keep mission lots separated on the manifest.',
      cargo: [
        { id: 'lot-03', commodity: 'Titanium', scu: 4, pickup: 'HDMS-Bezdek', delivery: 'Lorville', note: 'Rear cargo grid', missionId: 'mission-03' },
        { id: 'lot-04', commodity: 'Agricium', scu: 8, pickup: 'ArcCorp Mining Area 056', delivery: 'Area18', note: 'Front cargo grid', missionId: 'mission-03' }
      ]
    }
  ],

  sampleRoute: [
    { id: 'step-01', kind: 'depart', location: 'Everus Harbor', nextLocation: 'HDMS-Bezdek', title: 'Depart from Everus Harbor', detail: 'Confirm doors, fuel and manifest before departure.' },
    { id: 'step-02', kind: 'travel', location: 'Everus Harbor', nextLocation: 'HDMS-Bezdek', title: 'Travel to HDMS-Bezdek', detail: 'Arial surface approach · approximately 2 orbital-marker assists.' },
    { id: 'step-03', kind: 'pickup', location: 'HDMS-Bezdek', nextLocation: 'HDMS-Bezdek', lotId: 'lot-01', title: 'Pick up 8 SCU Titanium', detail: 'Mission M-01 · main cargo grid.' },
    { id: 'step-04', kind: 'pickup', location: 'HDMS-Bezdek', nextLocation: 'Lorville', lotId: 'lot-03', title: 'Pick up 4 SCU Titanium', detail: 'Mission M-03 · keep distinct from M-01.' },
    { id: 'step-05', kind: 'travel', location: 'HDMS-Bezdek', nextLocation: 'Lorville', title: 'Travel to Lorville', detail: 'Hurston atmospheric approach · use Teasa Spaceport.' },
    { id: 'step-06', kind: 'delivery', location: 'Lorville', nextLocation: 'Lorville', lotId: 'lot-01', title: 'Deliver 8 SCU Titanium', detail: 'Mission M-01 · verify the contract terminal.' },
    { id: 'step-07', kind: 'delivery', location: 'Lorville', nextLocation: 'Lorville', lotId: 'lot-03', title: 'Deliver 4 SCU Titanium', detail: 'Mission M-03 · final Caterpillar lot.' },
    { id: 'step-08', kind: 'complete', location: 'Lorville', nextLocation: 'Lorville', title: 'Route complete', detail: 'Review the manifest and close the tracked route.' }
  ],

  haulingRoutes: [
    { id: 'trade-01', commodity: 'Gold', buy: 'Shubin Mining Facility SM0-18', sell: 'New Babbage', buyPrice: 7236, sellPrice: 7814, profitScu: 578, totalProfit: 80828, hourly: 192000, cost: 1013040, buyStock: 228, sellCapacity: 510, travel: '18 min', freshness: '18 min ago', warning: 'Surface weather may slow loading.' },
    { id: 'trade-02', commodity: 'Laranite', buy: 'HDMS-Lathan', sell: 'Lorville', buyPrice: 2941, sellPrice: 3488, profitScu: 547, totalProfit: 76580, hourly: 211000, cost: 411740, buyStock: 184, sellCapacity: 390, travel: '14 min', freshness: '31 min ago', warning: 'Terminal stock report is community-submitted.' },
    { id: 'trade-03', commodity: 'Medical Supplies', buy: 'Port Tressler', sell: 'Area18', buyPrice: 1900, sellPrice: 2375, profitScu: 475, totalProfit: 66500, hourly: 166000, cost: 266000, buyStock: 810, sellCapacity: 620, travel: '21 min', freshness: '42 min ago', warning: 'High traffic at both terminals.' }
  ],

  issues: [
    { title: 'Freight elevator queue delay', location: 'Lorville', severity: 'Moderate', updated: 'Community profile · 2h', detail: 'Elevator assignment may take longer during peak server load.' },
    { title: 'Commodity terminal refresh lag', location: 'HDMS-Lathan', severity: 'Low', updated: 'Community profile · 5h', detail: 'Displayed inventory may trail recent purchases.' },
    { title: 'Approach marker intermittently absent', location: 'ArcCorp Mining Area 056', severity: 'Moderate', updated: 'Community profile · 1d', detail: 'Use OM-3 before descending toward the outpost.' }
  ],

  reports: [
    { location: 'HDMS-Bezdek', message: 'Cargo elevators responding normally.', age: '24 min', tone: 'good' },
    { location: 'Lorville', message: 'Teasa hangar traffic is elevated.', age: '41 min', tone: 'warn' },
    { location: 'Brio’s Breaker Yard', message: 'Hostile activity reported near terminal.', age: '1 hr', tone: 'danger' }
  ]
});
