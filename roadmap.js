'use strict';

(function exposeRoadmap(root) {
  const phases = Object.freeze([
    {
      id: 'foundation',
      order: '01',
      title: 'Fondamenta',
      summary: 'Base tecnica piccola, testabile e senza dipendenze.',
      status: 'active',
      items: [
        { id: 'clean-rebuild', label: 'Ripartenza completa da zero', status: 'done' },
        { id: 'location-model', label: 'Località operative e destinazione mobiGlas', status: 'done' },
        { id: 'mission-model', label: 'Missioni, contratti e cargo lot separati', status: 'done' },
        { id: 'local-state', label: 'Persistenza locale e recupero sessione', status: 'next' }
      ]
    },
    {
      id: 'mission-intake',
      order: '02',
      title: 'Mission Intake',
      summary: 'Inserire le missioni senza ricopiare tutto a mano.',
      status: 'next',
      items: [
        { id: 'manual-editor', label: 'Editor manuale rapido', status: 'next' },
        { id: 'text-import', label: 'Importazione testo leggibile', status: 'future' },
        { id: 'ocr', label: 'OCR locale di screenshot multipli', status: 'future' },
        { id: 'game-log', label: 'Companion locale per Game.log', status: 'future' },
        { id: 'confidence', label: 'Correzione e affidabilità dei dati importati', status: 'future' }
      ]
    },
    {
      id: 'routing',
      order: '03',
      title: 'Routing',
      summary: 'Trasformare obiettivi e carichi in una rotta utile in gioco.',
      status: 'future',
      items: [
        { id: 'precedence', label: 'Pickup e collect prima del delivery', status: 'next' },
        { id: 'stop-grouping', label: 'Raggruppamento operativo per fermata', status: 'next' },
        { id: 'fastest-route', label: 'Profilo meno tempo', status: 'future' },
        { id: 'fewest-jumps', label: 'Profilo meno salti', status: 'future' },
        { id: 'risk-route', label: 'Profilo rischio stimato ridotto', status: 'future' },
        { id: 'route-estimates', label: 'Stime di tempo e carburante', status: 'future' }
      ]
    },
    {
      id: 'guided-route',
      order: '04',
      title: 'Guided Route',
      summary: 'Una sola fermata alla volta, chiara sul secondo monitor.',
      status: 'future',
      items: [
        { id: 'next-stop', label: 'Prossima fermata e destinazione in game', status: 'future' },
        { id: 'actions', label: 'Pickup, collect e delivery visibili', status: 'future' },
        { id: 'cargo-state', label: 'Carico a bordo e capacità residua', status: 'future' },
        { id: 'previous-next', label: 'PREVIOUS e FATTO — PROSSIMO', status: 'future' },
        { id: 'corrections', label: 'Correzioni manuali e ripristino', status: 'future' },
        { id: 'session-history', label: 'Storico delle sessioni reali', status: 'future' }
      ]
    },
    {
      id: 'map',
      order: '05',
      title: 'Mappa',
      summary: 'Gerarchia reale e visualizzazione della rotta.',
      status: 'future',
      items: [
        { id: 'location-database', label: 'Database Stanton, Pyro e Nyx', status: 'future' },
        { id: 'entity-tree', label: 'Sistema, corpo, città, spazioporto e outpost', status: 'future' },
        { id: 'map-controls', label: 'Pan, zoom e livelli di dettaglio', status: 'future' },
        { id: 'route-overlay', label: 'Rotta e fermate sulla mappa', status: 'future' },
        { id: 'services', label: 'Servizi, gateway e profilo di rischio', status: 'future' }
      ]
    },
    {
      id: 'trading',
      order: '06',
      title: 'Trading',
      summary: 'Commodity classiche e occasioni lungo una rotta già pianificata.',
      status: 'future',
      items: [
        { id: 'market-source', label: 'Fonte prezzi con provenienza e data', status: 'future' },
        { id: 'classic-trades', label: 'Rotte commodity A → B', status: 'future' },
        { id: 'en-route-trades', label: 'Occasioni tra fermate già previste', status: 'future' },
        { id: 'capacity-budget', label: 'Vincoli di spazio e capitale', status: 'future' },
        { id: 'partial-trades', label: 'Acquisti e vendite parziali', status: 'future' },
        { id: 'ledger', label: 'Profitto, ROI, fee, perdite e storico', status: 'future' }
      ]
    },
    {
      id: 'companion',
      order: '07',
      title: 'Companion',
      summary: 'Esperienza integrata attorno alla nave e alla sessione.',
      status: 'future',
      items: [
        { id: 'drake-ui', label: 'UI Drake per Cutlass e Corsair', status: 'active' },
        { id: 'manufacturer-ui', label: 'UI MFD per altri produttori', status: 'future' },
        { id: 'focus-mode', label: 'Modalità focus e secondo monitor', status: 'future' },
        { id: 'touch-mode', label: 'Modalità touch e mobile', status: 'future' },
        { id: 'shared-session', label: 'Sessioni condivise opzionali', status: 'future' }
      ]
    }
  ]);

  const api = Object.freeze({ phases });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SCCompanionRoadmap = api;
}(typeof globalThis !== 'undefined' ? globalThis : window));
