import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/index.ts';

const U = C.usdc, T = C.tokens, near = (a: number, b: number, tol: number) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

test('money: parse and format round-trip in base units', () => {
  assert.equal(U('420'), 420_000_000n);
  assert.equal(U('0.000001'), 1n);
  assert.equal(C.fmtUsdc(U('166.666666')), '166.666666');
  assert.equal(C.fmtTokens(T('1.5')), '1.5');
  assert.throws(() => U('1.0000001'));
  assert.deepEqual(C.toJSON({ a: 1n, b: [2n] }), { a: '1', b: ['2'] });
});

test('curve: launch, presale and graduation prices match the whitepaper', () => {
  near(C.priceWadToNumber(C.curvePriceWad(0n)), 0.0000055918, 1e-9);
  near(Number(C.fdvFromPriceWad(C.curvePriceWad(0n))) / 1e6, 5_591.8, 1);
  near(C.priceWadToNumber(C.curvePriceWad(U('20000'))), 0.000105, 1e-6);
  near(C.priceWadToNumber(C.curvePriceWad(C.GRAD)), 0.000358, 1e-6);
  const pool = C.graduationPool();
  near(C.priceWadToNumber(C.poolPriceWad(pool)), C.priceWadToNumber(C.curvePriceWad(C.GRAD)), 1e-12);
});

test('curve: buy takes the 1% fee, sells return less than paid, graduation refunds the overflow', () => {
  let c = C.newCurve();
  const b = C.quoteCurveBuy(c, U('100'), 100n, 100n);
  assert.equal(b.fee, U('1')); assert.equal(b.used, U('99')); assert.equal(b.refund, 0n); assert.ok(b.tokensOut > 0n);
  c = C.applyCurveBuy(c, b);
  const s = C.quoteCurveSell(c, b.tokensOut, 100n, 100n);
  assert.ok(s.usdcOut < U('99') && s.usdcOut > U('97.9'), `sell back ${s.usdcOut}`);
  const big = C.quoteCurveBuy(c, U('60000'), 100n, 100n);
  assert.equal(big.used, C.GRAD - c.raised); assert.ok(big.refund > 0n); assert.equal(big.graduates, true);
  const g = C.applyCurveBuy(c, big); assert.equal(g.graduated, true); assert.equal(g.raised, C.GRAD);
  assert.throws(() => C.quoteCurveBuy(g, U('1'), 100n, 100n), /pool/);
  assert.throws(() => C.checkMinOut(10n, 11n), /slippage/);
});

test('curve: scaled to a launch bucket, it sells the bucket and seeds the pool at the same price', () => {
  const cfg = { curveTokens: C.bucketAmount(C.defaultTokenomics('balanced'), 'curve') };           // 60% of supply
  assert.equal(cfg.curveTokens, T('600000000'));
  const fin = C.newCurve(C.GRAD, cfg), pool = C.graduationPool(cfg);
  near(Number(C.fmtTokens(fin.sold + pool.tokens)), 600_000_000, 1);
  near(C.priceWadToNumber(C.poolPriceWad(pool)), C.priceWadToNumber(C.curvePriceWad(C.GRAD, cfg)), 1e-12);
  near(C.priceWadToNumber(C.curvePriceWad(0n, cfg)) / C.priceWadToNumber(C.curvePriceWad(0n)), Number(C.CURVE_REFERENCE_TOKENS) / Number(cfg.curveTokens), 1e-9);
  let c = C.newCurve(0n, cfg); const q = C.quoteCurveBuy(c, U('1000'), 100n, 100n, cfg); c = C.applyCurveBuy(c, q);
  const s = C.quoteCurveSell(c, q.tokensOut, 100n, 100n, cfg); assert.ok(s.usdcOut < U('990') && s.usdcOut > U('979'));
});

test('pool: constant product after graduation', () => {
  const p = C.graduationPool();
  const q = C.quotePoolBuy(p, U('1000'), 100n, 100n);
  assert.ok(q.priceAfterWad > C.poolPriceWad(p));
  const s = C.quotePoolSell(q.after, q.tokensOut, 100n, 100n);
  assert.ok(s.usdcOut < U('990'));
});

test('anti-sniper: 99% → 1% linear over the window; sells only on "both"', () => {
  const cfg = { windowSec: 600, side: 'buy' as const, startTs: 0 };
  assert.equal(C.tradeTaxBps(cfg, 'buy', 0).taxBps, 9_900n);
  assert.equal(C.tradeTaxBps(cfg, 'buy', 300_000).taxBps, 5_000n);
  assert.equal(C.tradeTaxBps(cfg, 'buy', 600_000).taxBps, 100n);
  assert.equal(C.tradeTaxBps(cfg, 'sell', 0).taxBps, 100n);
  assert.equal(C.tradeTaxBps({ ...cfg, windowSec: 5880, side: 'both' }, 'sell', 0).taxBps, 9_900n);
  assert.equal(C.tradeTaxBps(cfg, 'buy', 0).buybackBps, 9_800n);
  assert.match(C.validateSniper({ windowSec: 600, side: 'both' })!, /98-minute/);
});

test('fees: 70/30 trade split and AXP payouts', () => {
  assert.deepEqual(C.splitTradeFee(U('1')), { creator: 700_000n, treasury: 300_000n });
  assert.deepEqual(C.splitJobPayout(U('0.5'), false), { provider: 450_000n, evaluator: 0n, buyback: 25_000n, protocol: 25_000n });
  assert.deepEqual(C.splitJobPayout(U('0.5'), true), { provider: 425_000n, evaluator: 25_000n, buyback: 25_000n, protocol: 25_000n });
});

test('AXP job: full lifecycle with escrow effects and role checks', () => {
  let j = C.newJob({ id: '1', client: '0xc', provider: 'lumen', offering: 'contract_summary', requirements: { doc: 'lease.pdf' }, slaMinutes: 5, now: 0 });
  assert.throws(() => C.transition(j, { type: 'set_budget', by: '0xc', price: U('0.5') }, 1), /provider/);
  j = C.transition(j, { type: 'set_budget', by: 'lumen', price: U('0.5') }, 1).job;
  const f = C.transition(j, { type: 'fund', by: '0xc' }, 2); j = f.job;
  assert.deepEqual(f.effects, [{ kind: 'escrow_in', from: '0xc', amount: U('0.5') }]);
  j = C.transition(j, { type: 'submit', by: 'lumen', deliverable: 'ipfs://report' }, 3).job;
  const done = C.transition(j, { type: 'complete', by: '0xc' }, 4);
  assert.equal(done.job.phase, 'completed');
  assert.deepEqual(done.effects.map((e) => [e.kind, (e as { amount: bigint }).amount]), [['pay', 450_000n], ['pay', 25_000n], ['pay', 25_000n]]);
  assert.throws(() => C.transition(done.job, { type: 'reject', by: '0xc' }, 5), /already completed/);
});

test('AXP job: evaluator decides, rejection and expiry refund escrow', () => {
  let j = C.newJob({ id: '2', client: '0xc', provider: 'vera', evaluator: 'judge', offering: 'audit', requirements: {}, principal: U('50'), slaMinutes: 10, now: 0 });
  j = C.transition(j, { type: 'set_budget', by: 'vera', price: U('4') }, 1).job;
  j = C.transition(j, { type: 'fund', by: '0xc' }, 2).job;
  j = C.transition(j, { type: 'submit', by: 'vera', deliverable: 'x' }, 3).job;
  assert.throws(() => C.transition(j, { type: 'complete', by: '0xc' }, 4), /evaluator/);
  const r = C.transition(j, { type: 'reject', by: 'judge' }, 4);
  assert.deepEqual(r.effects, [{ kind: 'refund', to: '0xc', amount: U('54') }]);
  let k = C.newJob({ id: '3', client: '0xc', provider: 'vera', offering: 'audit', requirements: {}, slaMinutes: 10, now: 0 });
  k = C.transition(k, { type: 'set_budget', by: 'vera', price: U('4') }, 1).job; k = C.transition(k, { type: 'fund', by: '0xc' }, 2).job;
  assert.throws(() => C.transition(k, { type: 'expire', by: 'any' }, 3), /not expired/);
  assert.deepEqual(C.transition(k, { type: 'expire', by: 'any' }, k.expiresAt).effects, [{ kind: 'refund', to: '0xc', amount: U('4') }]);
});

test('presale: whitepaper worked example (120,000 points, 1,000 yours, 20,000 raise, 420 cap)', () => {
  const cfg = { target: U('20000'), capPerWallet: U('420'), shareBps: 2_000n, minPoints: 100n, startTs: 0, endTs: 48 * 3_600_000 };
  assert.deepEqual(C.validatePresaleConfig(cfg), []);
  assert.equal(C.defaultCap(U('20000')), U('420'));
  near(C.priceWadToNumber(C.presalePriceWad(cfg)), 0.0001, 1e-12);
  const me420 = { wallet: 'me', points: 1_000n, usdc: U('420') }, me100 = { wallet: 'me2', points: 1_000n, usdc: U('100') }, others = { wallet: 'others', points: 118_000n, usdc: U('420') };
  const s = C.settlePresale(cfg, [me420, others, { ...me100, points: 1_000n }]);
  assert.equal(s.totalPoints, 120_000n);
  const a = s.lines[0]!; assert.equal(a.allocation, 166_666_666n); assert.equal(a.paid, 166_666_666n); assert.equal(a.refund, 253_333_334n); assert.equal(a.burned, 1_000n);
  near(Number(C.fmtTokens(a.tokens)), 1_666_666.66, 0.01);
  assert.equal(s.lines[2]!.paid, U('100')); assert.equal(s.lines[2]!.refund, 0n);
  assert.equal(s.lines[1]!.allocation, U('420'));                     // capped
  assert.equal(s.filled + s.unfilled, cfg.target);
});

test('presale: commit rules', () => {
  const cfg = { target: U('20000'), capPerWallet: U('420'), shareBps: 2_000n, minPoints: 100n, startTs: 1_000, endTs: 2_000 };
  assert.throws(() => C.commitPresale(cfg, undefined, { wallet: 'w', points: 500n, usdc: U('10') }, 0), /not opened/);
  assert.throws(() => C.commitPresale(cfg, undefined, { wallet: 'w', points: 50n, usdc: U('10') }, 1_500), /at least 100/);
  assert.throws(() => C.commitPresale(cfg, undefined, { wallet: 'w', points: 500n, usdc: U('421') }, 1_500), /maximum/);
  const c1 = C.commitPresale(cfg, undefined, { wallet: 'w', points: 500n, usdc: U('400') }, 1_500);
  assert.throws(() => C.commitPresale(cfg, c1, { wallet: 'w', points: 0n, usdc: U('21') }, 1_600), /maximum/);
  assert.equal(C.commitPresale(cfg, c1, { wallet: 'w', points: 10n, usdc: U('20') }, 1_600).usdc, U('420'));
  assert.throws(() => C.commitPresale(cfg, c1, { wallet: 'w', points: 1n, usdc: 0n }, 2_000), /ended/);
  assert.equal(C.presaleStatus(cfg, false, 1_500), 'live');
});

test('points: links, snowflakes, scoring, rules and ledger', () => {
  const now = Date.UTC(2026, 9, 15), id = C.makeSnowflake(now - 3_600_000, 7);
  assert.equal(C.postTimestamp(id), now - 3_600_000);
  assert.deepEqual(C.parsePostUrl(`https://x.com/richie_op/status/${id}?s=20`), { handle: 'richie_op', id });
  assert.equal(C.parsePostUrl('https://example.com/a/status/1'), null);
  assert.equal(C.scorePost({ views: 10_000, likes: 200, reposts: 30, replies: 40, quotes: 5 }, 10_000), 200n + 80n + 90n + 20n + 100n);
  assert.equal(C.scorePost({ views: 1e7, likes: 1e5, reposts: 0, replies: 0, quotes: 0 }, 15_000), 1_500n);
  assert.equal(C.scorePost({ views: 0, likes: 100, reposts: 0, replies: 0, quotes: 0 }, 1_000), 50n);   // quality floor 0.5
  const ctx = { linkedHandle: 'richie_op', already: [] as C.Submission[], now };
  assert.throws(() => C.checkSubmission(`https://x.com/other/status/${id}`, ctx), /Only posts from @richie_op/);
  assert.throws(() => C.checkSubmission(`https://x.com/richie_op/status/${C.makeSnowflake(now - 8 * 86_400_000)}`, ctx), /last 7 days/);
  assert.throws(() => C.checkSubmission('nope', { ...ctx, linkedHandle: null }), /Link your X/);
  assert.equal(C.checkSubmission(`https://x.com/richie_op/status/${id}`, ctx).postedAt, now - 3_600_000);
  let b = { earned: 1_000n, locked: 0n, burned: 0n };
  b = C.lockPoints(b, 600n); assert.equal(C.available(b), 400n);
  assert.throws(() => C.lockPoints(b, 401n), /available/);
  b = C.burnLocked(b, 600n); assert.deepEqual(b, { earned: 1_000n, locked: 0n, burned: 600n });
});

test('tokenomics: presets valid, rules enforced, vesting schedule', () => {
  for (const p of ['balanced', 'fair', 'community'] as const) assert.deepEqual(C.validateTokenomics(C.defaultTokenomics(p), { presale: false }), []);
  assert.deepEqual(C.validateTokenomics(C.defaultTokenomics('balanced', 30), { presale: true }), []);
  const bad = C.defaultTokenomics(); bad.pct.team = 30; bad.pct.curve = 45;
  assert.match(C.validateTokenomics(bad, { presale: false }).join(' '), /capped at 25/);
  assert.equal(C.bucketAmount(C.defaultTokenomics(), 'team'), T('150000000'));
  const M = 30 * 86_400_000;
  assert.equal(C.vested(1_000n, { cliffMonths: 6, months: 24 }, 0, 5 * M), 0n);
  assert.equal(C.vested(1_000n, { cliffMonths: 6, months: 24 }, 0, 18 * M), 500n);
  assert.equal(C.vested(1_000n, { cliffMonths: 6, months: 24 }, 0, 40 * M), 1_000n);
});

test('launch: validation and cost', () => {
  const spec: C.LaunchSpec = { type: 'standard', name: 'Orbit Ops', symbol: 'ORBX', description: 'Fleet routing', agentId: null, tokenomics: C.defaultTokenomics(), modules: { capitalFormation: true, launchRadar: true, sixtyDays: false }, sniper: { windowSec: 600, side: 'buy' }, startTs: 0, prebuy: U('50') };
  assert.deepEqual(C.validateLaunch(spec, { now: 0, symbolTaken: () => false }), []);
  assert.deepEqual(C.launchCost(spec), { modules: U('110'), prebuy: U('50'), total: U('160') });
  assert.match(C.validateLaunch({ ...spec, symbol: 'lumen' }, { now: 0, symbolTaken: () => false }).join(), /capital letters/);
  assert.match(C.validateLaunch(spec, { now: 0, symbolTaken: (s) => s === 'ORBX' }).join(), /taken/);
});

test('PAX: intents', () => {
  const ctx = { symbols: ['LUMEN', 'VERA'] };
  assert.equal(C.parseIntent('Launch a token for my agent Lumen', ctx).kind, 'launch');
  assert.deepEqual(C.parseIntent('Buy 20 USDC of LUMEN', ctx), { kind: 'buy', symbol: 'LUMEN', usdc: U('20') });
  assert.deepEqual(C.parseIntent('sell all vera', ctx), { kind: 'sell', symbol: 'VERA', pct: 100 });
  assert.deepEqual(C.parseIntent('Long BTC 100 USDC at 5x', ctx), { kind: 'perp', market: 'BTC', side: 'long', margin: U('100'), leverage: 5 });
  assert.deepEqual(C.parseIntent('Deposit 50 USDC to PAX', ctx), { kind: 'deposit', usdc: U('50') });
  assert.equal(C.parseIntent('Review my rental contract', ctx).kind, 'hire');
});

test('PAX: launch assistant fills a draft, re-asks on bad answers, and yields a valid spec', () => {
  const c: C.LaunchCtx = { agents: [{ id: 'lumen', name: 'Lumen', description: 'Reads contracts and flags risks.' }], symbolTaken: (s) => ['LUMEN'].includes(s), walletUsdc: U('1000'), now: 0 };
  const d = C.prefillDraft('Launch a presale token for my agent Lumen, raise 20k', c);
  assert.equal(d.agentId, 'lumen'); assert.equal(d.type, 'presale'); assert.equal(d.raise, U('20000')); assert.equal(d.cap, U('420'));
  assert.equal(C.nextQuestion(d, c)!.key, 'name');
  for (const a of ['Lumen Pro']) assert.equal(C.answer(d, a, c).ok, true);
  const bad = C.answer(d, 'LUMEN', c); assert.equal(bad.ok, false); assert.match((bad as { error: string }).error, /taken/);
  for (const a of ['LUMX', 'Use the agent description', '20%', '48 hours', 'Balanced']) assert.equal(C.answer(d, a, c).ok, true, a);
  assert.equal(C.nextQuestion(d, c), null);
  const spec = C.draftToSpec(d, 0);
  assert.deepEqual(C.validateLaunch(spec, { now: 0, symbolTaken: c.symbolTaken }), []);
  assert.equal(spec.presale!.shareBps, 2_000n); assert.equal(spec.tokenomics.pct.curve, 40);
  const s = C.prefillDraft('Launch $ORBX called Orbit Ops, standard, right away', c);
  assert.deepEqual([s.symbol, s.name, s.type, s.startInH], ['ORBX', 'Orbit Ops', 'standard', 0]);
});
