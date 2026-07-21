'use strict';

(function exposeRoadmap(root) {
  const phases = Object.freeze([
    {
      id: 'foundation', order: '01', title: 'Foundation', status: 'active',
      summary: 'A small, testable and dependency-free technical base.',
      items: [
        { id: 'clean-rebuild', label: 'Complete clean rebuild', status: 'done' },
        { id: 'location-model', label: 'Operational locations and mobiGlas targets', status: 'done' },
        { id: 'mission-model', label: 'Separate missions, contracts and cargo lots', status: 'done' },
        { id: 'section-navigation', label: 'Separate low-clutter application sections', status: 'done' },
        { id: 'local-state', label: 'Local persistence and session recovery', status: 'next' }
      ]
    },
    {
      id: 'mission-intake', order: '02', title: 'Mission Intake', status: 'next',
      summary: 'Add missions without copying every detail by hand.',
      items: [
        { id: 'manual-editor', label: 'Fast manual mission editor', status: 'next' },
        { id: 'text-import', label: 'Readable text import', status: 'future' },
        { id: 'ocr', label: 'Local multi-screenshot OCR', status: 'future' },
        { id: 'game-log', label: 'Local Game.log companion', status: 'future' },
        { id: 'confidence', label: 'Imported-data confidence and correction', status: 'future' }
      ]
    },
    {
      id: 'routing', order: '03', title: 'Routing', status: 'active',
      summary: 'Turn objectives and cargo into a practical in-game route.',
      items: [
        { id: 'precedence', label: 'Pickup and collect before delivery', status: 'next' },
        { id: 'stop-grouping', label: 'Operational grouping by stop', status: 'next' },
        { id: 'arrival-overhead', label: 'Indicative descent, ATC and animation overhead', status: 'active' },
        { id: 'fastest-route', label: 'Fastest-route profile', status: 'future' },
        { id: 'fewest-jumps', label: 'Fewest-jumps profile', status: 'future' },
        { id: 'risk-route', label: 'Lower estimated-risk profile', status: 'future' },
        { id: 'fuel-estimates', label: 'Traceable fuel estimates', status: 'future' }
      ]
    },
    {
      id: 'guided-route', order: '04', title: 'Guided Route', status: 'future',
      summary: 'One clear stop at a time on a second monitor.',
      items: [
        { id: 'next-stop', label: 'Next stop and in-game destination', status: 'future' },
        { id: 'actions', label: 'Visible pickup, collect and delivery actions', status: 'future' },
        { id: 'cargo-state', label: 'On-board cargo and remaining capacity', status: 'future' },
        { id: 'previous-next', label: 'PREVIOUS and COMPLETE — NEXT', status: 'future' },
        { id: 'corrections', label: 'Manual corrections and recovery', status: 'future' },
        { id: 'session-history', label: 'Real-session history', status: 'future' }
      ]
    },
    {
      id: 'map', order: '05', title: 'Locations & Map', status: 'active',
      summary: 'Real hierarchy, operational profiles and route visualization.',
      items: [
        { id: 'location-intel', label: 'Separate location intel section', status: 'done' },
        { id: 'service-profiles', label: 'Hangars, services, trade and traffic profiles', status: 'active' },
        { id: 'location-database', label: 'Stanton, Pyro and Nyx database', status: 'future' },
        { id: 'entity-tree', label: 'System, body, city, spaceport and outpost tree', status: 'future' },
        { id: 'map-controls', label: 'Pan, zoom and level-of-detail controls', status: 'future' },
        { id: 'route-overlay', label: 'Route and stops on the map', status: 'future' }
      ]
    },
    {
      id: 'trading', order: '06', title: 'Trading', status: 'future',
      summary: 'Classic commodity runs and opportunities along an existing route.',
      items: [
        { id: 'market-source', label: 'Timestamped and sourced market data', status: 'future' },
        { id: 'classic-trades', label: 'Classic A → B commodity routes', status: 'future' },
        { id: 'en-route-trades', label: 'Opportunities between planned stops', status: 'future' },
        { id: 'capacity-budget', label: 'Cargo capacity and budget constraints', status: 'future' },
        { id: 'partial-trades', label: 'Partial purchases and sales', status: 'future' },
        { id: 'ledger', label: 'Profit, ROI, fees, losses and history', status: 'future' }
      ]
    },
    {
      id: 'companion', order: '07', title: 'Companion', status: 'active',
      summary: 'A compact second-screen controller linked to the desktop session.',
      items: [
        { id: 'drake-ui', label: 'Drake UI for Cutlass and Corsair', status: 'active' },
        { id: 'companion-section', label: 'Dedicated compact Companion section', status: 'done' },
        { id: 'pairing-protocol', label: 'Temporary session and short-code pairing protocol', status: 'next' },
        { id: 'secure-transport', label: 'Secure cross-device synchronization transport', status: 'future' },
        { id: 'mobile-progress', label: 'Phone COMPLETE — NEXT controller', status: 'future' },
        { id: 'focus-mode', label: 'Focus and second-monitor mode', status: 'future' },
        { id: 'manufacturer-ui', label: 'MFD interfaces for other manufacturers', status: 'future' }
      ]
    }
  ]);

  const api = Object.freeze({ phases });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SCCompanionRoadmap = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
