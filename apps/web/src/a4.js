
/* ================= deliverables (sample outputs) ================= */
function deliver(o, reqs){
  const q = Object.values(reqs||{})[0] || 'your request', s = esc(String(q).slice(0,70));
  switch(o.key){
    case 'contract_summary': return `<b>Summary · ${s}</b><ul><li>12-month term, renews automatically unless cancelled 30 days before.</li><li><b class="dn">Flag</b> · notice period for the other side is only 7 days.</li><li><b class="dn">Flag</b> · no cap on your liability for indirect damages.</li><li>Ask before signing: who owns work produced during the term?</li></ul>`;
    case 'nda_check': return `<b>Verdict: NEGOTIATE</b><ul><li>Scope covers "all information", too broad.</li><li>5-year term; 2 years is common.</li><li>Jurisdiction is fine.</li></ul>`;
    case 'solidity_review': return `<b>Review · ${s}</b><ul><li><b class="dn">High</b> · external call before state update in withdraw() (re-entrancy).</li><li><b class="acc">Medium</b> · owner can change fees without a timelock.</li><li>Low · 3 missing events, 1 unchecked return value.</li></ul>`;
    case 'token_rug_check': return `<b>Verdict: CAUTION</b><ul><li>Mint function present, owner not renounced.</li><li>LP locked 92% until 2027.</li><li>No hidden taxes found.</li></ul>`;
    case 'signal_snapshot': { const c = (String(reqs.market||'BTC').toUpperCase().match(/BTC|ETH|SOL|HYPE/)||['BTC'])[0]; const P = PERP[c]; return `<b>${c} · ${esc(reqs.horizon||'swing')}</b><ul><li>Price $${pxt(P.px)} (${pct(pch(c))} 24h).</li><li>Bias ${pch(c)>=0?'long':'short'} while ${pch(c)>=0?'above':'below'} $${pxt(P.px*(pch(c)>=0?0.985:1.015))}.</li><li>Invalidation $${pxt(P.px*(pch(c)>=0?0.972:1.028))}; funding ${f(P.fund,4)}%/h.</li></ul>`; }
    case 'perp_execute': { const c = (String(reqs.market||'BTC').toUpperCase().match(/BTC|ETH|SOL|HYPE/)||['BTC'])[0], P = PERP[c]; return `<b>Executed</b><ul><li>${esc(reqs.side||'long')} ${c} · ${esc(reqs.leverage||3)}x · margin ${esc(reqs.margin)} USDC</li><li>Entry $${pxt(P.px)} · stop 2% attached</li><li>Position is in your PAX wallet → Positions.</li></ul>`; }
    case 'research_report': return `<b>Report · ${s}</b><ul><li>Market map with 8 players and pricing.</li><li>3 opportunities, 2 risks, each sourced.</li><li>Recommendation and next steps.</li></ul><span class="dim mono">6 sources · PDF attached</span>`;
    case 'alpha_ping': return `<b>Alpha ping · ${s}</b><ul><li>3 headlines in the last 6 hours.</li><li>Action: watch volume on the next listing.</li><li>Risk: unlock next week. Invalidation: close below the weekly open.</li></ul>`;
    case 'brand_kit': return `<b>Brand kit · ${s}</b><ul><li>Logo in 3 variants (mark, wordmark, lockup).</li><li>5-color palette with contrast notes; type pairing.</li><li>3 social templates.</li></ul>`;
    case 'route_plan': return `<b>Route</b><ul><li>Optimal order for 6 stops: A → D → B → F → C → E.</li><li>42.3 km · 1 h 18 m with live traffic, 11 min saved.</li></ul>`;
    case 'translate_doc': return `<b>Translated to ${esc(reqs.lang||'target language')}</b><ul><li>1,240 words, glossary of 38 terms applied.</li><li>2 terms flagged for review.</li></ul>`;
    case 'arc_query': return `<b>Result</b><ul><li>1,284 matching transfers in the last 24h.</li><li>Top receiver 0x41c0…99e2 (18.4%).</li></ul><span class="dim mono">CSV attached</span>`;
    case 'pool_feed': return `<b>New pools</b><ul><li>4 pools in the window; 1 above risk score 70.</li></ul>`;
    case 'launch_copy': return `<b>Launch copy · ${s}</b><ul><li>7-post launch thread.</li><li>Landing hero, subhead and 3 feature blocks.</li><li>3 ad variants.</li></ul>`;
    case 'evaluate': return `<b>APPROVE</b> · deliverable matches all required elements.`;
    default: return `<b>Delivered</b> · ${s}`;
  }
}

/* ================= PAX (personal agent) ================= */
const STOP = new Set('the a an and or for to of in on my me i want need please can you with from this that get make do is are be some any about by at it'.split(' '));
const SYN = {contract:'legal contract', lawyer:'contract', rent:'contract', rental:'contract', nda:'nda', audit:'solidity review security', security:'review solidity', solidity:'solidity review', rug:'rug token', scam:'rug', logo:'brand', design:'brand', translate:'translation translate', translation:'translate', research:'research report', report:'research', news:'alpha', signal:'signal', trade:'signal', route:'route', delivery:'route', data:'query', onchain:'query arc', copy:'copy launch', thread:'copy', marketing:'copy launch', pools:'pool'};
function searchOfferings(q, n=3){
  const words = q.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2 && !STOP.has(w));
  const terms = words.flatMap(w => [w, ...(SYN[w]||'').split(' ').filter(Boolean)]);
  const scored = offerAll().filter(x => x.a.role!=='evaluator').map(x => { const hay = (x.o.key+' '+x.o.name+' '+x.o.desc+' '+x.a.name+' '+x.a.desc).toLowerCase(); let s = 0; terms.forEach(t => { if(hay.includes(t)) s += (x.o.key+' '+x.o.name).toLowerCase().includes(t) ? 3 : 1; }); if(x.a.name.toLowerCase().split(' ').some(w=>words.includes(w))) s += 5; return {...x, s: s ? s + x.a.stats.success/100 + Math.log10(1+x.a.stats.jobs)/10 : 0}; }).filter(x=>x.s>0).sort((a,b)=>b.s-a.s);
  return scored.slice(0,n);
}
let sideTab = 'wallet';
function paxView(v){
  const cc = () => S.chats.find(c=>c.id===S.cur);
  v.innerHTML = `<div class="mc">
    <section class="chat">
      <div class="chat-h"><div class="who">${CAT('smug',34)}<div><div class="n">PAX <span class="mono dim" style="font-weight:400;font-size:11px">Personal Agent eXecutor</span> <span class="live mono" style="font-weight:400;font-size:11px;margin-left:6px">online</span></div><div class="s" id="ch-title">${esc(cc().title)}</div></div></div>
        <div style="display:flex;gap:6px;align-items:center"><div class="seg" id="mode" role="group" aria-label="Mode"><button data-m="standard" aria-pressed="${S.mode==='standard'}">Standard</button><button data-m="pro" aria-pressed="${S.mode==='pro'}">Pro</button></div><div class="rel"><button class="ibtn" id="hist" aria-label="Chats"><svg class="i" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg></button><div class="menu" id="histm" hidden></div></div><button class="ibtn" id="newc" aria-label="New chat">${I.plus}</button></div></div>
      <div class="msgs" id="msgs" aria-live="polite"></div>
      <div class="composer"><div class="sug" id="sug"></div><div class="ask-for" id="askfor" hidden></div><form class="cbox" id="cform"><label for="cin" class="sr">Message</label><textarea id="cin" rows="1" placeholder="Describe what you need…"></textarea><button class="send" type="submit" aria-label="Send">${I.send}</button></form></div>
    </section>
    <aside class="side"><div class="tabs" id="stabs"><button data-v="wallet">Wallet</button><button data-v="jobs">Jobs</button><button data-v="points">Points</button><button data-v="agents">My agents</button></div><div class="side-b" id="sideb"></div></aside>
  </div>`;
  const msgs = $('#msgs'), cin = $('#cin');
  const fill = q => { cin.value = q; cin.focus(); };
  const intro = () => `<div class="intro fadein"><div style="display:flex;gap:14px;align-items:center">${CAT('smug',64,'bob')}<h2>Tell me what you need.<br><em>I'll hire the right agent.</em></h2></div><p class="mut" style="margin:0;max-width:600px">I search AXP, ask for the details the agent requires, show the price and ETA, and only start after you approve. USDC waits in escrow until the work is delivered. ${S.mode==='pro'?'<b style="color:var(--ink)">Pro mode:</b> give me a broad goal and I will plan a multi-agent job.':''}</p>
    <div class="exg">${(S.mode==='pro' ? [['Plan','Launch my AI note-taking app: brand, copy and a market report'],['Plan','Check this token, give me a signal, then size a trade'],['Plan','Prepare my rental: review the contract and translate it to German'],['Plan','Research robot charging networks and design a logo for mine']] : [['Hire','Review my rental contract for red flags'],['Hire','Audit my Solidity staking contract'],['Trade','Long BTC 100 USDC at 5x'],['Token','Buy 20 USDC of LUMEN'],['Launch','Launch a token for my agent Lumen'],['Wallet','Deposit 50 USDC to PAX']]).map(x=>`<button type="button" data-ex="${esc(x[1])}"><b>${x[0]}</b><span>${esc(x[1])}</span></button>`).join('')}</div></div>`;
  function paintAll(){ msgs.innerHTML = ''; if(!S.chat.length){ msgs.innerHTML = intro(); } else S.chat.forEach(renderMsg); paintAsk(); paintSug(); }
  function renderMsg(m){ const d = document.createElement('div'); d.className = 'm '+(m.me?'me':'bot')+' fadein'; d.innerHTML = m.me ? `<div class="bub">${m.h}</div>` : `${CAT(m.mood||'smug',28)}<div class="bub">${body(m)}</div>`; msgs.appendChild(d); m.el = d; msgs.scrollTop = msgs.scrollHeight; }
  const rer = m => { if(m.el && document.body.contains(m.el)){ const nb = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 140; $('.bub', m.el).innerHTML = body(m); if(nb) msgs.scrollTop = msgs.scrollHeight; } };
  const say = (h, extra={}) => { const m = {h, ...extra}; S.chat.push(m); renderMsg(m); return m; };
  const push = m => { S.chat.push(m); renderMsg(m); return m; };
  function paintAsk(){ const el = $('#askfor'), fl = S.flow, lf = S.lflow; if(lf && lf.chat===S.cur){ const Q = lqNext(lf.d), act = lqActive(lf.d); el.hidden = false; el.innerHTML = `▸ Launch · ${Q?esc(Q.label):'Summary'} <span class="dim">(${Q?act.indexOf(Q)+1:act.length}/${act.length})</span> <button class="btn sm ghost" id="fl-x" type="button">Cancel</button>`; cin.placeholder = Q ? Q.label+'…' : 'Describe what you need…'; $('#fl-x').onclick = () => { S.lflow = null; paintAsk(); paintSug(); say('Okay, launch cancelled. Nothing was created.'); }; return; }
    if(fl && fl.chat===S.cur){ el.hidden = false; el.innerHTML = `▸ ${esc(fl.o.reqs[fl.idx][1])} <span class="dim">(${fl.idx+1}/${fl.o.reqs.length})</span> <button class="btn sm ghost" id="fl-x" type="button">Cancel</button>`; cin.placeholder = fl.o.reqs[fl.idx][1]+'…'; $('#fl-x').onclick = () => { S.flow = null; paintAsk(); say('Okay, cancelled.'); }; } else { el.hidden = true; cin.placeholder = S.mode==='pro' ? 'Describe a goal; I will plan it…' : 'Describe what you need…'; } }
  function paintSug(){ const el = $('#sug'); if(!S.chat.length || S.flow || S.lflow){ el.innerHTML = ''; return; } const list = S.mode==='pro' ? ['Launch my app: brand, copy and a market report'] : ['Review my contract','Audit a token','Long ETH 50 USDC at 3x','Buy 10 USDC of VERA','Launch a token','Deposit 50 USDC to PAX','Show my jobs']; el.innerHTML = list.map(x=>`<button class="chip" type="button" data-ex="${esc(x)}">${esc(x)}</button>`).join(''); }

  /* ---- message bodies ---- */
  function body(m){
    if(m.kind==='launch') return launchCardHTML(m);
    if(m.h) return m.h + (m.opts && m.opts.length && !m.answered ? `<div class="qr">${m.opts.map(o=>`<button type="button" class="chip" data-ans="${esc(o)}">${esc(o)}</button>`).join('')}</div>` : '');
    if(m.kind==='pick') return `I found ${m.res.length} agent${m.res.length>1?'s':''} for this. Your PAX wallet has <b class="mono">${f(S.pax)} USDC</b>.
      <div class="pick">${m.res.map((x,i)=>`<button type="button" data-pick="${i}" class="${m.chosen===i?'chosen':''}" ${m.chosen!=null?'disabled':''}>${av(x.a.id,x.a.color,'sm')}<div style="min-width:0"><div class="n">${esc(x.a.name)} · <span class="mono">${esc(x.o.key)}</span></div><div class="mut" style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.o.desc)}</div><div class="mono dim" style="font-size:11px">${f(x.a.stats.success,1)}% success · ${f0(x.a.stats.jobs)} jobs · SLA ${x.o.sla}m</div></div><div class="pp">${x.o.pctFee?x.o.pctFee+'%':f(x.o.price)}<small>USDC</small></div></button>`).join('')}</div>`;
    if(m.kind==='confirm'){ const {a,o} = m, st = m.state, fund = o.fund ? (+m.reqs.margin||0) : 0, fee = o.pctFee ? fund*o.pctFee/100 : o.price, tot = fee + fund;
      return `${st==='pending'?'Here is the job. Check the details, edit anything, then approve.':st==='approved'?'Approved. Job created.':'Cancelled.'}
      <div class="card"><div class="ch"><div class="who">${av(a.id,a.color,'sm')}<div><div class="n">${esc(a.name)}</div><div class="s">${esc(o.key)}</div></div></div><span class="tag ${st==='approved'?'up':st==='cancel'?'':'acc'}">${st==='approved'?'Job #'+m.jobId:st==='cancel'?'Cancelled':'Awaiting approval'}</span></div>
      <div class="cb"><dl class="cikv">${o.reqs.map(([k,l])=>`<dt>${esc(l)}</dt><dd>${st==='pending'?`<input class="ci" data-r="${esc(k)}" value="${esc(m.reqs[k]||'')}" aria-label="${esc(l)}">`:`<span class="mono">${esc(m.reqs[k]||'')}</span>`}</dd>`).join('')}</dl>
      <dl class="kv" style="margin-top:12px"><dt>Service fee</dt><dd>${f(fee,fee<1?4:2)} USDC${o.pctFee?` (${o.pctFee}%)`:''}</dd>${fund?`<dt>Principal (escrow)</dt><dd>${f(fund)} USDC</dd>`:''}<dt>Evaluator</dt><dd>${st==='pending'?`<label style="cursor:pointer"><input type="checkbox" data-ev ${m.ev?'checked':''} style="accent-color:var(--acc)"> Judge (5% of fee)</label>`:(m.ev?'Judge':'You approve')}</dd><dt>ETA</dt><dd>${o.sla} min</dd><dt>PAX wallet</dt><dd class="${tot>S.pax?'dn':''}">${f(S.pax)} USDC</dd><dt>Total now</dt><dd style="color:var(--ink)">${f(tot,tot<1?4:2)} USDC</dd></dl></div>
      ${st==='pending'?`<div class="cf"><button class="btn sm pri" data-a="approve">${tot>S.pax?'Deposit & approve':'Approve'}</button><button class="btn sm" data-a="cancel">Cancel</button><span class="dim mono" style="font-size:11px;margin-left:auto">Nothing runs until you approve</span></div>`:''}</div>`; }
    if(m.kind==='job'){ const j = JOBS.find(x=>x.id===m.jobId); if(!j) return ''; const a = AG(j.provider), idx = PHASES.indexOf(j.phase), bad = j.phase==='rejected'||j.phase==='expired';
      return `<div class="card"><div class="ch"><div class="who">${av(a.id,a.color,'sm')}<div><div class="n">Job #${j.id} · ${esc(j.offering)}</div><div class="s">${esc(a.name)} · ${f(j.price,j.price<1?4:2)} USDC</div></div></div><span class="ev ${j.phase}">${PH_LABEL[j.phase]}</span></div>
        <div class="cb"><div class="jt">${PHASES.map((p,i)=>`<div class="${bad&&i>=idx?'bad':i<idx||j.phase==='completed'?'ok':i===idx?'cur':''}"><i></i>${p.replace('_',' ')}</div>`).join('')}</div>
        ${j.phase==='open'?'<p class="mut" style="margin:8px 0 0;font-size:12.5px">Waiting for the agent to accept and set the budget…</p>':j.phase==='budget_set'?'<p class="mut" style="margin:8px 0 0;font-size:12.5px">Budget set. Funding escrow from your PAX wallet…</p>':j.phase==='funded'?`<p class="mut" style="margin:8px 0 0;font-size:12.5px">${f(j.price+(j.fundAmt||0),2)} USDC in escrow. The agent is working…</p>`:''}
        ${j.deliverable?`<div style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px" class="ink2">${j.deliverable}</div>`:''}
        ${bad?`<p class="dn" style="margin:8px 0 0;font-size:12.5px">${PH_LABEL[j.phase]}. Escrow returned to your PAX wallet.</p>`:''}
        ${j.phase==='completed'?`<p class="up mono" style="margin:8px 0 0;font-size:12px">Paid · provider ${f(j.price*provShare(j),4)} · ${j.evaluator?'evaluator '+f(j.price*.05,4)+' · ':''}token buyback ${f(j.price*.05,4)} · protocol ${f(j.price*.05,4)} USDC</p>`:''}</div>
        ${j.phase==='submitted'&&!j.evaluator?`<div class="cf"><button class="btn sm buy" data-a="accept" data-j="${j.id}">Approve & release</button><button class="btn sm sell" data-a="reject" data-j="${j.id}">Reject</button><span class="dim mono" style="font-size:11px;margin-left:auto">You are the evaluator</span></div>`:''}
        <div class="cf" style="padding-top:6px;padding-bottom:6px;border-top:1px solid var(--line)"><button class="btn sm ghost" data-a="openjob" data-j="${j.id}">On-chain details</button></div></div>`; }
    if(m.kind==='swap'){ const t = TK(m.sym), q = quote(t, m.side, m.qty||0), st = m.state;
      return `${st==='pending'?'Swap from your PAX wallet. Edit the amount if you like.':st==='done'?'Done.':'Cancelled.'}<div class="card"><div class="ch"><div class="who">${av(t.sym,t.color,'sm')}<b>${m.side==='buy'?'Buy':'Sell'} $${t.sym}</b></div><span class="tag ${st==='done'?'up':'acc'}">${st==='done'?'Filled':'Mint'}</span></div><div class="cb"><dl class="kv"><dt>${m.side==='buy'?'Pay (USDC)':'Sell ('+t.sym+')'}</dt><dd>${st==='pending'?`<input class="ci" data-q value="${m.side==='buy'?m.qty:Math.floor(m.qty)}" style="width:120px;text-align:right" aria-label="Amount">`:(m.side==='buy'?f(m.qty):cmp(m.qty))}</dd><dt>Receive</dt><dd>${st==='done'?(m.side==='buy'?cmp(m.res.amt)+' '+t.sym:f(m.res.usd)+' USDC'):(m.side==='buy'?'~'+cmp(q.recv)+' '+t.sym:'~'+f(q.recv)+' USDC')}</dd><dt>${q.tax>FEE?'Sniper tax':'Fee (1%)'}</dt><dd>${f(st==='done'?m.res.fee:q.fee)} USDC</dd><dt>PAX wallet</dt><dd>${f(S.pax)} USDC</dd></dl></div>${st==='pending'?`<div class="cf"><button class="btn sm ${m.side==='buy'?'buy':'sell'}" data-a="swap">Confirm</button><button class="btn sm" data-a="cancel">Cancel</button></div>`:''}</div>`; }
    if(m.kind==='xfer'){ const st = m.state, dep = m.dir==='in';
      return `${st==='pending'?(dep?'Move USDC from your wallet into your PAX wallet?':'Move USDC from PAX back to your wallet?'):st==='done'?'Done.':'Cancelled.'}<div class="card"><div class="ch"><b>${dep?'Deposit to PAX':'Withdraw from PAX'}</b><span class="tag ${st==='done'?'up':''}">USDC only</span></div><div class="cb"><dl class="kv"><dt>Amount (USDC)</dt><dd>${st==='pending'?`<input class="ci" data-q value="${m.qty}" style="width:120px;text-align:right" aria-label="Amount">`:f(m.qty)}</dd><dt>From</dt><dd>${dep?'Wallet · '+f(S.wallet):'PAX · '+f(S.pax)}</dd><dt>To</dt><dd>${dep?'PAX wallet':'Wallet'}</dd></dl></div>${st==='pending'?`<div class="cf"><button class="btn sm pri" data-a="xfer">${dep?'Deposit':'Withdraw'}</button><button class="btn sm" data-a="cancel">Cancel</button></div>`:''}</div>`; }
    if(m.kind==='plan'){ const st = m.state, tot = m.steps.reduce((x,s)=>x+s.o.price,0);
      return `${st==='pending'?'Here is my plan. Remove a step or edit the goal, then approve and I will run it end to end.':st==='run'?'Running the plan…':st==='done'?'Plan complete. Consolidated result below.':'Cancelled.'}
        <div class="card"><div class="ch"><b>Plan · ${m.steps.length} jobs</b><span class="tag ${st==='done'?'up':'acc'}">${st==='done'?'Done':st==='run'?'Running':'Pro'}</span></div><div class="cb"><ol class="plan">${m.steps.map((s,i)=>{ const j = s.jobId && JOBS.find(x=>x.id===s.jobId); return `<li><div><div class="n">${esc(s.a.name)} · <span class="mono">${esc(s.o.key)}</span></div><div class="mut" style="font-size:12px">${esc(s.why)}</div>${j?`<span class="ev ${j.phase}">${PH_LABEL[j.phase]} · #${j.id}</span>`:''}</div><div style="text-align:right"><div class="mono">${f(s.o.price)}</div>${st==='pending'&&m.steps.length>1?`<button class="btn sm ghost" data-a="rmstep" data-i="${i}">Remove</button>`:''}</div></li>`; }).join('')}</ol>
        <dl class="kv" style="margin-top:10px"><dt>Estimated total</dt><dd style="color:var(--ink)">${f(tot)} USDC</dd><dt>PAX wallet</dt><dd class="${tot>S.pax?'dn':''}">${f(S.pax)} USDC</dd></dl>
        ${st==='done'?`<div style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px" class="ink2">${m.steps.map(s=>{ const j = JOBS.find(x=>x.id===s.jobId); return j&&j.deliverable?`<div style="margin-bottom:8px"><span class="label">${esc(s.a.name)}</span>${j.deliverable}</div>`:''; }).join('')}</div>`:''}</div>
        ${st==='pending'?`<div class="cf"><button class="btn sm pri" data-a="runplan">${tot>S.pax?'Deposit & approve plan':'Approve plan'}</button><button class="btn sm" data-a="cancel">Cancel</button></div>`:''}</div>`; }
    return '';
  }

  /* ---- actions ---- */
  msgs.addEventListener('click', e => {
    const ex = e.target.closest('[data-ex]'); if(ex){ fill(ex.dataset.ex); return; }
    const an = e.target.closest('[data-ans]'); if(an){ send(an.dataset.ans); return; }
    const el = e.target.closest('.m'), m = el && S.chat.find(x=>x.el===el);
    const pk = e.target.closest('[data-pick]'); if(pk && m && m.chosen==null){ m.chosen = +pk.dataset.pick; rer(m); const x = m.res[m.chosen]; startFlow(x.a, x.o, {}); return; }
    const b = e.target.closest('[data-a]'); if(!b || !m) return;
    act(m, b.dataset.a, b);
  });
  msgs.addEventListener('change', e => {
    const el = e.target.closest('.m'), m = el && S.chat.find(x=>x.el===el); if(!m || m.state!=='pending') return;
    if(e.target.dataset.l != null){ const k = e.target.dataset.l, v2 = e.target.value.trim(); if(k==='sym'){ const s = v2.replace(/^\$/,'').toUpperCase(); if(!/^[A-Z0-9]{2,8}$/.test(s)){ toast('A ticker is 2 to 8 letters or numbers.'); } else if(s!==m.d.sym && (TK(s)||PRESALES.some(p=>p.sym===s))){ toast(`$${s} is taken.`); } else m.d.sym = s; } else if(v2) m.d[k] = v2; rer(m); }
    else if(e.target.dataset.r != null){ m.reqs[e.target.dataset.r] = e.target.value; rer(m); }
    else if(e.target.hasAttribute('data-ev')){ m.ev = e.target.checked; rer(m); }
    else if(e.target.hasAttribute('data-q')){ const v2 = parseFloat(e.target.value); if(!(v2>0)){ toast('Enter an amount above 0.'); } else m.qty = v2; rer(m); }
  });
  msgs.addEventListener('keydown', e => { if(e.key==='Enter' && e.target.classList.contains('ci')){ e.preventDefault(); e.target.blur(); } });
  function needDeposit(amt, then){ const need = Math.ceil((amt - S.pax)*100)/100; if(need <= 0) return then(); if(need > S.wallet){ toast('Not enough USDC in your wallet.'); return; } S.wallet -= need; S.pax += need; toast(`Deposited ${f(need)} USDC to PAX`); paintTop(); then(); }
  function act(m, a, b){
    if(a==='cancel'){ m.state = 'cancel'; rer(m); return; }
    if(a==='openjob'){ openJob(JOBS.find(x=>x.id==b.dataset.j)); return; }
    if(a==='accept' || a==='reject'){ const j = JOBS.find(x=>x.id==b.dataset.j); if(!j || j.phase!=='submitted') return; if(a==='accept'){ advance(j,'completed'); note('up','Job completed', `#${j.id} paid to ${AG(j.provider).name}.`); } else { advance(j,'rejected'); S.pax += j.price + (j.fundAmt||0); note('dn','Job rejected', `#${j.id} refunded to your PAX wallet.`); } const jm = S.chats.flatMap(c=>c.msgs).find(x=>x.kind==='job'&&x.jobId===j.id); if(jm){ jm.mood = a==='accept'?'happy':'smug'; rer(jm); } paintSide(); return; }
    if(m.state!=='pending') return;
    if(a==='approve'){ const fund = m.o.fund ? (+m.reqs.margin||0) : 0, fee = m.o.pctFee ? fund*m.o.pctFee/100 : m.o.price, tot = fee+fund;
      if(m.o.reqs.some(([k])=>!String(m.reqs[k]||'').trim())){ toast('Fill in every field.'); return; }
      if(m.o.fund && !(fund>0)){ toast('Enter a margin amount.'); return; }
      needDeposit(tot, () => { S.pax -= tot; const j = newJob('me', m.a.id, m.o.key, {price:fee, reqs:{...m.reqs}, evaluator:m.ev?'judge':null, mine:true}); j.fundAmt = fund; m.state = 'approved'; m.jobId = j.id; rer(m); const jm = push({kind:'job', jobId:j.id}); runMyJob(j, jm, false); paintSide(); paintTop(); });
      return; }
    if(a==='swap'){ const t = TK(m.sym), r = execTrade(t, m.side, m.qty, 'pax'); if(r.err){ toast(r.err); return; } m.res = r; m.state = 'done'; m.mood = 'happy'; rer(m); paintSide(); return; }
    if(a==='xfer'){ if(m.dir==='in'){ if(m.qty > S.wallet){ toast('Not enough USDC in your wallet.'); return; } S.wallet -= m.qty; S.pax += m.qty; } else { if(m.qty > S.pax){ toast('Not enough USDC in PAX.'); return; } S.pax -= m.qty; S.wallet += m.qty; } m.state = 'done'; rer(m); paintSide(); paintTop(); return; }
    if(a==='dolaunch'){ if(TK(m.d.sym)||PRESALES.some(p=>p.sym===m.d.sym)){ toast(`$${m.d.sym} is taken. Change the ticker.`); return; } const r = launchSpec(m.d); if(r.err){ toast(r.err); return; } m.state = 'done'; m.res = r; m.mood = 'happy'; rer(m); paintTop(); paintSide();
      say(r.kind==='live' ? `<b>$${r.sym}</b> is live on the bonding curve. Trading is open${m.d.snipe?' with anti-sniper for the first '+SNIPE[m.d.snipe]:''}.${r.prebuy?` Your pre-buy filled: <b>${cmp(r.prebuy.amt)} ${r.sym}</b>.`:''} You earn 70% of the 1% fee on every trade.` : r.kind==='scheduled' ? `<b>$${r.sym}</b> is scheduled. It shows in Upcoming launches with a countdown, and I'll tell you when it goes live.` : `The <b>$${r.sym}</b> presale is open for ${m.d.dur} hours. People join by locking points; when it ends, the raise seeds the curve and trading opens.`, {mood:'happy', opts: r.kind==='live' ? [`Buy 10 USDC of ${r.sym}`, 'Show my jobs'] : []}); return; }
    if(a==='editform'){ S.launchDraft = JSON.parse(JSON.stringify(m.d)); location.hash = 'create'; return; }
    if(a==='rmstep'){ m.steps.splice(+b.dataset.i, 1); rer(m); return; }
    if(a==='runplan'){ const tot = m.steps.reduce((x,s)=>x+s.o.price,0); needDeposit(tot, async () => { m.state = 'run'; rer(m); for(const s of m.steps){ S.pax -= s.o.price; const j = newJob('me', s.a.id, s.o.key, {price:s.o.price, reqs:{goal:m.goal}, mine:true}); s.jobId = j.id; rer(m); await new Promise(res => runMyJob(j, m, true, res)); rer(m); } m.state = 'done'; m.mood = 'happy'; rer(m); note('up','Plan complete', `${m.steps.length} jobs delivered.`); paintSide(); }); }
  }
  function runMyJob(j, msgRef, auto, done){
    const step = (ms, fn) => setTimeout(() => { fn(); if(msgRef) rer(msgRef); paintSide(); }, reduce ? 0 : ms);
    step(1300, () => advance(j,'budget_set'));
    step(2600, () => advance(j,'funded'));
    step(2600 + Math.min(6000, 1500 + j.sla*250), () => { j.deliverable = deliver(AG(j.provider).offerings.find(o=>o.key===j.offering), j.reqs); advance(j,'submitted'); if(j.offering==='perp_execute'){ const c = (String(j.reqs.market||'BTC').toUpperCase().match(/BTC|ETH|SOL|HYPE/)||['BTC'])[0]; S.perps.pos.push({id:j.id, coin:c, side:/short/i.test(j.reqs.side)?'short':'long', margin:j.fundAmt||0, lev:Math.max(1, Math.min(S.maxLev, parseInt(j.reqs.leverage)||3)), entry:PERP[c].px, t:Date.now()}); } if(auto || j.evaluator){ setTimeout(() => { if(j.phase==='submitted'){ advance(j,'completed'); if(msgRef){ msgRef.mood = 'happy'; rer(msgRef); } paintSide(); } if(done) done(); }, reduce ? 0 : 1400); } else { note('acc','Delivered', `Job #${j.id} needs your approval.`); if(done) done(); } });
  }
  function startFlow(a, o, pre){
    const reqs = {...pre}, missing = o.reqs.findIndex(([k]) => !reqs[k]);
    if(missing < 0){ push({kind:'confirm', a, o, reqs, state:'pending'}); return; }
    S.flow = {chat:S.cur, a, o, idx:missing, reqs};
    say(`<b>${esc(a.name)}</b> needs ${o.reqs.length} detail${o.reqs.length>1?'s':''} for <span class="mono">${esc(o.key)}</span>. Price ${o.pctFee?o.pctFee+'% of principal':f(o.price)+' USDC'}, about ${o.sla} min.<br><br>${esc(o.reqs[missing][1])}?`);
    paintAsk(); paintSug();
  }
  function answerFlow(q){
    const fl = S.flow; fl.reqs[fl.o.reqs[fl.idx][0]] = q;
    const next = fl.o.reqs.findIndex(([k]) => !fl.reqs[k]);
    if(next < 0){ S.flow = null; paintAsk(); push({kind:'confirm', a:fl.a, o:fl.o, reqs:fl.reqs, state:'pending'}); paintSug(); return; }
    fl.idx = next; say(esc(fl.o.reqs[next][1])+'?'); paintAsk();
  }
  function askLaunch(){
    const lf = S.lflow, Q = lqNext(lf.d);
    if(lf.last){ lf.last.answered = true; rer(lf.last); }
    if(!Q){ S.lflow = null; paintAsk(); paintSug(); push({kind:'launch', d:lf.d, state:'pending'}); return; }
    lf.last = say(Q.ask(lf.d), {opts:Q.opts(lf.d)}); paintAsk();
  }
  function startLaunch(q){
    const d = preParseLaunch(q, {});
    const got = [d.name&&'name '+esc(d.name), d.sym&&'ticker $'+d.sym, d.agent&&AG(d.agent)&&'agent '+esc(AG(d.agent).name), d.type&&(d.type==='presale'?'a presale':'a standard launch'), d.raise&&'raise '+f0(d.raise)+' USDC', d.when!==undefined&&d.type!=='presale'&&(d.when?'in '+d.when+'h':'right away')].filter(Boolean);
    S.lflow = {chat:S.cur, d};
    say(`Let's launch your agent token. I'll ask a few short questions and show you everything before anything is created.${got.length?` From your message I already have: ${got.join(', ')}.`:''}`);
    askLaunch(); paintSug();
  }
  function answerLaunch(q){
    const lf = S.lflow, Q = lqNext(lf.d); if(!Q){ askLaunch(); return; }
    const r = Q.parse(q, lf.d);
    if(r !== true){ if(lf.last){ lf.last.answered = true; rer(lf.last); } lf.last = say(esc(r), {opts:Q.opts(lf.d)}); return; }
    askLaunch();
  }
  const word = (s, w) => new RegExp('\\b'+w+'\\b','i').test(s);
  const num = (q, re) => { const m = q.match(re); return m ? parseFloat(m[1].replace(/,/g,'')) : null; };
  function respond(q){
    if(S.flow && S.flow.chat===S.cur){ answerFlow(q); return; }
    if(S.lflow && S.lflow.chat===S.cur){ answerLaunch(q); return; }
    const lq = q.toLowerCase();
    if((/\b(launch|create|deploy|mint|make|start)\b/.test(lq) && /\b(token|coin|presale)\b/.test(lq)) || /\blaunch\s+\$[a-z0-9]/i.test(q)){ startLaunch(q); return; }
    if(/\b(deposit|top ?up|fund)\b/i.test(q) && !/\bjob\b/.test(lq)){ push({kind:'xfer', dir:'in', qty:num(q,/([\d,]*\.?\d+)/)||50, state:'pending'}); return; }
    if(/\bwithdraw\b/i.test(q)){ push({kind:'xfer', dir:'out', qty:Math.min(num(q,/([\d,]*\.?\d+)/)||S.pax, S.pax), state:'pending'}); return; }
    const t = TOKENS.find(x => word(q, x.sym));
    if(t && /\b(buy|purchase|ape)\b/i.test(q)){ push({kind:'swap', sym:t.sym, side:'buy', qty:num(q,/([\d,]*\.?\d+)\s*(?:usdc|usd|\$)/i)||num(q,/\$\s*([\d,]*\.?\d+)/)||num(q,/([\d,]*\.?\d+)/)||20, state:'pending'}); return; }
    if(t && /\bsell\b/i.test(q)){ const have = S.hold[t.sym]||0; if(!have){ say(`You don't hold any $${t.sym}.`); return; } const p = num(q,/(\d+)\s*%/); push({kind:'swap', sym:t.sym, side:'sell', qty: p ? have*Math.min(100,p)/100 : /\ball\b/i.test(q) ? have : have/2, state:'pending'}); return; }
    const c = COINS.find(x => word(q, x));
    if(c && /\b(long|short)\b/i.test(q)){ const orca = AG('orca'), o = orca.offerings.find(x=>x.key==='perp_execute'); say(`For perps I use <b>Orca</b>'s <span class="mono">perp_execute</span> offering: your margin goes into escrow, Orca opens the position and the job completes when it's filled. Fee ${o.pctFee}% of margin.`); startFlow(orca, o, {market:c, side:/\bshort\b/i.test(q)?'short':'long', margin:String(num(q,/([\d,]*\.?\d+)\s*(?:usdc|usd)\b/i)||num(q,/\$\s*([\d,]*\.?\d+)/)||''), leverage:String(num(q,/(\d+)\s*x\b/i)||'')}); return; }
    if(/\b(my )?jobs?\b/.test(lq) && /\b(show|list|my|status)\b/.test(lq)){ const mj = JOBS.filter(j=>j.mine).slice(0,6); say(mj.length ? `Your recent jobs:<ul>${mj.map(j=>`<li>#${j.id} · ${esc(AG(j.provider).name)} · <span class="ev ${j.phase}">${PH_LABEL[j.phase]}</span></li>`).join('')}</ul>` : 'No jobs yet. Tell me what you need and I will find an agent.'); sideTab = 'jobs'; paintSide(); return; }
    if(/\b(balance|wallet)\b/.test(lq)){ say(`PAX wallet <b class="mono">${f(S.pax)} USDC</b> · main wallet <b class="mono">${f(S.wallet)} USDC</b>.`); return; }
    if(/\b(connect|bring|existing|already)\b/.test(lq) && /\b(agent)\b/.test(lq)){ say('Opening AXP so you can connect the agent you already run. A token is optional.'); setTimeout(()=>location.hash='join', 600); return; }
    if(/\b(create|build|make|launch)\b/.test(lq) && /\b(agent)\b/.test(lq)){ say('Opening the PAX agent builder. It joins AXP when you finish.'); setTimeout(()=>location.hash='newagent', 600); return; }
    if(S.mode==='pro'){ plan(q); return; }
    const res = searchOfferings(q, 3);
    if(!res.length){ say(`I couldn't find an agent for that yet. Try describing the outcome (for example "audit my contract", "translate a document") or browse <a href="#axp/offerings">offerings on AXP</a>.`); return; }
    push({kind:'pick', res, chosen:null});
  }
  function plan(goal){
    const parts = goal.split(/[:,;]|\band\b|\bthen\b/i).map(s=>s.trim()).filter(s=>s.length>2 && searchOfferings(s,1).length);
    const used = new Set(), steps = [];
    parts.forEach(p => { const r = searchOfferings(p, 3).find(x => !used.has(x.a.id+x.o.key) && !x.o.fund); if(r){ used.add(r.a.id+r.o.key); steps.push({a:r.a, o:r.o, why:'For: '+p}); } });
    if(!steps.length){ const r = searchOfferings(goal, 2); r.forEach(x => steps.push({a:x.a, o:x.o, why:'For: '+goal})); }
    if(!steps.length){ const sc = AG('scout'); steps.push({a:sc, o:sc.offerings[0], why:'Research the goal first'}); }
    push({kind:'plan', goal, steps, state:'pending'});
  }
  function send(q){
    if(!S.chat.length){ msgs.innerHTML = ''; const c = cc(); c.title = q.length>40 ? q.slice(0,38)+'…' : q; $('#ch-title').textContent = c.title; }
    cc().t = Date.now();
    push({me:true, h:esc(q)});
    const ty = document.createElement('div'); ty.className = 'm bot'; ty.innerHTML = `${CAT('think',28)}<div class="bub"><span class="typing"><i></i><i></i><i></i></span></div>`; msgs.appendChild(ty); msgs.scrollTop = msgs.scrollHeight;
    setTimeout(() => { ty.remove(); if(!document.body.contains(msgs)) return; respond(q); paintSug(); }, reduce ? 0 : 500);
  }

  /* ---- side panel ---- */
  function paintSide(){
    const el = $('#sideb'); if(!el) return;
    $$('#stabs button').forEach(b=>b.setAttribute('aria-selected', String(b.dataset.v===sideTab)));
    if(sideTab==='wallet'){
      const hv = Object.entries(S.hold).reduce((a,[s,amt])=>a+amt*price(TK(s)),0), upnl = S.perps.pos.reduce((a,p)=>a+(PERP[p.coin].px-p.entry)/p.entry*p.margin*p.lev*(p.side==='long'?1:-1),0);
      el.innerHTML = `<div class="wbal"><span class="label">PAX wallet</span><b>${f(S.pax)} <span class="mut" style="font-size:13px">USDC</span></b><div class="mut mono" style="font-size:11.5px">${short('0x'+[0,1,2,3,4].map(i=>hash(S.session.address+'pax'+i).toString(16).padStart(8,'0')).join(''))} · USDC only</div></div>
        <div class="tabs" id="wtab" style="border:1px solid var(--line)"><button data-w="in" aria-selected="${(S.wtab||'in')==='in'}">Deposit</button><button data-w="out" aria-selected="${S.wtab==='out'}">Withdraw</button></div>
        <form id="wform" style="display:flex;flex-direction:column;gap:8px"><div class="amt"><div class="t"><span>From ${(S.wtab||'in')==='in'?'wallet':'PAX'}</span><button type="button" class="btn sm ghost" id="wmax" style="height:20px">Max</button></div><input id="wamt" type="number" min="0" step="any" placeholder="0" aria-label="Amount"><span class="u">USDC</span></div><div class="mut mono" style="font-size:11.5px">Available ${f((S.wtab||'in')==='in'?S.wallet:S.pax)} USDC. Tip: keep 2–5× a job's price for retries.</div><button class="btn pri block">${(S.wtab||'in')==='in'?'Deposit to PAX':'Withdraw to wallet'}</button></form>
        <div><div class="label" style="margin-bottom:6px">Positions</div>${S.perps.pos.length ? S.perps.pos.map(p=>{ const pl = (PERP[p.coin].px-p.entry)/p.entry*p.margin*p.lev*(p.side==='long'?1:-1); return `<div class="jobrow" style="cursor:default"><div style="display:flex;justify-content:space-between"><span><span class="tag ${p.side==='long'?'up':'dn'}">${p.side} ${p.lev}x</span> <b class="mono">${p.coin}</b></span><b class="mono ${pl>=0?'up':'dn'}">${pl>=0?'+':''}${f(pl)}</b></div><div class="mono dim" style="font-size:11px">margin ${f(p.margin)} · entry ${pxt(p.entry)} · mark ${pxt(PERP[p.coin].px)}</div><button class="btn sm" data-close-pos="${p.id}">Close</button></div>`; }).join('') : '<p class="mut" style="margin:0;font-size:12.5px">No positions. Try "Long ETH 50 USDC at 3x".</p>'}${S.perps.pos.length?`<div class="mono dim" style="font-size:11px;margin-top:6px">Unrealized ${f(upnl)} USDC · prices ${LIVE.ok?'live from DexScreener':'sample'}</div>`:''}</div>
        <div><div class="label" style="margin-bottom:6px">Tokens</div>${Object.keys(S.hold).length ? Object.entries(S.hold).map(([s,amt])=>{ const t = TK(s), val = amt*price(t), pl = S.cost[s] ? (val/S.cost[s]-1)*100 : 0; return `<a href="#token/${s}" class="jobrow" style="text-decoration:none;flex-direction:row;justify-content:space-between;align-items:center"><span class="who">${av(s,t.color,'xs')}<span class="mono">${s}</span></span><span class="mono" style="text-align:right">${f(val)}<br><span class="${pl>=0?'up':'dn'}" style="font-size:11px">${pct(pl,1)}</span></span></a>`; }).join('') : `<p class="mut" style="margin:0;font-size:12.5px">Hold ${f(hv)} USDC in tokens.</p>`}</div>`;
      $('#wtab').onclick = e => { const b = e.target.closest('[data-w]'); if(b){ S.wtab = b.dataset.w; paintSide(); } };
      $('#wmax').onclick = () => { $('#wamt').value = (S.wtab||'in')==='in' ? S.wallet : S.pax; };
      $('#wform').onsubmit = e => { e.preventDefault(); const a = +$('#wamt').value; if(!(a>0)){ toast('Enter an amount.'); return; } if((S.wtab||'in')==='in'){ if(a > S.wallet){ toast('Not enough USDC in your wallet.'); return; } S.wallet -= a; S.pax += a; toast(`Deposited ${f(a)} USDC to PAX`); } else { if(a > S.pax){ toast('Not enough USDC in PAX.'); return; } S.pax -= a; S.wallet += a; toast(`Withdrew ${f(a)} USDC`); } paintTop(); paintSide(); };
      el.onclick = e => { const c = e.target.closest('[data-close-pos]'); if(!c) return; const i = S.perps.pos.findIndex(p=>p.id==c.dataset.closePos); if(i<0) return; const p = S.perps.pos[i], pl = (PERP[p.coin].px-p.entry)/p.entry*p.margin*p.lev*(p.side==='long'?1:-1), fee = p.margin*p.lev*PERP_FEE; S.pax += Math.max(0, p.margin+pl-fee); S.perps.pos.splice(i,1); toast(`Closed ${p.coin}: ${pl>=0?'+':''}${f(pl-fee)} USDC`); paintSide(); };
    } else if(sideTab==='jobs'){
      el.onclick = e => { const r = e.target.closest('[data-job]'); if(r) openJob(JOBS.find(x=>x.id==r.dataset.job)); };
      const mj = JOBS.filter(j=>j.mine);
      el.innerHTML = mj.length ? mj.map(j=>`<div class="jobrow" data-job="${j.id}"><div style="display:flex;justify-content:space-between;gap:8px"><b class="mono">#${j.id}</b><span class="ev ${j.phase}">${PH_LABEL[j.phase]}</span></div><div class="mut" style="font-size:12.5px">${esc(AG(j.provider).name)} · ${esc(j.offering)}</div><div class="mono dim" style="font-size:11px">${f(j.price,j.price<1?4:2)} USDC · ${ago(j.created)} ago</div></div>`).join('') : '<div class="empty"><b>No jobs yet</b>Ask PAX for something and approve the job.</div>';
    } else {
      el.onclick = null;
      const mine = myAgents();
      el.innerHTML = (mine.length ? mine.map(a=>`<a class="jobrow" href="#agent/${a.id}" style="text-decoration:none"><div class="who">${av(a.id,a.color,'sm')}<div><div class="n">${esc(a.name)}</div><div class="s">${a.offerings.length} offerings · ${f0(a.stats.jobs)} jobs</div></div></div><div class="mono" style="font-size:12px">Earned today <span class="up">${f(a.earnedToday||0,4)} USDC</span></div></a>`).join('') : '<div class="empty"><b>No agents yet</b>Create one to sell jobs on AXP.</div>') + `<a class="btn" href="#newagent">${I.plus} Create agent</a>`;
    }
  }
  $('#stabs').onclick = e => { const b = e.target.closest('button'); if(b){ sideTab = b.dataset.v; paintSide(); } };
  $('#mode').onclick = e => { const b = e.target.closest('[data-m]'); if(!b) return; S.mode = b.dataset.m; $$('#mode button').forEach(x=>x.setAttribute('aria-pressed', String(x===b))); if(!S.chat.length) msgs.innerHTML = intro(); paintAsk(); paintSug(); toast(S.mode==='pro'?'Pro mode: plan first, then execute':'Standard mode'); };
  const hm = $('#histm');
  $('#hist').onclick = e => { e.stopPropagation(); hm.hidden = !hm.hidden; if(!hm.hidden) hm.innerHTML = `<div class="hd" style="justify-content:space-between"><b>Chats</b></div>` + [...S.chats].sort((a,b)=>b.t-a.t).map(c=>`<button class="mi" data-c="${c.id}" style="${c.id===S.cur?'background:var(--p2)':''}"><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.title)}</span><span class="dim mono" style="font-size:11px">${ago(c.t)}</span></button>`).join(''); };
  hm.onclick = e => { e.stopPropagation(); const b = e.target.closest('[data-c]'); if(!b) return; S.cur = +b.dataset.c; S.chat = cc().msgs; hm.hidden = true; $('#ch-title').textContent = cc().title; paintAll(); };
  document.addEventListener('click', function cl(e){ if(!document.body.contains(hm)){ document.removeEventListener('click', cl); return; } if(!e.target.closest('#histm') && !e.target.closest('#hist')) hm.hidden = true; });
  $('#newc').onclick = () => { if(!S.chat.length){ cin.focus(); return; } const id = Date.now(); S.chats.unshift({id, title:'New chat', msgs:[], t:Date.now()}); S.cur = id; S.chat = cc().msgs; $('#ch-title').textContent = 'New chat'; paintAll(); cin.focus(); };
  $('#cform').onsubmit = e => { e.preventDefault(); const q = cin.value.trim(); if(!q) return; cin.value = ''; send(q); };
  cin.addEventListener('keydown', e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); $('#cform').requestSubmit(); } });
  $('#sug').onclick = e => { const b = e.target.closest('[data-ex]'); if(b) fill(b.dataset.ex); };
  paintAll(); paintSide();
  if(S.pendingHire){ const {agentId, key} = S.pendingHire; S.pendingHire = null; const a = AG(agentId), o = a.offerings.find(x=>x.key===key); if(!S.chat.length){ msgs.innerHTML = ''; cc().title = 'Hire '+a.name; $('#ch-title').textContent = cc().title; } push({me:true, h:esc(`Hire ${a.name} for ${o.key}`)}); startFlow(a, o, {}); }
  live = () => { if(!$('#sideb').contains(document.activeElement)) paintSide(); };
}

/* ================= PROFILE ================= */
function pointsView(v){
  v.innerHTML = `<div class="pagehead"><div><h1>Points</h1><p>Earn points by posting about Opcode on X. Lock them to join presales; your share of all locked points sets your allocation.</p></div><div style="display:flex;gap:8px"><a class="btn" href="#tokens">Upcoming launches</a><button class="btn pri" id="pts-sub">${I.star} Submit your post</button></div></div><div class="panel" id="pts-host"></div>`;
  const host = $('#pts-host'); pointsPanel(host);
  $('#pts-sub').onclick = () => submitPostModal(() => render());
  live = () => { if(!host.contains(document.activeElement)) pointsPanel(host); };
}
function profileView(v){
  if(route.arg==='points'){ location.hash = 'points'; return; }
  const s = S.session, P = S.pts, mine = myAgents();
  const holds = Object.entries(S.hold).filter(([k,a])=>a>0 && TK(k)), hv = holds.reduce((x,[k,a])=>x+a*price(TK(k)),0), hc = holds.reduce((x,[k])=>x+(S.cost[k]||0),0);
  const launches = TOKENS.filter(t=>t.creator==='You'||t.creator===s.address||(t.agent&&AG(t.agent)&&AG(t.agent).owner===s.id));
  const myPs = PRESALES.filter(p=>p.creator==='You'||p.creator===s.address);
  const jobs = JOBS.filter(j=>j.mine || (AG(j.provider) && AG(j.provider).owner===s.id));
  const sub = (title, count, act, body) => `<section class="pf-sec"><div class="pf-sh"><h3>${title}${count!=null?` <span class="dim">${count}</span>`:''}</h3>${act||''}</div>${body}</section>`;
  v.innerHTML = `<div class="pf-id">
      ${av(s.address,null,'xl round')}
      <div class="pf-n"><h1>${esc(displayName())}</h1>
        <div class="pf-m">${P.x?`<span class="xh">@${esc(P.x.handle)}</span>`:`<a href="#points" class="linkbtn" style="font-size:13.5px">Link X</a>`}<button class="linkbtn addr" id="pf-cp" style="color:var(--mut);text-decoration:none;font-size:12.5px">${short(s.address)} ${I.copy}</button><span class="mut" style="font-size:13px">${s.kind==='wallet'?esc(s.wallet||'Wallet')+' on Arc':'Demo account'}</span></div></div>
      <div class="pf-a"><a class="btn" href="https://explorer.arc.io/address/${s.address}" target="_blank" rel="noopener">Explorer</a><button class="btn" id="pf-out">${I.logout} Sign out</button></div>
    </div>
    <div class="pf-grid">
      <div class="pf-col">
        <div class="pf-pts" id="pf-ptsc">
          <div class="pp-h"><span class="pp-k">${I.star} Points</span><span class="pp-r">${(()=>{ const all=[...LEADERS.map(l=>l[1]), P.earned].sort((x,y)=>y-x); return P.x&&P.earned ? '#'+(all.indexOf(P.earned)+1)+' this season' : 'Season 0'; })()}</span></div>
          <div class="pp-b"><b id="pf-pts">${f0(P.avail)}</b><span>available</span></div>
          <div class="pp-s"><span><b>${f0(P.locked)}</b> locked</span><span><b>${f0(P.burned)}</b> burned</span><span><b>${P.subs.length}</b> posts</span></div>
          <button class="btn pri lg block" id="pf-submit">${P.x?'Submit your post':'Link X to earn points'}</button>
          <a class="pp-l" href="#points">How points work and your posts</a>
        </div>
        <div class="panel pf-wallet">
          <div class="pf-sh"><h3>Wallet</h3><span class="dim" style="font-size:12.5px">USDC on Arc</span></div>
          <div class="pf-bal"><b>${f(S.wallet)}</b><span>USDC</span></div>
          <div class="pf-two"><a href="#pax"><span>PAX wallet</span><b>${f(S.pax)}</b></a><a href="#tokens"><span>Holdings</span><b>${f(hv)}</b></a></div>
        </div>
        <div class="panel">${sub('Holdings', holds.length, `<span class="mut" style="font-size:13px">${f(hv)} USDC <span class="${hv-hc>=0?'up':'dn'}">${hv-hc>=0?'+':''}${f(hv-hc)}</span></span>`,
          holds.length ? `<div class="pf-list">${holds.map(([k,amt])=>{ const t = TK(k), val = amt*price(t), c = S.cost[k]||0, pl = c?val-c:0; return `<a class="pf-row" href="#token/${k}">${av(k,t.color,'sm')}<div class="g"><b>${esc(t.name)}</b><span>${cmp(amt)} ${k}</span></div><div class="r"><b>${f(val)}</b><span class="${pl>=0?'up':'dn'}">${pl>=0?'+':''}${f(pl)}</span></div></a>`; }).join('')}</div>` : `<div class="empty"><b>No tokens yet</b><a class="btn sm" href="#tokens">Browse tokens</a></div>`)}</div>
      </div>
      <div class="pf-col">
        <div class="panel">
          ${sub('Agents', mine.length, `<a class="btn sm pri" href="#newagent">${I.plus} New agent</a>`,
            mine.length ? `<div class="pf-agents">${mine.map(a=>`<a class="pf-ag" href="#agent/${a.id}">${av(a.id,a.color,'lg')}<div class="g"><b>${esc(a.name)}</b><span>@${esc(a.handle)} · ${a.offerings.length} offerings</span></div><div class="pf-ag-k"><div><span>Jobs</span><b>${f0(a.stats.jobs)}</b></div><div><span>Revenue</span><b>${usd(a.stats.rev)}</b></div><div><span>Today</span><b class="up">${f(a.earnedToday||0,2)}</b></div><div><span>Token</span><b>${a.sym&&TK(a.sym)?'$'+a.sym:'—'}</b></div></div></a>`).join('')}</div>` : `<div class="empty"><b>No agents yet</b><span>Create an agent and sell its work on AXP.</span></div>`)}
          ${sub('Jobs', jobs.length, `<span class="mut" style="font-size:12.5px">as client and provider</span>`,
            jobs.length ? `<div class="scroll-x"><table class="tbl"><thead><tr><th>Job</th><th>Role</th><th>Counterparty</th><th>Offering</th><th>Phase</th><th class="r">Budget</th></tr></thead><tbody>${jobs.slice(0,12).map(j=>`<tr class="click" data-job="${j.id}"><td>#${j.id}</td><td>${j.mine?'Client':'Provider'}</td><td>${esc(j.mine?AG(j.provider).name:partyName(j.client))}</td><td>${esc(j.offering)}</td><td><span class="ev ${j.phase}">${PH_LABEL[j.phase]}</span></td><td class="r">${f(j.price,j.price<1?4:2)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty"><span>No jobs yet. Ask PAX to hire an agent.</span></div>`)}
          ${sub('Launches', launches.length + myPs.length, `<a class="btn sm" href="#create">${I.rocket} Launch your agent token</a>`,
            (launches.length || myPs.length) ? `<div class="pf-list">${myPs.filter(p=>!p.settled).map(p=>`<a class="pf-row" href="#launch/${p.sym}">${av(p.sym,p.color,'sm')}<div class="g"><b>$${p.sym}</b><span>${p.kind==='presale'?'Presale · '+usd(p.usdOthers+p.my.usdc)+' of '+usd(p.target):'Launches in '+left(p.start-Date.now())}</span></div><div class="r"><span class="tag ${p.kind==='presale'?'acc':'info'}">${p.kind==='presale'?'Presale':'Scheduled'}</span></div></a>`).join('')}${launches.map(t=>`<a class="pf-row" href="#token/${t.sym}">${av(t.sym,t.color,'sm')}<div class="g"><b>$${t.sym}</b><span>FDV ${usd(fdv(t))} · vol ${usd(t.vol)}</span></div><div class="r"><b class="up">${f(t.vol*FEE*FEE_CREATOR)}</b><span>your fees</span></div></a>`).join('')}</div>` : `<div class="empty"><span>No launches yet.</span></div>`)}
        </div>
      </div>
    </div>`;
  $('#pf-out').onclick = signOut;
  $('#pf-submit').onclick = () => submitPostModal(() => render());
  $('#pf-cp').onclick = () => { try{ navigator.clipboard.writeText(s.address); toast('Address copied'); }catch(e){} };
  v.addEventListener('click', e => { const j = e.target.closest('[data-job]'); if(j) openJob(JOBS.find(x=>x.id==j.dataset.job)); });
  live = () => { const pp = $('#pf-pts'); if(pp) pp.textContent = f0(S.pts.avail); };
}

/* ================= onboarding ================= */
function openOnboarding(){
  if(!S.session) return;
  let step = 0, dep = Math.min(25, S.wallet);
  const scrim = openModal('', `<div class="onb" id="onb"></div>`);
  const box = $('#onb', scrim);
  const finish = () => { S.onb = true; store.set('opcode.onb.'+S.session.address.toLowerCase(), 1); closeModal(); render(); };
  const draw = () => {
    if(step===0) box.innerHTML = `${CAT('smug',110,'bob')}<h2>Hi, I'm PAX.</h2><p class="mono dim" style="font-size:12px">Personal Agent eXecutor · mascot: sudo the cat</p><p>Tell me what you need and I hire the right agent on AXP, keeping your USDC in escrow until the work is delivered. I can also build an agent for you from scratch.</p><div class="how"><div><b>01</b>You describe the task</div><div><b>02</b>I pick an agent and ask for details</div><div><b>03</b>You approve; escrow pays on delivery</div></div><div class="cta"><button class="btn ghost" id="o-s">Skip</button><button class="btn pri" id="o-n">Next</button></div>`;
    else box.innerHTML = `${CAT('think',90)}<h2>Fund your PAX wallet</h2><p>PAX pays agents from its own USDC wallet. Move a little in now; you can withdraw anytime.</p><div class="amt" style="width:100%;max-width:320px;text-align:left"><div class="t"><span>Deposit</span><span>Wallet ${f(S.wallet)}</span></div><input id="o-a" type="number" min="0" value="${dep}" aria-label="Deposit amount"><span class="u">USDC</span></div><div class="cta"><button class="btn ghost" id="o-s">Later</button><button class="btn pri" id="o-n">Deposit and start</button></div>`;
    $('#o-s', box).onclick = finish;
    $('#o-n', box).onclick = () => { if(step===0){ step = 1; draw(); return; } const a = Math.max(0, +$('#o-a').value||0); if(a > S.wallet){ toast('More than your wallet balance.'); return; } S.wallet -= a; S.pax += a; paintTop(); if(a) toast(`Deposited ${f(a)} USDC to PAX`); finish(); };
  };
  draw();
}

/* ================= engine ================= */
const BUYERS = ['PAX of selin.eth','PAX of mert.arc','0x41c0…99e2','deniz.arc','0x9a07…111f','PAX of ece','0x55f1…e9c2'];
function engine(){
  const r = Math.random;
  if(!LIVE.ok) COINS.forEach(c => { const P = PERP[c]; P.px *= 1 + (r()-.5)*P.vol*2; P.hist.push(P.px); if(P.hist.length>200) P.hist.shift(); });
  tickPoints(); tickPresales();
  for(let k=0;k<5;k++){ const t = TOKENS[Math.floor(r()*TOKENS.length)]; if(t.snipe && snipeTax(t) > 0.2 && r()<.8) continue; if(r()<.6) doTrade(t,'buy', Math.round(3+r()*160), rid()); else doTrade(t,'sell', (3+r()*90)/price(t), rid()); if(r()<.05) t.holders++; }
  const ids = AGENTS.filter(a=>a.role!=='evaluator').map(a=>a.id);
  if(r() < .55){ const prov = ids[Math.floor(r()*ids.length)], cl = r()<.45 ? ids[Math.floor(r()*ids.length)] : BUYERS[Math.floor(r()*BUYERS.length)]; if(cl!==prov){ const a = AG(prov), o = a.offerings[Math.floor(r()*a.offerings.length)]; const j = newJob(cl, prov, o.key, {evaluator: r()<.25 ? 'judge' : null}); if(j.price===0) j.price = 0.5; if(a.owner===S.session?.id) log(a.id,'info',`→ job #${j.id} created by ${partyName(cl)} · ${o.key}`); } }
  JOBS.filter(j=>!j.mine && !['completed','rejected','expired'].includes(j.phase)).slice(0,12).forEach(j => { if(r() < .45){ const i = PHASES.indexOf(j.phase); let nx = PHASES[i+1]; if(j.phase==='submitted' && r()<.04) nx = 'rejected'; if(j.phase==='open' && r()<.02) nx = 'expired'; if(nx==='submitted'){ j.deliverable = deliver(AG(j.provider).offerings.find(o=>o.key===j.offering)||{}, {}); } advance(j, nx); const a = AG(j.provider); if(a.owner===S.session?.id) log(a.id, nx==='completed'?'pay':'ok', `${nx==='completed'?'$':'✓'} #${j.id} ${PH_LABEL[nx].toLowerCase()}`); } });
  if(live) try{ live(); }catch(e){ console.error(e); }
  paintTape(); paintTop();
}
setInterval(engine, 2600);
fetchPrices(); setInterval(fetchPrices, 20000);

/* ================= whitepaper ================= */
function paperView(v){
  v.appendChild($('#tpl-wp').content.cloneNode(true));
  const links = $$('#wp-toc a', v), secs = links.map(a => document.getElementById(a.dataset.to));
  links.forEach(a => a.onclick = e => { e.preventDefault(); const t = document.getElementById(a.dataset.to); if(t) t.scrollIntoView({behavior: reduce?'auto':'smooth'}); });
  const onS = () => { if(!document.body.contains(v)){ window.removeEventListener('scroll', onS); return; } let cur = secs[0]; secs.forEach(s => { if(s && s.getBoundingClientRect().top < 160) cur = s; }); links.forEach(a => a.classList.toggle('on', a.dataset.to===cur.id)); };
  window.addEventListener('scroll', onS, {passive:true}); onS();
  if(route.arg){ const t = document.getElementById(route.arg); if(t) setTimeout(()=>t.scrollIntoView(), 30); }
}

/* ================= boot ================= */
if(/\.test$/.test(location.hostname)) window.__op = {S, PRESALES, psEst, TK};
(async () => { const ok = await restore(); if(!ok) render(); })();
})();
