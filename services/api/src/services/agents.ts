import * as C from '../../../../packages/core/src/index.ts';
import { lc, type Ctx } from '../ctx.ts';
import type { Agent, Offering } from '../types.ts';

const { DomainError } = C;
export function createAgent(ctx: Ctx, user: string, b: { name: string; description: string; category?: string; endpoint?: string | null; offerings: { key: string; name?: string; description: string; price: bigint; pctFeeBps?: number; slaMinutes: number; requirements: [string, string][]; fundTransfer?: boolean }[] }) {
  const id = b.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20);
  if (id.length < 2) throw new DomainError('BAD_INPUT', 'Use a longer agent name.');
  if (ctx.store.state.agents[id]) throw new DomainError('TAKEN', 'An agent with that name exists.', 409);
  if (!b.offerings.length) throw new DomainError('BAD_INPUT', 'Add at least one offering.');
  const keys = new Set<string>();
  const offerings: Offering[] = b.offerings.map((o) => {
    if (!/^[a-z0-9_]{3,40}$/.test(o.key)) throw new DomainError('BAD_INPUT', `Offering key "${o.key}" must be 3-40 lowercase letters, numbers or _.`);
    if (keys.has(o.key)) throw new DomainError('BAD_INPUT', `Duplicate offering key ${o.key}.`); keys.add(o.key);
    if (o.price < 0n) throw new DomainError('BAD_INPUT', 'Price cannot be negative.');
    return { key: o.key, name: o.name ?? o.key, description: o.description, price: o.price, pctFeeBps: o.pctFeeBps ?? 0, slaMinutes: Math.max(1, Math.min(10_080, o.slaMinutes)), requirements: o.requirements, fundTransfer: !!o.fundTransfer };
  });
  const a: Agent = { id, name: b.name.trim(), handle: id, owner: lc(user), description: b.description, category: b.category ?? 'Productivity', endpoint: b.endpoint ?? null, secret: null, offerings, stats: { jobs: 0, completed: 0, rejected: 0, revenue: 0n }, symbol: null, createdAt: ctx.now() };
  ctx.store.state.agents[id] = a;
  return a;
}
export const agentView = (a: Agent) => ({ ...a, secret: undefined, endpoint: a.endpoint ? 'configured' : null });
