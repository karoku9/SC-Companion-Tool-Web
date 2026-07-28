'use strict';

(function loadReadableScrollingOperations() {
  if (document.querySelector('[data-operations-readable-scroll-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./operations-readable-scroll-v0301.css?v=0.30.1', document.baseURI).href;
  link.dataset.operationsReadableScrollStyle = '0.30.1';
  document.head.append(link);
}());
