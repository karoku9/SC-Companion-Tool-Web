'use strict';

(function installAdaptiveOperationsFit(root) {
  const STYLE_VERSION = '0.30.3';

  function installStyle() {
    if (document.querySelector('[data-operations-adaptive-fit-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL(`./operations-adaptive-fit-v0303.css?v=${STYLE_VERSION}`, document.baseURI).href;
    link.dataset.operationsAdaptiveFitStyle = STYLE_VERSION;
    document.head.append(link);
  }

  function resolveDensity() {
    const width = root.innerWidth;
    const height = root.innerHeight;
    if (width < 1280 || height < 680) return 'flow';
    if (width < 1450 || height < 760) return 'tight';
    if (height < 860) return 'compact';
    return 'comfortable';
  }

  function applyDensity() {
    const page = document.querySelector('.operations-page.operations-v028.operations-cargo-primary-v0302');
    if (!page) return false;
    const density = resolveDensity();
    page.dataset.opsDensity = density;
    document.documentElement.dataset.opsDensity = density;
    return true;
  }

  function install() {
    installStyle();
    if (!applyDensity()) return false;
    root.addEventListener('resize', applyDensity, { passive: true });
    root.addEventListener('orientationchange', applyDensity, { passive: true });
    root.addEventListener('sc:operations-cargo-primary-ready', applyDensity);
    root.addEventListener('sc:session-change', () => root.requestAnimationFrame(applyDensity));
    return true;
  }

  const observer = new MutationObserver(() => {
    if (install()) observer.disconnect();
  });

  if (!install()) observer.observe(document.documentElement, { childList: true, subtree: true });
}(typeof globalThis !== 'undefined' ? globalThis : window));
