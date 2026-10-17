import type { ChainAdapter, ChainIntent, ExecResult, X402Facilitator } from '../../../packages/chain/src/index.ts';
import type { XProvider, PriceFeed, AgentRuntime } from '../../../packages/integrations/src/index.ts';
import type { Store } from './store.ts';
import type { Config } from './config.ts';

export interface Ctx { store: Store; chain: ChainAdapter; x: XProvider; prices: PriceFeed; runtime: AgentRuntime; cfg: Config; now: () => number; x402: X402Facilitator }
export type Pending = { pending: true; tx: Extract<ExecResult, { status: 'needs_signature' }>['tx'] };

/** Runs a chain intent. On the simulator it settles at once; on Arc it returns the transaction for the wallet to sign. */
export async function run(ctx: Ctx, intent: ChainIntent, from: string): Promise<{ ok: true; txHash: string } | Pending> {
  const r = await ctx.chain.execute(intent, from);
  return r.status === 'confirmed' ? { ok: true, txHash: r.txHash } : { pending: true, tx: r.tx };
}
export const isPending = (x: unknown): x is Pending => !!x && typeof x === 'object' && (x as Pending).pending === true;

export function notify(ctx: Ctx, address: string, kind: string, text: string) {
  const s = ctx.store.state; s.notices.unshift({ id: ctx.store.nextId('n'), address: address.toLowerCase(), kind, text, at: ctx.now(), read: false });
  if (s.notices.length > 5000) s.notices.length = 5000;
}
export const lc = (a: string) => a.toLowerCase();
