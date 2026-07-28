'use strict';

(function loadBalancedOperationsCockpit() {
  if (document.querySelector('[data-operations-balanced-cockpit-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./operations-balanced-cockpit-v0304.css?v=0.30.4', document.baseURI).href;
  link.dataset.operationsBalancedCockpitStyle = '0.30.4';
  document.head.append(link);
}());
