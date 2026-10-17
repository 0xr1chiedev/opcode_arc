import type { Address, Hex } from 'viem';

/**
 * A chain intent is one user- or protocol-level action.
 * - `args` is what the Opcode contract call needs (the Arc adapter encodes it into calldata).
 * - `moves` are the asset transfers the action results in; the simulated ledger applies them,
 *   and on Arc the indexer reconciles them from contract events.
 */
export type Asset = 'USDC' | `token:${string}`;
export interface Move { asset: Asset; from: string; to: string; amount: bigint }
export type IntentKind =
  | 'usdc.transfer' | 'pax.deposit' | 'pax.withdraw'
  | 'job.fund' | 'job.release' | 'job.refund'
  | 'token.launch' | 'curve.buy' | 'curve.sell'
  | 'presale.commit' | 'presale.settle' | 'points.publish' | 'x402.settle' | 'agent.withdraw' | 'agent.buyback';
export interface ChainIntent { kind: IntentKind; args: Record<string, unknown>; moves: Move[] }

export type ExecResult =
  | { status: 'confirmed'; txHash: Hex; block: number }
  | { status: 'needs_signature'; tx: { chainId: number; from: Address; to: Address; data: Hex; value: bigint } };

export interface ChainAdapter {
  readonly mode: 'sim' | 'arc';
  /** Balance of an asset for an account (address or protocol account such as `escrow:job:42`). */
  balanceOf(asset: Asset, account: string): Promise<bigint>;
  /** Executes (sim) or prepares a transaction for the wallet to sign (arc). */
  execute(intent: ChainIntent, from: string): Promise<ExecResult>;
  /** Latest block number seen. */
  blockNumber(): Promise<number>;
}

/** Protocol accounts. On Arc these map to contract addresses; in the simulator they are ledger keys. */
export const ACCT = {
  treasury: 'treasury',
  protocol: 'protocol',
  escrow: (jobId: string) => `escrow:job:${jobId}`,
  curve: (symbol: string) => `curve:${symbol}`,
  vault: (presaleId: string) => `vault:presale:${presaleId}`,
  team: (symbol: string) => `team:${symbol}`,
  vesting: (symbol: string, bucket: string) => `vesting:${symbol}:${bucket}`,
  pax: (owner: string) => `pax:${owner.toLowerCase()}`,
  /** 5% of every payment to an agent waits here until it buys back the agent's token. */
  buyback: (agentId: string) => `buyback:${agentId}`,
  /** Bought-back tokens are sent here and never move again. */
  burn: 'burn',
} as const;
export const tokenAsset = (symbol: string): Asset => `token:${symbol}`;
