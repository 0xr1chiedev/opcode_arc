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
(async()=>{
  await sleep(300); w.demoSession ? 0 : 0;
  click('#h-d'); await sleep(700);
  const sc = d.querySelector('#o-s'); if(sc) sc.click(); await sleep(50);
  // presale view before points
  go('presale/ATLX'); await sleep(30); console.log('ps no-x:', d.getElementById('ps-side').textContent.replace(/\s+/g,' ').slice(0,80));
  // points: link X
  go('profile/points'); await sleep(30); console.log('pt flow:', d.querySelector('.pt-flow .on').textContent);
  click('#pt-link'); await sleep(20); d.getElementById('xl-h').value='richie_op'; click('#xl-go'); await sleep(50);
  // wrong handle
  inp('pt-url','https://x.com/someoneelse/status/1846000000000000000'); d.getElementById('pt-form').dispatchEvent(new w.Event('submit',{cancelable:true})); await sleep(10); console.log('mismatch:', d.getElementById('pt-msg').textContent);
  // old post (2020)
  inp('pt-url','https://x.com/richie_op/status/1300000000000000000'); d.getElementById('pt-form').dispatchEvent(new w.Event('submit',{cancelable:true})); await sleep(10); console.log('old:', d.getElementById('pt-msg').textContent);
  for(let i=0;i<4;i++){ click('#pt-sample'); d.getElementById('pt-form').dispatchEvent(new w.Event('submit',{cancelable:true})); await sleep(80); }
  console.log('subs', EV('S.pts.subs.length'));
  await sleep(6500); console.log('points after scoring', EV('JSON.stringify({a:S.pts.avail,e:S.pts.earned})'));
  // presale commit
  go('presale/ATLX'); await sleep(30);
  const before = EV('({w:S.wallet, p:S.pts.avail, o:PRESALES[0].ptsOthers})');
  inp('ps-p', String(before.p)); inp('ps-u','420');
  const est = EV('JSON.stringify(psEst(PRESALES[0], S.pts.avail, 420))'); console.log('est', est);
  click('#ps-go'); await sleep(20);
  console.log('after commit', EV('JSON.stringify({w:S.wallet, avail:S.pts.avail, locked:S.pts.locked, my:PRESALES[0].my})'));
  inp('ps-u','10'); click('#ps-go'); await sleep(10); console.log('over cap toast:', d.querySelector('.toast') && d.querySelector('.toast').textContent);
  const pre = EV('({w:S.wallet})');
  const e2 = JSON.parse(EV('JSON.stringify(psEst(PRESALES[0]))'));
  click('#ps-end'); await sleep(30);
  const post = JSON.parse(EV('JSON.stringify({w:S.wallet, burned:S.pts.burned, locked:S.pts.locked, hold:S.hold.ATLX, tok:!!TK("ATLX")})'));
  console.log('settle: refund ok', Math.abs(post.w - pre.w - e2.refund) < 1e-6, 'refund', e2.refund.toFixed(2), 'paid', e2.acc.toFixed(2), 'ent', e2.ent.toFixed(2), post);
  console.log('side:', d.getElementById('ps-side').textContent.replace(/\s+/g,' ').slice(0,160));
  // presale launch wizard
  go('create'); await sleep(20); click('[data-t="presale"]'); click('#cw-nx'); await sleep(5);
  inp('c-n','Orbit Ops'); inp('c-s','ORBT'); click('#cw-nx'); await sleep(5);
  console.log('presale step kv:', d.getElementById('p-kv').textContent.replace(/\s+/g,' '));
  click('#cw-nx'); await sleep(5);
  console.log('tomics sum:', d.getElementById('tm-sum').textContent);
  click('#cw-nx'); await sleep(5); click('#cw-nx'); await sleep(30); console.log('presale created ->', w.location.hash);
  go('tokens'); await sleep(30); console.log('strip cards', d.querySelectorAll('.ps-card').length);
  go('home'); await sleep(30); console.log('home strip', d.querySelectorAll('#home-ps .ps-card').length, 'market rows', d.querySelectorAll('#home-mk tbody tr').length);
  console.log('errors', errs.slice(0,8)); process.exit(0);
})().catch(e=>{ console.log('FAIL', e.stack, errs.slice(0,5)); process.exit(1); });
