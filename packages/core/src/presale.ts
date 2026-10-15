import { BPS, ONE_TOKEN, ONE_USDC, WAD, min } from './money.ts';
import { SUPPLY } from './curve.ts';
import { DomainError, assert } from './errors.ts';

/**
 * Points-gated presale.
 *   allocation = min(cap, yourPoints / allPoints × target)
 *   paid       = min(deposit, allocation); refund = deposit − paid
 * All locked points burn at settlement. Unfilled allocation goes to the curve as liquidity.
 */
export const DEFAULT_CAP_BPS = 210n;               // 2.1% of the raise per wallet (420 USDC on 20,000)
export const SHARE_MIN_BPS = 1_000n, SHARE_MAX_BPS = 3_000n;
export const DURATIONS_H = [24, 48, 72] as const;

export interface PresaleConfig { target: bigint; capPerWallet: bigint; shareBps: bigint; minPoints: bigint; startTs: number; endTs: number }
export interface Commitment { wallet: string; points: bigint; usdc: bigint }
export type PresaleStatus = 'upcoming' | 'live' | 'ended' | 'settled';
export interface SettlementLine { wallet: string; points: bigint; deposit: bigint; shareWad: bigint; allocation: bigint; paid: bigint; refund: bigint; tokens: bigint; burned: bigint }
export interface Settlement { lines: SettlementLine[]; filled: bigint; unfilled: bigint; totalPoints: bigint; tokensSold: bigint; tokensToCurve: bigint }

export const defaultCap = (target: bigint) => (target * DEFAULT_CAP_BPS) / BPS;
export const presaleTokens = (c: Pick<PresaleConfig, 'shareBps'>) => (SUPPLY * c.shareBps) / BPS;
/** Presale price as a WAD of USDC per whole token. */
export const presalePriceWad = (c: Pick<PresaleConfig, 'target' | 'shareBps'>) => (c.target * ONE_TOKEN * WAD) / (presaleTokens(c) * ONE_USDC);

export function validatePresaleConfig(c: PresaleConfig): string[] {
  const e: string[] = [];
  if (c.target < 1_000n * 10n ** 6n || c.target > 500_000n * 10n ** 6n) e.push('The raise must be between 1,000 and 500,000 USDC.');
  if (c.capPerWallet <= 0n || c.capPerWallet > c.target) e.push('Max per wallet must be above 0 and not more than the raise.');
  if (c.shareBps < SHARE_MIN_BPS || c.shareBps > SHARE_MAX_BPS) e.push('Presale share must be 10% to 30% of supply.');
  const h = (c.endTs - c.startTs) / 3_600_000; if (!(DURATIONS_H as readonly number[]).includes(h)) e.push('Duration must be 24, 48 or 72 hours.');
  if (c.minPoints < 0n) e.push('Minimum points cannot be negative.');
  return e;
}

export function presaleStatus(c: PresaleConfig, settled: boolean, now: number): PresaleStatus {
  return settled ? 'settled' : now < c.startTs ? 'upcoming' : now < c.endTs ? 'live' : 'ended';
}

/** Adds to a wallet's commitment. Points come from the caller's available balance; the caller checks it. */
export function commitPresale(c: PresaleConfig, existing: Commitment | undefined, add: { wallet: string; points: bigint; usdc: bigint }, now: number): Commitment {
  if (now < c.startTs) throw new DomainError('NOT_OPEN', 'The presale has not opened yet.', 409);
  if (now >= c.endTs) throw new DomainError('ENDED', 'The presale has ended.', 409);
  assert(add.points >= 0n && add.usdc >= 0n, 'AMOUNT', 'Amounts cannot be negative.');
  assert(add.points > 0n || add.usdc > 0n, 'AMOUNT', 'Add points or USDC.');
  const cur = existing ?? { wallet: add.wallet, points: 0n, usdc: 0n };
  const points = cur.points + add.points, usdc = cur.usdc + add.usdc;
  assert(points >= c.minPoints, 'MIN_POINTS', `Lock at least ${c.minPoints} points to join.`);
  assert(usdc <= c.capPerWallet, 'CAP', 'That is more than the maximum per wallet.');
  assert(!(usdc > 0n && points === 0n), 'POINTS_REQUIRED', 'Lock points to deposit.');
  return { wallet: add.wallet, points, usdc };
}

export function allocationOf(c: PresaleConfig, wallet: Commitment, totalPoints: bigint): { shareWad: bigint; allocation: bigint } {
  if (totalPoints === 0n || wallet.points === 0n) return { shareWad: 0n, allocation: 0n };
  const raw = (wallet.points * c.target) / totalPoints;
  return { shareWad: (wallet.points * 10n ** 18n) / totalPoints, allocation: min(raw, c.capPerWallet) };
}

export function settlePresale(c: PresaleConfig, commitments: Commitment[]): Settlement {
  const totalPoints = commitments.reduce((s, x) => s + x.points, 0n);
  const sold = presaleTokens(c);
  const lines = commitments.map((w) => {
    const { shareWad, allocation } = allocationOf(c, w, totalPoints);
    const paid = min(w.usdc, allocation);
    return { wallet: w.wallet, points: w.points, deposit: w.usdc, shareWad, allocation, paid, refund: w.usdc - paid, tokens: (paid * sold) / c.target, burned: w.points };
  });
  const filled = lines.reduce((s, l) => s + l.paid, 0n);
  const tokensSold = lines.reduce((s, l) => s + l.tokens, 0n);
  return { lines, filled, unfilled: c.target - filled, totalPoints, tokensSold, tokensToCurve: sold - tokensSold };
}
