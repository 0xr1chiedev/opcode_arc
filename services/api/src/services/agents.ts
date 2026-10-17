import { createHash, randomBytes } from 'node:crypto';
import { keccak256, toHex } from 'viem';
import * as C from '../../../../packages/core/src/index.ts';
import { run, isPending } from '../ctx.ts';
import { lc, type Ctx } from '../ctx.ts';
import type { Agent, AgentConnection, Offering } from '../types.ts';

const { DomainError } = C;
/** Each agent has its own wallet. On the simulator it is derived from the id; on Arc it is the registry payout account. */
export const deriveAgentWallet = (id: string) => ('0x' + keccak256(toHex('opcode-agent:' + id)).slice(-40)).toLowerCase();
export const hashKey = (k: string) => createHash('sha256').update(k).digest('hex');

export function createAgent(ctx: Ctx, user: string, b: { name: string; description: string; category?: string; endpoint?: string | null; wallet?: string | null; connection?: { kind?: string; url?: string | null } | null; offerings: { key: string; name?: string; description: string; price: bigint; pctFeeBps?: number; slaMinutes: number; requirements: [string, string][]; fundTransfer?: boolean; x402?: boolean }[] }) {
  const id = b.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20);
  if (id.length < 2) throw new DomainError('BAD_INPUT', 'Use a longer agent name.');
  if (ctx.store.state.agents[id]) throw new DomainError('TAKEN', 'An agent with that name exists.', 409);
  if (!b.offerings.length) throw new DomainError('BAD_INPUT', 'Add at least one offering.');
  const keys = new Set<string>();
  const offerings: Offering[] = b.offerings.map((o) => {
    if (!/^[a-z0-9_]{3,40}$/.test(o.key)) throw new DomainError('BAD_INPUT', `Offering key "${o.key}" must be 3-40 lowercase letters, numbers or _.`);
    if (keys.has(o.key)) throw new DomainError('BAD_INPUT', `Duplicate offering key ${o.key}.`); keys.add(o.key);
    if (o.price < 0n) throw new DomainError('BAD_INPUT', 'Price cannot be negative.');
    if (o.x402 && (o.fundTransfer || o.price <= 0n)) throw new DomainError('BAD_INPUT', `Offering ${o.key}: x402 needs a fixed price and no fund transfer.`);
    return { key: o.key, name: o.name ?? o.key, description: o.description, price: o.price, pctFeeBps: o.pctFeeBps ?? 0, slaMinutes: Math.max(1, Math.min(10_080, o.slaMinutes)), requirements: o.requirements, fundTransfer: !!o.fundTransfer, x402: !!o.x402 };
  });
  // Bring your own agent: it keeps running where it runs and joins AXP through one of three connections.
  let connection: AgentConnection | null = null;
  if (b.connection) {
    const kind = b.connection.kind;
    if (kind !== 'a2a' && kind !== 'webhook' && kind !== 'api') throw new DomainError('BAD_INPUT', 'connection.kind must be a2a, webhook or api.');
    const url = b.connection.url ?? null;
    if (kind !== 'api' && !(typeof url === 'string' && /^https:\/\/[^\s/]+\.[^\s]+$/.test(url))) throw new DomainError('BAD_INPUT', `A ${kind === 'a2a' ? 'Agent Card' : 'webhook'} connection needs an https URL.`);
    connection = { kind, url: kind === 'api' ? null : url };
  }
  const wallet = b.wallet && /^0x[0-9a-fA-F]{40}$/.test(b.wallet) ? b.wallet.toLowerCase() : deriveAgentWallet(id);
  const a: Agent = { id, name: b.name.trim(), handle: id, owner: lc(user), wallet, keys: [], description: b.description, category: b.category ?? 'Productivity', endpoint: connection?.kind === 'webhook' ? connection.url : (b.endpoint ?? null), secret: null, source: connection ? 'connected' : 'pax', connection, offerings, stats: { jobs: 0, completed: 0, rejected: 0, revenue: 0n }, symbol: null, createdAt: ctx.now() };
  ctx.store.state.agents[id] = a;
  return a;
}
export const agentView = (a: Agent) => ({ ...a, secret: undefined, keys: undefined, endpoint: a.endpoint ? 'configured' : null });

/** Machine credentials: an agent process uses `Bearer ak_…` to act as the agent (provider actions, hiring other agents). */
export function createKey(ctx: Ctx, user: string, agentId: string, label = 'default') {
  const a = ctx.store.state.agents[agentId]; if (!a) throw new DomainError('NOT_FOUND', 'Agent not found.', 404);
  if (a.owner !== lc(user)) throw new DomainError('FORBIDDEN', 'Only the owner can create keys.', 403);
  const id = randomBytes(4).toString('hex'), secret = `ak_${a.id}_${id}_${randomBytes(24).toString('hex')}`;
  a.keys.push({ id, hash: hashKey(secret), label: String(label).slice(0, 40), createdAt: ctx.now(), lastUsedAt: null });
  return { id, key: secret, agentId: a.id, wallet: a.wallet };
}
export function revokeKey(ctx: Ctx, user: string, agentId: string, keyId: string) {
  const a = ctx.store.state.agents[agentId]; if (!a || a.owner !== lc(user)) throw new DomainError('FORBIDDEN', 'Only the owner can revoke keys.', 403);
  a.keys = a.keys.filter((k) => k.id !== keyId); return { ok: true };
}
export function agentFromKey(ctx: Ctx, key: string): string | null {
  const m = key.match(/^ak_([a-z0-9]+)_[0-9a-f]{8}_[0-9a-f]{48}$/); if (!m) return null;
  const a = ctx.store.state.agents[m[1]!]; if (!a) return null;
  const k = a.keys.find((x) => x.hash === hashKey(key)); if (!k) return null;
  k.lastUsedAt = ctx.now(); return a.wallet;
}
/** The owner moves earnings from the agent wallet to their own wallet. */
export async function withdraw(ctx: Ctx, user: string, agentId: string, amount: bigint) {
  const a = ctx.store.state.agents[agentId]; if (!a) throw new DomainError('NOT_FOUND', 'Agent not found.', 404);
  if (a.owner !== lc(user)) throw new DomainError('FORBIDDEN', 'Only the owner can withdraw.', 403);
  const r = await run(ctx, { kind: 'usdc.transfer', args: { to: a.owner, amount }, moves: [{ asset: 'USDC', from: a.wallet, to: a.owner, amount }] }, a.wallet);
  return isPending(r) ? r : { txHash: r.txHash };
}
