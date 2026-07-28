'use strict';

function appendStyle(path, marker) {
  if (document.querySelector(`[${marker}]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL(`./${path}?v=0.40.0`, document.baseURI).href;
  link.setAttribute(marker, '0.40.0');
  document.head.append(link);
}

appendStyle('operations-rebuild-v040.css', 'data-operations-v040-style');
appendStyle('operations-rebuild-v040-compat.css', 'data-operations-v040-compat-style');

await import('./operations-rebuild-v040.js?v=0.40.0');
await import('./operations-v040-manual-grid-bridge.js?v=0.40.0');
