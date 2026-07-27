'use strict';

(function loadCargoGridFitStyles() {
  if (document.querySelector('[data-cargo-grid-fit-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./cargo-manual-grid-fit-v030.css?v=0.30.0', document.baseURI).href;
  link.dataset.cargoGridFitStyle = '0.30.0';
  document.head.append(link);
}());
