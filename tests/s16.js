const L = require('./lib'); const f = process.argv[2];
(async()=>{ const b = await L.browser();
  for(const [w,h,pre] of [[1440,900,'p'],[390,844,'pm']]){
  const p = await L.page(b, f, w, h); await L.demo(p);
  await p.evaluate(()=>{ window.__op.S.pts.x = {handle:'richie_op', at:Date.now()-6e5}; });
  await L.go(p,'profile'); await p.screenshot({path:pre+'-prof.png'});
  await p.click('#pf-submit'); await p.waitForTimeout(250); await p.screenshot({path:pre+'-modal.png'});
  await p.close(); }
  await b.close(); })();
