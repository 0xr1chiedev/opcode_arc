import * as C from '../../../../packages/core/src/index.ts';
import { ACCT, tokenAsset, type Move } from '../../../../packages/chain/src/index.ts';
import { run, isPending, notify, lc, type Ctx, type Pending } from '../ctx.ts';
import type { TokenRec, TradeRec } from '../types.ts';

const { DomainError } = C;

export function getToken(ctx: Ctx, symbol: string): TokenRec {
  const t = ctx.store.state.tokens[String(symbol).toUpperCase()];
  if (!t) throw new DomainError('NOT_FOUND', `$${symbol} not found.`, 404);
  return t;
}
export const symbolTaken = (ctx: Ctx, sym: string) => { const s = ctx.store.state; return !!s.tokens[sym] || Object.values(s.launches).some((l) => l.symbol === sym && l.status !== 'cancelled'); };
export const curveCfg = (t: TokenRec): C.CurveCfg => ({ curveTokens: t.curveTokens });
export const priceWad = (t: TokenRec) => (t.pool ? C.poolPriceWad(t.pool) : C.curvePriceWad(t.curve.raised, curveCfg(t)));

/** Mints the supply into its buckets and lists the token. Used by launches (standard and presale). */
export async function createToken(ctx: Ctx, p: { symbol: string; name: string; description: string; category: string; agentId: string | null; creator: string; tokenomics: C.Tokenomics; sniper: C.SniperConfig | null; launchId: string | null; extraCurveTokens?: bigint; startRaised?: bigint }) {
  const s = ctx.store.state, sym = p.symbol;
  if (s.tokens[sym]) throw new DomainError('TAKEN', `$${sym} is taken.`, 409);
  const curveTokens = C.bucketAmount(p.tokenomics, 'curve') + (p.extraCurveTokens ?? 0n);
  const moves: Move[] = [{ asset: tokenAsset(sym), from: 'mint', to: ACCT.curve(sym), amount: curveTokens }];
  for (const b of ['team', 'airdrop', 'ecosystem', 'treasury'] as const) { const a = C.bucketAmount(p.tokenomics, b); if (a > 0n) moves.push({ asset: tokenAsset(sym), from: 'mint', to: ACCT.vesting(sym, b), amount: a }); }
  const r = await run(ctx, { kind: 'token.launch', args: { name: p.name, symbol: sym, sharesPct: C.BUCKETS.map((b) => p.tokenomics.pct[b]), startTs: ctx.now(), sniperWindow: p.sniper?.windowSec ?? 0, sniperSells: p.sniper?.side === 'both', prebuy: 0n }, moves }, p.creator);
  if (isPending(r)) return r;
  const raised = p.startRaised ?? 0n, cfg = { curveTokens };
  const t: TokenRec = { symbol: sym, name: p.name, description: p.description, category: p.category, agentId: p.agentId, creator: lc(p.creator), createdAt: ctx.now(), tokenomics: p.tokenomics, curveTokens,
    curve: C.newCurve(raised, cfg), pool: null, sniper: p.sniper, volume: 0n, fees: { creator: 0n, treasury: 0n }, holders: {}, launchId: p.launchId, graduatedAt: null };
  s.tokens[sym] = t;
  if (p.agentId && s.agents[p.agentId]) s.agents[p.agentId]!.symbol = sym;
  return t;
}

export function quote(ctx: Ctx, t: TokenRec, side: 'buy' | 'sell', amt: bigint) {
  const tax = C.tradeTaxBps(t.sniper, side, ctx.now());
  if (t.pool) {
    const q = side === 'buy' ? C.quotePoolBuy(t.pool, amt, tax.taxBps, tax.feeBps) : C.quotePoolSell(t.pool, amt, tax.taxBps, tax.feeBps);
    return { venue: 'pool' as const, tax, q, out: side === 'buy' ? (q as ReturnType<typeof C.quotePoolBuy>).tokensOut : (q as ReturnType<typeof C.quotePoolSell>).usdcOut };
  }
  const q = side === 'buy' ? C.quoteCurveBuy(t.curve, amt, tax.taxBps, tax.feeBps, curveCfg(t)) : C.quoteCurveSell(t.curve, amt, tax.taxBps, tax.feeBps, curveCfg(t));
  return { venue: 'curve' as const, tax, q, out: side === 'buy' ? (q as C.BuyQuote).tokensOut : (q as C.SellQuote).usdcOut };
}

/** Executes a trade. `source` is the paying account: the user's wallet or their PAX account. */
export async function trade(ctx: Ctx, user: string, symbol: string, side: 'buy' | 'sell', amt: bigint, minOut: bigint | undefined, source: 'wallet' | 'pax' = 'wallet'): Promise<TradeRec | Pending> {
  const t = getToken(ctx, symbol), sym = t.symbol, acct = source === 'pax' ? ACCT.pax(user) : lc(user);
  if (t.createdAt > ctx.now()) throw new DomainError('NOT_LIVE', 'Trading has not opened yet.', 409);
  const { venue, tax, q, out } = quote(ctx, t, side, amt);
  C.checkMinOut(out, minOut);
  const fee = (q as { fee: bigint }).fee, buyback = (q as { buyback: bigint }).buyback, split = C.splitTradeFee(fee);
  const pool = ACCT.curve(sym), U = 'USDC' as const, TK = tokenAsset(sym);
  let moves: Move[], usdcAmt: bigint, tokAmt: bigint;
  if (side === 'buy') {
    const into = venue === 'pool' ? (q as ReturnType<typeof C.quotePoolBuy>).net : (q as C.BuyQuote).used;
    tokAmt = out; usdcAmt = into + fee + buyback;
    moves = [{ asset: U, from: acct, to: pool, amount: into }, { asset: U, from: acct, to: t.creator, amount: split.creator }, { asset: U, from: acct, to: ACCT.treasury, amount: split.treasury },
      { asset: U, from: acct, to: ACCT.team(sym), amount: buyback }, { asset: TK, from: pool, to: acct, amount: out }];
  } else {
    const gross = (q as { gross: bigint }).gross; tokAmt = amt; usdcAmt = out;
    moves = [{ asset: TK, from: acct, to: pool, amount: amt }, { asset: U, from: pool, to: acct, amount: out }, { asset: U, from: pool, to: t.creator, amount: split.creator },
      { asset: U, from: pool, to: ACCT.treasury, amount: split.treasury }, { asset: U, from: pool, to: ACCT.team(sym), amount: buyback }];
    void gross;
  }
  const r = await run(ctx, { kind: side === 'buy' ? 'curve.buy' : 'curve.sell', args: { symbol: sym, usdcIn: amt, tokensIn: amt, minOut: minOut ?? 0n }, moves }, user);
  if (isPending(r)) return r;
  // state after confirmation
  if (venue === 'pool') t.pool = (q as { after: C.PoolState }).after;
  else {
    t.curve = side === 'buy' ? C.applyCurveBuy(t.curve, q as C.BuyQuote) : C.applyCurveSell(t.curve, q as C.SellQuote);
    if (t.curve.graduated && !t.pool) { t.pool = C.graduationPool(curveCfg(t)); t.graduatedAt = ctx.now(); notify(ctx, t.creator, 'graduated', `$${sym} reached ${C.fmtUsdc(C.GRAD, 0)} USDC and graduated. LP is locked for ${C.LP_LOCK_YEARS} years.`); }
  }
  t.volume += side === 'buy' ? usdcAmt - buyback - fee : usdcAmt + fee + buyback;
  t.fees.creator += split.creator; t.fees.treasury += split.treasury;
  if (side === 'buy') t.holders[lc(user)] = true;
  const rec: TradeRec = { id: ctx.store.nextId('t'), symbol: sym, trader: lc(user), side, usdc: usdcAmt, tokens: tokAmt, fee, buyback, priceWad: priceWad(t), at: ctx.now(), txHash: r.txHash };
  ctx.store.state.trades.unshift(rec); if (ctx.store.state.trades.length > 20_000) ctx.store.state.trades.length = 20_000;
  void tax;
  return rec;
}

export function tokenView(ctx: Ctx, t: TokenRec) {
  const p = priceWad(t), dayAgo = ctx.now() - 86_400_000;
  const trades = ctx.store.state.trades.filter((x) => x.symbol === t.symbol);
  const old = trades.find((x) => x.at <= dayAgo);
  return { symbol: t.symbol, name: t.name, description: t.description, category: t.category, agentId: t.agentId, creator: t.creator, createdAt: t.createdAt,
    priceWad: p, price: C.priceWadToNumber(p), fdv: C.fdvFromPriceWad(p), venue: t.pool ? 'pool' : 'curve', raised: t.curve.raised, progressBps: t.pool ? 10_000 : Number((t.curve.raised * 10_000n) / C.GRAD),
    graduated: !!t.pool, graduatedAt: t.graduatedAt, volume: t.volume, volume24h: trades.filter((x) => x.at > dayAgo).reduce((s, x) => s + x.usdc, 0n),
    change24h: old ? C.priceWadToNumber(p) / C.priceWadToNumber(old.priceWad) - 1 : null, holders: Object.keys(t.holders).length, fees: t.fees, sniper: t.sniper, tokenomics: t.tokenomics };
}

export function listTokens(ctx: Ctx, q: { sort?: string; category?: string; search?: string; page?: number; per?: number }) {
  let list = Object.values(ctx.store.state.tokens).map((t) => tokenView(ctx, t));
  if (q.category && q.category !== 'all') list = list.filter((t) => t.category.toLowerCase() === q.category!.toLowerCase());
  if (q.search) { const s = q.search.toLowerCase(); list = list.filter((t) => (t.name + ' ' + t.symbol).toLowerCase().includes(s)); }
  const key: Record<string, (t: ReturnType<typeof tokenView>) => number> = {
    trending: (t) => Number(t.volume24h), new: (t) => t.createdAt, top: (t) => Number(t.fdv), gainers: (t) => t.change24h ?? -1e9,
    curve: (t) => (t.graduated ? -1 : t.progressBps), graduated: (t) => (t.graduated ? Number(t.fdv) : -1) };
  if (q.sort === 'graduated') list = list.filter((t) => t.graduated); if (q.sort === 'curve') list = list.filter((t) => !t.graduated);
  const k = key[q.sort ?? 'trending'] ?? key.trending!; list.sort((a, b) => k(b) - k(a));
  const per = Math.min(100, Math.max(1, q.per ?? 40)), page = Math.max(0, q.page ?? 0);
  return { total: list.length, page, per, items: list.slice(page * per, page * per + per) };
}


/**
 * Agent token buyback. 5% of every payment to an agent waits in ACCT.buyback(agentId). For each agent whose token is live,
 * the worker spends the reserve on its token and burns what it buys. An agent without a token keeps its reserve until it launches.
 * On Arc the PaymentSplitter contract does the same in one call (buyback → curve buy → burn).
 */
export async function runBuybacks(ctx: Ctx) {
  const s = ctx.store.state, done: { agentId: string; symbol: string; usdc: bigint; burned: bigint }[] = [];
  for (const a of Object.values(s.agents)) {
    const t = Object.values(s.tokens).find((x) => x.agentId === a.id && x.createdAt <= ctx.now());
    if (!t) continue;
    const reserve = ACCT.buyback(a.id), usdc = await ctx.chain.balanceOf('USDC', reserve);
    if (usdc < C.BUYBACK_MIN) continue;
    const r = await trade(ctx, reserve, t.symbol, 'buy', usdc, undefined);
    if (isPending(r)) continue;
    const b = await run(ctx, { kind: 'agent.buyback', args: { agent: a.wallet, symbol: t.symbol, usdcIn: usdc, minOut: 0n }, moves: [{ asset: tokenAsset(t.symbol), from: reserve, to: ACCT.burn, amount: r.tokens }] }, 'system');
    if (isPending(b)) continue;
    delete t.holders[reserve];
    const prev = t.boughtBack ?? { usdc: 0n, burned: 0n }; t.boughtBack = { usdc: prev.usdc + usdc, burned: prev.burned + r.tokens };
    done.push({ agentId: a.id, symbol: t.symbol, usdc, burned: r.tokens });
  }
  return done;
}
