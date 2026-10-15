import * as C from '../../../../packages/core/src/index.ts';
import { ACCT, tokenAsset } from '../../../../packages/chain/src/index.ts';
import { run, isPending, notify, lc, type Ctx, type Pending } from '../ctx.ts';
import { createToken, symbolTaken, trade } from './market.ts';
import type { LaunchRec, PresaleRec } from '../types.ts';

const { DomainError, assert } = C;

/** "Launch your agent token": validates, charges modules, then lists now, schedules, or opens the presale. */
export async function createLaunch(ctx: Ctx, user: string, spec: C.LaunchSpec): Promise<{ launch: LaunchRec; presale?: PresaleRec; token?: unknown } | Pending> {
  const s = ctx.store.state, now = ctx.now();
  spec = { ...spec, symbol: spec.symbol.toUpperCase(), startTs: Math.max(spec.startTs, now) };
  const errors = C.validateLaunch(spec, { now, symbolTaken: (x) => symbolTaken(ctx, x) });
  if (errors.length) throw new DomainError('INVALID_LAUNCH', errors.join(' '), 422);
  if (spec.agentId) { const a = s.agents[spec.agentId]; assert(a && a.owner === lc(user), 'FORBIDDEN', 'You can only launch tokens for your own agents.', 403); }
  const cost = C.launchCost(spec), id = ctx.store.nextId('l');
  if (cost.total > 0n) {
    const r = await run(ctx, { kind: 'usdc.transfer', args: { to: ACCT.treasury, amount: cost.total }, moves: [
      { asset: 'USDC', from: lc(user), to: ACCT.treasury, amount: cost.modules }, { asset: 'USDC', from: lc(user), to: `launch:${id}`, amount: cost.prebuy }] }, user);
    if (isPending(r)) return r;
  }
  const launch: LaunchRec = { id, symbol: spec.symbol, type: spec.type, spec, creator: lc(user), status: spec.type === 'presale' ? 'presale' : 'scheduled', createdAt: now, presaleId: null };
  s.launches[id] = launch;
  if (spec.type === 'presale') {
    const p = spec.presale!, pid = ctx.store.nextId('p');
    const presale: PresaleRec = { id: pid, symbol: spec.symbol, launchId: id, target: p.target, capPerWallet: p.capPerWallet, shareBps: p.shareBps, minPoints: p.minPoints, startTs: spec.startTs, endTs: spec.startTs + p.durationH * 3_600_000, commitments: {}, settlement: null, settledAt: null };
    s.presales[pid] = presale; launch.presaleId = pid;
    return { launch, presale };
  }
  if (spec.startTs <= now + 5_000) return { launch, token: await activateStandard(ctx, launch) };
  return { launch };
}

/** Lists a scheduled standard launch and runs the creator's pre-buy in the same step. */
export async function activateStandard(ctx: Ctx, l: LaunchRec) {
  if (l.status === 'live') return ctx.store.state.tokens[l.symbol];
  const sp = l.spec, now = ctx.now();
  const t = await createToken(ctx, { symbol: l.symbol, name: sp.name, description: sp.description, category: 'Agents', agentId: sp.agentId, creator: l.creator, tokenomics: sp.tokenomics,
    sniper: sp.sniper.windowSec ? { windowSec: sp.sniper.windowSec, side: sp.sniper.side, startTs: now } : null, launchId: l.id });
  if (isPending(t)) return t;
  l.status = 'live';
  if (sp.prebuy > 0n) {
    // Pre-buy is not taxed by anti-sniper: it runs before the window starts.
    const saved = t.sniper; t.sniper = null;
    await ctx.chain.execute({ kind: 'usdc.transfer', args: {}, moves: [{ asset: 'USDC', from: `launch:${l.id}`, to: l.creator, amount: sp.prebuy }] }, 'system');
    await trade(ctx, l.creator, l.symbol, 'buy', sp.prebuy, undefined, 'wallet');
    t.sniper = saved;
  }
  notify(ctx, l.creator, 'launch', `$${l.symbol} is live. Trading is open.`);
  return t;
}

/* ---------------- presales ---------------- */
export const getPresale = (ctx: Ctx, id: string) => { const p = ctx.store.state.presales[id]; if (!p) throw new DomainError('NOT_FOUND', 'Presale not found.', 404); return p; };
const cfgOf = (p: PresaleRec): C.PresaleConfig => ({ target: p.target, capPerWallet: p.capPerWallet, shareBps: p.shareBps, minPoints: p.minPoints, startTs: p.startTs, endTs: p.endTs });

export function presaleView(ctx: Ctx, p: PresaleRec, viewer: string | null) {
  const cs = Object.values(p.commitments), totalPoints = cs.reduce((x, c) => x + c.points, 0n), committed = cs.reduce((x, c) => x + c.usdc, 0n);
  const mine = viewer ? p.commitments[lc(viewer)] : undefined;
  const est = mine ? C.allocationOf(cfgOf(p), mine, totalPoints) : null;
  return { id: p.id, symbol: p.symbol, launchId: p.launchId, status: C.presaleStatus(cfgOf(p), !!p.settledAt, ctx.now()), target: p.target, capPerWallet: p.capPerWallet, shareBps: p.shareBps, minPoints: p.minPoints,
    startTs: p.startTs, endTs: p.endTs, priceWad: C.presalePriceWad(cfgOf(p)), totalPoints, committed, participants: cs.length,
    mine: mine ? { ...mine, allocation: est!.allocation, shareWad: est!.shareWad, pays: C.min(mine.usdc, est!.allocation), refund: mine.usdc - C.min(mine.usdc, est!.allocation) } : null,
    settlement: p.settlement ? { filled: p.settlement.filled, unfilled: p.settlement.unfilled, totalPoints: p.settlement.totalPoints, tokensSold: p.settlement.tokensSold } : null };
}

/** Locks points (off-chain ledger, root published on Arc) and moves USDC into the presale vault. */
export async function commit(ctx: Ctx, user: string, id: string, points: bigint, usdcAmt: bigint) {
  const p = getPresale(ctx, id), w = lc(user), u = ctx.store.state.users[w];
  if (!u) throw new DomainError('UNAUTHORIZED', 'Sign in first.', 401);
  const next = C.commitPresale(cfgOf(p), p.commitments[w], { wallet: w, points, usdc: usdcAmt }, ctx.now());
  const locked = C.lockPoints(u.points, points);
  if (usdcAmt > 0n) {
    const r = await run(ctx, { kind: 'presale.commit', args: { chainPresaleId: id, points, usdc: usdcAmt }, moves: [{ asset: 'USDC', from: w, to: ACCT.vault(id), amount: usdcAmt }] }, user);
    if (isPending(r)) return r;
  }
  u.points = locked; p.commitments[w] = next;
  return presaleView(ctx, p, user);
}

/** Settles after the end: refunds, burns points, delivers tokens, seeds the curve with the raise and opens trading. */
export async function settle(ctx: Ctx, id: string) {
  const p = getPresale(ctx, id), s = ctx.store.state, l = s.launches[p.launchId]!;
  if (p.settledAt) return presaleView(ctx, p, null);
  if (ctx.now() < p.endTs) throw new DomainError('NOT_ENDED', 'The presale has not ended yet.', 409);
  const st = C.settlePresale(cfgOf(p), Object.values(p.commitments));
  const seed = C.min(st.filled, C.GRAD - 1n);
  const t = await createToken(ctx, { symbol: p.symbol, name: l.spec.name, description: l.spec.description, category: 'Agents', agentId: l.spec.agentId, creator: l.creator, tokenomics: l.spec.tokenomics, sniper: null, launchId: l.id, extraCurveTokens: st.tokensToCurve, startRaised: seed });
  if (isPending(t)) return t;
  const moves = [
    ...st.lines.filter((x) => x.refund > 0n).map((x) => ({ asset: 'USDC' as const, from: ACCT.vault(id), to: x.wallet, amount: x.refund })),
    { asset: 'USDC' as const, from: ACCT.vault(id), to: ACCT.curve(p.symbol), amount: seed },
    { asset: 'USDC' as const, from: ACCT.vault(id), to: l.creator, amount: st.filled - seed },
    ...st.lines.filter((x) => x.tokens > 0n).map((x) => ({ asset: tokenAsset(p.symbol), from: 'mint', to: x.wallet, amount: x.tokens })),
  ];
  const r = await run(ctx, { kind: 'presale.settle', args: { chainPresaleId: id }, moves }, 'system');
  if (isPending(r)) return r;
  for (const x of st.lines) { const u = s.users[x.wallet]; if (u) u.points = C.burnLocked(u.points, x.burned); if (x.tokens > 0n) t.holders[x.wallet] = true;
    notify(ctx, x.wallet, 'presale', `$${p.symbol} presale settled: ${C.fmtUsdc(x.paid, 2)} USDC filled, ${C.fmtUsdc(x.refund, 2)} refunded, ${x.burned} points burned.`); }
  p.settlement = st; p.settledAt = ctx.now(); l.status = 'live';
  notify(ctx, l.creator, 'launch', `$${p.symbol} presale raised ${C.fmtUsdc(st.filled, 2)} USDC. Trading is open.`);
  return presaleView(ctx, p, null);
}

export function upcoming(ctx: Ctx, viewer: string | null) {
  const s = ctx.store.state, now = ctx.now();
  return Object.values(s.launches).filter((l) => l.status === 'scheduled' || l.status === 'presale').map((l) => ({
    id: l.id, symbol: l.symbol, name: l.spec.name, type: l.type, creator: l.creator, startTs: l.spec.startTs, tokenomics: l.spec.tokenomics, sniper: l.spec.sniper,
    presale: l.presaleId ? presaleView(ctx, s.presales[l.presaleId]!, viewer) : null,
    nextAt: l.presaleId ? (now < s.presales[l.presaleId]!.startTs ? s.presales[l.presaleId]!.startTs : s.presales[l.presaleId]!.endTs) : l.spec.startTs,
  })).sort((a, b) => a.nextAt - b.nextAt);
}
