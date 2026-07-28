'use strict';

if (!document.querySelector('[data-operations-v040-style]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./operations-rebuild-v040.css?v=0.40.0', document.baseURI).href;
  link.dataset.operationsV040Style = '0.40.0';
  document.head.append(link);
}

await import('./operations-rebuild-v040.js?v=0.40.0');
await import('./operations-v040-manual-grid-bridge.js?v=0.40.0');
