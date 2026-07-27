/* Tesseract.js 7 browser ESM compatibility adapter.
   The CDN Rollup bundle may expose its API as the module default export rather
   than as named exports. OCR intake imports the historical named-export URL;
   an import map installed by app.js redirects that request through this file. */

const UPSTREAM_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.esm.min.js?sc-companion-upstream=0.29.3';
const namespace = await import(UPSTREAM_URL);
const defaultApi = namespace?.default;
const createWorkerImplementation = namespace?.createWorker
  ?? defaultApi?.createWorker
  ?? (typeof defaultApi === 'function' ? defaultApi : null);

if (typeof createWorkerImplementation !== 'function') {
  const exportsFound = [...Object.keys(namespace ?? {}), ...Object.keys(defaultApi ?? {})];
  throw new TypeError(`Tesseract.js createWorker export is unavailable. Exports found: ${[...new Set(exportsFound)].join(', ') || 'none'}`);
}

export const PSM = namespace?.PSM ?? defaultApi?.PSM ?? Object.freeze({ SPARSE_TEXT: '11' });
export const OEM = namespace?.OEM ?? defaultApi?.OEM ?? Object.freeze({ LSTM_ONLY: 1 });

export function createWorker(...args) {
  return createWorkerImplementation(...args);
}
