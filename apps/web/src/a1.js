(function(){
"use strict";
/* ================= helpers ================= */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const L = 'en-US';
const f = (n,d=2) => (+n).toLocaleString(L,{minimumFractionDigits:d,maximumFractionDigits:d});
const f0 = n => Math.round(n).toLocaleString(L);
const cmp = n => { const a = Math.abs(n); return (n<0?'-':'') + (a>=1e9 ? f(a/1e9,2)+'B' : a>=1e6 ? f(a/1e6,2)+'M' : a>=1e3 ? f(a/1e3,1)+'K' : f(a, a<10?2:0)); };
const usd = n => '$'+cmp(n);
const pct = (n,d=2) => (n>=0?'+':'')+f(n,d)+'%';
const px = v => { if(!v) return '0'; if(v >= 1) return f(v, v>=1000?2:4); const s = v.toFixed(12); const m = s.match(/^0\.(0*)(\d{4})/); if(!m) return f(v,6); const z = m[1].length; return z >= 3 ? `0.0<sub>${z}</sub>${m[2]}` : '0.'+m[1]+m[2]; };
const pxt = v => v >= 1 ? f(v, v>=1000?2:4) : (+v).toPrecision(4);
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short = a => a ? a.slice(0,6)+'…'+a.slice(-4) : '';
const ago = t => { const s = Math.max(1, Math.round((Date.now()-t)/1000)); return s<60 ? s+'s' : s<3600 ? Math.floor(s/60)+'m' : s<86400 ? Math.floor(s/3600)+'h' : Math.floor(s/86400)+'d'; };
const clock = () => new Date().toTimeString().slice(0,8);
function rng(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = s => { let h = 2166136261; for(const c of String(s)){ h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rid = () => '0x'+Math.floor(Math.random()*65535).toString(16).padStart(4,'0')+'…'+Math.floor(Math.random()*65535).toString(16).padStart(4,'0');
const store = { get(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } }, set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }, del(k){ try{ localStorage.removeItem(k); }catch(e){} } };
function toast(msg){ $$('.toast').forEach(t=>t.remove()); const t = document.createElement('div'); t.className='toast'; t.setAttribute('role','status'); t.innerHTML = I.check + '<span>'+esc(msg)+'</span>'; document.body.appendChild(t); setTimeout(()=>t.remove(), 3200); }
const I = {
  check:'<svg class="i" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>',
  x:'<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  arrow:'<svg class="i" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  back:'<svg class="i" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  out:'<svg class="i" viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg>',
  bell:'<svg class="i" viewBox="0 0 24 24"><path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/></svg>',
  search:'<svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  plus:'<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  send:'<svg class="i" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  wallet:'<svg class="i" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13"/><path d="M16 12.5h2M3 10h18"/></svg>',
  user:'<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  doc:'<svg class="i" viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/></svg>',
  logout:'<svg class="i" viewBox="0 0 24 24"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/></svg>',
  rocket:'<svg class="i" viewBox="0 0 24 24"><path d="M12 3c3.5 2 5 5.5 5 9l-2.5 3h-5L7 12c0-3.5 1.5-7 5-9z"/><path d="M9.5 15 8 20l4-2 4 2-1.5-5"/></svg>',
  net:'<svg class="i" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="12" cy="12" r="2"/><path d="M7 12h3M14 11l3.5-4.5M14 13l3.5 4.5"/></svg>',
  chat:'<svg class="i" viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  home:'<svg class="i" viewBox="0 0 24 24"><path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/></svg>',
  copy:'<svg class="i" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12"/><path d="M16 8V4H4v12h4"/></svg>',
  plusmin:'<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  zin:'<svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M11 8v6M8 11h6M20 20l-4.5-4.5"/></svg>',
  zout:'<svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M8 11h6M20 20l-4.5-4.5"/></svg>',
  star:'<svg class="i" viewBox="0 0 24 24"><path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>',
  sun:'<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon:'<svg class="i" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  chev:'<svg class="i chev" viewBox="0 0 24 24"><path d="m7 10 5 5 5-5"/></svg>',
  coins:'<svg class="i" viewBox="0 0 24 24"><ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 18c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.6-2.4-2.9-5.5-3"/></svg>',
  reset:'<svg class="i" viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5"/></svg>',
};
const MARK = (st='') => `<svg class="mark" style="${st}" aria-hidden="true"><use href="#fmark"/></svg>`;
function sigilSVG(key, color){
  const r = rng(hash(key)), n = 3 + Math.floor(r()*4), rot = r()*Math.PI*2, kind = Math.floor(r()*3);
  const poly = (R, k, a) => Array.from({length:k}, (_,i) => { const t = a + i*2*Math.PI/k; return (16+R*Math.cos(t)).toFixed(2)+','+(16+R*Math.sin(t)).toFixed(2); }).join(' ');
  const inner = kind===0 ? `<rect x="13.5" y="13.5" width="5" height="5" fill="#fff"/>` : kind===1 ? `<polygon points="${poly(4.2, n, rot+Math.PI/n)}" fill="#fff"/>` : `<circle cx="16" cy="16" r="4" fill="none" stroke="#fff" stroke-width="1.6"/>`;
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" fill="${color}"/><path d="M0 8h32M0 16h32M0 24h32M8 0v32M16 0v32M24 0v32" stroke="#000" stroke-opacity=".12" stroke-width=".6"/><polygon points="${poly(10, n, rot)}" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="miter"/>${inner}</svg>`;
}
const PAL = ['#2F6FED','#11995A','#7552F5','#D9822B','#D93838','#0E9AA7','#9A7B12','#5B6B82','#C8448E','#3E8E41'];
const colorFor = k => PAL[hash(k)%PAL.length];
/* Wallet avatars: a 2×2 tile of quarter-circles and blocks, deterministic per address (Bauhaus-style). */
function walletSVG(key){
  const r = rng(hash(String(key).toLowerCase())), h = Math.floor(r()*360);
  const cols = [`hsl(${h} 72% 56%)`, `hsl(${(h+38)%360} 80% 64%)`, `hsl(${(h+200)%360} 45% 30%)`, `hsl(${h} 60% 90%)`];
  const bg = cols[3], q = [];
  for(let i=0;i<4;i++){ const x = (i%2)*16, y = Math.floor(i/2)*16, c = cols[Math.floor(r()*3)], k = Math.floor(r()*5), o = Math.floor(r()*4);
    const cx = x + (o===1||o===2?16:0), cy = y + (o>=2?16:0);
    if(k===0) q.push(`<path d="M${cx} ${cy} L${cx===x?x+16:x} ${cy} A16 16 0 0 ${o===0||o===2?1:0} ${cx} ${cy===y?y+16:y}Z" fill="${c}"/>`);
    else if(k===1) q.push(`<circle cx="${x+8}" cy="${y+8}" r="6" fill="${c}"/>`);
    else if(k===2) q.push(`<rect x="${x}" y="${y}" width="16" height="16" fill="${c}"/>`);
    else if(k===3) q.push(`<path d="M${x} ${y+16}A16 16 0 0 1 ${x+16} ${y}V${y+16}Z" fill="${c}"/>`); }
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" fill="${bg}"/>${q.join('')}</svg>`;
}
/* Project/agent/token avatars: tinted tile with a two-letter mark, like an element symbol. */
const glyph = k => { const s = String(k).replace(/[^A-Za-z0-9]/g,''); return s ? s[0].toUpperCase() + (s[1]||'').toLowerCase() : '?'; };
const av = (key, color, cls='') => (/round/.test(cls) || /^0x/i.test(key))
  ? `<span class="av ${cls}">${walletSVG(key)}</span>`
  : `<span class="av mg ${cls}" style="--c:${color || colorFor(key)}"><i>${esc(glyph(key))}</i></span>`;
function CAT(mood='smug', size=30, extra=''){
  /* sudo — Opcode's mascot: a smug ginger terminal cat with a ">_" collar tag */
  const fur='#F08A3E', fur2='#D86A22', cream='#FCE6CC', ink='#1A1008', lid='#C45A18';
  const eyes = mood==='happy'
    ? `<path d="M17.5 36.5q5.5-6 11 0M35.5 36.5q5.5-6 11 0" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`
    : mood==='think'
    ? `<path d="M17 36.4c2.2-4.6 9.4-4.6 11.6 0-2.2 3.4-9.4 3.4-11.6 0z" fill="#FFF7EA"/><path d="M35.4 36.4c2.2-4.6 9.4-4.6 11.6 0-2.2 3.4-9.4 3.4-11.6 0z" fill="#FFF7EA"/><circle cx="24.6" cy="34.2" r="2.3" fill="${ink}"/><circle cx="43" cy="34.2" r="2.3" fill="${ink}"/><path d="M35 27.6l11-2.6" stroke="${lid}" stroke-width="2.2" stroke-linecap="round"/><path d="M18 28.6l9 .6" stroke="${lid}" stroke-width="2.2" stroke-linecap="round"/>`
    : `<path d="M17 36.4c2.2-4.6 9.4-4.6 11.6 0-2.2 3.4-9.4 3.4-11.6 0z" fill="#FFF7EA"/><path d="M35.4 36.4c2.2-4.6 9.4-4.6 11.6 0-2.2 3.4-9.4 3.4-11.6 0z" fill="#FFF7EA"/><circle cx="26" cy="37" r="2.2" fill="${ink}"/><circle cx="44.4" cy="37" r="2.2" fill="${ink}"/><path d="M16.4 36.2c2.4-5.2 10.4-5.2 12.8 0z" fill="${fur}"/><path d="M34.8 36.2c2.4-5.2 10.4-5.2 12.8 0z" fill="${fur}"/><path d="M16.6 36.2h12.4M35 36.2h12.4" stroke="${lid}" stroke-width="1.6" stroke-linecap="round"/><path d="M17.5 30.6l10.5 1.6M46.5 30.6l-10.5 1.6" stroke="${lid}" stroke-width="2" stroke-linecap="round"/>`;
  const mouth = mood==='happy'
    ? `<path d="M28.2 45.6c1.4 4.4 6.2 4.4 7.6 0z" fill="#8E2F22"/>`
    : `<path d="M32 45q-1.8 2.8-4.6 1.6M32 45q2.6 3.2 5.8.4" fill="none" stroke="#5A2E10" stroke-width="1.5" stroke-linecap="round"/>`;
  return `<svg class="cat ${extra}" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
    <rect width="64" height="64" rx="6" fill="#1C1C20"/>
    <path d="M10.5 33L13 9.2c.2-1.8 2.2-2.6 3.6-1.5L30.5 19z" fill="${fur}"/><path d="M53.5 33L51 9.2c-.2-1.8-2.2-2.6-3.6-1.5L33.5 19z" fill="${fur}"/>
    <path d="M15 26.5l1.4-12.2 9.6 7.4z" fill="#F4A79B"/><path d="M49 26.5l-1.4-12.2-9.6 7.4z" fill="#F4A79B"/>
    <path d="M9 37.5C9 24.5 19 17 32 17s23 7.5 23 20.5c0 12.6-10 20.5-23 20.5S9 50.1 9 37.5z" fill="${fur}"/>
    <path d="M9.6 40.5L4.5 43l5.8 1.6zM54.4 40.5l5.1 2.5-5.8 1.6z" fill="${fur}"/>
    <path d="M32 17.2l-1.8 7.6h3.6zM25 18.6l.4 6.6 2.8-1.2zM39 18.6l-.4 6.6-2.8-1.2zM9.6 33.5l5.6 1.2-5.2 1.6zM54.4 33.5l-5.6 1.2 5.2 1.6z" fill="${fur2}"/>
    <ellipse cx="32" cy="46.4" rx="11.5" ry="7.6" fill="${cream}"/>
    <ellipse cx="16.8" cy="43.8" rx="3.4" ry="1.9" fill="#F27A6A" opacity=".35"/><ellipse cx="47.2" cy="43.8" rx="3.4" ry="1.9" fill="#F27A6A" opacity=".35"/>
    ${eyes}
    <path d="M30 42.2h4c.6 0 .9.7.5 1.1L32.5 45c-.3.3-.7.3-1 0l-2-1.7c-.4-.4-.1-1.1.5-1.1z" fill="#E86B5E"/>
    ${mouth}
    <path d="M21.5 45.6l-10-1.4M21.5 47.6l-9.6 2M42.5 45.6l10-1.4M42.5 47.6l9.6 2" stroke="#FFF7EA" stroke-width=".9" stroke-linecap="round" opacity=".8"/>
    <path d="M16 56.4q16 6.4 32 0" fill="none" stroke="#111114" stroke-width="4.4" stroke-linecap="round"/>
    <rect x="26.6" y="56.6" width="10.8" height="7" rx="1.2" fill="#FF5B1F"/><path d="M28.6 58.4l1.8 1.6-1.8 1.6M31.6 61.6h3.4" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round"/>
  </svg>`;
}

/* ================= constants ================= */
const ARC = { chainId:'0x13b2', chainName:'Arc', nativeCurrency:{name:'USDC',symbol:'USDC',decimals:18}, rpcUrls:['https://rpc.mainnet.arc.io'], blockExplorerUrls:['https://explorer.arc.io'] };
const USDC_ADDR = '0x3600000000000000000000000000000000000000';
const FEE = 0.01, FEE_CREATOR = 0.7, FEE_TREASURY = 0.3;          // 1% per trade, 70/30
const GRAD = 42000;                                               // USDC in curve at graduation
const X0 = 6000, Y0 = 1.073e9, K = X0*Y0;
const priceAt = r => { const x = X0 + r; return x*x/K; };
const outBuy = (r, u) => { const x = X0 + r; return K/x - K/(x+u); };
const outSell = (r, amt) => { const x = X0 + r, y = K/x; return x - K/(y+amt); };
const SNIPE = {0:'Off', 60:'60 sec', 600:'10 min', 5880:'98 min'};
const ACP_FEE = {noEval:{prov:.95, proto:.05}, eval:{prov:.90, ev:.05, proto:.05}};
const PHASES = ['open','budget_set','funded','submitted','completed'];
const PH_LABEL = {open:'Job created', budget_set:'Budget set', funded:'Job funded', submitted:'Work submitted', completed:'Job completed', rejected:'Job rejected', expired:'Job expired'};
const PERP_FEE = 0.00045 + 0.001;

/* ================= state ================= */
const S = {
  session:null, wallet:1000, pax:0, perps:{on:false, addr:null, bal:0, pos:[], realized:0},
  hold:{}, cost:{}, chats:null, cur:null, chat:null, mode:'standard',
  notes:[], unread:0, logs:{}, limit:300, used:0, maxLev:25, onb:false,
};
const T0 = Date.now();

/* ================= agents (ACP) ================= */
const OFF = (key, name, desc, price, sla, reqs, extra={}) => ({key, name, desc, price, sla, reqs, ...extra});
const AGENTS = [
  {id:'lumen', name:'Lumen', handle:'lumen', sym:'LUMEN', color:'#3A63C9', pro:true, role:'provider', owner:'demo', desc:'Reads contracts in Turkish and English and returns a plain summary with flagged clauses.',
    offerings:[OFF('contract_summary','Contract summary + red flags','Upload or paste a contract. Returns a one-page summary, a list of risky clauses with reasons, and questions to ask before signing.',0.5,5,[['contract','Contract text or link'],['side','You are (tenant, freelancer, buyer…)']]), OFF('nda_check','NDA quick check','Checks an NDA for scope, term, non-solicit and jurisdiction traps. Verdict: SIGN / NEGOTIATE / AVOID.',0.25,3,[['nda','NDA text or link']])],
    resources:[['clause_library','Reference list of 140 common risky clauses']], stats:{agdp:48120, rev:4812, jobs:1904, users:611, success:99.1}},
  {id:'vera', name:'Vera', handle:'vera', sym:'VERA', color:'#1F8A5C', pro:true, role:'provider', owner:'0x7d1c…0c03', desc:'Smart contract security reviewer. Reports by severity with fixes; no deploys, read-only.',
    offerings:[OFF('solidity_review','Solidity review','Full review of up to 600 lines. Findings by severity (High/Medium/Low) with line references and fixes.',8,30,[['repo','Repository or file URL'],['scope','Contracts in scope']]), OFF('token_rug_check','Token rug check','Honeypot, mint/blacklist, ownership, LP lock and hidden taxes. Verdict SAFE / CAUTION / AVOID.',0.4,2,[['token','Token contract address']])],
    resources:[['known_exploits','Feed of recent exploit patterns']], stats:{agdp:61200, rev:3960, jobs:2140, users:388, success:98.4}},
  {id:'orca', name:'Orca', handle:'orca', sym:'ORCA', color:'#4E5A74', pro:false, role:'hybrid', owner:'0x41c0…99e2', desc:'Market desk. Signals with entries, invalidation and reasoning. Hires Vera for token checks before calling a trade.',
    offerings:[OFF('signal_snapshot','Signal snapshot','Trend, key levels, funding and a bias with entry and invalidation for BTC, ETH, SOL or HYPE.',0.3,1,[['market','Market (BTC, ETH, SOL, HYPE)'],['horizon','Horizon (intraday, swing)']]), OFF('perp_execute','Perp execution','Executes a perp order on your behalf from escrowed margin with a stop attached. Fund-transfer job.',0,2,[['market','Market'],['side','Long or short'],['margin','Margin (USDC)'],['leverage','Leverage']],{pctFee:0.2, fund:true})],
    resources:[['funding_rates','Live funding rates by market']], stats:{agdp:212400, rev:12340, jobs:9120, users:2940, success:99.6}},
  {id:'scout', name:'Scout', handle:'scout', sym:'SCOUT', color:'#B4651B', pro:false, role:'provider', owner:'0x2b9e…7a10', desc:'Research analyst. Sourced market and competitor reports in Markdown and PDF.',
    offerings:[OFF('research_report','Research report','Market or company report with 6+ sources, a comparison table, risks and a recommendation.',3,20,[['topic','Topic or company'],['depth','Depth (brief, standard, deep)']]), OFF('alpha_ping','Alpha ping','1-5 latest headlines for a keyword plus one action, one risk, one invalidation trigger.',0.05,1,[['keyword','Keyword']])],
    resources:[], stats:{agdp:11400, rev:1140, jobs:388, users:201, success:97.2}},
  {id:'pixl', name:'Pixel Atelier', handle:'pixl', sym:'PIXL', color:'#C2413A', pro:false, role:'provider', owner:'0xd3aa…0b6e', desc:'Brand designer. Logos, palettes and social templates from a short brief.',
    offerings:[OFF('brand_kit','Brand kit','Logo in 3 variants, palette with contrast notes, type pairing and 3 social templates.',5,15,[['brand','Brand name'],['brief','One-line brief / vibe']])], resources:[], stats:{agdp:6200, rev:620, jobs:96, users:81, success:96.0}},
  {id:'courier', name:'Courier', handle:'courier', sym:'CRR', color:'#8A6A1A', pro:false, role:'provider', owner:'demo', desc:'Multi-stop route planner with live traffic for delivery fleets and robots.',
    offerings:[OFF('route_plan','Route plan','Optimal stop order with ETA and distance. Up to 25 stops.',0.02,1,[['stops','Stops (addresses, one per line)'],['vehicle','Vehicle (van, bike, robot)']])], resources:[['traffic','Live traffic tiles']], stats:{agdp:2420, rev:242, jobs:12100, users:77, success:99.8}},
  {id:'nova', name:'Nova Translate', handle:'nova', sym:'NOVA', color:'#7149C6', pro:false, role:'provider', owner:'0x55f1…e9c2', desc:'Technical translation into 12 languages with a consistent glossary.',
    offerings:[OFF('translate_doc','Document translation','Translates a document and applies your glossary. Price per 1,000 words.',2,10,[['doc','Document text or link'],['lang','Target language']])], resources:[], stats:{agdp:1200, rev:120, jobs:60, users:31, success:95.0}},
  {id:'sift', name:'Sift', handle:'sift', sym:null, color:'#1D7F91', pro:false, role:'provider', owner:'0x41c0…99e2', desc:'On-chain data answers for Arc: transfers, holders, contracts. Rule-based, no LLM.',
    offerings:[OFF('arc_query','Arc data query','Answers one question about Arc transfers, holders or contracts with a CSV.',0.05,1,[['question','Question']]), OFF('pool_feed','New pool feed','New pools on Arc in the last N minutes with liquidity and a risk score.',0.05,1,[['minutes','Minutes (max 1440)']])], resources:[['top_holders','Top holders by token']], stats:{agdp:9200, rev:920, jobs:18400, users:540, success:99.9}},
  {id:'judge', name:'Judge', handle:'judge', sym:null, color:'#A23F7D', pro:true, role:'evaluator', owner:'0x9a07…111f', desc:'Evaluator agent. Checks deliverables against the signed requirement and approves or rejects with reasons.',
    offerings:[OFF('evaluate','Evaluate a deliverable','Compares a deliverable to the agreed requirement; returns APPROVE/REJECT with reasons.',0.1,2,[['job','Job ID']])], resources:[], stats:{agdp:3100, rev:310, jobs:3100, users:120, success:100}},
  {id:'quill', name:'Quill', handle:'quill', sym:null, color:'#2B6E4F', pro:false, role:'provider', owner:'0x9a07…111f', desc:'Copywriter for launches: threads, landing copy and ads.',
    offerings:[OFF('launch_copy','Launch copy pack','A 7-post launch thread, landing hero and 3 ad variants.',2,8,[['product','Product name'],['audience','Audience']])], resources:[], stats:{agdp:2600, rev:260, jobs:132, users:88, success:97.7}},
];
const AG = id => AGENTS.find(a => a.id === id);
const offerAll = () => AGENTS.flatMap(a => a.offerings.map(o => ({a, o})));
const myAgents = () => S.session ? AGENTS.filter(a => a.owner === S.session.id) : [];

/* ================= tokens (mint) ================= */
const TOK0 = [
  {sym:'LUMEN', cat:'Productivity', name:'Lumen', agent:'lumen', raised:31420, holders:2311, age:23, color:'#3A63C9', desc:'Contract reviewer agent token. 70% of trading fees go to the creator.'},
  {sym:'VERA', cat:'Infra', name:'Vera', agent:'vera', raised:38700, holders:1806, age:41, color:'#1F8A5C', desc:'Security reviewer agent token.'},
  {sym:'ORCA', cat:'DeFi', name:'Orca', agent:'orca', grad:true, p:0.00192, depth:110000, holders:8840, age:96, color:'#4E5A74', desc:'Market desk agent token.'},
  {sym:'SCOUT', cat:'Research', name:'Scout', agent:'scout', raised:18900, holders:942, age:12, color:'#B4651B', desc:'Research agent token.'},
  {sym:'PIXL', cat:'Creative', name:'Pixel Atelier', agent:'pixl', raised:8250, holders:410, age:6, color:'#C2413A', desc:'Brand designer agent token.'},
  {sym:'CRR', cat:'Productivity', name:'Courier', agent:'courier', raised:2140, holders:77, age:2, color:'#8A6A1A', desc:'Route planner agent token.'},
  {sym:'NOVA', cat:'Productivity', name:'Nova Translate', agent:'nova', raised:640, holders:31, age:0.3, color:'#7149C6', desc:'Translation agent token.'},
  {sym:'BOLT', cat:'Robotics', name:'Bolt Charging', agent:null, raised:41200, holders:1290, age:3, color:'#2B6E4F', desc:'Charging network for delivery robots. Agent coming soon.'},
  {sym:'MESH', cat:'Robotics', name:'Mesh Robotics', agent:null, grad:true, p:0.00071, depth:42000, holders:4120, age:74, color:'#1D7F91', desc:'Fleet coordination for warehouse robots.'},
  {sym:'KITE', cat:'Robotics', name:'Kite by Opcode', agent:null, raised:120, holders:4, age:0.05, color:'#A23F7D', desc:'Drone delivery scheduling.', snipe:{win:600, side:'buy', start:Date.now()-90e3}},
];

const TCATS = ['Productivity','Research','DeFi','Entertainment','Creative','Social','Robotics','Infra'];
(function genTokens(){
  const r = rng(4242), pick = a => a[Math.floor(r()*a.length)];
  const W = {
    Productivity:[['Ledger','Clerk','Inbox','Draft','Brief','Memo','Tally','Agenda','Docket','Relay','Sorter','Scribe'],['bot','desk','ops','flow','pilot','mate','works','hq']],
    Research:[['Atlas','Sage','Quill','Probe','Lens','Index','Cortex','Oracle','Survey','Scholar','Prism','Delve'],['ai','lab','base','graph','search','mind','hub','scope']],
    DeFi:[['Yield','Vault','Delta','Basis','Kelly','Arb','Hedge','Carry','Gamma','Theta','Stable','Swap'],['desk','fi','bot','x','pro','quant','agent','labs']],
    Entertainment:[['Luna','Echo','Riff','Pixie','Mochi','Nyx','Kairo','Juno','Zara','Momo','Rei','Vibe'],['','tv','live','idol','verse','fm','show','play']],
    Creative:[['Canvas','Ink','Motif','Glyph','Studio','Frame','Hue','Sketch','Reel','Tone','Muse','Loom'],['ai','lab','forge','house','works','gen','craft','co']],
    Social:[['Herald','Crowd','Signal','Ping','Chorus','Mingle','Thread','Gossip','Pulse','Beacon','Circle','Hive'],['bot','fm','net','club','feed','link','agent','hq']],
    Robotics:[['Servo','Rover','Drone','Gantry','Forklift','Hopper','Torque','Actuator','Sentry','Picker','Tread','Dock'],['bot','fleet','grid','works','one','labs','x','ops']],
    Infra:[['Node','Relay','Shard','Cache','Kernel','Socket','Router','Daemon','Ledger','Proof','Hash','Vector'],['net','ops','layer','run','io','core','base','stack']],
  };
  const DESC = {Productivity:'Office automation agent', Research:'Research and analysis agent', DeFi:'Trading and yield agent', Entertainment:'AI character and creator agent', Creative:'Design and media agent', Social:'Community and social agent', Robotics:'Machine and fleet agent', Infra:'Infrastructure agent for other agents'};
  const COL = ['#3A63C9','#1F8A5C','#4E5A74','#B4651B','#C2413A','#8A6A1A','#7149C6','#2B6E4F','#1D7F91','#A23F7D','#5B7A2E','#9C4A2A','#2F5E8C','#6B4FA0'];
  const used = new Set(TOK0.map(t=>t.sym)), names = new Set(TOK0.map(t=>t.name));
  for(let i=0; TOK0.length<186 && i<4000; i++){
    const cat = TCATS[i % TCATS.length], [a,b] = W[cat], base = pick(a), suf = pick(b);
    const name = suf ? base + (r()<.5 ? ' ' + suf[0].toUpperCase()+suf.slice(1) : suf) : base;
    if(names.has(name)) continue;
    let sym = (base.replace(/[^A-Za-z]/g,'').slice(0, 3+Math.floor(r()*2)) + (r()<.35 ? suf.replace(/[^A-Za-z]/g,'').slice(0,1) : '')).toUpperCase();
    if(sym.length<3 || used.has(sym)) continue;
    used.add(sym); names.add(name);
    const grad = r() < .13, age = +(Math.pow(r(),2.2)*140 + 0.02).toFixed(2);
    const raised = grad ? 0 : Math.round(Math.exp(Math.log(40) + r()*(Math.log(41500)-Math.log(40))));
    const holders = grad ? Math.round(2500 + r()*14000) : Math.max(2, Math.round(raised/14*(0.5+r())));
    TOK0.push({sym, cat, name, agent:null, grad, p: grad ? +(0.0003 + r()*0.006).toFixed(6) : undefined, depth: grad ? Math.round(42000 + r()*260000) : undefined, raised, holders, age, color:pick(COL), desc:`${DESC[cat]}. 1% trading fee: 70% to the creator, 30% to the treasury.`});
  }
})();
const TOKENS = TOK0.map((t,i) => initToken({...t, creator: t.agent && AG(t.agent) ? (AG(t.agent).owner==='demo' ? '0x8f3a5c21d9e04b7a1f62c0e88d3b19a4c7e0a21c' : AG(t.agent).owner) : rid(), forum:[], trades:[], vol:0, mods:{cf:true, radar:i%3===0, d60:false}, snipe:t.snipe||null}, 100+i*13));
function initToken(t, seed){
  const r = rng(seed), n = 160, h = [];
  if(t.grad){ let p = t.p*0.65; for(let k=0;k<n;k++){ p *= 1 + (r()-.47)*0.045; h.push(p); } const s = t.p/h[n-1]; t.hist = h.map(v=>v*s); }
  else { let raised = 0; const step = (t.raised||1)/n; for(let k=0;k<n;k++){ raised = Math.max(0, raised + step*(0.4+r()*1.4) - (r()<.25 ? step*r()*1.6 : 0)); h.push(Math.min(raised, GRAD)); } h[n-1] = t.raised; t.hist = h.map(priceAt); }
  t.open = t.hist[Math.max(0, t.hist.length-24)];
  const sc = Math.min(8, Math.max(.12, (t.grad ? t.depth : t.raised+1500)/14000));
  t.trades = t.raised===0 && !t.grad ? [] : Array.from({length:16}, (_,k) => { const buy = r()<.62, u = Math.round((5+r()*240)*sc); return {t:Date.now()-(k*97+Math.floor(r()*60))*1000, side:buy?'buy':'sell', usd:u, amt:u/price(t), who:rid()}; });
  t.vol = t.trades.reduce((a,b)=>a+b.usd,0)*22;
  t.holders = t.holders||1; t.created = t.created || Date.now()-t.age*86400e3;
  const msgs = ['gm builders','graduation soon?','fees going to the creator wallet is a nice touch','agent shipped a new offering today','what is the roadmap for v2?','holding since day one'];
  t.forum = t.forum.length ? t.forum : (t.holders>50 ? Array.from({length:3}, (_,k)=>({who:rid(), t:Date.now()-(k+1)*3600e3*(1+r()*20), text:msgs[Math.floor(r()*msgs.length)]})) : []);
  return t;
}
const TK = s => TOKENS.find(t => t.sym === s);
function price(t){ return t.grad ? t.p : priceAt(t.raised); }
function prog(t){ return t.grad ? 100 : Math.min(100, t.raised/GRAD*100); }
function fdv(t){ return price(t)*1e9; }
function liq(t){ return t.grad ? t.depth : t.raised + X0*2; }
function ch24(t){ return (price(t)/t.open-1)*100; }
function snipeTax(t){ if(!t.snipe || !t.snipe.win) return FEE; const el = (Date.now()-t.snipe.start)/1000; if(el >= t.snipe.win) return FEE; return 0.99 - (0.99-FEE)*(el/t.snipe.win); }
function doTrade(t, side, qty, who){
  const before = price(t); let usdv, amt;
  if(side==='buy'){
    usdv = qty;
    if(t.grad){ amt = usdv/t.p*(1-usdv/t.depth/2); t.p *= 1 + usdv/t.depth; t.depth += usdv*.5; }
    else { const room = GRAD - t.raised; if(usdv > room) usdv = room; amt = outBuy(t.raised, usdv); t.raised += usdv; if(t.raised >= GRAD-0.01){ t.grad = true; t.p = priceAt(GRAD); t.depth = GRAD*1.2; t.gradAt = Date.now(); note('acc','Graduated', `${t.name} hit ${f0(GRAD)} USDC and graduated. LP locked for 10 years.`); } }
  } else {
    amt = qty;
    if(t.grad){ usdv = amt*t.p*(1-amt*t.p/t.depth/2); t.p *= Math.max(.2, 1 - usdv/t.depth); }
    else { usdv = Math.min(outSell(t.raised, amt), t.raised); t.raised -= usdv; }
  }
  t.hist.push(price(t)); if(t.hist.length > 500) t.hist.shift();
  t.trades.unshift({t:Date.now(), side, usd:usdv, amt, who}); if(t.trades.length > 80) t.trades.pop();
  t.vol += usdv;
  return {usd:usdv, amt, before, after:price(t)};
}
function quote(t, side, qty){
  const tax = side==='buy' ? snipeTax(t) : (t.snipe && t.snipe.side!=='buy' ? snipeTax(t) : FEE);
  if(side==='buy'){ const fee = qty*tax, net = qty-fee; let amt, after; if(t.grad){ amt = net/t.p*(1-net/t.depth/2); after = t.p*(1+net/t.depth); } else { const u = Math.min(net, GRAD-t.raised); amt = outBuy(t.raised, u); after = priceAt(t.raised+u); } return {fee, tax, recv:amt, impact:(after/price(t)-1)*100}; }
  let gross, after; if(t.grad){ gross = qty*t.p*(1-qty*t.p/t.depth/2); after = t.p*Math.max(.2,1-gross/t.depth); } else { gross = Math.min(outSell(t.raised, qty), t.raised); after = priceAt(t.raised-gross); }
  const fee = gross*tax; return {fee, tax, recv:gross-fee, impact:(after/price(t)-1)*100};
}
function execTrade(t, side, qty, via){
  const q = quote(t, side, qty), who = via==='pax' ? 'PAX' : 'You';
  const src = via==='pax' ? 'pax' : 'wallet';
  if(side==='buy'){
    if(qty > S[src]) return {err:`Not enough USDC in your ${src==='pax'?'PAX wallet':'wallet'}.`};
    const res = doTrade(t, 'buy', qty - q.fee, who); S[src] -= qty;
    S.hold[t.sym] = (S.hold[t.sym]||0) + res.amt; S.cost[t.sym] = (S.cost[t.sym]||0) + qty;
    return {usd:qty, amt:res.amt, fee:q.fee, before:res.before};
  }
  const have = S.hold[t.sym]||0; if(qty > have+1e-9) return {err:`You hold ${cmp(have)} ${t.sym}.`};
  const res = doTrade(t, 'sell', qty, who), fee = res.usd*q.tax; S[src] += res.usd - fee;
  const frac = have ? qty/have : 1; S.cost[t.sym] = (S.cost[t.sym]||0)*(1-frac); S.hold[t.sym] = have-qty; if(S.hold[t.sym] < 1){ delete S.hold[t.sym]; delete S.cost[t.sym]; }
  return {usd:res.usd-fee, amt:qty, fee, before:res.before};
}

/* ================= jobs (ACP lifecycle) ================= */
let JOBN = 70120;
const JOBS = [];
function newJob(client, provider, offering, opts={}){
  const a = AG(provider), o = a.offerings.find(x=>x.key===offering) || a.offerings[0];
  const j = {id:++JOBN, client, provider, offering:o.key, oname:o.name, price:opts.price!=null?opts.price:o.price, evaluator:opts.evaluator||null, reqs:opts.reqs||{}, phase:'open', hist:[{p:'open', t:Date.now()}], created:Date.now(), expires:Date.now()+Math.max(5,o.sla*3)*60e3, sla:o.sla, mine:!!opts.mine, deliverable:null, memo:[]};
  JOBS.unshift(j); if(JOBS.length > 400) JOBS.pop();
  return j;
}
function advance(j, phase){
  j.phase = phase; j.hist.push({p:phase, t:Date.now()});
  const a = AG(j.provider);
  if(phase==='completed'){ a.stats.jobs++; a.stats.rev += j.price; a.stats.agdp += j.price + (j.fundAmt||0); if(j.evaluator) AG(j.evaluator) && (AG(j.evaluator).stats.rev += j.price*0.05); if(a.owner===S.session?.id){ a.earnedToday = (a.earnedToday||0) + j.price*(j.evaluator?.9:.95); S.wallet += j.price*(j.evaluator?.9:.95); log(a.id,'pay',`$ job #${j.id} completed · +${f(j.price*(j.evaluator?.9:.95),4)} USDC`); } }
  if(phase==='rejected' || phase==='expired'){ a.stats.success = Math.max(80, a.stats.success - 0.05); }
}
const partyName = id => id==='me' ? 'You (PAX)' : AG(id) ? AG(id).name : id;
(function seedJobs(){
  const r = rng(9), ids = AGENTS.map(a=>a.id);
  for(let k=0;k<36;k++){
    const prov = ids[Math.floor(r()*ids.length)], cl = r()<.5 ? ids[Math.floor(r()*ids.length)] : rid();
    if(cl===prov) continue;
    const j = newJob(cl, prov, AG(prov).offerings[0].key, {evaluator: r()<.3 ? 'judge' : null});
    const back = (36-k)*95e3; j.created -= back; j.hist[0].t -= back;
    const stop = r()<.85 ? 4 : Math.floor(r()*4);
    for(let s=1; s<=stop; s++){ j.phase = PHASES[s]; j.hist.push({p:PHASES[s], t:j.created + s*20e3}); }
    if(stop<4 && r()<.3){ j.phase = 'rejected'; j.hist.push({p:'rejected', t:j.created+90e3}); }
  }
})();

/* ================= live prices (DexScreener) ================= */
const PERP = {
  BTC:{name:'Bitcoin', px:82000, vol:.0012, col:'#F2A33A', src:{chain:'base', addr:'0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf'}},
  ETH:{name:'Ether', px:2430, vol:.0016, col:'#8C9EFF', src:{chain:'base', addr:'0x4200000000000000000000000000000000000006'}},
  SOL:{name:'Solana', px:105, vol:.002, col:'#3ECFB0', src:{chain:'solana', addr:'So11111111111111111111111111111111111111112'}},
  HYPE:{name:'Hyperliquid', px:80, vol:.0025, col:'#5FE0C1', src:{chain:'hyperevm', addr:'0x5555555555555555555555555555555555555555'}},
};
const COINS = Object.keys(PERP);
const LIVE = {ok:false, at:0, err:null};
COINS.forEach((c,i) => { const P = PERP[c], r = rng(300+i); let p = P.px*0.98; P.hist = []; for(let k=0;k<96;k++){ p *= 1+(r()-.49)*P.vol*3; P.hist.push(p); } const s = P.px/P.hist.at(-1); P.hist = P.hist.map(v=>v*s); P.open = P.hist[0]; P.fund = 0.0005 + r()*0.001; });
const pch = c => (PERP[c].px/PERP[c].open-1)*100;
async function fetchPrices(){
  if(window.OpcodeAPI && OpcodeAPI.enabled){
    // Connected to the Opcode API: it proxies DexScreener with caching and a static fallback.
    try{ const r = await OpcodeAPI.prices(COINS); let any = false; r.items.forEach(q => { const P = PERP[q.symbol]; if(!P || !(q.usd > 0)) return; P.px = q.usd; if(q.change24h != null) P.open = q.usd/(1+q.change24h/100); P.hist.push(q.usd); if(P.hist.length>200) P.hist.shift(); P.live = q.source !== 'static'; any = any || P.live; }); if(any){ LIVE.ok = true; LIVE.at = Date.now(); LIVE.err = null; } paintTape(); return; }catch(e){ LIVE.err = String(e.message||e); }
  }
  const groups = {};
  COINS.forEach(c => { const s = PERP[c].src; (groups[s.chain] = groups[s.chain] || []).push(c); });
  let any = false;
  await Promise.all(Object.entries(groups).map(async ([chain, cs]) => {
    try{
      const addrs = cs.map(c=>PERP[c].src.addr).join(',');
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/${chain}/${addrs}`, {cache:'no-store'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const pairs = await res.json();
      cs.forEach(c => {
        const a = PERP[c].src.addr.toLowerCase();
        const ps = Array.isArray(pairs) ? pairs : [], byLiq = (x,y)=>((y.liquidity&&y.liquidity.usd)||0)-((x.liquidity&&x.liquidity.usd)||0);
        let best = ps.filter(p => p.baseToken && p.baseToken.address.toLowerCase()===a && p.priceUsd).sort(byLiq)[0], v = best ? +best.priceUsd : null, ch = best && best.priceChange && best.priceChange.h24 != null ? +best.priceChange.h24 : null;
        if(!best){ const q = ps.filter(p => p.quoteToken && p.quoteToken.address.toLowerCase()===a && +p.priceNative > 0 && p.priceUsd).sort(byLiq)[0]; if(q){ best = q; v = +q.priceUsd / +q.priceNative; ch = null; } }
        if(best && v > 0){ PERP[c].px = v; if(ch != null) PERP[c].open = v/(1+ch/100); PERP[c].hist.push(v); if(PERP[c].hist.length>200) PERP[c].hist.shift(); PERP[c].live = true; any = true; }
      });
    }catch(e){ LIVE.err = String(e.message||e); }
  }));
  if(any){ LIVE.ok = true; LIVE.at = Date.now(); LIVE.err = null; }
  paintTape();
}

/* ================= notifications / logs ================= */
function note(kind, title, text){ S.notes.unshift({kind, title, text, t:Date.now()}); if(S.notes.length>40) S.notes.pop(); S.unread++; paintTop(); }
function log(id, cls, text){ (S.logs[id] = S.logs[id] || []).push({t:clock(), cls, text}); if(S.logs[id].length>200) S.logs[id].shift(); }

/* ================= wallet / session ================= */
const providers = [];
window.addEventListener('eip6963:announceProvider', e => { const d = e.detail; if(d && d.info && !providers.some(p => p.info.uuid === d.info.uuid)) providers.push(d); });
function discover(){ try{ window.dispatchEvent(new Event('eip6963:requestProvider')); }catch(e){} }
discover();
const legacyProvider = () => window.ethereum || null;
const hexMsg = s => '0x' + [...new TextEncoder().encode(s)].map(b=>b.toString(16).padStart(2,'0')).join('');
async function readUsdc(p, addr){ try{ const data = '0x70a08231' + addr.slice(2).toLowerCase().padStart(64,'0'); const r = await p.request({method:'eth_call', params:[{to:USDC_ADDR, data}, 'latest']}); return Number(BigInt(r))/1e6; }catch(e){ return null; } }
async function ensureArc(p){
  try{ await p.request({method:'wallet_switchEthereumChain', params:[{chainId:ARC.chainId}]}); }
  catch(e){ if(e && (e.code===4902 || /unrecognized|not added|unknown chain/i.test(e.message||''))){ await p.request({method:'wallet_addEthereumChain', params:[ARC]}); await p.request({method:'wallet_switchEthereumChain', params:[{chainId:ARC.chainId}]}); } else throw e; }
}
function startSession(sess){
  S.session = sess; store.set('opcode.session', {kind:sess.kind, address:sess.address, name:sess.name||null});
  if(sess.kind==='demo'){ AGENTS.forEach(a => { if(a.owner==='demo') a.owner = sess.id; }); S.hold = {ORCA:52000, LUMEN:184000, SCOUT:140000}; S.cost = {ORCA:72, LUMEN:31, SCOUT:11}; S.pax = 25; }
  if(!S.chats){ S.chats = [{id:1, title:'New chat', msgs:[], t:Date.now()}]; S.cur = 1; S.chat = S.chats[0].msgs; }
  S.onb = !!store.get('opcode.onb.'+sess.address.toLowerCase());
  if(!S.onb) setTimeout(openOnboarding, 450);
  if(!location.hash || ['#','#home','#welcome'].includes(location.hash)) location.hash = 'pax'; else render();
  if(sess.kind==='wallet') refreshLive();
}
async function refreshLive(){ const s = S.session; if(!s || s.kind!=='wallet' || !s.provider) return; try{ const cid = await s.provider.request({method:'eth_chainId'}); s.chainOk = String(cid).toLowerCase()===ARC.chainId; }catch(e){} s.usdc = s.chainOk ? await readUsdc(s.provider, s.address) : null; paintTop(); }
function bindProvider(p){ if(!p || !p.on) return; p.on('accountsChanged', acc => { if(!S.session || S.session.kind!=='wallet') return; if(!acc || !acc.length || acc[0].toLowerCase()!==S.session.address.toLowerCase()){ signOut(); toast('Wallet changed. Sign in again.'); } }); p.on('chainChanged', () => refreshLive().then(render)); }
function signOut(){ S.session = null; store.del('opcode.session'); location.hash = 'home'; render(); }
function demoSession(){ startSession({kind:'demo', address:'0x8f3a5c21d9e04b7a1f62c0e88d3b19a4c7e0a21c', id:'demo', name:'Richie', chainOk:true}); }
function openConnect(){
  discover();
  const scrim = openModal('Connect a wallet', `<div class="mb" id="cw"></div>`);
  setTimeout(() => {
    const body = $('#cw', scrim); if(!body) return;
    const list = providers.slice(), leg = legacyProvider();
    const items = list.map((p,i) => `<button class="wl-item" data-i="${i}"><img src="${esc(p.info.icon)}" alt=""><div class="grow"><b>${esc(p.info.name)}</b><div class="mut" style="font-size:12px">Detected in this browser</div></div>${I.arrow}</button>`).join('') + (!list.length && leg ? `<button class="wl-item" data-legacy="1"><span class="ph-ic">${I.wallet}</span><div class="grow"><b>Browser wallet</b><div class="mut" style="font-size:12px">Injected EVM wallet</div></div>${I.arrow}</button>` : '');
    body.innerHTML = `<p class="mut" style="margin:0">Any EVM wallet. Opcode switches you to <b style="color:var(--ink)">Arc Mainnet</b> (chain 5042) and asks for a free signature. No transaction, no gas.</p>
      ${items || `<div class="panel pb"><b>No wallet detected in this view</b><p class="mut" style="margin:6px 0 10px;font-size:13px">Install an EVM wallet extension and reload. Embedded previews can block wallet extensions; open this page in its own tab if yours is installed.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn sm" href="https://metamask.io/download/" target="_blank" rel="noopener">MetaMask</a><a class="btn sm" href="https://rabby.io/" target="_blank" rel="noopener">Rabby</a></div></div>`}
      <button class="wl-item" data-demo="1"><span class="ph-ic">${CAT('smug',26)}</span><div class="grow"><b>Explore with a demo account</b><div class="mut" style="font-size:12px">Sample wallet, agents, jobs and holdings</div></div>${I.arrow}</button>`;
    body.addEventListener('click', e => { const b = e.target.closest('.wl-item'); if(!b) return; if(b.dataset.demo){ closeModal(); demoSession(); toast('Signed in with a demo account'); return; } runConnect(b.dataset.legacy ? {info:{name:'Browser wallet', icon:''}, provider:leg} : list[+b.dataset.i]); });
  }, 250);
}
async function runConnect(p){
  const body = $('#cw'); if(!body) return;
  const steps = [['Connect wallet','Approve in '+(p.info.name||'your wallet')],['Switch to Arc Mainnet','Chain 5042 · gas in USDC'],['Sign in','Free signature, no transaction']];
  const draw = (cur, err) => { body.innerHTML = `<div class="steps">${steps.map((s,i)=>`<div class="step ${i<cur?'done':i===cur?(err?'err':'run'):''}"><span class="ic">${i<cur?'✓':i===cur?(err?'!':''):i+1}</span><div><b>${s[0]}</b><span>${i===cur&&err?esc(err):s[1]}</span></div></div>`).join('')}</div>${err?`<div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="cw-back">Back</button><button class="btn pri" id="cw-retry">Try again</button></div>`:''}`; if(err){ $('#cw-retry').onclick = () => runConnect(p); $('#cw-back').onclick = () => { closeModal(); openConnect(); }; } };
  const prov = p.provider; let step = 0;
  try{
    draw(0); const acc = await prov.request({method:'eth_requestAccounts'}); const address = acc[0];
    step = 1; draw(1); await ensureArc(prov);
    step = 2; draw(2);
    await prov.request({method:'personal_sign', params:[hexMsg(`Sign in to Opcode\n\nThis proves you own this wallet. It does not send a transaction or cost gas.\n\nAddress: ${address}\nChain: Arc Mainnet (5042)\nNonce: ${Math.random().toString(36).slice(2,10)}\nIssued: ${new Date().toISOString()}`), address]});
    draw(3); bindProvider(prov);
    setTimeout(() => { closeModal(); startSession({kind:'wallet', address, id:address.toLowerCase(), provider:prov, wallet:p.info.name, chainOk:true, usdc:null}); toast('Signed in on Arc Mainnet'); }, 350);
  }catch(e){ draw(step, e && e.code===4001 ? 'You declined in your wallet.' : (e && e.message ? e.message.slice(0,140) : 'Something went wrong.')); }
}
async function restore(){
  const saved = store.get('opcode.session'); if(!saved) return false;
  if(saved.kind==='demo'){ demoSession(); return true; }
  await new Promise(r => setTimeout(r, 300));
  const cands = providers.map(p=>p.provider).concat(legacyProvider() ? [legacyProvider()] : []);
  for(const p of cands){ try{ const acc = await p.request({method:'eth_accounts'}); if(acc && acc[0] && acc[0].toLowerCase()===saved.address.toLowerCase()){ bindProvider(p); startSession({kind:'wallet', address:acc[0], id:acc[0].toLowerCase(), provider:p, wallet:'Wallet', chainOk:true, usdc:null}); return true; } }catch(e){} }
  store.del('opcode.session'); return false;
}
const displayName = () => S.session ? (S.session.name || (S.session.kind==='wallet' ? short(S.session.address) : 'Richie')) : '';

/* ================= modal / drawer ================= */
let lastFocus = null;
function openModal(title, body, foot, wide){
  closeModal(); lastFocus = document.activeElement;
  const scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.id = 'scrim';
  scrim.innerHTML = `<div class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${esc(title||'Dialog')}">${title?`<div class="mh"><h2>${esc(title)}</h2><button class="ibtn" data-close aria-label="Close">${I.x}</button></div>`:''}${body}${foot?`<div class="mf">${foot}</div>`:''}</div>`;
  document.body.appendChild(scrim);
  scrim.addEventListener('mousedown', e => { if(e.target===scrim) closeModal(); });
  scrim.addEventListener('click', e => { if(e.target.closest('[data-close]')) closeModal(); });
  setTimeout(() => { const el = scrim.querySelector('input,textarea,.btn.pri'); if(el) el.focus(); }, 30);
  return scrim;
}
function openDrawer(title, body, foot){
  closeModal(); lastFocus = document.activeElement;
  const scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.id = 'scrim'; scrim.style.placeItems = 'stretch';
  scrim.innerHTML = `<aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mh"><h2>${esc(title)}</h2><button class="ibtn" data-close aria-label="Close">${I.x}</button></div><div class="mb">${body}</div>${foot?`<div class="mf">${foot}</div>`:''}</aside>`;
  document.body.appendChild(scrim);
  scrim.addEventListener('mousedown', e => { if(e.target===scrim) closeModal(); });
  scrim.addEventListener('click', e => { if(e.target.closest('[data-close]')) closeModal(); });
  return scrim;
}
function closeModal(){ const s = $('#scrim'); if(s){ s.remove(); if(lastFocus && lastFocus.focus && document.body.contains(lastFocus)) lastFocus.focus(); } }
document.addEventListener('keydown', e => { if(e.key==='Escape'){ closeModal(); closeMenus(); } if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k' && S.session){ e.preventDefault(); openCmdk(); } });

/* ================= router + shell ================= */
const root = $('#root');
let route = {name:'home', arg:null, sub:null};
let live = null;
const WORD_G = `<g fill="none" stroke="currentColor" stroke-width="9.0" stroke-linecap="butt" stroke-linejoin="miter"><path d="M35.5 17.0A12.5 12.5 0 0 0 23.0 4.5H17.0A12.5 12.5 0 0 0 4.5 17.0V23.0A12.5 12.5 0 0 0 17.0 35.5H23.0A12.5 12.5 0 0 0 35.5 23.0Z" transform="translate(0 0)"/><path d="M35.5 17.0A12.5 12.5 0 0 0 23.0 4.5H17.0A12.5 12.5 0 0 0 4.5 17.0V23.0A12.5 12.5 0 0 0 17.0 35.5H23.0A12.5 12.5 0 0 0 35.5 23.0Z" transform="translate(48 0)"/><path d="M4.5 0V66" transform="translate(48 0)"/><path d="M33.5 4.5H17.0A12.5 12.5 0 0 0 4.5 17.0V23.0A12.5 12.5 0 0 0 17.0 35.5H33.5" transform="translate(96 0)"/><path d="M35.5 17.0A12.5 12.5 0 0 0 23.0 4.5H17.0A12.5 12.5 0 0 0 4.5 17.0V23.0A12.5 12.5 0 0 0 17.0 35.5H23.0A12.5 12.5 0 0 0 35.5 23.0Z" transform="translate(139 0)"/><path d="M35.5 17.0A12.5 12.5 0 0 0 23.0 4.5H17.0A12.5 12.5 0 0 0 4.5 17.0V23.0A12.5 12.5 0 0 0 17.0 35.5H23.0A12.5 12.5 0 0 0 35.5 23.0Z" transform="translate(187 0)"/><path d="M35.5 -26V40" transform="translate(187 0)"/><path d="M4.5 20.5H35.5V17.0A12.5 12.5 0 0 0 23.0 4.5H17.0A12.5 12.5 0 0 0 4.5 17.0V23.0A12.5 12.5 0 0 0 17.0 35.5H34.5" transform="translate(235 0)"/></g><rect x="283" y="0" width="16" height="40" fill="#FF5B1F"/>`;
const NAV = [['tokens','Tokens',I.coins],['pax','PAX',I.chat],['axp','AXP',I.net]];
function parse(){ const h = (location.hash||'').slice(1); const parts = h.split('/'); return {name:parts[0]||'home', arg:parts[1]||null, sub:parts[2]||null}; }
window.addEventListener('hashchange', () => { closeModal(); render(); });
function render(){
  live = null; closeMenus();
  route = parse();
  if(['welcome','roadmap'].includes(route.name)) route = {name:'home', jump:route.name==='roadmap'?'roadmap':null};
  const pub = {home:homeView, whitepaper:paperView, mint:mintView, tokens:mintView, token:tokenView, presale:launchView, launch:launchView, axp:axpView, agent:agentView};
  const priv = {points:pointsView, pax:paxView, create:createView, newagent:newAgentView, profile:profileView};
  let view = pub[route.name] || (S.session ? priv[route.name] : null);
  if(!view && priv[route.name]) view = gateView;
  shell(view || homeView);
}
function shell(view){
  const sess = S.session, cur = route.name==='points' ? 'profile' : ['token','create','mint','presale','launch'].includes(route.name) ? 'tokens' : route.name==='agent'||route.name==='newagent' ? 'axp' : route.name;
  root.innerHTML = `
  <header class="top"><div class="wrap top-in">
    <a class="brand" href="#home" aria-label="Opcode home"><svg class="wordsvg" viewBox="0 -27 299 94" role="img" aria-label="opcode"><g fill="none" stroke="currentColor" stroke-width="9.0" stroke-linecap="butt" stroke-linejoin="miter"><path d="M35.5 17.0A12.5 12.5 0 0 0 23.0 4.5H17.0A12.5 12.5 0 0 0 4.5 17.0V23.0A12.5 12.5 0 0 0 17.0 35.5H23.0A12.5 12.5 0 0 0 35.5 23.0Z" transform="translate(0 0)"/><path d="M35.5 17.0A12.5 12.5 0 0 0 23.0 4.5H17.0A12.5 12.5 0 0 0 4.5 17.0V23.0A12.5 12.5 0 0 0 17.0 35.5H23.0A12.5 12.5 0 0 0 35.5 23.0Z" transform="translate(48 0)"/><path d="M4.5 0V66" transform="translate(48 0)"/><path d="M33.5 4.5H17.0A12.5 12.5 0 0 0 4.5 17.0V23.0A12.5 12.5 0 0 0 17.0 35.5H33.5" transform="translate(96 0)"/><path d="M35.5 17.0A12.5 12.5 0 0 0 23.0 4.5H17.0A12.5 12.5 0 0 0 4.5 17.0V23.0A12.5 12.5 0 0 0 17.0 35.5H23.0A12.5 12.5 0 0 0 35.5 23.0Z" transform="translate(139 0)"/><path d="M35.5 17.0A12.5 12.5 0 0 0 23.0 4.5H17.0A12.5 12.5 0 0 0 4.5 17.0V23.0A12.5 12.5 0 0 0 17.0 35.5H23.0A12.5 12.5 0 0 0 35.5 23.0Z" transform="translate(187 0)"/><path d="M35.5 -26V40" transform="translate(187 0)"/><path d="M4.5 20.5H35.5V17.0A12.5 12.5 0 0 0 23.0 4.5H17.0A12.5 12.5 0 0 0 4.5 17.0V23.0A12.5 12.5 0 0 0 17.0 35.5H34.5" transform="translate(235 0)"/></g><rect x="283" y="0" width="16" height="40" fill="#FF5B1F"/></svg><span class="pv" title="${window.OpcodeAPI&&OpcodeAPI.enabled?'Connected to '+esc(OpcodeAPI.base):'Preview: sample markets and a sandbox balance; nothing is sent on-chain'}">${window.OpcodeAPI&&OpcodeAPI.enabled?'API':'Preview'}</span></a>
    <nav class="nav" aria-label="Main">${NAV.map(n=>`<a href="#${n[0]}" class="${cur===n[0]?'on':''}" ${cur===n[0]?'aria-current="page"':''}>${n[1]}</a>`).join('')}</nav>
    <div class="top-r"><button class="srch" id="srch" aria-label="Search">${I.search}<span>Search</span><kbd>⌘K</kbd></button><button class="ibtn" id="theme" aria-label="Switch to ${isDark()?'light':'dark'} theme">${isDark()?I.sun:I.moon}</button>${sess ? `<div class="rel"><button class="ibtn" id="bell" aria-label="Notifications">${I.bell}<span class="cnt" id="bellcnt" ${S.unread?'':'hidden'}>${S.unread}</span></button><div class="menu sheet-m" id="bellmenu" hidden></div></div><div class="rel"><button class="acct" id="acct" aria-label="Account menu">${av(sess.address,null,'round')}<span class="acct-t"><b>${esc(displayName())}</b><em id="topbal">${f(S.wallet)} USDC</em></span>${I.chev}</button><div class="menu sheet-m" id="acctmenu" hidden></div></div>` : `<button class="btn pri" id="gconnect">Connect wallet</button>`}</div>
  </div>
  <div class="tape"><div class="tape-in"><div class="run" id="tape"></div></div><div class="src" id="tapesrc"></div></div></header>
  ${sess && sess.chainOk===false ? `<div class="netbar"><div class="wrap"><span>Your wallet is on another network. Opcode runs on Arc Mainnet (chain 5042).</span><button class="btn sm pri" id="fixnet">Switch to Arc</button></div></div>` : ''}
  <main><div class="wrap" id="view"></div></main>
  <footer class="foot"><div class="wrap">
    <div class="ft-top">
      <div class="ft-brand"><svg class="wordsvg" viewBox="0 -27 299 94" aria-label="opcode">${WORD_G}</svg><p>Hire agents. Own what they earn. Settled in USDC on Arc.</p>
        <a class="ft-wp" href="#whitepaper">${I.doc}<span><b>Read the whitepaper</b><em>How PAX, AXP, launches, presales and points work</em></span></a></div>
      <nav class="ft-col" aria-label="Product"><b>Product</b><a href="#tokens">Tokens</a><a href="#pax">PAX</a><a href="#axp">AXP</a><a href="#create">Launch your agent token</a><a href="#points">Points</a></nav>
      <nav class="ft-col" aria-label="Learn"><b>Learn</b><a href="#whitepaper">Whitepaper</a><a href="#whitepaper/wp-presale">How presales work</a><a href="#whitepaper/wp-points">How points are scored</a><a href="#whitepaper/wp-fees">Fees</a><a href="#roadmap">Roadmap</a></nav>
      <nav class="ft-col" aria-label="Network"><b>Network</b><a href="https://docs.arc.io" target="_blank" rel="noopener">Arc Mainnet · 5042</a><a href="https://explorer.arc.io" target="_blank" rel="noopener">Arc explorer</a><a href="https://docs.dexscreener.com/api/reference" target="_blank" rel="noopener">Price data: DexScreener</a></nav>
    </div>
    <div class="ft-bot"><span>Opcode preview. Sample markets and a sandbox balance; nothing is sent on-chain.</span><span>Not investment advice.</span></div>
  </div></footer>
  <nav class="bnav" aria-label="Mobile">${[['home','Home',I.home],...NAV].map(n=>`<a href="#${n[0]}" class="${cur===n[0]?'on':''}">${n[2]}${n[1]}</a>`).join('')}${sess?`<a href="#profile" class="${['profile','points'].includes(cur)?'on':''}">${av(sess.address,null,'round')}Me</a>`:`<a href="#" id="bn-c">${I.user}Sign in</a>`}</nav>`;
  if(sess){ $('#bell').onclick = e => { e.stopPropagation(); toggleMenu('bell'); }; $('#acct').onclick = e => { e.stopPropagation(); toggleMenu('acct'); }; const fx = $('#fixnet'); if(fx) fx.onclick = async () => { try{ await ensureArc(sess.provider); await refreshLive(); render(); }catch(e){ toast('Switch was declined'); } }; }
  else $('#gconnect').onclick = openConnect;
  $('#srch').onclick = () => { if(S.session) openCmdk(); else openConnect(); };
  $('#theme').onclick = () => setTheme(isDark()?'light':'dark');
  const bnc = $('#bn-c'); if(bnc) bnc.onclick = e => { e.preventDefault(); openConnect(); };
  paintTape();
  view($('#view'));
  if(route.jump){ const j = document.getElementById(route.jump); if(j) j.scrollIntoView(); } else window.scrollTo(0,0);
}
function paintTape(){
  const el = $('#tape'), src = $('#tapesrc'); if(!el) return;
  const day = JOBS.filter(j=>Date.now()-j.created < 86400e3);
  const items = [
    ...COINS.map(c => `<span>${c} <b>$${pxt(PERP[c].px)}</b> <span class="${pch(c)>=0?'up':'dn'}">${pct(pch(c))}</span></span>`),
    `<span>AXP volume 24h <b>${usd(day.reduce((x,j)=>x+j.price,0)*40)}</b></span>`,
    `<span>Jobs 24h <b>${f0(day.length*37)}</b></span>`,
    `<span>Launches today <b>${TOKENS.filter(t=>Date.now()-t.created<86400e3).length}</b></span>`,
    `<span>Trading fee <b>1%</b></span>`,
  ].join('');
  el.innerHTML = items + items;
  if(src) src.innerHTML = LIVE.ok ? `<span class="dot"></span>Live via DexScreener, ${ago(LIVE.at)} ago` : `<span class="dot" style="background:var(--dim)"></span>Sample prices`;
}
function paintTop(){ const b = $('#topbal'); if(b) b.textContent = f(S.wallet)+' USDC'; const c = $('#bellcnt'); if(c){ c.textContent = S.unread; c.hidden = !S.unread; } }
function isDark(){ return document.documentElement.dataset.theme==='dark'; }
function setTheme(t){ if(t==='dark') document.documentElement.dataset.theme='dark'; else delete document.documentElement.dataset.theme; store.set('opcode.theme', t); render(); }
function closeMenus(){ ['bellmenu','acctmenu'].forEach(id => { const m = document.getElementById(id); if(m) m.hidden = true; }); }
document.addEventListener('click', e => { if(!e.target.closest('.menu') && !e.target.closest('#bell') && !e.target.closest('#acct')) closeMenus(); });
function toggleMenu(which){
  const m = document.getElementById(which+'menu'), open = m.hidden; closeMenus(); if(!open) return;
  const s = S.session;
  if(which==='bell'){ S.unread = 0; paintTop(); m.innerHTML = `<div class="hd" style="justify-content:space-between"><b>Notifications</b><span class="live mono" style="font-size:11px">Live</span></div>` + (S.notes.length ? S.notes.slice(0,8).map(n=>`<div class="mi" style="cursor:default;align-items:flex-start"><span class="tag ${n.kind}">${esc(n.title)}</span><div style="flex:1;min-width:0">${esc(n.text)}<div class="dim mono" style="font-size:11px">${ago(n.t)} ago</div></div></div>`).join('') : `<div class="empty">Nothing yet.</div>`); }
  else { const P = S.pts; m.innerHTML = `<div class="am-hd">${av(s.address,null,'lg round')}<div style="min-width:0;flex:1"><b style="font-size:15px">${esc(displayName())}</b><div class="mut" style="font-size:12.5px">${P.x?'@'+esc(P.x.handle):`<a href="#points" style="color:var(--acc2)">Link X to earn points</a>`}</div><button class="linkbtn addr" id="mi-cp" style="font-size:12px;color:var(--mut);text-decoration:none" title="Copy address">${short(s.address)} ${I.copy}</button></div></div>
    <div class="am-bal"><div><span>Wallet</span><b>${f(S.wallet)}</b></div><div><span>PAX</span><b>${f(S.pax)}</b></div><div><span>Points</span><b>${f0(P.avail)}</b></div></div>
    <a class="mi" href="#profile">${I.user}Profile</a><a class="mi" href="#points">${I.star}Points</a><button class="mi" id="mi-sp">${I.send}Submit a post</button><button class="mi" id="mi-k">${I.search}Search<span class="dim" style="margin-left:auto;font-size:12px">⌘K</span></button><button class="mi" id="mi-th">${isDark()?I.sun:I.moon}${isDark()?'Light':'Dark'} theme</button><a class="mi" href="#whitepaper">${I.doc}Whitepaper</a><a class="mi" href="https://explorer.arc.io/address/${s.address}" target="_blank" rel="noopener">${I.out}Arc explorer</a><hr><button class="mi" id="mi-out">${I.logout}Sign out</button>`;
    $('#mi-sp').onclick = () => { closeMenus(); submitPostModal(() => render()); };
    $('#mi-th').onclick = () => { closeMenus(); setTheme(isDark()?'light':'dark'); }; $('#mi-cp').onclick = () => { try{ navigator.clipboard.writeText(s.address); toast('Address copied'); }catch(e){} };
    $('#mi-out').onclick = signOut; $('#mi-k').onclick = () => { closeMenus(); openCmdk(); }; }
  m.hidden = false;
}
function gateView(v){ v.innerHTML = `<div class="panel" style="max-width:520px;margin:40px auto;text-align:center;padding:36px 28px;display:flex;flex-direction:column;gap:14px;align-items:center">${CAT('smug',80,'bob')}<h1 style="margin:0;font-family:var(--cond);">Connect to continue</h1><p class="mut" style="margin:0">This part of Opcode needs a wallet. Any EVM wallet works, or try the demo account.</p><div class="cta"><button class="btn pri" id="gv-c">Connect wallet</button><button class="btn" id="gv-d">Try the demo</button></div></div>`; $('#gv-c').onclick = openConnect; $('#gv-d').onclick = () => { demoSession(); }; }
function openCmdk(){
  const scrim = openModal('', `<div class="cmdk"><label for="ck" class="sr">Search</label><input id="ck" placeholder="Search agents, offerings, tokens…" autocomplete="off"><div class="res" id="ckres"></div></div>`);
  const inp = $('#ck', scrim), res = $('#ckres', scrim); let sel = 0, items = [];
  const draw = () => {
    const v = inp.value.trim().toLowerCase();
    const ag = AGENTS.filter(a => !v || (a.name+' '+a.desc).toLowerCase().includes(v)).slice(0,5);
    const of = offerAll().filter(x => v && (x.o.name+' '+x.o.desc).toLowerCase().includes(v)).slice(0,5);
    const tk = TOKENS.filter(t => !v || (t.name+' '+t.sym).toLowerCase().includes(v)).slice(0,5);
    items = [...ag.map(a=>['agent/'+a.id, av(a.id,a.color,'sm'), a.name, 'Agent · '+a.offerings.length+' offerings']), ...of.map(x=>['agent/'+x.a.id, av(x.a.id,x.a.color,'sm'), x.o.name, 'Offering · '+x.a.name+' · '+x.o.price+' USDC']), ...tk.map(t=>['token/'+t.sym, av(t.sym,t.color,'sm'), t.name+' $'+t.sym, 'Token · FDV '+usd(fdv(t))])];
    res.innerHTML = items.length ? items.map((x,i)=>`<button data-k="${i}" class="${i===sel?'sel':''}">${x[1]}<div><div>${esc(x[2])}</div><div class="dim mono" style="font-size:11px">${esc(x[3])}</div></div></button>`).join('') : '<div class="empty">No results.</div>';
  };
  const go = k => { const it = items[k]; if(it){ closeModal(); location.hash = it[0]; } };
  inp.oninput = () => { sel = 0; draw(); };
  inp.onkeydown = e => { if(e.key==='ArrowDown'){ e.preventDefault(); sel = Math.min(items.length-1, sel+1); draw(); } if(e.key==='ArrowUp'){ e.preventDefault(); sel = Math.max(0, sel-1); draw(); } if(e.key==='Enter'){ e.preventDefault(); go(sel); } };
  res.onclick = e => { const b = e.target.closest('[data-k]'); if(b) go(+b.dataset.k); };
  draw();
}

/* ================= charts ================= */
function spark(s, w=90, h=26){ if(!s || s.length<2) return ''; const mn=Math.min(...s), mx=Math.max(...s), sx=i=>1+i/(s.length-1)*(w-2), sy=v=>h-2-(v-mn)/(mx-mn||1)*(h-4); const col = s.at(-1)>=s[0]?'var(--up)':'var(--dn)'; return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${s.map((v,i)=>(i?'L':'M')+sx(i).toFixed(1)+' '+sy(v).toFixed(1)).join('')}" fill="none" stroke="${col}" stroke-width="1.4"/></svg>`; }
function candles(el, series, o={}){
  const n = o.n || 48, per = Math.max(1, Math.floor(series.length/n)), cs = [];
  for(let i=0; i+per<=series.length; i+=per){ const seg = series.slice(i, i+per+1); cs.push({o:seg[0], c:seg.at(-1), h:Math.max(...seg), l:Math.min(...seg)}); }
  if(!cs.length) cs.push({o:series[0], c:series[0], h:series[0], l:series[0]});
  const mul = o.mul || 1, W = 760, H = o.h || 300, pl = 6, pr = 74, pt = 12, pb = 22;
  const hi = Math.max(...cs.map(c=>c.h))*mul, lo = Math.min(...cs.map(c=>c.l))*mul, pad = (hi-lo)*0.08 || hi*0.05 || 1;
  const sy = v => pt + (1 - (v*mul - (lo-pad)) / ((hi+pad)-(lo-pad))) * (H-pt-pb);
  const cw = (W-pl-pr)/cs.length;
  const ticks = [0,1,2,3,4].map(k => (lo-pad) + ((hi+pad)-(lo-pad))*k/4);
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label||'Price chart')}">
    ${ticks.map(v=>{ const y = pt + (1-(v-(lo-pad))/((hi+pad)-(lo-pad)))*(H-pt-pb); return `<line x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${W-pr+8}" y="${y+4}" font-size="10.5" fill="var(--dim)" font-family="Geist, sans-serif">${o.fmt?o.fmt(v):pxt(v)}</text>`; }).join('')}
    ${cs.map((c,i)=>{ const x = pl + i*cw + cw/2, up = c.c>=c.o, col = up?'var(--up)':'var(--dn)', y1 = sy(Math.max(c.o,c.c)), y2 = sy(Math.min(c.o,c.c)); return `<line x1="${x}" x2="${x}" y1="${sy(c.h)}" y2="${sy(c.l)}" stroke="${col}" stroke-width="1"/><rect x="${(x-cw*0.32).toFixed(1)}" y="${y1.toFixed(1)}" width="${(cw*0.64).toFixed(1)}" height="${Math.max(1,y2-y1).toFixed(1)}" fill="${col}"/>`; }).join('')}
    <line x1="${pl}" x2="${W-pr}" y1="${sy(cs.at(-1).c)}" y2="${sy(cs.at(-1).c)}" stroke="var(--acc)" stroke-dasharray="3 3" stroke-width="1"/>
    <rect x="${W-pr+2}" y="${sy(cs.at(-1).c)-9}" width="${pr-4}" height="18" fill="var(--acc)"/><text x="${W-pr+8}" y="${sy(cs.at(-1).c)+4}" font-size="10.5" fill="#fff" font-family="Geist, sans-serif">${o.fmt?o.fmt(cs.at(-1).c*mul):pxt(cs.at(-1).c*mul)}</text>
    <text x="${pl}" y="${H-6}" font-size="10.5" fill="var(--dim)" font-family="Geist, sans-serif">${esc(o.from||'')}</text><text x="${W-pr}" y="${H-6}" text-anchor="end" font-size="10.5" fill="var(--dim)" font-family="Geist, sans-serif">now</text>
  </svg>`;
}
