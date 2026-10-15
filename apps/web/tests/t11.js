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
const EV = x => { const s = d.createElement('script'); s.textContent = 'with(window.__op){ window.__r = (' + x + '); }'; d.body.appendChild(s); s.remove(); return w.__r; };
const inp = (id,v) => { const e = d.getElementById(id); e.value = v; e.dispatchEvent(new w.Event('input',{bubbles:true})); };
const ask = () => { const a = d.getElementById('askfor'); return a.hidden ? '-' : a.textContent.replace(/\s+/g,' ').replace('Cancel','').trim(); };
const opts = () => [...d.querySelectorAll('#msgs .m.bot')].pop().querySelectorAll('[data-ans]').length;
(async()=>{
  await sleep(300); click('#h-d'); await sleep(700); const sc = d.querySelector('#o-s'); if(sc) sc.click();
  go('pax'); await sleep(50);
  await say('Launch a token for my agent Lumen'); console.log('1>', lastBot().slice(0,150), '|', ask(), '| opts', opts());
  for(const a of ['Lumen Pro','LUMEN','LUMX','Use the agent description','Presale','20k','20%','48 hours','Balanced: curve 60, team 15, airdrop 10']){ await say(a); console.log('  ', a, '->', ask(), '|', lastBot().slice(0,90)); }
  const card = [...d.querySelectorAll('#msgs .lcard')].pop(); console.log('card:', card.textContent.replace(/\s+/g,' ').slice(0,260));
  card.querySelector('[data-a="dolaunch"]').click(); await sleep(50); console.log('after:', lastBot().slice(0,160), EV('PRESALES.some(p=>p.sym==="LUMX")'));
  // standard path with preparse
  await say('Launch $ORBX called Orbit Ops, standard, right away'); console.log('2>', lastBot().slice(0,200), '|', ask());
  for(const a of ['No agent','Fleet routing agent for warehouse robots','Off','50 USDC','Custom','30%','10%','10%']){ await say(a); console.log('  ', a, '->', ask(), '|', lastBot().slice(0,90)); }
  const w0 = EV('S.wallet');
  const c2 = [...d.querySelectorAll('#msgs .lcard')].pop(); c2.querySelector('[data-a="dolaunch"]').click(); await sleep(50);
  console.log('after2:', lastBot().slice(0,180), 'token', EV('!!TK("ORBX")'), 'wallet delta', (w0-EV('S.wallet')).toFixed(2), 'hold', Math.round(EV('S.hold.ORBX||0')), 'tomics', JSON.stringify(EV('TK("ORBX").tomics.pct')));
  // scheduled + edit form
  await say('make a coin $SKYD named Sky Desk, launch in 6 hours'); 
  for(const a of ['No agent','Weather data agent for drone fleets','10 minutes','No pre-buy','Fair launch: no team']){ await say(a); }
  const c3 = [...d.querySelectorAll('#msgs .lcard')].pop(); console.log('card3 has Schedule:', c3.textContent.includes('Schedule launch'));
  c3.querySelector('[data-a="editform"]').click(); await sleep(50); console.log('editform ->', w.location.hash, 'step', d.querySelector('.wiz-nav .on').textContent, 'name', d.getElementById('c-n') && d.getElementById('c-n').value);
  console.log('errors', errs.slice(0,8)); process.exit(0);
})().catch(e=>{ console.log('FAIL', e.stack, errs.slice(0,5)); process.exit(1); });
