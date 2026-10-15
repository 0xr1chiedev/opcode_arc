import * as C from '../../../packages/core/src/index.ts';
import { simulatedDeliverable } from '../../../packages/integrations/src/index.ts';
import type { Ctx } from './ctx.ts';
import { activateStandard, settle } from './services/launch.ts';
import { act } from './services/jobs.ts';
import { trackPosts } from './services/points.ts';

/**
 * Background work, run on an interval in production and called directly in tests:
 * scheduled launches, presale settlement, points tracking, job expiry and (on the simulator) platform agents.
 */
export async function tick(ctx: Ctx) {
  const s = ctx.store.state, now = ctx.now(), errors: string[] = [];
  const safe = async (f: () => Promise<unknown>) => { try { await f(); } catch (e) { errors.push((e as Error).message); } };
  for (const l of Object.values(s.launches)) if (l.status === 'scheduled' && l.spec.startTs <= now) await safe(() => activateStandard(ctx, l));
  for (const p of Object.values(s.presales)) if (!p.settledAt && now >= p.endTs) await safe(() => settle(ctx, p.id));
  await safe(() => trackPosts(ctx));
  for (const j of Object.values(s.jobs)) if (!C.TERMINAL.includes(j.phase) && now >= j.expiresAt) await safe(() => act(ctx, 'system', j.id, { type: 'expire', by: 'system' }));
  if (ctx.cfg.chainMode === 'sim') await simAgents(ctx, safe);
  return { errors };
}

/** Platform agents on the simulator: price the job, then deliver after a short time. */
async function simAgents(ctx: Ctx, safe: (f: () => Promise<unknown>) => Promise<void>) {
  const s = ctx.store.state, now = ctx.now();
  for (const j of Object.values(s.jobs)) {
    const a = s.agents[j.provider]; if (!a || a.owner.startsWith('0x')) continue;
    const o = a.offerings.find((x) => x.key === j.offering)!;
    if (j.phase === 'open') await safe(() => act(ctx, a.id, j.id, { type: 'set_budget', by: a.id, price: o.pctFeeBps ? C.max(1n, (j.principal * BigInt(o.pctFeeBps)) / C.BPS) : o.price }));
    else if (j.phase === 'funded' && now - j.history.at(-1)!.at >= Math.min(o.slaMinutes, 1) * 5_000) await safe(() => act(ctx, a.id, j.id, { type: 'submit', by: a.id, deliverable: simulatedDeliverable(o.key, j.requirements) }));
  }
}
