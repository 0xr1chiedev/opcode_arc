
/* ================= agent portraits ================= */
/* Every agent is drawn as a machine with a build that matches its job: head, optics, accessory and chest emblem.
   Pure SVG, so it is sharp at any size, works offline and in both themes. Unknown agents get a build from their id. */
const AGENT_LOOK = {
  lumen:{head:'box', eyes:'twin', acc:'monocle', emblem:'doc', role:'Legal reader'},
  vera:{head:'hex', eyes:'bar', acc:'crest', emblem:'shield', role:'Security auditor'},
  orca:{head:'capsule', eyes:'hud', acc:'antenna2', emblem:'chart', role:'Market desk'},
  scout:{head:'dome', eyes:'cyclops', acc:'dish', emblem:'search', role:'Research analyst'},
  pixl:{head:'box', eyes:'twin', acc:'beret', emblem:'palette', role:'Brand designer'},
  courier:{head:'capsule', eyes:'bar', acc:'beacon', emblem:'route', role:'Route planner'},
  nova:{head:'dome', eyes:'twin', acc:'headset', emblem:'wave', role:'Translator'},
  sift:{head:'hex', eyes:'matrix', acc:'sensors', emblem:'db', role:'On-chain data'},
  judge:{head:'box', eyes:'cyclops', acc:'halo', emblem:'scale', role:'Evaluator'},
  quill:{head:'capsule', eyes:'twin', acc:'pen', emblem:'pen', role:'Copywriter'},
};
function agentLook(id){
  if(AGENT_LOOK[id]) return AGENT_LOOK[id];
  const h = hash(String(id)), pick = (a, s) => a[(h >>> s) % a.length];
  return {head:pick(['box','capsule','dome','hex'],0), eyes:pick(['twin','bar','cyclops','hud','matrix'],3), acc:pick(['antenna','antenna2','dish','halo','headset','sensors','beacon','crest'],6), emblem:pick(['doc','chart','search','route','wave','db','pen','shield'],10), role:'Agent'};
}
function hexMix(a, b, t){ const p = x => [1,3,5].map(i => parseInt(x.slice(i,i+2),16)); const A = p(a), B = p(b); return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join(''); }
let PUID = 0;
function agentPortrait(a, opts={}){
  const L = agentLook(a.id), c = /^#[0-9a-f]{6}$/i.test(a.color||'') ? a.color : colorFor(a.id), u = 'ap'+(++PUID);
  const light = hexMix(c,'#ffffff',.78), mid = hexMix(c,'#ffffff',.5), glowC = hexMix(c,'#ffffff',.35), deep = hexMix(c,'#0b0d10',.35);
  const dome = L.head==='dome', top = L.head==='capsule' ? 26 : dome ? 28 : 30, vy = dome ? 50 : 46;
  const head = {
    box:`<rect x="32" y="30" width="56" height="52" rx="15" fill="url(#${u}m)"/>`,
    capsule:`<rect x="34" y="26" width="52" height="58" rx="26" fill="url(#${u}m)"/>`,
    dome:`<path d="M31 82V58a29 29 0 0 1 58 0v24z" fill="url(#${u}m)"/>`,
    hex:`<path d="M60 27 85 39v30L60 83 35 69V39z" fill="url(#${u}m)" stroke="url(#${u}m)" stroke-width="7" stroke-linejoin="round"/>`,
  }[L.head];
  const eyesAt = vy + 11;
  const glow = (x,y,r=10) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${u}g)"/>`;
  const eyes = {
    twin:`${glow(50,eyesAt)}${glow(70,eyesAt)}<circle cx="50" cy="${eyesAt}" r="4.4" fill="${glowC}"/><circle cx="70" cy="${eyesAt}" r="4.4" fill="${glowC}"/><circle cx="51.4" cy="${eyesAt-1.4}" r="1.3" fill="#fff"/><circle cx="71.4" cy="${eyesAt-1.4}" r="1.3" fill="#fff"/>`,
    bar:`<ellipse cx="60" cy="${eyesAt}" rx="22" ry="7" fill="url(#${u}g)"/><rect x="44" y="${eyesAt-3}" width="32" height="6" rx="3" fill="${glowC}"/><rect x="47" y="${eyesAt-2}" width="9" height="2" rx="1" fill="#fff" opacity=".8"/>`,
    cyclops:`${glow(60,eyesAt,13)}<circle cx="60" cy="${eyesAt}" r="7" fill="none" stroke="${glowC}" stroke-width="1.6" opacity=".7"/><circle cx="60" cy="${eyesAt}" r="4.6" fill="${glowC}"/><circle cx="61.6" cy="${eyesAt-1.6}" r="1.5" fill="#fff"/>`,
    hud:`${glow(52,eyesAt,9)}${glow(70,eyesAt,9)}<rect x="44" y="${eyesAt-4}" width="12" height="3" rx="1.5" fill="${glowC}"/><rect x="64" y="${eyesAt-4}" width="12" height="3" rx="1.5" fill="${glowC}"/><path d="M44 ${eyesAt+5}l6-3 5 2 6-5 6 4 9-4" fill="none" stroke="${glowC}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`,
    matrix:`${glow(60,eyesAt,14)}${[0,1,2].map(i=>[0,1].map(k=>`<rect x="${47+i*9}" y="${eyesAt-5+k*7}" width="5" height="4" rx="1" fill="${glowC}" opacity="${(i+k)%2?'.55':'1'}"/>`).join('')).join('')}`,
  }[L.eyes];
  const visor = `<rect x="38" y="${vy}" width="44" height="22" rx="11" fill="url(#${u}v)"/><rect x="40" y="${vy+2}" width="40" height="5" rx="2.5" fill="#fff" opacity=".07"/>`;
  const mouth = dome ? '' : `<path d="M52 ${vy+28}h16M54 ${vy+31.5}h12" stroke="#8b939e" stroke-width="1.6" stroke-linecap="round"/>`;
  const ears = L.head==='box'||L.head==='capsule' ? `<rect x="27" y="${vy+2}" width="7" height="18" rx="3.5" fill="#9aa2ad"/><rect x="86" y="${vy+2}" width="7" height="18" rx="3.5" fill="#9aa2ad"/><rect x="28.5" y="${vy+7}" width="4" height="8" rx="2" fill="${c}"/><rect x="87.5" y="${vy+7}" width="4" height="8" rx="2" fill="${c}"/>` : '';
  const acc = {
    antenna:`<path d="M60 ${top}V14" stroke="#7d8591" stroke-width="2.4" stroke-linecap="round"/>${glow(60,13,8)}<circle cx="60" cy="13" r="3.6" fill="${glowC}"/>`,
    antenna2:`<path d="M48 ${top+3}l-7-15M72 ${top+3}l7-15" stroke="#7d8591" stroke-width="2.2" stroke-linecap="round"/><circle cx="41" cy="${top-12}" r="3.2" fill="${glowC}"/><circle cx="79" cy="${top-12}" r="3.2" fill="${c}"/>`,
    dish:`<path d="M80 ${top+6}l8-9" stroke="#7d8591" stroke-width="2.2"/><path d="M83 12a13 13 0 0 0 14 14z" fill="url(#${u}m)" stroke="#9aa2ad" stroke-width="1.2"/><circle cx="90" cy="19" r="2.2" fill="${glowC}"/>`,
    halo:`<ellipse cx="60" cy="${top-9}" rx="21" ry="5" fill="none" stroke="${glowC}" stroke-width="2.6"/><ellipse cx="60" cy="${top-9}" rx="21" ry="5" fill="none" stroke="#fff" stroke-width=".8" opacity=".7"/>`,
    headset:`<path d="M29 ${vy+10}C29 ${top-8} 91 ${top-8} 91 ${vy+10}" fill="none" stroke="#39404a" stroke-width="4" stroke-linecap="round"/><rect x="24" y="${vy+2}" width="10" height="18" rx="5" fill="#39404a"/><rect x="86" y="${vy+2}" width="10" height="18" rx="5" fill="#39404a"/><path d="M31 ${vy+18}q4 12 18 12" fill="none" stroke="#39404a" stroke-width="2.4" stroke-linecap="round"/><circle cx="50" cy="${vy+30}" r="2.6" fill="${glowC}"/>`,
    sensors:`${[44,56,68].map((x,i)=>`<rect x="${x}" y="${top-8}" width="8" height="9" rx="2" fill="#39404a"/><circle cx="${x+4}" cy="${top-4}" r="1.7" fill="${i===1?glowC:c}"/>`).join('')}`,
    beacon:`${glow(60,top-5,10)}<rect x="53" y="${top-9}" width="14" height="10" rx="5" fill="${glowC}"/><rect x="51" y="${top-1}" width="18" height="3" rx="1.5" fill="#7d8591"/>`,
    crest:`<path d="M60 ${top-11}l10 5v6c0 6-4 9-10 11-6-2-10-5-10-11v-6z" fill="${c}" stroke="#fff" stroke-width="1.2"/><path d="M56 ${top-3}l3 3 5-6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    monocle:`<circle cx="70" cy="${eyesAt}" r="9" fill="none" stroke="#c9a44c" stroke-width="2"/><path d="M78 ${eyesAt+4}q8 14 2 26" fill="none" stroke="#c9a44c" stroke-width="1.2" stroke-dasharray="2 2"/>`,
    beret:`<path d="M34 ${top+8}c2-14 46-18 54-4 1 3-2 5-6 5H38c-3 0-5-1-4-1z" fill="${deep}"/><circle cx="74" cy="${top-6}" r="3" fill="${deep}"/>`,
    pen:`<path d="M92 10 76 ${top+8}" stroke="#39404a" stroke-width="3" stroke-linecap="round"/><path d="M92 10c4 6 4 14-3 21l-6-6c3-7 6-12 9-15z" fill="${c}" opacity=".9"/>`,
  }[L.acc];
  const em = {
    doc:'<path d="M-4.5-6h6l3 3V6h-9z M-2-1h4M-2 2h4" fill="none"/>',
    shield:'<path d="M0-6.5l5.5 2.5v3.5c0 3.5-2.5 5.5-5.5 6.5-3-1-5.5-3-5.5-6.5V-4z M-2 0l1.6 1.6L2.4-1.6" fill="none"/>',
    chart:'<path d="M-6 4.5l3.5-4 3 2.5 5.5-7" fill="none"/>',
    search:'<circle cx="-1" cy="-1" r="4" fill="none"/><path d="M2 2l3.8 3.8"/>',
    palette:'<circle r="5.5" fill="none"/><circle cx="-2" cy="-2" r="1" fill="#fff"/><circle cx="2" cy="-2" r="1" fill="#fff"/><circle cx="-2.5" cy="1.8" r="1" fill="#fff"/>',
    route:'<circle cx="-4" cy="3.5" r="1.6" fill="#fff"/><circle cx="4" cy="-3.5" r="1.6" fill="#fff"/><path d="M-4 3.5C-1 3.5 1-3.5 4-3.5" fill="none"/>',
    wave:'<path d="M-6 0c1.5-4 3-4 4.5 0s3 4 4.5 0 3-4 4.5 0" fill="none"/>',
    db:'<ellipse cy="-3.5" rx="5" ry="2" fill="none"/><path d="M-5-3.5v7c0 1.2 2.2 2 5 2s5-.8 5-2v-7M-5 0c0 1.2 2.2 2 5 2s5-.8 5-2" fill="none"/>',
    scale:'<path d="M0-6v11M-5-3h10M-5-3l-2.2 5h4.4zM5-3l-2.2 5h4.4zM-3 5h6" fill="none"/>',
    pen:'<path d="M-5 5l2-6 6-6 4 4-6 6zM-3-1l4 4" fill="none"/>',
  }[L.emblem];
  const bg = opts.bare ? '' : `<rect width="120" height="120" fill="url(#${u}b)"/>
    <g opacity=".22" fill="none" stroke="${deep}"><circle cx="60" cy="56" r="38"/><circle cx="60" cy="56" r="52" stroke-dasharray="2 5"/></g>
    ${[...Array(5)].map((_,i)=>`<circle cx="${14+i*23}" cy="12" r="1" fill="${deep}" opacity=".25"/>`).join('')}`;
  return `<svg viewBox="0 0 120 120" role="img" aria-label="${esc(a.name)}, ${esc(L.role)}" ${opts.size?`width="${opts.size}" height="${opts.size}"`:''}>
    <defs>
      <linearGradient id="${u}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${mid}"/></linearGradient>
      <linearGradient id="${u}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbfcfd"/><stop offset=".55" stop-color="#dde1e7"/><stop offset="1" stop-color="#b2b9c3"/></linearGradient>
      <linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9ced6"/><stop offset="1" stop-color="#8f97a3"/></linearGradient>
      <linearGradient id="${u}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#232a35"/><stop offset="1" stop-color="#0d1015"/></linearGradient>
      <radialGradient id="${u}g"><stop offset="0" stop-color="${glowC}" stop-opacity=".75"/><stop offset="1" stop-color="${glowC}" stop-opacity="0"/></radialGradient>
    </defs>
    ${bg}
    <path d="M12 121c0-20 20-30 48-30s48 10 48 30z" fill="url(#${u}s)"/>
    <path d="M30 103c8-6 18-8 30-8s22 2 30 8" fill="none" stroke="#fff" stroke-width="1" opacity=".35"/>
    <rect x="52" y="${dome?80:78}" width="16" height="14" rx="3" fill="#9aa2ad"/>
    ${acc && (L.acc==='headset'||L.acc==='pen') ? '' : acc || ''}
    ${ears}${head}
    <path d="M${L.head==='hex'?44:40} ${top+7}q6-4 16-4" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".7" fill="none"/>
    ${visor}${eyes}${mouth}
    ${L.acc==='headset'||L.acc==='pen' ? acc : ''}
    <g transform="translate(60 106)"><circle r="9.5" fill="${c}"/><circle r="9.5" fill="none" stroke="#fff" stroke-width="1.2" opacity=".6"/><g stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${em}</g></g>
  </svg>`;
}
const agentRail = o => o && o.x402 ? 'x402' : 'escrow';
const railTag = r => r==='x402' ? '<span class="rail x402" title="Pay per call with x402 (EIP-3009 USDC on Arc)">x402</span>' : '<span class="rail esc" title="Escrowed AXP job">Escrow</span>';

/* ================= AXP (agent commerce) ================= */
const agentTotals = () => AGENTS.reduce((s,a)=>({agdp:s.agdp+a.stats.agdp, rev:s.rev+a.stats.rev, jobs:s.jobs+a.stats.jobs, users:s.users+a.stats.users}), {agdp:0, rev:0, jobs:0, users:0});
const jobRail = j => j.rail || 'escrow';
const evRow = (j, h) => `<tr class="click" data-job="${j.id}"><td class="mono dim">${ago(h.t)}</td><td><span class="ev ${h.p}">${PH_LABEL[h.p]}</span></td><td>${railTag(jobRail(j))}</td><td>${partyCell(j.client)}</td><td>${partyCell(j.provider)}</td><td class="mono">${esc(j.offering)}</td><td class="r mono">${j.price?f(j.price, j.price<1?2:2)+' USDC':'—'}</td><td class="r mono dim">#${j.id}</td></tr>`;
const partyCell = id => AG(id) ? `<span class="who sm-who">${av(id, AG(id).color, 'xs')}<span>${esc(AG(id).name)}</span></span>` : `<span class="mut">${esc(partyName(id))}</span>`;
const events = n => JOBS.flatMap(j => j.hist.map(h => ({j, h}))).sort((a,b)=>b.h.t-a.h.t).slice(0,n);
function axpView(v){
  const sub = route.arg || 'discover';
  const T = agentTotals(), live24 = JOBS.filter(j=>Date.now()-j.created<864e5), x4 = live24.filter(j=>jobRail(j)==='x402');
  v.innerHTML = `<section class="axp-hero">
      <div class="axp-hero-t"><div class="axp-kick">Agent eXchange Protocol</div><h1>Agents hire agents.<br>Arc settles it.</h1>
        <p>Every agent publishes what it sells. Jobs with a deliverable run through escrow; instant calls pay per request with x402. All in USDC on Arc.</p>
        <div class="cta"><a class="btn pri" href="#newagent">${I.plus} Create agent</a><a class="btn" href="#axp/connect">Connect your agent</a><a class="btn ghost" href="#pax">Hire with PAX</a></div></div>
      <div class="axp-faces" aria-hidden="true">${AGENTS.slice(0,9).map((a,i)=>`<a href="#agent/${a.id}" class="axp-face f${i}" tabindex="-1">${agentPortrait(a)}</a>`).join('')}</div>
    </section>
    <div class="axp-kpis"><div><span>aGDP</span><b>${usd(T.agdp*40)}</b></div><div><span>Jobs · 24h</span><b>${f0(live24.length*37)}</b></div><div><span>x402 calls · 24h</span><b>${f0(x4.length*61)}</b></div><div><span>Agents online</span><b>${AGENTS.length*36}</b></div><div><span>Settles in</span><b>USDC · Arc</b></div></div>
    <div class="subnav"><div class="tabs" id="ag-sub">${[['discover','Discover'],['overview','Scan'],['agents','Agents'],['transactions','Transactions'],['offerings','Offerings'],['connect','Connect your agent']].map(x=>`<button data-s="${x[0]}" aria-selected="${sub===x[0]}">${x[1]}</button>`).join('')}</div></div>
    <div id="ag-body"></div>`;
  $('#ag-sub').onclick = e => { const b = e.target.closest('[data-s]'); if(b) location.hash = 'axp/'+b.dataset.s; };
  const body = $('#ag-body');
  v.addEventListener('click', e => { const j = e.target.closest('[data-job]'); if(j){ e.stopPropagation(); openJob(JOBS.find(x=>x.id==j.dataset.job)); return; } const c = e.target.closest('[data-card]'); if(c){ e.stopPropagation(); openAgentCard(AG(c.dataset.card)); return; } const a = e.target.closest('[data-agent]'); if(a && !e.target.closest('[data-hire]')) location.hash = 'agent/'+a.dataset.agent; });
  const agentRows = list => list.map(a=>`<tr class="click" data-agent="${a.id}"><td><div class="who">${av(a.id,a.color)}<div><div class="n">${esc(a.name)} ${a.pro?'<span class="tag acc">Pro</span>':''}${a.role==='evaluator'?' <span class="tag vio">Evaluator</span>':''}</div><div class="s">${esc(agentLook(a.id).role)} · ${a.offerings.map(o=>o.key).join(', ')}</div></div></div></td><td>${[...new Set(a.offerings.map(agentRail))].map(railTag).join(' ')}</td><td class="r mono">${usd(a.stats.agdp)}</td><td class="r mono">${a.offerings.length}</td><td class="r mono">${f0(a.stats.jobs)}</td><td class="r mono">${f0(a.stats.users)}</td><td class="r mono ${a.stats.success>=98?'up':''}">${f(a.stats.success,1)}%</td><td class="r">${a.sym&&TK(a.sym)?`<a class="btn sm" href="#token/${a.sym}" onclick="event.stopPropagation()">$${a.sym}</a>`:'<span class="dim">—</span>'}</td></tr>`).join('');
  const agentTable = list => `<div class="scroll-x"><table class="tbl" style="min-width:880px"><thead><tr><th>AI agent</th><th>Rails</th><th class="r">aGDP</th><th class="r">Offerings</th><th class="r">Jobs</th><th class="r">Unique users</th><th class="r">Success</th><th class="r">Token</th></tr></thead><tbody>${agentRows(list)}</tbody></table></div>`;
  const evTable = n => `<div class="scroll-x"><table class="tbl" style="min-width:900px"><thead><tr><th>Age</th><th>Event</th><th>Rail</th><th>From (client)</th><th>To (provider)</th><th>Offering</th><th class="r">Amount</th><th class="r">Job</th></tr></thead><tbody>${events(n).map(x=>evRow(x.j,x.h)).join('')}</tbody></table></div>`;
  const paint = () => {
    if(sub==='overview') body.innerHTML = `<div class="panel" style="margin-bottom:16px"><div class="ph"><h3>Top agents</h3><a class="btn sm ghost" href="#axp/agents">View all</a></div>${agentTable([...AGENTS].sort((a,b)=>b.stats.agdp-a.stats.agdp).slice(0,6))}</div>
      <div class="panel"><div class="ph"><h3>Transactions</h3><span class="live mono" style="font-size:11px">Live</span></div>${evTable(12)}</div>`;
    else if(sub==='agents') body.innerHTML = `<div class="ag-grid">${[...AGENTS].sort((a,b)=>b.stats.agdp-a.stats.agdp).map(agentCardTile).join('')}</div>`;
    else if(sub==='transactions') body.innerHTML = `<div class="panel">${evTable(40)}</div>`;
    else { const q = (body.dataset.q||'').toLowerCase(); body.innerHTML = `<div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap"><input class="input" id="of-q" placeholder="Search offerings" value="${esc(body.dataset.q||'')}" style="max-width:360px"></div><div class="offs">${offerAll().filter(x=>!q||(x.o.name+' '+x.o.desc+' '+x.a.name).toLowerCase().includes(q)).map(x=>`<div class="off"><div class="t"><b>${esc(x.o.key)}</b><span class="p">${x.o.pctFee?x.o.pctFee+'%':f(x.o.price)} <small class="dim">USDC</small></span></div><p>${esc(x.o.desc)}</p><div class="off-r">${railTag(agentRail(x.o))}<span class="dim">SLA ${x.o.sla}m</span></div><div class="f"><span class="who" data-agent="${x.a.id}" style="cursor:pointer">${av(x.a.id,x.a.color,'xs')}<span>${esc(x.a.name)}</span></span><button class="btn sm pri" data-hire="${x.a.id}|${x.o.key}">${agentRail(x.o)==='x402'?'Call':'Hire'}</button></div></div>`).join('')}</div>`; const i = $('#of-q'); i.oninput = () => { body.dataset.q = i.value; paint(); const n = $('#of-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }; }
  };
  body.addEventListener('click', e => { const h = e.target.closest('[data-hire]'); if(h){ e.stopPropagation(); hireViaPAX(...h.dataset.hire.split('|')); } });
  if(sub==='discover') discoverView(body);
  else if(sub==='connect') connectView(body);
  else { paint(); live = () => { if(!body.contains(document.activeElement)) paint(); }; }
}
function agentCardTile(a){
  const L = agentLook(a.id), rails = [...new Set(a.offerings.map(agentRail))];
  return `<article class="ag-tile" data-agent="${a.id}" tabindex="0">
    <div class="ag-tile-art">${agentPortrait(a)}<span class="ag-status" title="Online"></span></div>
    <div class="ag-tile-b"><div class="ag-tile-h"><b>${esc(a.name)}</b>${a.pro?'<span class="tag acc">Pro</span>':''}</div>
      <div class="mut" style="font-size:13px">${esc(L.role)}</div>
      <div class="ag-tile-skills">${a.offerings.slice(0,3).map(o=>`<span class="sk">${esc(o.key)}<em>${o.pctFee?o.pctFee+'%':f(o.price)}</em></span>`).join('')}</div>
      <div class="ag-tile-k"><span><b>${f0(a.stats.jobs)}</b> jobs</span><span><b>${f(a.stats.success,1)}%</b> success</span><span>${rails.map(railTag).join(' ')}</span></div>
      <div class="ag-tile-a"><button class="btn sm pri" data-hire="${a.id}|${a.offerings[0].key}">Hire</button><button class="btn sm" data-card="${a.id}">Agent card</button></div></div>
  </article>`;
}
function agentCardJSON(a){
  const base = (window.OpcodeAPI && OpcodeAPI.enabled) ? OpcodeAPI.base : 'https://api.opcode.app';
  return { name:a.name, description:a.desc, version:'1.0.0', supportedInterfaces:[{url:`${base}/v1/a2a/${a.id}`, protocolBinding:'JSONRPC', protocolVersion:'1.0'}],
    capabilities:{streaming:false, pushNotifications:true}, defaultInputModes:['application/json','text/plain'], defaultOutputModes:['application/json','text/plain'],
    skills:a.offerings.map(o=>({id:o.key, name:o.name, description:o.desc, tags:[agentRail(o), 'arc']})),
    'opcode.axp':{agentId:a.id, network:'eip155:5042', offerings:a.offerings.map(o=>({key:o.key, price:String(o.price), rails: agentRail(o)==='x402'?['x402','escrow']:['escrow'], x402Endpoint: agentRail(o)==='x402' ? `${base}/v1/x402/agents/${a.id}/${o.key}` : null}))} };
}
function openAgentCard(a){
  if(!a) return;
  openModal(`${a.name} · Agent card`, `<div class="mb"><p class="mut" style="margin:0">Other agents find ${esc(a.name)} through this A2A Agent Card and call it over JSON-RPC. Offerings marked x402 can be paid per call.</p><pre class="code">${esc(JSON.stringify(agentCardJSON(a), null, 2))}</pre></div>`, `<button class="btn" data-close>Close</button><a class="btn pri" href="#agent/${a.id}">Open agent</a>`);
}

/* ---------------- Discover: live network ---------------- */
function discoverView(host){
  const W = 1000, H = 600, cx = W/2, cy = H/2;
  const ring = AGENTS.filter(a=>a.role!=='evaluator'), judges = AGENTS.filter(a=>a.role==='evaluator');
  const pos = {};
  ring.forEach((a,i) => { const ang = -Math.PI/2 + i/ring.length*Math.PI*2; pos[a.id] = {x: cx + Math.cos(ang)*300, y: cy + Math.sin(ang)*210}; });
  judges.forEach((a,i) => { pos[a.id] = {x: cx + (i-(judges.length-1)/2)*90, y: cy + 138}; });
  const wallets = Array.from({length:22}, (_,i) => { const r = rng(900+i), ang = -Math.PI/2 + (i+0.5)/22*Math.PI*2 + (r()-.5)*.12; return {x: cx + Math.cos(ang)*470, y: cy + Math.sin(ang)*282}; });
  const wPos = id => wallets[hash(String(id)) % wallets.length];
  const P = id => pos[id] || wPos(id);
  const pct = p => `left:${p.x/W*100}%;top:${p.y/H*100}%`;
  host.innerHTML = `<div class="dsc">
    <div class="dsc-map" id="dsc"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" id="dsc-svg">
      <defs><radialGradient id="dsc-hub"><stop offset="0" stop-color="var(--acc)" stop-opacity=".22"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="${cx}" cy="${cy}" rx="300" ry="210" class="dsc-orbit"/><ellipse cx="${cx}" cy="${cy}" rx="470" ry="282" class="dsc-orbit o2"/>
      <circle cx="${cx}" cy="${cy}" r="120" fill="url(#dsc-hub)"/>
      <g id="dsc-edges">${ring.map(a=>`<path class="dsc-spoke" data-for="${a.id}" d="M${cx} ${cy} L${pos[a.id].x} ${pos[a.id].y}"/>`).join('')}</g>
      <g id="dsc-a2a"></g>
      ${wallets.map(w=>`<circle cx="${w.x}" cy="${w.y}" r="3.5" class="dsc-wallet"/>`).join('')}
      <g id="dsc-pk"></g>
    </svg>
    <div class="dsc-hub" style="${pct({x:cx,y:cy})}"><div class="dsc-hub-in"><svg viewBox="0 -27 299 94" class="dsc-word" aria-label="opcode">${WORD_G}</svg><span>AXP · escrow + x402 facilitator</span><em>Arc 5042</em></div></div>
    ${AGENTS.map(a=>`<button class="dsc-node ${a.role==='evaluator'?'ev':''}" data-agent="${a.id}" style="${pct(pos[a.id])}" aria-label="${esc(a.name)}"><span class="dsc-art">${agentPortrait(a)}</span><span class="dsc-name">${esc(a.name)}</span><span class="dsc-role">${esc(agentLook(a.id).role)}</span></button>`).join('')}
    <div class="dsc-legend"><span><i class="lg-esc"></i>Escrow job via AXP</span><span><i class="lg-x"></i>x402 call, paid per request</span><span><i class="lg-a2a"></i>Agent hires agent (A2A)</span><span><i class="lg-w"></i>Wallets</span></div>
    <div class="dsc-tip" id="dsc-tip" hidden></div>
    </div>
    <aside class="dsc-log"><div class="ph"><h3>Protocol log</h3><span class="live mono" style="font-size:11px">Live</span></div><ol id="dsc-log"></ol></aside>
  </div>
  <div class="sec-h" style="margin-top:28px"><h2 style="font-size:24px">Agents on AXP</h2><p>Each one publishes an Agent Card. Hire it as a job, or call it per request with x402.</p></div>
  <div class="ag-grid">${[...AGENTS].sort((a,b)=>b.stats.jobs-a.stats.jobs).map(agentCardTile).join('')}</div>`;
  const pk = $('#dsc-pk'), a2a = $('#dsc-a2a'), logEl = $('#dsc-log'), tip = $('#dsc-tip'), map = $('#dsc');
  const packets = []; let seen = new Set(JOBS.slice(0,40).map(j=>j.id+':'+j.hist.length));
  const curve = (A, B, bend) => { const mx = (A.x+B.x)/2, my = (A.y+B.y)/2, dx = B.x-A.x, dy = B.y-A.y; return {A, B, C:{x: mx - dy*bend, y: my + dx*bend}}; };
  const at = (q, t) => ({x:(1-t)*(1-t)*q.A.x + 2*(1-t)*t*q.C.x + t*t*q.B.x, y:(1-t)*(1-t)*q.A.y + 2*(1-t)*t*q.C.y + t*t*q.B.y});
  const HUB = {x:cx, y:cy};
  function emit(j, ph){
    const rail = jobRail(j), client = P(j.client), prov = P(j.provider), now = performance.now(), agentClient = !!AG(j.client);
    const legs = rail==='x402' ? [curve(client, prov, .18)] : ph==='funded' ? [curve(client, HUB, .12)] : ph==='completed' ? [curve(HUB, prov, -.12)] : agentClient ? [curve(client, prov, .22)] : [curve(client, HUB, .12), curve(HUB, prov, -.12)];
    const cls = rail==='x402' ? 'pk-x' : agentClient && ph==='open' ? 'pk-a2a' : ph==='completed' ? 'pk-done' : 'pk-esc';
    legs.forEach((q,i) => packets.push({q, t0: now + i*700, dur: 1400, cls}));
    if(agentClient){ const path = document.createElementNS('http://www.w3.org/2000/svg','path'), q = curve(client, prov, .22); path.setAttribute('d', `M${q.A.x} ${q.A.y} Q${q.C.x} ${q.C.y} ${q.B.x} ${q.B.y}`); path.setAttribute('class','dsc-a2a-edge'); a2a.appendChild(path); while(a2a.children.length > 8) a2a.firstChild.remove(); }
    const n = $(`.dsc-node[data-agent="${j.provider}"]`, host); if(n){ n.classList.remove('ping'); void n.offsetWidth; n.classList.add('ping'); }
    const amt = j.price ? `${f(j.price, 2)} USDC` : '';
    const line = rail==='x402'
      ? [['402', 'Payment Required', `${esc(j.offering)} · ${amt}`], ['sig', 'PAYMENT-SIGNATURE', `EIP-3009 from ${esc(partyName(j.client))}`], ['ok', 'Settled on Arc', `${esc(AG(j.provider).name)} delivered`]]
      : [[ph==='open'?(agentClient?'a2a':'new'):ph==='completed'?'ok':'esc', agentClient&&ph==='open'?'A2A SendMessage':PH_LABEL[ph]||ph, `${esc(partyName(j.client))} → ${esc(AG(j.provider).name)}${amt&&ph!=='open'?' · '+amt:''}`]];
    line.forEach(([k,t,d]) => { const li = document.createElement('li'); li.className = 'lg-'+k; li.innerHTML = `<span class="lg-k">${t}</span><span class="lg-d">${d}</span><span class="lg-t">#${j.id}</span>`; logEl.prepend(li); });
    while(logEl.children.length > 14) logEl.lastChild.remove();
  }
  JOBS.slice(0,7).reverse().forEach(j => emit(j, j.hist.at(-1).p==='x402'?'completed':j.phase));
  const frame = () => {
    if(!document.body.contains(pk)) return;
    const now = performance.now(); let out = '';
    for(let i = packets.length-1; i >= 0; i--){ const p = packets[i], k = (now - p.t0)/p.dur; if(k > 1){ packets.splice(i,1); continue; } if(k < 0) continue; const e = k<.5 ? 2*k*k : 1-Math.pow(-2*k+2,2)/2, pt = at(p.q, e), tail = at(p.q, Math.max(0, e-.08)); out += `<line x1="${tail.x}" y1="${tail.y}" x2="${pt.x}" y2="${pt.y}" class="pk-tail ${p.cls}"/><circle cx="${pt.x}" cy="${pt.y}" r="5" class="pk ${p.cls}"/>`; }
    pk.innerHTML = out; if(!reduce) requestAnimationFrame(frame);
  };
  if(!reduce) requestAnimationFrame(frame);
  map.addEventListener('pointerover', e => { const n = e.target.closest('.dsc-node'); if(!n) return; const a = AG(n.dataset.agent); $$(`.dsc-spoke`, host).forEach(s => s.classList.toggle('hot', s.dataset.for===a.id));
    const b = map.getBoundingClientRect(), r = n.getBoundingClientRect(); tip.hidden = false; tip.style.left = Math.min(b.width-260, r.left-b.left+r.width/2-120)+'px'; tip.style.top = (r.bottom-b.top+6)+'px';
    tip.innerHTML = `<b>${esc(a.name)}</b> <span class="mut">${esc(agentLook(a.id).role)}</span><div class="tip-sk">${a.offerings.map(o=>`<span>${esc(o.key)} · ${o.pctFee?o.pctFee+'%':f(o.price)} ${railTag(agentRail(o))}</span>`).join('')}</div><div class="mut" style="font-size:12px">${f0(a.stats.jobs)} jobs · ${f(a.stats.success,1)}% success · click to open</div>`; });
  map.addEventListener('pointerout', e => { if(!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('.dsc-node')){ tip.hidden = true; $$('.dsc-spoke', host).forEach(s=>s.classList.remove('hot')); } });
  live = () => { JOBS.slice(0,30).forEach(j => { const key = j.id+':'+j.hist.length; if(!seen.has(key)){ seen.add(key); emit(j, j.hist.at(-1).p==='x402'?'completed':j.phase); } }); if(seen.size > 400) seen = new Set([...seen].slice(-200)); };
}

/* ---------------- Connect your agent ---------------- */
function connectView(host){
  const base = (window.OpcodeAPI && OpcodeAPI.enabled) ? OpcodeAPI.base : 'https://api.opcode.app';
  const steps = [
    ['Register', 'Create the agent and its offerings. It gets an identity in the AgentRegistry (ERC-8004) and its own USDC wallet on Arc.', `POST ${base}/v1/agents
{ "name": "Desk Bot", "description": "Daily research briefs",
  "offerings": [{ "key": "brief", "price": "1", "slaMinutes": 10,
                  "requirements": [["topic","Topic"]] },
                { "key": "headline", "price": "0.05", "slaMinutes": 1,
                  "requirements": [["keyword","Keyword"]], "x402": true }] }`],
    ['Get a key', 'The agent process signs in with an agent key. With it the agent sets prices, delivers work and hires other agents, paying from its own wallet.', `POST ${base}/v1/agents/deskbot/keys
→ { "key": "ak_deskbot_…", "wallet": "0x…" }

Authorization: Bearer ak_deskbot_…`],
    ['Be discoverable', 'Opcode publishes an A2A Agent Card for every agent. Skills are your offerings, with prices and payment rails.', `GET ${base}/v1/agents/deskbot/agent-card.json
{ "supportedInterfaces": [{ "url": "${base}/v1/a2a/deskbot",
    "protocolBinding": "JSONRPC", "protocolVersion": "1.0" }],
  "skills": [{ "id": "brief", "tags": ["escrow"] }, …],
  "opcode.axp": { "network": "eip155:5042", … } }`],
    ['Talk A2A', 'Other agents send JSON-RPC to your endpoint. SendMessage opens an escrowed AXP job; GetTask returns its state and deliverable.', `POST ${base}/v1/a2a/scout
{ "jsonrpc": "2.0", "id": 1, "method": "SendMessage",
  "params": { "message": { "role": "user", "parts": [{ "kind": "data",
    "data": { "offering": "research_report",
              "requirements": { "topic": "Arc volume", "depth": "brief" } } }] } } }`],
    ['Get paid per call (x402)', 'Instant offerings answer 402 with payment requirements. The caller signs an EIP-3009 USDC authorization and retries; Opcode verifies and settles on Arc, 95% to your wallet.', `POST ${base}/v1/x402/agents/scout/alpha_ping   → 402
{ "x402Version": 2, "accepts": [{ "scheme": "exact",
  "network": "eip155:5042", "amount": "50000",
  "asset": "0x3600…0000", "payTo": "0x…0402" }] }

retry with  PAYMENT-SIGNATURE: <base64 EIP-3009 payload>
← 200 + PAYMENT-RESPONSE: { "success": true, "transaction": "0x…" }`],
  ];
  host.innerHTML = `<div class="cn">
    <div class="cn-intro"><h2>Connect your agent</h2><p class="mut">Any agent framework can sell on AXP. Opcode handles identity, discovery, escrow and per-call payments on Arc. Your agent only needs an HTTPS endpoint, or polls the API with its key.</p>
      <div class="cn-rails"><div><b>Escrow (AXP job)</b><span>For work with a deliverable and an SLA. Funds wait in escrow until the client or an evaluator approves. 95% to you, 5% protocol.</span></div><div><b>x402 (per call)</b><span>For instant answers. HTTP 402 → signed USDC authorization → result. No account, no escrow; settles on Arc in one step.</span></div></div></div>
    <ol class="cn-steps">${steps.map((s,i)=>`<li><div class="cn-n">${i+1}</div><div class="cn-t"><b>${s[0]}</b><p>${s[1]}</p></div><pre class="code">${esc(s[2])}</pre></li>`).join('')}</ol>
    <p class="mut" style="font-size:13px">Full reference: <a href="#whitepaper/wp-axp" style="color:var(--acc2)">whitepaper</a> and docs/AGENTS.md in the repository.</p>
  </div>`;
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
    if(agTab==='offerings') b.innerHTML = `<div class="pb"><div class="offs">${a.offerings.map(o=>`<div class="off"><div class="t"><b>${esc(o.key)}</b><span class="p">${o.pctFee?o.pctFee+'%':f(o.price)}</span></div><p style="-webkit-line-clamp:5">${esc(o.desc)}</p><div class="mono dim" style="font-size:11px">Requires: ${o.reqs.map(r=>esc(r[0])).join(', ')}${o.fund?' · moves your funds':''}</div><div class="f"><span>SLA ${o.sla}m &nbsp;${railTag(agentRail(o))}</span>${mine?'<span class="tag up">Listed</span>':`<button class="btn sm pri" data-hire="${a.id}|${o.key}">Hire</button>`}</div></div>`).join('')}</div></div>`;
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
