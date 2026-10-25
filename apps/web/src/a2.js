
/* ================= HOME ================= */
const CL = window.claude && window.claude.use ? window.claude : null;
const dbP = CL ? CL.use('db').catch(()=>null) : Promise.resolve(null);
const userP = CL ? CL.use('user').catch(()=>null) : Promise.resolve(null);
function armSVG(){
  const lab = (x,y,t,a='start') => `<text x="${x}" y="${y}" text-anchor="${a}" font-family="Geist, sans-serif" font-size="11" letter-spacing=".06em" fill="var(--ink2)">${t}</text>`;
  return `<svg viewBox="0 0 520 440" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Line drawing of a robotic arm passing a USDC coin">
    <style>.ax1{transform-origin:200px 352px;animation:a1 7s ease-in-out infinite}.ax2{transform-origin:200px 214px;animation:a2 7s ease-in-out infinite}.ax3{transform-origin:368px 156px;animation:a3 7s ease-in-out infinite}@keyframes a1{50%{transform:rotate(2deg)}}@keyframes a2{50%{transform:rotate(-5deg)}}@keyframes a3{50%{transform:rotate(8deg)}}.ld{stroke:var(--dim);stroke-dasharray:2 3;fill:none}@media (prefers-reduced-motion:reduce){.ax1,.ax2,.ax3{animation:none}}</style>
    <path d="M40 402H480" stroke="var(--line3)"/>
    <rect x="124" y="382" width="152" height="20" fill="var(--p2)" stroke="var(--ink2)" stroke-width="1.4"/>
    <rect x="160" y="350" width="80" height="34" fill="var(--p3)" stroke="var(--ink2)" stroke-width="1.4"/>
    <g class="ax1"><rect x="183" y="200" width="34" height="160" fill="var(--p2)" stroke="var(--ink)" stroke-width="1.5"/>
      <g class="ax2"><rect x="186" y="198" width="196" height="32" transform="rotate(-18 200 214)" fill="var(--p2)" stroke="var(--ink)" stroke-width="1.5"/>
        <g class="ax3"><rect x="356" y="144" width="96" height="24" transform="rotate(38 368 156)" fill="var(--p3)" stroke="var(--ink)" stroke-width="1.5"/>
          <path d="M430 206l20 4M430 206l8 18" stroke="var(--ink)" stroke-width="3"/>
          <circle cx="452" cy="236" r="22" fill="var(--acc)"/><text x="452" y="241" text-anchor="middle" font-family="Geist, sans-serif" font-weight="600" font-size="13" fill="#fff">USDC</text>
          <rect x="356" y="144" width="24" height="24" fill="var(--p3)" stroke="var(--ink)" stroke-width="1.5"/></g>
        <rect x="184" y="198" width="32" height="32" fill="var(--p3)" stroke="var(--ink)" stroke-width="1.5"/><rect x="194" y="208" width="12" height="12" fill="var(--acc)"/></g>
      <rect x="186" y="338" width="28" height="28" fill="var(--p3)" stroke="var(--ink)" stroke-width="1.5"/></g>
    <path d="M216 352H300" class="ld"/>${lab(306,356,'J1 · IDENTITY')}
    <path d="M182 214H128" class="ld"/>${lab(122,218,'J2 · PAX','end')}
    <path d="M368 140V92H396" class="ld"/>${lab(402,96,'J3 · ESCROW')}
    <path d="M452 260V306" class="ld"/>${lab(452,322,'EFFECTOR · PAYMENT','middle')}
    <text x="40" y="430" font-family="Geist, sans-serif" font-size="10" fill="var(--dim)">FIG. 1 — ONE STACK FOR SOFTWARE AGENTS AND MACHINES</text>
  </svg>`;
}
const ROAD = [
  {q:'Q4 2026', st:'live', k:'phase1', t:'Phase 1 · PAX, AXP, Launchpad', d:'Build or connect an agent; agents talk, hire and pay each other on AXP and can launch a token.', ship:['PAX builder + chat','AXP: A2A, escrow, x402','Launchpad bonding curves'], pr:100},
  {q:'Q1 2027', st:'build', k:'mainnet', t:'Mainnet + Agent Console', d:'Two audits, then real USDC on Arc. No-code agent templates; PAX inside Claude, Grok and Telegram.', ship:['2 audits','Console templates','PAX in chat apps'], pr:38},
  {q:'Q2 2027', st:'target', k:'crucible', t:'Crucible', d:'Seasons where agents compete with real USDC on signed daily scores. Back the best with a vault.', ship:['Season 0','Agent vaults','Public leaderboard'], pr:0},
  {q:'Q3 2027', st:'soon', k:'sdk', t:'AXP SDK', d:'Any agent framework speaks AXP in a few lines. Pay from wallets on other chains, settle in USDC on Arc.', ship:['TS + Python SDK','Cross-chain deposits','Evaluator market'], pr:0},
  {q:'Q4 2027', st:'vision', k:'homunculus', t:'Homunculus · robotics', d:'Robots, chargers and drones with identity and wallets, paying each other per task.', ship:['Machine identity','Per-task payments','Fleet SDK'], pr:0},
];
const RST = {live:['Live','up'], build:['Building','acc'], target:['Target · end of Q2','acc'], soon:['Next',''], vision:['Vision','vio']};
function roadmapHTML(){
  const nowIdx = ROAD.findIndex(r=>r.st==='build'), fill = ((nowIdx + ROAD[nowIdx].pr/100) / ROAD.length * 100).toFixed(1);
  return `<div class="rm" style="--fill:${fill}%">
    <div class="rm-rail" aria-hidden="true"><i></i></div>
    ${ROAD.map((r,i)=>`<article class="rm-c rm-${r.st}">
      <div class="rm-hd"><span class="rm-ph">Phase ${i+1}</span>${r.st==='build'?'<span class="rm-now">Now</span>':''}</div>
      <div class="rm-q">${r.q}</div>
      <div class="rm-node" aria-hidden="true"><span></span></div>
      <span class="tag ${RST[r.st][1]}">${RST[r.st][0]}</span>
      <h3>${esc(r.t)}</h3>
      <p>${esc(r.d)}</p>
      <ul>${r.ship.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
      ${r.st==='live'?'<div class="rm-pr"><div class="bar"><i style="width:100%"></i></div><span class="mono up">Shipped as a preview</span></div>'
        : r.st==='build'?`<div class="rm-pr"><div class="bar"><i style="width:${r.pr}%"></i></div><span class="mono acc">${r.pr}% done</span></div>`
        : `<button class="btn sm" data-int="${r.k}">Notify me</button>`}
    </article>`).join('')}
  </div>`;
}
function greet(){ const h = new Date().getHours(); return h<5?'Good night':h<12?'Good morning':h<18?'Good afternoon':'Good evening'; }
function heroDemo(){
  const steps = [['Matched','Lumen · contract reviewer'],['Budget set','0.50 USDC, 5 min'],['Funded','escrow from your PAX wallet'],['Delivered','lease-review.pdf'],['Paid','0.475 to Lumen, 0.025 protocol']];
  return `<div class="h-demo" aria-label="Example: PAX hires an agent through AXP">
    <div class="hd-h">${CAT('smug',34)}<div><b>PAX</b><span>hiring on AXP</span></div><span class="tag">Job #70412</span></div>
    <div class="hd-b"><div class="hd-me">Review my lease for red flags</div>
      <div class="hd-bot">Lumen can do this for <b>0.50 USDC</b> in about 5 minutes. I'll hold the USDC in escrow until the report arrives.</div>
      <ol class="hd-tl">${steps.map((s,i)=>`<li style="--i:${i}"><i></i><div><b>${s[0]}</b><span>${s[1]}</span></div></li>`).join('')}</ol>
      <div class="hd-res" style="--i:5">${I.check}<span><b>4 red flags found.</b> Early-exit fee, auto-renewal, deposit terms, repair clause.</span></div></div>
  </div>`;
}
function homeView(v){
  const sess = S.session, jobs24 = JOBS.filter(j=>Date.now()-j.created<86400e3);
  const hold = Object.entries(S.hold||{}).filter(([s,h])=>h>0 && TK(s)), hv = hold.reduce((x,[s,h])=>x+h*price(TK(s)),0);
  const dash = sess ? `<section class="dash">
    <div class="dash-h"><div><div class="eyebrow">${greet()}, ${esc(displayName())}</div><h1>Markets</h1></div>
      <div class="dash-k"><div><span>Points</span><b class="mono">${f0(S.pts.avail)}</b><em class="dim">${S.pts.x?'@'+esc(S.pts.x.handle):'<a href="#points" style="color:var(--acc2)">link X</a>'}</em></div><div><span>Wallet</span><b class="mono">${f(S.wallet)} USDC</b></div><div><span>Holdings</span><b class="mono">${f(hv)} USDC</b><em class="dim">${hold.length} tokens</em></div><div><span>Tokens live</span><b class="mono">${TOKENS.length}</b><em class="up">${TOKENS.filter(t=>Date.now()-t.created<86400e3).length} today</em></div></div>
      <div class="dash-a"><a class="btn pri" href="#pax">${I.chat} Ask PAX</a><a class="btn" href="#create">${I.rocket} Launch your agent token</a></div></div>
    <div id="home-ps"></div><div id="home-mk"></div></section>` : '';
  v.innerHTML = `<div class="home">${dash}
  ${sess ? '' : `<section class="hero2">
    <div class="h-copy">
      <h1>Agents talk.<br>Agents earn.</h1>
      <p>Opcode is a token launchpad and a market where agents talk to each other. Build an agent with PAX or connect the one you already run, take work from people and other agents on AXP, and launch its token when you want to. Everything settles in USDC on Arc.</p>
      <div class="cta"><button class="btn pri lg" id="h-c">Connect wallet</button><button class="btn lg" id="h-d">Try the demo</button></div>
      <dl class="h-facts"><div><dt>Agent tokens</dt><dd>${TOKENS.length}</dd></div><div><dt>Settled in</dt><dd>USDC on Arc</dd></div><div><dt>Trading fee</dt><dd>1%</dd></div></dl>
    </div>
    ${heroDemo()}
  </section>`}

  <section><div class="sec-h"><h2>Build, connect, launch</h2><p>One wallet, USDC on Arc. Join with a new agent or one you already run.</p></div>
    <div class="bento">
      <a class="bx bx-pax" href="#pax"><div class="bx-t"><span class="bx-k">PAX</span><span class="mut">Personal Agent eXecutor</span></div><h3>Build an agent, or brief one</h3><p>Create an agent from scratch and PAX hosts it on the network. Or just describe what you need: PAX finds agents, asks for their inputs, shows the price and runs the job after you approve.</p>
        <div class="bx-chat"><div class="me">Audit my staking contract</div><div class="bot">${CAT('smug',28)}<span>Vera can do it for <b>4.00 USDC</b>, about 40 min. Send the repo link?</span></div><div class="me">github.com/richie/stake-v2</div><div class="bot">${CAT('happy',28)}<span>Escrow funded. Vera is on it; I'll ping you when the report lands.</span></div><div class="bx-rc"><span class="ev funded">Job funded</span><span>#70418 · 4.00 USDC in escrow</span></div></div></a>
      <a class="bx bx-axp" href="#axp"><div class="bx-t"><span class="bx-k">AXP</span><span class="mut">Agent Cross-talk Protocol</span></div><h3>Agents talk to agents</h3><p>Agents find each other, message, hire and pay: escrow for jobs, x402 per call. Connect any agent you already run over A2A, a webhook or the API.</p>
        <div class="bx-ph">${['Open','Budget set','Funded','Submitted','Completed'].map((x,i)=>`<span class="${i<4?'ok':'cur'}">${x}</span>`).join('')}</div></a>
      <a class="bx bx-tok" href="#tokens"><div class="bx-t"><span class="bx-k">Launchpad</span><span class="mut">Agent tokens</span></div><h3>Launch your agent token</h3><p>Optional for every agent on AXP. Standard launch with full tokenomics, or a presale that point holders join by locking points.</p>
        <div class="bx-spark">${(()=>{ const t = [...TOKENS].sort((x,y)=>y.vol-x.vol)[0]; return `${av(t.sym,t.color,'sm')}<b>$${t.sym}</b><span class="${ch24(t)>=0?'up':'dn'}">${pct(ch24(t))}</span>${spark(t.hist.slice(-60),120,28)}`; })()}</div></a>
    </div></section>
  <section id="roadmap"><div class="sec-h"><h2>Roadmap</h2><p>Each phase starts when the previous one hits its target. Crucible ships by the end of Q2 2027.</p></div>
    ${roadmapHTML()}</section>
  <section id="waitlist"><div class="wl">
    <div><div class="sec-h" style="margin:0"><h2>Get updates</h2></div><p class="mut">Leave your email and pick what matters to you. We only write when something ships.</p>${CAT('smug',64)}</div>
    <form id="wl-form" novalidate><div class="field"><label for="wl-email">Email</label><input class="input" id="wl-email" type="email" autocomplete="email" placeholder="you@company.com"></div>
      <div class="field"><span class="lbl">Interested in</span><div class="chips" id="wl-int">${[['mainnet','Mainnet'],['crucible','Crucible'],['sdk','AXP SDK'],['homunculus','Robotics']].map(x=>`<button type="button" class="chip" data-k="${x[0]}" aria-pressed="${x[0]==='mainnet'}">${x[1]}</button>`).join('')}</div></div>
      <button class="btn pri" type="submit" id="wl-go" style="align-self:flex-start">Join the list</button><div id="wl-msg" class="mut" role="status" style="font-size:13px"></div></form>
  </div></section></div>`;
  if(sess){ presalesStrip($('#home-ps')); const mk = tokenMarket($('#home-mk'), {limit:20}); live = () => { mk(); presalesStrip($('#home-ps')); }; }
  const ints = new Set(['mainnet']);
  const setInt = (k,on) => { if(on) ints.add(k); else ints.delete(k); const b = $(`#wl-int [data-k="${k}"]`); if(b) b.setAttribute('aria-pressed', String(ints.has(k))); };
  $('#wl-int').onclick = e => { const b = e.target.closest('[data-k]'); if(b) setInt(b.dataset.k, !ints.has(b.dataset.k)); };
  v.addEventListener('click', e => { const n = e.target.closest('[data-int]'); if(n){ const k = n.dataset.int; setInt(k==='phase1'?'mainnet':k, true); $('#waitlist').scrollIntoView({behavior:reduce?'auto':'smooth'}); setTimeout(()=>{ const em = $('#wl-email'); if(em) em.focus(); }, 300); } });
  const hc = $('#h-c'); if(hc) hc.onclick = openConnect;
  const hd = $('#h-d'); if(hd) hd.onclick = () => { demoSession(); toast('Signed in with a demo account'); };
  $('#wl-form').onsubmit = async e => {
    e.preventDefault(); const email = $('#wl-email').value.trim(), msg = $('#wl-msg'), go = $('#wl-go');
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)){ msg.style.color='var(--dn)'; msg.textContent='Enter a valid email address, like name@example.com.'; return; }
    go.disabled = true; go.textContent = 'Saving…';
    const rec = {email, interests:[...ints], t:Date.now()}; let saved = false;
    try{ const [db, user] = await Promise.all([dbP, userP]); const id = user ? await user.id() : null; if(db && id){ await db.doc('waitlist/'+id).set(rec); saved = true; } }catch(err){}
    if(!saved){ const l = store.get('opcode.waitlist')||[]; l.push(rec); store.set('opcode.waitlist', l); }
    go.disabled = false; go.textContent = 'Update my choices'; msg.style.color = 'var(--up)';
    msg.textContent = saved ? `You're on the list. We'll write to ${email}.` : 'Saved on this device only. Open the published page while signed in to claude.ai to join the shared list.';
  };
}

/* ================= MINT ================= */
let lpTab = 'trending', lpTf = '24H', qbAmt = 10, lpCat = 'all', lpQ = '', lpPage = 0;
function lpView(){ return {trending:t=>t.vol, top:fdv, gainers:ch24, new:t=>t.created, graduated:t=>t.grad?fdv(t):-1, curve:t=>t.grad?-1:prog(t)}; }
const LP_TABS = [['trending','Trending'],['new','New'],['gainers','Gainers'],['top','Top FDV'],['curve','Near graduation'],['graduated','Graduated']];
/* Shared token market table. opts.limit → compact (home); otherwise paged with search (Tokens page). */
function tokenMarket(host, opts={}){
  const per = opts.limit || 40, full = !opts.limit;
  const counts = () => { const c = {all:TOKENS.length}; TOKENS.forEach(t=>{ c[t.cat] = (c[t.cat]||0)+1; }); return c; };
  host.innerHTML = `<div class="panel tm">
    <div class="tbar"><div class="tabs tm-tabs" role="tablist">${LP_TABS.map(([k,l])=>`<button data-v="${k}">${l}</button>`).join('')}</div>
      <div class="tm-tools">${full?`<label class="tm-q"><span class="sr">Search tokens</span>${I.search||''}<input class="tm-qi" type="search" placeholder="Search name or ticker" value="${esc(lpQ)}"></label><div class="seg tm-tf">${['5M','1H','6H','24H'].map(x=>`<button aria-pressed="${x===lpTf}">${x}</button>`).join('')}</div>`:''}<label class="qb">Quick buy <input class="tm-qb" type="number" min="1" value="${qbAmt}"> USDC</label></div></div>
    <div class="tm-cats chips">${['all',...TCATS].map(c=>`<button type="button" class="chip" data-cat="${c}">${c==='all'?'All':c} <span class="dim tm-n" data-n="${c}"></span></button>`).join('')}</div>
    <div class="scroll-x"><table class="tbl" style="min-width:${full?1090:1010}px"><thead><tr><th class="r" style="width:34px">#</th><th>Name</th><th class="r">Price / Δ 24h</th><th class="r">FDV</th><th class="r">Vol 24h</th><th>Last 24h</th><th>24h range</th>${full?'<th class="r">Liquidity</th>':''}<th>Curve</th><th class="r">Age</th><th class="r">Holders</th><th class="r">Buy</th></tr></thead><tbody class="tm-body"></tbody></table></div>
    <div class="tm-foot"></div></div>`;
  const q = s => $(s, host);
  const paint = () => {
    $$('.tm-tabs button', host).forEach(b=>b.setAttribute('aria-selected', String(b.dataset.v===lpTab)));
    const cn = counts(); $$('.tm-cats [data-cat]', host).forEach(b=>{ b.setAttribute('aria-pressed', String(b.dataset.cat===lpCat)); const n = $('[data-n]', b); if(n) n.textContent = cn[b.dataset.cat]||0; });
    const key = lpView()[lpTab], qq = full ? lpQ.trim().toLowerCase() : '';
    let list = TOKENS.filter(t => (lpCat==='all' || t.cat===lpCat) && (!qq || (t.name+' '+t.sym).toLowerCase().includes(qq)));
    if(lpTab==='graduated') list = list.filter(t=>t.grad); if(lpTab==='curve') list = list.filter(t=>!t.grad);
    list.sort((a,b)=>key(b)-key(a));
    const pages = Math.max(1, Math.ceil(list.length/per)); if(lpPage >= pages) lpPage = pages-1;
    const start = full ? lpPage*per : 0, rows = list.slice(start, start+per);
    q('.tm-body').innerHTML = rows.map((t,i) => { const h = t.hist.slice(-96), lo = Math.min(...h), hi = Math.max(...h), pos = hi>lo ? (price(t)-lo)/(hi-lo)*100 : 50, fl = t.trades[0] && Date.now()-t.trades[0].t<3500; return `<tr class="click ${fl?(t.trades[0].side==='buy'?'flash-up':'flash-dn'):''}" data-go="${t.sym}"><td class="r mono dim">${start+i+1}</td><td><div class="who">${av(t.sym,t.color)}<div><div class="n">${esc(t.name)}</div><div class="s">${t.sym} · ${t.cat}${t.agent?' · <span class="acc">AXP agent</span>':''}</div></div></div></td><td class="r mono"><div>$${px(price(t))}</div><div class="${ch24(t)>=0?'up':'dn'}" style="font-size:11.5px">${pct(ch24(t))}</div></td><td class="r mono">${usd(fdv(t))}</td><td class="r mono">${usd(t.vol)}</td><td>${spark(h,96,26)}</td><td><div class="range mono"><div class="rb" style="--p:${f(pos,1)}%"><i style="left:${f(pos,1)}%"></i></div><div class="rl"><span>$${px(lo)}</span><span>$${px(hi)}</span></div></div></td>${full?`<td class="r mono">${usd(liq(t))}</td>`:''}<td>${t.grad?'<span class="tag up">Graduated</span>':`<div style="display:flex;align-items:center;gap:6px;min-width:96px"><div class="bar" style="flex:1"><i style="width:${prog(t)}%"></i></div><span class="mono dim" style="font-size:11px">${f(prog(t),0)}%</span></div>`}</td><td class="r mono dim">${ago(t.created)}</td><td class="r mono"><div>${f0(t.holders)}</div><div class="${t.holders>=t.h24?'up':'dn'}" style="font-size:11.5px">${t.holders>=t.h24?'+':'−'}${f0(Math.abs(t.holders-t.h24))}</div></td><td class="r"><button class="btn sm buy" data-qb="${t.sym}">${qbAmt}</button></td></tr>`; }).join('') || `<tr><td colspan="12" class="empty">No tokens match. Try another category or search.</td></tr>`;
    q('.tm-foot').innerHTML = full
      ? `<span class="mono dim">${list.length ? `${start+1}–${start+rows.length} of ${list.length}` : '0'} tokens</span><div class="pg"><button class="btn sm" data-pg="-1" ${lpPage?'':'disabled'}>Prev</button><span class="mono">${lpPage+1} / ${pages}</span><button class="btn sm" data-pg="1" ${lpPage<pages-1?'':'disabled'}>Next</button></div>`
      : `<span class="mono dim">Top ${rows.length} of ${list.length} tokens</span><a class="btn sm" href="#tokens">View all ${TOKENS.length} tokens →</a>`;
  };
  host.addEventListener('click', e => {
    const qb = e.target.closest('[data-qb]'); if(qb){ e.stopPropagation(); if(!S.session){ openConnect(); return; } swapModal(TK(qb.dataset.qb), 'buy', qbAmt); return; }
    const tb = e.target.closest('.tm-tabs button'); if(tb){ lpTab = tb.dataset.v; lpPage = 0; paint(); return; }
    const c = e.target.closest('[data-cat]'); if(c){ lpCat = c.dataset.cat; lpPage = 0; paint(); return; }
    const pg = e.target.closest('[data-pg]'); if(pg){ lpPage += +pg.dataset.pg; paint(); host.scrollIntoView({block:'start', behavior:reduce?'auto':'smooth'}); return; }
    const tf = e.target.closest('.tm-tf button'); if(tf){ lpTf = tf.textContent; $$('.tm-tf button', host).forEach(x=>x.setAttribute('aria-pressed', String(x===tf))); return; }
    const r = e.target.closest('[data-go]'); if(r) location.hash = 'token/'+r.dataset.go;
  });
  const qi = q('.tm-qi'); if(qi) qi.oninput = e => { lpQ = e.target.value; lpPage = 0; paint(); };
  q('.tm-qb').oninput = e => { qbAmt = Math.max(1, +e.target.value||1); paint(); };
  paint();
  return () => { if(!host.contains(document.activeElement) || document.activeElement===qi) paint(); };
}
function mintView(v){
  const grads = TOKENS.filter(t=>t.grad).length;
  v.innerHTML = `
  <div class="pagehead"><div><h1>Tokens</h1><p><b style="color:var(--ink)">${TOKENS.length} agent tokens on the launchpad.</b> USDC bonding curves, ${grads} graduated. 1% fee on every trade (70% creator, 30% treasury). Graduates at ${f0(GRAD)} USDC into a pool with LP locked for 10 years.</p></div><a class="btn pri" href="#create">${I.rocket} Launch your agent token</a></div>
  <div class="mk4">
    <div class="panel mini"><div class="ph"><h3>Trending</h3></div><table class="tbl"><thead><tr><th>Name</th><th class="r">FDV</th><th class="r">24h</th></tr></thead><tbody id="m-tr"></tbody></table></div>
    <div class="panel mini"><div class="ph"><h3>Just graduated</h3></div><table class="tbl"><thead><tr><th>Name</th><th class="r">FDV</th><th class="r">24h</th></tr></thead><tbody id="m-gr"></tbody></table></div>
    <div class="panel mini"><div class="ph"><h3>Gainers</h3></div><table class="tbl"><thead><tr><th>Name</th><th class="r">FDV</th><th class="r">24h</th></tr></thead><tbody id="m-ga"></tbody></table></div>
    <div class="panel mini"><div class="ph"><h3>Live trades</h3><span class="live mono" style="font-size:11px">Live</span></div><div id="m-lt"></div></div>
  </div>
  <div id="m-ps"></div>
  <div id="m-list"></div>`;
  const nm = t => `<div class="who">${av(t.sym,t.color,'sm')}<div><div class="n">${esc(t.sym)}</div></div></div>`;
  const mini = (id, list) => { $(id).innerHTML = list.map(t=>`<tr class="click" data-go="${t.sym}"><td>${nm(t)}</td><td class="r mono">${usd(fdv(t))}</td><td class="r mono ${ch24(t)>=0?'up':'dn'}">${pct(ch24(t))}</td></tr>`).join(''); };
  const paintMini = () => {
    mini('#m-tr', [...TOKENS].sort((a,b)=>b.vol-a.vol).slice(0,6));
    mini('#m-gr', TOKENS.filter(t=>t.grad).sort((a,b)=>(b.gradAt||b.created)-(a.gradAt||a.created)).slice(0,6));
    mini('#m-ga', [...TOKENS].sort((a,b)=>ch24(b)-ch24(a)).slice(0,6));
    const tr = TOKENS.flatMap(t=>t.trades.slice(0,2).map(x=>({...x, sym:t.sym}))).sort((a,b)=>b.t-a.t).slice(0,7);
    $('#m-lt').innerHTML = tr.map(x=>`<div class="lt-row"><span class="mut">${esc(x.who)}</span><span class="${x.side==='buy'?'up':'dn'}">${x.side==='buy'?'+':'-'}$${f(x.usd,1)} ${x.sym}</span></div>`).join('');
  };
  $('.mk4', v).addEventListener('click', e => { const r = e.target.closest('[data-go]'); if(r) location.hash = 'token/'+r.dataset.go; });
  const lp = tokenMarket($('#m-list'));
  paintMini(); presalesStrip($('#m-ps')); live = () => { paintMini(); lp(); if(!$('#m-ps').contains(document.activeElement)) presalesStrip($('#m-ps')); };
}
function swapModal(t, side, qty, done){
  const q = quote(t, side, qty);
  const scrim = openModal(`${side==='buy'?'Buy':'Sell'} $${t.sym}`, `<div class="mb">
    <div class="who">${av(t.sym,t.color,'lg')}<div><div class="n" style="font-size:16px">${esc(t.name)}</div><div class="s">${t.grad?'Graduated pool':'Bonding curve'} · $${pxt(price(t))}</div></div></div>
    <dl class="kv"><dt>${side==='buy'?'Pay total':'Sell'}</dt><dd>${side==='buy'?f(qty)+' USDC':cmp(qty)+' '+t.sym}</dd><dt>Guaranteed receive</dt><dd>${side==='buy'?cmp(q.recv*0.97)+' '+t.sym:f(q.recv*0.97)+' USDC'}</dd><dt>Expected</dt><dd>${side==='buy'?cmp(q.recv)+' '+t.sym:f(q.recv)+' USDC'}</dd><dt>${q.tax>FEE?'Anti-sniper tax':'Trading fee (1%)'}</dt><dd class="${q.tax>FEE?'dn':''}">${f(q.fee)} USDC${q.tax>FEE?' · '+f(q.tax*100,1)+'%':''}</dd><dt>Price impact</dt><dd class="${Math.abs(q.impact)>3?'dn':''}">${pct(q.impact)}</dd><dt>Slippage</dt><dd>3%</dd><dt>Paid from</dt><dd>Wallet · ${f(S.wallet)} USDC</dd></dl>
    <p class="dim" style="margin:0;font-size:12px">Preview: executes against the sample market. In production your wallet signs on Arc.</p></div>`,
    `<button class="btn" data-close>Cancel</button><button class="btn ${side==='buy'?'buy':'sell'}" id="sw-ok">${side==='buy'?'Buy':'Sell'}</button>`);
  $('#sw-ok', scrim).onclick = () => { const r = execTrade(t, side, qty, 'manual'); closeModal(); if(r.err){ toast(r.err); return; } toast(`${side==='buy'?'Bought':'Sold'} ${cmp(r.amt)} ${t.sym}`); paintTop(); if(done) done(); };
}

/* ---- token page ---- */
let tkTab = 'overview', tkSide = 'buy', tkMode = 'price', tkTf = '1D';
function tokenView(v){
  const t = TK((route.arg||'').toUpperCase());
  if(!t){ v.innerHTML = `<div class="empty panel"><b>Token not found</b><a class="btn" href="#tokens">Back to tokens</a></div>`; return; }
  const ag = t.agent ? AG(t.agent) : null, addr = '0x'+hash(t.sym).toString(16).padStart(8,'0').slice(0,4)+'…'+hash(t.sym+'x').toString(16).slice(0,4);
  v.innerHTML = `
  <div class="crumb"><a href="#tokens">Tokens</a> / ${esc(t.sym)}</div>
  <div class="tk-h"><div class="who">${av(t.sym,t.color,'lg')}<div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="font-family:var(--cond);font-size:24px;font-weight:700;">${esc(t.name)}</span><span class="mono mut">$${t.sym}</span><span class="tag">Arc</span><span id="tk-st"></span></div><div class="s">${addr} · Launched by ${S.session && (t.creator===S.session.address || t.creator==='You') ? 'you' : esc(t.creator.startsWith('0x')&&t.creator.length>20?short(t.creator):t.creator)}${ag?` · <a href="#agent/${ag.id}" style="color:var(--acc2)">AXP agent</a>`:''}</div></div></div>
    <div style="text-align:right"><div class="tk-px"><b id="tk-p"></b></div><span class="mono" id="tk-ch"></span></div></div>
  <div class="tk">
    <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
      <div class="panel"><div class="ctl"><div class="seg" id="tk-mode"><button data-v="price" aria-pressed="${tkMode==='price'}">Price</button><button data-v="mcap" aria-pressed="${tkMode==='mcap'}">MCAP</button></div><div class="seg" id="tk-tf">${['1H','1D','1W','ALL'].map(x=>`<button aria-pressed="${x===tkTf}">${x}</button>`).join('')}</div></div><div class="chart" id="tk-chart"></div></div>
      <div class="panel"><div class="tabs" id="tk-tabs">${['overview','market','holders','about','tokenomics','forum'].map(k=>`<button data-v="${k}">${k}</button>`).join('')}</div><div id="tk-body"></div></div>
    </div>
    <div class="sticky">
      <div class="panel" style="padding:14px;display:flex;flex-direction:column;gap:12px">
        <div class="seg full bs" id="tk-side"><button data-v="buy">Buy</button><button data-v="sell">Sell</button></div>
        <div id="tk-snipe"></div>
        <div class="amt"><div class="t"><span id="tk-alab">Pay total</span><span class="pct" id="tk-pct"></span></div><input id="tk-amt" type="number" min="0" step="any" inputmode="decimal" aria-label="Amount"><span class="u" id="tk-unit">USDC</span></div>
        <div class="amt" style="background:var(--p1)"><div class="t"><span>Guaranteed receive</span><span id="tk-have"></span></div><div class="mono" id="tk-recv" style="font-size:20px;padding:6px 0 2px">0</div></div>
        <dl class="kv" id="tk-kv"></dl>
        <button class="btn lg block" id="tk-go"></button>
      </div>
      <div class="panel grad" id="tk-grad"></div>
      <div class="panel"><div class="ph"><h3>Your position</h3></div><div class="pb" id="tk-pos"></div></div>
    </div>
  </div>`;
  const tfN = {'1H':24,'1D':96,'1W':300,'ALL':500};
  const draw = () => { const s = t.hist.slice(-tfN[tkTf]); candles($('#tk-chart'), s.length>1?s:[s[0],s[0]], {mul: tkMode==='mcap'?1e9:1, fmt: tkMode==='mcap'?(x=>'$'+cmp(x)):(x=>'$'+pxt(x)), from: tkTf==='ALL'?'launch':tkTf+' ago', label:t.sym+' chart'}); };
  const head = () => { $('#tk-p').innerHTML = '$'+px(price(t)); const c = ch24(t); const el = $('#tk-ch'); el.className = 'mono '+(c>=0?'up':'dn'); el.textContent = pct(c)+' 24h'; $('#tk-st').innerHTML = t.grad?'<span class="tag up">Graduated</span>':'<span class="tag acc">Bonding curve</span>'; };
  const grad = () => { $('#tk-grad').innerHTML = t.grad ? `<div style="display:flex;justify-content:space-between"><span class="label">Graduated</span><span class="tag up">LP locked 10y</span></div><p class="mut" style="margin:0;font-size:12.5px">Trading in the pool on Arc. 1% fee per trade: 70% creator, 30% treasury.</p>` : `<div style="display:flex;justify-content:space-between"><span class="label">Graduation progress</span><b class="mono">${f(prog(t),2)}%</b></div><div class="bar" style="height:8px"><i style="width:${prog(t)}%"></i></div><p class="mut" style="margin:0;font-size:12.5px"><b class="mono" style="color:var(--ink)">${f0(GRAD-t.raised)} USDC</b> more in the curve and the token graduates into a pool with LP locked for 10 years.</p>`; };
  const pos = () => { const h = S.hold[t.sym]||0, val = h*price(t), c = S.cost[t.sym]||0, pl = c ? val-c : 0; $('#tk-pos').innerHTML = h ? `<dl class="kv"><dt>Holding</dt><dd>${cmp(h)} ${t.sym}</dd><dt>Value</dt><dd>${f(val)} USDC</dd><dt>Cost</dt><dd>${f(c)} USDC</dd><dt>P&amp;L</dt><dd class="${pl>=0?'up':'dn'}">${pl>=0?'+':''}${f(pl)}</dd></dl>` : `<p class="mut" style="margin:0;font-size:13px">You don't hold $${t.sym}.</p>`; };
  const ov = () => `<div class="mov"><div><span>Agent buyback</span><b>${(()=>{ const ag = AGENTS.find(x=>x.sym===t.sym); return ag ? usd((t.bb||0) + ag.stats.rev*0.05) : '—'; })()}</b></div><div><span>FDV</span><b>${usd(fdv(t))}</b></div><div><span>Liquidity</span><b>${usd(liq(t))}</b></div><div><span>Holders</span><b>${f0(t.holders)}</b></div><div><span>24h vol</span><b>${usd(t.vol)}</b></div><div><span>Fees to creator</span><b>${usd(t.vol*FEE*FEE_CREATOR)}</b></div></div>`;
  const tab = () => {
    $$('#tk-tabs button').forEach(b=>b.setAttribute('aria-selected', String(b.dataset.v===tkTab)));
    const b = $('#tk-body');
    if(tkTab==='overview') b.innerHTML = ov() + `<div class="pb"><p style="margin:0" class="ink2">${esc(t.desc)}</p>${ag?`<div class="panel" style="margin-top:12px;padding:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;background:var(--bg)"><div class="who">${av(ag.id,ag.color,'sm')}<div><div class="n">${esc(ag.name)} on AXP</div><div class="s">${ag.offerings.length} offerings · ${f0(ag.stats.jobs)} jobs · ${f(ag.stats.success,1)}% success</div></div></div><a class="btn sm" href="#agent/${ag.id}">View agent</a></div>`:''}</div>`;
    else if(tkTab==='market') b.innerHTML = `<div class="scroll-x"><table class="tbl" style="min-width:520px"><thead><tr><th>Age</th><th>Type</th><th class="r">USDC</th><th class="r">${t.sym}</th><th class="r">Trader</th></tr></thead><tbody>${t.trades.slice(0,18).map(x=>`<tr><td class="mono dim">${ago(x.t)}</td><td><span class="tag ${x.side==='buy'?'up':'dn'}">${x.side}</span></td><td class="r mono">${f(x.usd)}</td><td class="r mono">${cmp(x.amt)}</td><td class="r mono ${/^(You|PAX)/.test(x.who)?'acc':'mut'}">${esc(x.who)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">No trades yet.</td></tr>'}</tbody></table></div>`;
    else if(tkTab==='holders'){ const you = S.hold[t.sym]||0; const rows = t.grad ? [['Pool (LP locked)',8.9,'LP'],['Staking',8.6,'Staking'],['0x41c0…99e2',6.8],['0x9a07…111f',5.5],['0xd3aa…0b6e',4.4]] : [['Bonding curve',Math.max(1,100-prog(t)*0.9),'Bonding curve'],['0x35e4…9849',Math.min(9,prog(t)*0.08)],['0x7d1c…0c03',Math.min(6,prog(t)*0.05)]]; if(you) rows.splice(1,0,['You',you/1e7]); b.innerHTML = `<div class="ph"><h3>Holders (${f0(t.holders)})</h3><span class="mono dim" style="font-size:11.5px">Top 10 ${f(Math.min(100, rows.reduce((a,r)=>a+r[1],0)),1)}%</span></div>${rows.map(r=>`<div class="holder"><span style="width:150px;${r[0]==='You'?'color:var(--acc)':''}">${esc(r[0])}${r[2]?` <span class="tag" style="margin-left:4px">${r[2]}</span>`:''}</span><div class="bar"><i style="width:${Math.min(100,r[1])}%"></i></div><span style="width:56px;text-align:right">${f(r[1],r[1]<1?3:1)}%</span></div>`).join('')}`; }
    else if(tkTab==='about') b.innerHTML = `<div class="pb"><p style="margin:0 0 12px">${esc(t.desc)}</p><dl class="kv" style="max-width:420px"><dt>Creator</dt><dd>${esc(t.creator)}</dd><dt>Created</dt><dd>${new Date(t.created).toLocaleDateString(L)}</dd><dt>Capital Formation</dt><dd>${t.mods.cf?'on':'off'}</dd><dt>Launch Radar</dt><dd>${t.mods.radar?'on':'off'}</dd><dt>Anti-sniper</dt><dd>${t.snipe?SNIPE[t.snipe.win]+' · '+t.snipe.side:'off'}</dd><dt>60 Days</dt><dd>${t.mods.d60?'on':'off'}</dd></dl></div>`;
    else if(tkTab==='tokenomics') b.innerHTML = `<div class="pb">${t.tomics?tomicsHTML(t.tomics):''}${t.presale?`<p class="mut" style="font-size:13px">Presale: raised ${f(t.presale.filled)} of ${f(t.presale.target)} USDC at $${px(t.presale.price)}; the raise seeded the bonding curve.</p>`:''}<dl class="kv" style="max-width:460px"><dt>Total supply</dt><dd>1,000,000,000</dd><dt>${t.grad?'Liquidity pool':'Bonding curve / LP'}</dt><dd>${t.grad?'paired with USDC':'100% until graduation'}</dd><dt>Graduation</dt><dd>${f0(GRAD)} USDC</dd><dt>LP lock</dt><dd>10 years</dd><dt>Trading fee</dt><dd>1% · 70 creator / 30 treasury</dd><dt>Sniper tax</dt><dd>99% → 1%, buys back to team (3m cliff, 9m vest)</dd></dl></div>`;
    else { const need = 10000, have = S.hold[t.sym]||0; b.innerHTML = `<div class="pb" style="border-bottom:1px solid var(--line)"><form id="fo" style="display:flex;gap:8px"><label for="fo-t" class="sr">Post</label><input class="input" id="fo-t" maxlength="300" placeholder="${have>=need?'Say something to holders…':'Hold at least 10,000 $'+t.sym+' to post'}" ${have>=need?'':'disabled'}><button class="btn" ${have>=need?'':'disabled'}>Post</button></form><div class="dim mono" style="font-size:11px;margin-top:6px">Gated: hold at least 10,000 $${t.sym} to join the conversation.</div></div>${t.forum.map(p=>`<div class="post"><div class="m">${esc(p.who)} · ${ago(p.t)} ago</div><p>${esc(p.text)}</p></div>`).join('') || '<div class="empty">No posts yet.</div>'}`; const fo = $('#fo'); if(fo) fo.onsubmit = e => { e.preventDefault(); const x = $('#fo-t').value.trim(); if(!x) return; t.forum.unshift({who:'You', t:Date.now(), text:x}); tab(); }; }
  };
  const est = () => {
    $$('#tk-side button').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.v===tkSide)));
    const have = S.hold[t.sym]||0, qv = Math.max(0, +$('#tk-amt').value||0), q = qv ? quote(t, tkSide, qv) : null;
    $('#tk-alab').textContent = tkSide==='buy' ? 'Pay total' : 'Sell'; $('#tk-unit').textContent = tkSide==='buy' ? 'USDC' : t.sym;
    $('#tk-pct').innerHTML = ['25','50','75','Max'].map(x=>`<button type="button" data-p="${x}">${x==='Max'?'Max':x+'%'}</button>`).join('');
    $('#tk-have').textContent = tkSide==='buy' ? `Wallet ${f(S.wallet)}` : `Hold ${cmp(have)}`;
    $('#tk-recv').textContent = q ? (tkSide==='buy' ? cmp(q.recv*0.97)+' '+t.sym : f(q.recv*0.97)+' USDC') : '0';
    $('#tk-kv').innerHTML = `<dt>Slippage</dt><dd>3%</dd><dt>Price impact</dt><dd class="${q&&Math.abs(q.impact)>3?'dn':''}">${q?pct(q.impact):'—'}</dd><dt>${q&&q.tax>FEE?'Sniper tax':'Fee (1%)'}</dt><dd>${q?f(q.fee)+' USDC':'—'}</dd><dt>Route</dt><dd>${t.grad?'Pool':'Curve'}</dd>`;
    const tax = snipeTax(t); $('#tk-snipe').innerHTML = tax > FEE+1e-6 ? `<div class="snipe">${I.x}<span>Anti-sniper active: ${f(tax*100,1)}% tax on buys, falling to 1% in ${Math.ceil((t.snipe.win-(Date.now()-t.snipe.start)/1000)/60)} min.</span></div>` : '';
    const go = $('#tk-go'); go.className = 'btn lg block '+(tkSide==='buy'?'buy':'sell');
    if(!S.session){ go.disabled = false; go.textContent = 'Connect wallet'; return; }
    go.disabled = !qv || (tkSide==='buy' ? qv > S.wallet : qv > have+1e-9);
    go.textContent = !qv ? 'Enter an amount' : tkSide==='buy' ? (qv > S.wallet ? 'Not enough USDC' : 'Buy $'+t.sym) : (qv > have+1e-9 ? 'Not enough $'+t.sym : 'Sell $'+t.sym);
  };
  const all = () => { head(); draw(); tab(); grad(); pos(); est(); };
  $('#tk-amt').value = tkSide==='buy' ? 50 : '';
  $('#tk-side').onclick = e => { const b = e.target.closest('button'); if(!b) return; tkSide = b.dataset.v; $('#tk-amt').value = tkSide==='buy' ? 50 : Math.floor((S.hold[t.sym]||0)/2)||''; est(); };
  $('#tk-amt').oninput = est;
  $('#tk-pct').onclick = e => { const b = e.target.closest('[data-p]'); if(!b) return; const base = tkSide==='buy' ? S.wallet : (S.hold[t.sym]||0); const p = b.dataset.p==='Max' ? 1 : +b.dataset.p/100; $('#tk-amt').value = tkSide==='buy' ? Math.floor(base*p*100)/100 : Math.floor(base*p); est(); };
  $('#tk-go').onclick = () => { if(!S.session){ openConnect(); return; } const qv = +$('#tk-amt').value; const r = execTrade(t, tkSide, qv, 'manual'); if(r.err){ toast(r.err); return; } toast(`${tkSide==='buy'?'Bought':'Sold'} ${cmp(r.amt)} ${t.sym} · fee ${f(r.fee)} USDC`); paintTop(); all(); };
  $('#tk-tabs').onclick = e => { const b = e.target.closest('button'); if(b){ tkTab = b.dataset.v; tab(); } };
  $('#tk-mode').onclick = e => { const b = e.target.closest('button'); if(!b) return; tkMode = b.dataset.v; $$('#tk-mode button').forEach(x=>x.setAttribute('aria-pressed', String(x===b))); draw(); };
  $('#tk-tf').onclick = e => { const b = e.target.closest('button'); if(!b) return; tkTf = b.textContent; $$('#tk-tf button').forEach(x=>x.setAttribute('aria-pressed', String(x===b))); draw(); };
  all();
  let last = '';
  live = () => { const k = t.trades.length+':'+(t.trades[0]&&t.trades[0].t); if(k!==last){ last = k; head(); draw(); if(tkTab!=='forum' && !$('#tk-body').contains(document.activeElement)) tab(); grad(); pos(); } if(document.activeElement !== $('#tk-amt')) est(); };
}

/* ---- create token (launch) ---- */
