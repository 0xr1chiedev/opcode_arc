import { keccak256, toHex, type Hex } from 'viem';
import { DomainError } from '../../core/src/errors.ts';
import type { Asset, ChainAdapter, ChainIntent, ExecResult, Move } from './adapter.ts';

export interface SimTx { hash: Hex; block: number; kind: string; from: string; moves: Move[]; at: number }

/**
 * In-memory ledger that behaves like Arc for the purposes of the app: atomic, all-or-nothing transactions,
 * balances that never go negative, a growing block number and a transaction log.
 */
export class SimChain implements ChainAdapter {
  readonly mode = 'sim' as const;
  private balances = new Map<string, bigint>();
  private block = 1;
  readonly txs: SimTx[] = [];
  private now: () => number;
  constructor(opts: { now?: () => number } = {}) { this.now = opts.now ?? Date.now; }

  private key = (asset: Asset, account: string) => `${asset}|${account.toLowerCase()}`;
  async balanceOf(asset: Asset, account: string) { return this.balances.get(this.key(asset, account)) ?? 0n; }
  balanceSync(asset: Asset, account: string) { return this.balances.get(this.key(asset, account)) ?? 0n; }
  async blockNumber() { return this.block; }

  /** Credits an account without a source (faucet for development and tests, token minting at launch). */
  mint(asset: Asset, to: string, amount: bigint): Hex {
    if (amount < 0n) throw new DomainError('AMOUNT', 'Cannot mint a negative amount.');
    this.balances.set(this.key(asset, to), this.balanceSync(asset, to) + amount);
    return this.record('mint', 'system', [{ asset, from: 'mint', to, amount }]);
  }

  async execute(intent: ChainIntent, from: string): Promise<ExecResult> {
    const next = new Map(this.balances);
    for (const m of intent.moves) {
      if (m.amount < 0n) throw new DomainError('AMOUNT', 'Negative transfer.', 500);
      if (m.amount === 0n) continue;
      const fk = this.key(m.asset, m.from), tk = this.key(m.asset, m.to);
      const have = next.get(fk) ?? 0n;
      if (m.from !== 'mint') {
        if (have < m.amount) throw new DomainError('INSUFFICIENT_FUNDS', m.asset === 'USDC' ? 'Not enough USDC for this action.' : 'Not enough tokens for this action.', 402);
        next.set(fk, have - m.amount);
      }
      next.set(tk, (next.get(tk) ?? 0n) + m.amount);
    }
    this.balances = next;
    const hash = this.record(intent.kind, from, intent.moves);
    return { status: 'confirmed', txHash: hash, block: this.block };
  }

  private record(kind: string, from: string, moves: Move[]): Hex {
    this.block++;
    const hash = keccak256(toHex(`${this.block}:${kind}:${from}:${this.txs.length}:${this.now()}`));
    this.txs.push({ hash, block: this.block, kind, from, moves, at: this.now() });
    return hash;
  }

  /** Sum of an asset across all accounts. Used by tests to prove nothing is created or destroyed by trades. */
  totalOf(asset: Asset): bigint { let s = 0n; for (const [k, v] of this.balances) if (k.startsWith(asset + '|')) s += v; return s; }
}
