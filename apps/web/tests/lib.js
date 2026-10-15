const { chromium } = require('playwright'); const fs = require('fs');
const FD = __dirname + '/node_modules/@fontsource/';
const css = [400,500,600,700].map(w=>`@font-face{font-family:'Geist';font-weight:${w};src:url(http://op.test/f/geist-sans/files/geist-sans-latin-${w}-normal.woff2) format('woff2')}`).join('') + [400,500].map(w=>`@font-face{font-family:'Geist Mono';font-weight:${w};src:url(http://op.test/f/geist-mono/files/geist-mono-latin-${w}-normal.woff2) format('woff2')}`).join('');
async function browser(){ return chromium.launch(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}); }
async function page(b, file, w, h, theme){
  const html = fs.readFileSync(file,'utf8');
  const p = await b.newPage({viewport:{width:w,height:h}}); p.on('pageerror', e=>console.log('ERR',e.message));
  await p.route('**/*', r => { const u = r.request().url();
    if(u.startsWith('http://op.test/f/')) return r.fulfill({body: fs.readFileSync(FD + u.slice(17)), contentType:'font/woff2'});
    if(u.startsWith('http://op.test')) return r.fulfill({body: html, contentType:'text/html; charset=utf-8'});
    if(u.includes('fonts.googleapis.com')) return r.fulfill({body: css, contentType:'text/css'});
    return r.abort(); });
  if(theme) await p.addInitScript(t => { try{ localStorage.setItem('opcode.theme', t); }catch(e){} }, theme);
  return p;
}
async function demo(p){ await p.goto('http://op.test/'); await p.waitForTimeout(500); await p.evaluate(()=>{ const b = document.querySelector('#h-d') || document.querySelector('#gv-d'); b && b.click(); }); await p.waitForTimeout(700); const s = await p.$('#o-s'); if(s) await s.click(); await p.waitForTimeout(200); }
async function go(p, h, ms=600){ await p.evaluate(x=>location.hash=x, h); await p.waitForTimeout(ms); }
module.exports = {browser, page, demo, go};
