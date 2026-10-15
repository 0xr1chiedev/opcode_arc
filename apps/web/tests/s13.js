const L = require('./lib'); const f = process.argv[2], pre = process.argv[3]||'v', theme = process.argv[4]||null, only = process.argv[5];
(async()=>{ const b = await L.browser();
  const p = await L.page(b, f, 1440, 900, theme); await p.goto('http://op.test/'); await p.waitForTimeout(3800); await p.screenshot({path:pre+'-home-out.png'});
  await p.screenshot({path:pre+'-home-out-full.png', fullPage:true});
  await L.demo(p);
  const routes = (only||'home,pax,tokens,token/LUMEN,axp,presale/ATLX,points,profile,create,agent/scout').split(',');
  for(const r of routes){ await L.go(p, r); await p.screenshot({path:pre+'-'+r.replace('/','_')+'.png'}); }
  await p.click('#acct'); await p.waitForTimeout(200); await p.screenshot({path:pre+'-menu.png'});
  const m = await L.page(b, f, 390, 844, theme); await m.goto('http://op.test/'); await m.waitForTimeout(3500); await m.screenshot({path:pre+'-m-home.png', fullPage:true});
  await L.demo(m); for(const r of ['home','profile','pax','token/LUMEN']){ await L.go(m, r); await m.screenshot({path:pre+'-m-'+r.replace('/','_')+'.png'}); }
  await m.click('#acct'); await m.waitForTimeout(200); await m.screenshot({path:pre+'-m-menu.png'});
  await b.close(); })();
