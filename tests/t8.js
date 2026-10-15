const {JSDOM, VirtualConsole} = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync(process.argv[2],'utf8');
const errs=[]; const vc = new VirtualConsole(); vc.on('jsdomError', e => { if(!/getContext|Not implemented/.test(e.message)) errs.push('jsdom: '+e.message); }); vc.on('error', e=>errs.push('console.error: '+e));
const dom = new JSDOM('<!doctype html><html><head></head><body>'+html+'</body></html>',{runScripts:'dangerously',pretendToBeVisual:true,url:'https://x.test/',virtualConsole:vc,beforeParse(w){ w.matchMedia=()=>({matches:false,addEventListener(){}}); w.Element.prototype.scrollIntoView=()=>{}; w.scrollTo=()=>{}; w.TextEncoder=require('util').TextEncoder; w.addEventListener('error',e=>errs.push(e.message)); }});
const w = dom.window, d = w.document, sleep = ms => new Promise(r=>setTimeout(r,ms));
const go = h => { w.location.hash = h; w.dispatchEvent(new w.HashChangeEvent('hashchange')); };
const txt = () => d.getElementById('view').textContent.replace(/\s+/g,' ');
const say = async q => { d.getElementById('cin').value = q; d.getElementById('cform').dispatchEvent(new w.Event('submit',{cancelable:true})); await sleep(650); };
const lastBot = () => [...d.querySelectorAll('#msgs .m.bot')].pop().textContent.replace(/\s+/g,' ').slice(0,180);
const click = sel => { const e = typeof sel==='string' ? d.querySelector(sel) : sel; if(!e) throw new Error('missing '+sel); e.click(); };
(async()=>{
  await sleep(500);
  console.log('home', txt().length, 'roadmap', d.querySelectorAll('.rr').length);
  for(const r of ['mint','token/LUMEN','token/KITE','axp','axp/agents','axp/transactions','axp/offerings','axp/discover','agent/vera','whitepaper','pax']){ go(r); await sleep(30); console.log(r, txt().length); }
  go('token/KITE'); await sleep(20); console.log('snipe banner', d.getElementById('tk-snipe').textContent.slice(0,60));
  go('home'); await sleep(20); click('#h-d'); await sleep(700);
  console.log('hash', w.location.hash, 'onb', !!d.getElementById('onb')); click('#o-n'); await sleep(20); d.getElementById('o-a').value='30'; click('#o-n'); await sleep(50);
  console.log('marco wallet after onboarding:', d.querySelector('.wbal b').textContent);
  // butler hire flow
  await say('Review my rental contract for red flags'); console.log('pick:', lastBot().slice(0,120));
  click([...d.querySelectorAll('[data-pick]')][0]); await sleep(50); console.log('ask:', lastBot().slice(0,140), '| askfor:', d.getElementById('askfor').textContent.slice(0,60));
  await say('Apartment lease in Kadikoy, 12 months'); console.log('ask2:', lastBot());
  await say('tenant'); console.log('confirm:', lastBot().slice(0,160));
  const ci = [...d.querySelectorAll('#msgs .ci')].pop(); ci.value = 'landlord'; ci.dispatchEvent(new w.Event('change',{bubbles:true})); await sleep(20);
  click([...d.querySelectorAll('#msgs [data-a="approve"]')].pop()); await sleep(100); console.log('job card:', lastBot().slice(0,100));
  await sleep(9000); console.log('after progress:', lastBot().slice(0,200));
  const acc = [...d.querySelectorAll('#msgs [data-a="accept"]')].pop(); if(acc){ acc.click(); await sleep(50); console.log('accepted:', lastBot().slice(0,120)); } else console.log('NO ACCEPT BUTTON');
  // swap
  await say('Buy 20 USDC of LUMEN'); console.log('swap:', lastBot().slice(0,100)); click([...d.querySelectorAll('#msgs [data-a="swap"]')].pop()); await sleep(20); console.log('swap done:', lastBot().slice(0,80));
  // perp via agent
  await say('Long BTC 100 USDC at 5x'); console.log('perp:', lastBot().slice(0,200));
  click([...d.querySelectorAll('#msgs [data-a="approve"]')].pop()); await sleep(9500); const a2 = [...d.querySelectorAll('#msgs [data-a="accept"]')].pop(); if(a2) a2.click(); await sleep(50); console.log('positions:', d.getElementById('sideb').textContent.replace(/\s+/g,' ').match(/Positions.{0,80}/)[0]);
  // deposit
  await say('Deposit 40 USDC to Marco'); click([...d.querySelectorAll('#msgs [data-a="xfer"]')].pop()); await sleep(20); console.log('xfer:', lastBot().slice(0,60));
  // pro mode
  click('#mode [data-m="pro"]'); await say('Launch my app: brand, copy and a market report'); console.log('plan:', lastBot().slice(0,200));
  click([...d.querySelectorAll('#msgs [data-a="runplan"]')].pop()); await sleep(30000); console.log('plan result:', lastBot().slice(0,160));
  // chats
  click('#newc'); console.log('new chat intro', !!d.querySelector('#msgs .intro'));
  // agent page hire
  go('agent/scout'); await sleep(20); click('[data-hire]'); await sleep(100); console.log('hire from agent page ->', w.location.hash, lastBot().slice(0,100));
  // create agent
  go('newagent'); await sleep(20); const n = d.getElementById('na-n'); n.value='Ledger'; n.dispatchEvent(new w.Event('input')); const de = d.getElementById('na-d'); de.value='Reconciles invoices and pays vendors'; de.dispatchEvent(new w.Event('input')); click('#na-nx'); await sleep(20);
  const box = d.querySelector('.offed'); const k = box.querySelector('[data-k="key"]'); k.value='reconcile'; k.dispatchEvent(new w.Event('input',{bubbles:true})); const ds = box.querySelector('[data-k="desc"]'); ds.value='Monthly reconciliation'; ds.dispatchEvent(new w.Event('input',{bubbles:true})); click('#na-nx'); await sleep(10); click('#na-nx'); await sleep(10); click('#na-nx'); await sleep(30); console.log('agent created ->', w.location.hash);
  // launch token for it
  go('create'); await sleep(20); click('[data-t="standard"]'); await sleep(5); click('#cw-nx'); await sleep(10); const ag = d.getElementById('c-ag'); ag.value='ledger'; ag.dispatchEvent(new w.Event('change')); await sleep(10); click('#cw-nx'); await sleep(10); click('#cw-nx'); await sleep(10); click('[data-w="5880"]'); await sleep(10); click('#cw-nx'); await sleep(10); const pb = d.getElementById('c-pb'); pb.value='25'; pb.dispatchEvent(new w.Event('input')); click('#cw-nx'); await sleep(10); click('#cw-nx'); await sleep(40); console.log('launched ->', w.location.hash, d.getElementById('tk-snipe').textContent.slice(0,50));
  // token page trade
  d.getElementById('tk-amt').value = '15'; d.getElementById('tk-amt').dispatchEvent(new w.Event('input')); click('#tk-go'); await sleep(20); console.log('pos:', d.getElementById('tk-pos').textContent.slice(0,60));
  go('profile'); await sleep(20); console.log('profile sections', [...d.querySelectorAll('.pf-sh h3')].map(h=>h.textContent).join(' | ')); go('points'); await sleep(20); console.log('points page', !!d.getElementById('pts-host'));
  console.log('errors', errs.slice(0,8)); process.exit(0);
})().catch(e=>{ console.log('FAIL', e.stack, errs.slice(0,5)); process.exit(1); });
