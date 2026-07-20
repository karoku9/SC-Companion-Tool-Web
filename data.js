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
    { id: 'titanium', name: 'Titanium', category: 'Metal', legality: 'legal', valueTier: 'common', handlingNote: 'Stable industrial freight.', warning: '', displayUnit: 'SCU' },
    { id: 'agricium', name: 'Agricium', category: 'Mineral', legality: 'legal', valueTier: 'high', handlingNote: 'High-value mineral; verify demand before departure.', warning: 'Capital exposure is elevated.', displayUnit: 'SCU' },
    { id: 'medical', name: 'Medical Supplies', category: 'Medical', legality: 'legal', valueTier: 'medium', handlingNote: 'Priority handling recommended.', warning: 'Demand may change quickly.', displayUnit: 'SCU' },
    { id: 'gold', name: 'Gold', category: 'Mineral', legality: 'legal', valueTier: 'high', handlingNote: 'High-value dense cargo.', warning: 'Large investment per SCU.', displayUnit: 'SCU' },
    { id: 'laranite', name: 'Laranite', category: 'Mineral', legality: 'legal', valueTier: 'high', handlingNote: 'Protect high-value holds.', warning: 'Availability is often limited.', displayUnit: 'SCU' },
    { id: 'distilled', name: 'Distilled Spirits', category: 'Processed goods', legality: 'legal', valueTier: 'common', handlingNote: 'General consumer freight.', warning: '', displayUnit: 'SCU' },
    { id: 'processed-food', name: 'Processed Food', category: 'Agricultural goods', legality: 'legal', valueTier: 'common', handlingNote: 'Low-risk bulk freight.', warning: '', displayUnit: 'SCU' },
    { id: 'agri-supplies', name: 'Agricultural Supplies', category: 'Agricultural goods', legality: 'legal', valueTier: 'common', handlingNote: 'Useful for surface outposts.', warning: '', displayUnit: 'SCU' },
    { id: 'scrap', name: 'Scrap', category: 'Processed goods', legality: 'restricted', valueTier: 'common', handlingNote: 'Check local terminal restrictions.', warning: 'Restricted at some jurisdictions.', displayUnit: 'SCU' },
    { id: 'weevil', name: 'Gasping Weevil Eggs', category: 'Contraband', legality: 'illegal', valueTier: 'high', handlingNote: 'Illegal and high risk.', warning: 'May expose the crew and vessel to enforcement action.', displayUnit: 'SCU' },
    { id: 'widow', name: 'Widow', category: 'Contraband', legality: 'illegal', valueTier: 'high', handlingNote: 'Illegal narcotic cargo.', warning: 'Do not expose unless illegal commodities are enabled.', displayUnit: 'SCU' }
  ],

  marketRecords: [
    { id: 'market-titanium-bezdek-buy', commodityId: 'titanium', locationId: 'bezdek', terminalName: 'HDMS-Bezdek Trade Terminal', transactionType: 'buy', pricePerSCU: 810, inventorySCU: 620, demandSCU: null, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 35 min', reliability: 'high', note: 'Large local reference availability.' },
    { id: 'market-titanium-lathan-buy', commodityId: 'titanium', locationId: 'lathan', terminalName: 'HDMS-Lathan Trade Terminal', transactionType: 'buy', pricePerSCU: 790, inventorySCU: 260, demandSCU: null, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 2 hr', reliability: 'medium', note: 'Availability can be uneven.' },
    { id: 'market-titanium-lorville-sell', commodityId: 'titanium', locationId: 'lorville', terminalName: 'TDD Lorville', transactionType: 'sell', pricePerSCU: 1090, inventorySCU: null, demandSCU: 540, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 50 min', reliability: 'high', note: 'City demand reference.' },
    { id: 'market-titanium-area18-sell', commodityId: 'titanium', locationId: 'area18', terminalName: 'TDD Area18', transactionType: 'sell', pricePerSCU: 1135, inventorySCU: null, demandSCU: 190, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 3 hr', reliability: 'medium', note: 'Demand-limited route example.' },
    { id: 'market-agricium-arc056-buy', commodityId: 'agricium', locationId: 'arc056', terminalName: 'Mining Area 056 Terminal', transactionType: 'buy', pricePerSCU: 2620, inventorySCU: 150, demandSCU: null, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 1 hr', reliability: 'medium', note: 'Surface inventory reference.' },
    { id: 'market-agricium-area18-sell', commodityId: 'agricium', locationId: 'area18', terminalName: 'TDD Area18', transactionType: 'sell', pricePerSCU: 3275, inventorySCU: null, demandSCU: 96, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 25 min', reliability: 'high', note: 'Demand caps large ships.' },
    { id: 'market-medical-everus-buy', commodityId: 'medical', locationId: 'everus', terminalName: 'Everus Admin', transactionType: 'buy', pricePerSCU: 1710, inventorySCU: 420, demandSCU: null, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 20 min', reliability: 'high', note: 'Useful multi-stop starting record.' },
    { id: 'market-medical-tressler-buy', commodityId: 'medical', locationId: 'tressler', terminalName: 'Port Tressler Admin', transactionType: 'buy', pricePerSCU: 1680, inventorySCU: 810, demandSCU: null, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 45 min', reliability: 'high', note: 'High reference availability.' },
    { id: 'market-medical-area18-sell', commodityId: 'medical', locationId: 'area18', terminalName: 'TDD Area18', transactionType: 'sell', pricePerSCU: 2320, inventorySCU: null, demandSCU: 620, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 42 min', reliability: 'high', note: 'High-traffic destination.' },
    { id: 'market-medical-lorville-sell', commodityId: 'medical', locationId: 'lorville', terminalName: 'TDD Lorville', transactionType: 'sell', pricePerSCU: 2180, inventorySCU: null, demandSCU: 220, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 90 min', reliability: 'medium', note: 'Moderate demand reference.' },
    { id: 'market-gold-lathan-buy', commodityId: 'gold', locationId: 'lathan', terminalName: 'HDMS-Lathan Trade Terminal', transactionType: 'buy', pricePerSCU: 7236, inventorySCU: 228, demandSCU: null, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 18 min', reliability: 'medium', note: 'High investment route.' },
    { id: 'market-gold-newbabbage-sell', commodityId: 'gold', locationId: 'newbabbage', terminalName: 'New Babbage TDD', transactionType: 'sell', pricePerSCU: 7814, inventorySCU: null, demandSCU: 510, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 35 min', reliability: 'high', note: 'Weather may extend approach time.' },
    { id: 'market-laranite-lathan-buy', commodityId: 'laranite', locationId: 'lathan', terminalName: 'HDMS-Lathan Trade Terminal', transactionType: 'buy', pricePerSCU: 2941, inventorySCU: 184, demandSCU: null, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 31 min', reliability: 'medium', note: 'Limited high-value stock.' },
    { id: 'market-laranite-lorville-sell', commodityId: 'laranite', locationId: 'lorville', terminalName: 'TDD Lorville', transactionType: 'sell', pricePerSCU: 3488, inventorySCU: null, demandSCU: 390, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 1 hr', reliability: 'high', note: 'Reference demand only.' },
    { id: 'market-distilled-orison-buy', commodityId: 'distilled', locationId: 'orison', terminalName: 'Orison Municipal Services', transactionType: 'buy', pricePerSCU: 520, inventorySCU: 330, demandSCU: null, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 4 hr', reliability: 'medium', note: 'Atmospheric exit increases duration.' },
    { id: 'market-distilled-area18-sell', commodityId: 'distilled', locationId: 'area18', terminalName: 'Area18 Trade Terminal', transactionType: 'sell', pricePerSCU: 760, inventorySCU: null, demandSCU: 280, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 2 hr', reliability: 'medium', note: 'Consumer demand reference.' },
    { id: 'market-food-area18-buy', commodityId: 'processed-food', locationId: 'area18', terminalName: 'Area18 Municipal Supply', transactionType: 'buy', pricePerSCU: 340, inventorySCU: 500, demandSCU: null, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 1 hr', reliability: 'high', note: 'Second leg for the sample multi-stop chain.' },
    { id: 'market-food-lorville-sell', commodityId: 'processed-food', locationId: 'lorville', terminalName: 'Lorville Municipal Supply', transactionType: 'sell', pricePerSCU: 505, inventorySCU: null, demandSCU: 420, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 80 min', reliability: 'high', note: 'Stable bulk reference demand.' },
    { id: 'market-agri-lorville-buy', commodityId: 'agri-supplies', locationId: 'lorville', terminalName: 'Lorville Admin', transactionType: 'buy', pricePerSCU: 405, inventorySCU: 480, demandSCU: null, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 2 hr', reliability: 'high', note: 'Bulk surface supply.' },
    { id: 'market-agri-arc056-sell', commodityId: 'agri-supplies', locationId: 'arc056', terminalName: 'Mining Area 056 Terminal', transactionType: 'sell', pricePerSCU: 620, inventorySCU: null, demandSCU: 210, legality: 'legal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 5 hr', reliability: 'medium', note: 'Outpost demand may be intermittent.' },
    { id: 'market-scrap-brios-buy', commodityId: 'scrap', locationId: 'brios', terminalName: 'Brio’s Salvage Terminal', transactionType: 'buy', pricePerSCU: 300, inventorySCU: 310, demandSCU: null, legality: 'restricted', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 7 hr', reliability: 'low', note: 'Unregulated location and low-confidence inventory.' },
    { id: 'market-scrap-orison-sell', commodityId: 'scrap', locationId: 'orison', terminalName: 'Orison Reclamation', transactionType: 'sell', pricePerSCU: 590, inventorySCU: null, demandSCU: 150, legality: 'restricted', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 6 hr', reliability: 'medium', note: 'Restricted handling reference.' },
    { id: 'market-weevil-brios-buy', commodityId: 'weevil', locationId: 'brios', terminalName: 'Brio’s Exchange', transactionType: 'buy', pricePerSCU: 12500, inventorySCU: 30, demandSCU: null, legality: 'illegal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 12 hr', reliability: 'low', note: 'Illegal demo record; not live intelligence.' },
    { id: 'market-weevil-pyro-sell', commodityId: 'weevil', locationId: 'pyro-gateway', terminalName: 'Gateway Shadow Broker', transactionType: 'sell', pricePerSCU: 16800, inventorySCU: null, demandSCU: 18, legality: 'illegal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 15 hr', reliability: 'low', note: 'Illegal low-confidence demo demand.' },
    { id: 'market-widow-brios-buy', commodityId: 'widow', locationId: 'brios', terminalName: 'Brio’s Exchange', transactionType: 'buy', pricePerSCU: 8600, inventorySCU: 44, demandSCU: null, legality: 'illegal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 10 hr', reliability: 'low', note: 'Illegal reference record.' },
    { id: 'market-widow-pyro-sell', commodityId: 'widow', locationId: 'pyro-gateway', terminalName: 'Gateway Shadow Broker', transactionType: 'sell', pricePerSCU: 11200, inventorySCU: null, demandSCU: 24, legality: 'illegal', dataTimestamp: 'Seed 3.23', referenceAge: 'reference · 11 hr', reliability: 'low', note: 'Illegal low-confidence demo demand.' }
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
