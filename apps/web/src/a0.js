/* ================= Opcode API client =================
   The UI runs in preview mode (everything simulated in the browser) until an API base URL is set:
     window.OPCODE_CONFIG = { apiBase: 'https://api.opcode.app' }  (set in a script tag before this one)
   or ?api=https://... on the page URL (remembered in localStorage). The client mirrors services/api routes. */
window.OpcodeAPI = (function(){
  const cfg = Object.assign({ apiBase: null }, window.OPCODE_CONFIG || {});
  try{ const q = new URLSearchParams(location.search).get('api'); if(q) localStorage.setItem('opcode.api', q); const s = localStorage.getItem('opcode.api'); if(!cfg.apiBase && s) cfg.apiBase = s; }catch(e){}
  let token = null; try{ token = localStorage.getItem('opcode.apiToken'); }catch(e){}
  const base = () => (cfg.apiBase || '').replace(/\/$/, '');
  async function call(method, path, body){
    if(!cfg.apiBase) throw new Error('API not configured');
    const r = await fetch(base() + path, { method, headers: Object.assign({ 'content-type':'application/json' }, token ? { authorization: 'Bearer ' + token } : {}), body: body === undefined ? undefined : JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if(!r.ok && r.status !== 202){ const e = new Error((j.error && j.error.message) || ('HTTP ' + r.status)); e.code = j.error && j.error.code; e.status = r.status; throw e; }
    return j;
  }
  const setToken = t => { token = t; try{ t ? localStorage.setItem('opcode.apiToken', t) : localStorage.removeItem('opcode.apiToken'); }catch(e){} };
  return {
    get enabled(){ return !!cfg.apiBase; }, get base(){ return base(); }, setToken,
    health: () => call('GET', '/v1/health'), config: () => call('GET', '/v1/config'), prices: s => call('GET', '/v1/prices?symbols=' + encodeURIComponent(s.join(','))),
    // wallet sign-in: get the message, have the wallet sign it (personal_sign), verify
    signIn: async (address, sign) => { const n = await call('GET', '/v1/auth/nonce?address=' + address); const signature = await sign(n.message); const v = await call('POST', '/v1/auth/verify', { address, signature }); setToken(v.token); return v; },
    devSignIn: async address => { const v = await call('POST', '/v1/auth/dev', { address }); setToken(v.token); return v; },
    me: () => call('GET', '/v1/me'), notifications: () => call('GET', '/v1/me/notifications'), holdings: () => call('GET', '/v1/me/holdings'),
    paxDeposit: amount => call('POST', '/v1/pax/deposit', { amount }), paxWithdraw: amount => call('POST', '/v1/pax/withdraw', { amount }),
    paxSay: (text, chatId) => call('POST', '/v1/pax/messages', { text, chatId }), paxConfirmLaunch: (chatId, edits) => call('POST', `/v1/pax/chats/${chatId}/launch`, edits || {}),
    agents: () => call('GET', '/v1/agents'), agent: id => call('GET', '/v1/agents/' + id), createAgent: b => call('POST', '/v1/agents', b), offerings: q => call('GET', '/v1/offerings?q=' + encodeURIComponent(q)),
    openJob: b => call('POST', '/v1/jobs', b), jobs: () => call('GET', '/v1/jobs'), job: id => call('GET', '/v1/jobs/' + id),
    fundJob: id => call('POST', `/v1/jobs/${id}/fund`), completeJob: id => call('POST', `/v1/jobs/${id}/complete`), rejectJob: (id, reason) => call('POST', `/v1/jobs/${id}/reject`, { reason }),
    tokens: (q = {}) => call('GET', '/v1/tokens?' + new URLSearchParams(q)), token: s => call('GET', '/v1/tokens/' + s), trades: s => call('GET', `/v1/tokens/${s}/trades`),
    quote: (s, side, amount) => call('GET', `/v1/tokens/${s}/quote?side=${side}&amount=${amount}`), trade: (s, b) => call('POST', `/v1/tokens/${s}/trade`, b),
    launch: spec => call('POST', '/v1/launches', spec), upcoming: () => call('GET', '/v1/launches/upcoming'), presale: id => call('GET', '/v1/presales/' + id), commit: (id, points, usdc) => call('POST', `/v1/presales/${id}/commit`, { points, usdc }),
    points: () => call('GET', '/v1/points'), leaderboard: () => call('GET', '/v1/points/leaderboard'), linkX: (code, verifier) => call('POST', '/v1/points/x/link', { code, verifier }), submitPost: url => call('POST', '/v1/points/submissions', { url }),
  };
})();
