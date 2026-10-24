import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { Readable } from 'node:stream';
import { privateKeyToAccount } from 'viem/accounts';
import * as C from '../../../packages/core/src/index.ts';
import { SimChain, ACCT, tokenAsset, ArcEvmChain } from '../../../packages/chain/src/index.ts';
import { MockXProvider, StaticPriceFeed } from '../../../packages/integrations/src/index.ts';
import { signPayment } from '../../../packages/chain/src/index.ts';
import { keccak256, toHex } from 'viem';
import { createApp } from '../src/app.ts';
import { MemoryStore, serialize, deserialize } from '../src/store.ts';
import { walletLinkMessage } from '../src/services/agents.ts';

let clock = Date.UTC(2026, 9, 16, 9, 0, 0);
const now = () => clock, advance = (ms: number) => { clock += ms; };
const chain = new SimChain({ now });
const app = createApp({ cfg: { chainMode: 'sim', allowDev: true, storeFile: null, seed: true, corsOrigin: '*', domain: 'opcode.test' }, chain, x: new MockXProvider({ now }), prices: new StaticPriceFeed(), now });
let base = '';
before(async () => { await app.seed(); await new Promise<void>((r) => app.server.listen(0, r)); base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`; });
after(() => app.server.close());

async function api(method: string, path: string, body?: unknown, token?: string) {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: (await r.json()) as any };
}
async function rawApi(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, headers: r.headers, body: (await r.json()) as any };
}
const alice = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d');
const bob = privateKeyToAccount('0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a');
async function signIn(acct: typeof alice) {
  const n = await api('GET', `/v1/auth/nonce?address=${acct.address}`);
  assert.match(n.body.message, /Chain ID: 5042/);
  const v = await api('POST', '/v1/auth/verify', { address: acct.address, signature: await acct.signMessage({ message: n.body.message }) });
  assert.equal(v.status, 200, JSON.stringify(v.body)); return v.body.token as string;
}
const usdcOf = (a: string) => chain.balanceSync('USDC', a);
let A = '', B = '';

test('health and config describe Arc mainnet in simulated mode', async () => {
  const h = await api('GET', '/v1/health');
  assert.equal(h.body.mode, 'sim'); assert.equal(h.body.chainId, 5042); assert.equal(h.body.contracts.jobEscrow, false);
  const c = await api('GET', '/v1/config'); assert.equal(c.body.curve.graduation, '42000000000'); assert.equal(c.body.fees.tradeBps, '100');
  assert.equal((await api('GET', '/v1/prices?symbols=BTC,ETH')).body.items.length, 2);
});

test('wallet sign-in: valid signature opens a session; bad signature and missing auth are refused', async () => {
  const n = await api('GET', `/v1/auth/nonce?address=${alice.address}`);
  const wrong = await api('POST', '/v1/auth/verify', { address: alice.address, signature: await bob.signMessage({ message: n.body.message }) });
  assert.equal(wrong.status, 401); assert.equal(wrong.body.error.code, 'BAD_SIGNATURE');
  A = await signIn(alice); B = await signIn(bob);
  assert.equal((await api('GET', '/v1/me')).status, 401);
  const me = await api('GET', '/v1/me', undefined, A); assert.equal(me.body.user.address, alice.address.toLowerCase());
  await api('POST', '/v1/dev/faucet', { amount: '2000' }, A); await api('POST', '/v1/dev/faucet', { amount: '2000' }, B);
  assert.equal((await api('GET', '/v1/me', undefined, A)).body.balances.wallet, '2000000000');
});

test('PAX wallet deposit and withdraw', async () => {
  assert.equal((await api('POST', '/v1/pax/deposit', { amount: '50' }, A)).status, 200);
  assert.equal(usdcOf(ACCT.pax(alice.address)), C.usdc('50'));
  assert.equal((await api('POST', '/v1/pax/withdraw', { amount: '60' }, A)).body.error.code, 'INSUFFICIENT_FUNDS');
});

test('trading: quote matches execution, fees split 70/30, USDC is conserved, slippage guard works', async () => {
  const total = chain.totalOf('USDC');
  const q = await api('GET', '/v1/tokens/LUMEN/quote?side=buy&amount=100');
  const creatorBefore = usdcOf('0x000000000000000000000000000000000000c0de'), treasuryBefore = usdcOf(ACCT.treasury);
  const t = await api('POST', '/v1/tokens/LUMEN/trade', { side: 'buy', amount: '100', minOut: C.fmtTokens(BigInt(q.body.out), 18) }, A);
  assert.equal(t.status, 200, JSON.stringify(t.body)); assert.equal(t.body.tokens, q.body.out); assert.equal(t.body.fee, '1000000');
  assert.equal(usdcOf('0x000000000000000000000000000000000000c0de') - creatorBefore, 700_000n);
  assert.equal(usdcOf(ACCT.treasury) - treasuryBefore, 300_000n);
  assert.equal(chain.totalOf('USDC'), total, 'trades move USDC, never create it');
  const held = chain.balanceSync(tokenAsset('LUMEN'), alice.address);
  const tooGreedy = await api('POST', '/v1/tokens/LUMEN/trade', { side: 'sell', amount: C.fmtTokens(held / 2n, 18), minOut: '1000' }, A);
  assert.equal(tooGreedy.body.error.code, 'SLIPPAGE');
  const s = await api('POST', '/v1/tokens/LUMEN/trade', { side: 'sell', amount: C.fmtTokens(held / 2n, 18) }, A);
  assert.ok(BigInt(s.body.usdc) > C.usdc('48') && BigInt(s.body.usdc) < C.usdc('50'));
  const list = await api('GET', '/v1/tokens?sort=top&per=2'); assert.equal(list.body.items[0].symbol, 'ORCA'); assert.equal(list.body.items[0].graduated, true);
});

test('AXP job through PAX: open → budget → fund from PAX → delivered → approved; 90/5/5 payout and LUMEN buyback', async () => {
  const pick = await api('POST', '/v1/pax/messages', { text: 'Review my rental contract for red flags' }, A);
  assert.equal(pick.body.replies[0].card.type, 'pick'); assert.equal(pick.body.replies[0].card.results[0].agentId, 'lumen');
  const missing = await api('POST', '/v1/jobs', { agentId: 'lumen', offering: 'contract_summary', requirements: { document: 'lease.pdf' } }, A);
  assert.equal(missing.status, 422);
  const j = await api('POST', '/v1/jobs', { agentId: 'lumen', offering: 'contract_summary', requirements: { document: 'lease.pdf', language: 'English' } }, A);
  assert.equal(j.body.phase, 'open');
  await app.tick(); assert.equal((await api('GET', `/v1/jobs/${j.body.id}`)).body.phase, 'budget_set');
  assert.equal((await api('POST', `/v1/jobs/${j.body.id}/fund`, {}, B)).status, 403);
  const paxBefore = usdcOf(ACCT.pax(alice.address));
  assert.equal((await api('POST', `/v1/jobs/${j.body.id}/fund`, {}, A)).body.phase, 'funded');
  assert.equal(paxBefore - usdcOf(ACCT.pax(alice.address)), C.usdc('0.5'));
  advance(6_000); await app.tick();
  const sub = await api('GET', `/v1/jobs/${j.body.id}`); assert.equal(sub.body.phase, 'submitted'); assert.match(sub.body.deliverable, /lease\.pdf/);
  const done = await api('POST', `/v1/jobs/${j.body.id}/complete`, {}, A); assert.equal(done.body.phase, 'completed');
  assert.equal(usdcOf(app.ctx.store.state.agents.lumen!.wallet), 450_000n); assert.equal(usdcOf(ACCT.protocol), 25_000n); assert.equal(usdcOf(ACCT.escrow(j.body.id)), 0n);
  assert.equal(usdcOf(ACCT.buyback('lumen')), 25_000n, '5% waits in the buyback reserve');
  const burnBefore = chain.balanceSync(tokenAsset('LUMEN'), ACCT.burn);
  await app.tick();
  assert.equal(usdcOf(ACCT.buyback('lumen')), 0n, 'reserve spent'); assert.ok(chain.balanceSync(tokenAsset('LUMEN'), ACCT.burn) > burnBefore, 'bought LUMEN was burned');
  assert.equal(app.ctx.store.state.tokens.LUMEN!.boughtBack!.usdc, 25_000n);
});

test('standard launch: validation, modules charged, pre-buy filled before anti-sniper; others pay the sniper tax', async () => {
  const bad = await api('POST', '/v1/launches', { type: 'standard', name: 'X', symbol: 'lumen', preset: 'balanced' }, A);
  assert.equal(bad.status, 422); assert.match(bad.body.error.message, /2 to 32 characters/);
  const w0 = usdcOf(alice.address);
  const l = await api('POST', '/v1/launches', { type: 'standard', name: 'Orbit Ops', symbol: 'ORBX', description: 'Fleet routing', preset: 'balanced', sniper: { windowSec: 600 }, prebuy: '50' }, A);
  assert.equal(l.status, 200, JSON.stringify(l.body)); assert.equal(l.body.launch.status, 'live');
  assert.equal(w0 - usdcOf(alice.address), C.usdc('60') - C.usdc('0.35'), 'paid 10 module + 50 pre-buy, got back 70% of the pre-buy fee as creator');
  assert.ok(chain.balanceSync(tokenAsset('ORBX'), alice.address) > 0n);
  const q = await api('GET', '/v1/tokens/ORBX/quote?side=buy&amount=100'); assert.equal(q.body.taxBps, '9900');
  advance(300_000); assert.equal((await api('GET', '/v1/tokens/ORBX/quote?side=buy&amount=100')).body.taxBps, '5000');
  advance(300_000); assert.equal((await api('GET', '/v1/tokens/ORBX/quote?side=buy&amount=100')).body.taxBps, '100');
  assert.equal(chain.balanceSync(tokenAsset('ORBX'), ACCT.vesting('ORBX', 'team')), C.tokens('150000000'));
});

test('scheduled launch appears in Upcoming launches and goes live on time', async () => {
  const l = await api('POST', '/v1/launches', { type: 'standard', name: 'Sky Desk', symbol: 'SKYD', preset: 'fair', startInH: 6 }, B);
  assert.equal(l.body.launch.status, 'scheduled');
  assert.ok((await api('GET', '/v1/launches/upcoming')).body.items.some((x: any) => x.symbol === 'SKYD'));
  assert.equal((await api('GET', '/v1/tokens/SKYD')).status, 404);
  advance(6 * 3_600_000); await app.tick();
  assert.equal((await api('GET', '/v1/tokens/SKYD')).body.symbol, 'SKYD');
  assert.ok(!(await api('GET', '/v1/launches/upcoming')).body.items.some((x: any) => x.symbol === 'SKYD'));
});

test('points: link X, submit posts, engagement scored by the worker, rules enforced', async () => {
  assert.equal((await api('POST', '/v1/points/submissions', { url: `https://x.com/alice/status/${C.makeSnowflake(clock - 60_000)}` }, A)).body.error.code, 'X_NOT_LINKED');
  await api('POST', '/v1/points/x/link', { code: 'mock:alice_op' }, A); await api('POST', '/v1/points/x/link', { code: 'mock:bob_op' }, B);
  assert.equal((await api('POST', '/v1/points/x/link', { code: 'mock:alice_op' }, B)).body.error.code, 'X_IN_USE');
  assert.equal((await api('POST', '/v1/points/submissions', { url: `https://x.com/bob_op/status/${C.makeSnowflake(clock - 60_000)}` }, A)).body.error.code, 'WRONG_ACCOUNT');
  for (let i = 0; i < 4; i++) assert.equal((await api('POST', '/v1/points/submissions', { url: `https://x.com/alice_op/status/${C.makeSnowflake(clock - 3_600_000, i)}` }, A)).status, 200);
  for (let i = 0; i < 2; i++) await api('POST', '/v1/points/submissions', { url: `https://x.com/bob_op/status/${C.makeSnowflake(clock - 3_600_000, 50 + i)}` }, B);
  const dup = await api('POST', '/v1/points/submissions', { url: `https://x.com/alice_op/status/${C.makeSnowflake(clock - 3_600_000, 0)}` }, A); assert.equal(dup.body.error.code, 'DUPLICATE');
  await app.tick();
  const p = await api('GET', '/v1/points', undefined, A);
  assert.ok(BigInt(p.body.balance.available) > 100n, `points ${p.body.balance.available}`); assert.equal(p.body.submissions[0].status, 'tracking');
  assert.equal((await api('GET', '/v1/points/leaderboard')).body.items.length, 2);
});

test('presale: commit with points, allocation by points share, refunds, burn, curve seeded with the raise', async () => {
  const l = await api('POST', '/v1/launches', { type: 'presale', name: 'Lumen Pro', symbol: 'LUMX', preset: 'balanced', presale: { target: '1000', sharePct: 20, durationH: 24, minPoints: 10 } }, A);
  assert.equal(l.status, 200, JSON.stringify(l.body)); const pid = l.body.presale.id;
  assert.equal(l.body.presale.capPerWallet, '21000000');
  const pa = BigInt((await api('GET', '/v1/points', undefined, A)).body.balance.available), pb = BigInt((await api('GET', '/v1/points', undefined, B)).body.balance.available);
  assert.equal((await api('POST', `/v1/presales/${pid}/commit`, { points: 10, usdc: '25' }, A)).body.error.code, 'CAP');
  assert.equal((await api('POST', `/v1/presales/${pid}/commit`, { points: Number(pa) + 1, usdc: '1' }, A)).body.error.code, 'INSUFFICIENT_POINTS');
  const ca = await api('POST', `/v1/presales/${pid}/commit`, { points: Number(pa), usdc: '21' }, A); assert.equal(ca.status, 200, JSON.stringify(ca.body));
  await api('POST', `/v1/presales/${pid}/commit`, { points: Number(pb), usdc: '5' }, B);
  assert.equal(usdcOf(ACCT.vault(pid)), C.usdc('26'));
  assert.equal((await api('POST', `/v1/presales/${pid}/settle`)).body.error.code, 'NOT_ENDED');
  const wa = usdcOf(alice.address), wb = usdcOf(bob.address);
  advance(24 * 3_600_000); await app.tick();
  const v = await api('GET', `/v1/presales/${pid}`); assert.equal(v.body.status, 'settled');
  const total = pa + pb, allocA = C.min((pa * C.usdc('1000')) / total, C.usdc('21')), allocB = C.min((pb * C.usdc('1000')) / total, C.usdc('21'));
  const paidA = C.min(C.usdc('21'), allocA), paidB = C.min(C.usdc('5'), allocB);
  assert.equal(usdcOf(alice.address) - wa, C.usdc('21') - paidA + (paidA + paidB - C.min(paidA + paidB, C.GRAD - 1n)), 'refund (+ creator proceeds above the curve seed)');
  assert.equal(usdcOf(bob.address) - wb, C.usdc('5') - paidB);
  assert.equal(BigInt((await api('GET', '/v1/points', undefined, A)).body.balance.burned), pa);
  const tok = await api('GET', '/v1/tokens/LUMX'); assert.equal(tok.body.raised, String(paidA + paidB));
  assert.ok(chain.balanceSync(tokenAsset('LUMX'), bob.address) > 0n);
  assert.equal(usdcOf(ACCT.vault(pid)), 0n);
});

test('PAX launch assistant: asks for the gaps, rejects bad answers, launches on confirm', async () => {
  let r = await api('POST', '/v1/pax/messages', { text: 'Launch $ZETA called Zeta Ops, standard, right away' }, B);
  const cid = r.body.chatId; assert.equal(r.body.replies.at(-1).card.key, 'description');
  for (const [a, expect] of [['Fleet routing agent for robots', 'sniperSec'], ['Off', 'prebuy'], ['5000 USDC', 'prebuy'], ['No pre-buy', 'split']] as const) {
    r = await api('POST', '/v1/pax/messages', { chatId: cid, text: a }, B);
    assert.equal(r.body.replies.at(-1).card?.key ?? 'error', expect, `${a} → ${JSON.stringify(r.body.replies.at(-1))}`);
  }
  r = await api('POST', '/v1/pax/messages', { chatId: cid, text: 'Fair launch: no team' }, B);
  assert.equal(r.body.replies.at(-1).card.type, 'launch_review'); assert.equal(r.body.replies.at(-1).card.spec.tokenomics.pct.team, 0);
  const done = await api('POST', `/v1/pax/chats/${cid}/launch`, {}, B);
  assert.equal(done.status, 200, JSON.stringify(done.body)); assert.equal(done.body.launch.status, 'live');
  assert.equal((await api('GET', '/v1/tokens/ZETA')).body.symbol, 'ZETA');
  const buy = await api('POST', '/v1/pax/messages', { text: 'Buy 20 USDC of ZETA' }, B); assert.equal(buy.body.replies[0].card.type, 'trade');
});

test('agents: users create agents, act as provider on their jobs, and only they can', async () => {
  const ag = await api('POST', '/v1/agents', { name: 'Ledger Bot', description: 'Reconciles invoices', offerings: [{ key: 'reconcile', description: 'Monthly reconciliation', price: '2', slaMinutes: 30, requirements: [['period', 'Month']] }] }, A);
  assert.equal(ag.status, 200); assert.equal(ag.body.owner, alice.address.toLowerCase());
  await api('POST', '/v1/pax/deposit', { amount: '10' }, B);
  const j = await api('POST', '/v1/jobs', { agentId: ag.body.id, offering: 'reconcile', requirements: { period: 'September' } }, B);
  assert.equal((await api('POST', `/v1/jobs/${j.body.id}/budget`, { price: '2' }, B)).status, 403);
  assert.equal((await api('POST', `/v1/jobs/${j.body.id}/budget`, { price: '2' }, A)).body.phase, 'budget_set');
  await api('POST', `/v1/jobs/${j.body.id}/fund`, {}, B);
  await api('POST', `/v1/jobs/${j.body.id}/submit`, { deliverable: 'ipfs://reconciliation' }, A);
  const w = usdcOf(alice.address);
  assert.equal((await api('POST', `/v1/jobs/${j.body.id}/reject`, {}, B)).body.phase, 'rejected');
  assert.equal(usdcOf(alice.address), w); assert.equal(usdcOf(ACCT.escrow(j.body.id)), 0n);
});

test('agents: a custom wallet must sign for its agent, so an agent key cannot act as someone else', async () => {
  const offerings = [{ key: 'noop', description: 'Nothing', price: '1', slaMinutes: 1 }];
  const msgFor = (name: string, wallet: string, token: string) => api('GET', `/v1/agents/wallet-message?name=${encodeURIComponent(name)}&wallet=${wallet}`, undefined, token);
  // the attack: Bob points an agent at Alice's wallet, without her signature or with his own
  const noProof = await api('POST', '/v1/agents', { name: 'Puppet', description: 'x', wallet: alice.address, offerings }, B);
  assert.equal(noProof.status, 403); assert.equal(noProof.body.error.code, 'WALLET_PROOF');
  const ch = await msgFor('Puppet', alice.address, B); assert.match(ch.body.message, /Agent: puppet\nOwner: /);
  const forged = await api('POST', '/v1/agents', { name: 'Puppet', description: 'x', wallet: alice.address, walletProof: { signature: await bob.signMessage({ message: ch.body.message }), issuedAt: ch.body.issuedAt }, offerings }, B);
  assert.equal(forged.status, 403); assert.equal(forged.body.error.code, 'WALLET_PROOF');
  assert.equal((await api('GET', '/v1/agents/puppet')).status, 404);
  // a wallet the owner controls signs once; the agent's keys then act as that wallet
  const runner = privateKeyToAccount('0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6');
  const m = await msgFor('Own Wallet Bot', runner.address, A);
  const proof = { signature: await runner.signMessage({ message: m.body.message }), issuedAt: m.body.issuedAt };
  const body = { name: 'Own Wallet Bot', description: 'x', wallet: runner.address, walletProof: proof, offerings };
  assert.equal((await api('POST', '/v1/agents', body, B)).body.error.code, 'WALLET_PROOF', 'the signature names its owner, so Bob cannot reuse it');
  const ag = await api('POST', '/v1/agents', body, A);
  assert.equal(ag.status, 200, JSON.stringify(ag.body)); assert.equal(ag.body.wallet, runner.address.toLowerCase());
  const K = (await api('POST', `/v1/agents/${ag.body.id}/keys`, {}, A)).body.key;
  assert.equal((await api('GET', '/v1/me', undefined, K)).body.user.address, runner.address.toLowerCase());
  // one wallet per agent, never the owner's own sign-in wallet, and signatures expire
  assert.equal((await msgFor('Second Bot', runner.address, A)).body.error.code, 'WALLET_TAKEN');
  assert.equal((await msgFor('Second Bot', alice.address, A)).status, 400);
  const other = privateKeyToAccount('0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a'), old = clock - 11 * 60_000;
  const stale = { signature: await other.signMessage({ message: walletLinkMessage(app.ctx.cfg.domain, 'stalebot', alice.address, other.address, old) }), issuedAt: old };
  assert.match((await api('POST', '/v1/agents', { name: 'Stale Bot', description: 'x', wallet: other.address, walletProof: stale, offerings }, A)).body.error.message, /expired/);
});

test('A2A: agent cards for discovery; an agent hires another agent over JSON-RPC and pays from its own wallet', async () => {
  const card = await api('GET', '/v1/agents/scout/agent-card.json');
  assert.equal(card.body.supportedInterfaces[0].protocolBinding, 'JSONRPC'); assert.match(card.body.supportedInterfaces[0].url, /\/v1\/a2a\/scout$/);
  assert.deepEqual(card.body.skills.map((x: any) => x.id), ['research_report', 'alpha_ping']);
  const ap = card.body['opcode.axp'].offerings.find((o: any) => o.key === 'alpha_ping'); assert.deepEqual(ap.rails, ['x402', 'escrow']); assert.match(ap.x402Endpoint, /\/v1\/x402\/agents\/scout\/alpha_ping$/);
  assert.equal((await api('GET', '/.well-known/agent-card.json')).body.name, 'PAX by Opcode');
  // Alice's agent gets a key and its own wallet
  const ag = await api('POST', '/v1/agents', { name: 'Desk Bot', description: 'Research desk', offerings: [{ key: 'brief', description: 'Daily brief', price: '1', slaMinutes: 10, requirements: [['topic', 'Topic']] }] }, A);
  const key = await api('POST', `/v1/agents/${ag.body.id}/keys`, { label: 'runner' }, A);
  assert.match(key.body.key, /^ak_deskbot_/); assert.equal((await api('POST', `/v1/agents/${ag.body.id}/keys`, {}, B)).status, 403);
  const K = key.body.key, wallet = key.body.wallet;
  await api('POST', '/v1/dev/faucet', { amount: '20' }, K);
  assert.equal(usdcOf(wallet), C.usdc('20'));
  const rpc = (method: string, params: unknown, token = K) => api('POST', '/v1/a2a/scout', { jsonrpc: '2.0', id: 7, method, params }, token);
  assert.equal((await api('POST', '/v1/a2a/scout', { jsonrpc: '2.0', id: 1, method: 'SendMessage', params: {} })).body.error.code, -32000);
  assert.equal((await rpc('Nope', {})).body.error.code, -32601);
  const sent = await rpc('SendMessage', { message: { role: 'user', messageId: 'm1', parts: [{ kind: 'data', data: { offering: 'research_report', requirements: { topic: 'Arc stablecoin volume', depth: 'brief' } } }] } });
  assert.equal(sent.body.result.status.state, 'submitted'); const tid = sent.body.result.id;
  await app.tick();
  assert.equal((await rpc('GetTask', { id: tid })).body.result.status.state, 'input-required');
  assert.equal((await api('POST', `/v1/jobs/${tid}/fund`, {}, K)).body.phase, 'funded');
  assert.equal(usdcOf(wallet), C.usdc('17'), 'the agent paid Scout from its own wallet');
  advance(6_000); await app.tick();
  await api('POST', `/v1/jobs/${tid}/complete`, {}, K);
  const done = (await rpc('tasks/get', { id: tid })).body.result;
  assert.equal(done.status.state, 'completed'); assert.match(done.artifacts[0].parts[0].text, /Arc stablecoin volume/);
  assert.equal((await rpc('GetTask', { id: tid }, B)).body.error.code, -32001, 'other users cannot read the task');
  // the owner withdraws agent earnings
  assert.equal((await api('POST', `/v1/agents/${ag.body.id}/withdraw`, { amount: '5' }, A)).status, 200);
  assert.equal(usdcOf(wallet), C.usdc('12'));
  assert.equal((await api('POST', `/v1/agents/${ag.body.id}/withdraw`, { amount: '1' }, B)).status, 403);
});

test('x402: 402 with requirements, signed EIP-3009 retry gets the result, 90/5/5 split, replay refused', async () => {
  const path = '/v1/x402/agents/scout/alpha_ping', body = { requirements: { keyword: 'arc' } };
  assert.equal((await rawApi('POST', path, { requirements: {} })).status, 422, 'inputs are checked before asking for payment');
  assert.equal((await rawApi('POST', '/v1/x402/agents/scout/research_report', body)).body.error.code, 'NOT_X402');
  const r402 = await rawApi('POST', path, body);
  assert.equal(r402.status, 402); assert.equal(r402.body.x402Version, 2);
  const req = r402.body.accepts[0]; assert.equal(req.network, 'eip155:5042'); assert.equal(req.amount, '50000'); assert.equal(req.scheme, 'exact');
  assert.deepEqual(C.x402.decodeHeader(r402.headers.get('payment-required')), r402.body);
  const before = usdcOf(alice.address), agentBefore = usdcOf(app.ctx.store.state.agents.scout!.wallet), protoBefore = usdcOf('protocol');
  const { header } = await signPayment(alice, req, clock, keccak256(toHex('x402-call-1')));
  const ok = await rawApi('POST', path, body, { 'PAYMENT-SIGNATURE': header });
  assert.equal(ok.status, 200, JSON.stringify(ok.body)); assert.equal(ok.body.status, 'completed'); assert.match(ok.body.output, /arc/);
  const receipt = C.x402.decodeHeader<any>(ok.headers.get('payment-response')); assert.equal(receipt.success, true); assert.equal(receipt.network, 'eip155:5042');
  assert.equal(before - usdcOf(alice.address), 50_000n);
  assert.equal(usdcOf(app.ctx.store.state.agents.scout!.wallet) - agentBefore, 45_000n); assert.equal(usdcOf('protocol') - protoBefore, 2_500n); assert.ok(usdcOf(ACCT.buyback('scout')) >= 2_500n);
  const replay = await rawApi('POST', path, body, { 'PAYMENT-SIGNATURE': header });
  assert.equal(replay.status, 402); assert.equal(replay.body.error, 'nonce_already_used');
  const v1 = await rawApi('POST', path, body, { 'X-PAYMENT': (await signPayment(alice, req, clock, keccak256(toHex('x402-call-2')))).header });
  assert.equal(v1.status, 200, 'v1 X-PAYMENT header accepted'); assert.ok(v1.headers.get('x-payment-response'));
  assert.equal((await api('GET', '/v1/x402/calls?agent=scout')).body.items.length, 2);
  // facilitator endpoints for any x402 server on Arc
  assert.equal((await api('GET', '/v1/x402/supported')).body.kinds[0].network, 'eip155:5042');
  const other = { ...req, payTo: bob.address };
  const signed = await signPayment(alice, other, clock, keccak256(toHex('x402-fac-1')));
  assert.deepEqual((await api('POST', '/v1/x402/verify', { paymentPayload: signed.payload, paymentRequirements: other })).body, { isValid: true, payer: alice.address });
  const st = await api('POST', '/v1/x402/settle', { paymentPayload: signed.payload, paymentRequirements: other }); assert.equal(st.body.success, true);
});

test('store snapshot round-trips bigints', () => {
  const s = deserialize(serialize(app.ctx.store.state));
  assert.equal(s.tokens.LUMEN!.curve.raised, app.ctx.store.state.tokens.LUMEN!.curve.raised);
  assert.equal(typeof s.tokens.LUMEN!.curveTokens, 'bigint');
  assert.ok(new MemoryStore({ state: s }).nextId().length > 0);
});

test('Arc mode: writes come back as unsigned transactions or 501 until contracts are configured', async () => {
  const arcApp = createApp({ cfg: { chainMode: 'arc', allowDev: true, storeFile: null, seed: false, corsOrigin: '*', domain: 'opcode.test', addresses: { curveFactory: ('0x' + '11'.repeat(20)) as `0x${string}` } },
    chain: new ArcEvmChain({ addresses: { curveFactory: ('0x' + '11'.repeat(20)) as `0x${string}` }, tokenAddress: () => ('0x' + '22'.repeat(20)) as `0x${string}` }), x: new MockXProvider({ now }), prices: new StaticPriceFeed(), now });
  const res: any[] = [];
  const call = async (method: string, path: string, body: unknown, token?: string) => new Promise<{ status: number; body: any }>((resolve) => {
    const req: any = Readable.from([Buffer.from(JSON.stringify(body ?? {}))]); req.method = method; req.url = path; req.headers = token ? { authorization: `Bearer ${token}` } : {};
    const out: any = { writeHead: (s: number) => { out.status = s; }, end: (b: string) => resolve({ status: out.status, body: JSON.parse(b) }) }; res.push(out);
    void arcApp.handle(req, out);
  });
  const t = (await call('POST', '/v1/auth/dev', { address: alice.address })).body.token;
  const dep = await call('POST', '/v1/pax/deposit', { amount: '5' }, t);
  assert.equal(dep.status, 501); assert.equal(dep.body.error.code, 'CONTRACT_NOT_CONFIGURED');
  arcApp.ctx.store.state.tokens.LUMEN = structuredClone(app.ctx.store.state.tokens.LUMEN!);
  const buy = await call('POST', '/v1/tokens/LUMEN/trade', { side: 'buy', amount: '10' }, t);
  assert.equal(buy.status, 202); assert.equal(buy.body.pending, true); assert.equal(buy.body.tx.chainId, 5042); assert.equal(buy.body.tx.to, '0x' + '11'.repeat(20));
  assert.equal(arcApp.ctx.store.state.trades.length, 0, 'state waits for the chain');
});

test('bring your own agent: an agent running elsewhere joins AXP over A2A, takes jobs without a token, and can launch one later', async () => {
  const bad = await api('POST', '/v1/agents', { name: 'Ext Bad', description: 'x', connection: { kind: 'a2a', url: 'http://insecure' }, offerings: [{ key: 'ask', description: 'Answer', price: '0.05', slaMinutes: 1, x402: true }] }, A);
  assert.equal(bad.status, 400); assert.match(bad.body.error.message, /https URL/);
  const ag = await api('POST', '/v1/agents', { name: 'Desk Remote', description: 'Runs on its own server', connection: { kind: 'a2a', url: 'https://deskremote.ai/.well-known/agent-card.json' },
    offerings: [{ key: 'ask_desk', description: 'Quick answer', price: '0.05', slaMinutes: 1, x402: true, requirements: [['question', 'Question']] }, { key: 'desk_report', description: 'Report', price: '2', slaMinutes: 30, requirements: [['topic', 'Topic']] }] }, A);
  assert.equal(ag.status, 200, JSON.stringify(ag.body)); assert.equal(ag.body.source, 'connected'); assert.equal(ag.body.connection.kind, 'a2a');
  const card = await api('GET', `/v1/agents/${ag.body.id}/agent-card.json`);
  assert.equal(card.body['opcode.axp'].source, 'connected'); assert.equal(card.body['opcode.axp'].connection, 'a2a');
  const job = await api('POST', '/v1/jobs', { agentId: ag.body.id, offering: 'desk_report', requirements: { topic: 'Arc' } }, B);
  assert.equal(job.status, 200, JSON.stringify(job.body)); assert.equal(job.body.provider, ag.body.id);
  const wh = await api('POST', '/v1/agents', { name: 'Hook Agent', description: 'Webhook agent', connection: { kind: 'webhook', url: 'https://hook.example.com/opcode' }, offerings: [{ key: 'hook_job', description: 'Job', price: '1', slaMinutes: 5 }] }, A);
  assert.equal(wh.body.endpoint, 'configured');
  const l = await api('POST', '/v1/launches', { type: 'standard', name: 'Desk Remote', symbol: 'DESKR', preset: 'fair', agentId: ag.body.id }, A);
  assert.equal(l.status, 200, JSON.stringify(l.body));
  assert.equal((await api('POST', '/v1/launches', { type: 'standard', name: 'Not Mine', symbol: 'NOTM', preset: 'fair', agentId: ag.body.id }, B)).status, 403);
});
