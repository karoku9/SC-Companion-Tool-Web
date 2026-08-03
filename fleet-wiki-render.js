'use strict';

(() => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'srcdoc');
  if (!descriptor?.set || !descriptor?.get) return;

  const css = `
    :root{
      color-scheme:dark;
      --color-surface-0:#0b1419;--color-surface-1:#101b21;--color-surface-2:#16262e;
      --color-base:#e8f2f4;--color-emphasized:#f5fbfc;--color-subtle:#9bb0b5;
      --color-success:#53c98c;--color-destructive:#ff6f75;
      --space-xxs:4px;--space-xs:8px;--space-sm:12px;--space-md:16px;
      --font-size-x-small:11px;--font-size-small:13px;--font-size-medium:15px;
      --line-height-x-small:1.25;--line-height-small:1.4;
      --font-weight-medium:500;--font-weight-semi-bold:700;
      --border-base:1px solid #294750;--border-subtle:1px solid #203a43;
      --border-radius-medium:8px;--border-radius-circle:999px;
    }
    *{box-sizing:border-box}
    html,body{margin:0;background:#0b1115;color:var(--color-base);font:13px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif}
    body{padding:12px}.mw-parser-output{max-width:none!important}.mw-editsection{display:none!important}
    a{color:#69dce5;text-decoration:none}a:hover{text-decoration:underline}
    .t-infobox-section{width:100%!important;max-width:none!important;margin:0!important;padding:0 14px 14px}
    .t-infobox-collapsible{border:1px solid #294750;border-radius:9px;background:#0e1b22;overflow:hidden}
    .t-infobox-collapsible-button{display:flex!important;align-items:center;gap:8px;padding:12px 14px!important;border:0!important;border-bottom:1px solid #294750!important;list-style:none;cursor:pointer;background:#102730!important}
    .t-infobox-collapsible-button::-webkit-details-marker{display:none}
    .t-infobox-collapsible-button::before{content:'▾';color:#62e5ed;font-size:12px}
    .t-infobox-section-label{padding:0!important;border:0!important;color:#f2fbfc!important;font-size:15px!important;font-weight:700!important}
    .t-infobox-section-subsections{margin:0!important;padding:0!important}
    .tabber{width:100%;overflow:hidden}
    .tabber__header{display:block!important;padding:0 14px!important;border-bottom:1px solid #294750!important;background:#0b171d!important;box-shadow:none!important;overflow-x:auto}
    .tabber__tabs{display:flex!important;align-items:end!important;gap:18px!important;min-width:max-content;margin:0!important;padding:0!important;list-style:none!important}
    .tabber__tab{display:block!important;padding:12px 0 10px!important;margin:0!important;border:0!important;border-bottom:2px solid transparent!important;color:#8fa7ad!important;text-decoration:none!important;font-weight:700!important;font-size:12px!important;cursor:pointer;background:none!important}
    .tabber__tab.is-active,.tabber__tab[aria-selected="true"],.tabber__tab--active{color:#70e8ef!important;border-bottom-color:#70e8ef!important}
    .tabber__section,.tabber__panel{padding:14px!important;background:#0e1b22!important}
    .tabber__panel[hidden],.tabber__section[hidden]{display:none!important}
    .t-infobox-section-items{display:grid!important;grid-template-columns:1fr!important;gap:10px!important;margin:0!important;padding:0!important}
    .t-infobox-item{display:flex!important;gap:10px;justify-content:space-between;align-items:flex-start;margin:0!important;padding:0!important}
    .t-infobox-item-label{color:#9bb0b5!important;font-weight:500!important}
    .t-infobox-item-content{margin-left:auto!important;text-align:right!important;color:#edf6f7!important}
    .t-infobox-item--block,.t-infobox-item--block .t-infobox-item-content{display:block!important;width:100%!important;flex-basis:100%!important;text-align:left!important}
    .t-range-bar{width:100%;padding:2px 0}.t-range-bar__head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-size:13px}
    .t-range-bar__label{color:#9bb0b5;font-weight:600}.t-range-bar__value{color:#f2f8f9;text-align:right;font-variant-numeric:tabular-nums}
    .t-range-bar__track{position:relative;height:6px;margin:7px 0 2px;border-radius:4px;overflow:hidden;background:#1b3038}
    .t-range-bar__seg{position:absolute;top:0;bottom:0;left:var(--t-range-bar-seg-left);width:var(--t-range-bar-seg-width);background:var(--t-range-bar-seg-bg)}
    .t-range-bar__seg--dim{opacity:.35}.t-range-bar__tick{position:absolute;top:0;bottom:0;width:1px;z-index:2;left:var(--t-range-bar-tick-left);background:var(--t-range-bar-tick-color)}
    .t-progress-tiles{display:flex!important;gap:8px!important;justify-content:space-between!important}
    .t-progress-tiles__cell{flex:1;min-width:0;display:flex!important;flex-direction:column;align-items:center;gap:5px}
    .t-progress-tiles__gauge{position:relative;width:100%;max-width:72px;aspect-ratio:1}
    .t-progress-tiles__ring{position:absolute;inset:0;border-radius:999px;background:var(--t-progress-tiles-ring)}
    .t-progress-tiles__center{position:absolute;inset:5px;border-radius:999px;background:#0e1b22}
    .t-progress-tiles__value{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:800;color:#f4fbfc;z-index:2}
    .t-progress-tiles__label{font-size:10px;line-height:1.2;color:#9bb0b5;text-align:center;white-space:nowrap}
    .t-stats-overview-footnote{display:flex;justify-content:space-between;gap:8px;margin-top:12px;border-top:1px solid #203a43;padding-top:8px;color:#80979d;font-size:11px}
    .t-badge{display:inline-flex;align-items:center;border:1px solid #385861;border-radius:999px;padding:2px 6px;font-size:10px}
    .ext-floatingui-reference{width:100%}
    @media(max-width:620px){body{padding:8px}.t-progress-tiles{gap:4px!important}.t-progress-tiles__label{font-size:9px}.tabber__tabs{gap:14px!important}}
  `;

  const script = `
    (()=>{
      function getPanels(tabber,tabs){
        let panels=[...tabber.querySelectorAll(':scope > .tabber__section, :scope > .tabber__panel')];
        if(panels.length!==tabs.length) panels=[...tabber.querySelectorAll('.tabber__panel')];
        if(panels.length!==tabs.length) panels=[...tabber.querySelectorAll('.tabber__section')];
        return panels;
      }
      function activate(tabs,panels,index){
        tabs.forEach((tab,i)=>{
          const active=i===index;
          tab.classList.toggle('is-active',active);
          tab.setAttribute('aria-selected',String(active));
          tab.setAttribute('tabindex',active?'0':'-1');
        });
        panels.forEach((panel,i)=>{
          const active=i===index;
          panel.hidden=!active;
          panel.setAttribute('aria-hidden',String(!active));
        });
      }
      document.querySelectorAll('details').forEach(details=>details.open=true);
      document.querySelectorAll('.tabber').forEach(tabber=>{
        const tabs=[...tabber.querySelectorAll('.tabber__tab')];
        if(!tabs.length)return;
        const panels=getPanels(tabber,tabs);
        if(!panels.length)return;
        tabs.forEach((tab,index)=>tab.addEventListener('click',event=>{event.preventDefault();activate(tabs,panels,index)}));
        let initial=tabs.findIndex(tab=>tab.classList.contains('tabber__tab--active')||tab.getAttribute('aria-selected')==='true');
        activate(tabs,panels,initial<0?0:initial);
      });
    })();
  `;

  function enhance(value) {
    if (typeof value !== 'string' || !value.includes('t-infobox-section')) return value;
    const styleTag = `<style id="sc-companion-wiki-render">${css}</style>`;
    const scriptTag = `<script id="sc-companion-wiki-tabs">${script}<\/script>`;
    let result = value.includes('</head>') ? value.replace('</head>', `${styleTag}</head>`) : styleTag + value;
    result = result.includes('</body>') ? result.replace('</body>', `${scriptTag}</body>`) : result + scriptTag;
    return result;
  }

  Object.defineProperty(HTMLIFrameElement.prototype, 'srcdoc', {
    configurable: descriptor.configurable,
    enumerable: descriptor.enumerable,
    get: descriptor.get,
    set(value) { descriptor.set.call(this, enhance(value)); }
  });
})();
