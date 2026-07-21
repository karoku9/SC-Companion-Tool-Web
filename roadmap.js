'use strict';

(function exposeRoadmap(root) {
  const phases = Object.freeze([
    {
      id: 'foundation', order: '01', title: 'Foundation', status: 'done',
      summary: 'A small, testable and dependency-free technical base.',
      items: [
        { id: 'clean-rebuild', label: 'Complete clean rebuild', status: 'done' },
        { id: 'section-navigation', label: 'Separate low-clutter application sections', status: 'done' },
        { id: 'local-state', label: 'Local persistence and session recovery', status: 'done' },
        { id: 'location-model', label: 'Operational locations and mobiGlas targets', status: 'done' },
        { id: 'mission-model', label: 'Separate missions, contracts and cargo lots', status: 'done' }
      ]
    },
    {
      id: 'mission-intake', order: '02', title: 'Mission Intake', status: 'active',
      summary: 'Turn compact mission text into structured contracts and cargo lots.',
      items: [
        { id: 'manual-editor', label: 'Fast mission text editor', status: 'done' },
        { id: 'text-import', label: 'Readable collect and delivery parser', status: 'done' },
        { id: 'cargo-provenance', label: 'Mission, origin and destination provenance', status: 'done' },
        { id: 'confidence', label: 'Imported-data confidence and correction', status: 'next' },
        { id: 'ocr', label: 'Local multi-screenshot OCR', status: 'future' },
        { id: 'game-log', label: 'Local Game.log companion', status: 'future' }
      ]
    },
    {
      id: 'routing', order: '03', title: 'Routing', status: 'active',
      summary: 'Turn objectives into a dependency-safe sequence of operational stops.',
      items: [
        { id: 'precedence', label: 'Pickup and collect before delivery', status: 'done' },
        { id: 'stop-grouping', label: 'Group compatible operations by stop', status: 'done' },
        { id: 'arrival-overhead', label: 'Indicative descent, ATC and animation overhead', status: 'active' },
        { id: 'fastest-route', label: 'Fastest-route optimizer', status: 'next' },
        { id: 'fewest-jumps', label: 'Fewest-jumps profile', status: 'future' },
        { id: 'risk-route', label: 'Lower estimated-risk profile', status: 'future' },
        { id: 'fuel-estimates', label: 'Traceable fuel estimates', status: 'future' }
      ]
    },
    {
      id: 'guided-route', order: '04', title: 'Guided Route', status: 'active',
      summary: 'One clear stop at a time on a second monitor.',
      items: [
        { id: 'next-stop', label: 'Current stop and ordered stop list', status: 'done' },
        { id: 'actions', label: 'Mission-labelled pickup, collect and delivery actions', status: 'done' },
        { id: 'delivery-origin', label: 'Delivery instructions include pickup origin', status: 'done' },
        { id: 'complete-next', label: 'COMPLETE STOP — NEXT progress', status: 'done' },
        { id: 'previous', label: 'Reversible PREVIOUS control', status: 'next' },
        { id: 'corrections', label: 'Manual cargo and route corrections', status: 'future' },
        { id: 'session-history', label: 'Real-session history', status: 'future' }
      ]
    },
    {
      id: 'cargo-planning', order: '05', title: 'Cargo Planning', status: 'active',
      summary: 'Plan mission sectors on an accessible top-down 1-SCU grid.',
      items: [
        { id: 'abstract-grid', label: 'Top-down 1-SCU planning grid', status: 'done' },
        { id: 'mission-sectors', label: 'Separate sectors by mission and delivery', status: 'done' },
        { id: 'delivery-access', label: 'Earlier deliveries placed closer to access', status: 'done' },
        { id: 'risk-handling', label: 'Rapid-access weighting for dangerous pickups', status: 'active' },
        { id: 'physical-layouts', label: 'Verified physical cargo-grid geometry per ship', status: 'next' },
        { id: 'repacking', label: 'Dynamic loading and repacking simulation', status: 'future' }
      ]
    },
    {
      id: 'hangar', order: '06', title: 'Fleet & Hangar', status: 'active',
      summary: 'Store the ships actually flown and the modifications applied to them.',
      items: [
        { id: 'starter-catalog', label: 'Corsair and Cutlass Black starter profiles', status: 'done' },
        { id: 'ship-instances', label: 'Persistent ship instances and nicknames', status: 'done' },
        { id: 'quantum-modifier', label: 'Quantum-drive time factor', status: 'done' },
        { id: 'component-loadout', label: 'Structured component and weapon loadout', status: 'next' },
        { id: 'full-catalog', label: 'Maintainable full ship catalog', status: 'future' },
        { id: 'performance-integration', label: 'Use modifications in route time and fuel estimates', status: 'future' }
      ]
    },
    {
      id: 'map', order: '07', title: 'Locations & Map', status: 'active',
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
      id: 'trading', order: '08', title: 'Trading', status: 'future',
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
      id: 'companion', order: '09', title: 'Companion', status: 'active',
      summary: 'A compact second-screen controller linked to the desktop session.',
      items: [
        { id: 'drake-ui', label: 'Drake UI for Cutlass and Corsair', status: 'active' },
        { id: 'companion-section', label: 'Dedicated compact Companion section', status: 'done' },
        { id: 'local-preview', label: 'Active route mirrored in phone preview', status: 'done' },
        { id: 'pairing-protocol', label: 'Temporary session and short-code pairing protocol', status: 'next' },
        { id: 'secure-transport', label: 'Secure cross-device synchronization transport', status: 'future' },
        { id: 'mobile-progress', label: 'Phone COMPLETE — NEXT controller', status: 'future' },
        { id: 'focus-mode', label: 'Focus and second-monitor mode', status: 'future' }
      ]
    }
  ]);

  const api = Object.freeze({ phases });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SCCompanionRoadmap = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
