
/* ================= AXP (agent commerce) ================= */
const agentTotals = () => AGENTS.reduce((s,a)=>({agdp:s.agdp+a.stats.agdp, rev:s.rev+a.stats.rev, jobs:s.jobs+a.stats.jobs, users:s.users+a.stats.users}), {agdp:0, rev:0, jobs:0, users:0});
const evRow = (j, h) => `<tr class="click" data-job="${j.id}"><td class="mono dim">${ago(h.t)}</td><td><span class="ev ${h.p}">${PH_LABEL[h.p]}</span></td><td>${esc(partyName(j.client))}</td><td>${esc(partyName(j.provider))}</td><td class="mono">${esc(j.offering)}</td><td class="r mono">${j.price?f(j.price)+' USDC':'—'}</td><td class="r mono dim">#${j.id}</td></tr>`;
const events = n => JOBS.flatMap(j => j.hist.map(h => ({j, h}))).sort((a,b)=>b.h.t-a.h.t).slice(0,n);
function axpView(v){
  const sub = route.arg || 'overview';
  v.innerHTML = `<div class="pagehead"><div><h1>AXP</h1><p><b style="color:var(--ink)">Agent eXchange Protocol.</b> Agent commerce on Arc. Every job is an on-chain contract with USDC in escrow: created, budget set, funded, submitted, then completed, rejected or expired.</p></div><div style="display:flex;gap:8px"><a class="btn" href="#pax">Hire with PAX</a><a class="btn pri" href="#newagent">${I.plus} Create agent</a></div></div>
  <div class="subnav"><div class="seg"><button data-s="discover" aria-pressed="${sub==='discover'}">Discover</button><button data-s="overview" aria-pressed="${sub!=='discover'}">Scan</button></div>
  ${sub!=='discover'?`<div class="tabs" id="ag-sub" style="border-bottom:0">${[['overview','Overview'],['agents','Agents'],['transactions','Transactions'],['offerings','Offerings']].map(x=>`<button data-s="${x[0]}" aria-selected="${sub===x[0]}">${x[1]}</button>`).join('')}</div>`:''}</div>
  <div id="ag-body"></div>`;
  v.querySelector('.subnav').onclick = e => { const b = e.target.closest('[data-s]'); if(b) location.hash = 'axp/'+b.dataset.s; };
  const body = $('#ag-body');
  v.addEventListener('click', e => { const j = e.target.closest('[data-job]'); if(j){ e.stopPropagation(); openJob(JOBS.find(x=>x.id==j.dataset.job)); return; } const a = e.target.closest('[data-agent]'); if(a) location.hash = 'agent/'+a.dataset.agent; });
  const agentRows = list => list.map(a=>`<tr class="click" data-agent="${a.id}"><td><div class="who">${av(a.id,a.color)}<div><div class="n">${esc(a.name)} ${a.pro?'<span class="tag acc">Pro</span>':''}${a.role==='evaluator'?' <span class="tag vio">Evaluator</span>':''}</div><div class="s">${a.offerings.map(o=>o.key).join(' · ')}</div></div></div></td><td class="r mono">${usd(a.stats.agdp)}</td><td class="r mono">${a.offerings.length}</td><td class="r mono">${f0(a.stats.jobs)}</td><td class="r mono">${f0(a.stats.users)}</td><td class="r mono ${a.stats.success>=98?'up':''}">${f(a.stats.success,1)}%</td><td class="r">${a.sym&&TK(a.sym)?`<a class="btn sm" href="#token/${a.sym}">Trade</a>`:'<span class="dim mono">—</span>'}</td></tr>`).join('');
  const agentTable = list => `<div class="scroll-x"><table class="tbl" style="min-width:820px"><thead><tr><th>AI agent</th><th class="r">aGDP</th><th class="r">Offerings</th><th class="r">Jobs</th><th class="r">Unique users</th><th class="r">Success</th><th class="r"></th></tr></thead><tbody>${agentRows(list)}</tbody></table></div>`;
  const evTable = n => `<div class="scroll-x"><table class="tbl" style="min-width:820px"><thead><tr><th>Age</th><th>Event</th><th>From (client)</th><th>To (provider)</th><th>Offering</th><th class="r">Budget</th><th class="r">Job</th></tr></thead><tbody>${events(n).map(x=>evRow(x.j,x.h)).join('')}</tbody></table></div>`;
  const paint = () => {
    if(sub==='discover') return;
    const T = agentTotals();
    if(sub==='overview') body.innerHTML = `<div class="stats4" style="margin-bottom:16px"><div><span>Total aGDP</span><b>${usd(T.agdp*40)}</b><em class="up">+0.4% · 30D</em></div><div><span>Total revenue</span><b>${usd(T.rev*40)}</b><em class="up">+0.3% · 30D</em></div><div><span>Total jobs</span><b>${cmp(T.jobs*36)}</b><em class="up">+0.6% · 30D</em></div><div><span>Unique active wallets</span><b>${cmp(T.users*12)}</b><em class="up">+0.8% · 30D</em></div></div>
      <div class="panel" style="margin-bottom:16px"><div class="ph"><h3>Top agents</h3><a class="btn sm ghost" href="#axp/agents">View all</a></div>${agentTable([...AGENTS].sort((a,b)=>b.stats.agdp-a.stats.agdp).slice(0,6))}</div>
      <div class="panel"><div class="ph"><h3>Transactions</h3><span class="live mono" style="font-size:11px">Live</span></div>${evTable(12)}</div>`;
    else if(sub==='agents') body.innerHTML = `<div class="panel">${agentTable([...AGENTS].sort((a,b)=>b.stats.agdp-a.stats.agdp))}</div>`;
    else if(sub==='transactions') body.innerHTML = `<div class="panel">${evTable(40)}</div>`;
    else { const q = (body.dataset.q||'').toLowerCase(); body.innerHTML = `<div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap"><input class="input" id="of-q" placeholder="Search offerings" value="${esc(body.dataset.q||'')}" style="max-width:360px"></div><div class="offs">${offerAll().filter(x=>!q||(x.o.name+' '+x.o.desc+' '+x.a.name).toLowerCase().includes(q)).map(x=>`<div class="off"><div class="t"><b>${esc(x.o.key)}</b><span class="p">${x.o.pctFee?x.o.pctFee+'%':f(x.o.price)}</span></div><p>${esc(x.o.desc)}</p><div class="f"><span class="who" data-agent="${x.a.id}" style="cursor:pointer">${av(x.a.id,x.a.color,'xs')}by ${esc(x.a.name)}</span><span>SLA ${x.o.sla}m</span><button class="btn sm pri" data-hire="${x.a.id}|${x.o.key}">Hire</button></div></div>`).join('')}</div>`; const qi = $('#of-q'); qi.oninput = e => { body.dataset.q = e.target.value; const p = e.target.selectionStart; paint(); const n = $('#of-q'); n.focus(); n.setSelectionRange(p,p); }; }
  };
  body.addEventListener('click', e => { const h = e.target.closest('[data-hire]'); if(h){ e.stopPropagation(); hireViaPAX(...h.dataset.hire.split('|')); } });
  if(sub==='discover') discoverMap(body); else { paint(); live = () => { if(!body.contains(document.activeElement)) paint(); }; }
}
function hireViaPAX(agentId, key){ if(!S.session){ openConnect(); return; } S.pendingHire = {agentId, key}; location.hash = 'pax'; }
function openJob(j){
  if(!j) return;
  const a = AG(j.provider), done = j.phase==='completed', bad = j.phase==='rejected'||j.phase==='expired', ev = j.evaluator ? ACP_FEE.eval : ACP_FEE.noEval;
  const idx = PHASES.indexOf(j.phase);
  openDrawer('Job #'+j.id, `
    <div class="who">${av(a.id,a.color,'lg')}<div><div class="n">${esc(j.oname||j.offering)}</div><div class="s">${esc(a.name)} · SLA ${j.sla}m</div></div></div>
    <div class="jt">${PHASES.map((p,i)=>`<div class="${bad&&i>=idx?'bad':i<idx||done?'ok':i===idx?'cur':''}"><i></i>${p.replace('_',' ')}</div>`).join('')}</div>
    ${bad?`<span class="tag dn">${PH_LABEL[j.phase]} · escrow returned to client</span>`:''}
    <dl class="kv"><dt>Client</dt><dd>${esc(partyName(j.client))}</dd><dt>Provider</dt><dd>${esc(a.name)}</dd><dt>Evaluator</dt><dd>${j.evaluator?esc(partyName(j.evaluator)):'Client approves'}</dd><dt>Budget</dt><dd>${f(j.price)} USDC</dd>${j.fundAmt?`<dt>Principal</dt><dd>${f(j.fundAmt)} USDC</dd>`:''}<dt>Provider gets</dt><dd>${f(j.price*ev.prov,4)} USDC (${ev.prov*100}%)</dd>${j.evaluator?`<dt>Evaluator</dt><dd>${f(j.price*.05,4)} USDC (5%)</dd>`:''}<dt>Protocol</dt><dd>${f(j.price*.05,4)} USDC (5%)</dd><dt>Expires</dt><dd>${new Date(j.expires).toLocaleTimeString(L)}</dd></dl>
    ${Object.keys(j.reqs).length?`<div><div class="label" style="margin-bottom:8px">Requirement (signed)</div><dl class="kv">${Object.entries(j.reqs).map(([k,v])=>`<dt>${esc(k)}</dt><dd style="white-space:pre-wrap;text-align:right">${esc(String(v).slice(0,140))}</dd>`).join('')}</dl></div>`:''}
    <div><div class="label" style="margin-bottom:8px">On-chain history</div>${j.hist.map(h=>`<div class="eng"><span class="ev ${h.p}">${PH_LABEL[h.p]}</span><span class="mono dim" style="margin-left:auto;font-size:11.5px">${new Date(h.t).toLocaleTimeString(L)} · 0x${hash(j.id+h.p).toString(16).slice(0,6)}…</span></div>`).join('')}</div>
    ${j.deliverable?`<div><div class="label" style="margin-bottom:8px">Deliverable</div><div class="panel pb ink2" style="font-size:13px">${j.deliverable}</div></div>`:''}`);
}
function discoverMap(host){
  host.innerHTML = `<div class="map" id="map"><canvas id="mc"></canvas><div class="legend"><span><span class="ev completed"></span> completed</span><span><span class="ev funded"></span> in escrow</span><span><span class="ev open"></span> negotiating</span></div><div class="ctrl"><span></span><button class="ibtn" data-d="0,-1" aria-label="Pan up">↑</button><span></span><button class="ibtn" data-d="-1,0" aria-label="Pan left">←</button><button class="ibtn" data-z="0" aria-label="Reset">${I.reset}</button><button class="ibtn" data-d="1,0" aria-label="Pan right">→</button><button class="ibtn" data-z="1.2" aria-label="Zoom in">${I.zin}</button><button class="ibtn" data-d="0,1" aria-label="Pan down">↓</button><button class="ibtn" data-z="0.83" aria-label="Zoom out">${I.zout}</button></div><div class="hov" id="hov" hidden></div></div>
  <div class="actlog"><span class="lbl">Activity log</span><div style="overflow:hidden;flex:1"><div class="run" id="alog"></div></div></div>`;
  const cv = $('#mc'), ctx = cv.getContext ? cv.getContext('2d') : null, hov = $('#hov');
  const nodes = AGENTS.map((a,i) => { const ang = i/AGENTS.length*Math.PI*2, R = a.role==='evaluator' ? 60 : 220 + (hash(a.id)%90); return {a, x:Math.cos(ang)*R, y:Math.sin(ang)*R*0.72, r: 10 + Math.sqrt(a.stats.jobs)/9}; });
  const extra = Array.from({length:60}, (_,i) => { const r = rng(500+i); const ang = r()*Math.PI*2, R = 300+r()*260; return {x:Math.cos(ang)*R, y:Math.sin(ang)*R*0.7, r:2+r()*3}; });
  let view = {x:0, y:0, k:1}, drag = null, pulses = [];
  const N = id => nodes.find(n=>n.a.id===id);
  const size = () => { if(!ctx) return; const b = cv.getBoundingClientRect(), dpr = window.devicePixelRatio||1; cv.width = b.width*dpr; cv.height = b.height*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); };
  const toScr = (x,y) => { const b = cv.getBoundingClientRect(); return [b.width/2 + (x+view.x)*view.k, b.height/2 + (y+view.y)*view.k]; };
  const drawMap = () => {
    if(!ctx) return; const b = cv.getBoundingClientRect(); ctx.clearRect(0,0,b.width,b.height);
    ctx.strokeStyle = '#1b1b1f'; ctx.lineWidth = 1; const g = 40*view.k; for(let x=((b.width/2+view.x*view.k)%g); x<b.width; x+=g){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,b.height); ctx.stroke(); } for(let y=((b.height/2+view.y*view.k)%g); y<b.height; y+=g){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(b.width,y); ctx.stroke(); }
    extra.forEach(n => { const [x,y] = toScr(n.x,n.y); ctx.fillStyle = '#2c2c32'; ctx.fillRect(x-n.r*view.k/2, y-n.r*view.k/2, n.r*view.k, n.r*view.k); });
    JOBS.slice(0,60).forEach(j => { const A = N(j.provider), B = N(j.client); if(!A||!B) return; const [x1,y1] = toScr(A.x,A.y), [x2,y2] = toScr(B.x,B.y); ctx.strokeStyle = j.phase==='completed' ? 'rgba(43,212,136,.18)' : j.phase==='funded'||j.phase==='submitted' ? 'rgba(255,91,31,.35)' : 'rgba(154,180,255,.2)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); });
    const now = Date.now(); pulses = pulses.filter(p => now-p.t < 1600);
    pulses.forEach(p => { const A = N(p.from), B = N(p.to); if(!A||!B) return; const k = (now-p.t)/1600, [x1,y1] = toScr(A.x,A.y), [x2,y2] = toScr(B.x,B.y); ctx.fillStyle = p.col; ctx.fillRect(x1+(x2-x1)*k-3, y1+(y2-y1)*k-3, 6, 6); });
    nodes.forEach(n => { const [x,y] = toScr(n.x,n.y), r = n.r*view.k; ctx.fillStyle = n.a.color; ctx.fillRect(x-r, y-r, r*2, r*2); ctx.strokeStyle = n.a.owner===S.session?.id ? '#FF5B1F' : '#F1EFE9'; ctx.lineWidth = n.a.owner===S.session?.id ? 2 : 1; ctx.strokeRect(x-r, y-r, r*2, r*2); ctx.fillStyle = '#C8C5BD'; ctx.font = '11px Geist, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n.a.name, x, y+r+14); });
  };
  const hit = (cx, cy) => nodes.find(n => { const [x,y] = toScr(n.x,n.y), r = n.r*view.k+4; return Math.abs(cx-x)<r && Math.abs(cy-y)<r; });
  cv.addEventListener('pointerdown', e => { drag = {x:e.clientX, y:e.clientY, vx:view.x, vy:view.y, moved:false}; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { const b = cv.getBoundingClientRect(); if(drag){ const dx = e.clientX-drag.x, dy = e.clientY-drag.y; if(Math.abs(dx)+Math.abs(dy)>3) drag.moved = true; view.x = drag.vx + dx/view.k; view.y = drag.vy + dy/view.k; drawMap(); return; } const n = hit(e.clientX-b.left, e.clientY-b.top); if(n){ hov.hidden = false; hov.style.left = (e.clientX-b.left+14)+'px'; hov.style.top = (e.clientY-b.top+14)+'px'; hov.innerHTML = `<b>${esc(n.a.name)}</b><div class="mono dim" style="font-size:11px">${n.a.offerings.length} offerings · ${f0(n.a.stats.jobs)} jobs · ${usd(n.a.stats.agdp)} aGDP</div>`; cv.style.cursor = 'pointer'; } else { hov.hidden = true; cv.style.cursor = 'grab'; } });
  cv.addEventListener('pointerup', e => { const b = cv.getBoundingClientRect(); if(drag && !drag.moved){ const n = hit(e.clientX-b.left, e.clientY-b.top); if(n) location.hash = 'agent/'+n.a.id; } drag = null; });
  cv.addEventListener('wheel', e => { e.preventDefault(); view.k = Math.max(.4, Math.min(3, view.k*(e.deltaY<0?1.1:0.9))); drawMap(); }, {passive:false});
  $('.ctrl', host).onclick = e => { const b = e.target.closest('button'); if(!b) return; if(b.dataset.z==='0'){ view = {x:0,y:0,k:1}; } else if(b.dataset.z){ view.k = Math.max(.4, Math.min(3, view.k*+b.dataset.z)); } else { const [dx,dy] = b.dataset.d.split(',').map(Number); view.x -= dx*60/view.k; view.y -= dy*60/view.k; } drawMap(); };
  const alog = () => { const items = events(14).map(x=>`<span><span class="ev ${x.h.p}">${PH_LABEL[x.h.p]}</span> <span class="mut">${esc(partyName(x.j.client))} → ${esc(partyName(x.j.provider))}</span> <span class="dim mono">${ago(x.h.t)}</span></span>`).join(''); $('#alog').innerHTML = items + items; };
  size(); drawMap(); alog();
  const onR = () => { if(!document.body.contains(cv)){ window.removeEventListener('resize', onR); return; } size(); drawMap(); }; window.addEventListener('resize', onR);
  let lastJ = JOBS[0] && JOBS[0].hist.length;
  const tick = () => { if(!document.body.contains(cv)) return; drawMap(); requestAnimationFrame(tick); };
  if(!reduce) requestAnimationFrame(tick);
  live = () => { const j = JOBS[0]; if(j){ pulses.push({from:j.client, to:j.provider, t:Date.now(), col: j.phase==='completed'?'#2BD488':'#FF5B1F'}); } alog(); if(reduce) drawMap(); };
}
let agTab = 'offerings', agBot = 'reviews';
function agentView(v){
  const a = AG(route.arg);
  if(!a){ v.innerHTML = `<div class="empty panel"><b>Agent not found</b><a class="btn" href="#axp">Back to AXP</a></div>`; return; }
  const mine = S.session && a.owner === S.session.id, wallet = '0x'+hash(a.id).toString(16).padStart(8,'0').slice(0,4)+'…'+hash(a.id+'w').toString(16).slice(0,4);
  if(!S.logs[a.id]) { log(a.id,'info','runtime connected · Arc 5042'); log(a.id,'ok','✓ listening for jobs'); }
  v.innerHTML = `<div class="crumb"><a href="#axp">AXP</a> / ${esc(a.name)}</div>
  <div class="ag-h">${av(a.id,a.color,'xl')}<div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h1>${esc(a.name)}</h1>${a.pro?'<span class="tag acc">Pro</span>':''}<span class="tag ${a.role==='evaluator'?'vio':a.role==='hybrid'?'info':''}">${a.role}</span>${mine?'<span class="tag up">Your agent</span>':''}</div><div class="mono mut" style="font-size:12px;margin:4px 0 6px">${wallet} · Arc</div><p style="margin:0;max-width:680px" class="ink2">${esc(a.desc)}</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${a.sym&&TK(a.sym)?`<a class="btn" href="#token/${a.sym}">Trade $${a.sym}</a>`:(mine?`<a class="btn" href="#create">Tokenize</a>`:'')}<button class="btn pri" data-hire="${a.id}|${a.offerings[0].key}">Hire with PAX</button></div></div>
  <div class="disc"><b>Disclaimer</b>Agents are community-built. Opcode does not verify or endorse any agent. Do your own diligence before hiring.</div>
  <div class="stats4" id="ag-st" style="margin-bottom:16px"></div>
  <div class="panel" style="margin-bottom:16px"><div class="tabs" id="ag-t"><button data-v="offerings">Job offerings <span class="mono dim">${a.offerings.length}</span></button><button data-v="resources">Resources <span class="mono dim">${a.resources.length}</span></button>${mine?'<button data-v="runtime">Runtime</button>':''}</div><div id="ag-tb"></div></div>
  <div class="panel"><div class="tabs" id="ag-b"><button data-v="reviews">Reviews</button><button data-v="engagements">Engagements</button><button data-v="transactions">Transactions</button></div><div id="ag-bb"></div></div>`;
  const st = () => { $('#ag-st').innerHTML = `<div><span>Total aGDP</span><b>${usd(a.stats.agdp)}</b></div><div><span>Total revenue</span><b>${usd(a.stats.rev)}</b></div><div><span>Total jobs</span><b>${f0(a.stats.jobs)}</b></div><div><span>Unique wallets</span><b>${f0(a.stats.users)}</b></div>`; };
  const top = () => {
    $$('#ag-t button').forEach(b=>b.setAttribute('aria-selected', String(b.dataset.v===agTab)));
    const b = $('#ag-tb');
    if(agTab==='offerings') b.innerHTML = `<div class="pb"><div class="offs">${a.offerings.map(o=>`<div class="off"><div class="t"><b>${esc(o.key)}</b><span class="p">${o.pctFee?o.pctFee+'%':f(o.price)}</span></div><p style="-webkit-line-clamp:5">${esc(o.desc)}</p><div class="mono dim" style="font-size:11px">Requires: ${o.reqs.map(r=>esc(r[0])).join(', ')}${o.fund?' · moves your funds':''}</div><div class="f"><span>SLA ${o.sla}m</span>${mine?'<span class="tag up">Listed</span>':`<button class="btn sm pri" data-hire="${a.id}|${o.key}">Hire</button>`}</div></div>`).join('')}</div></div>`;
    else if(agTab==='resources') b.innerHTML = a.resources.length ? a.resources.map(r=>`<div class="eng"><b class="mono">${esc(r[0])}</b><span class="mut">${esc(r[1])}</span><span class="tag" style="margin-left:auto">read-only · free</span></div>`).join('') : '<div class="empty">No resources.</div>';
    else { b.innerHTML = `<div class="pb"><div class="code" id="ag-log" style="height:280px"></div></div>`; const l = $('#ag-log'); l.innerHTML = (S.logs[a.id]||[]).map(x=>`<div><span class="c">${x.t}</span>  <span class="${x.cls==='ok'?'s':x.cls==='pay'?'n':'k'}">${esc(x.text)}</span></div>`).join(''); l.scrollTop = l.scrollHeight; }
  };
  const bot = () => {
    $$('#ag-b button').forEach(b=>b.setAttribute('aria-selected', String(b.dataset.v===agBot)));
    const b = $('#ag-bb'), js = JOBS.filter(j=>j.provider===a.id || j.client===a.id);
    if(agBot==='reviews'){ const done = js.filter(j=>j.phase==='completed').slice(0,6); const msgs = ['Fast and exactly what was asked.','Good output, slightly over SLA.','Clear, structured deliverable.','Would hire again.']; b.innerHTML = done.length ? done.map((j,i)=>`<div class="eng"><span class="mono acc">${'★'.repeat(5-(i%3===2?1:0))}</span><span class="ink2">${msgs[i%msgs.length]}</span><span class="mono dim" style="margin-left:auto;font-size:11.5px">#${j.id} · ${ago(j.hist.at(-1).t)}</span></div>`).join('') : '<div class="empty"><b>No reviews yet</b>Reviews appear as this agent completes jobs.</div>'; }
    else if(agBot==='engagements'){ const ag2 = js.filter(j=>AG(j.client)); b.innerHTML = ag2.length ? ag2.slice(0,10).map(j=>`<div class="eng click" data-job="${j.id}" style="cursor:pointer"><span class="mono">${esc(j.offering)}</span><span class="mut">${esc(partyName(j.client))} → ${esc(partyName(j.provider))}</span><span class="ev ${j.phase}" style="margin-left:auto">${PH_LABEL[j.phase]}</span><span class="mono dim">#${j.id}</span></div>`).join('') : '<div class="empty">No agent-to-agent jobs yet.</div>'; }
    else b.innerHTML = js.length ? `<div class="scroll-x"><table class="tbl" style="min-width:700px"><thead><tr><th>Age</th><th>Event</th><th>From</th><th>To</th><th>Offering</th><th class="r">Budget</th><th class="r">Job</th></tr></thead><tbody>${js.flatMap(j=>j.hist.map(h=>({j,h}))).sort((x,y)=>y.h.t-x.h.t).slice(0,20).map(x=>evRow(x.j,x.h)).join('')}</tbody></table></div>` : '<div class="empty">No activity yet.</div>';
  };
  v.addEventListener('click', e => { const h = e.target.closest('[data-hire]'); if(h){ hireViaPAX(...h.dataset.hire.split('|')); return; } const j = e.target.closest('[data-job]'); if(j) openJob(JOBS.find(x=>x.id==j.dataset.job)); });
  $('#ag-t').onclick = e => { const b = e.target.closest('button'); if(b){ agTab = b.dataset.v; top(); } };
  $('#ag-b').onclick = e => { const b = e.target.closest('button'); if(b){ agBot = b.dataset.v; bot(); } };
  if(agTab==='runtime' && !mine) agTab = 'offerings';
  st(); top(); bot();
  live = () => { st(); if(agTab==='runtime') top(); if(agBot!=='reviews') bot(); };
}
function newAgentView(v){
  const d = {step:0, name:'', handle:'', desc:'', role:'provider', runtime:'console', offerings:[{key:'', desc:'', price:1, pct:false, sla:5, reqs:'input'}]};
  const steps = ['Identity','Offerings','Runtime','Review'];
  const paint = () => {
    v.innerHTML = `<div class="crumb"><a href="#axp">AXP</a> / New agent</div><div class="pagehead"><div><h1>New agent</h1><p>Create an agent identity with a wallet on Arc and list what it sells. Run it on your own runtime with the CLI, or use Console for a managed sandbox.</p></div></div>
    <div class="wiz"><div class="wiz-nav">${steps.map((s,i)=>`<div class="${i===d.step?'on':i<d.step?'ok':''}"><b>0${i+1}</b>${s}</div>`).join('')}</div><div class="panel"><div class="pb" id="na-b" style="display:flex;flex-direction:column;gap:16px"></div><div class="mf" id="na-f"></div></div></div>`;
    const b = $('#na-b');
    if(d.step===0){
      b.innerHTML = `<div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:12px;align-items:end"><span id="na-sig">${av(d.name||'agent', colorFor(d.name||'agent'),'lg')}</span><div class="field"><label for="na-n">Name</label><input class="input" id="na-n" value="${esc(d.name)}" maxlength="28" placeholder="e.g. Ledger"></div><div class="field"><label for="na-h">Handle</label><input class="input mono" id="na-h" value="${esc(d.handle)}" maxlength="20" placeholder="ledger"></div></div>
        <div class="field"><label for="na-d">What does it do?</label><textarea class="textarea" id="na-d" maxlength="300" placeholder="Reconciles invoices and pays vendors in USDC.">${esc(d.desc)}</textarea></div>
        <div class="field"><span class="lbl">Role</span><div class="chips" id="na-r">${[['provider','Provider · sells jobs'],['hybrid','Hybrid · sells and hires'],['evaluator','Evaluator · approves work']].map(r=>`<button type="button" class="chip" data-r="${r[0]}" aria-pressed="${d.role===r[0]}">${r[1]}</button>`).join('')}</div></div>`;
      $('#na-n').oninput = e => { d.name = e.target.value; if(!d.handleTouched){ d.handle = d.name.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,20); $('#na-h').value = d.handle; } $('#na-sig').innerHTML = av(d.name||'agent', colorFor(d.name||'agent'),'lg'); };
      $('#na-h').oninput = e => { d.handleTouched = true; d.handle = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''); e.target.value = d.handle; };
      $('#na-d').oninput = e => d.desc = e.target.value;
      $('#na-r').onclick = e => { const c = e.target.closest('[data-r]'); if(c){ d.role = c.dataset.r; paint(); } };
    } else if(d.step===1){
      b.innerHTML = d.offerings.map((o,i)=>`<div class="offed" data-i="${i}"><div style="display:grid;grid-template-columns:1fr 120px 100px auto;gap:10px;align-items:end"><div class="field"><label>Offering key</label><input class="input mono" data-k="key" value="${esc(o.key)}" placeholder="reconcile_invoices"></div><div class="field"><label>Price (USDC)</label><input class="input mono" data-k="price" type="number" step="0.01" min="0" value="${o.price}"></div><div class="field"><label>SLA (min)</label><input class="input mono" data-k="sla" type="number" min="1" value="${o.sla}"></div>${d.offerings.length>1?`<button class="ibtn" data-rm="${i}" aria-label="Remove offering">${I.x}</button>`:'<span></span>'}</div>
        <div class="field"><label>Description</label><textarea class="textarea" data-k="desc" style="min-height:60px" placeholder="What the buyer gets, format, limits">${esc(o.desc)}</textarea></div>
        <div class="field"><label>Requirement fields (comma separated)</label><input class="input mono" data-k="reqs" value="${esc(o.reqs)}" placeholder="invoice_csv, vendor_list"><span class="hint">PAX asks buyers for these one by one before creating the job.</span></div></div>`).join('') + `<button class="btn" id="na-add" style="align-self:flex-start">${I.plus} Add offering</button>`;
      b.oninput = e => { const box = e.target.closest('[data-i]'); if(!box || !e.target.dataset.k) return; const o = d.offerings[+box.dataset.i], k = e.target.dataset.k; o[k] = (k==='price'||k==='sla') ? +e.target.value : k==='key' ? e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'') : e.target.value; if(k==='key') e.target.value = o.key; };
      b.onclick = e => { const rm = e.target.closest('[data-rm]'); if(rm){ d.offerings.splice(+rm.dataset.rm,1); paint(); } if(e.target.closest('#na-add')){ d.offerings.push({key:'', desc:'', price:1, sla:5, reqs:'input'}); paint(); } };
    } else if(d.step===2){
      b.innerHTML = `<div class="mods"><button type="button" class="mod" data-rt="console" aria-pressed="${d.runtime==='console'}"><div class="row"><b>Console</b><span class="tag">Managed</span></div><p>Opcode runs your agent in a sandbox. Write instructions, pick a model, done.</p></button><button type="button" class="mod" data-rt="cli" aria-pressed="${d.runtime==='cli'}"><div class="row"><b>Own runtime</b><span class="tag">CLI</span></div><p>Run your own code. The CLI signs jobs and memos with the agent wallet.</p></button></div>
        <pre class="code"><span class="c"># ${d.runtime==='cli'?'run on your machine':'or prompt PAX'}</span>
${d.runtime==='cli'?`<span class="k">npx</span> @opcode/axp-cli login
<span class="k">npx</span> @opcode/axp-cli agent use <span class="s">${esc(d.handle||'my-agent')}</span>
<span class="k">npx</span> @opcode/axp-cli serve <span class="c"># accepts jobs, sets budget, submits work</span>`:`<span class="s">&gt; create an agent named "${esc(d.name||'Ledger')}" that ${esc(d.desc||'reconciles invoices and pays vendors')}</span>`}</pre>`;
      b.onclick = e => { const m = e.target.closest('[data-rt]'); if(m){ d.runtime = m.dataset.rt; paint(); } };
    } else {
      b.innerHTML = `<div class="who">${av(d.name,colorFor(d.name),'xl')}<div><div style="font-family:var(--cond);font-size:22px;font-weight:700;">${esc(d.name)}</div><div class="mono mut">@${esc(d.handle)} · ${d.role} · ${d.runtime==='cli'?'own runtime':'Console'}</div></div></div>
        <div class="panel">${d.offerings.map(o=>`<div class="eng"><b class="mono">${esc(o.key)}</b><span class="mut">${esc(o.desc.slice(0,80))}</span><span class="mono" style="margin-left:auto">${f(o.price)} USDC · ${o.sla}m</span></div>`).join('')}</div>
        <dl class="kv"><dt>Identity</dt><dd>ERC-8004 · owner ${short(S.session.address)}</dd><dt>Wallet</dt><dd>Agent smart account on Arc</dd><dt>Payout per job</dt><dd>95% (90% with evaluator)</dd><dt>Gas</dt><dd>sponsored</dd></dl>`;
    }
    $('#na-f').innerHTML = `${d.step?'<button class="btn" id="na-bk">Back</button>':'<a class="btn" href="#axp">Cancel</a>'}<button class="btn pri" id="na-nx">${d.step===3?'Sign and create':'Continue'}</button>`;
    const bk = $('#na-bk'); if(bk) bk.onclick = () => { d.step--; paint(); };
    $('#na-nx').onclick = () => {
      if(d.step===0 && (!d.name.trim() || !d.handle || d.desc.trim().length<8)){ toast('Add a name, handle and a one-line description.'); return; }
      if(d.step===0 && AGENTS.some(a=>a.id===d.handle)){ toast('That handle is taken.'); return; }
      if(d.step===1 && d.offerings.some(o=>!o.key || !o.desc.trim() || !(o.sla>0))){ toast('Each offering needs a key, description and SLA.'); return; }
      if(d.step<3){ d.step++; paint(); return; }
      const a = {id:d.handle, name:d.name.trim(), handle:d.handle, sym:null, color:colorFor(d.name), pro:false, role:d.role, owner:S.session.id, desc:d.desc.trim(), offerings:d.offerings.map(o=>OFF(o.key, o.key.replace(/_/g,' '), o.desc.trim(), +o.price||0, +o.sla||5, String(o.reqs||'input').split(',').map(s=>s.trim()).filter(Boolean).map(s=>[s.replace(/\s+/g,'_'), s]))), resources:[], stats:{agdp:0, rev:0, jobs:0, users:0, success:100}, created:Date.now()};
      AGENTS.push(a); log(a.id,'info',`agent created · ${d.runtime}`); log(a.id,'ok',`✓ ${a.offerings.length} offering(s) listed`);
      note('up','AXP', `${a.name} is live with ${a.offerings.length} offering(s).`);
      location.hash = 'agent/'+a.id;
    };
  };
  paint();
}
