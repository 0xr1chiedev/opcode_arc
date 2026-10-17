import * as C from '../../../../packages/core/src/index.ts';
import { ACCT, type Move } from '../../../../packages/chain/src/index.ts';
import { run, isPending, notify, lc, type Ctx } from '../ctx.ts';
import type { Agent, JobRec } from '../types.ts';

const { DomainError, assert } = C;
export const getAgent = (ctx: Ctx, id: string): Agent => { const a = ctx.store.state.agents[id]; if (!a) throw new DomainError('NOT_FOUND', 'Agent not found.', 404); return a; };
export const getJob = (ctx: Ctx, id: string): JobRec => { const j = ctx.store.state.jobs[id]; if (!j) throw new DomainError('NOT_FOUND', 'Job not found.', 404); return j; };
/** Where an agent gets paid: its owner's wallet, or a protocol account for platform agents. */
export const agentWallet = (a: Agent) => a.wallet;

export const isAgentWallet = (ctx: Ctx, addr: string) => Object.values(ctx.store.state.agents).some((a) => a.wallet === lc(addr));

export async function openJob(ctx: Ctx, user: string, p: { agentId: string; offering: string; requirements: Record<string, string>; evaluator?: string | null; principal?: bigint; payFrom?: 'pax' | 'wallet' }) {
  const a = getAgent(ctx, p.agentId), o = a.offerings.find((x) => x.key === p.offering);
  if (!o) throw new DomainError('NOT_FOUND', 'Offering not found.', 404);
  const missing = C.missingRequirements(o.requirements, p.requirements);
  if (missing.length) throw new DomainError('MISSING_INPUTS', `Missing: ${missing.map((m) => m[1]).join(', ')}.`, 422);
  assert(!o.fundTransfer || (p.principal ?? 0n) > 0n, 'PRINCIPAL', 'This offering moves funds; set the principal amount.', 422);
  const id = ctx.store.nextId('');
  const job: JobRec = { ...C.newJob({ id, client: lc(user), provider: a.id, evaluator: p.evaluator ?? null, offering: o.key, requirements: p.requirements, principal: o.fundTransfer ? p.principal ?? 0n : 0n, slaMinutes: o.slaMinutes, now: ctx.now() }),
    payer: p.payFrom === 'wallet' || isAgentWallet(ctx, user) ? lc(user) : ACCT.pax(user), txs: [] };
  ctx.store.state.jobs[id] = job; a.stats.jobs++;
  await ctx.runtime.dispatch({ id, provider: a.id, offering: o.key, requirements: p.requirements, price: String(o.price), client: lc(user), createdAt: job.createdAt }, a);
  return job;
}

/** Turns domain effects into ledger moves and applies a transition once the chain confirms. */
export async function act(ctx: Ctx, actor: string, jobId: string, action: C.JobAction) {
  const j = getJob(ctx, jobId), a = getAgent(ctx, j.provider);
  const res = C.transition(j, action, ctx.now()), job = res.job as JobRec, effects = res.effects;
  const esc = ACCT.escrow(j.id), moves: Move[] = effects.map((e) =>
    e.kind === 'escrow_in' ? { asset: 'USDC', from: j.payer, to: esc, amount: e.amount }
    : e.kind === 'refund' ? { asset: 'USDC', from: esc, to: j.payer, amount: e.amount }
    : { asset: 'USDC', from: esc, to: e.label === 'protocol' ? ACCT.protocol : e.label === 'evaluator' ? lc(e.to) : e.label === 'buyback' ? ACCT.buyback(a.id) : agentWallet(a), amount: e.amount });
  if (moves.length) {
    const kind = effects[0]!.kind === 'escrow_in' ? 'job.fund' : effects[0]!.kind === 'refund' ? 'job.refund' : 'job.release';
    const r = await run(ctx, { kind, args: { chainJobId: j.id }, moves }, actor);
    if (isPending(r)) return r;
    job.txs = [...j.txs, r.txHash];
  }
  ctx.store.state.jobs[j.id] = job;
  if (job.phase === 'completed') { a.stats.completed++; a.stats.revenue += job.price; }
  if (job.phase === 'rejected') a.stats.rejected++;
  const msg: Record<string, string> = { budget_set: `Job #${j.id}: ${a.name} set the price to ${C.fmtUsdc(job.price, 4)} USDC.`, funded: `Job #${j.id} is funded. ${a.name} is working.`, submitted: `Job #${j.id} was delivered. Review it.`, completed: `Job #${j.id} completed and paid.`, rejected: `Job #${j.id} was rejected; escrow refunded.`, expired: `Job #${j.id} expired; escrow refunded.` };
  if (msg[job.phase]) notify(ctx, j.client, 'job', msg[job.phase]!);
  return job;
}

/** Provider-side permission: the agent's owner (or the protocol for platform agents) acts as the provider. */
export function providerActor(ctx: Ctx, user: string, jobId: string): string {
  const j = getJob(ctx, jobId), a = getAgent(ctx, j.provider);
  if (a.owner !== lc(user) && a.wallet !== lc(user)) throw new DomainError('FORBIDDEN', 'Only the agent (or its owner) can act as the provider.', 403);
  return a.id;
}

export function searchOfferings(ctx: Ctx, q: string, n = 5) {
  const SYN: Record<string, string> = { lease: 'contract', rental: 'contract', agreement: 'contract', solidity: 'audit', smart: 'audit', logo: 'brand', design: 'brand', translate: 'translation', market: 'research', report: 'research', route: 'route', delivery: 'route', long: 'perp', short: 'perp' };
  const words = q.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !['the', 'and', 'for', 'my', 'with', 'please', 'need'].includes(w)).map((w) => SYN[w] ?? w);
  const res: { agent: Agent; offering: Agent['offerings'][number]; score: number }[] = [];
  for (const a of Object.values(ctx.store.state.agents)) for (const o of a.offerings) {
    const hay = `${o.key} ${o.name} ${o.description} ${a.description} ${a.category}`.toLowerCase();
    const score = words.reduce((s, w) => s + (hay.includes(w) ? (o.key.includes(w) ? 3 : 1) : 0), 0);
    if (score > 0) res.push({ agent: a, offering: o, score: score + a.stats.completed / 1e5 });
  }
  return res.sort((x, y) => y.score - x.score).slice(0, n);
}
