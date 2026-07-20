'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clone = value => JSON.parse(JSON.stringify(value));
const norm = value => String(value || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]/g, '');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const fmt = value => Math.round(Number(value || 0)).toLocaleString('en-US');
const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const ships = [
  { id:'cutlass-black', name:'Drake Cutlass Black', role:'Medium freight', scu:46 },
  { id:'freelancer-max', name:'MISC Freelancer MAX', role:'Heavy medium freight', scu:120 },
  { id:'zeus-cl', name:'RSI Zeus Mk II CL', role:'Medium freight', scu:128 },
  { id:'constellation-taurus', name:'RSI Constellation Taurus', role:'Heavy freight', scu:174 },
  { id:'raft', name:'ARGO RAFT', role:'Container freight', scu:96 },
  { id:'caterpillar', name:'Drake Caterpillar', role:'Heavy modular freight', scu:576 },
  { id:'c2', name:'Crusader C2 Hercules', role:'Ultra-heavy freight', scu:696 }
];

const locations = [
  {name:'Stanton', parent:'System', type:'System', x:500, y:340, services:'—', traffic:'High', danger:'Medium', reliability:'Stable', description:'Corporate system with four primary planetary jurisdictions.'},
  {name:'Hurston', parent:'Stanton', type:'Planet', x:315, y:285, services:'Orbital and city', traffic:'High', danger:'Low', reliability:'Stable', description:'Industrial planet operated by Hurston Dynamics.'},
  {name:'Everus Harbor', parent:'Hurston', type:'Orbital Station', x:285, y:245, services:'Refuel · Repair · Rearm', traffic:'High', danger:'Low', reliability:'Good', description:'Major orbital cargo hub above Lorville.'},
  {name:'Lorville', parent:'Hurston', type:'Landing Zone', x:342, y:318, services:'Refuel · Repair · Rearm', traffic:'High', danger:'Low', reliability:'Moderate', description:'Atmospheric city landing with no-fly zones and longer handling time.'},
  {name:'Arial', parent:'Hurston', type:'Moon', x:222, y:210, services:'Outposts', traffic:'Medium', danger:'Medium', reliability:'Variable', description:'Hot mining moon with surface hauling outposts.'},
  {name:'HDMS-Bezdek', parent:'Arial', type:'Outpost', x:190, y:185, services:'Refuel · Repair · Rearm', traffic:'Medium', danger:'Medium', reliability:'Variable', description:'Surface outpost. Orbital-marker assists may be required.'},
  {name:'HDMS-Lathan', parent:'Arial', type:'Outpost', x:245, y:175, services:'Refuel · Repair · Rearm', traffic:'Medium', danger:'Medium', reliability:'Variable', description:'Surface outpost. Orbital-marker assists may be required.'},
  {name:'ArcCorp', parent:'Stanton', type:'Planet', x:735, y:205, services:'Orbital and city', traffic:'High', danger:'Low', reliability:'Stable', description:'Planet-wide urban and industrial jurisdiction.'},
  {name:'Baijini Point', parent:'ArcCorp', type:'Orbital Station', x:700, y:245, services:'Refuel · Repair · Rearm', traffic:'High', danger:'Low', reliability:'Good', description:'Busy orbital cargo station above Area18.'},
  {name:'Area18', parent:'ArcCorp', type:'Landing Zone', x:765, y:245, services:'Refuel · Repair · Rearm', traffic:'High', danger:'Low', reliability:'Moderate', description:'Atmospheric city landing at Riker Memorial Spaceport.'},
  {name:'Wala', parent:'ArcCorp', type:'Moon', x:815, y:285, services:'Outposts', traffic:'Medium', danger:'Medium', reliability:'Variable', description:'Industrial moon with mining facilities.'},
  {name:'ArcCorp Mining Area 056', parent:'Wala', type:'Outpost', x:842, y:315, services:'Refuel · Repair · Rearm', traffic:'Medium', danger:'Medium', reliability:'Variable', description:'Surface mining outpost with possible orbital-marker assists.'},
  {name:'ArcCorp Mining Area 045', parent:'Wala', type:'Outpost', x:800, y:330, services:'Refuel · Repair · Rearm', traffic:'Low', danger:'Medium', reliability:'Variable', description:'Surface mining outpost with possible orbital-marker assists.'},
  {name:'Crusader', parent:'Stanton', type:'Gas Giant', x:535, y:520, services:'Orbital and city', traffic:'High', danger:'Medium', reliability:'Stable', description:'Gas giant with the Orison landing zone and three moons.'},
  {name:'Seraphim Station', parent:'Crusader', type:'Orbital Station', x:500, y:482, services:'Refuel · Repair · Rearm', traffic:'High', danger:'Medium', reliability:'Good', description:'Popular orbital staging point above Crusader.'},
  {name:'Orison', parent:'Crusader', type:'Landing Zone', x:570, y:555, services:'Refuel · Repair · Rearm', traffic:'Medium', danger:'Low', reliability:'Moderate', description:'Long atmospheric descent and exit through Crusader.'},
  {name:'Daymar', parent:'Crusader', type:'Moon', x:445, y:575, services:'Outposts', traffic:'Medium', danger:'Medium', reliability:'Variable', description:'Desert moon with scrapyards and mining facilities.'},
  {name:'Brio’s Breaker Yard', parent:'Daymar', type:'Scrapyard', x:410, y:610, services:'No confirmed services', traffic:'Medium', danger:'High', reliability:'Variable', description:'Unregulated surface scrapyard outside armistice protection.'},
  {name:'Shubin Mining Facility SCD-1', parent:'Daymar', type:'Outpost', x:470, y:620, services:'Refuel · Repair · Rearm', traffic:'Low', danger:'Medium', reliability:'Variable', description:'Surface mining facility with possible orbital-marker assists.'},
  {name:'microTech', parent:'Stanton', type:'Planet', x:710, y:470, services:'Orbital and city', traffic:'High', danger:'Low', reliability:'Stable', description:'Cold technology-focused corporate world.'},
  {name:'Port Tressler', parent:'microTech', type:'Orbital Station', x:675, y:435, services:'Refuel · Repair · Rearm', traffic:'High', danger:'Low', reliability:'Good', description:'Primary orbital station above New Babbage.'},
  {name:'New Babbage', parent:'microTech', type:'Landing Zone', x:745, y:505, services:'Refuel · Repair · Rearm', traffic:'Medium', danger:'Low', reliability:'Moderate', description:'Atmospheric landing affected by weather and terrain.'},
  {name:'Shubin Mining Facility SM0-18', parent:'microTech', type:'Outpost', x:795, y:525, services:'Refuel · Repair · Rearm', traffic:'Low', danger:'Medium', reliability:'Variable', description:'Remote surface facility with possible weather delays.'},
  {name:'Rayari Deltana Research Outpost', parent:'microTech', type:'Research Outpost', x:770, y:555, services:'Refuel · Repair · Rearm', traffic:'Low', danger:'Medium', reliability:'Variable', description:'Remote research outpost; elevators may degrade with server health.'},
  {name:'Grim HEX', parent:'Crusader', type:'Asteroid Station', x:595, y:585, services:'Refuel · Repair · Rearm', traffic:'High', danger:'High', reliability:'Variable', description:'Asteroid station with high player risk in the surrounding area.'},
  {name:'Nyx Gateway', parent:'Stanton', type:'Gateway', x:95, y:95, services:'Gateway station', traffic:'Medium', danger:'Medium', reliability:'Variable', description:'Gateway toward Nyx.'},
  {name:'Terra Gateway', parent:'Stanton', type:'Gateway', x:910, y:330, services:'Gateway station', traffic:'Low', danger:'Low', reliability:'Stable', description:'Gateway station near the unavailable Terra connection.'},
  {name:'Pyro Gateway', parent:'Stanton', type:'Gateway', x:875, y:610, services:'Gateway station', traffic:'High', danger:'High', reliability:'Variable', description:'Operational gateway between Stanton and Pyro.'}
];

const defaultMissions = [
  {id:'m1',name:'Neon shipment Alpha',reference:'TEST-NEON-A',type:'Hauling',reward:18500,cargo:[{id:'c1',commodity:'Neon',scu:4,pickup:'Baijini Point',delivery:'Area18'}]},
  {id:'m2',name:'Emergency medical resupply',reference:'TEST-MED-01',type:'Delivery',reward:46500,cargo:[{id:'c2',commodity:'Medical Supplies',scu:12,pickup:'Everus Harbor',delivery:'Port Tressler'}]}
];

const STORAGE_KEY = 'sc-companion-clean-v1';
const state = {
  shipId:'cutlass-black', start:'Lorville', missions:clone(defaultMissions), route:[], calculated:false,
  active:false, activeIndex:0, mapMode:'orbital', selectedLocation:'Stanton', editingMissionId:null
};

function currentShip(){ return ships.find(item => item.id === state.shipId) || ships[0]; }
function findLocation(name){ return locations.find(item => norm(item.name) === norm(name)); }
function totalScu(){ return state.missions.reduce((sum,m)=>sum+m.cargo.reduce((s,c)=>s+Number(c.scu||0),0),0); }
function totalReward(){ return state.missions.reduce((sum,m)=>sum+Number(m.reward||0),0); }
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && typeof saved==='object') Object.assign(state,saved);
  }catch{}
  state.missions=(state.missions||[]).map(normalizeMission);
  if(!ships.some(s=>s.id===state.shipId)) state.shipId=ships[0].id;
  if(!findLocation(state.start)) state.start='Lorville';
}
function normalizeMission(raw={}){
  return {id:raw.id||uid('mission'),name:String(raw.name||raw.title||'Untitled mission'),reference:String(raw.reference||''),type:String(raw.type||'Hauling'),reward:Math.max(0,Number(raw.reward)||0),cargo:Array.isArray(raw.cargo)?raw.cargo.map(c=>({id:c.id||uid('cargo'),commodity:String(c.commodity||''),scu:Math.max(0,Number(c.scu)||0),pickup:String(c.pickup||''),delivery:String(c.delivery||'')})):[]};
}

function buildRoute(){
  const route=[{name:state.start,type:'start',actions:[]}];
  const pickups=[]; const deliveries=[];
  const add=(list,name,type,action)=>{
    let stop=list.find(s=>norm(s.name)===norm(name));
    if(!stop){stop={name,type,actions:[]};list.push(stop)}
    stop.actions.push(action);
  };
  state.missions.forEach(mission=>mission.cargo.forEach(cargo=>{
    const base={mission:mission.reference||mission.name,commodity:cargo.commodity,scu:cargo.scu};
    if(cargo.pickup){
      if(norm(cargo.pickup)===norm(state.start)) route[0].actions.push({...base,kind:'pickup'});
      else add(pickups,cargo.pickup,'pickup',{...base,kind:'pickup'});
    }
    if(cargo.delivery) add(deliveries,cargo.delivery,'delivery',{...base,kind:'delivery'});
  }));
  return [...route,...pickups,...deliveries];
}

function routeMetrics(route){
  let distance=0;
  for(let i=1;i<route.length;i++){
    const a=findLocation(route[i-1].name),b=findLocation(route[i].name);
    if(a&&b) distance+=Math.hypot(a.x-b.x,a.y-b.y)/36;
  }
  const surface=route.filter(s=>/Outpost|Landing Zone|Scrapyard|Research/.test(findLocation(s.name)?.type||'')).length;
  return {distance:distance?`${distance.toFixed(1)} Gm`:'—',fuel:distance>20?'High':distance>9?'Medium':'Low',surface};
}

function navHops(fromName,toName){
  const a=findLocation(fromName),b=findLocation(toName);
  if(!a||!b) return 'Unknown';
  const surface=/Outpost|Landing Zone|Scrapyard|Research/.test(b.type);
  if(!surface) return '0–1 assists';
  if(a.parent===b.parent) return '1–3 assists';
  return '0–2 assists';
}

function populateSelects(){
  $('#shipSelect').innerHTML=ships.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
  $('#shipSelect').value=state.shipId;
  const selectable=locations.filter(l=>l.type!=='System'&&l.type!=='Planet'&&l.type!=='Gas Giant'&&l.type!=='Moon');
  $('#startSelect').innerHTML=selectable.map(l=>`<option>${esc(l.name)}</option>`).join('');
  $('#startSelect').value=state.start;
}

function renderShip(){
  const ship=currentShip();
  $('#shipName').textContent=ship.name; $('#shipRole').textContent=ship.role; $('#shipCapacity').textContent=`${fmt(ship.scu)} SCU`;
}

function renderMissions(){
  const root=$('#missionList');
  if(!state.missions.length){root.innerHTML='<div class="empty-list">No missions added.</div>'}
  else root.innerHTML=state.missions.map(m=>`<article class="mission-card"><div class="mission-card-head"><div><strong>${esc(m.reference?`${m.reference} · ${m.name}`:m.name)}</strong><small>${esc(m.type)} · ${m.cargo.reduce((s,c)=>s+c.scu,0)} SCU · ${fmt(m.reward)} aUEC</small></div><div class="mission-actions"><button data-edit-mission="${esc(m.id)}" type="button">Edit</button><button data-delete-mission="${esc(m.id)}" type="button">×</button></div></div><div class="mission-cargo">${m.cargo.map(c=>`<div class="mission-cargo-row"><div><strong>${esc(c.commodity||'Unnamed cargo')}</strong><small>${esc(c.pickup||'Pickup')} → ${esc(c.delivery||'Delivery')}</small></div><b>${c.scu} SCU</b></div>`).join('')}</div></article>`).join('');
  $$('[data-edit-mission]').forEach(btn=>btn.onclick=()=>openMissionEditor(btn.dataset.editMission));
  $$('[data-delete-mission]').forEach(btn=>btn.onclick=()=>{state.missions=state.missions.filter(m=>m.id!==btn.dataset.deleteMission);dirty();renderAll()});
  $('#missionSummary').textContent=`${state.missions.length} mission${state.missions.length===1?'':'s'} · ${totalScu()} SCU`;
}

function dirty(){state.route=[];state.calculated=false;state.active=false;state.activeIndex=0;save()}

function renderMetrics(){
  const ship=currentShip(),planned=totalScu(),pct=ship.scu?Math.round(planned/ship.scu*100):0,route=state.calculated?state.route:buildRoute(),metrics=routeMetrics(route);
  $('#plannedScu').textContent=planned; $('#capacityScu').textContent=fmt(ship.scu); $('#capacityFill').style.width=`${Math.min(100,pct)}%`; $('#capacityFill').classList.toggle('is-over',planned>ship.scu);
  $('#capacityPercent').textContent=`${pct}% capacity`; $('#capacityFree').textContent=planned>ship.scu?`${planned-ship.scu} SCU over`:`${ship.scu-planned} SCU free`;
  $('#distanceMetric').textContent=state.calculated?metrics.distance:'—'; $('#rewardMetric').textContent=fmt(totalReward()); $('#stopsMetric').textContent=route.length;
  const pickups=route.filter(s=>s.type==='pickup').length,deliveries=route.filter(s=>s.type==='delivery').length; $('#stopsMeta').textContent=`${pickups} pickup · ${deliveries} delivery`;
  $('#fuelMetric').textContent=state.calculated?metrics.fuel:'—'; $('#routeStatus').textContent=state.active?'Active':state.calculated?'Ready':'Draft'; $('#routeStatus').className=`status-pill${state.active?' is-active':state.calculated?' is-ready':''}`;
  $('#routeStopsCount').textContent=route.length; $('#knownStopsCount').textContent=locations.length; $('#mapModeLabel').textContent=state.mapMode==='orbital'?'Orbital':'Tree';
  $('#footerCargoState').textContent=`${planned} SCU planned`; $('#footerRouteState').textContent=state.active?'Route active':state.calculated?'Route ready':'No active route';
}

function stopSummary(stop){
  if(!stop.actions.length) return stop.type==='start'?'Departure point':'No cargo action';
  if(stop.actions.length===1){const a=stop.actions[0];return `${a.kind==='pickup'?'Load':'Deliver'} ${a.scu} SCU ${a.commodity} · ${a.mission}`}
  return `${stop.actions.length} cargo actions`;
}

function renderTimeline(){
  const route=state.calculated?state.route:buildRoute();
  $('#timelineCount').textContent=`${route.length} stops`;
  $('#routeTimeline').innerHTML=route.map((s,i)=>`<li class="${state.active&&i===state.activeIndex?'is-current':''}"><span class="timeline-index">${String(i+1).padStart(2,'0')}</span><div class="timeline-copy"><strong>${esc(s.name)}</strong><small>${esc(stopSummary(s))}</small></div></li>`).join('');
}

function nodeClass(name,route){
  const node=findLocation(name); if(!node)return'';
  const classes=[];
  if(norm(name)===norm(state.selectedLocation))classes.push('is-selected');
  if(norm(name)===norm(state.start))classes.push('is-start');
  const stop=route.find(s=>norm(s.name)===norm(name)||norm(findLocation(s.name)?.parent)===norm(name));
  if(stop?.type==='pickup')classes.push('is-pickup'); if(stop?.type==='delivery')classes.push('is-delivery');
  return classes.join(' ');
}

function renderOrbitalSvg(svg,activeMode=false){
  const route=state.calculated?state.route:buildRoute();
  const major=locations.filter(l=>['Planet','Gas Giant','Gateway'].includes(l.type));
  const grid=[];for(let x=100;x<1000;x+=100)grid.push(`<line class="grid-line" x1="${x}" y1="0" x2="${x}" y2="680"/>`);for(let y=85;y<680;y+=85)grid.push(`<line class="grid-line" x1="0" y1="${y}" x2="1000" y2="${y}"/>`);
  const points=route.map(s=>{const loc=findLocation(s.name);if(!loc)return null;const majorNode=['Planet','Gas Giant','Gateway'].includes(loc.type)?loc:findLocation(loc.parent)||findLocation(findLocation(loc.parent)?.parent);return majorNode?{x:majorNode.x,y:majorNode.y}:null}).filter(Boolean);
  const path=points.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ');
  const currentLeg=activeMode&&state.active&&state.route.length>1?(()=>{const toIndex=Math.min(Math.max(state.activeIndex,1),state.route.length-1);const a=findLocation(state.route[toIndex-1].name),b=findLocation(state.route[toIndex].name);const ma=a&&(['Planet','Gas Giant','Gateway'].includes(a.type)?a:findLocation(a.parent)||findLocation(findLocation(a.parent)?.parent));const mb=b&&(['Planet','Gas Giant','Gateway'].includes(b.type)?b:findLocation(b.parent)||findLocation(findLocation(b.parent)?.parent));return ma&&mb?`M ${ma.x} ${ma.y} L ${mb.x} ${mb.y}`:''})():'';
  const routeMarkup=path?`<path class="route-base" d="${path}"/><path class="route-path" d="${path}"/>`:'';
  const currentMarkup=currentLeg?`<path d="${currentLeg}" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>`:'';
  const nodes=[{name:'Stanton',type:'Star',x:500,y:340,size:17},...major.map(l=>({name:l.name,type:l.type,x:l.x,y:l.y,size:l.type==='Gateway'?10:l.type==='Gas Giant'?17:13}))];
  svg.innerHTML=`<g>${grid.join('')}</g><g><ellipse class="orbit" cx="500" cy="340" rx="205" ry="125"/><ellipse class="orbit" cx="500" cy="340" rx="345" ry="215"/><ellipse class="orbit" cx="500" cy="340" rx="455" ry="285"/></g><g>${routeMarkup}${currentMarkup}</g><g>${nodes.map(n=>{const cls=n.type==='Gateway'?'gateway':'';const flags=n.name==='Stanton'?'':nodeClass(n.name,route);const labelX=n.x>780?-n.size-12:n.size+12,anchor=n.x>780?'end':'start';return `<g class="map-node ${cls} ${flags}" data-node="${esc(n.name)}" transform="translate(${n.x} ${n.y})"><circle class="node-hit" r="${n.size+18}"/><circle class="node-ring" r="${n.size+6}"/><circle class="node-core ${n.name==='Stanton'?'star-core':''}" r="${n.size}"/><text class="node-label" x="${labelX}" y="-2" text-anchor="${anchor}">${esc(n.name)}</text><text class="node-meta" x="${labelX}" y="11" text-anchor="${anchor}">${esc(n.type)}</text></g>`}).join('')}</g>`;
  $$('.map-node',svg).forEach(node=>node.onclick=()=>{state.selectedLocation=node.dataset.node;renderSelectedLocation();renderOrbitalSvg(svg,activeMode)});
}

function renderSelectedLocation(){
  const loc=findLocation(state.selectedLocation)||locations[0];
  $('#selectedLocationName').textContent=loc.name; $('#selectedLocationMeta').textContent=`${loc.type} · ${loc.parent}`;
}

function renderTree(){
  const groups=['Hurston','ArcCorp','Crusader','microTech','Stanton'];
  $('#treeBrowser').innerHTML=groups.map(group=>{const children=locations.filter(l=>l.parent===group&&l.name!==group);return `<section class="tree-group"><button type="button" data-tree-location="${esc(group)}"><span>${esc(group)}</span><small>${children.length} entities</small></button><div class="tree-children">${children.map(item=>`<button class="tree-item ${norm(item.name)===norm(state.selectedLocation)?'is-selected':''}" type="button" data-tree-location="${esc(item.name)}"><span>${esc(item.name)}</span><small>${esc(item.type)}</small></button>`).join('')}</div></section>`}).join('');
  $$('[data-tree-location]').forEach(btn=>btn.onclick=()=>{state.selectedLocation=btn.dataset.treeLocation;renderTree();renderSelectedLocation()});
  const loc=findLocation(state.selectedLocation)||locations[0];
  $('#treeInspector').innerHTML=`<span class="kicker">${esc(loc.type)}</span><h2>${esc(loc.name)}</h2><p>${esc(loc.description)}</p><div class="inspector-grid"><div><span>Parent</span><strong>${esc(loc.parent)}</strong></div><div><span>Services</span><strong>${esc(loc.services)}</strong></div><div><span>Traffic</span><strong>${esc(loc.traffic)}</strong></div><div><span>Danger</span><strong>${esc(loc.danger)}</strong></div><div><span>Reliability</span><strong>${esc(loc.reliability)}</strong></div><div><span>Nav assists</span><strong>${esc(navHops(state.start,loc.name))}</strong></div></div><div class="inspector-note">Fixed community-style profile. This is not live telemetry.</div>`;
}

function applyMapMode(){
  $('#orbitalMapView').classList.toggle('is-active',state.mapMode==='orbital'); $('#entityTreeView').classList.toggle('is-active',state.mapMode==='tree');
  $$('#mapModeSwitch button').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.mapMode===state.mapMode));
  $('#mapTitle').textContent=state.mapMode==='orbital'?'Orbital map':'Entity tree';
  if(state.mapMode==='orbital')renderOrbitalSvg($('#systemMap'));else renderTree(); renderMetrics(); save();
}

function renderArrival(){
  const route=state.calculated?state.route:buildRoute();
  const next=route[1]; const loc=next&&findLocation(next.name);
  if(!loc){$('#arrivalName').textContent='No route calculated';$('#arrivalDescription').textContent='Add or import missions, then calculate the route.';$('#arrivalChips').innerHTML='';return}
  $('#arrivalName').textContent=loc.name; $('#arrivalDescription').textContent=loc.description;
  $('#arrivalChips').innerHTML=[`Services · ${loc.services}`,`Traffic · ${loc.traffic}`,`Danger · ${loc.danger}`,`Reliability · ${loc.reliability}`,navHops(state.start,loc.name)].map(v=>`<span>${esc(v)}</span>`).join('');
}

function calculateRoute(){
  if(!state.missions.length)return alert('Add at least one mission.');
  if(state.missions.some(m=>!m.cargo.length||m.cargo.some(c=>!c.commodity||!c.pickup||!c.delivery||c.scu<=0)))return alert('Complete every cargo item.');
  if(totalScu()>currentShip().scu)return alert(`Cargo exceeds ${currentShip().name} capacity by ${totalScu()-currentShip().scu} SCU.`);
  state.route=buildRoute(); state.calculated=true; state.active=false; state.activeIndex=0; save(); renderAll();
}

function startRoute(){if(!state.calculated)return;state.active=true;state.activeIndex=0;save();renderAll();switchView('active')}
function completeStop(){if(!state.active)return;if(state.activeIndex>=state.route.length-1){state.active=false;state.activeIndex=state.route.length;save();renderAll();return}state.activeIndex+=1;save();renderAll()}
function endRoute(){state.active=false;state.activeIndex=0;save();renderAll()}

function renderActive(){
  renderOrbitalSvg($('#activeMap'),true);
  const route=state.route; const stop=route[state.activeIndex];
  $('#activeStatus').textContent=state.active?'Active':state.calculated?'Ready':'Idle'; $('#activeStatus').className=`status-pill${state.active?' is-active':state.calculated?' is-ready':''}`;
  if(!route.length||!stop){$('#activeLegTitle').textContent='No active route';$('#activeStopName').textContent='Start a route';$('#activeActions').innerHTML='';$('#completeStopButton').disabled=true;$('#activeQueue').innerHTML='';$('#activeProgress').textContent='0 / 0';return}
  const next=route[Math.min(state.activeIndex+1,route.length-1)]; $('#activeLegTitle').textContent=state.activeIndex===0?`${stop.name} → ${next.name}`:stop.name;
  $('#activeStopName').textContent=stop.name; $('#activeActions').innerHTML=stop.actions.length?stop.actions.map(a=>`<div class="objective"><strong>${a.kind==='pickup'?'Load':'Deliver'} ${a.scu} SCU ${esc(a.commodity)}</strong><small>${esc(a.mission)}</small></div>`).join(''):'<div class="objective"><strong>Departure point</strong><small>Confirm ship and begin the run.</small></div>';
  $('#completeStopButton').disabled=!state.active; $('#completeStopButton').textContent=state.activeIndex===route.length-1?'Complete route':'Complete stop';
  const loc=findLocation(stop.name); $('#activeArrivalName').textContent=loc?.name||stop.name; $('#activeArrivalDescription').textContent=loc?.description||'No fixed profile.'; $('#activeArrivalChips').innerHTML=loc?[`Services · ${loc.services}`,`Traffic · ${loc.traffic}`,`Danger · ${loc.danger}`,`Reliability · ${loc.reliability}`].map(v=>`<span>${esc(v)}</span>`).join(''):'';
  $('#activeQueue').innerHTML=route.map((s,i)=>`<li class="${i===state.activeIndex?'is-current':''} ${i<state.activeIndex?'is-done':''}"><span>${i<state.activeIndex?'✓':String(i+1).padStart(2,'0')}</span><div><strong>${esc(s.name)}</strong><small>${esc(stopSummary(s))}</small></div><b>${i<state.activeIndex?'DONE':i===state.activeIndex?'CURRENT':'QUEUED'}</b></li>`).join(''); $('#activeProgress').textContent=`${Math.min(state.activeIndex+1,route.length)} / ${route.length}`;
}

function renderFleet(){ $('#fleetGrid').innerHTML=ships.map(s=>`<article><span class="kicker">Ship profile</span><h2>${esc(s.name)}</h2><p>${esc(s.role)}</p><div class="chips"><span>${fmt(s.scu)} SCU</span><span>Fixed profile</span></div></article>`).join('') }
function renderIntel(){ $('#intelGrid').innerHTML=locations.filter(l=>!['System','Planet','Gas Giant','Moon'].includes(l.type)).map(l=>`<article><span class="kicker">${esc(l.type)}</span><h2>${esc(l.name)}</h2><p>${esc(l.description)}</p><div class="chips"><span>${esc(l.services)}</span><span>Traffic · ${esc(l.traffic)}</span><span>Danger · ${esc(l.danger)}</span></div></article>`).join('') }

function renderAll(){renderShip();renderMissions();renderMetrics();renderTimeline();renderSelectedLocation();applyMapMode();renderArrival();renderActive();renderFleet();renderIntel();$('#startRouteButton').disabled=!state.calculated;}

function switchView(name){
  $$('.view').forEach(v=>v.classList.toggle('is-active',v.dataset.viewPanel===name)); $$('.tab').forEach(t=>t.classList.toggle('is-active',t.dataset.view===name));
  if(name==='active')renderActive();
}

function openMissionEditor(id=null,imported=null){
  const mission=imported?normalizeMission(imported):id?clone(state.missions.find(m=>m.id===id)):normalizeMission({name:'New mission',type:'Hauling',cargo:[{commodity:'',scu:1,pickup:'',delivery:''}]});
  state.editingMissionId=id; $('#missionDialogTitle').textContent=id?'Edit mission':'Add mission'; $('#missionId').value=mission.id; $('#missionName').value=mission.name; $('#missionReference').value=mission.reference; $('#missionType').value=mission.type; $('#missionReward').value=mission.reward; renderCargoEditor(mission.cargo); $('#missionDialog').showModal();
}

let editorCargo=[];
function renderCargoEditor(cargo){editorCargo=clone(cargo);$('#cargoEditorList').innerHTML=editorCargo.map((c,i)=>`<div class="cargo-edit-row" data-cargo-index="${i}"><label class="field"><span>Commodity</span><input data-key="commodity" value="${esc(c.commodity)}"></label><label class="field"><span>SCU</span><input data-key="scu" type="number" min="1" value="${c.scu}"></label><label class="field"><span>Pickup</span><select data-key="pickup">${locationOptions(c.pickup)}</select></label><label class="field"><span>Delivery</span><select data-key="delivery">${locationOptions(c.delivery)}</select></label><button type="button" data-remove-cargo="${i}">×</button></div>`).join('');$$('.cargo-edit-row').forEach(row=>$$('[data-key]',row).forEach(input=>input.oninput=()=>{const index=Number(row.dataset.cargoIndex),key=input.dataset.key;editorCargo[index][key]=key==='scu'?Math.max(0,Number(input.value)||0):input.value}));$$('[data-remove-cargo]').forEach(btn=>btn.onclick=()=>{editorCargo.splice(Number(btn.dataset.removeCargo),1);renderCargoEditor(editorCargo)})}
function locationOptions(selected=''){return locations.filter(l=>!['System','Planet','Gas Giant','Moon'].includes(l.type)).map(l=>`<option${l.name===selected?' selected':''}>${esc(l.name)}</option>`).join('')}

function saveMissionFromDialog(event){
  if(event.submitter?.value==='cancel')return;
  event.preventDefault();
  const mission=normalizeMission({id:$('#missionId').value,name:$('#missionName').value.trim()||'Untitled mission',reference:$('#missionReference').value.trim(),type:$('#missionType').value,reward:Number($('#missionReward').value)||0,cargo:editorCargo});
  if(!mission.cargo.length)return alert('Add at least one cargo item.');
  const index=state.missions.findIndex(m=>m.id===state.editingMissionId); if(index>=0)state.missions[index]=mission;else state.missions.push(mission); dirty(); $('#missionDialog').close(); renderAll();
}

function parseMissionText(text){
  const mission=normalizeMission({name:'Imported mission',cargo:[]});let cargo=null;
  for(const raw of text.split(/\r?\n/)){const line=raw.trim();if(!line)continue;const m=line.match(/^([^:]+):\s*(.*)$/);if(!m)continue;const key=m[1].trim().toLowerCase(),value=m[2].trim();if(key==='mission'||key==='name')mission.name=value;else if(key==='reference'||key==='ref')mission.reference=value;else if(key==='type')mission.type=value;else if(key==='reward')mission.reward=Number(value.replace(/[^0-9.]/g,''))||0;else if(key.startsWith('cargo')){cargo={id:uid('cargo'),commodity:value,scu:1,pickup:'',delivery:''};mission.cargo.push(cargo)}else if(key==='commodity'){if(!cargo){cargo={id:uid('cargo'),commodity:'',scu:1,pickup:'',delivery:''};mission.cargo.push(cargo)}cargo.commodity=value}else if(key==='scu'||key==='quantity'){if(!cargo){cargo={id:uid('cargo'),commodity:'',scu:1,pickup:'',delivery:''};mission.cargo.push(cargo)}cargo.scu=Number(value.replace(/[^0-9.]/g,''))||1}else if(key==='pickup'){if(!cargo){cargo={id:uid('cargo'),commodity:'',scu:1,pickup:'',delivery:''};mission.cargo.push(cargo)}cargo.pickup=value}else if(['delivery','dropoff','drop-off'].includes(key)){if(!cargo){cargo={id:uid('cargo'),commodity:'',scu:1,pickup:'',delivery:''};mission.cargo.push(cargo)}cargo.delivery=value}}
  if(!mission.cargo.length)mission.cargo.push({id:uid('cargo'),commodity:'',scu:1,pickup:'',delivery:''});return mission;
}

function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='sc-companion-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
function importData(file){const reader=new FileReader();reader.onload=()=>{try{Object.assign(state,JSON.parse(reader.result));state.missions=state.missions.map(normalizeMission);save();renderAll()}catch{alert('Invalid data file.')}};reader.readAsText(file)}

function bindEvents(){
  $$('[data-view]').forEach(btn=>btn.onclick=()=>switchView(btn.dataset.view));
  $('#shipSelect').onchange=e=>{state.shipId=e.target.value;dirty();renderAll()}; $('#startSelect').onchange=e=>{state.start=e.target.value;dirty();renderAll()};
  $('#saveButton').onclick=()=>save(); $('#resetButton').onclick=()=>{localStorage.removeItem(STORAGE_KEY);Object.assign(state,{shipId:'cutlass-black',start:'Lorville',missions:clone(defaultMissions),route:[],calculated:false,active:false,activeIndex:0,mapMode:'orbital',selectedLocation:'Stanton',editingMissionId:null});populateSelects();renderAll()};
  $('#addMissionButton').onclick=()=>openMissionEditor(); $('#importMissionButton').onclick=()=>{$('#importMissionText').value='';$('#importMissionDialog').showModal()};
  $('#addCargoButton').onclick=()=>{editorCargo.push({id:uid('cargo'),commodity:'',scu:1,pickup:'',delivery:''});renderCargoEditor(editorCargo)};
  $('#missionForm').addEventListener('submit',saveMissionFromDialog); $('#importMissionForm').addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();const mission=parseMissionText($('#importMissionText').value);$('#importMissionDialog').close();openMissionEditor(null,mission)});
  $$('#mapModeSwitch button').forEach(btn=>btn.onclick=()=>{state.mapMode=btn.dataset.mapMode;applyMapMode()}); $('#fitMapButton').onclick=()=>renderOrbitalSvg($('#systemMap'));
  $('#calculateButton').onclick=calculateRoute; $('#startRouteButton').onclick=startRoute; $('#completeStopButton').onclick=completeStop; $('#endRouteButton').onclick=endRoute;
  $('#exportButton').onclick=exportData; $('#importDataButton').onclick=()=>$('#importDataFile').click(); $('#importDataFile').onchange=e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=''}; $('#clearDataButton').onclick=()=>{if(confirm('Clear all local data?')){$('#resetButton').click()}};
}

function init(){load();populateSelects();bindEvents();renderAll()}
document.addEventListener('DOMContentLoaded',init);
