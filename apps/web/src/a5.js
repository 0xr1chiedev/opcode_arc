
/* ================= POINTS (InfoFi) ================= */
// Points come from X posts about Opcode. Wallet sign-in → link X → submit post links → scored by engagement.
S.pts = {avail:0, locked:0, burned:0, earned:0, x:null, subs:[]};
const PT_RULE = {like:1, reply:2, repost:3, quote:4, viewsPer:100, perPostCap:1500, perDay:10, maxAgeDays:7, trackHours:72};
const X_EPOCH = 1288834974657n;
function postTime(id){ try{ return Number((BigInt(id) >> 22n) + X_EPOCH); }catch(e){ return 0; } }
function parsePost(u){ const m = String(u||'').trim().match(/^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status\/(\d{6,25})(?:[/?#].*)?$/i); return m ? {handle:m[1], id:m[2]} : null; }
function ptsFor(m, q){ return Math.min(PT_RULE.perPostCap, Math.round((m.likes*PT_RULE.like + m.replies*PT_RULE.reply + m.reposts*PT_RULE.repost + m.quotes*PT_RULE.quote + m.views/PT_RULE.viewsPer) * q)); }
function samplePostUrl(){ const h = S.pts.x ? S.pts.x.handle : 'you'; const ms = BigInt(Date.now() - Number(X_EPOCH) - Math.floor(Math.random()*36e5*30)); const id = (ms << 22n) | BigInt(Math.floor(Math.random()*4194303)); return `https://x.com/${h}/status/${id}`; }
function scorePost(sub){
  const r = rng(hash(sub.id)), views = Math.round(Math.exp(Math.log(400) + r()*(Math.log(60000)-Math.log(400)))), likes = Math.round(views*(0.008+r()*0.035));
  const reposts = Math.round(likes*(0.06+r()*0.22)), replies = Math.round(likes*(0.08+r()*0.3)), quotes = Math.round(reposts*(0.05+r()*0.3));
  sub.m = {views, likes, reposts, replies, quotes}; sub.q = +(0.8 + r()*0.5).toFixed(2); sub.status = 'tracking'; sub.scoredAt = Date.now();
  creditPost(sub);
}
function creditPost(sub){ const p = ptsFor(sub.m, sub.q), add = p - (sub.pts||0); if(add > 0){ sub.pts = p; S.pts.avail += add; S.pts.earned += add; } }
function tickPoints(){
  S.pts.subs.forEach(s => {
    if(s.status==='checking' && Date.now()-s.t > 3500) { scorePost(s); note('up','Points', `+${f0(s.pts)} points for your post`); }
    else if(s.status==='tracking'){ const r = Math.random; if(r()<.35 && s.grow < 14){ s.grow = (s.grow||0)+1; const g = 1 + r()*0.03; ['views','likes','reposts','replies','quotes'].forEach(k=>s.m[k] = Math.round(s.m[k]*g + (r()<.3?1:0))); creditPost(s); } if(s.grow>=14) s.status = 'final'; }
  });
}
const LEADERS = [['@selin_onchain',48210],['@mertbuilds',41980],['@0xdeniz',37440],['@ece_agents',30215],['@arcmaxi',26900],['@kaan.eth',22410],['@yield_yusuf',19870],['@robo_irem',15520],['@pax_power',12260],['@bora_ships',9840]];
function linkXModal(done){
  const s = S.session; if(!s){ openConnect(); return; }
  const scrim = openModal('Link your X account', `<div class="mb">
    <div class="xl-steps"><div class="ok"><b>01</b>Wallet signed in<span class="mono dim">${short(s.address)}</span></div><div class="on"><b>02</b>Authorize X</div><div><b>03</b>Wallet signs the link</div></div>
    <p class="mut" style="margin:0">Links in the points form are matched to this X account. One X account per wallet; you can change it once every 30 days.</p>
    <div class="field"><label for="xl-h">X handle</label><div class="amt" style="padding:6px 10px"><span class="mono dim">@</span><input id="xl-h" class="mono" placeholder="yourhandle" maxlength="15" autocomplete="off" style="font-size:16px"></div><span class="hint">Preview: in production this button opens X sign-in (OAuth) and the handle is read from X, not typed.</span></div>
    <div id="xl-e" class="dn" role="alert" style="font-size:13px"></div></div>`,
    `<button class="btn" data-close>Cancel</button><button class="btn pri" id="xl-go">${I.x2||''}Authorize with X</button>`);
  $('#xl-h', scrim).focus();
  $('#xl-go', scrim).onclick = async () => {
    const h = $('#xl-h', scrim).value.trim().replace(/^@/,'');
    if(!/^[A-Za-z0-9_]{1,15}$/.test(h)){ $('#xl-e', scrim).textContent = 'Use letters, numbers and _ only, up to 15 characters.'; return; }
    if(s.kind==='wallet' && s.provider){ try{ const msg = `Opcode: link X account @${h} to wallet ${s.address}\nNonce: ${Math.random().toString(36).slice(2,10)}`; await s.provider.request({method:'personal_sign', params:[msg, s.address]}); }catch(e){ $('#xl-e', scrim).textContent = 'Signature declined. The link was not saved.'; return; } }
    S.pts.x = {handle:h, at:Date.now()}; closeModal(); toast(`Linked @${h}`); if(done) done(); else render();
  };
}
function submitPost(raw){
  const P = S.pts, url = String(raw||'').trim(), p = parsePost(url);
  if(!P.x) return 'Link your X account first.';
  if(!url) return 'Paste the link to your post.';
  if(!p) return 'That is not a post link. It should look like https://x.com/handle/status/123…';
  if(p.handle.toLowerCase() !== P.x.handle.toLowerCase()) return `This post is from @${p.handle}. Only posts from @${P.x.handle} count.`;
  if(P.subs.some(s=>s.id===p.id)) return 'You already submitted this post.';
  const at = postTime(p.id); if(!at || at > Date.now()+6e4) return 'That post ID is not valid.';
  if(Date.now()-at > PT_RULE.maxAgeDays*864e5) return `That post is ${ago(at)} old. Only posts from the last ${PT_RULE.maxAgeDays} days count.`;
  if(P.subs.filter(s=>Date.now()-s.t<864e5).length >= PT_RULE.perDay) return `Daily limit reached (${PT_RULE.perDay} posts). Try again tomorrow.`;
  P.subs.unshift({id:p.id, url, t:Date.now(), postedAt:at, status:'checking'});
  return true;
}
function submitPostModal(done){
  if(!S.session){ openConnect(); return; }
  if(!S.pts.x){ linkXModal(() => { render(); setTimeout(() => submitPostModal(done), 80); }); return; }
  const P = S.pts, today = P.subs.filter(s=>Date.now()-s.t<864e5).length;
  const scrim = openModal('Submit your post', `<form class="mb sp-f" id="sp-f" novalidate>
      <p class="mut" style="margin:0">Paste the link to a post about Opcode from <b style="color:var(--ink)">@${esc(P.x.handle)}</b>. We score it by engagement and add the points to your balance.</p>
      <div class="field"><label for="sp-url">X post link</label><input class="input" id="sp-url" type="url" inputmode="url" autocomplete="off" placeholder="https://x.com/${esc(P.x.handle)}/status/…"><span class="hint">Posts from the last ${PT_RULE.maxAgeDays} days · ${today}/${PT_RULE.perDay} submitted today</span></div>
      <div id="sp-e" class="dn" role="alert" style="font-size:13px;min-height:18px"></div>
      <button type="button" class="linkbtn" id="sp-s" style="font-size:12.5px">Use a sample link (preview)</button>
    </form>`, `<button class="btn" data-close>Cancel</button><button class="btn pri" id="sp-go" form="sp-f" type="submit">Submit post</button>`);
  const inp = $('#sp-url', scrim); setTimeout(() => inp.focus(), 30);
  $('#sp-s', scrim).onclick = () => { inp.value = samplePostUrl(); inp.focus(); };
  $('#sp-f', scrim).onsubmit = e => { e.preventDefault(); const r = submitPost(inp.value); if(r !== true){ $('#sp-e', scrim).textContent = r; inp.focus(); return; } closeModal(); toast('Post submitted. Points arrive in a few seconds.'); if(done) done(); };
  $('#sp-go', scrim).onclick = e => { e.preventDefault(); $('#sp-f', scrim).requestSubmit ? $('#sp-f', scrim).requestSubmit() : $('#sp-f', scrim).onsubmit(new Event('submit')); };
}
function pointsPanel(host){
  const P = S.pts;
  const step = !P.x ? 2 : P.subs.length ? 4 : 3;
  host.innerHTML = `<div class="pt">
    <div class="pt-flow">${[['Sign in with wallet','Done'],['Link X','Match posts to you'],['Post about Opcode','Tag @opcode or a $TICKER'],['Submit the link','Scored by engagement']].map((x,i)=>`<div class="${i+1<step?'ok':i+1===step?'on':''}"><b>0${i+1}</b><span>${x[0]}</span><em>${x[1]}</em></div>`).join('')}</div>
    <div class="pt-grid">
      <div class="pt-main">
        <div class="pt-bal"><div><span>Available</span><b class="mono">${f0(P.avail)}</b></div><div><span>Locked in presales</span><b class="mono">${f0(P.locked)}</b></div><div><span>Burned</span><b class="mono">${f0(P.burned)}</b></div><div><span>Earned all time</span><b class="mono">${f0(P.earned)}</b></div></div>
        ${P.x ? `<div class="pt-x"><div class="who">${av(P.x.handle,'#1A1A1E','sm round')}<div><div class="n">@${esc(P.x.handle)}</div><div class="s">Linked ${ago(P.x.at)} ago · ${short(S.session.address)}</div></div></div><button class="btn sm ghost" id="pt-unlink">Unlink</button></div>
        <form id="pt-form" class="pt-form" novalidate>
          <label for="pt-url" class="lbl">Submit a post</label>
          <div class="pt-in"><input class="input mono" id="pt-url" placeholder="https://x.com/${esc(P.x.handle)}/status/…" autocomplete="off"><button class="btn pri">Submit</button></div>
          <div class="pt-help"><span id="pt-msg" role="status"></span><button type="button" class="linkbtn" id="pt-sample">Use a sample link (preview)</button></div>
        </form>`
        : `<div class="pt-cta">${CAT('think',64)}<div><b>Link your X account to start earning</b><p class="mut">Points come from your posts about Opcode. We match each link you submit to the X account linked here.</p></div><button class="btn pri" id="pt-link">Link X</button></div>`}
        <div class="ph" style="padding:14px 0 8px;border:0"><h3>Your posts</h3><span class="mono dim" style="font-size:11px">${P.subs.filter(s=>Date.now()-s.t<864e5).length}/${PT_RULE.perDay} today</span></div>
        ${P.subs.length ? `<div class="scroll-x"><table class="tbl" style="min-width:640px"><thead><tr><th>Post</th><th class="r">Views</th><th class="r">Likes</th><th class="r">Reposts</th><th class="r">Replies</th><th class="r">Quotes</th><th class="r">×</th><th class="r">Points</th><th>Status</th></tr></thead><tbody>${P.subs.map(s=>`<tr><td class="mono"><a href="${esc(s.url)}" target="_blank" rel="noopener" style="color:var(--ink2)">…/${esc(s.id.slice(-6))}</a> <span class="dim">${ago(s.t)}</span></td>${s.m?['views','likes','reposts','replies','quotes'].map(k=>`<td class="r mono">${f0(s.m[k])}</td>`).join('')+`<td class="r mono dim">${s.q}</td><td class="r mono up">+${f0(s.pts)}</td>`:'<td colspan="7" class="r mono dim">reading engagement…</td>'}<td>${s.status==='checking'?'<span class="tag">Checking</span>':s.status==='tracking'?'<span class="tag acc">Tracking 72h</span>':'<span class="tag up">Final</span>'}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty" style="padding:24px"><b>No posts yet</b><span class="mut">Submitted posts and their points show up here.</span></div>`}
      </div>
      <aside class="pt-side">
        <div class="panel"><div class="ph"><h3>How points are scored</h3></div><div class="pb">
          <div class="pt-formula mono">( likes×1 + replies×2 + reposts×3<br>+ quotes×4 + views÷100 ) × quality</div>
          <ul class="pt-rules"><li>Quality 0.5–1.5: account history, relevance, bot filtering.</li><li>Up to ${f0(PT_RULE.perPostCap)} points per post, ${PT_RULE.perDay} posts a day.</li><li>Posts from the last ${PT_RULE.maxAgeDays} days only, from your linked account.</li><li>Points keep updating for ${PT_RULE.trackHours} hours as engagement grows.</li><li>Off-topic or botted posts score 0.</li><li>Use points to join presales. Locked points burn when the presale settles.</li></ul>
        </div></div>
        <div class="panel"><div class="ph"><h3>Leaderboard · Season 0</h3></div><div class="lb">${[...LEADERS, ...(P.x?[['@'+P.x.handle+' (you)', P.earned]]:[])].sort((a,b)=>b[1]-a[1]).slice(0,11).map((l,i)=>`<div class="${/\(you\)/.test(l[0])?'me':''}"><span class="mono dim">${String(i+1).padStart(2,'0')}</span><span>${esc(l[0])}</span><b class="mono">${f0(l[1])}</b></div>`).join('')}</div></div>
      </aside>
    </div></div>`;
  const lk = $('#pt-link', host); if(lk) lk.onclick = () => linkXModal(() => render());
  const ul = $('#pt-unlink', host); if(ul) ul.onclick = () => { if(P.subs.some(s=>s.status!=='final')){ toast('Wait until your tracked posts are final.'); return; } P.x = null; render(); };
  const fm = $('#pt-form', host); if(!fm) return;
  const msg = $('#pt-msg', host);
  $('#pt-sample', host).onclick = () => { $('#pt-url', host).value = samplePostUrl(); $('#pt-url', host).focus(); };
  fm.onsubmit = e => {
    e.preventDefault(); const r = submitPost($('#pt-url', host).value);
    if(r !== true){ msg.className = 'dn'; msg.textContent = r; return; }
    msg.className = 'up'; msg.textContent = 'Submitted. Reading engagement…'; $('#pt-url', host).value = '';
    setTimeout(() => { if(document.body.contains(host)) pointsPanel(host); }, 60);
  };
}

/* ================= PRESALES ================= */
// Allocation = min(cap, yourPoints / allPointsLocked × target). Accepted = min(deposit, allocation); the rest is refunded. Locked points burn at settlement.
const PRESALES = [];
function psPrice(ps){ return ps.target / (ps.alloc*1e9); }
function psState(ps){ const n = Date.now(); if(ps.kind==='standard') return ps.settled ? 'launched' : n < ps.start ? 'upcoming' : 'ending'; return ps.settled ? 'settled' : n < ps.start ? 'upcoming' : n < ps.end ? 'live' : 'ending'; }
function psTotalPts(ps){ return ps.ptsOthers + (ps.my ? ps.my.pts : 0); }
function psEst(ps, extraPts=0, extraUsd=0){
  const myPts = (ps.my?ps.my.pts:0) + extraPts, myUsd = (ps.my?ps.my.usdc:0) + extraUsd, tot = ps.ptsOthers + myPts;
  const share = tot ? myPts/tot : 0, ent = Math.min(ps.cap, share*ps.target), acc = Math.min(myUsd, ent);
  return {myPts, myUsd, share, ent, acc, refund: Math.max(0, myUsd-acc), tokens: acc/psPrice(ps), burn: myPts, capped: share*ps.target > ps.cap};
}
function left(ms){ ms = Math.max(0, ms); const d = Math.floor(ms/864e5), h = Math.floor(ms%864e5/36e5), m = Math.floor(ms%36e5/6e4), s = Math.floor(ms%6e4/1e3); return d ? `${d}d ${h}h ${m}m` : h ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`; }
function addPresale(o){
  let sym = o.sym; while(TK(sym) || PRESALES.some(p=>p.sym===sym)) sym = sym + 'X';
  const ps = {kind:'presale', cat:'Agents', alloc:0.2, minPts:100, people:0, ptsOthers:0, usdOthers:0, desc:'', tomics:null, ...o, sym, my:o.my||{pts:0, usdc:0}};
  if(!ps.cap) ps.cap = Math.round(ps.target*0.021);
  PRESALES.push(ps); return ps;
}
(function seedPresales(){
  const now = Date.now(), H = 36e5;
  addPresale({sym:'ATLX', name:'Atlas Research', cat:'Research', color:'#3A63C9', target:20000, cap:420, alloc:0.2, start:now-5*H, end:now+19*H, ptsOthers:118400, usdOthers:26100, people:214, desc:'Research agent that writes sourced market and company reports. Revenue from AXP jobs buys back $ATLX.'});
  addPresale({sym:'SRVO', name:'Servo Fleet', cat:'Robotics', color:'#2B6E4F', target:50000, cap:1050, alloc:0.25, start:now-20*H, end:now+28*H, ptsOthers:402000, usdOthers:61800, people:533, desc:'Dispatch agent for warehouse robots. Takes delivery jobs on AXP and pays chargers per kWh.'});
  addPresale({sym:'MUSA', name:'Muse Studio', cat:'Creative', color:'#C2413A', target:10000, cap:210, alloc:0.15, start:now-1*H, end:now+3*H, ptsOthers:31500, usdOthers:7400, people:96, desc:'Brand and motion design agent. Logos, decks and short videos as AXP offerings.'});
  addPresale({kind:'standard', sym:'NAVI', name:'Navi Maps', cat:'Robotics', color:'#0E9AA7', start:now+42*6e4, snipe:600, desc:'Route and dock planning agent for delivery robots. Sells routes per job on AXP.', tomics:{pct:{pre:0,pub:70,team:12,air:8,eco:6,tre:4}, team:{cliff:6,months:24}, eco:{cliff:0,months:36}, tre:{cliff:12,months:24}, air:{to:'points',tge:25,months:6}}});
  addPresale({kind:'standard', sym:'HELM', name:'Helm Ops', cat:'Infra', color:'#5B6B82', start:now+7*H+12*6e4, snipe:5880, desc:'On-call agent that watches other agents, restarts failed jobs and files incident notes.'});
  addPresale({kind:'standard', sym:'LYRA', name:'Lyra Live', cat:'Entertainment', color:'#C8448E', start:now+28*H, snipe:60, desc:'AI host that runs live shows and sells shout-outs as AXP offerings.', tomics:{pct:{pre:0,pub:65,team:15,air:12,eco:5,tre:3}, team:{cliff:9,months:24}, eco:{cliff:0,months:24}, tre:{cliff:12,months:24}, air:{to:'holders',tge:50,months:3}}});
  addPresale({sym:'KLLY', name:'Kelly Desk', cat:'DeFi', color:'#4E5A74', target:30000, cap:630, alloc:0.2, start:now+18*H, end:now+66*H, desc:'Position-sizing and risk agent for perps desks.'});
})();
function settlePresale(ps){
  if(ps.settled) return; const e = psEst(ps);
  const othersAcc = Math.min(ps.target - e.acc, ps.usdOthers*0.64), filled = Math.max(0, e.acc + othersAcc);
  ps.settled = Date.now(); ps.filled = filled; ps.result = e.myPts ? e : null;
  if(e.myPts){ S.pts.locked -= e.myPts; S.pts.burned += e.myPts; S.wallet += e.refund; if(e.tokens > 0){ S.hold[ps.sym] = (S.hold[ps.sym]||0) + e.tokens; S.cost[ps.sym] = (S.cost[ps.sym]||0) + e.acc; } }
  const raised = Math.min(GRAD-1, filled);
  const t = initToken({sym:ps.sym, name:ps.name, cat:ps.cat, agent:ps.agent||null, raised, holders:ps.people + (e.myPts?1:0), age:0, color:ps.color, desc:ps.desc, creator:ps.creator||rid(), created:Date.now(), forum:[], trades:[], vol:0, mods:{cf:true, radar:false, d60:false}, snipe:null, presale:{target:ps.target, filled, price:psPrice(ps)}, tomics:ps.tomics}, hash(ps.sym));
  t.hist = Array.from({length:8}, () => priceAt(raised)); t.open = priceAt(raised); t.trades = []; t.vol = 0;
  TOKENS.unshift(t);
  if(e.myPts) note('up','Presale', `$${ps.sym} settled: ${f(e.acc)} USDC filled, ${f(e.refund)} refunded, ${f0(e.myPts)} points burned.`);
  paintTop();
}
function launchStandard(ps){
  if(ps.settled) return; ps.settled = Date.now();
  const t = initToken({sym:ps.sym, name:ps.name, cat:ps.cat, agent:ps.agent||null, raised:0, holders:1, age:0, color:ps.color, desc:ps.desc, creator:ps.creator||rid(), created:Date.now(), forum:[], trades:[], vol:0, mods:{cf:true, radar:!!ps.radar, d60:!!ps.d60}, snipe:ps.snipe?{win:ps.snipe, side:ps.side||'buy', start:Date.now()}:null, tomics:ps.tomics}, hash(ps.sym));
  t.hist = Array.from({length:6},()=>priceAt(0)); t.open = priceAt(0); t.trades = []; t.vol = 0;
  TOKENS.unshift(t); if(ps.agent && AG(ps.agent)) AG(ps.agent).sym = ps.sym;
  if(ps.prebuy > 0){ const res = doTrade(t, 'buy', ps.prebuy*(1-FEE), 'You (pre-buy)'); S.hold[t.sym] = (S.hold[t.sym]||0)+res.amt; S.cost[t.sym] = ps.prebuy; }
  if(ps.remind || ps.creator==='You' || (S.session && ps.creator===S.session.address)) note('acc','Launch', `$${ps.sym} is live. Trading is open.`);
}
function tickPresales(){
  PRESALES.forEach(ps => { const st = psState(ps); if(ps.kind==='standard'){ if(st==='ending') launchStandard(ps); return; } if(st==='live'){ const r = Math.random; if(r()<.7){ ps.ptsOthers += Math.round(r()*900); ps.usdOthers += Math.round(r()*ps.cap*0.6); if(r()<.5) ps.people++; } } else if(st==='ending') settlePresale(ps); });
}
function psCard(ps){
  const st = psState(ps);
  if(ps.kind==='standard'){ const T = ps.tomics || defaultTomics(0);
    return `<a class="ps-card std ${st}" href="#launch/${ps.sym}">
    <div class="ps-top"><div class="who">${av(ps.sym,ps.color)}<div><div class="n">${esc(ps.name)}</div><div class="s">$${ps.sym} · ${ps.cat}</div></div></div><span class="tag ${st==='launched'?'up':'info'}">${st==='launched'?'Trading':'Standard'}</span></div>
    <div class="ps-cd"><span>${st==='launched'?'Launched':'Launches in'}</span><b class="mono" data-cd="${ps.sym}">${st==='launched'?ago(ps.settled)+' ago':left(ps.start-Date.now())}</b></div>
    <div class="tom-bar sm">${TOM_ROWS.filter(r=>T.pct[r[0]]>0).map(r=>`<i style="width:${T.pct[r[0]]}%;background:${TOM_COL[r[0]]}"></i>`).join('')}</div>
    <div class="ps-kv"><div><span>Starting FDV</span><b class="mono">${usd(priceAt(0)*1e9)}</b></div><div><span>On the curve</span><b class="mono">${T.pct.pub}%</b></div><div><span>Anti-sniper</span><b class="mono">${ps.snipe?SNIPE[ps.snipe]:'Off'}</b></div><div><span>Team</span><b class="mono">${T.pct.team}% · ${T.team.cliff}m cliff</b></div></div>
  </a>`; }
  const com = ps.usdOthers + ps.my.usdc, ov = com/ps.target;
  return `<a class="ps-card ${st}" href="#launch/${ps.sym}">
    <div class="ps-top"><div class="who">${av(ps.sym,ps.color)}<div><div class="n">${esc(ps.name)}</div><div class="s">$${ps.sym} · ${ps.cat}</div></div></div><span class="tag ${st==='live'?'acc':st==='settled'?'up':''}">${st==='live'?'Presale live':st==='upcoming'?'Presale':st==='settled'?'Trading':'Settling'}</span></div>
    <div class="ps-cd"><span>${st==='upcoming'?'Presale opens in':st==='live'?'Presale ends in':'Launched'}</span><b class="mono" data-cd="${ps.sym}">${st==='upcoming'?left(ps.start-Date.now()):st==='live'?left(ps.end-Date.now()):ago(ps.settled||ps.end)+' ago'}</b></div>
    <div class="ps-bar"><i style="width:${Math.min(100,ov*100).toFixed(1)}%"></i>${ov>1?`<em style="width:${Math.min(100,(1-1/ov)*100).toFixed(1)}%"></em>`:''}</div>
    <div class="ps-kv"><div><span>Raise</span><b class="mono">${usd(ps.target)}</b></div><div><span>Committed</span><b class="mono ${ov>1?'acc':''}">${usd(com)}${ov>1?` · ${f(ov,1)}×`:''}</b></div><div><span>Points locked</span><b class="mono">${cmp(psTotalPts(ps))}</b></div><div><span>Max / wallet</span><b class="mono">${usd(ps.cap)}</b></div></div>
  </a>`;
}
let ulFilter = 'all';
function nextAt(ps){ const st = psState(ps); return st==='live' ? ps.end : ps.start; }
function presalesStrip(host){
  const fresh = PRESALES.filter(p => !p.settled || Date.now()-p.settled < 36e5);
  const list = fresh.filter(p => ulFilter==='all' || p.kind===ulFilter).sort((a,b)=>(!!a.settled - !!b.settled) || nextAt(a)-nextAt(b)).slice(0,8);
  const n = k => fresh.filter(p=>k==='all'||p.kind===k).length;
  host.innerHTML = `<div class="ps-strip"><div class="ps-h"><div><h2>Upcoming launches</h2><p class="mut">Standard launches open trading at their start time. Presale launches raise from point holders first.</p></div>
    <div class="ps-tools"><div class="seg" role="group" aria-label="Launch type">${[['all','All'],['standard','Standard'],['presale','Presale']].map(([k,l])=>`<button data-ul="${k}" aria-pressed="${ulFilter===k}">${l} <span class="dim">${n(k)}</span></button>`).join('')}</div><a class="btn sm pri" href="#create">${I.rocket}Launch your agent token</a></div></div>
    ${list.length ? `<div class="ps-grid">${list.map(psCard).join('')}</div>` : `<div class="panel empty"><b>Nothing scheduled</b><span>New launches show up here with a countdown.</span></div>`}</div>`;
  $$('[data-ul]', host).forEach(b => b.onclick = e => { e.preventDefault(); ulFilter = b.dataset.ul; presalesStrip(host); });
}
function launchView(v){
  const sym = (route.arg||'').toUpperCase(), ps = PRESALES.find(p=>p.sym===sym);
  if(!ps){ const t = TK(sym); if(t){ location.hash = 'token/'+t.sym; return; } v.innerHTML = `<div class="empty panel"><b>Launch not found</b><a class="btn" href="#tokens">Back to tokens</a></div>`; return; }
  if(ps.kind==='presale') return presaleView(v);
  if(ps.settled){ location.hash = 'token/'+ps.sym; return; }
  const T = ps.tomics || defaultTomics(0);
  v.innerHTML = `<div class="crumb"><a href="#tokens">Tokens</a> / Upcoming / ${esc(ps.sym)}</div>
  <div class="tk-h"><div class="who">${av(ps.sym,ps.color,'lg')}<div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="font-size:26px;font-weight:650;letter-spacing:-.03em">${esc(ps.name)}</span><span class="mut">$${ps.sym}</span><span class="tag">${ps.cat}</span><span class="tag info">Standard launch</span></div><div class="s">Trading opens on the bonding curve at ${new Date(ps.start).toLocaleString(L,{weekday:'short',hour:'2-digit',minute:'2-digit'})}</div></div></div>
    <div class="ps-clock"><span>Launches in</span><b id="ul-cd">${left(ps.start-Date.now())}</b></div></div>
  <div class="tk"><div style="display:flex;flex-direction:column;gap:16px;min-width:0">
    <div class="panel"><div class="mov"><div><span>Starting price</span><b>$${px(priceAt(0))}</b></div><div><span>Starting FDV</span><b>${usd(priceAt(0)*1e9)}</b></div><div><span>Graduates at</span><b>${f0(GRAD)} USDC</b></div><div><span>Anti-sniper</span><b>${ps.snipe?SNIPE[ps.snipe]+' · '+(ps.side||'buy'):'Off'}</b></div><div><span>Trading fee</span><b>1% · 70/30</b></div><div><span>LP lock</span><b>10 years</b></div></div></div>
    <div class="panel"><div class="ph"><h3>Tokenomics</h3></div><div class="pb">${tomicsHTML(T)}</div></div>
    <div class="panel"><div class="ph"><h3>About</h3></div><div class="pb"><p style="margin:0" class="ink2">${esc(ps.desc)}</p></div></div>
  </div>
  <div class="sticky"><div class="panel" style="padding:16px;display:flex;flex-direction:column;gap:12px" id="ul-side"></div></div></div>`;
  const side = () => { $('#ul-side').innerHTML = `<h3 class="side-h">Be there at the start</h3><p class="mut" style="margin:0;font-size:13.5px">No presale for this token. Anyone can buy on the curve once it opens${ps.snipe?'; early buys pay a falling anti-sniper tax for the first '+SNIPE[ps.snipe]:''}.</p>
    <button class="btn ${ps.remind?'':'pri'} block" id="ul-r">${ps.remind?I.check+' You will be notified':I.bell+' Notify me at launch'}</button>
    <button class="linkbtn" id="ul-now">Launch now (preview)</button>`;
    $('#ul-r').onclick = () => { if(!S.session){ openConnect(); return; } ps.remind = !ps.remind; side(); toast(ps.remind?`We'll notify you when $${ps.sym} launches`:'Reminder removed'); };
    $('#ul-now').onclick = () => { launchStandard(ps); location.hash = 'token/'+ps.sym; }; };
  side();
  live = () => { const c = $('#ul-cd'); if(c) c.textContent = left(ps.start-Date.now()); if(ps.settled) location.hash = 'token/'+ps.sym; };
}
function presaleView(v){
  const ps = PRESALES.find(p=>p.sym===(route.arg||'').toUpperCase());
  if(!ps){ const t = TK((route.arg||'').toUpperCase()); if(t){ location.hash = 'token/'+t.sym; return; } v.innerHTML = `<div class="empty panel"><b>Presale not found</b><a class="btn" href="#tokens">Back to tokens</a></div>`; return; }
  let addPts = 0, addUsd = 0;
  v.innerHTML = `<div class="crumb"><a href="#tokens">Tokens</a> / Upcoming / ${esc(ps.sym)}</div>
  <div class="tk-h"><div class="who">${av(ps.sym,ps.color,'lg')}<div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="font-family:var(--cond);font-size:24px;font-weight:700;">${esc(ps.name)}</span><span class="mono mut">$${ps.sym}</span><span class="tag">${ps.cat}</span><span id="ps-st"></span></div><div class="s">Points-gated presale · ${f(ps.alloc*100,0)}% of supply · max ${usd(ps.cap)} per wallet</div></div></div>
    <div class="ps-clock"><span id="ps-cl"></span><b class="mono" id="ps-cd"></b></div></div>
  <div class="tk"><div style="display:flex;flex-direction:column;gap:16px;min-width:0">
    <div class="panel"><div class="mov" id="ps-stats"></div><div class="pb"><div class="ps-bar lg" id="ps-bar"></div><div class="mono dim" style="font-size:11px;display:flex;justify-content:space-between;margin-top:6px"><span>0</span><span>Target ${usd(ps.target)}</span></div></div></div>
    <div class="panel"><div class="ph"><h3>How your allocation is set</h3></div><div class="pb ps-how" id="ps-how"></div></div>
    <div class="panel"><div class="ph"><h3>About</h3></div><div class="pb"><p style="margin:0 0 12px" class="ink2">${esc(ps.desc)}</p>${tomicsHTML(ps.tomics || defaultTomics(ps.alloc))}</div></div>
  </div>
  <div class="sticky"><div class="panel" style="padding:14px;display:flex;flex-direction:column;gap:12px" id="ps-side"></div></div></div>`;
  const stats = () => { const com = ps.usdOthers + ps.my.usdc, ov = com/ps.target, st = psState(ps);
    $('#ps-st').innerHTML = `<span class="tag ${st==='live'?'acc':st==='settled'?'up':''}">${{live:'Live',upcoming:'Upcoming',ending:'Settling',settled:'Settled'}[st]}</span>`;
    $('#ps-cl').textContent = st==='upcoming'?'Opens in':st==='live'?'Ends in':'Ended'; $('#ps-cd').textContent = st==='upcoming'?left(ps.start-Date.now()):st==='live'?left(ps.end-Date.now()):ago(ps.settled||ps.end)+' ago';
    $('#ps-stats').innerHTML = `<div><span>Raise</span><b>${usd(ps.target)}</b></div><div><span>Committed</span><b class="${ov>1?'acc':''}">${usd(st==='settled'?ps.filled:com)}${ov>1&&st!=='settled'?` · ${f(ov,2)}×`:''}</b></div><div><span>Points locked</span><b>${f0(psTotalPts(ps))}</b></div><div><span>Participants</span><b>${f0(ps.people + (ps.my.pts?1:0))}</b></div><div><span>Presale price</span><b>$${px(psPrice(ps))}</b></div><div><span>FDV at presale</span><b>${usd(psPrice(ps)*1e9)}</b></div>`;
    $('#ps-bar').innerHTML = `<i style="width:${Math.min(100,ov*100).toFixed(1)}%"></i>${ov>1?`<em style="width:${Math.min(100,(1-1/ov)*100).toFixed(1)}%"></em>`:''}`;
  };
  const how = () => { const e = psEst(ps, addPts, addUsd), tot = ps.ptsOthers + e.myPts, ex = Math.max(e.myPts, 1000), exEnt = Math.min(ps.cap, ex/(ps.ptsOthers+ex)*ps.target);
    $('#ps-how').innerHTML = `<ol class="ps-steps">
      <li><b>Lock points and deposit USDC.</b> Deposit up to ${usd(ps.cap)} per wallet.</li>
      <li><b>Your share = your points ÷ all points locked.</b> Allocation = share × ${usd(ps.target)}, capped at ${usd(ps.cap)}.</li>
      <li><b>At settlement</b> the protocol takes the smaller of your deposit and your allocation and refunds the rest. All locked points burn.</li></ol>
      <div class="ps-ex mono"><div><span>Example</span>${f0(ex)} pts ÷ ${f0(ps.ptsOthers+ex)} pts</div><div><span>Share</span>${f(ex/(ps.ptsOthers+ex)*100,3)}%</div><div><span>Allocation</span>${f(exEnt)} USDC${ex/(ps.ptsOthers+ex)*ps.target>ps.cap?' (cap)':''}</div><div><span>Deposit ${usd(ps.cap)}</span>pays ${f(Math.min(ps.cap,exEnt))} · refund ${f(Math.max(0,ps.cap-exEnt))}</div><div><span>Deposit ${usd(Math.round(exEnt*0.6))}</span>pays all ${f(Math.round(exEnt*0.6))} · refund 0</div></div>
      <p class="dim" style="margin:0;font-size:12px">Unfilled allocation goes to the bonding curve as liquidity. Allocation changes until the presale ends because other wallets keep locking points.</p>`; };
  const side = () => {
    const box = $('#ps-side'), st = psState(ps), sess = S.session, P = S.pts, my = ps.my;
    if(st==='settled'){ const r = ps.result; box.innerHTML = `<div class="ph" style="padding:0;border:0"><h3>Settled</h3><span class="tag up">Trading</span></div>${r ? `<dl class="kv"><dt>Points burned</dt><dd>${f0(r.burn)}</dd><dt>Your share</dt><dd>${f(r.share*100,3)}%</dd><dt>Allocation</dt><dd>${f(r.ent)} USDC${r.capped?' (cap)':''}</dd><dt>Filled</dt><dd class="up">${f(r.acc)} USDC</dd><dt>Refunded</dt><dd>${f(r.refund)} USDC</dd><dt>Received</dt><dd>${cmp(r.tokens)} ${ps.sym}</dd></dl>` : '<p class="mut" style="margin:0">You did not join this presale.</p>'}<a class="btn pri block" href="#token/${ps.sym}">Trade $${ps.sym}</a>`; return; }
    if(!sess){ box.innerHTML = `<h3 class="side-h">Join the presale</h3><p class="mut" style="margin:0">Sign in with your wallet, link X and earn points to take part.</p><button class="btn pri block" id="ps-c">Connect wallet</button>`; $('#ps-c').onclick = openConnect; return; }
    if(!P.x){ box.innerHTML = `<h3 class="side-h">Join the presale</h3><p class="mut" style="margin:0">Presales use points. Link your X account and submit posts to earn them.</p><button class="btn pri block" id="ps-x">Link X</button><a class="btn block" href="#points">How points work</a>`; $('#ps-x').onclick = () => linkXModal(() => side()); return; }
    const e = psEst(ps, addPts, addUsd), roomUsd = Math.max(0, ps.cap - my.usdc), canPts = P.avail;
    box.innerHTML = `<h3 class="side-h">${my.pts?'Your commitment':'Join the presale'}</h3>
      ${my.pts ? `<dl class="kv"><dt>Points locked</dt><dd>${f0(my.pts)}</dd><dt>USDC deposited</dt><dd>${f(my.usdc)}</dd></dl>`:''}
      ${st==='upcoming' ? `<p class="mut" style="margin:0">Opens in ${left(ps.start-Date.now())}. Earn points before it opens.</p><a class="btn block" href="#points">Earn points</a>` : `
      <div class="amt"><div class="t"><span>Lock points</span><span>Available ${f0(canPts)}</span></div><input id="ps-p" type="number" min="0" step="1" value="${addPts||''}" placeholder="0" aria-label="Points to lock"><span class="u">PTS</span></div>
      <div class="pcts" id="ps-pp">${['25','50','Max'].map(x=>`<button type="button" data-p="${x}">${x==='Max'?'Max':x+'%'}</button>`).join('')}</div>
      <div class="amt"><div class="t"><span>Deposit</span><span>Room ${f(roomUsd)} · Wallet ${f(S.wallet)}</span></div><input id="ps-u" type="number" min="0" step="any" value="${addUsd||''}" placeholder="0" aria-label="USDC to deposit"><span class="u">USDC</span></div>
      <div class="pcts" id="ps-up"><button type="button" data-u="alloc">Match allocation</button><button type="button" data-u="max">Max ${usd(roomUsd)}</button></div>
      <dl class="kv" id="ps-kv"></dl>
      <button class="btn pri lg block" id="ps-go">${my.pts?'Add to commitment':'Lock points & commit'}</button>
      ${P.avail < ps.minPts && !my.pts ? `<p class="dn" style="margin:0;font-size:12.5px">You need at least ${f0(ps.minPts)} points. <a href="#points" style="color:var(--acc2)">Earn points</a></p>`:''}
      <button class="linkbtn" id="ps-end">End presale now (preview)</button>`}`;
    const kv = () => { const k = psEst(ps, addPts, addUsd), el = $('#ps-kv'); if(!el) return; el.innerHTML = `<dt>Your share</dt><dd>${f(k.share*100,3)}%</dd><dt>Allocation</dt><dd>${f(k.ent)} USDC${k.capped?' <span class="tag acc">cap</span>':''}</dd><dt>You pay</dt><dd>${f(k.acc)} USDC</dd><dt>Refund</dt><dd>${f(k.refund)} USDC</dd><dt>You get</dt><dd>${cmp(k.tokens)} ${ps.sym}</dd><dt>Points burned</dt><dd class="dn">${f0(k.burn)}</dd>`; };
    kv(); if(st!=='live') return;
    $('#ps-p').oninput = ev => { addPts = Math.max(0, Math.floor(+ev.target.value||0)); kv(); how(); };
    $('#ps-u').oninput = ev => { addUsd = Math.max(0, +ev.target.value||0); kv(); };
    $('#ps-pp').onclick = ev => { const b = ev.target.closest('[data-p]'); if(!b) return; addPts = b.dataset.p==='Max' ? canPts : Math.floor(canPts*(+b.dataset.p)/100); $('#ps-p').value = addPts; kv(); how(); };
    $('#ps-up').onclick = ev => { const b = ev.target.closest('[data-u]'); if(!b) return; const k = psEst(ps, addPts, 0); addUsd = b.dataset.u==='max' ? roomUsd : Math.max(0, Math.min(roomUsd, Math.ceil((k.ent - my.usdc)*100)/100)); $('#ps-u').value = addUsd; kv(); };
    $('#ps-end').onclick = () => { settlePresale(ps); stats(); side(); toast(`$${ps.sym} presale settled`); };
    $('#ps-go').onclick = () => {
      if(addPts > P.avail) return toast('More points than you have available.');
      if(!my.pts && addPts < ps.minPts) return toast(`Lock at least ${f0(ps.minPts)} points to join.`);
      if(addUsd > roomUsd + 1e-9) return toast(`Max ${f(ps.cap)} USDC per wallet. You can add ${f(roomUsd)} more.`);
      if(addUsd > S.wallet) return toast('Not enough USDC in your wallet.');
      if(!addPts && !addUsd) return toast('Enter points or USDC to add.');
      if(!my.pts && !addUsd) return toast('Add a USDC deposit too.');
      P.avail -= addPts; P.locked += addPts; my.pts += addPts; my.usdc += addUsd; S.wallet -= addUsd; addPts = 0; addUsd = 0;
      paintTop(); toast('Committed. Points locked until settlement.'); stats(); how(); side();
    };
  };
  stats(); how(); side();
  live = () => { stats(); const box = $('#ps-side'); if(!box || box.contains(document.activeElement)) return; side(); how(); };
}

/* ================= TOKENOMICS ================= */
const TOM_ROWS = [['pre','Presale',null],['pub','Bonding curve',null],['team','Team','vest'],['air','Airdrop','air'],['eco','Ecosystem & rewards','vest'],['tre','Treasury','vest']];
const TOM_COL = {pre:'#FF8A5C', pub:'#FF5B1F', team:'#9AB4FF', air:'#2BD488', eco:'#C3A6FF', tre:'#8B887F'};
function defaultTomics(presaleAlloc){ const pre = presaleAlloc ? Math.round(presaleAlloc*100) : 0; return {pct:{pre, pub:60-pre, team:15, air:10, eco:10, tre:5}, team:{cliff:6, months:24}, eco:{cliff:0, months:36}, tre:{cliff:12, months:24}, air:{to:'points', tge:25, months:6}}; }
const AIR_TO = {points:'Opcode points holders', holders:'Holders of a token (snapshot)', list:'Custom list (CSV)'};
function tomicsHTML(T){
  const rows = TOM_ROWS.filter(r=>T.pct[r[0]]>0);
  return `<div class="tom-bar">${rows.map(r=>`<i style="width:${T.pct[r[0]]}%;background:${TOM_COL[r[0]]}" title="${r[1]} ${T.pct[r[0]]}%"></i>`).join('')}</div>
  <table class="tbl tom-t"><tbody>${rows.map(r=>`<tr><td><span class="sw" style="background:${TOM_COL[r[0]]}"></span>${r[1]}</td><td class="r mono">${T.pct[r[0]]}%</td><td class="r mono dim">${cmp(T.pct[r[0]]*1e7)}</td><td class="mut" style="font-size:12.5px">${r[2]==='vest'?`${T[r[0]].cliff}m cliff · ${T[r[0]].months}m linear`:r[2]==='air'?`${AIR_TO[T.air.to]} · ${T.air.tge}% at launch, rest over ${T.air.months}m`:r[0]==='pre'?'Unlocked at settlement':'Sold on the curve'}</td></tr>`).join('')}</tbody></table>`;
}

/* ================= LAUNCH WIZARD ================= */
function createView(v){
  const mine = myAgents(), a0 = mine[0];
  const d = {type:null, step:0, agent: a0 ? a0.id : '', name: a0 ? a0.name : '', sym: a0 ? a0.name.replace(/[^a-z]/gi,'').toUpperCase().slice(0,5) : '', desc: a0 ? a0.desc : '', x:'', site:'',
    cf:true, radar:false, snipe:600, side:'buy', d60:false, prebuy:0,
    ps:{target:20000, cap:420, alloc:20, dur:48, minPts:100}, T: defaultTomics(0), when:0};
  if(S.launchDraft){ const L0 = S.launchDraft; S.launchDraft = null; Object.assign(d, {type:L0.type||null, step:L0.type?1:0, agent:L0.agent||'', name:L0.name||d.name, sym:L0.sym||d.sym, desc:L0.desc||d.desc, snipe:L0.snipe!=null?L0.snipe:d.snipe, when:L0.when||0, prebuy:L0.prebuy||0}); if(L0.type==='presale') Object.assign(d.ps, {target:L0.raise||20000, cap:L0.cap||Math.round((L0.raise||20000)*0.021), alloc:L0.share||20, dur:L0.dur||48}); if(L0.tom) d.T = specTomics(L0); }
  const STEPS = () => d.type==='presale' ? ['Type','Token','Presale','Tokenomics','Review'] : ['Type','Token','Tokenomics','Modules','Pre-buy','Review'];
  const cost = () => d.type==='presale' ? 0 : (d.cf?10:0) + (d.radar?100:0) + (+d.prebuy||0);
  const syncPre = () => { if(d.type==='presale'){ const old = d.T.pct.pre||0; d.T.pct.pre = d.ps.alloc; d.T.pct.pub = Math.max(0, d.T.pct.pub + old - d.ps.alloc); } else { d.T.pct.pub += d.T.pct.pre||0; d.T.pct.pre = 0; } };
  const sum = () => Object.values(d.T.pct).reduce((a,b)=>a+(+b||0),0);
  const paint = () => {
    const steps = STEPS(), name = steps[d.step];
    v.innerHTML = `<div class="crumb"><a href="#tokens">Tokens</a> / Launch</div>
    <div class="pagehead"><div><h1>Launch your agent token</h1><p>${d.type==='presale'?'Presale launch: raise USDC from point holders first, then trading opens on the curve.':d.type==='standard'?'Standard launch: full tokenomics with vesting. Trading opens on a USDC bonding curve as soon as you publish.':'Pick how your token goes live. Both run on Arc with a 1% trading fee (70% to you, 30% treasury).'}</p></div></div>
    <div class="wiz"><div class="wiz-nav">${steps.map((s,i)=>`<div class="${i===d.step?'on':i<d.step?'ok':''}"><b>0${i+1}</b>${s}</div>`).join('')}</div>
    <div class="panel"><div class="pb" id="cw-b" style="display:flex;flex-direction:column;gap:16px"></div><div class="mf" id="cw-f"></div></div></div>`;
    const b = $('#cw-b'), ft = $('#cw-f');
    if(name==='Type'){
      b.innerHTML = `<div class="lt-types">
        <button type="button" class="lt-type" data-t="standard" aria-pressed="${d.type==='standard'}"><span class="mono dim">TYPE 01</span><b>Standard launch</b><p>Detailed tokenomics: team, airdrop, ecosystem and treasury, each with its own cliff and vesting. Trading opens on a USDC bonding curve the moment you publish.</p><ul><li>Team, airdrop, ecosystem, treasury allocations</li><li>Cliff + linear vesting per bucket</li><li>Anti-sniper, Launch Radar, 60 Days, pre-buy</li></ul></button>
        <button type="button" class="lt-type" data-t="presale" aria-pressed="${d.type==='presale'}"><span class="mono dim">TYPE 02</span><b>Presale launch</b><p>Raise USDC before trading. People lock Opcode points to join; their points ÷ all points locked sets their allocation, capped per wallet. Points burn, extra USDC is refunded.</p><ul><li>Raise target and max per wallet</li><li>Allocation by points share</li><li>Settles into the bonding curve</li></ul></button>
      </div>`;
      b.onclick = e => { const t = e.target.closest('[data-t]'); if(t){ d.type = t.dataset.t; syncPre(); paint(); } };
    } else if(name==='Token'){
      b.innerHTML = `<div class="field"><label for="c-ag">Agent</label><select class="select" id="c-ag"><option value="">No agent (token only)</option>${mine.map(a=>`<option value="${a.id}" ${a.id===d.agent?'selected':''}>${esc(a.name)} · ${a.offerings.length} offerings</option>`).join('')}</select><span class="hint">Tokens tied to an AXP agent show its jobs and revenue on the token page. <a href="#newagent" style="color:var(--acc2)">Build one with PAX</a> or <a href="#join" style="color:var(--acc2)">connect an existing agent</a></span></div>
        <div style="display:grid;grid-template-columns:auto 1fr 160px;gap:12px;align-items:end"><span id="c-sig">${av(d.sym||'NEW', colorFor(d.sym||'NEW'),'lg')}</span><div class="field"><label for="c-n">Name</label><input class="input" id="c-n" value="${esc(d.name)}" maxlength="32"></div><div class="field"><label for="c-s">Ticker</label><input class="input mono" id="c-s" value="${esc(d.sym)}" maxlength="8"></div></div>
        <div class="field"><label for="c-d">Description</label><textarea class="textarea" id="c-d" maxlength="400">${esc(d.desc)}</textarea></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div class="field"><label for="c-x">X / Twitter</label><input class="input" id="c-x" value="${esc(d.x)}" placeholder="@handle"></div><div class="field"><label for="c-w">Website</label><input class="input" id="c-w" value="${esc(d.site)}" placeholder="https://"></div></div>`;
      $('#c-ag').onchange = e => { d.agent = e.target.value; const a = AG(d.agent); if(a){ d.name = a.name; d.desc = a.desc; d.sym = a.name.replace(/[^a-z]/gi,'').toUpperCase().slice(0,5); } paint(); };
      [['#c-n','name'],['#c-d','desc'],['#c-x','x'],['#c-w','site']].forEach(([s,k]) => $(s).oninput = e => d[k] = e.target.value);
      $('#c-s').oninput = e => { d.sym = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''); e.target.value = d.sym; $('#c-sig').innerHTML = av(d.sym||'NEW', colorFor(d.sym||'NEW'),'lg'); };
    } else if(name==='Presale'){
      const P = d.ps;
      b.innerHTML = `<div class="g2"><div class="field"><label for="p-t">Raise target</label><div class="amt"><input id="p-t" type="number" min="1000" step="500" value="${P.target}"><span class="u">USDC</span></div></div>
        <div class="field"><label for="p-c">Max per wallet</label><div class="amt"><input id="p-c" type="number" min="10" step="10" value="${P.cap}"><span class="u">USDC</span></div><span class="hint" id="p-ch"></span></div></div>
        <div class="field"><span class="lbl">Presale share of supply</span><div class="chips" id="p-a">${[10,15,20,25,30].map(x=>`<button type="button" class="chip" data-a="${x}" aria-pressed="${x===P.alloc}">${x}%</button>`).join('')}</div></div>
        <div class="g2"><div class="field"><span class="lbl">Duration</span><div class="chips" id="p-d">${[24,48,72].map(x=>`<button type="button" class="chip" data-d="${x}" aria-pressed="${x===P.dur}">${x}h</button>`).join('')}</div></div>
        <div class="field"><label for="p-m">Min points to join</label><div class="amt"><input id="p-m" type="number" min="0" step="50" value="${P.minPts}"><span class="u">PTS</span></div></div></div>
        <dl class="kv" id="p-kv"></dl>
        <div class="ps-ex mono" style="margin:0"><div><span>Rule</span>allocation = min(max per wallet, your points ÷ all points × target)</div><div><span>Settlement</span>pays min(deposit, allocation), refunds the rest, burns locked points</div></div>`;
      const up = () => { P.target = Math.max(1000, +$('#p-t').value||0); P.cap = Math.max(10, +$('#p-c').value||0); P.minPts = Math.max(0, +$('#p-m').value||0); const pr = P.target/(P.alloc/100*1e9);
        $('#p-ch').textContent = `${f(P.cap/P.target*100,2)}% of the raise · at least ${f0(Math.ceil(P.target/P.cap))} wallets to fill`;
        $('#p-kv').innerHTML = `<dt>Presale price</dt><dd>$${px(pr)}</dd><dt>FDV at presale</dt><dd>${usd(pr*1e9)}</dd><dt>Tokens sold</dt><dd>${cmp(P.alloc/100*1e9)} ${d.sym||''}</dd><dt>Curve after settle</dt><dd>starts at the raised USDC · graduates at ${f0(GRAD)}</dd>`; };
      ['#p-t','#p-c','#p-m'].forEach(s => $(s).oninput = up);
      $('#p-t').onchange = () => { P.cap = Math.round(P.target*0.021); $('#p-c').value = P.cap; up(); };
      b.onclick = e => { const a = e.target.closest('[data-a]'); if(a){ P.alloc = +a.dataset.a; syncPre(); paint(); return; } const du = e.target.closest('[data-d]'); if(du){ P.dur = +du.dataset.d; paint(); } };
      up();
    } else if(name==='Tokenomics'){
      const T = d.T;
      const row = ([k,l,kind]) => (k==='pre' && d.type!=='presale') ? '' : `<div class="tom-r"><div class="tom-l"><span class="sw" style="background:${TOM_COL[k]}"></span><b>${l}</b></div>
        <div class="amt sm"><input type="number" min="0" max="100" step="1" data-k="${k}" value="${T.pct[k]}" ${k==='pre'?'disabled':''} aria-label="${l} percent"><span class="u">%</span></div>
        <div class="tom-v">${kind==='vest'?`<label>Cliff <input type="number" min="0" max="48" data-v="${k}.cliff" value="${T[k].cliff}"> m</label><label>Vest <input type="number" min="0" max="72" data-v="${k}.months" value="${T[k].months}"> m</label>`
          : kind==='air'?`<select class="select sm" data-v="air.to">${Object.entries(AIR_TO).map(([v2,l2])=>`<option value="${v2}" ${T.air.to===v2?'selected':''}>${l2}</option>`).join('')}</select><label>At launch <input type="number" min="0" max="100" data-v="air.tge" value="${T.air.tge}"> %</label><label>Rest over <input type="number" min="0" max="24" data-v="air.months" value="${T.air.months}"> m</label>`
          : k==='pre'?'<span class="mut">Set on the Presale step · unlocked at settlement</span>':'<span class="mut">Sold on the curve · no lock</span>'}</div></div>`;
      b.innerHTML = `<div id="tm-prev"></div><div class="tom-rows">${TOM_ROWS.map(row).join('')}</div><div id="tm-sum" class="mono" style="font-size:13px"></div><p class="dim" style="margin:0;font-size:12px">Supply is fixed at 1,000,000,000. Non-curve buckets are minted to vesting contracts at launch and show on the token page.</p>`;
      const up = () => { const s = sum(), ok = s===100; $('#tm-prev').innerHTML = tomicsHTML(T); $('#tm-sum').innerHTML = `<span class="${ok?'up':'dn'}">Total ${s}%</span>${ok?'':' · must equal 100%'}${T.pct.pub < 20 ? ' · <span class="dn">curve needs at least 20%</span>':''}${T.pct.team > 25 ? ' · <span class="dn">team max 25%</span>':''}`; };
      b.oninput = e => { const k = e.target.dataset.k, vv = e.target.dataset.v; if(k){ T.pct[k] = Math.max(0, Math.min(100, Math.round(+e.target.value||0))); up(); } else if(vv){ const [a,c] = vv.split('.'); T[a][c] = e.target.tagName==='SELECT' ? e.target.value : Math.max(0, +e.target.value||0); up(); } };
      b.onchange = b.oninput; up();
    } else if(name==='Modules'){
      b.innerHTML = `<div class="mods">
        <button type="button" class="mod" data-m="cf" aria-pressed="${d.cf}"><div class="row"><b>Capital Formation</b><span class="tag">10 USDC</span></div><p>Bonding curve fills with USDC; graduates at ${f0(GRAD)} USDC into a pool with LP locked 10 years.</p></button>
        <button type="button" class="mod" data-m="radar" aria-pressed="${d.radar}"><div class="row"><b>Launch Radar</b><span class="tag">100 USDC</span></div><p>Featured in the launch feed and in PAX's suggestions for 24 hours.</p></button>
        <button type="button" class="mod" data-m="d60" aria-pressed="${d.d60}"><div class="row"><b>60 Days</b><span class="tag">Free</span></div><p>Public 60-day trial. Your 70% fee share is locked until you commit; if you don't, holders are refunded from the pool.</p></button>
        <div class="mod" style="cursor:default"><div class="row"><b>Anti-sniper</b><span class="tag">Free</span></div><p>Buy tax starts at 99% and falls to 1% over the window. Taxes buy back tokens to the team wallet (3-month cliff, 9-month vest).</p><div class="chips" id="c-sn">${Object.entries(SNIPE).map(([k,l])=>`<button type="button" class="chip" data-w="${k}" aria-pressed="${+k===d.snipe}">${l}</button>`).join('')}</div><div class="chips" id="c-side">${['buy','sell','both'].map(s=>`<button type="button" class="chip" data-s="${s}" aria-pressed="${s===d.side}" ${d.snipe===5880||s==='buy'?'':'disabled'}>${s}</button>`).join('')}</div></div>
      </div>`;
      b.onclick = e => { const m = e.target.closest('[data-m]'); if(m){ d[m.dataset.m] = !d[m.dataset.m]; paint(); return; } const w = e.target.closest('[data-w]'); if(w){ d.snipe = +w.dataset.w; if(d.snipe!==5880) d.side='buy'; paint(); return; } const s = e.target.closest('[data-s]'); if(s && !s.disabled){ d.side = s.dataset.s; paint(); } };
    } else if(name==='Pre-buy'){
      b.innerHTML = `<div class="field"><label for="c-pb">Pre-buy (optional)</label><div class="amt"><div class="t"><span>You pay</span><span>Wallet ${f(S.wallet)}</span></div><input id="c-pb" type="number" min="0" value="${d.prebuy||0}"><span class="u">USDC</span></div><span class="hint">Bought in the same transaction as the launch, before anyone else, at the starting price. Pre-buy is not taxed by anti-sniper.</span></div><div id="c-pbo" class="mono mut" style="font-size:13px"></div>`;
      const up = () => { d.prebuy = Math.max(0, +$('#c-pb').value||0); $('#c-pbo').textContent = d.prebuy ? `≈ ${cmp(outBuy(0, d.prebuy*(1-FEE)))} ${d.sym} · ${f(outBuy(0, d.prebuy*(1-FEE))/1e7,2)}% of supply` : 'No pre-buy.'; }; $('#c-pb').oninput = up; up();
    } else {
      const P = d.ps;
      b.innerHTML = `<div class="who">${av(d.sym,colorFor(d.sym),'xl')}<div><div style="font-family:var(--cond);font-size:22px;font-weight:700;">${esc(d.name)} <span class="mono mut" style="font-size:15px">$${esc(d.sym)}</span></div><div class="mut">${d.type==='presale'?'Presale launch':'Standard launch'} · ${d.agent?'linked to '+esc(AG(d.agent).name):'token only'}</div></div></div>
        ${d.type==='standard'?`<div class="field"><span class="lbl">Launch time</span><div class="chips" id="c-when">${[[0,'Right away'],[1,'In 1 hour'],[6,'In 6 hours'],[24,'In 24 hours']].map(([h,l])=>`<button type="button" class="chip" data-when="${h}" aria-pressed="${d.when===h}">${l}</button>`).join('')}</div><span class="hint">Scheduled launches show in Upcoming launches with a countdown, so people can get ready.</span></div>`:''}
        ${tomicsHTML(d.T)}
        <dl class="kv"><dt>Supply</dt><dd>1,000,000,000 · fixed</dd>${d.type==='presale'
          ? `<dt>Raise</dt><dd>${f0(P.target)} USDC · ${P.alloc}% of supply</dd><dt>Max per wallet</dt><dd>${f0(P.cap)} USDC</dd><dt>Presale price</dt><dd>$${px(P.target/(P.alloc/100*1e9))}</dd><dt>Duration</dt><dd>${P.dur}h · min ${f0(P.minPts)} points</dd><dt>Allocation</dt><dd>points share × raise, capped per wallet</dd><dt>After settle</dt><dd>trading on the curve · 1% fee 70/30</dd><dt>Total now</dt><dd style="color:var(--ink)">0 USDC</dd>`
          : `<dt>Starting FDV</dt><dd>${usd(priceAt(0)*1e9)}</dd><dt>Graduation</dt><dd>${f0(GRAD)} USDC → pool, LP locked 10y</dd><dt>Trading fee</dt><dd>1% · 70% you / 30% treasury</dd><dt>Anti-sniper</dt><dd>${SNIPE[d.snipe]}${d.snipe?' · '+d.side:''}</dd><dt>Modules</dt><dd>${[d.cf&&'Capital Formation',d.radar&&'Launch Radar',d.d60&&'60 Days'].filter(Boolean).join(', ')||'none'}</dd><dt>Pre-buy</dt><dd>${f(d.prebuy||0)} USDC</dd><dt>Total now</dt><dd style="color:var(--ink)">${f(cost())} USDC</dd>`}</dl>
        <p class="dim" style="margin:0;font-size:12px">Settings are fixed once published. Preview: launches into the sample market.</p>`;
    }
    const cwn = $('#c-when'); if(cwn) cwn.onclick = e => { const c = e.target.closest('[data-when]'); if(c){ d.when = +c.dataset.when; paint(); } };
    const last = d.step===steps.length-1;
    ft.innerHTML = `${d.step?'<button class="btn" id="cw-bk">Back</button>':'<a class="btn" href="#tokens">Cancel</a>'}<button class="btn pri" id="cw-nx" ${name==='Type'&&!d.type?'disabled':''}>${last?(d.type==='presale'?'Open presale':d.when?'Schedule launch':'Launch token'):'Continue'}</button>`;
    const bk = $('#cw-bk'); if(bk) bk.onclick = () => { d.step--; paint(); };
    $('#cw-nx').onclick = () => {
      if(name==='Token'){ if(!d.name.trim()||!d.sym){ toast('Add a name and ticker.'); return; } if(TK(d.sym) || PRESALES.some(p=>p.sym===d.sym)){ toast('That ticker is taken.'); return; } }
      if(name==='Presale'){ const P = d.ps; if(P.cap > P.target){ toast('Max per wallet cannot exceed the raise.'); return; } }
      if(name==='Tokenomics'){ if(sum()!==100){ toast('Allocations must add up to 100%.'); return; } if(d.T.pct.pub < 20){ toast('Keep at least 20% on the bonding curve.'); return; } if(d.T.pct.team > 25){ toast('Team allocation is capped at 25%.'); return; } }
      if(name==='Pre-buy' && d.prebuy > S.wallet){ toast('Pre-buy is more than your wallet balance.'); return; }
      if(!last){ d.step++; paint(); return; }
      const creator = S.session.id==='demo'?'You':S.session.address;
      if(d.type==='presale'){
        const P = d.ps, now = Date.now();
        const ps = addPresale({sym:d.sym, name:d.name.trim(), cat:'Agents', color:colorFor(d.sym), target:P.target, cap:P.cap, alloc:P.alloc/100, minPts:P.minPts, start:now, end:now+P.dur*36e5, desc:d.desc||'', agent:d.agent||null, creator, tomics:JSON.parse(JSON.stringify(d.T))});
        if(d.agent) AG(d.agent).sym = ps.sym;
        note('acc','Presale', `$${ps.sym} presale is open for ${P.dur}h.`); location.hash = 'launch/'+ps.sym; return;
      }
      if(cost() > S.wallet){ toast('Not enough USDC in your wallet.'); return; }
      S.wallet -= (d.cf?10:0) + (d.radar?100:0);
      if(d.when){ S.wallet -= (+d.prebuy||0); const ps = addPresale({kind:'standard', sym:d.sym, name:d.name.trim(), cat:'Agents', color:colorFor(d.sym), start:Date.now()+d.when*36e5, snipe:d.snipe, side:d.side, radar:d.radar, d60:d.d60, prebuy:+d.prebuy||0, desc:d.desc||'', agent:d.agent||null, creator, remind:true, tomics:JSON.parse(JSON.stringify(d.T))}); paintTop(); note('info','Launch', `$${ps.sym} is scheduled. It opens in ${d.when}h.`); location.hash = 'launch/'+ps.sym; return; }
      const t = initToken({sym:d.sym, name:d.name.trim(), cat:'Agents', agent:d.agent||null, raised:0, holders:1, age:0, color:colorFor(d.sym), desc:d.desc||'', creator, created:Date.now(), forum:[], trades:[], vol:0, mods:{cf:d.cf, radar:d.radar, d60:d.d60}, snipe:d.snipe?{win:d.snipe, side:d.side, start:Date.now()}:null, tomics:JSON.parse(JSON.stringify(d.T))}, hash(d.sym));
      t.hist = Array.from({length:6},()=>priceAt(0)); t.open = priceAt(0); t.trades = []; t.vol = 0; t.forum = [];
      TOKENS.unshift(t); if(d.agent) AG(d.agent).sym = d.sym;
      if(d.prebuy > 0){ const res = doTrade(t, 'buy', d.prebuy*(1-FEE), 'You (pre-buy)'); S.wallet -= d.prebuy; S.hold[t.sym] = (S.hold[t.sym]||0)+res.amt; S.cost[t.sym] = d.prebuy; }
      note('acc','Launch', `$${t.sym} is live. Trading is open.`); paintTop();
      location.hash = 'token/'+t.sym;
    };
  };
  paint();
}

setInterval(() => { $$('[data-cd]').forEach(el => { const ps = PRESALES.find(p=>p.sym===el.dataset.cd); if(!ps) return; const st = psState(ps); el.textContent = st==='upcoming'?left(ps.start-Date.now()):st==='live'?left(ps.end-Date.now()):'ended'; }); const cd = document.getElementById('ps-cd'); if(cd && (route.name==='presale'||route.name==='launch')){ const ps = PRESALES.find(p=>p.sym===(route.arg||'').toUpperCase()); if(ps){ const st = psState(ps); if(st==='live') cd.textContent = left(ps.end-Date.now()); else if(st==='upcoming') cd.textContent = left(ps.start-Date.now()); } } }, 1000);

/* ================= PAX launch assistant ================= */
// PAX fills a launch spec from the user's message, asks only for what is missing, then launches through the same rules as the form.
const parseAmt = s => { const m = String(s).replace(/,/g,'').match(/(\d+(?:\.\d+)?)\s*(k|m)?\b/i); if(!m) return null; return +m[1]*(m[2]?(m[2].toLowerCase()==='k'?1e3:1e6):1); };
const TOM_PRESETS = {
  default:{label:'Balanced', pct:{pub:60, team:15, air:10, eco:10, tre:5}},
  fair:{label:'Fair launch, no team', pct:{pub:85, team:0, air:10, eco:5, tre:0}},
  community:{label:'Community heavy', pct:{pub:55, team:10, air:25, eco:7, tre:3}},
};
function sugSym(name){ let s = String(name||'TOKEN').replace(/[^A-Za-z0-9]/g,'').toUpperCase().slice(0,5) || 'TKN'; let t = s, i = 2; while(TK(t) || PRESALES.some(p=>p.sym===t)) t = s.slice(0,4) + (i++); return t; }
function specTomics(d){
  const T = defaultTomics(0), pre = d.type==='presale' ? d.share : 0;
  if(d.tom==='custom') T.pct = {pre, pub:90-d.team-d.air-pre, team:d.team, air:d.air, eco:5, tre:5};
  else { T.pct = {pre:0, ...TOM_PRESETS[d.tom||'default'].pct}; T.pct.pre = pre; T.pct.pub -= pre; }
  return T;
}
const LQ = [
  {k:'agent', label:'Agent', when:()=>myAgents().length>0, ask:()=>'Which of your agents is this token for? Tokens tied to an agent show its jobs and revenue on the token page.', opts:()=>[...myAgents().map(a=>a.name),'No agent'],
    parse:(q,d)=>{ if(/^(no|none|token only|skip)\b/i.test(q.trim())){ d.agent = null; return true; } const a = myAgents().find(a => q.toLowerCase().includes(a.name.toLowerCase()) || q.toLowerCase().includes(a.id)); if(!a) return 'I could not match that to one of your agents. Pick one below or say "No agent".'; d.agent = a.id; return true; }},
  {k:'name', label:'Name', ask:()=>'What should the token be called?', opts:d=>d.agent&&AG(d.agent)?[AG(d.agent).name]:[],
    parse:(q,d)=>{ const n = q.trim().replace(/^["“']|["”']$/g,''); if(n.length<2 || n.length>32) return 'Use 2 to 32 characters for the name.'; d.name = n; return true; }},
  {k:'sym', label:'Ticker', ask:()=>'Ticker?', opts:d=>[sugSym(d.name)],
    parse:(q,d)=>{ const s = q.replace(/^\$/,'').trim().toUpperCase(); if(!/^[A-Z0-9]{2,8}$/.test(s)) return 'A ticker is 2 to 8 letters or numbers, like LUMEN.'; if(TK(s) || PRESALES.some(p=>p.sym===s)) return `$${s} is taken. Try another one.`; d.sym = s; return true; }},
  {k:'desc', label:'Description', ask:()=>'In one sentence, what does it do? This goes on the token page.', opts:d=>d.agent&&AG(d.agent)?['Use the agent description']:[],
    parse:(q,d)=>{ if(/use the agent/i.test(q) && d.agent && AG(d.agent)){ d.desc = AG(d.agent).desc; return true; } if(q.trim().length<8) return 'Give me a short sentence, a few words at least.'; d.desc = q.trim(); return true; }},
  {k:'type', label:'Launch type', ask:()=>'Standard launch or presale? A standard launch opens trading on the curve at launch time. A presale raises USDC from point holders first, then opens trading.', opts:()=>['Standard launch','Presale'],
    parse:(q,d)=>{ if(/pre ?sale/i.test(q)) d.type = 'presale'; else if(/standard|normal|fair|direct|regular/i.test(q)) d.type = 'standard'; else return 'Say "standard" or "presale".'; return true; }},
  {k:'raise', label:'Raise', when:d=>d.type==='presale', ask:()=>'How much should the presale raise?', opts:()=>['10,000 USDC','20,000 USDC','50,000 USDC'],
    parse:(q,d)=>{ const v = parseAmt(q); if(!v || v<1000 || v>500000) return 'Pick an amount between 1,000 and 500,000 USDC.'; d.raise = Math.round(v); d.cap = Math.round(v*0.021); return true; }},
  {k:'share', label:'Presale share', when:d=>d.type==='presale', ask:d=>`What share of the supply goes to the presale? Each wallet can put in up to ${f0(d.cap)} USDC (2.1% of the raise).`, opts:()=>['10%','15%','20%','25%','30%'],
    parse:(q,d)=>{ const v = parseAmt(q); if(!v || v<10 || v>30) return 'Choose between 10% and 30%.'; d.share = Math.round(v); return true; }},
  {k:'dur', label:'Duration', when:d=>d.type==='presale', ask:()=>'How long should the presale run?', opts:()=>['24 hours','48 hours','72 hours'],
    parse:(q,d)=>{ const v = parseAmt(q); if(![24,48,72].includes(v)) return 'Choose 24, 48 or 72 hours.'; d.dur = v; return true; }},
  {k:'snipe', label:'Anti-sniper', when:d=>d.type==='standard', ask:()=>'Anti-sniper protection? Early buys pay a tax that falls from 99% to 1% over the window, so bots cannot grab the first block.', opts:()=>['10 minutes','60 seconds','98 minutes','Off'],
    parse:(q,d)=>{ if(/\b(off|no|none)\b/i.test(q)) d.snipe = 0; else if(/98/.test(q)) d.snipe = 5880; else if(/60|sec/i.test(q)) d.snipe = 60; else if(/10/.test(q)) d.snipe = 600; else return 'Pick a window or say "off".'; return true; }},
  {k:'when', label:'Launch time', when:d=>d.type==='standard', ask:()=>'When should it go live? A scheduled launch shows in Upcoming launches with a countdown.', opts:()=>['Right away','In 1 hour','In 6 hours','In 24 hours'],
    parse:(q,d)=>{ if(/now|right away|immediately|asap/i.test(q)) d.when = 0; else if(/tomorrow/i.test(q)) d.when = 24; else { const v = parseAmt(q); if(v==null || v>72) return 'Say "right away" or a number of hours up to 72.'; d.when = v; } return true; }},
  {k:'prebuy', label:'Pre-buy', when:d=>d.type==='standard', ask:()=>`Do you want to pre-buy at the starting price? It comes from your main wallet (${f(S.wallet)} USDC) and is not taxed by anti-sniper.`, opts:()=>['No pre-buy','25 USDC','50 USDC','100 USDC'],
    parse:(q,d)=>{ if(/^(no|none|skip)\b/i.test(q.trim())){ d.prebuy = 0; return true; } const v = parseAmt(q); if(v==null) return 'Give an amount in USDC or say "no".'; if(v > S.wallet-10) return `That is more than your wallet can cover after the 10 USDC launch fee.`; d.prebuy = v; return true; }},
  {k:'tom', label:'Tokenomics', ask:()=>'Last step: how should the supply be split? Team and treasury vest with a cliff; the airdrop goes to Opcode point holders.', opts:()=>['Balanced: curve 60, team 15, airdrop 10','Fair launch: no team','Community heavy: airdrop 25','Custom'],
    parse:(q,d)=>{ if(/custom/i.test(q)) d.tom = 'custom'; else if(/fair|no team/i.test(q)) d.tom = 'fair'; else if(/community|airdrop 25/i.test(q)) d.tom = 'community'; else if(/balanced|default|standard/i.test(q)) d.tom = 'default'; else return 'Pick one of the options or say "custom".'; return true; }},
  {k:'team', label:'Team share', when:d=>d.tom==='custom', ask:()=>'Team share in percent? Up to 25%; it vests over 24 months after a 6-month cliff.', opts:()=>['0%','10%','15%','20%'],
    parse:(q,d)=>{ const v = parseAmt(q); if(v==null || v<0 || v>25) return 'Team share must be 0 to 25%.'; d.team = Math.round(v); return true; }},
  {k:'air', label:'Airdrop', when:d=>d.tom==='custom', ask:()=>'Airdrop share for Opcode point holders, in percent?', opts:()=>['0%','5%','10%','20%'],
    parse:(q,d)=>{ const v = parseAmt(q); if(v==null || v<0) return 'Give a percentage.'; const pub = 90 - d.team - Math.round(v) - (d.type==='presale'?d.share:0); if(pub < 20) return `That leaves ${pub}% for the curve. Keep at least 20% there.`; d.air = Math.round(v); return true; }},
];
const lqActive = d => LQ.filter(Q => !Q.when || Q.when(d));
const lqNext = d => lqActive(d).find(Q => d[Q.k] === undefined);
function preParseLaunch(q, d){
  if(/pre ?sale/i.test(q)) d.type = 'presale'; else if(/\b(standard|fair launch|no presale)\b/i.test(q)) d.type = 'standard';
  const sym = q.match(/\$([A-Za-z0-9]{2,8})\b/) || q.match(/\bticker\s+([A-Za-z0-9]{2,8})\b/i); if(sym){ const s = sym[1].toUpperCase(); if(!TK(s) && !PRESALES.some(p=>p.sym===s)) d.sym = s; }
  const nm = q.match(/\b(?:called|named)\s+["“']?([A-Za-z0-9][A-Za-z0-9 .\-]{1,30}?)["”']?(?=\s+(?:with|ticker|for|and|as|on|in|raising|raise)\b|[,.$]|$)/i); if(nm) d.name = nm[1].trim();
  const ag = myAgents().find(a => new RegExp('\\b('+a.id+'|'+a.name.replace(/[^A-Za-z0-9 ]/g,'')+')\\b','i').test(q)); if(ag){ d.agent = ag.id; } else if(/\b(no agent|token only)\b/i.test(q)) d.agent = null;
  const rs = q.match(/\braise\s+\$?([\d.,]+\s*k?)/i); if(rs && d.type!=='standard'){ const v = parseAmt(rs[1]); if(v>=1000){ d.type = 'presale'; d.raise = Math.round(v); d.cap = Math.round(v*0.021); } }
  const sh = q.match(/(\d{2})\s*%\s*(?:of (?:the )?supply|presale)/i); if(sh && +sh[1]>=10 && +sh[1]<=30){ d.share = +sh[1]; }
  if(/\b(right away|now|immediately)\b/i.test(q)) d.when = 0; else { const w = q.match(/\bin\s+(\d{1,2})\s*h(?:ours?)?\b/i); if(w) d.when = +w[1]; else if(/\btomorrow\b/i.test(q)) d.when = 24; }
  if(/\bno anti-?sniper\b/i.test(q)) d.snipe = 0;
  if(/\bfair launch\b/i.test(q)) d.tom = 'fair';
  if(d.when !== undefined && !d.type) d.type = 'standard';
  return d;
}
function launchSpec(d){
  const creator = S.session.id==='demo' ? 'You' : S.session.address, now = Date.now(), T = specTomics(d), color = colorFor(d.sym);
  if(d.type==='presale'){
    const ps = addPresale({sym:d.sym, name:d.name, cat:'Agents', color, target:d.raise, cap:d.cap, alloc:d.share/100, minPts:100, start:now, end:now+d.dur*36e5, desc:d.desc||'', agent:d.agent||null, creator, tomics:T});
    note('acc','Presale', `$${ps.sym} presale is open for ${d.dur}h.`); return {kind:'presale', sym:ps.sym, href:'launch/'+ps.sym};
  }
  const cost = 10 + (+d.prebuy||0); if(cost > S.wallet) return {err:'Not enough USDC in your main wallet for the launch fee and pre-buy.'};
  S.wallet -= 10;
  if(d.when){ S.wallet -= (+d.prebuy||0); const ps = addPresale({kind:'standard', sym:d.sym, name:d.name, cat:'Agents', color, start:now+d.when*36e5, snipe:d.snipe, side:'buy', prebuy:+d.prebuy||0, desc:d.desc||'', agent:d.agent||null, creator, remind:true, tomics:T}); paintTop(); note('info','Launch', `$${ps.sym} is scheduled in ${d.when}h.`); return {kind:'scheduled', sym:ps.sym, href:'launch/'+ps.sym}; }
  const t = initToken({sym:d.sym, name:d.name, cat:'Agents', agent:d.agent||null, raised:0, holders:1, age:0, color, desc:d.desc||'', creator, created:now, forum:[], trades:[], vol:0, mods:{cf:true, radar:false, d60:false}, snipe:d.snipe?{win:d.snipe, side:'buy', start:now}:null, tomics:T}, hash(d.sym));
  t.hist = Array.from({length:6},()=>priceAt(0)); t.open = priceAt(0); t.trades = []; t.vol = 0;
  TOKENS.unshift(t); if(d.agent && AG(d.agent)) AG(d.agent).sym = d.sym;
  let pb = null; if(d.prebuy > 0){ pb = doTrade(t, 'buy', d.prebuy*(1-FEE), 'You (pre-buy)'); S.wallet -= d.prebuy; S.hold[t.sym] = (S.hold[t.sym]||0)+pb.amt; S.cost[t.sym] = d.prebuy; }
  note('acc','Launch', `$${t.sym} is live. Trading is open.`); paintTop();
  return {kind:'live', sym:t.sym, href:'token/'+t.sym, prebuy:pb};
}
function launchCardHTML(m){
  const d = m.d, st = m.state, T = specTomics(d), pr = d.type==='presale' ? d.raise/(d.share/100*1e9) : priceAt(0);
  const row = (l, v) => `<dt>${l}</dt><dd>${v}</dd>`;
  const field = (k, l, v) => st==='pending' ? `<dt>${l}</dt><dd><input class="ci" data-l="${k}" value="${esc(v||'')}" aria-label="${l}"></dd>` : `<dt>${l}</dt><dd>${esc(v||'')}</dd>`;
  return `${st==='pending'?'Here is the launch. Edit the name, ticker or description here, or open the full form for everything else.':st==='done'?'Done.':'Cancelled.'}
  <div class="card lcard"><div class="ch"><div class="who">${av(d.sym||'NEW', colorFor(d.sym||'NEW'),'sm')}<div><div class="n">${esc(d.name)} <span class="mut">$${esc(d.sym)}</span></div><div class="s">${d.type==='presale'?'Presale launch':'Standard launch'}${d.agent&&AG(d.agent)?' for '+esc(AG(d.agent).name):''}</div></div></div><span class="tag ${st==='done'?'up':st==='cancel'?'':'acc'}">${st==='done'?(m.res.kind==='live'?'Live':m.res.kind==='scheduled'?'Scheduled':'Presale open'):st==='cancel'?'Cancelled':'Ready to launch'}</span></div>
  <div class="cb"><dl class="cikv">${field('name','Name',d.name)}${field('sym','Ticker',d.sym)}${field('desc','Description',d.desc)}</dl>
    <div class="tom-bar" style="margin:14px 0 6px">${TOM_ROWS.filter(r=>T.pct[r[0]]>0).map(r=>`<i style="width:${T.pct[r[0]]}%;background:${TOM_COL[r[0]]}" title="${r[1]} ${T.pct[r[0]]}%"></i>`).join('')}</div>
    <div class="lc-leg">${TOM_ROWS.filter(r=>T.pct[r[0]]>0).map(r=>`<span><i style="background:${TOM_COL[r[0]]}"></i>${r[1]} ${T.pct[r[0]]}%</span>`).join('')}</div>
    <dl class="kv" style="margin-top:12px">${d.type==='presale'
      ? row('Raise', f0(d.raise)+' USDC · '+d.share+'% of supply') + row('Max per wallet', f0(d.cap)+' USDC') + row('Presale price', '$'+px(pr)+' · FDV '+usd(pr*1e9)) + row('Duration', d.dur+' hours, starts now') + row('Joining', 'lock points; allocation by points share') + row('Cost now', '0 USDC')
      : row('Starts', d.when ? 'in '+d.when+' hour'+(d.when>1?'s':'') : 'right away') + row('Starting price', '$'+px(pr)+' · FDV '+usd(pr*1e9)) + row('Anti-sniper', d.snipe?SNIPE[d.snipe]:'off') + row('Pre-buy', f(d.prebuy||0)+' USDC') + row('Launch fee', '10 USDC (Capital Formation)') + row('Cost now', `<b style="color:var(--ink)">${f(10+(+d.prebuy||0))} USDC</b> from wallet`)}
      ${row('Trading fee', '1% · 70% to you, 30% treasury')}</dl></div>
  ${st==='pending'?`<div class="cf"><button class="btn sm pri" data-a="dolaunch">${d.type==='presale'?'Open presale':d.when?'Schedule launch':'Launch now'}</button><button class="btn sm" data-a="editform">Open full form</button><button class="btn sm ghost" data-a="cancel">Cancel</button></div>`:''}
  ${st==='done'?`<div class="cf"><a class="btn sm pri" href="#${m.res.href}">${m.res.kind==='live'?'Open token page':'Open launch page'}</a></div>`:''}</div>`;
}
