'use strict';

(function exposeRoadmap(root) {
  const phases = Object.freeze([
    {
      id: 'foundation', order: '01', title: 'Foundation', status: 'done',
      summary: 'A small, testable and dependency-free technical base with the complete product architecture reserved.',
      items: [
        { id: 'clean-rebuild', label: 'Complete clean rebuild', status: 'done' },
        { id: 'section-navigation', label: 'Separate low-clutter application sections', status: 'done' },
        { id: 'product-shell', label: 'Grouped desktop and mobile page navigation', status: 'done' },
        { id: 'page-blueprints', label: 'Visual blueprints for every planned product page', status: 'done' },
        { id: 'release-history', label: 'In-app changelog sourced from CHANGELOG.md', status: 'done' },
        { id: 'ux-refresh', label: 'Session-aware status, focus states and action feedback', status: 'done' },
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
        { id: 'confidence', label: 'Input validation, warnings and correction', status: 'next' },
        { id: 'objective-types', label: 'Non-cargo mission objective editor', status: 'future' }
      ]
    },
    {
      id: 'routing', order: '03', title: 'Routing', status: 'active',
      summary: 'Turn objectives into a dependency-safe sequence of operational stops.',
      items: [
        { id: 'precedence', label: 'Pickup and collect before delivery', status: 'done' },
        { id: 'stop-grouping', label: 'Group compatible operations by stop', status: 'done' },
        { id: 'route-corrections', label: 'Dependency-safe skip, reopen and reorder controls', status: 'done' },
        { id: 'stable-progress', label: 'Stable completed-stop identities across route changes', status: 'done' },
        { id: 'arrival-overhead', label: 'Indicative landing-zone, station and outpost overhead', status: 'done' },
        { id: 'fastest-route', label: 'Fastest practical route profile', status: 'done' },
        { id: 'fewest-jumps', label: 'Fewest quantum-legs route profile', status: 'done' },
        { id: 'traceable-estimates', label: 'Per-leg travel, arrival and handling breakdown', status: 'done' },
        { id: 'risk-route', label: 'Lower estimated-risk profile with sourced confidence', status: 'next' },
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
        { id: 'previous', label: 'Reversible PREVIOUS control', status: 'done' },
        { id: 'cargo-state', label: 'Loaded and delivered cargo state per stop', status: 'done' },
        { id: 'load-operations', label: 'Live load and unload operation page', status: 'done' },
        { id: 'corrections', label: 'Manual SCU, cargo status and lost-cargo corrections', status: 'done' },
        { id: 'route-recovery', label: 'Skipped-stop recovery without losing cargo state', status: 'done' },
        { id: 'session-history', label: 'Real-session history', status: 'future' }
      ]
    },
    {
      id: 'cargo-planning', order: '05', title: 'Cargo Planning', status: 'active',
      summary: 'Plan independent cargo zones, mission sectors and vertical SCU layers.',
      items: [
        { id: 'vertical-zones', label: 'Separable cargo zones with vertical layers', status: 'done' },
        { id: 'mission-sectors', label: 'Separate sectors by mission and delivery', status: 'done' },
        { id: 'delivery-access', label: 'Earlier deliveries placed closer to access', status: 'done' },
        { id: 'stable-slots', label: 'Stable planned slots while cargo loads and unloads', status: 'done' },
        { id: 'corrected-quantities', label: 'Corrected quantities reflected in cargo cells', status: 'done' },
        { id: 'risk-handling', label: 'Rapid-access weighting for dangerous pickups', status: 'active' },
        { id: 'zone-editor', label: 'Per-ship zone and separator editor', status: 'next' },
        { id: 'physical-layouts', label: 'Verified physical cargo geometry per ship', status: 'next' },
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
        { id: 'route-performance', label: 'Use quantum-time factor in route comparison', status: 'done' },
        { id: 'component-loadout', label: 'Structured component and weapon loadout', status: 'next' },
        { id: 'full-catalog', label: 'Maintainable full ship catalog', status: 'future' },
        { id: 'performance-integration', label: 'Use more modifications in route time and fuel estimates', status: 'future' }
      ]
    },
    {
      id: 'map', order: '07', title: '3D Starmap', status: 'active',
      summary: 'Explore playable systems, system bodies and mission routes without turning the app into a crowded dashboard.',
      items: [
        { id: 'system-network', label: 'Interactive Stanton, Pyro and Nyx network', status: 'done' },
        { id: 'system-detail', label: 'Schematic orbit views for each system', status: 'done' },
        { id: 'map-controls', label: 'Rotate, zoom, inspect and system focus controls', status: 'done' },
        { id: 'route-overlay', label: 'Active mission stops overlaid on supported locations', status: 'done' },
        { id: 'planner-positions', label: 'Schematic positions reused by route estimates', status: 'done' },
        { id: 'location-database', label: 'Complete bodies, stations, outposts and jump points', status: 'active' },
        { id: 'map-data-sources', label: 'Per-object source and review metadata', status: 'next' },
        { id: 'verified-geometry', label: 'Use verified geometry where reliable data exists', status: 'future' }
      ]
    },
    {
      id: 'location-intel', order: '08', title: 'Location Intel', status: 'active',
      summary: 'Services, access, trade, traffic and indicative local overhead.',
      items: [
        { id: 'location-intel-section', label: 'Separate low-clutter location section', status: 'done' },
        { id: 'service-profiles', label: 'Hangars, services, trade and traffic profiles', status: 'active' },
        { id: 'entity-tree', label: 'System, body, city, spaceport and outpost tree', status: 'future' },
        { id: 'illegal-trade', label: 'Verified legal and illegal trading capability', status: 'future' },
        { id: 'traffic-reports', label: 'Optional community traffic and danger reports', status: 'future' }
      ]
    },
    {
      id: 'trading', order: '09', title: 'Trading', status: 'future',
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
      id: 'companion', order: '10', title: 'Companion', status: 'active',
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
    },
    {
      id: 'automation', order: '11', title: 'Automated Intake', status: 'future',
      summary: 'Optional automation after the manual mission workflow and route engine are mature.',
      items: [
        { id: 'ocr', label: 'Local multi-screenshot OCR', status: 'future' },
        { id: 'game-log', label: 'Local Game.log companion', status: 'future' },
        { id: 'import-confidence', label: 'Imported-data confidence and correction', status: 'future' },
        { id: 'patch-adapters', label: 'Patch-specific parser adapters and regression fixtures', status: 'future' }
      ]
    }
  ]);

  const api = Object.freeze({ phases });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SCCompanionRoadmap = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
